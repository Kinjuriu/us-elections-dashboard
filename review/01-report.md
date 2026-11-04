# Step 01 report: data pipeline

4 November 2026, the day after the 2026 midterms. Revised the same day after Stephane's decisions and after the 8 manual Senate races were filled (see "Revision 1" and "Revision 2" at the end).

## What was built

A Python pipeline in `pipeline/` that anyone can re-run with `python pipeline/run_all.py`. It downloads the sources, builds every output and runs 25 pytest checks. All 25 pass. Two runs in a row give identical files (checked by hash).

| Script | Output |
|---|---|
| `download.py` | `data/raw/` plus `manifest.json` (URL, time, SHA-256 for each file) |
| `build_chamber_control.py` | `chamber_control.csv`, plus `chamber_other_detail.csv` (source labels for "other" seats) and `independents.csv` (caucus side table) |
| `build_midterm_swing.py` | `midterm_swing.csv` |
| `build_senate_results.py` | `senate_results_by_state.csv`, plus `senate_results_detail.csv` (seat class, MEDSL "unofficial" flag) |
| `build_house_delegations.py` | `house_delegations_by_state.csv`, plus `house_district_winners.csv` |
| `tests/test_totals.py` | totals, cross-checks against a second official table, flip and swing rules, a source check on every manual row, 5 spot checks |

Setup: a Python 3.11 virtualenv (`.venv`, made with `uv`) holding pandas, requests and pytest. The system Python is 3.9 with no pandas. No other dependencies were added; HTML is parsed with the standard library.

## Coverage

| Dataset | Years | Rows | Source |
|---|---|---|---|
| `chamber_control.csv` | 80th to 120th Congress (elected 1946 to 2026) | 82 | House Historian, Senate Historical Office; 2026 manual |
| `midterm_swing.csv` | 1946 to 2026, every midterm | 42 | built from the above (uses the 79th Congress for 1946) |
| `senate_results_by_state.csv` | 2000 to 2026 (plus 2013 and 2017 off-cycle specials) | 489 | MEDSL Senate v8.0 (to 2024); 2026 manual |
| `house_delegations_by_state.csv` | 2000 to 2026, 50 states a year | 700 | MEDSL House v15.0 (to 2024); 2026 manual |

MEDSL's latest releases cover up to 2024, so 2026 is the only year that needs a manual file.

## Checks against the sources

- **House:** party seats plus vacancies equal the total in every Congress. The total is 435, except 436 for the 86th and 437 for the 87th.
- **Senate:** totals are 96 through the 85th Congress, 98 at the opening of the 86th, and 100 from the 87th.
- **Majority and president:** `majority_party_most_of_congress` and the president's party agree with the House Historian's "Party Government" table in every Congress. The opening-day `majority_party` differs only in the Senate's 107th and 117th, which is expected.
- **House seats rebuilt district by district from MEDSL:** these match the Historian's opening-day counts in every election from 2000 to 2024, independents included. The single difference is NY-22 2020, kept as a Republican seat with a note, as you decided.
- **Senate races per year:** every November year has between 33 and 38 races, with specials flagged. Odd years (2013, 2017) hold only off-cycle specials.
- **2022 Senate midterm swing:** +1 for the Democratic caucus, as you asked me to check. Election day: 48 D plus Sanders and King, so 50. Opening of the 118th: 48 D plus Sanders, King and Sinema, so 51.

## The 5 hand-checked rows

I checked each against the raw source text, and they're also written into `test_spot_checks`:

1. **House, 80th Congress (1947):** 188 D, 246 R, 1 American Labor (`other`), 435 seats. House Historian table.
2. **Senate, 117th Congress, opening day 3 January 2021:** 51 R, 46 D, 2 independents, 1 vacant. Opening majority GOP; DEM for most of the Congress. Senate table, 1st session rows.
3. **Senate, 86th Congress, opening day 7 January 1959:** 64 D, 34 R, 98 seats. Senate table and its footnotes on Alaska and Hawaii.
4. **Georgia Senate 2020 (regular), decided in the 5 January 2021 runoff:** Ossoff 2,269,262 and Perdue 2,213,979 of 4,483,241, so 50.62 to 49.38. A flip from GOP under both definitions. MEDSL rows.
5. **Maine House 2024:** 2 seats, both DEM. ME-2 final round: Golden 197,151, Theriault 194,445. MEDSL rows.

## What I could not do, and why

