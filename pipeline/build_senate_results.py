"""Build data/processed/senate_results_by_state.csv (2000 to 2026).

One row per Senate race, regular and special. Results come from MEDSL's
statewide Senate returns; the deciding round is used (runoff where there was
one; the January 2021 Georgia runoffs are filed under the 2020 cycle).

Vote shares use valid votes: candidate rows marked as over votes, under votes,
blanks or exhausted ballots are dropped from the denominator.

previous_party is the party that won the last election for the same seat
(same state and Senate class), so "flipped" compares election with election.
It ignores appointments and party switches between elections.
"""
from __future__ import annotations

import pandas as pd

from common import (
    MANUAL, NON_VOTE_RE, PROVISIONAL_YEAR, RAW, STATES, load_2026, normalise_party, write_csv,
)

FIRST_YEAR = 2000
LINEAGE_FROM = 1994  # earlier races are read only to find previous_party for 2000 to 2004
STAGE_ORDER = {"pre": 0, "gen": 1, "runoff": 2, "gen runoff": 2}


def regular_class(year: int) -> int:
    # Class 1 seats were elected in 2000, class 2 in 2002, class 3 in 2004, every six years.
    return {2: 1, 4: 2, 0: 3}[year % 6]


def candidate_party(group: pd.DataFrame) -> str | None:
    # party_detailed is blank on some rows (e.g. MS and NV 2024) where party_simplified
    # still names the party; "OTHER" there means "unknown", so it is not used.
    labels = [d if pd.notna(d) else (s if s != "OTHER" else None)
              for d, s in zip(group.party_detailed, group.party_simplified)]
    parties = {normalise_party(p) for p in labels} - {None}
    for p in ("DEM", "GOP", "IND", "OTHER"):  # fusion tickets count for the major party
        if p in parties:
            return p
    return None


def medsl_races() -> pd.DataFrame:
    d = pd.read_csv(RAW / "medsl" / "1976-2024-senate-state.csv")
    d = d[d.year >= LINEAGE_FROM].copy()
    d["stage"] = d.stage.str.lower().str.strip()
    d["cycle"] = d.year.where(d.year % 2 == 0, d.year - 1)  # Jan 2021 runoffs belong to 2020
    d = d[~d.candidate.fillna("").str.contains(NON_VOTE_RE)]
    d["candidate"] = d.candidate.fillna("(unnamed write-ins)")
    d["round"] = d.stage.map(STAGE_ORDER)
    if d["round"].isna().any():
        raise ValueError(f"unknown MEDSL stage values: {d[d['round'].isna()].stage.unique()}")
    d = d[d["round"] == d.groupby(["cycle", "state_po", "special"])["round"].transform("max")]

    overrides = pd.read_csv(MANUAL / "candidate_party_overrides.csv")
    overrides = overrides[(overrides.chamber == "senate") & overrides.party.notna() & overrides.source_url.notna()]
    ov = {(r.year, r.state_po, bool(r.special), r.candidate): r.party for r in overrides.itertuples()}

    rows = []
    for (year, po, special), race in d.groupby(["cycle", "state_po", "special"]):
        valid = race.candidatevotes.clip(lower=0).sum()
        cands = []
        for name, g in race.groupby("candidate"):
            party = ov.get((year, po, bool(special), name)) or candidate_party(g)
            cands.append((g.candidatevotes.clip(lower=0).sum(), name, party))
        cands.sort(reverse=True)
        (wv, wn, wp), (rv, _, rp) = cands[0], cands[1] if len(cands) > 1 else (0, None, None)
        rows.append({
            "year": int(year), "state_po": po, "special": bool(special),
            "winner_name": wn, "winner_party": wp, "runner_up_party": rp,
            "winner_pct": 100 * wv / valid, "runner_up_pct": 100 * rv / valid if len(cands) > 1 else pd.NA,
            "medsl_unofficial": bool(race.unofficial.any()),
            "source_id": "medsl_senate",
        })
    return pd.DataFrame(rows)


