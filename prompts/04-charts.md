# Step 04: the history charts

Read `CLAUDE.md` and `DESIGN_RULES.md` sections 6 and 9. Look at `reference/screenshots/04-ap-voter-poll-dot-plot.png` and `05-ap-margin-history-and-demographics.png` for chart finish: titles, subtitles, light gridlines, direct labels, source lines.

All charts are SVG, built at render time from `data/processed/`, wrapped in `ChartFrame`.

## Chart 1: Who controlled Congress, 1947 to 2027

- Two aligned rows of stacked seat bars, one per Congress (80th to 120th): House on top, Senate below. Each bar is 100% width split into Dem / Ind / GOP / vacant, ordered Dem left, GOP right, with a thin black tick at the majority line.
- A thin band above the bars shows the president's party for those years.
- Highlight periods of unified government (same party holds House, Senate and presidency) with a subtle `--paper-2` background.
- Direct labels for notable shifts (e.g. 1994, 2006, 2010, 2018, 2026), each one short and factual, written from the data.
- Headline: state the main finding the data supports in plain English; subtitle defines the measure ("Seats at the start of each Congress").

## Chart 2: The midterm penalty

- Diverging bar chart: one bar per midterm since 1946, showing seats gained or lost by the president's party, House and Senate as a toggle (`SegmentedControl`).
- Bars coloured by the president's party; zero line in black; bar labels with the number (e.g. "-63").
- Annotate the exceptions where the president's party gained House seats, if the data shows them.
- 2026 bar hatched and labelled "provisional" until certified.
- Below the chart, one sentence with the median House seat change, computed from the data.

## Chart 3: Seats that flipped

- For the selected Senate year (shared state with the map if practical), a compact table: state, previous party, new party, winner, margin. Squared party swatches, tabular numbers, sortable by margin.
- Above it, a small bar per cycle (2000 to 2026) counting flips to each party.

## Rules

- No pie, donut, 3D or dual axes. No animations beyond 200ms data transitions.
- Every annotation must be derived from the data files; list each annotation and the row it comes from in the report.

## When finished

Screenshots at 375px and 1440px into `review/04-*.png`, and `review/04-report.md` (findings used in headlines, with the numbers behind them; any gaps). Then stop.