- **senate.gov blocks scripts (HTTP 403).** With your approval I used the Internet Archive capture from 2 November 2026, 19:12 UTC, which includes the 119th Congress.
- **The MEDSL House file sits behind a guestbook.** You downloaded it by hand. It is comma-separated despite the `.tab` name.
- **2026 results are not entered.**
  - AP blocks automated access.
  - Nothing is certified yet.
  - I did not use the Wikipedia race calls as numbers.

  The template in `data/manual/2026_provisional.csv` is unchanged, as you asked.

## Data gaps (all null in the outputs, none estimated)

**Senate races:** none missing any more. The 8 races MEDSL lacked or got wrong are now filled in `data/manual/senate_results_manual.csv` from official sources (Clerk of the House, FEC, and the MA, NJ and AL election offices). Every race from 2000 to 2024 has a winner and both flip values.

**Missing runner-up party:** WY 2020 and AK 2022. Unopposed races (ID 2004, SD 2010, AL 2014) have only write-ins as runner-up.

**Midterm swing flags** (each explained in the `flag` column):
- **All 21 House rows:** "before" is the opening day, because the House Historian records no changes during a Congress.
- **House independents with unknown caucus**, left out of the count: one in each of the 82nd, 83rd, 86th and 88th Congresses, and the second independent in the 105th. Affected rows: House 1950, 1954, 1958, 1962 and 1998.
- **Rows that rest on unverified caucus entries** from `independents.csv` or `senate_seat_changes.csv`:
  - Senate 1970, 1974, 1978, 1982 (Byrd Jr.)
  - Senate 2002 (Jeffords)
  - Senate 2010, 2014, 2018, 2026 (Sanders, King, Lieberman)
  - House 1990 to 2006 (Sanders, Goode)

  None of these changes the 2022 result, whose caucus entries are verified in the source.

**2026:** every result field.

## Open questions

1. **VT 2006 shows `party_changed = false`.** You listed it as a party-change case, but under the holder rule it isn't one. Jeffords had already become an independent in 2001, so on election day the seat went from one independent (caucusing D) to another (Sanders, caucusing D). It is a label change only against the previous election (Jeffords won as a Republican in 2000), where `flipped_vs_last_election` is true. If you want the map's note there too, `party_changed` could be measured against the last election instead; tell me which. CT 2006 (Lieberman, D to I) does come out `party_changed = true`.
2. **Name style is mixed.** The 8 manual races use title case ("Doug Jones"), while MEDSL rows are upper case ("TOMMY TUBERVILLE"). The site needs a display-name step either way; I have not changed either source.
3. **`senate_seat_changes.csv` coverage for 2025 and 2026.** My own knowledge stops in mid-2026, and the archived Senate page shows no party-changing appointment or switch in the 119th Congress up to 2 November 2026. Please confirm nothing is missing for 2026.
4. **Sinema's switch date (9 December 2022)** comes from general knowledge, not the source. It falls after the 2022 election, so it only affects AZ 2024's holder, which doesn't depend on the exact date.
5. **Midterm "before" for the Senate now uses election day**, so several historic Senate swings move by about a seat from the opening-day version. For example, 1946 is now -12 (was -13), 2002 +2 (was +1), 2010 -6 (was -5), and 2018 +2 (was +1). This is the intended effect, but it will change any copy written from the old numbers.

## What you need to enter or confirm by hand

1. **2026 results** in `data/manual/2026_provisional.csv`.
2. **The 8 Senate races** in `data/manual/senate_results_manual.csv` are filled. Each note asks for a spot-check against its source (see Revision 2).
3. **Seat classes** in `data/manual/senate_specials.csv` (all 28 rows `verified = false`).
4. **Independents** in `data/manual/independents.csv`: unverified rows, plus five House rows with no name.
5. **Party overrides** in `data/manual/candidate_party_overrides.csv`: confirm Murkowski and Lummis; add Ben David and Tshibaka.
6. **Senate seat changes** in `data/manual/senate_seat_changes.csv`: all 7 rows `verified = false`, as you asked.
7. **Caucus entries behind the holder rule.** Caucus flips involving independents now depend on `independents.csv` and `senate_seat_changes.csv`. The 110th Congress rows for Sanders and Lieberman (VT and CT 2006) are verified in the source. The rows for Sanders and King after 2012, and every seat-change row (Sinema, Manchin, Jeffords), are not yet verified.

## Effects and animations

None. This step is data only.

## Revision 1 (your decisions on the first draft)

- **`chamber_control.csv`:**
  - Opening-day counts unchanged.
  - Added `majority_party_most_of_congress`, worked out from the number of days each party held control in the Senate's dated session tables.
  - Added `majority_note`, set for the Senate's 107th and 117th only. The build fails if control changes in any other Congress without a note.
