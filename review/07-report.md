# Step 07 report: data for the next round of visuals

**A (county shift) and B (members, women, age) are built. C is dropped to the backlog. E is still blocked.** `run_all.py` runs end to end: exit 0, 36 tests pass, and the existing processed files are unchanged. Nothing was estimated or typed from memory.

## B. Who serves in Congress: built

- Source: `unitedstates/congress-legislators` (CC0), pinned to commit `15530b7d` (24 Oct 2026). Downloaded by `pipeline/download.py`, built by `pipeline/build_members.py`, added to `run_all.py`. `pyyaml` added to requirements (pre-approved).
- Outputs, 80th to 119th Congress (1947 to 2025):
  - `members_by_congress.csv`: 21,903 rows
  - `women_by_congress.csv`: 80 rows
  - `age_by_congress.csv`: 80 rows
- **Counting rule:** anyone who served at any point in the Congress, once per chamber. House totals therefore run above 435.
- **Opening-day counts: not built.** The source has only a term start date and gives some later joiners the opening date. In the 86th House, 447 terms start on opening day for 435 seats.
- Voting seats only. Delegates, resident commissioners and Alaska and Hawaii's delegates before statehood are excluded.
- Party is the party on a member's first day in that Congress. `women_other` includes independents.
- Gaps: three members have no birthday, so their age is null (80th Rohrbough, 88th Burkhalter, 96th Hutchinson). No member lacks a gender.
- 120th Congress left out as instructed.
- Tests added: coverage, no duplicates, seat-count bounds, women counts match members, age bands sum to 1, cross-check within 5.

### Cross-check against published totals

CAWP's site returns HTTP 403 to scripts, so for 1991 to 2021 I used the Congressional Research Service report R43244 (Table A-1, "served in each Congress", Representatives only, as of 16 Dec 2021). That is not CAWP, so please treat it as a stand-in. For 2025 I used CAWP's own 2 January 2025 release. Rows are in `data/manual/women_crosscheck.csv` with URLs.

| Congress | Chamber | Published | Ours | Difference |
|---|---|---|---|---|
| 102nd (1991) | House | 29 | 29 | 0 |
| 102nd | Senate | 4 | 4 | 0 |
| 107th (2001) | House | 60 | 60 | 0 |
| 107th | Senate | 14 | 13 | -1 |
| 112th (2011) | House | 76 | 76 | 0 |
| 112th | Senate | 17 | 17 | 0 |
| 117th (2021) | House | 122 | 126 | +4 |
| 117th | Senate | 26 | 26 | 0 |
| 119th (2025) | House | 125 | 128 | +3 |
| 119th | Senate | 25 | 27 | +2 |

- The 117th CRS figure is as of 16 Dec 2021, before the Congress ended, so the +4 is expected.
- The 119th CAWP figure is the count on the first day. Ours includes women who joined later, so +3 and +2 are expected.
- **107th Senate (13 against 14):** explained. The source dates Lisa Murkowski's appointed term from 7 January 2003 (her father's term ends 19 December 2002), so she falls in the 108th, not the 107th. She was appointed in December 2002, so the published count of 14 likely includes her. Source data left as is, and noted in `data/manual/women_crosscheck.csv`.

## A. County presidential shift: built

- Source: MEDSL county presidential returns, doi:10.7910/DVN/VOQCHQ, version 20.0 (25 Feb 2026), CC0, at `data/raw/medsl/countypres_2000-2024.csv`. Built by `pipeline/build_county_shift.py`, added to `run_all.py`. The CSV path is registered in `download.py`'s manual files.
- Outputs:
  - `county_presidential_shift.csv`: 3,112 rows, every key in `us-atlas` `counties-10m.json`, with all the columns you listed.
  - `county_presidential_unmatched.csv`: 6 rows that cannot join.
- **Mode rule, as the codebook says:** a county with TOTAL rows uses them; a county with only vote modes has them summed. That affects 849 counties in 2020 and 376 in 2024. Shares are of `totalvotes`.
- **Spot check:** Autauga AL 2024 gives Harris 26.30% (7,439 of 28,281) and Trump 72.43%.
- **Oddities handled:**
  - Alaska reports by state house district. I took the statewide row (fips 02000, in the unmatched file) and left the boroughs out.
  - Kansas City MO is its own unit in every year and spans four counties, so it is unmatched. Jackson, Clay, Platte and Cass exclude it in every year, so their shifts are consistent but their totals are not whole counties.
  - South Dakota's Oglala Lakota is 46113 in 2024 and 46102 before. I recoded 46113 to 46102 to match the atlas.
  - Connecticut keeps its old counties in all three years, which is what the atlas has, so the 2022 planning-region change never appears.
  - Virginia's independent cities are separate units in the file and the atlas, and all join.
- **Join failures, all listed in the unmatched file:** Alaska statewide; Kansas City MO; Bedford city VA (51515, 2016, zero votes, merged in 2013); CT statewide write-ins, ME UOCAVA and RI federal precinct (no FIPS).
- **Atlas counties with no data:** Kalawao, HI (15005) only.
- **Gaps:** the New Mexico 2024 Libertarian cells are `NA` in the source and stay missing (no effect on the two parties). Vermont 2024 candidate votes are 0.9% under `totalvotes` and DC 2024 is 0.8% over. Every other state and year is within the 0.5% target, and the test lists those two as known exceptions.
- **Tests:** every key joins to the atlas; no county is missing in any year; state vote totals within 0.5%; margins and shifts recompute exactly.

## E. Governors: still blocked

- **NGA:** its former-governors database sits in a script-driven search page, and I could find no reuse terms anywhere on nga.org; the footer says "All rights reserved". Under your rule I did not use it.
- **State official lists:** this would need 50 separate state sources, with exact start dates, for 26 years. I could not do that reliably from scripts, and I would not fill the gaps from memory. I did not start it.
- **Not usable:** the Dataverse "United States Governors 1775-2020" (doi:10.7910/DVN/RYY3OW, CC BY 4.0) drops governors who were still in office when it was compiled. Governors present by year: 48 in 2012, 46 in 2015, 37 in 2016, 26 in 2018, 1 in 2020 (50 states needed).
- **Decision for you:** (1) you accept NGA's facts and I scrape them, (2) allow Wikipedia (CC BY-SA), or (3) leave the governors map in the backlog.

## Backlog

- **Issue priority heatmap (C):** dropped for now, as you decided. The CES 2024 file and questionnaires I had downloaded are deleted, and no ANES work was started. Nothing for it is in the pipeline. Reason on record: CES 2024 has no "most important issue" question, and ANES needs a registered download.
- **Governors map (E):** see above.

## Open questions

1. Which governors source do you want (NGA, Wikipedia, or backlog)?
2. Is the CRS stand-in fine for the cross-check, or will you check CAWP's tables by hand?
