# Step 07 report: data for the next round of visuals

**A (county shift), B (members, women, age) and E (governors) are built. C is dropped to the backlog.** `run_all.py` runs end to end: exit 0, 36 tests pass, and the existing processed files are unchanged. Nothing was estimated or typed from memory.

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

## E. Governors: built from Wikipedia (CC BY-SA 4.0)

- **Source:** Wikipedia's "List of governors of <State>" pages, as you decided. `download.py` fetches each page through the Wikipedia API, keeps only its tables in `data/raw/wikipedia_governors/` (7.4MB) and records the revision id and time in the manifest. Wikipedia sometimes refuses bursts of requests, so the download retries with a pause.
- **Outputs, built by `pipeline/build_governors.py` (added to `run_all.py`):**
  - `governors_terms.csv`: 247 terms overlapping 2000 to 2025. Columns as you asked, plus `party_note` for the three mid-term party changes. `source_url` is the page's permalink.
  - `governors_by_year.csv`: 1,300 rows (50 states, 2000 to 2025), the governor in office on 1 January.
- **Licence:** both files are marked CC BY-SA 4.0 and Wikipedia is credited in `data/SOURCES.md`. The rest of the data stays CC0.
- **Party changes in a term:** the pages show the party at the start of a term and give a switch only in a footnote. Three governors switched: Crist (FL, Republican to Independent, April 2010), Chafee (RI, Independent to Democratic, 30 May 2013) and Justice (WV, Democratic to Republican, August 2017). I put these in `data/manual/governor_party_changes.csv`, with the footnote wording and source. This changes 1 January parties for Crist 2011, Chafee 2014 and 2015, and Justice 2018 to 2025. The build stops if a page lists two parties on a term with no row in that file. A scan of all 50 pages for other switch footnotes found only these three (Mississippi's Amy Tuck was a lieutenant governor).
- **Not changed:** `Democratic-Farmer-Labor` (Minnesota, 14 year-rows) and `Reform/Independence` (Ventura, 4 rows) are kept as written. Decide how the map groups them.
- **Dates:** pages end a term either on the last day or on the successor's start day, so consecutive terms are 0 or 1 days apart. I did not adjust them.
- **Tests (6, all pass):** 50 governors in each of the 26 years, one per state; no gap or overlap between consecutive terms in a state (0 or 1 days apart); only the last term in a state is open-ended; each by-year row matches a term in force on 1 January; the three party switches give the right 1 January party.
- **Spot checks against official state sites (5 states):**

| State | Term in our file | Official site | Result |
|---|---|---|---|
| Ohio | DeWine from 14 Jan 2019 | governor.ohio.gov, swearing-in 14 Jan 2019 (Kasich's term ends the same day) | matches |
| Michigan | Whitmer from 1 Jan 2019 | michigan.gov/whitmer, sworn in 1 Jan 2019 | matches |
| Texas | Abbott from 20 Jan 2015 | lrl.texas.gov and tsl.texas.gov governors lists, 20 Jan 2015 | matches |
| New York | Hochul from 24 Aug 2021 | governor.ny.gov, sworn in at midnight on 24 Aug 2021 | matches |
| Florida | DeSantis from 8 Jan 2019 | flgov.com and dos.fl.gov, 8 Jan 2019 | matches |

  - **West Virginia was not confirmed.** I tried it as a fifth check first. governorjustice.wv.gov gives no swearing-in date, and I could not reach the state's governors book (404). Its only confirmation is that the state lists Justice as a Republican today. His January 2017 start and August 2017 switch rest on Wikipedia alone. I replaced it with Florida.
  - The official pages were read through search results, not page by page, for Ohio, Michigan, Texas, New York and Florida. Several state sites block scripted requests or returned 404 at the addresses I guessed.

## Backlog

- **Issue priority heatmap (C):** dropped for now, as you decided. The CES 2024 file and questionnaires I had downloaded are deleted, and no ANES work was started. Nothing for it is in the pipeline. Reason on record: CES 2024 has no "most important issue" question, and ANES needs a registered download.

## Open questions

1. How should the map group `Democratic-Farmer-Labor` and `Reform/Independence`?
2. Is the CRS stand-in fine for the cross-check, or will you check CAWP's tables by hand?