- **`midterm_swing.csv`:**
  - Counts by caucus.
  - Senate "before" is election day.
  - House "before" is opening day, flagged.
  - New columns: `before_basis`, `before_as_of`, `independents_before`, `independents_after`, `flag`.
  - 2022 Senate comes out at +1.
- **`senate_results_by_state.csv`:**
  - `flipped` renamed `flipped_vs_last_election`.
  - Added `flipped_vs_holder` and `holder_party`.
  - New file `data/manual/senate_seat_changes.csv` with 7 changes, each sourced and `verified = false`.
- **`house_delegations_by_state.csv`:**
  - Added `ind` and `note`.
  - NC-9 2018 counted as vacant (never certified, re-run in 2019).
  - NY-22 2020 kept Republican with a note (count finished after the Congress opened).
- **Manual files:** left as they were, apart from the new seat-changes file.

## Revision 2 (the 8 manual Senate races)

- **Pipeline:** re-run with your filled `data/manual/senate_results_manual.csv`. 25 of 25 tests pass, and two runs give identical outputs.
- **Knock-on flips resolve:** every race from 2000 to 2024 now has both flip values. Alabama 2020 (Tuberville) is a flip from DEM under both definitions: the previous winner and the holder are both Jones (D, 2017 special). Other results:
  - Flips: MA 2010 special and MA 2012 (Brown in, then Warren out), LA 2014, AL 2017 special.
  - NJ 2013 special: a flip under the holder rule only (Booker won the seat Chiesa (R) held by appointment).
  - LA 2008, 2016, 2020, 2022; MS 2018 special and 2020; MA 2013 and 2014; NJ 2014: no flip.
- **New test `test_every_manual_row_has_source_url`:**
  - **Strict on every row:** fails if any row in `presidents.csv`, `independents.csv`, `senate_specials.csv`, `senate_seat_changes.csv` or `senate_results_manual.csv` has a blank source URL.
  - **Templates:** in `candidate_party_overrides.csv` and `2026_provisional.csv`, it fails if any row holding a value has no source URL. I didn't make it strict there, because the empty placeholder rows you asked me to leave would fail today: two blank party overrides, and the 2026 House and chamber rows, which have no source column filled until results arrive.
  - **Coverage:** the test also fails if a new CSV appears in `data/manual/` without being registered in it.
  - **Proof it bites:** I blanked one `source_url` in a temporary edit and the test failed, then restored your file byte for byte.
- **New test `test_manual_results_resolve_knock_on_flips`:** pins the Alabama 2020 result and the absence of null flips before 2026.
- **Arithmetic check:** each manual row's percentages match the vote counts quoted in its note, to two decimals.
- **Two corrections to my first diagnosis of MEDSL:**
  - **MS 2018 special:** MEDSL already holds the 27 November runoff. Its two rows (486,769 and 420,819 of 907,588) are the same as the official runoff, so "runoff missing" was wrong.
  - **LA 2016:** MEDSL mixes rounds. The finalists' rows carry runoff totals (536,191 and 347,816) while the other candidates carry first-round totals.

  Both races still needed manual values, so the outputs are the same either way. The `issue` column in your file keeps my original wording; you may want to correct it.
- **Something to check:** every note in the file says "Filled by Claude from the official source". I did not fill these values in this session, and I have not fetched those source URLs. If another session filled them, the spot-check the notes ask for is still worth doing, particularly the PDF sources.

## Revision 3 (caucus-based holder rule)

- **`flipped_vs_holder` compares caucuses:** a seat counts as flipped only when it moves from one caucus to the other.
  - New columns: `holder_caucus` and `winner_caucus`, from `independents.csv` for elected independents and `senate_seat_changes.csv` for switches and appointments. The build stops if an elected independent has no single caucus entry.
  - **No longer flips:** AZ 2024, CT 2006 and CT 2012. All three have `party_changed = true`.
  - **Still flips:** ME 2012 (King) and WV 2024 (Justice).
- **New column `party_changed`:** the winner's party label differs from the holder's. True for AZ 2024, CT 2006 and CT 2012, so the map can note them without hatching. VT 2006 is false; see open question 1.
- **`flipped_vs_last_election` is unchanged** (party labels against the previous election).
- **`senate_results_manual.csv`:** the `issue` column now reads `medsl_rounds_mixed` for LA 2016 and `medsl_runoff_labelled_gen` for MS 2018. I edited only those two cells. The `note` cells in those rows still carry the old "Previous issue" wording.
- **Tests:** the flip test now pins AZ 2024, CT 2006 and CT 2012 as party changes without a caucus flip, VT 2006, ME 2012 and WV 2024. It also checks that every caucus flip is a party change. 25 of 25 tests pass, and two runs give identical outputs.
