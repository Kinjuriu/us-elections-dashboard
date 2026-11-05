# Step 10: enter the 2026 results, then build the Firsts section

Written by Claude (Opus) for Sonnet, 5 November 2026. Run this after step 09 is merged into `step-08-build`, on a new branch `step-10-results` from it. Read CLAUDE.md, DESIGN_RULES.md and data/SOURCES.md first.

## Part A: 2026 results (data)

The election was on 3 November 2026. Results are provisional until states certify.

1. Senate: for every 2026 Senate race, the winner, party, vote shares and whether AP has called it, into the existing provisional slots the pipeline already reads (find them; do not invent a new format).
2. House: seats won by each party, by state, for the House squares and the cards; uncalled seats stay "not yet entered".
3. Governors: the 36 governor races of 2026: state, winner, party, vote share, runner-up and share, called or not, and the date the winner takes office. Add them to the governors data so the governors map's 2026 view shows the winners (shaded with the "leading, not called" tints where uncalled), and the 2026 headline stops saying "not yet entered".

Rules:
- Sources, in order: the state's official results page; then AP's race calls on apnews.com. Record source URL and access time on every row. Nothing from memory, social media or screenshots.
- Mark every 2026 row provisional. Tests: counts match AP's totals for each chamber on the access date; 50 governors in the 2026 view.
- If a source blocks scripted access, list the races you could not fill and stop that part; do not guess.

## Part B: Firsts

A "Firsts" section on the Governors page (step 09 left the heading in place), and a smaller "Firsts in Congress" block on the US Congress page.

Data: `data/manual/firsts.csv` with columns `year, office (governor | senator | representative), state_po, person, party, first (one plain sentence, e.g. "First Native American woman elected governor in the US"), scope (national | state), source_url, source_publisher, accessed_at, verified (true | false)`, for elections from 2000 to 2026.

- Sources: Center for American Women and Politics (CAWP) fact sheets; US House Office of the Historian and US Senate Historical Office "firsts" pages; the National Governors Association; state official pages; and, for 2026 only, AP reporting. A first counts only when one of these states it. Social media posts, including the ones Stephane saw, are leads to check, not sources.
- Leads from Stephane's screenshots to check first: Deb Haaland (New Mexico, 2026, governor) and Keisha Lance Bottoms (Georgia, 2026, governor), and the Georgia 2026 statewide results. Enter them only once a source above confirms both the result and the "first".
- Do not record anyone's race, ethnicity, religion or sexuality beyond the exact wording of the "first" as the source states it.

Display, for the year on the railway (with an "All years" option):
- One card per first: state outline (step 09's StateShape) in the party colour, name in Source Serif 4, the party mark, the "first" sentence, and "How they did": the winner's vote share and margin from Part A (or from the existing results data for earlier years), with a "provisional" tag for 2026.
- Below the cards, a small table of all firsts (year, state, person, first, source link), so everything is reachable without the cards.
- No photos of people.

## Checks

Tests for the new data (no duplicate rows, every row has a source, every 2026 row is provisional), `npm test`, `npm run test:e2e`, screenshots of the Governors and Congress pages at 390 and 1440 into `review/10/`, and `review/10-report.md` listing every first you rejected for lack of a source. Commit, push `step-10-results`, open a pull request with base `step-08-build`, and stop.
