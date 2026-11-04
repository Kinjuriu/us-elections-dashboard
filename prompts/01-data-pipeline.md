# Step 01: build the data pipeline

Read `CLAUDE.md` and `DESIGN_RULES.md` first. This step is data only; do not build any UI.

## Goal

Produce clean, validated, fully sourced datasets for a dashboard on US House and Senate elections, 1946 to 2026, using Python scripts in `pipeline/` that anyone can re-run.

## Outputs (in `data/processed/`)

1. **`chamber_control.csv`**: one row per Congress per chamber, from the 80th Congress (elected 1946) to the 120th (elected 2026).
   Columns: `congress, election_year, years_served, chamber, total_seats, dem, gop, ind, other, vacant, majority_party, majority_threshold, president, president_party, is_midterm, is_provisional, source_id`.
   Use seat counts **at the start of each Congress** (state this in `SOURCES.md`).
2. **`midterm_swing.csv`**: one row per midterm year from 1946 to 2026 (and 2026 flagged provisional).
   Columns: `year, president, president_party, chamber, seats_before, seats_after, change, is_provisional`.
   "Before" is the president's party seats at the start of the outgoing Congress; "after" is at the start of the new one. Document this choice.
3. **`senate_results_by_state.csv`**: one row per Senate race (regular and special) from 2000 to 2026.
   Columns: `year, state, state_po, special, winner_name, winner_party, runner_up_party, winner_pct, runner_up_pct, margin_pts, flipped, previous_party, is_provisional, source_id`.
4. **`house_delegations_by_state.csv`**: one row per state per election, 2000 to 2026.
   Columns: `year, state, state_po, seats, dem, gop, other, vacant, dem_vote_share, gop_vote_share, is_provisional, source_id`.
5. **`data/SOURCES.md`**: each source with `source_id`, title, URL, publisher, licence or terms, date accessed, years covered, and known caveats.

## Sources to use (check each is reachable; report any that are not)

- US House Office of the Historian, "Party Divisions of the House of Representatives, 1789 to Present" (history.house.gov), for House seat counts by Congress.
- US Senate Historical Office, "Party Division" (senate.gov), for Senate seat counts by Congress.
- MIT Election Data and Science Lab (MEDSL) on Harvard Dataverse: "U.S. House 1976 to [latest]" and "U.S. Senate 1976 to [latest]" constituency returns, for race results and vote shares. Download the latest release and note the last year it covers.
- For any year after MEDSL coverage ends (at least 2026, possibly 2024): build `data/manual/2026_provisional.csv` (and a 2024 file if needed) from AP results pages or the official state results, with `source_url` and `accessed_at` on every row. Mark all such rows `is_provisional = true` unless the result is certified.
- Presidents and their parties by year: a small manual CSV with a cited source.

## Rules

- Never invent or estimate a number. Missing values stay null and go in the report.
- Download raw files to `data/raw/` with a `download.py` script; do not hand-edit them.
- Independents: keep them in `ind`, and add `caucuses_with` in a side table (e.g. Sanders, King). Do not silently add them to a party.
- Use two-letter postal codes (`state_po`) everywhere so the map can join on them.
- Write `pipeline/tests/test_totals.py` with pytest checks:
  - House: `dem + gop + ind + other + vacant == 435` for every Congress, except the 86th and 87th (1959 to 1963), when the House temporarily had 437 seats after Alaska and Hawaii joined. Verify this against the source.
  - Senate: totals equal 96 before 1959 and 100 after.
  - Every `senate_results_by_state` year has between 30 and 40 races; specials flagged.
  - Spot checks you verify against the source: list 5 rows you checked by hand in the report.
- Add a `Makefile` or `pipeline/run_all.py` that runs download, clean and tests in order.

## When finished

Write `review/01-report.md` with: what was built, coverage table (years by dataset), every gap or ambiguity, the 5 hand-checked rows, and anything Stephane must enter or confirm by hand. Then stop.
