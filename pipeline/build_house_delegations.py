"""Build data/processed/house_delegations_by_state.csv (2000 to 2026).

One row per state per general election, from MEDSL district returns: who won
each district (most votes in the deciding round) and each party's share of all
valid House votes cast in the state. Independents (e.g. Sanders, Goode) are in
"ind"; any other party is in "other".

Districts where the only race that year was flagged "special" (Texas 2006,
after court-ordered redistricting) use that race. DC's non-voting delegate is
excluded.
"""
from __future__ import annotations

import pandas as pd

from common import NON_VOTE_RE, PROVISIONAL_YEAR, RAW, STATES, load_2026, normalise_party, write_csv

FIRST_YEAR = 2000

# District results the House Historian does not count as seats at the opening of
# the next Congress (its footnotes 5 and 6 on the Party Divisions page).
#   "vacant": the seat is counted as vacant instead of for its vote leader.
#   "note":   the seat keeps its vote leader and the state row carries a note.
DISTRICT_ADJUSTMENTS = {
    (2018, "NC", 9): ("vacant", "NC-9 counted as vacant: the 2018 election was never certified "
                                "and was re-run in 2019."),
    (2020, "NY", 22): ("note", "NY-22 counted for the Republican: the count finished after the "
                               "117th Congress opened on 3 January 2021."),
}


def load_medsl() -> pd.DataFrame:
    path = RAW / "medsl" / "1976-2024-house.tab"
    if not path.exists():
        raise FileNotFoundError(f"{path} is missing; see pipeline/download.py for how to get it")
    d = pd.read_csv(path, low_memory=False)  # comma-separated despite the .tab name
    expected = {"year", "state_po", "district", "stage", "runoff", "special", "candidate", "party",
                "candidatevotes", "fusion_ticket"}
    if not expected <= set(d.columns):
        raise ValueError(f"MEDSL House columns changed; missing {expected - set(d.columns)}")
    d = d[(d.year >= FIRST_YEAR) & d.state_po.isin(STATES.keys())].copy()
    if set(d.stage.str.upper()) - {"GEN"}:
        raise ValueError(f"unexpected stages: {set(d.stage)}")
    d = d[~d.candidate.fillna("").str.contains(NON_VOTE_RE)]
    d["candidate"] = d.candidate.fillna("(unnamed write-ins)")
    d["votes"] = d.candidatevotes.clip(lower=0)  # unopposed Florida races are recorded as 0 or -1
    key = ["year", "state_po", "district"]
    has_regular = d.groupby(key).special.transform(lambda s: (~s.astype(bool)).any())
    d = d[~d.special.astype(bool) | ~has_regular]
    is_runoff = d.runoff.astype("boolean").fillna(False)
    has_runoff = is_runoff.groupby([d[k] for k in key]).transform("any")
    d = d[is_runoff | ~has_runoff]
    return d


def district_winners(d: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (year, po, dist), race in d.groupby(["year", "state_po", "district"]):
        best = None
        for name, g in race.groupby("candidate"):
            parties = {normalise_party(p) for p in g.party} - {None}
            party = next((p for p in ("DEM", "GOP", "IND", "OTHER") if p in parties), None)
            v = g.votes.sum()
            if best is None or v > best[0]:
                best = (v, name, party)
        rows.append({"year": year, "state_po": po, "district": dist, "winner": best[1], "party": best[2]})
    return pd.DataFrame(rows)


def build() -> pd.DataFrame:
    d = load_medsl()
    w = district_winners(d)
    unknown = w[w.party.isna()]
    if len(unknown):
        raise ValueError(f"district winners with no party:\n{unknown}")
    w["bucket"] = w.party.map({"DEM": "dem", "GOP": "gop", "IND": "ind", "OTHER": "other"})
    w["note"] = ""
    for (year, po, dist), (action, note) in DISTRICT_ADJUSTMENTS.items():
        hit = (w.year == year) & (w.state_po == po) & (w.district == dist)
        if hit.sum() != 1:
            raise ValueError(f"adjustment target not found: {year} {po}-{dist}")
        if action == "vacant":
            w.loc[hit, "bucket"] = "vacant"
        w.loc[hit, "note"] = note
    seats = w.pivot_table(index=["year", "state_po"], columns="bucket", values="district",
                          aggfunc="count", fill_value=0)
    seats = seats.reindex(columns=["dem", "gop", "ind", "other", "vacant"], fill_value=0)
    seats["seats"] = seats.sum(axis=1)
    notes = w[w.note != ""].groupby(["year", "state_po"]).note.agg(" ".join)

    d["p"] = d.party.map(normalise_party)
    votes = d.groupby(["year", "state_po"]).votes.sum()
    dem = d[d.p == "DEM"].groupby(["year", "state_po"]).votes.sum()
    gop = d[d.p == "GOP"].groupby(["year", "state_po"]).votes.sum()
    out = seats.reset_index()
    idx = pd.MultiIndex.from_frame(out[["year", "state_po"]])
    out["dem_vote_share"] = (100 * dem.reindex(idx).fillna(0).values / votes.reindex(idx).values).round(2)
    out["gop_vote_share"] = (100 * gop.reindex(idx).fillna(0).values / votes.reindex(idx).values).round(2)
    out["note"] = [notes.get((y, s), "") for y, s in zip(out.year, out.state_po)]
    out["is_provisional"] = False
    out["called"] = True
    out["source_id"] = "medsl_house"

    # 2026: apportionment is unchanged since 2022, so seats per state come from 2024.
    seats_2024 = out[out.year == 2024].set_index("state_po").seats
    m = load_2026()
    m = m[m.record_type == "house_delegation"]
    prov = pd.DataFrame({
        "year": PROVISIONAL_YEAR, "state_po": m.state_po.values,
        "seats": m.state_po.map(seats_2024).values,
        **{c: m[c].values for c in ("dem", "gop", "ind", "other", "vacant", "dem_vote_share",
                                    "gop_vote_share")},
        "note": "",
        "is_provisional": True, "called": m.called.values, "source_id": "manual_2026_provisional",
    })
    out = pd.concat([out, prov], ignore_index=True)
    out["state"] = out.state_po.map(STATES)
    out["called"] = out.called.astype("boolean")
    for c in ("dem", "gop", "ind", "other", "vacant", "seats"):
        out[c] = out[c].astype("Int64")
    cols = ["year", "state", "state_po", "seats", "dem", "gop", "ind", "other", "vacant",
            "dem_vote_share", "gop_vote_share", "is_provisional", "called", "note", "source_id"]
    out = out.sort_values(["year", "state_po"])
    write_csv(out[cols], "house_delegations_by_state.csv")
    write_csv(w.sort_values(["year", "state_po", "district"]), "house_district_winners.csv")
    return out


if __name__ == "__main__":
    build()
