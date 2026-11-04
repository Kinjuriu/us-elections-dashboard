"""Build data/processed/midterm_swing.csv.

For each midterm (1946 to 2026) and chamber: the seats held by the president's
party caucus (the party plus the independents who caucus with it).

- "before" is the composition on election day in the outgoing Congress, read
  from the dated rows of the Senate's party division tables. The House
  Historian records only opening-day divisions, so House rows keep the opening
  day of the outgoing Congress and are flagged.
- "after" is the opening day of the new Congress.

Which way each independent caucuses comes from data/manual/independents.csv
(opening day of each Congress), plus any senator who became an independent
during the Congress (data/manual/senate_seat_changes.csv).
"""
from __future__ import annotations

import pandas as pd

from build_chamber_control import parse_house, parse_senate_rows
from common import (
    FIRST_CONGRESS, LAST_CONGRESS, MANUAL, PROVISIONAL_YEAR, election_day, election_year,
    load_2026, load_presidents, president_on, write_csv,
)


def _caucus_count(n_ind: int, mapping: pd.DataFrame, party: str, where: str, flags: list) -> int:
    """Independents caucusing with `party`, flagging anything the files cannot support."""
    if n_ind == 0:
        return 0
    if len(mapping) != n_ind:
        flags.append(f"{where}: {n_ind} independent(s) but caucus known for {len(mapping)}; none counted")
        return 0
    unknown = mapping.caucuses_with.isna().sum()
    if unknown:
        flags.append(f"{where}: caucus unknown for {unknown} independent(s); not counted")
    unverified = mapping[~mapping.verified.astype(bool) & mapping.caucuses_with.notna()]
    if len(unverified):
        names = ", ".join(unverified.name.fillna("unnamed"))
        flags.append(f"{where}: caucus not yet verified for {names}")
    return int((mapping.caucuses_with == party).sum())


def build() -> pd.DataFrame:
    presidents = load_presidents()
    ind = pd.read_csv(MANUAL / "independents.csv").rename(columns={"verified_in_source": "verified"})
    changes = pd.read_csv(MANUAL / "senate_seat_changes.csv", parse_dates=["effective_date"])
    to_ind = changes[changes.party_in == "IND"].rename(columns={"senator_in": "name"})
    to_ind = to_ind.assign(caucuses_with=to_ind.caucuses_with.where(to_ind.caucuses_with.notna(), None))

    house = parse_house().set_index("congress")
    senate_rows = parse_senate_rows()
    senate_open = senate_rows[(senate_rows.table == 0) & (senate_rows.row == 0)].set_index("congress")
    prov = load_2026()
    prov = prov[prov.record_type == "chamber_seats"].set_index("chamber")

    def mapping(chamber: str, congress: int) -> pd.DataFrame:
        return ind[(ind.chamber == chamber) & (ind.congress == congress)][["name", "caucuses_with", "verified"]]

    rows = []
    for congress in range(FIRST_CONGRESS, LAST_CONGRESS + 1):
        year = election_year(congress)
        if year % 4 != 2:
            continue
        eday = election_day(year)
        name, party = president_on(eday, presidents)
        col = party.lower()
        outgoing = congress - 1

        for chamber in ("house", "senate"):
            flags = []
            # Before: election day (Senate) or opening day (House).
            if chamber == "senate":
                g = senate_rows[(senate_rows.congress == outgoing) & (senate_rows.as_of <= eday)]
                b = g.iloc[-1]
                basis, as_of = "election_day", b.as_of
                opening_n = int(senate_open.loc[outgoing].ind)
                switched = to_ind[(to_ind.effective_date > pd.Timestamp(senate_open.loc[outgoing].as_of))
                                  & (to_ind.effective_date <= pd.Timestamp(eday))]
                m = pd.concat([mapping("senate", outgoing), switched[["name", "caucuses_with", "verified"]]])
                if int(b.ind) != opening_n + len(switched):
                    m = m.iloc[0:0]  # composition of independents changed in a way the files don't cover
            else:
                b = house.loc[outgoing]
                basis, as_of = "opening_day", None
                flags.append("House source gives opening-day counts only; before = opening of outgoing Congress")
                m = mapping("house", outgoing)
            before = int(b[col]) + _caucus_count(int(b.ind), m, party, "before", flags)
            ind_before = int(b.ind)

            # After: opening day of the new Congress.
            if congress == LAST_CONGRESS:
                a = prov.loc[chamber]
                if pd.isna(a[col]):
                    after, ind_after = pd.NA, pd.NA
                else:
                    ind_after = int(a.ind) if pd.notna(a.ind) else 0
                    after = int(a[col]) + _caucus_count(ind_after, mapping(chamber, congress), party, "after", flags)
            else:
                a = senate_open.loc[congress] if chamber == "senate" else house.loc[congress]
                ind_after = int(a.ind)
                after = int(a[col]) + _caucus_count(ind_after, mapping(chamber, congress), party, "after", flags)

            rows.append({
                "year": year, "president": name, "president_party": party, "chamber": chamber,
                "seats_before": before, "seats_after": after,
                "change": (after - before) if pd.notna(after) else pd.NA,
                "is_provisional": year >= PROVISIONAL_YEAR,
                "before_basis": basis, "before_as_of": as_of,
                "independents_before": ind_before, "independents_after": ind_after,
                "flag": "; ".join(flags),
            })
    df = pd.DataFrame(rows)
    for c in ("seats_before", "seats_after", "change", "independents_after"):
        df[c] = df[c].astype("Int64")
    write_csv(df, "midterm_swing.csv")
    return df


if __name__ == "__main__":
    build()
