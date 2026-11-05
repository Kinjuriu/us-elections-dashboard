# Step 07: collect the data for the next round of visuals

Model: Sonnet 5.5. Data only: no site code. Keep token use low: read CLAUDE.md, the "Data rules" in it, and pipeline/run_all.py; do not re-read the site code. Report under 500 words.

Branch `step-07-data` from the latest main (pull first). Push and open a pull request against main when done. Never merge.

The same rules as step 01 apply: every output is built by a script in `pipeline/`, nothing is estimated or typed from memory, every source goes in `data/SOURCES.md` with licence and access date, and missing values stay null and are listed in the report. Ask before adding any dependency beyond pandas, requests and pytest (pyyaml is pre-approved).

## A. Presidential vote shift by county (for a swing map)

- Source: MIT Election Data and Science Lab, "County Presidential Election Returns 2000-2024" on Harvard Dataverse (CC0). Find it on Dataverse and record the DOI and version you used.
- Output `data/processed/county_presidential_shift.csv`: `fips, state_po, county_name, dem_pct_2016, gop_pct_2016, dem_pct_2020, gop_pct_2020, dem_pct_2024, gop_pct_2024, margin_2016, margin_2020, margin_2024, shift_2016_2020, shift_2020_2024, total_votes_2024`. Margin = Dem share minus GOP share of all votes, in points; shift = later margin minus earlier margin (positive = towards Democrats).
- Handle the known oddities and document each: Alaska (reported by state house district, not county; use the statewide row or leave counties null and say so), Connecticut's 2022 switch from counties to planning regions, Virginia's independent cities, and any FIPS that changed between 2016 and 2024. Join keys must match `us-atlas` `counties-10m.json`; list every county that fails to join.
- Tests: every state's county votes sum to within 0.5% of its statewide total in the same file; shifts recompute exactly.

## B. Who serves in Congress: gender and age

- Source: the `unitedstates/congress-legislators` project on GitHub (public domain, CC0): legislators-current and legislators-historical (YAML or CSV), which carry gender, birthday and every term.
- Outputs:
  - `data/processed/members_by_congress.csv`: one row per member per Congress, 1947 to 2025 (80th to 119th): `congress, chamber, bioguide_id, name, party, state_po, gender, birth_year, age_at_start`.
  - `data/processed/women_by_congress.csv`: `congress, start_year, chamber, women, men, women_dem, women_gop, women_other, share_women`.
  - `data/processed/age_by_congress.csv`: `congress, chamber, median_age, share_under_45, share_45_64, share_65_plus`.
- Count members who served at any point in the Congress, and say so; also give opening-day counts if the data allows.
- Cross-check women counts for 1991, 2001, 2011, 2021 and 2025 against the Center for American Women and Politics (CAWP) published totals; report differences, do not overwrite.
- The 120th Congress (elected 2026) is not in this source until January 2027. Leave it out; Claude will add a provisional list of 2026 winners separately.

## C. What voters care about, by group (for a heatmap)

- Source: the Cooperative Election Study (CES) 2024 Common Content on Harvard Dataverse (open data). Record DOI and version. If its licence or terms forbid republishing aggregates, stop and report.
- Find the question closest to "most important issue" (single choice). If CES 2024 has none, look at the 2024 American National Election Studies (ANES) time series instead, and report which you used and why.
- Output `data/processed/issue_priority_by_group.csv`: `group_type, group, issue, pct, unweighted_n`, using the survey weights. Groups: all voters (validated or self-reported voters, say which), age bands (18 to 29, 30 to 44, 45 to 64, 65+), gender, party ID (Dem, GOP, independent), education (degree, no degree). Suppress any cell with unweighted n under 100 and say so.
- This is 2024 survey data. Label it that way everywhere; it is not a 2026 exit poll.

## E. Governors (for a governors map)

- Find an open, citable source for the party of every state's governor, year by year from 2000 to 2025, and for each gubernatorial general election result from 2000 to 2024 (winner, party, vote shares). Candidates to check: MIT Election Data and Science Lab on Harvard Dataverse, the National Governors Association's governors database, and academic state-partisanship datasets on Harvard Dataverse. Record licence and DOI; if none allows republishing, stop and report.
- Outputs: `data/processed/governors_by_year.csv` (`year, state_po, governor, party, took_office`) and `data/processed/governor_results.csv` (`year, state_po, special, winner, winner_party, runner_up_party, winner_pct, runner_up_pct, flipped`).
- Tests: 50 governors per year; every election year's races match the states that held one.
- 2026 governor results are collected by Claude, as with Congress.

## D. Not in this step

2026 results (Congress and governors) and the 2026 historic firsts are collected by Claude into `data/manual/` (files `2026_provisional.csv` and `firsts_2026.csv`). Do not search for them.

## Report

`review/07-report.md`: sources with DOIs and versions, row counts, coverage, every gap and join failure, the CAWP cross-check table, and which survey question you used. Push, open the pull request, stop.
