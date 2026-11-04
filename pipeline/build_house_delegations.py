"""Build data/processed/house_delegations_by_state.csv (2000 to 2026).

One row per state per general election, from MEDSL district returns: who won
each district (most votes in the deciding round) and each party's share of all
valid House votes cast in the state. Independents are counted in "other",
since this file has no "ind" column.

Districts where the only race that year was flagged "special" (Texas 2006,
after court-ordered redistricting) use that race. DC's non-voting delegate is
excluded.
"""
from __future__ import annotations

import pandas as pd

from common import NON_VOTE_RE, PROVISIONAL_YEAR, RAW, STATES, load_2026, normalise_party, write_csv

FIRST_YEAR = 2000


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
    w["bucket"] = w.party.map({"DEM": "dem", "GOP": "gop", "IND": "other", "OTHER": "other"})
    seats = w.pivot_table(index=["year", "state_po"], columns="bucket", values="district",
                          aggfunc="count", fill_value=0)
    seats["seats"] = seats.sum(axis=1)

    d["p"] = d.party.map(normalise_party)
    votes = d.groupby(["year", "state_po"]).votes.sum()
    dem = d[d.p == "DEM"].groupby(["year", "state_po"]).votes.sum()
    gop = d[d.p == "GOP"].groupby(["year", "state_po"]).votes.sum()
    out = seats.reset_index()
    idx = pd.MultiIndex.from_frame(out[["year", "state_po"]])
    out["dem_vote_share"] = (100 * dem.reindex(idx).fillna(0).values / votes.reindex(idx).values).round(2)
    out["gop_vote_share"] = (100 * gop.reindex(idx).fillna(0).values / votes.reindex(idx).values).round(2)
    out["vacant"] = 0
    out["is_provisional"] = False
    out["source_id"] = "medsl_house"

    # 2026: apportionment is unchanged since 2022, so seats per state come from 2024.
    seats_2024 = out[out.year == 2024].set_index("state_po").seats
    m = load_2026()
    m = m[m.record_type == "house_delegation"]
    prov = pd.DataFrame({
        "year": PROVISIONAL_YEAR, "state_po": m.state_po.values,
        "seats": m.state_po.map(seats_2024).values,
        **{c: m[c].values for c in ("dem", "gop", "other", "vacant", "dem_vote_share", "gop_vote_share")},
        "is_provisional": True, "source_id": "manual_2026_provisional",
    })
    out = pd.concat([out, prov], ignore_index=True)
    out["state"] = out.state_po.map(STATES)
    for c in ("dem", "gop", "other", "vacant", "seats"):
        out[c] = out[c].astype("Int64")
    cols = ["year", "state", "state_po", "seats", "dem", "gop", "other", "vacant",
            "dem_vote_share", "gop_vote_share", "is_provisional", "source_id"]
    out = out.sort_values(["year", "state_po"])
    write_csv(out[cols], "house_delegations_by_state.csv")
    write_csv(w.sort_values(["year", "state_po", "district"]), "house_district_winners.csv")
    return out


if __name__ == "__main__":
    build()