def apply_manual(df: pd.DataFrame) -> pd.DataFrame:
    """Null out races MEDSL gets wrong, fill from the manual file when entered, add missing races."""
    man = pd.read_csv(MANUAL / "senate_results_manual.csv")
    value_cols = ["winner_name", "winner_party", "runner_up_party", "winner_pct", "runner_up_pct"]
    df = df.astype({c: "object" for c in value_cols})
    for r in man.itertuples():
        key = (df.year == r.year) & (df.state_po == r.state_po) & (df.special == bool(r.special))
        filled = pd.notna(r.winner_party) and pd.notna(r.source_url)
        vals = {c: (getattr(r, c) if filled else pd.NA) for c in value_cols}
        src = "manual_senate_results" if filled else "manual_senate_results_pending"
        if key.any():
            for c, v in vals.items():
                df.loc[key, c] = v
            df.loc[key, "source_id"] = src
        else:
            df = pd.concat([df, pd.DataFrame([{"year": r.year, "state_po": r.state_po,
                                               "special": bool(r.special), **vals, "source_id": src}])],
                           ignore_index=True)
    return df


def add_2026(df: pd.DataFrame) -> pd.DataFrame:
    m = load_2026()
    m = m[m.record_type == "senate_race"]
    rows = []
    for r in m.itertuples():
        rows.append({"year": PROVISIONAL_YEAR, "state_po": r.state_po, "special": bool(r.special),
                     **{c: getattr(r, c) for c in ("winner_name", "winner_party", "runner_up_party",
                                                   "winner_pct", "runner_up_pct")},
                     "source_id": "manual_2026_provisional"})
    return pd.concat([df, pd.DataFrame(rows)], ignore_index=True)


def add_lineage(df: pd.DataFrame) -> pd.DataFrame:
    specials = pd.read_csv(MANUAL / "senate_specials.csv")
    cls = {(r.year, r.state_po): r.senate_class for r in specials.itertuples()}
    df["senate_class"] = [
        cls[(y, s)] if sp else regular_class(y) for y, s, sp in zip(df.year, df.state_po, df.special)
    ]
    missing = df[df.special & df.senate_class.isna()]
    if len(missing):
        raise ValueError(f"specials without a class in senate_specials.csv: {missing[['year', 'state_po']].values}")
    df = df.sort_values(["state_po", "senate_class", "year", "special"]).reset_index(drop=True)
    prev = []
    for r in df.itertuples():
        earlier = df[(df.state_po == r.state_po) & (df.senate_class == r.senate_class) & (df.year < r.year)]
        if earlier.empty:
            prev.append(pd.NA)
            continue
        last_year = earlier.year.max()
        last = earlier[earlier.year == last_year]
        # Where a special and a regular race for the same seat fell on one day, both
        # share a winner; take the regular race.
        last = last.sort_values("special").iloc[0]
        prev.append(last.winner_party)
    df["previous_party"] = prev
    df["flipped"] = [
        (w != p) if pd.notna(w) and pd.notna(p) else pd.NA for w, p in zip(df.winner_party, df.previous_party)
    ]
    return df


def build() -> pd.DataFrame:
    df = add_lineage(add_2026(apply_manual(medsl_races())))
    df = df[df.year >= FIRST_YEAR].copy()
    df["state"] = df.state_po.map(STATES)
    for c in ("winner_pct", "runner_up_pct"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["margin_pts"] = (df.winner_pct - df.runner_up_pct).round(2)
    df["winner_pct"] = df.winner_pct.round(2)
    df["runner_up_pct"] = df.runner_up_pct.round(2)
    df["is_provisional"] = df.year >= PROVISIONAL_YEAR
    df["flipped"] = df.flipped.astype("boolean")
    cols = ["year", "state", "state_po", "special", "winner_name", "winner_party", "runner_up_party",
            "winner_pct", "runner_up_pct", "margin_pts", "flipped", "previous_party", "is_provisional",
            "source_id"]
    df = df.sort_values(["year", "state_po", "special"])
    write_csv(df[cols], "senate_results_by_state.csv")
    # Side detail kept out of the main file: seat class and MEDSL's own "unofficial" flag.
    write_csv(df[["year", "state_po", "special", "senate_class", "medsl_unofficial"]],
              "senate_results_detail.csv")
    return df


if __name__ == "__main__":
    build()
