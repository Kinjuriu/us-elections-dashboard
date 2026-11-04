# Step 03 report: the map

4 November 2026. Revised the same day after Stephane's review; the changes are listed under "Revision 1".

## What was built

The map section now has a working map of the Senate and the House for every even year from 2000 to 2026. It opens on the latest year with results (2024 today) and will open on 2026, labelled provisional, once 2026 results are entered.

| Part | File | Notes |
|---|---|---|
| Geography pipeline | `pipeline/geo/build_geo.py` | Downloads 7 Natural Earth 10m bathymetry bands (200m to 6,000m), lakes and countries, each into its own folder, and records them in the manifest. Uses mapshaper to dissolve, simplify, turn into lines and clip. Writes `public/geo/ocean.topo.json` (262KB, under the 400KB budget), `land.topo.json` (84KB) and `states.topo.json` (67KB, us-atlas `states-10m.json` simplified). Two runs give byte-identical outputs. Added to `run_all.py`; sources in `SOURCES.md`. |
| Pipeline additions | `build_senate_results.py`, `build_house_delegations.py`, `common.py` | New columns: `called` in both files (true for certified years, passed through from `2026_provisional.csv` for 2026) and `winner_display_name` in the Senate file. Every existing column is unchanged. |
| Display names | `data/manual/display_names.csv` | 10 hand-checkable exceptions to the title-case rule |
| Map data | `src/lib/mapData.ts` | One record per year and chamber, from `senate_results_by_state.csv`, `house_delegations_by_state.csv`, `chamber_control.csv` and `independents.csv`. Checks at build time: 435 House seats each year, 50 states, 32 to 38 Senate races. |
| Geometry | `src/lib/geo.ts`, `src/lib/mask.ts` | The three parts of `d3.geoAlbersUsa`, each fitted to its own box. There are three layouts: phone (under 640px), tablet (640 to 1023px) and desktop. Shapes are drawn once in `<defs>` and placed by each layout with `<use>`, so the page carries one copy of the path data. A coarse raster of each layout (water, neighbouring land, or which state) decides where House squares and water labels can go. |
| Words | `src/lib/mapText.ts` | Title block, tooltip and panel text, and accessible names. The build and the browser share this file, so the no-JS page and the interactive one say the same thing. |
| Component | `src/components/CongressMap.astro` | Controls, key, seat bars, map, tooltip and details panel |
| Island | `src/scripts/congress-map.ts` (about 17KB) | Switches chamber and year, draws the House squares, runs the hover tooltip, the pinned panel and the keyboard. It reads `?chamber=&year=` from the URL and keeps it updated, so each view has its own link. |
| SeatBar | `src/lib/seatbar.ts`, `seatbar-client.ts` | The seat logic moved into a shared module so the bar can be redrawn in the browser. The header bars render as before. |

### How it reads

