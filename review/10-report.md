# Step 10 report

## Done
- **0.1 Women pictogram.** Person figures drawn as inline SVG (woman with a skirt, man with trousers, 10 by 22 units), women in `--ink`, men in `--rule`, legend above, two lines of 50 per row, percentage at the end of each row. On phones the figures take the full row width under the year. DESIGN_RULES.md section 2 has the exception line. Screenshots: `review/10/women-1440.png`, `women-390.png`.
- **0.2 Senate card.** Added `data/manual/senate_control_day.csv`, checked by `pipeline/build_chamber_control.py` against the Senate's own dated rows, written to `data/processed/senate_control_day.csv`. The 2020 card now reads "50 Democrats, with the vice president, from 20 January 2021" and keeps the opening-day line. Also added 2000: 6 June 2001, 50 D, 49 R, 1 independent (Jeffords), so that card reads "51 Democrats" (no vice president involved). The semicircle and party buttons still show opening-day seats (46 D, 51 R). The old e2e test for the 2020 card was updated to the new wording.
- **Part B page.** `/firsts/` is built: masthead link, headline from the data, filter buttons with `aria-pressed`, cards (state outline in party colour, office, name, party mark, the first, how they did, article link, source link), a table, and an empty state. The Governors page "Coming in the next update" text is replaced by a link, the Congress page and footer link to it. No photos.
- Pipeline: `build_firsts.py`, `firsts.csv` in manual and processed, tests in `pipeline/tests/test_firsts.py`. Checks run: pytest 49 passed, `npm test` 22 passed, `npm run test:e2e` 25 passed (includes the internal-link test).

## Could not do: Part A (2026 results) and every first
AP (apnews.com) blocks scripted access (HTTP 403 and a tool block). The state results sites I tried (Georgia, New Mexico) are JavaScript apps that return no results to a script or fetch. Web searches only returned primary-election coverage; none returned a certified or AP-called 3 November result. Under the data rules I entered nothing.
- **Not filled:** all 2026 Senate races (winner, party, votes, shares, called), House seats by state, all 36 governor races, and the governors map 2026 view (the map still ends at 2024; `review/10/governors-*.png` shows the current state).
- **Vote-figure test** ("figures match Part A") has nothing to compare yet. Add it when Part A is filled.
- Needed from Stephane: a way to read AP or state results (pasted tables, or a downloaded export), then re-run.

## Leads rejected (every one)
- **Deb Haaland, New Mexico governor:** only primary coverage found (she won the 2 June primary, per Source NM). She could be the first Native American woman elected governor, but I found no general-election result and no source stating the first as achieved. Not entered.
- **Keisha Lance Bottoms, Georgia governor:** same; only the May primary found, and one county table with no race or date. Not entered.
- **Penny Brown Reynolds (secretary of state) and Tanya Miller (attorney general), Georgia:** no result or source found. Not entered.
- Anything else: the sources I could reach stated no firsts for 3 November, so `firsts.csv` has 0 rows and the page headline reads "No firsts confirmed yet in the 2026 elections".
- The page layout was checked with one temporary test row in the processed file only; it was removed and the file rebuilt from the manual file (0 rows).

## Open questions
- Should the Senate semicircle for 2020 also show the 20 January count (48 D, 2 I, 50 R) instead of opening day?
- At 390px the long card label ("Democrats, with the vice president") sits close to the seats.
