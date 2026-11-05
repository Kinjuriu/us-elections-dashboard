# Sources

Every number in `data/processed/` comes from one of the sources below, through a script in `pipeline/`. Raw files sit in `data/raw/` and are never edited; `data/raw/manifest.json` records the URL, access time and SHA-256 of each download. All dates accessed are 4 November 2026 unless stated.

Party codes used in every file: `DEM` (Democratic, including Minnesota's Democratic-Farmer-Labor), `GOP` (Republican), `IND` (independent), `OTHER` (any other party).

## Timing rule: seats at the start of each Congress

`chamber_control.csv` and `midterm_swing.csv` count seats **at the opening of each Congress**, not on election night and not at the end of the Congress.

- **House:** the Historian's table gives divisions "as of the initial election results for a particular Congress"; later deaths, resignations, special elections and party switches are not included.
- **Senate:** we take the first dated row of each Congress's 1st session in the Senate's table, which is the opening-day division. The Senate's summary line is sometimes a later position (for the 117th it shows 48 D and 50 R, the position after 20 January 2021), so we do not use it.
- **Majority party (Senate):** the party the Senate lists first for the opening day. Two Congresses are affected by the opening-day rule:
  - 107th: DEM, because Vice President Gore broke ties from 3 to 20 January 2001.
  - 117th: GOP, because the 51 R opening count came before the Georgia runoff winners were seated on 20 January 2021.
- **Majority for most of the Congress:** `majority_party_most_of_congress` is the party that held the Senate for the most days, measured from the dated session tables. `majority_note` explains every Congress where control changed hands, using the Senate page's footnotes. Only the 107th and 117th qualify:
  - 107th: DEM at the opening, GOP from 20 January 2001, DEM from 6 June 2001 (Jeffords). DEM for most of the Congress.
  - 117th: GOP at the opening, DEM from 20 January 2021. DEM for most of the Congress.

  The House Historian gives one division per Congress and no House majority changed hands during a Congress in this period, so for the House the column equals `majority_party`. Charts use `majority_party_most_of_congress`, with a footnote marker where `majority_note` is set.
- **Majority threshold:** `floor(total_seats / 2) + 1`, so 218 for a 435-seat House and 51 for a 100-seat Senate. In a 50-50 Senate the Vice President's tie-breaking vote decides control; the threshold column does not model that.

## Senate count on the day control was settled

`senate_control_day.csv` (from `data/manual/senate_control_day.csv`) gives the Senate count after opening day for the two Congresses where control differs from opening day. Each row is copied from a dated row of the Senate Historical Office's own party division page (archived copy above) and the pipeline checks the numbers against it.

- 117th: 20 January 2021, 48 D, 50 R, 2 independents caucusing with the Democrats; Democratic control through the vice president's tie-breaking vote.
- 107th: 6 June 2001, 50 D, 49 R, 1 independent (Jeffords) caucusing with the Democrats; 51 for the Democratic caucus, no vice president needed.

The Congress card reads these as "50 Democrats, with the vice president" (2020) and "51 Democrats" (2000), with the opening-day count in the line underneath.

## Firsts of 2026

`data/manual/firsts.csv` holds one row per first, each with a source URL and access time. A first is entered only when CAWP, the House Historian, the Senate Historical Office, the National Governors Association, a state's official page or a major news organisation states it. No rows were entered on 5 November 2026 because no 2026 general-election result could be read from an allowed source.

## Statehood seats, 1959 to 1963

- **House:** 435 seats, except 436 at the opening of the 86th Congress (Alaska seated in January 1959; Hawaii's member joined on 21 August 1959) and 437 in the 87th. Back to 435 from the 88th.
- **Senate:** 96 senators through the 85th Congress, 98 at the opening of the 86th (Alaska's two senators), and 100 from the 87th. Hawaii's two senators were seated on 21 August 1959.

## Midterm swing definition

Seats are counted by **caucus**: the president's party plus the independents who caucus with it. Third-party members such as the Conservative James Buckley are not counted.

- **Senate `seats_before`:** the composition on election day. This is the last dated row in the Senate's session tables on or before election day in the outgoing Congress (`before_basis = election_day`, `before_as_of` is the row date).
- **House `seats_before`:** the House Historian records only opening-day divisions, so House rows keep the opening day of the outgoing Congress (`before_basis = opening_day`) and are flagged.
- **`seats_after`:** the opening day of the new Congress.
- **Independents:** which way each one caucuses comes from `data/manual/independents.csv`. A senator who became an independent during the Congress (Jeffords, 2001) is taken from `data/manual/senate_seat_changes.csv`.
- **`flag`:** set on any row resting on a caucus that is unverified or unknown. Independents with an unknown caucus are left out of the count.
- **President:** the one in office on election day (so 1974 is Ford).
- **Check:** the 2022 Senate row comes out at +1 for the Democratic caucus (50 on election day, 51 at the opening of the 118th).

## Source list

### `house_historian_party_divisions`
- **Title:** Party Divisions of the House of Representatives, 1789 to Present
- **Publisher:** US House of Representatives, Office of the Historian and Office of Art and Archives
- **URL:** https://history.house.gov/Institution/Party-Divisions/Party-Divisions/
- **Licence:** US government work, public domain
- **Years used:** 79th to 119th Congress (1945 to 2027)
- **Caveats:** Counts are as of the initial election results. Delegates and the Resident Commissioner are excluded. Vacancies are not a column: we derive them as total minus party seats, and the only non-zero cases match the source footnotes (99th one vacancy; 116th NC-9 and 117th NY-22 not certified at the opening). The "Other" column is split by its labels: "Independent" and "Independent Democrat" go to `ind`, every other party (e.g. American Labor) to `other`. The label text is kept in `chamber_other_detail.csv`.

### `senate_party_division`
- **Title:** Party Division
- **Publisher:** US Senate Historical Office
- **URL:** https://www.senate.gov/about/parties-leadership/party-division.htm (formerly /history/partydiv.htm)
- **Copy used:** Internet Archive capture `20261102191213` (2 November 2026, 19:12:13 UTC): https://web.archive.org/web/20261102191213/https://www.senate.gov/about/parties-leadership/party-division.htm. It includes the 119th Congress.
- **Why a copy:** senate.gov answers scripted requests with HTTP 403. The archived page is the Senate's own page as published.
- **Licence:** US government work, public domain
- **Years used:** 79th to 119th Congress
- **Caveats:** The "Other" cell is split by label: Independent and Independent Democrat go to `ind`; Conservative (James Buckley, NY, 92nd to 94th) goes to `other`.

### `house_historian_presidents` and `house_historian_party_government`
- **Titles:** Presidents, Vice Presidents, and Coinciding Sessions of Congress; Party Government Since 1857
- **Publisher:** US House of Representatives, Office of the Historian
- **URLs:** https://history.house.gov/Institution/Presidents-Coinciding/Presidents-Coinciding/ and https://history.house.gov/Institution/Presidents-Coinciding/Party-Government/
- **Licence:** public domain
- **Use:** The source of `data/manual/presidents.csv` (term dates from the first page, party from the second). The tests check each president and majority party against the Party Government page.

### `medsl_senate`
- **Title:** U.S. Senate statewide 1976 to 2024
- **Publisher:** MIT Election Data and Science Lab, Harvard Dataverse, doi:10.7910/DVN/PEJ5QU
- **Version:** 8.0, released 11 May 2026. Last election covered: 2024 (plus the January 2021 Georgia runoffs).
- **Licence:** CC0 1.0
- **Years used:** 1994 to 2024 (1994 to 1998 only to find the previous winner of each seat)
- **Caveats:**
  - Only even-year November elections and their runoffs are included. The off-cycle specials MA January 2010, MA 2013, NJ 2013 and AL 2017 are missing.
  - LA 2002 mixes both rounds under one stage label. LA 2014 finalist totals look wrong (runoff plus 1,000,000). LA 2016 mixes runoff totals for the finalists with first-round totals for the rest. These races, the MS 2018 special and the four off-cycle specials come from `data/manual/senate_results_manual.csv` instead (source_id `manual_senate_results`), filled from official sources: Clerk of the House, FEC, and the MA, NJ and AL election offices. For the MS 2018 special, MEDSL's two rows turned out to equal the official runoff.
  - Some 2018 to 2024 rows are flagged `unofficial` by MEDSL. They are kept, and the flag is in `senate_results_detail.csv`.
  - A few candidates have no party label. Where the winner's party is clear from MEDSL's own other rows, it is set in `data/manual/candidate_party_overrides.csv`; otherwise it is left null.
  - Vote shares use valid votes: over votes, under votes, blanks and exhausted ballots are removed from the denominator. Alaska 2022 is the first ranked-choice round.

### `medsl_house`
- **Title:** U.S. House 1976 to 2024
- **Publisher:** MIT Election Data and Science Lab, Harvard Dataverse, doi:10.7910/DVN/IG0UN2
- **Version:** 15.0, released 9 March 2026. Last election covered: 2024.
- **Licence:** CC0 1.0. The download sits behind a Dataverse guestbook, so Stephane downloaded it by hand on 4 November 2026 into `data/raw/medsl/1976-2024-house.tab`. Despite the extension, the file is comma-separated.
- **Years used:** 2000 to 2024
- **Caveats:**
  - DC's non-voting delegate is excluded.
  - Texas 2006: four redrawn districts were flagged as specials and are used as that year's race.
  - Florida does not print unopposed candidates on the ballot, so those seats add no votes to vote shares. Uncontested seats everywhere make vote shares an imperfect measure of support.
  - Maine's ranked-choice districts: 2018 and 2024 rows are final-round totals; 2022 mixes rounds, and its exhausted-ballot row is dropped.
  - Independents go in `ind` (Sanders VT 2000 to 2004, Goode VA 2000); other parties go in `other`.
  - NC-9 2018 is counted as vacant, because the election was never certified and was re-run in 2019. NY-22 2020 stays a Republican seat, because the count finished after the 117th Congress opened. Both rows carry a `note`.
  - With those rules, seat counts rebuilt from MEDSL match the House Historian's opening-day counts in every year from 2000 to 2024. The one difference is NY-22 2020, which the Historian lists as vacant at the opening.

### `congress_legislators_current` and `congress_legislators_historical`
- **Title:** unitedstates/congress-legislators, `legislators-current.yaml` and `legislators-historical.yaml`
- **Publisher:** the unitedstates project, https://github.com/unitedstates/congress-legislators, pinned to commit `15530b7d` (24 October 2026)
- **Licence:** CC0 1.0 (public domain)
- **Accessed:** 4 November 2026
- **Coverage used:** every voting term overlapping the 80th to 119th Congress. The 120th is not in the source until January 2027.
- **Output:** `members_by_congress.csv`, `women_by_congress.csv`, `age_by_congress.csv`, built by `pipeline/build_members.py`.
- **Caveats:**
  - Counts are of members who served at any point in the Congress, so House totals exceed 435. Opening-day counts are not built: the source holds only a term start date, and gives some mid-Congress joiners the opening date (the 86th House has 447 terms starting on opening day).
  - Delegates, resident commissioners and Alaska and Hawaii's pre-statehood delegates are excluded.
  - Party is the party on a member's first day in that Congress. `IND` is Independent or Ind. Democrat; `OTHER` is any other label.
  - `age_at_start` is whole years on 3 January of the Congress's first year. Three members have no birthday and their age is null (80th Rohrbough, 88th Burkhalter, 96th Hutchinson).

### `medsl_county_president`
- **Title:** County Presidential Election Returns 2000-2024
- **Publisher:** MIT Election Data and Science Lab, Harvard Dataverse, doi:10.7910/DVN/VOQCHQ
- **Version:** 20.0, released 25 February 2026 (file version stamp 20260225). Codebook dated 2025-07-12. Licence: CC0 1.0.
- **Files:** `data/raw/medsl/countypres_2000-2024.csv`, the codebook and `sources-president.csv` (per-state source URLs, certified or not, for 2020). Downloaded by hand on 4 November 2026 because of the Dataverse guestbook; `medsl_county_president_meta` in the manifest records the dataset metadata.
- **Years used:** 2016, 2020, 2024. Output: `county_presidential_shift.csv` (joinable to `us-atlas` `counties-10m.json`) and `county_presidential_unmatched.csv`, built by `pipeline/build_county_shift.py`.
- **Caveats:**
  - Mode rule, from the codebook: a county with TOTAL-mode rows uses them; one with only vote modes (absentee, early, election day, provisional and so on) has the modes summed. 2020 has 849 such counties and 2024 has 376.
  - Shares are of all votes cast (`totalvotes`), so third-party and write-in votes sit in neither column. Vermont 2024 candidate rows are 0.9% short of `totalvotes`, and DC 2024 is 0.8% over; every other state and year is within 0.5%.
  - The 2024 New Mexico Libertarian cells are `NA` in the file and are left missing; they do not enter the Democratic or Republican shares.
  - Alaska reports by state house district, not borough, so it cannot join to the map. One statewide row (fips 02000) is in the unmatched file.
  - Kansas City, MO is its own unit in every year (FIPS 2938000, and 36000 in 2024) and spans four counties, so it is in the unmatched file. Jackson, Clay, Platte and Cass exclude it in every year, so their shifts are consistent but their vote totals are not whole counties.
  - Oglala Lakota County SD is 46113 in the 2024 rows and 46102 before; recoded to 46102 to match us-atlas.
  - Not joined: rows with no FIPS (CT statewide write-ins 2016, ME UOCAVA 2016, RI federal precinct 2016 and 2020) and Bedford city VA (51515, 2016, zero votes, merged into Bedford County in 2013). The file keeps Connecticut's old counties in every year, matching us-atlas, so the 2022 planning-region change does not appear. Virginia's independent cities are separate units in both.
  - us-atlas counties with no data: Kalawao, HI (15005). Alaska's boroughs are not in the file by design. Territories are out of scope.

### `wikipedia_governors` (CC BY-SA 4.0, the only share-alike source)
- **Title:** "List of governors of <State>" for each of the 50 states
- **Publisher:** Wikipedia, English edition, https://en.wikipedia.org. Text and tables by Wikipedia contributors, licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). **Credit: Wikipedia contributors.** `governors_terms.csv` and `governors_by_year.csv` are adapted from these pages and are CC BY-SA 4.0 too. They must be shared under the same licence. The rest of the project's data stays CC0.
- **Files:** `data/raw/wikipedia_governors/<PO>.html` holds only the `wikitable` elements of each page. The manifest gives each page's revision id (permalink with `oldid`) and the time it was accessed. Rows in `governors_terms.csv` carry that permalink in `source_url`.
- **Outputs, built by `pipeline/build_governors.py`:**
  - `governors_terms.csv`: every term overlapping 2000 to 2025, with `party_detail` as the page words it for the start of the term, `party` as its group (D, R or I), `left_office` blank for a governor still in office, and `party_note` where the party changed mid-term.
  - `governors_by_year.csv`: the governor in office on 1 January of each year, 2000 to 2025: the term with the latest start on or before that day that has not yet ended. It has the same `party` and `party_detail` columns.
- **Mid-term party changes:** `data/manual/governor_party_changes.csv`, from the footnotes on the pages: Crist (FL, to Independent, April 2010), Chafee (RI, to Democratic, 30 May 2013) and Justice (WV, to Republican, August 2017). The build stops if a page lists two parties for a term with no row there. `governors_by_year.csv` uses the new party for any 1 January after the change.
- **Caveats:**
  - `party_detail` keeps Wikipedia's wording. `party` groups it: Democratic and Democratic-Farmer-Labor (Minnesota) are D; Republican is R; Independent and Reform/Independence (Ventura) are I. The build stops on any other wording.
  - Pages end a term on the last day in office or on the day the successor starts, so consecutive terms are 0 or 1 days apart. Dates are not adjusted.
  - Where a governor was acting or succeeded from another office, the page lists them as a governor and so do we.
  - Governors-elect who take office in 2027 are not included.
  - Spot checks against official state websites are in `review/07-report.md`.

### `manual` women cross-check
- **File:** `data/manual/women_crosscheck.csv`: published totals of women by Congress, used only by a test and the step 07 report. 1991 to 2021 come from the Congressional Research Service report R43244 (CAWP's site blocks scripts); 2025 from CAWP's 2 January 2025 press release.

### `manual_2026_provisional`
- **File:** `data/manual/2026_provisional.csv`
- **Contents:**
  - The 2026 Senate race list: 33 Class 2 seats plus the Florida and Ohio Class 3 specials, from https://en.wikipedia.org/wiki/2026_United_States_Senate_elections (race list only). The tests check it against MEDSL's 2020 Class 2 races.
  - Empty slots for results.
- **Status:** No 2026 results are entered yet. AP (apnews.com) blocks automated access, and on 4 November 2026 no certified results existed. Results must be entered by hand from AP or official state pages, with `result_source_url` and `result_accessed_at` on every row.
- **Labelling:** every 2026 row is `is_provisional = true`. Its `called` value is passed through to the `called` column of `senate_results_by_state.csv` and `house_delegations_by_state.csv` (always true for certified years); the map shows a provisional result as a tint until it is called. 2026 House seats per state reuse 2024 counts, since apportionment is unchanged from 2022 to 2030.

### Manual reference files (`data/manual/`)
- **`presidents.csv`:** see the House Historian presidents and party government entries above.
- **`independents.csv`:** names and caucus for every independent counted in `ind`. Rows marked `verified_in_source = false` rely on general knowledge and need checking. Some House rows have no name yet.
- **`senate_specials.csv`:** the seat class for each special election from 1994 to 2026, used to link each race to the previous one for the same seat. Each row cites the Wikipedia article for that special. Every class is marked `verified = false`.
- **`senate_results_manual.csv`:** races MEDSL lacks or gets wrong, to be filled from official state results.
- **`candidate_party_overrides.csv`:** party labels MEDSL leaves blank.
- **`display_names.csv`:** how a winner's name is shown when the title-case rule gets it wrong: Mc and De names, JD Vance, Luján's accent, and two MEDSL slips ("MICH MCCONNELL" in Kentucky 2014, "WYDEN RON" in Oregon). The pipeline writes `winner_display_name` next to `winner_name`, which keeps the source spelling. Each row cites the page the spelling was checked against and is marked `verified = false` until hand-checked. The tests fail if a winner's name starts a word with Mc, O' or JD and has no row here; De, La and Mac names cannot be told apart from ordinary ones (Dean, Lamar, Mack), so they must be added by hand.
- **`senate_seat_changes.csv`:** party switches and appointments from 2000 to 2026 that changed a seat's party: Coverdell to Miller (GA 2000), Jeffords (VT 2001), Wellstone to Barkley (MN 2002), Specter (PA 2009), Lautenberg to Chiesa (NJ 2013), Sinema (AZ 2022) and Manchin (WV 2024). Each cites the archived Senate party division page and is marked `verified = false`. The page gives no date for Sinema's switch; that date comes from general knowledge.

### Map geography (`pipeline/geo/build_geo.py`)

The map's shapes, not its numbers. Every output is rebuilt by `python pipeline/geo/build_geo.py`, which downloads what it needs, checks each file against the SHA-256 in `data/raw/manifest.json`, and runs mapshaper (an npm dev dependency) on it.

- **State outlines:** `us-atlas` npm package, version 3.0.1 (pinned in `package-lock.json`), file `states-10m.json`. It redistributes the US Census Bureau's cartographic boundary files, 2017 edition, as TopoJSON. Licence: ISC for the package; the Census data is public domain. Simplified with mapshaper (2.5km tolerance, shared borders kept) into `public/geo/states.topo.json`.
- **Water depth (contour lines):** Natural Earth 10m physical, bathymetry layers at 200, 1,000, 2,000, 3,000, 4,000, 5,000 and 6,000 metres (`ne_10m_bathymetry_K_200` to `ne_10m_bathymetry_E_6000`), from https://naciscdn.org/naturalearth/10m/physical/. Each band is dissolved (Natural Earth splits them into tiles), turned into outlines, clipped to the area the map shows and simplified (6km tolerance; rings under 1,500 square km dropped). Output: object `bathymetry` in `public/geo/ocean.topo.json`.
- **Lakes:** Natural Earth 10m `ne_10m_lakes`, scale rank 0 to 2 only (the Great Lakes and the largest others). Output: object `lakes` in `public/geo/ocean.topo.json`.
- **Neighbouring land:** Natural Earth 10m `ne_10m_admin_0_countries`, every country except the US, clipped and simplified (3km tolerance). Output: `public/geo/land.topo.json`.
- **Natural Earth licence:** public domain. Accessed 4 November 2026 (exact times in the manifest). The zips (about 20MB) are not committed; the script fetches them again on a fresh checkout and stops if one no longer matches its recorded hash.
- **Projection:** the three parts of `d3.geoAlbersUsa` (Albers for the lower 48, conic equal-area for Alaska and Hawaii, with d3's parameters), each fitted to its own box so that Alaska and Hawaii sit in framed insets. Insets are not to the same scale as the lower 48.

## Flip definitions (Senate)

The site displays `flipped_vs_holder`, with hatching, and uses `party_changed` for a note without hatching.

- **`flipped_vs_last_election`:** compares the winner's party with `previous_party`, the party that won the last election for the same seat (same state and Senate class, earlier year). Party labels, not caucuses.
- **`flipped_vs_holder`:** true only when the seat moves from one **caucus** to the other.
  - `holder_party` is the party holding the seat on election day. That is `previous_party`, updated by any change in `senate_seat_changes.csv` dated between 3 January after the last election and this election day. Starting on 3 January means an interim appointment made after an election and ended when the elected senator was sworn in (Barkley, MN 2002) does not carry over.
  - `holder_caucus` and `winner_caucus` are DEM or GOP. Democrats and Republicans take their own party. An elected independent takes the caucus listed in `data/manual/independents.csv` for the Congress they joined. An independent created by a switch or appointment takes the caucus in `senate_seat_changes.csv`.
- **`party_changed`:** the winner's party label differs from `holder_party`, whether or not the caucus changed. Every caucus flip is also a party change.
- **Off-cycle specials** missing from MEDSL (MA 2010 and 2013, NJ 2013, AL 2017) are dated to their year's November election day for this purpose. No listed seat change falls between their real date and that one.

Races involving independents, or where the definitions differ (2000 to 2024):

| Race | Holder (party, caucus) | Winner (party, caucus) | vs holder (caucus) | party_changed | vs last election |
|---|---|---|---|---|---|
| CT 2006 | DEM, DEM (Lieberman) | IND, DEM (Lieberman) | no | yes | yes |
| VT 2006 | IND, DEM (Jeffords) | IND, DEM (Sanders) | no | no | yes |
| CT 2012 | IND, DEM (Lieberman) | DEM, DEM (Murphy) | no | yes | yes |
| ME 2012 | GOP, GOP (Snowe) | IND, DEM (King) | yes | yes | yes |
| AZ 2024 | IND, DEM (Sinema) | DEM, DEM (Gallego) | no | yes | no |
| WV 2024 | IND, DEM (Manchin) | GOP, GOP (Justice) | yes | yes | yes |
| GA 2000 special | DEM (Miller, appointed) | DEM | no | no | yes |
| PA 2010 | DEM (Specter, switched) | GOP | yes | yes | no |
