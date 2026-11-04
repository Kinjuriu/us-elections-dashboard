"""Build data/processed/senate_results_by_state.csv (2000 to 2026).

One row per Senate race, regular and special. Results come from MEDSL's
statewide Senate returns; the deciding round is used (runoff where there was
one; the January 2021 Georgia runoffs are filed under the 2020 cycle).

Vote shares use valid votes: candidate rows marked as over votes, under votes,
blanks or exhausted ballots are dropped from the denominator.

Two flip definitions are kept:
- flipped_vs_last_election: winner's party against previous_party, the party that
  won the last election for the same seat (same state and Senate class).
- flipped_vs_holder (used on the site): true only when the seat moves from one
  caucus to the other. holder_party is the party holding the seat on election day:
  previous_party updated by any appointment or party switch in
  data/manual/senate_seat_changes.csv dated between 3 January after the last
  election and this election day. holder_caucus and winner_caucus are DEM or GOP;
  an independent takes the caucus listed for them in data/manual/independents.csv
  (elected independents) or senate_seat_changes.csv (switches and appointments).
- party_changed: the winner's party label differs from holder_party, whether or
  not the caucus changed (e.g. Independent to Democrat in AZ 2024).

Election dates are the November general election day. Off-cycle specials missing
from MEDSL (MA 2010 and 2013, NJ 2013, AL 2017) use their year's November date
too; no listed seat change falls between their real date and that one.
"""
from __future__ import annotations

import pandas as pd

from common import (
    MANUAL, NON_VOTE_RE, PROVISIONAL_YEAR, RAW, STATES, display_name, election_day, load_2026,
    load_display_names, normalise_party, write_csv,
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
                                                   "winner_pct", "runner_up_pct", "called")},
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
    df["flipped_vs_last_election"] = _flip(df.winner_party, df.previous_party)
    df["winner_caucus"] = [_caucus(p, y, s) for p, y, s in zip(df.winner_party, df.year, df.state_po)]
    holder = holder_on_election_day(df)
    df["holder_party"] = [h[0] for h in holder]
    df["holder_caucus"] = [h[1] for h in holder]
    df["flipped_vs_holder"] = _flip(df.winner_caucus, df.holder_caucus)
    df["party_changed"] = _flip(df.winner_party, df.holder_party)
    return df


_INDEPENDENTS = None


def _caucus(party, year: int, state_po: str):
    """DEM or GOP for the major parties; for an elected independent, the caucus listed
    in independents.csv for the Congress they joined (or sat in, for odd-year races)."""
    global _INDEPENDENTS
    if pd.isna(party):
        return pd.NA
    if party in ("DEM", "GOP"):
        return party
    if party != "IND":
        return pd.NA
    if _INDEPENDENTS is None:
        _INDEPENDENTS = pd.read_csv(MANUAL / "independents.csv")
    congress = (year - 1786 - year % 2) // 2
    hit = _INDEPENDENTS[(_INDEPENDENTS.chamber == "senate") & (_INDEPENDENTS.congress == congress)
                        & (_INDEPENDENTS.state_po == state_po)]
    if len(hit) != 1:
        raise ValueError(f"no single caucus entry for independent {state_po} {year} (Congress {congress})")
    c = hit.caucuses_with.iloc[0]
    return c if pd.notna(c) else pd.NA


def _flip(winner: pd.Series, before: pd.Series) -> list:
    return [(w != p) if pd.notna(w) and pd.notna(p) else pd.NA for w, p in zip(winner, before)]


def holder_on_election_day(df: pd.DataFrame) -> list[tuple]:
    """(party, caucus) holding each seat on election day."""
    changes = pd.read_csv(MANUAL / "senate_seat_changes.csv", parse_dates=["effective_date"])
    holders = []
    for r in df.itertuples():
        earlier = df[(df.state_po == r.state_po) & (df.senate_class == r.senate_class) & (df.year < r.year)]
        # Count changes from 3 January after the last election, when its winner took the
        # seat: an interim appointment made between election day and then (Barkley,
        # MN 2002) ends when the elected senator is sworn in.
        since = pd.Timestamp(earlier.year.max() + 1, 1, 3) if len(earlier) else pd.Timestamp.min
        seat = changes[(changes.state_po == r.state_po) & (changes.senate_class == r.senate_class)
                       & (changes.effective_date > since)
                       & (changes.effective_date < pd.Timestamp(election_day(r.year)))]
        if len(seat):
            last = seat.sort_values("effective_date").iloc[-1]
            caucus = last.caucuses_with if pd.notna(last.caucuses_with) else pd.NA
            holders.append((last.party_in, caucus))
        elif len(earlier):
            prev = earlier[earlier.year == earlier.year.max()].sort_values("special").iloc[0]
            holders.append((r.previous_party, prev.winner_caucus))
        else:
            holders.append((pd.NA, pd.NA))
    return holders


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
    # Every certified race is called; provisional ones carry the call from the manual file.
    df["called"] = df.called.where(df.is_provisional, True).astype("boolean")
    names = load_display_names()
    df["winner_display_name"] = [display_name(n, names) if pd.notna(n) else pd.NA for n in df.winner_name]
    for c in ("flipped_vs_last_election", "flipped_vs_holder", "party_changed"):
        df[c] = df[c].astype("boolean")
    cols = ["year", "state", "state_po", "special", "winner_name", "winner_party", "runner_up_party",
            "winner_pct", "runner_up_pct", "margin_pts", "flipped_vs_last_election", "previous_party",
            "flipped_vs_holder", "holder_party", "holder_caucus", "winner_caucus", "party_changed",
            "is_provisional", "called", "winner_display_name", "source_id"]
    df = df.sort_values(["year", "state_po", "special"])
    write_csv(df[cols], "senate_results_by_state.csv")
    # Side detail kept out of the main file: seat class and MEDSL's own "unofficial" flag.
    write_csv(df[["year", "state_po", "special", "senate_class", "medsl_unofficial"]],
              "senate_results_detail.csv")
    return df


if __name__ == "__main__":
    build()
