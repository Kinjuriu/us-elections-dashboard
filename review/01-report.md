# Step 01 report: data pipeline

4 November 2026, the day after the 2026 midterms.

## What was built

A Python pipeline in `pipeline/` that anyone can re-run with `python pipeline/run_all.py`. It downloads the sources, builds every output and runs 20 pytest checks. All 20 pass. Two runs in a row give identical files (checked by hash).

| Script | Output |
|---|---|
| `download.py` | `data/raw/` plus `manifest.json` (URL, time, SHA-256 for each file) |
| `build_chamber_control.py` | `chamber_control.csv`, plus `chamber_other_detail.csv` (source labels for "other" seats) and `independents.csv` (caucus side table) |
| `build_midterm_swing.py` | `midterm_swing.csv` |
| `build_senate_results.py` | `senate_results_by_state.csv`, plus `senate_results_detail.csv` (seat class, MEDSL "unofficial" flag) |
| `build_house_delegations.py` | `house_delegations_by_state.csv`, plus `house_district_winners.csv` |
| `tests/test_totals.py` | totals, cross-checks against a second official table, 5 spot checks |

Setup: a Python 3.11 virtualenv (`.venv`, made with `uv`, which was already on the machine) holding pandas, requests and pytest. The system Python is 3.9 with no pandas. No other dependencies were added. HTML is parsed with the standard library, because pandas' HTML reader needs lxml, which isn't on the approved list.

## Coverage

| Dataset | Years | Rows | Source |
|---|---|---|---|
| `chamber_control.csv` | 80th to 120th Congress (elected 1946 to 2026) | 82 | House Historian, Senate Historical Office; 2026 manual |
| `midterm_swing.csv` | 1946 to 2026, every midterm | 42 | built from the above (uses the 79th Congress for 1946) |
| `senate_results_by_state.csv` | 2000 to 2026 (plus 2013 and 2017 off-cycle specials) | 489 | MEDSL Senate v8.0 (to 2024); 2026 manual |
| `house_delegations_by_state.csv` | 2000 to 2026, 50 states a year | 700 | MEDSL House v15.0 (to 2024); 2026 manual |

MEDSL's latest releases cover up to 2024, so 2026 is the only year that needs a manual file.

## Checks against the sources

- **House:** party seats plus vacancies equal the total in every Congress. The total is 435, except 436 for the 86th and 437 for the 87th. Your note confirmed both, and the tests match.
- **Senate:** totals are 96 through the 85th Congress, 98 at the opening of the 86th, and 100 from the 87th. Tests match.
- **Majority party and president:** for every Congress these are checked against a second House Historian table ("Party Government Since 1857"). The only differences are the Senate's 107th and 117th; see the open questions below.
- **House seats rebuilt district by district from MEDSL:** these match the Historian's opening-day counts in all 13 elections from 2000 to 2024. The only exceptions are NC-9 (2018) and NY-22 (2020), which the Historian lists as vacant at the opening and MEDSL counts as Republican wins.
- **Senate races per year:** every November year has between 33 and 38 races, with specials flagged. Odd years (2013, 2017) hold only off-cycle specials, so the "30 to 40" test applies to even years.

## The 5 hand-checked rows

I checked each against the raw source text, and they're also written into `test_spot_checks`:

1. **House, 80th Congress (1947):** 188 D, 246 R, 1 American Labor (`other`), 435 seats. House Historian table.
2. **Senate, 117th Congress, opening day 3 January 2021:** 51 R, 46 D, 2 independents, 1 vacant, so the GOP is first-listed. Senate table, 1st session row.
3. **Senate, 86th Congress, opening day 7 January 1959:** 64 D, 34 R, 98 seats. Senate table and its footnotes on Alaska and Hawaii.
4. **Georgia Senate 2020 (regular), decided in the 5 January 2021 runoff:** Ossoff 2,269,262 and Perdue 2,213,979 of 4,483,241. That gives 50.62 to 49.38, margin 1.23, and a flip from GOP. MEDSL rows.
5. **Maine House 2024:** 2 seats, both DEM. ME-2 final round: Golden 197,151, Theriault 194,445. MEDSL rows.

## What I could not do, and why

- **senate.gov blocks scripts (HTTP 403).** With your approval I used the Internet Archive capture from 2 November 2026, 19:12 UTC, which includes the 119th Congress. The page has moved to `/about/parties-leadership/party-division.htm`.
- **The MEDSL House file sits behind a guestbook.** You downloaded it by hand. One thing to know: it is comma-separated despite the `.tab` name.
- **2026 results are not entered.**
  - AP blocks automated access.
  - Less than a day after the vote, nothing is certified.
  - The race calls I could find were on Wikipedia, which is not an acceptable source for numbers, so I did not use them.

  `data/manual/2026_provisional.csv` has the 35 Senate races (33 Class 2, plus the Florida and Ohio specials), 50 House state rows and 2 chamber rows, all with empty result fields. Every 2026 value in the outputs is null and flagged `is_provisional`.

