"""Build data/processed/midterm_swing.csv.

For each midterm (1946 to 2026) and chamber: the president's party seats at the
start of the outgoing Congress ("before") and at the start of the new Congress
("after"). The president is the one in office on election day.
"""
from __future__ import annotations

import pandas as pd

from build_chamber_control import all_congresses
from common import (
    FIRST_CONGRESS, LAST_CONGRESS, PROVISIONAL_YEAR, election_day, election_year,
    load_2026, load_presidents, president_on, write_csv,
)


def build() -> pd.DataFrame:
    presidents = load_presidents()
    seats = all_congresses()[["congress", "chamber", "dem", "gop"]]
    prov = load_2026()
    prov = prov[prov.record_type == "chamber_seats"][["chamber", "dem", "gop"]].assign(congress=LAST_CONGRESS)
    seats = pd.concat([seats, prov], ignore_index=True).set_index(["congress", "chamber"])

    rows = []
    for congress in range(FIRST_CONGRESS, LAST_CONGRESS + 1):
        year = election_year(congress)
        if year % 4 != 2:
            continue
        name, party = president_on(election_day(year), presidents)
        col = party.lower()
        for chamber in ("house", "senate"):
            before = seats.loc[(congress - 1, chamber), col]
            after = seats.loc[(congress, chamber), col]
            before = int(before) if pd.notna(before) else pd.NA
            after = int(after) if pd.notna(after) else pd.NA
            rows.append({
                "year": year, "president": name, "president_party": party, "chamber": chamber,
                "seats_before": before, "seats_after": after,
                "change": (after - before) if pd.notna(before) and pd.notna(after) else pd.NA,
                "is_provisional": year >= PROVISIONAL_YEAR,
            })
    df = pd.DataFrame(rows)
    for c in ("seats_before", "seats_after", "change"):
        df[c] = df[c].astype("Int64")
    write_csv(df, "midterm_swing.csv")
    return df


if __name__ == "__main__":
    build()
