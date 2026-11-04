# Step 04: the dashboard layer and the history charts

Read `CLAUDE.md` and `DESIGN_RULES.md` (sections 6, 8, 9 and 11). Look at `reference/screenshots/04-ap-voter-poll-dot-plot.png` and `05-ap-margin-history-and-demographics.png` for chart finish, and `03-ap-balance-bar-and-race-table.png` for how AP lets one control drive several modules.

Work on a branch named `step-04-dashboard`. When done, push it and open a pull request with `gh pr create`, using the step report as the description. Never push to main or merge.

All charts are SVG, built at render time from `data/processed/`, wrapped in `ChartFrame`. Everything works at its default state with JavaScript off; JavaScript adds the shared controls.

## Part A: the dashboard layer (do this first)

The page should behave like a dashboard: one set of controls drives every module at once.

1. **Shared state.** A single small TypeScript store (no framework) holding `year`, `chamber` and `selectedState`, mirrored in the URL query string (`?year=2018&chamber=senate&state=GA`) so any view can be shared as a link and survives reload. Invalid values fall back to the defaults.
2. **Control bar.** A slim, squared bar under the page header that becomes sticky once the reader scrolls past the header. It holds the chamber `SegmentedControl` and the year control (every even year 2000 to 2026, plus the 2013 and 2017 specials only where the Senate view needs them). It has one state at a time and no shadow beyond a 1px bottom rule. On phones it is one row, with the year buttons scrolling sideways and the current year centred.
3. **Move the map's own controls into the bar.** The map from step 03 reads from the shared store; remove its local buttons. Nothing about how the map draws should change.
4. **Modules that listen to the store:**
   - the header seat bars show the Congress elected in the selected year (falling back to the latest with data, with a visible note);
   - the map;
   - the flips table filters to the selected year;
   - the midterm chart highlights the selected year if it is a midterm.
5. **State view.** Tap, click or press Enter on a state (on the map or in the flips table) to set `selectedState`. A panel opens beside the map (below it on phones) showing that state's full record: every Senate race 2000 to 2026 as a compact table (year, winner, party, margin, flipped), and its House delegation over time as a small row of seat bars, one per election. A clear "Close" button and Esc close it. Nothing here is hover-only.
6. **Compare.** A "Compare with" control in the bar lets the reader pick a second year. When set, the header seat bars show both years one above the other with the change in seats written between them ("Democrats +41"), and the map adds a small marker on states whose Senate seat or House majority changed between the two years. Clearing it returns to the single-year view.
7. **Tests.** Add tests for the store (URL in, URL out, invalid values) and one end-to-end check that changing the year updates the map, the seat bars and the flips table together.

## Part B: the history charts

### Chart 1: Who controlled Congress, 1947 to 2027

- Two aligned rows of stacked seat bars, one per Congress (80th to 120th): House on top, Senate below. Each bar is split into Dem / Ind / GOP / vacant, Dem left, GOP right, with a thin black tick at the majority line.
- Use `majority_party_most_of_congress`, with a footnote marker where `majority_note` is set.
- A thin band above the bars shows the president's party for those years.
- Highlight periods of unified government (same party holds House, Senate and presidency) with a subtle `--paper-2` background.
- Direct labels for notable shifts, each short and factual and derived from the data.
- Clicking a Congress sets the shared `year` to its election year.

### Chart 2: The midterm penalty

- Diverging bars: one per midterm since 1946, seats gained or lost by the president's party (caucus counts), House and Senate following the shared chamber control.
- Bars coloured by the president's party; zero line in black; each bar labelled with its number.
- Annotate the exceptions where the president's party gained House seats, as the data shows them.
- 2026 hatched and labelled provisional until certified. House "before" counts are taken at the opening of the outgoing Congress: say so in a footnote, and keep headlines independent of figures that differ from the commonly cited election-day numbers.
- One sentence under the chart with the median House seat change, computed from the data.

### Chart 3: Seats that flipped

- The flips table for the shared year: state, previous caucus, new caucus, winner, margin; sortable by margin; squared party swatches; tabular numbers. Rows where only the label changed (`party_changed` without a flip) show a small "label change" note and are not counted as flips.
- Above it, a small bar per cycle (2000 to 2026) counting flips to each caucus; clicking a cycle sets the shared year.

## Rules

- Nothing from the banned list. No pie, donut, 3D or dual axes. Data transitions only, 150 to 250ms, off under reduced motion.
- The control bar is the only sticky element on the page; check there is never a moment when two headers are visible at once.
- Every annotation and headline number is derived from the data files; list each one and its source row in the report.
- Apply the hand-coding test (DESIGN_RULES section 11) to every interaction and list them in the report with one line each on why a human designer would build it.

## When finished

Screenshots at 375px and 1440px into `review/04-*.png`: the default view, a state view open (Georgia), a compare view (2018 against 2022), and each chart. Write `review/04-report.md` (what was built, interactions and their justification, headline numbers and their source rows, gaps). Push the branch, open the pull request, then stop.