- **Senate:**
  - Party fills, tints for "leading, not called", and 45° hatching for flips (winner's colour over its tint). Independents are ochre.
  - States with no race are `--no-race`. States with a race but no result entered (all of 2026 today) get a light dot pattern.
  - A boxed "2" marks a state with two races. If the regular and special races ever go to different sides, the state is split on a hard diagonal, regular race top left, and a key item appears. This never happens from 2000 to 2026; I checked the drawing by forcing it in the browser.
  - The title block reads, for example, `SENATE 2018 / 35 SEATS UP · 6 FLIPPED`.
  - A seat bar shows the Senate at the opening of the new Congress, and a note appears for 2000 and 2020, when control changed during the Congress.
- **House:**
  - White states with hairline borders. Each delegation is a grid of squares, one per seat, grouped by party, with a postal-code chip.
  - Grids stay inside their own state where they fit, trying a few grid shapes. Otherwise a coastal state's grid goes just offshore with a leader line (California, Florida, and on some layouts Pennsylvania and Virginia). An inland state's grid goes on nearby land, never over water.
  - The small eastern states (NH, MA, RI, CT, NJ, DE, MD) sit in a column in the Atlantic. A 435-seat bar with the 218 marker sits above the map.
- **Headline:** the ChartFrame title is worked out from the data for each view. For example "Republicans took the Senate in 2014, flipping 9 seats", and for the House only the seats won that year: "Republicans took the House in 2010, winning 242 seats".
- **Details:** hover shows an instant squared tooltip. Tap, click or Enter pins the same content into the panel: beside the map from 1024px, below it on phones. The panel shows the winner (title-cased), party, vote shares, margin, "Flipped from R" or "Republican hold", the House vote shares, the change since the previous election, and any data note (for example NC-9 2018). Every state is tappable in both views, including phone House grids without a label.

### Checks run

- `npm run build` passes, and 27 pipeline tests pass. Two are new: display names, and `called`.
- **Headless Chrome at 360, 375, 768, 1024, 1280, 1440 and 1600px:** no horizontal scroll and no console errors, in each of Senate 2018, Senate 2026, House 2010, House 2026 and the default view.
- **JavaScript off:** the default view (Senate 2024) renders fully, with a note that JavaScript is needed to change the view. The panel is hidden.
- **Interactions:**
  - Hover shows the tooltip, and click pins Texas.
  - The panel follows year and chamber changes.
  - Tap pins without a tooltip.
  - Tab reaches the map in one stop. Arrow keys move to neighbouring states, Enter pins, and Escape clears.
  - The focus ring is a 2px ink line with a white edge, so it shows on both land and water.
- **Motion:**
  - Fills cross-fade in 200ms.
  - Under `prefers-reduced-motion` the transitions are 0s.
  - On phones the year row centres the selected year, including after the web fonts load.
- **Text:** no em or en dashes in the rendered text or the map data.
- **Page weight:** about 1.2MB of HTML, about 185KB gzipped. Most of it is map geometry.

### Screenshots

`review/03-senate-2018-{375,1440}.png`, `03-senate-2026-*`, `03-house-2010-*`, `03-house-2026-*` (the map frame only; 375px at 2x).

## Revision 1 (Stephane's decisions and fixes)

- **Default year:** the latest year with Senate results, so 2024 today. It switches to 2026, labelled provisional, once any 2026 Senate result is entered.
- **`called`:** new column in both processed files, passed through the pipeline. Only provisional results that are not called show as a tint.
- **Phone labels:** unchanged (big delegations and the Atlantic column always labelled). Every state stays tappable.
- **Names:** title-cased by the pipeline into `winner_display_name`; `winner_name` keeps the source spelling.
  - The rule capitalises after hyphens and quotes, turns "LAST, FIRST" round, and keeps suffixes (Jr., III).
  - The exceptions in `data/manual/display_names.csv` are McConnell (twice, including MEDSL's "MICH MCCONNELL"), McCain, McCaskill, McCormick, DeMint, DeWine, JD Vance, Ron Wyden (MEDSL prints "WYDEN RON") and Ben R. Luján (accent).
  - I checked each against its Wikipedia article title on 4 November 2026; every row is `verified = false` for your hand check.
  - A test fails if a new name with Mc, O' or JD has no exception. De, La and Mac cannot be caught automatically (Dean, Lamar, Mack).
- **Split states:** the build error is replaced by the diagonal split and the "2" marker. A split state is not hatched; the panel says which race flipped.
- **West Virginia:** its House squares now sit on the state in every layout. The old greedy search could push them out over Lake Erie.
- **California and Florida:** grids no longer spill into the water. A grid must be at least 92% on its own state and no more than 3% over water. If it can't fit, a coastal state's grid goes just offshore, within three squares of its own coast, with a leader line; otherwise it goes on nearby land.
- **Hawaii:** its label is now placed by searching the inset for clear water, at every layout size.
- **House headline:** states only the seats won that year ("…winning 242 seats"), not a gain measured against an earlier count.

## Effects and animation (DESIGN_RULES 11.1)

- **Fill cross-fade, 200ms, on year change:** shows which states changed between years. A person comparing years by hand would want that cue. Off under reduced motion.
- **Hatching fade (opacity, 200ms):** the same cue for flips, since a pattern cannot be colour-interpolated.
- **Hover outline (1px ink):** shows which state the tooltip describes. Nothing moves, grows or fades.
- **Selected or focused outline (2px ink, white edge):** shows which state the panel or keyboard is on.

There is no autoplay, no play button and no scroll effects.

## Deviations, and why

1. **Not `d3.geoAlbersUsa()` itself, but its three parts with d3's own parameters.** The composite cannot draw ocean and contours inside framed insets, and it fixes Alaska and Hawaii at the bottom left, exactly where the title block must go. On tablet and desktop, Alaska and Hawaii sit in a left column over the Pacific with the title block below them. On phones they sit bottom left, and the title moves above the map. Insets are not to scale.
2. **us-atlas shapes simplified with mapshaper** (2.5km tolerance, under a pixel at every size). Without this the state paths alone were 159KB.
3. **Labels are HTML over the SVG, not SVG text,** so they never fall below 12px however the map scales.
4. **The "2 races" marker is a boxed "2"** with "Two races: regular and special election" in the key. The words did not fit in states like Mississippi.
5. **House labels sit on a white chip,** because many grids border a coast or a lake.
6. **The map's seat bars use different counts.** The Senate bar uses opening-day counts from `chamber_control.csv`. The House bar sums the delegations from the November returns, so it matches the squares.
7. **No House flip hatching.** The data has delegations, not district-to-district flips. The panel shows the net change since the previous election when the state's seat count is unchanged.
8. **Panel beside the map from 1024px,** 260px wide.

## Data gaps

- **2026 has no results.** The map opens on 2024; choosing 2026 shows 35 dotted states and outlined House squares. Nothing was filled in.
- **Odd-year specials are not shown:** MA 2013, NJ 2013 and AL 2017. A footnote lists them. The MA January 2010 special appears on the 2010 map, dated to November as in the pipeline.
- **House independents' caucus** comes from `independents.csv` rows marked unverified (Sanders, Goode).
- **Display-name exceptions** are `verified = false` until you check them.

## Things you should know

- **Placements on phones:** at 375px a few southern grids sit on nearby land with a leader line rather than on their own state (for example North Carolina in 2010). There is not enough room at that size for every grid to stay home.
- **The midterm frame still says 64.** Its headline in `index.astro` (step 02) still says Obama's Democrats "lost 64 House seats in 2010", from `midterm_swing.csv`, which measures from the opening of the previous Congress. I left it, since step 04 builds that chart; it may want the same treatment as the map headline.
- **Other work on the repo.** Another session committed `149a725` to main during this step. The rewritten `prompts/04-charts.md` and `prompts/00-HOW-TO-USE.md` are included on this branch, as you asked.
- **New dependencies.** CLAUDE.md lists `d3-geo` and `topojson-client`; the step 03 prompt names `us-atlas` and `mapshaper` (dev only). I added nothing else.
- **Natural Earth zips are not committed.** At about 20MB they are gitignored and re-fetched by the script, which stops if a hash no longer matches.

## Open questions

1. **Midterm frame:** should its headline also avoid the 64-seat figure, or is that for step 04?
2. **Phone placements:** are the few grids placed on nearby land on phones acceptable, or should phones use a simpler House view (for example a bar per state)?
