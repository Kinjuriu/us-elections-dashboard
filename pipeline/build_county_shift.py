"""Build data/processed/county_presidential_shift.csv: presidential vote by county, 2016 to 2024.

Source: MEDSL "County Presidential Election Returns 2000-2024" (doi:10.7910/DVN/VOQCHQ,
version 20.0), data/raw/medsl/countypres_2000-2024.csv, placed by hand (Dataverse guestbook).

Rules
- Votes: for each county and year, if the file has TOTAL-mode rows use them; if it has
  only vote-mode rows (absentee, early, election day, provisional and so on), sum the modes.
- dem_pct and gop_pct are shares of all votes cast (the file's `totalvotes`), in points.
  margin = dem_pct - gop_pct. shift = later margin - earlier margin (positive = towards
  Democrats). Percentages are rounded to 4 places first, then margins and shifts are
  computed from the rounded values, so they recompute exactly from the file.
- FIPS codes are zero-padded to five digits. Join keys must match us-atlas
  counties-10m.json; rows that do not are written to county_presidential_unmatched.csv.
- Oddities:
  * Alaska reports by state house district, not borough, so it cannot join to the map.
    One statewide row (fips 02000) sums the districts and goes in the unmatched file.
  * South Dakota's Oglala Lakota County is FIPS 46113 in the 2024 rows and 46102 (the
    code us-atlas and the 2016 and 2020 rows use) before; 46113 is recoded to 46102.
  * Kansas City, Missouri is reported as its own unit in every year (FIPS 2938000, and
    36000 in 2024 by mistake in the source). It spans four counties, so its votes cannot
    be split; it goes in the unmatched file, and Jackson, Clay, Platte and Cass counties
    exclude it in every year.
  * Rows with no FIPS (CT statewide write-ins, ME UOCAVA, RI federal precinct) and
    Bedford city VA (FIPS 51515, merged into Bedford County in 2013, zero votes) are
    unmatched.
  * Connecticut: the Census Bureau moved to planning regions in 2022, but this file
    keeps the old counties in all three years, which is what us-atlas has.
  * Virginia's independent cities are separate units in both the file and us-atlas.
  * Hawaii's Kalawao County (15005) is in us-atlas but not in the file.
"""
from __future__ import annotations

import json

import pandas as pd

from common import PROCESSED, RAW, ROOT, write_csv

SRC = RAW / "medsl" / "countypres_2000-2024.csv"
ATLAS = ROOT / "node_modules" / "us-atlas" / "counties-10m.json"
YEARS = (2016, 2020, 2024)
RECODE = {"46113": "46102"}
KANSAS_CITY = {"2938000", "36000"}
COLS = ["fips", "state_po", "county_name"] + [f"{s}_pct_{y}" for y in YEARS for s in ("dem", "gop")] \
    + [f"margin_{y}" for y in YEARS] + ["shift_2016_2020", "shift_2020_2024", "total_votes_2024"]


def atlas_counties() -> dict[str, str]:
    t = json.loads(ATLAS.read_text())
    return {g["id"]: g["properties"]["name"] for g in t["objects"]["counties"]["geometries"]}


def county_year_votes() -> pd.DataFrame:
    """One row per unit and year: dem, gop, listed (all candidate rows), total (file's totalvotes)."""
    d = pd.read_csv(SRC, dtype=str, keep_default_na=False)
    d = d[d.year.astype(int).isin(YEARS)].copy()
    d["year"] = d.year.astype(int)
    d["votes"] = pd.to_numeric(d.candidatevotes, errors="coerce")  # "NA" stays missing
    d["total"] = pd.to_numeric(d.totalvotes)
    d = d[d.party != ""]  # drop over/under votes, spoiled and "total votes cast" rows
    d["fips"] = d.county_fips.str.zfill(5).replace(RECODE)
    d.loc[d.county_fips.isin(KANSAS_CITY) | d.county_name.eq("KANSAS CITY"), "fips"] = "KC_MO"
    d.loc[d.county_fips.eq("NA"), "fips"] = "NA_" + d.state_po + "_" + d.county_name
    d.loc[d.state_po.eq("AK"), "fips"] = "02000"
    # Mode rule: TOTAL rows if the unit has any, otherwise sum the modes.
    key = ["year", "state_po", "fips"]
    has_total = d.groupby(key)["mode"].transform(lambda s: (s == "TOTAL").any())
    d = d[~has_total | (d["mode"] == "TOTAL")]
    # totalvotes repeats on every row of a unit, so take one value per unit (and per
    # district for Alaska, whose districts are then summed).
    key = ["year", "state_po", "fips"]
    unit = key + ["county_fips", "county_name"]
    total = d.groupby(unit).total.first().groupby(key).sum()
    g = d.groupby(key)
    out = pd.DataFrame({
        "county_name": g.county_name.first(),
        "dem": d[d.party == "DEMOCRAT"].groupby(key).votes.sum(),
        "gop": d[d.party == "REPUBLICAN"].groupby(key).votes.sum(),
        "listed": g.votes.sum(),  # empty Libertarian cells in New Mexico 2024 are skipped
        "total": total,
    }).reset_index()
    return out


def build() -> tuple[pd.DataFrame, pd.DataFrame]:
    v = county_year_votes()
    names = atlas_counties()
    wide = {}
    for y in YEARS:
        s = v[v.year == y].set_index(["state_po", "fips"])
        wide[y] = s
    idx = sorted(set().union(*[set(w.index) for w in wide.values()]))
    rows = []
    for st, fips in idx:
        r = {"fips": fips, "state_po": st}
        name = next((w.loc[(st, fips), "county_name"] for w in wide.values() if (st, fips) in w.index), None)
        for y in YEARS:
            w = wide[y]
            if (st, fips) in w.index and w.loc[(st, fips), "total"] > 0:
                x = w.loc[(st, fips)]
                r[f"dem_pct_{y}"] = round(100 * x.dem / x.total, 4)
                r[f"gop_pct_{y}"] = round(100 * x.gop / x.total, 4)
                r[f"margin_{y}"] = round(r[f"dem_pct_{y}"] - r[f"gop_pct_{y}"], 4)
                if y == 2024:
                    r["total_votes_2024"] = int(x.total)
        r["county_name"] = "Alaska (statewide)" if fips == "02000" else names.get(fips) or str(name).title()
        for a, b in ((2016, 2020), (2020, 2024)):
            if f"margin_{a}" in r and f"margin_{b}" in r:
                r[f"shift_{a}_{b}"] = round(r[f"margin_{b}"] - r[f"margin_{a}"], 4)
        rows.append(r)
    df = pd.DataFrame(rows).reindex(columns=COLS)
    df["total_votes_2024"] = df.total_votes_2024.astype("Int64")
    matched = df.fips.isin(names)
    return df[matched].sort_values("fips").reset_index(drop=True), df[~matched].sort_values("fips").reset_index(drop=True)


def main() -> None:
    joined, unmatched = build()
    names = atlas_counties()
    write_csv(joined, "county_presidential_shift.csv")
    write_csv(unmatched, "county_presidential_unmatched.csv")
    missing = sorted(set(names) - set(joined.fips) - {k for k in names if k.startswith("02")})
    us50 = [k for k in missing if k[:2] not in ("60", "66", "69", "72", "78")]
    print("us-atlas counties (outside Alaska and territories) with no data:", us50)
    print("unmatched rows:", len(unmatched))


if __name__ == "__main__":
    main()
