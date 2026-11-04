# Step 04 report: the dashboard layer and the history charts

4 November 2026. Branch `step-04-dashboard`, built on `step-03-map`. The step 03 pull request (#2) is still open and the Part A prompt only exists on that branch, so this pull request is opened against `step-03-map` and shows only the step 04 changes. See "Things you should know".

## What was built

### Part A: the dashboard layer

| Part | File | Notes |
|---|---|---|
| Store | `src/lib/store.ts` | Holds `year`, `chamber`, `state` (the selected state) and `compare` (the comparison year). Pure functions read it from the URL, write it back and make it valid, plus a small subscribe store. It has no DOM, so Node can test it. |
| Browser instance | `src/scripts/dashboard.ts` | One store per page, configured from a JSON block the build writes (`#dash-config`). Every change is written to the URL with `replaceState`, for example `?year=2018&chamber=senate&state=GA&compare=2022`. A link survives reload, and the back button is not filled with every click. Invalid values fall back to their defaults one field at a time, and the URL is tidied on arrival. It also holds `openState` and `closeState`, and Esc anywhere closes the state view. |
| Control bar | `src/components/ControlBar.astro`, `src/scripts/control-bar.ts` | Chamber, Year and "Compare with". It sits under the masthead with `position: sticky`, so it only sticks once the masthead has scrolled away and there is never a second header. It has a 1px bottom rule and no shadow. 2013 and 2017 appear only in the Senate view. 2026 carries a small "provisional" note. Phones get one row: the chamber buttons, years that scroll sideways with the current year centred, and a "Compare" menu. |
| Header seat bars | `src/components/HeaderBars.astro`, `src/scripts/header-bars.ts` | House and Senate for the Congress elected in the selected year. 2026 falls back to 2024 and a note says so. An odd special-election year shows the Congress sitting at the time, also with a note. With a comparison set, each chamber shows both years, earlier above later, with the change between them ("2018 to 2022: Democrats -22, Republicans +23"). |
| Map | `src/components/CongressMap.astro`, `src/scripts/congress-map.ts` | Its own buttons and URL code are gone; it follows the store. The drawing code is unchanged. It now also has Senate maps for the 2013 and 2017 specials. |
| State view | `stateRecordHtml()` in `src/lib/mapText.ts` | Tap, click or Enter a state on the map, or a state name in the flips table. The panel beside the map (below it on phones) shows the selected year's result, then every Senate race since 2000 (year, winner, party, margin, flipped or label change), then a small seat bar for each House election since 2000. It has a Close button, and Esc also closes it. Focus returns to whatever opened it. |
| Compare markers | `senateChanged()` and `houseChanged()` in `mapText.ts` | A small diamond marks states that changed between the two years, with a key line giving the count. Senate view: a seat (by Senate class) is held by a different caucus. House view: the delegation's majority changed. |
| Tests | `tests/store.test.ts`, `tests/e2e/dashboard.test.ts`, `tests/e2e/browser.ts` | `npm test` runs 11 store tests: URL in, URL out, round trip, every kind of invalid value, Senate-only years and normalising. `npm run test:e2e` builds and drives Chrome through 5 checks. The key one: clicking 2018 updates the map title, the header seat bars and the flips table together, and the URL follows. No new packages: it uses Node 26's own test runner and WebSocket and the installed Chrome. |

### Part B: the history charts

All three are SVG built from `data/processed/`, inside `ChartFrame`. Text is HTML laid over the SVG, as on the map, so nothing renders below 12px at any width. Each has a wide layout (from 1024px) and a phone layout.

1. **Who controlled Congress** (`ControlChart.astro`):
   - One column per Congress, 80th to 120th: a band for the president's party, then the House row, then the Senate row.
   - Each bar runs Democrats from the left and Republicans from the right, independents next to their caucus, with a black tick at half the seats.
   - A strip under each row shows `majority_party_most_of_congress`, with footnotes 1 and 2 where `majority_note` is set. Shading marks unified government.
   - Labels mark notable shifts. Clicking a Congress from 2001 on sets the shared year.
   - A readout line gives the exact counts for the Congress under the pointer or selected. "All the numbers" opens a full table.
   - Phones get one row per Congress, with the shift labels written inline.
2. **The midterm penalty** (`MidtermChart.astro`):
   - Diverging bars by the president's party, with a black zero line and every bar labelled.
   - The chamber follows the control bar, and the headline changes with it.
   - The selected year is outlined when it is a midterm.
   - The two House exceptions are annotated.
   - 2026 reads "Not yet entered" and will be hatched once a provisional value is entered.
   - A median sentence, the footnote on House "before" counts, a readout and a numbers table.
3. **Seats that flipped** (`FlipsChart.astro`, `src/lib/flipsText.ts`):
   - A small diverging bar per cycle: flips to Democrats above the line, to Republicans below. Clicking a cycle sets the year.
   - A table for the selected year: state (a button that opens the state view), previous and new caucus with square swatches, winner and margin. It sorts by margin, closest or largest first.
   - Label-only changes appear with a note and are not counted.

## Interactions, and why a person would build each (DESIGN_RULES 11.1)

| Interaction | Why it earns its place |
|---|---|
| Sticky control bar | The page is long; the reader should be able to change the year from any chart without scrolling back up. It is the one sticky element. |
| One year control drives everything | The question a reader brings ("what happened in 2018?") spans the map, the seat bars and the flips. Setting the year once is the reason the page is a dashboard. |
| View in the URL | A reporter or editor sends a link to a specific view. That is a standard newsroom request. |
| Phone year row centres the selected year | Otherwise the selected button can sit off screen after a change. |
| Compare with a second year | "How did it change between X and Y" is the second most common question. The written change ("Democrats -22") answers it without arithmetic. |
| Diamond on changed states | Shows where the change happened. It is a static mark, not an animation. |
| State view panel | Answers "what is this state's history" without leaving the map. It opens on tap, click or Enter, so phones and keyboards get it too. |
| State names in the flips table open the state view | The table names a state; the natural next question is that state's record. Focus moves to the panel, so the page scrolls there. |
| Click a Congress or a cycle to set the year | Lets the history charts act as a second year control, the way AP lets one race row drive the page. |
| Hover readout on Charts 1 and 2 | A shortcut only. The same numbers are in the "All the numbers" tables and, for the selected year, in the readout without any hover. |
| Sort by margin | The closest flips are the usual story. One button, no animation. |
| Seat-colour cross-fade on the map (200ms, from step 03) | Unchanged. Off under reduced motion. |

There are no other animations. Year changes in the charts, header bars and table are instant.

## Headline numbers and annotations, with their source rows

| On the page | Value | Derived from |
|---|---|---|
| Chart 1 headline | One party held the presidency, House and Senate in **16 of 40** Congresses since 1947; Democrats had the longest stretch, **1961 to 1969** | `chamber_control.csv`: Congresses 80 to 119, `is_provisional = False`. Unified when `majority_party_most_of_congress` (falling back to `majority_party`) is the same for both chambers and equals `president_party`. Unified Congresses: 81, 82, 83, 87 to 90, 95, 96, 103, 108, 109, 111, 115, 117, 119. Longest run: 87 to 90. Checked again in Python. |
| Shift label "1980: Republicans take the Senate" | ends 26 years | Senate rows: 97th `GOP` after 84th to 96th `DEM` (13 Congresses) |
| Shift label "1994: Republicans take the House and Senate" | ends 40 years of Democratic control of the House | House rows: 104th `GOP` after 84th to 103rd `DEM` (20 Congresses). Senate 100th to 103rd `DEM`. |
| Shift label "2006: Democrats take the House and Senate" | ends 12 years | House rows: 110th `DEM` after 104th to 109th `GOP` |
| Shift label "2014: Republicans take the Senate" | ends 8 years | Senate rows: 114th `GOP` after 110th to 113th `DEM` |
| Shift label "2018: Democrats take the House" | ends 8 years | House rows: 116th `DEM` after 112th to 115th `GOP` |
| Rule for shift labels | a change of majority that ends a run of 4 or more Congresses (8 years) | stated in the subtitle. Runs reaching back to the 80th Congress are not counted, since their start is not in the data. |
| Footnote markers 1 and 2 | 107th and 117th Senate | `majority_note` on those rows |
| Chart 2 headline, House | lost seats in **18 of the 20** midterms, 1946 to 2022 | `midterm_swing.csv`, `chamber = house`, `is_provisional = False`, `change < 0`. Losses only, so the headline does not depend on the House "before" basis. |
| Chart 2 headline, Senate (default view) | lost seats in **13 of the 20** | same file, `chamber = senate` (5 gains, 2 no change) |
| Annotation "Clinton's Democrats gained seats" | 1998, +4 | `midterm_swing.csv` 1998 house |
| Annotation "Bush's Republicans gained seats" | 2002, +7 | `midterm_swing.csv` 2002 house |
| Median sentence | **-22** House seats | median of the 20 House `change` values, 1946 to 2022. The 10th and 11th values are -26 and -18. |
| Chart 3 headline | **9** seats changed party in **2014**, the most from 2000 to 2024 | `senate_results_by_state.csv`, `flipped_vs_holder = True`, 2014. Next highest: 8 in 2000, 2004 and 2008. |
| Flips sentence, 2018 | 6 seats: 4 to Republicans, 2 to Democrats | same file, 2018 rows, counted by `winner_caucus` |
| Header bar titles | e.g. "Democrats hold the House and Republicans the Senate after the 2018 election" | `chamber_control.csv`, `majority_party_most_of_congress` for the Congress elected that year |
| Compare change, 2018 to 2022 | House: Democrats -22, Republicans +23. Senate: Democrats +3, Republicans -4, Independents +1. | `chamber_control.csv` 116th and 118th rows |
| Compare markers, Senate 2018 against 2022 | AL, AZ, CO, GA, PA | `senate_results_by_state.csv` winners, with `senate_class` from `senate_results_detail.csv` |

## Checks run

- `npm run build` passes. `npm test` gives 11 of 11; `npm run test:e2e` gives 5 of 5.
- **Widths and states:** headless Chrome at 360, 375, 768, 1024, 1280, 1440 and 1600px, across four states (default; House 2018 with compare and Georgia open; Senate 2013 with NJ open; House 2026 against 2024).
  - No horizontal scroll.
  - No text under 12px.
  - No en or em dashes.
  - Exactly one sticky element.
  - No console errors.
- **JavaScript off:** the built HTML carries the default view of every module (Senate 2024), the 2024 flips table, the shift labels and the median sentence. The control bar shows a note that JavaScript is needed to change the view.
- **Odd years and pending data:** switching to the House from 2017 moves to 2016. Comparing 2024 with 2026 says "No change shown: 2026 results are not yet entered".
- **Screenshots:** `review/04-default`, `04-state-georgia`, `04-compare-2018-2022`, `04-chart-control`, `04-chart-midterms` and `04-chart-flips`, each at `-375.png` (2x) and `-1440.png`. Regenerate them with `node tests/e2e/screenshots.ts` after a build.

## Deviations, and why

1. **Chart 1 bars are drawn to scale, not as squares** (DESIGN_RULES 6). A square per seat would be under a pixel wide at 41 columns. A footnote says so, and the readout and table give exact counts.
2. **Only Congresses from 2001 on are clickable in Chart 1.** The year control, map and flips table cover 2000 to 2026, so a click on 1994 would have nowhere to go. The subtitle says "Select a Congress from 2001 on".
3. **The state view panel is 300px wide** (260px in step 03), to fit the Senate table. The map draws exactly as before, a little narrower.
4. **The compare menu reads "vs 2018" below 1280px,** where there is no room for the "Compare with" label.
5. **No separate "special" note on the 2013 and 2017 buttons.** It would push the year row past 1200px. Screen readers hear "2013 special elections, Senate only", and the map title says "Democrats won both Senate special elections in 2013".
6. **The midterm headline no longer quotes 64 seats** (your open question 1 from step 03). It counts losses, which are the same on either basis. The bar labels keep the data's numbers (-64), with the footnote.

## Data gaps and limits

- **2026 has no results.** It shows as "Not yet entered" or grey everywhere. The header bars fall back to 2024 with a note. Nothing was filled in.
- **Party colours fail one colourblind check.** The palette validator from the dataviz skill fails `--ind` against `--gop` for deuteranopia (ΔE 3.1; 8 is the target). The colours are fixed by DESIGN_RULES, so independents are never shown by colour alone: they always sit between the parties, the key names them, and every count is written out. You may want a different independent colour in step 05.
- **Compare markers in the Senate view** count changes at elections only. Appointments and party switches between elections are not seen. For 2000 and 2002, seats last elected before 2000 have no known holder and are not marked.
- **House compare markers** sit on the state's label chip. On phones a few states have no chip (as in step 03), so they get no marker.
- **Independents' caucus** still comes from rows marked unverified in a few Congresses; the header bars say so.

## Things you should know

- **This pull request is stacked on #2.** It targets `step-03-map`. If #2 is merged with its branch deleted, GitHub moves this one to `main` automatically. Otherwise, change the base to `main` after merging #2.
- **No new dependencies.** The tests use Node 26's built-in test runner (it runs TypeScript directly) and the system Chrome (`CHROME_PATH` overrides the path). There is no type-checker in the project (`astro check` needs `@astrojs/check`), so types were checked by building and in the browser. Shall I add it in step 05?

## Open questions

1. Is labelling only majority changes that ended 8 or more years the right rule for Chart 1? It leaves out 2010 and 2022.
2. Should Chart 1 let a reader select a Congress before 2001, with the map showing "no map for this year"?
3. Do you want a different colour for independents, given the colourblind result above?