## Data gaps (all null in the outputs, none estimated)

**Senate races with no result**, waiting for `data/manual/senate_results_manual.csv`:

| Race | Problem in MEDSL |
|---|---|
| LA 2002 | November primary and December runoff both labelled `gen`; can't be separated |
| LA 2014 | Finalist totals look like the runoff plus 1,000,000 each (1,712,379 and 1,561,210) |
| LA 2016 | Only the November primary; the December runoff is missing |
| MS 2018 special | Only the first round; the 27 November runoff is missing |
| MA Jan 2010 special, MA 2013 special, NJ 2013 special, AL 2017 special | Not in MEDSL at all (it covers November of even years only) |

**Knock-on nulls:** `flipped` is null for the next race in the same seat:
- LA 2008, 2020, 2022
- MA 2012, 2014
- NJ 2014
- AL 2020
- MS 2020

AL 2020 matters most: Tuberville took the seat from Jones (D, elected 2017), but without the 2017 row the data can't show that flip.

**Missing runner-up party:** WY 2020 (Merav Ben David) and AK 2022 (Kelly Tshibaka). Unopposed races (ID 2004, SD 2010, AL 2014) have only write-ins as runner-up, so their runner-up party is null.

**2026:** every result field.

## Ambiguities and choices you should know about

1. **Opening-day counts can mislead for two Senates.**
   - **117th:** shows a GOP majority, because 51 R were seated on 3 January 2021, before the Georgia runoff winners arrived on 20 January. Democrats controlled it for almost the whole Congress.
   - **107th:** shows DEM, because of Gore's tie-break from 3 to 20 January 2001.
   - **Knock-on:** the 2022 Senate midterm swing reads +2 for Democrats, measured from that 46. Most accounts say +1.

   The rule follows the brief, but I'd suggest a `majority_note` column, or a "majority for most of the Congress" field, before the charts are built. Your call.
2. **"Flipped" compares election with election**, against the party that last won the seat, not the sitting senator's party on election day. So:
   - PA 2010 (Toomey, after Specter switched to Democrat) is not a flip.
   - CT 2012 (Murphy after Lieberman, IND) is.

   AP uses the election-day holder. Tell me if you want that instead; it needs a sourced list of appointments and party switches.
3. **House delegations have no `ind` column** in the brief's schema, so Sanders (VT, 2000 to 2004) and Goode (VA, 2000) are counted in `other`. I can add an `ind` column if you want the map to show independents.
4. **NC-9 (2018) and NY-22 (2020)** are counted as GOP seats in the delegation file (who got the most votes), while the Historian counts them as vacant at the opening. NC-9 2018 was never certified and was re-run in 2019. Should the NC 2018 delegation show 1 vacant?
5. **House vote shares** include every valid vote. Unopposed seats (especially in Florida, where unopposed candidates are not on the ballot) add few or no votes, so shares are a rough measure in states with uncontested seats.
6. **Georgia's January 2021 runoffs** are filed under 2020, the election cycle they decided.
7. **Candidate names** are kept as MEDSL prints them (upper case, e.g. "MURKOWSKI, LISA"). The site will need a display-name step.
8. **MEDSL marks some rows from 2018 to 2024 "unofficial"** (e.g. AZ, CA, NE, WA in 2024). They're kept, and the flag is in `senate_results_detail.csv`.

## What you need to enter or confirm by hand

1. **2026 results** in `data/manual/2026_provisional.csv`, from AP or state results pages. Every row needs a `result_source_url` and `result_accessed_at`, and `called` / `certified` set as appropriate.
2. **The 8 Senate races** in `data/manual/senate_results_manual.csv`, from official state results.
3. **Seat classes** in `data/manual/senate_specials.csv`: all 28 rows are marked `verified = false`. I tried to check them automatically against Wikipedia, but the articles don't state the class in a consistent place.
4. **Independents** in `data/manual/independents.csv`:
   - Rows with `verified_in_source = false` were filled from general knowledge and need checking (Byrd Jr., Sanders, King, Lieberman in the 112th, Goode).
   - Five House rows have no name: 82nd and 83rd (Independent), 86th and 88th (Independent Democrat), and a second independent in the 105th.
5. **Party overrides** in `data/manual/candidate_party_overrides.csv`:
   - Confirm Murkowski 2010 and 2022 and Lummis 2020 as GOP. MEDSL records them as Republican in other years.
   - Add parties for Ben David (WY 2020) and Tshibaka (AK 2022).
6. **The open questions** in the section above.

## Effects and animations

None. This step is data only.
