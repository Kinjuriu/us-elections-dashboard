# Step 03 report: the map

4 November 2026.

## What was built

The map section now has a working map of the Senate and the House for every even year from 2000 to 2026.

| Part | File | Notes |
|---|---|---|
| Geography pipeline | `pipeline/geo/build_geo.py` | Downloads 7 Natural Earth 10m bathymetry bands (200m to 6,000m), lakes and countries, each into its own folder, and records them in the manifest. Uses mapshaper to dissolve, simplify, turn into lines and clip. Writes `public/geo/ocean.topo.json` (262KB, under the 400KB budget), `land.topo.json` (84KB) and `states.topo.json` (67KB, us-atlas `states-10m.json` simplified). Two runs give byte-identical outputs. Added to `run_all.py`; sources in `SOURCES.md`. |
| Map data | `src/lib/mapData.ts` | One record per year and chamber, from `senate_results_by_state.csv`, `house_delegations_by_state.csv`, `chamber_control.csv` and `independents.csv`. Checks at build time: 435 House seats each year, 50 states, 32 to 38 Senate races. If two races in one state ever have different winners, the build stops (see question 5). |
| Geometry | `src/lib/geo.ts` | The three parts of `d3.geoAlbersUsa`, each fitted to its own box. There are three layouts: phone (under 640px), tablet (640 to 1023px) and desktop. Shapes are drawn once in `<defs>` and placed by each layout with `<use>`, so the page carries one copy of the path data. Also lays out the House square grids and the label callouts. |
| Words | `src/lib/mapText.ts` | Title block, tooltip and panel text, and accessible names. The build and the browser share this file, so the no-JS page and the interactive one say the same thing. |
| Component | `src/components/CongressMap.astro` | Controls, key, seat bars, map, tooltip and details panel |
| Island | `src/scripts/congress-map.ts` (17KB) | Switches chamber and year, draws the House squares, runs the hover tooltip, the pinned panel and the keyboard. It reads `?chamber=&year=` from the URL and keeps it updated, so each view has its own link. |
| SeatBar | `src/lib/seatbar.ts`, `seatbar-client.ts` | The seat logic moved into a shared module so the bar can be redrawn in the browser. The header bars render as before. |

### How it reads

- **Senate:** party fills, tints for "leading, not called", and 45° hatching for flips (winner's colour over its tint). Independents are ochre. States with no race are `--no-race`. States with a race but no result entered (all of 2026) get a light dot pattern. A boxed "2" marks a state with two races. The title block reads, for example, `SENATE 2018 / 35 SEATS UP · 6 FLIPPED`. A seat bar shows the Senate at the opening of the new Congress, and a note appears for 2000 and 2020, when control changed during the Congress.
- **House:** white states with hairline borders. Each state's delegation is a grid of squares, one per seat, grouped by party, with a postal-code chip. The small eastern states (NH, MA, RI, CT, NJ, DE, MD) go in a column in the Atlantic with leader lines. A 435-seat bar with the 218 marker sits above the map.
- **Headline** (ChartFrame title) is worked out from the data for each view, for example "Republicans took the Senate in 2014, flipping 9 seats" and "Republicans gained 64 seats and took the House in 2010".
- **Details:** hover shows an instant squared tooltip. Tap, click or Enter pins the same content into the panel: beside the map from 1024px, below it on phones. The panel shows the winner, party, vote shares, margin, "Flipped from R" or "Republican hold", the House vote shares, the change since the previous election, and any data note (for example NC-9 2018).

### Checks run

- `npm run build` passes, and the 25 pipeline tests pass.
- **Headless Chrome at 360, 375, 768, 1024, 1280 and 1600px:** no horizontal scroll and no console errors. I found and fixed one bug this way: the year row made the phone page 971px wide.
- **JavaScript off:** Senate 2026 renders fully, with a note that JavaScript is needed to change the view. The panel is hidden.
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
- **Page weight:** 1.19MB of HTML, 184KB gzipped. Most of it is map geometry.

### Screenshots

`review/03-senate-2018-{375,1440}.png`, `03-senate-2026-*`, `03-house-2010-*`, `03-house-2026-*` (the map frame only; 375px at 2x).

## Effects and animation (DESIGN_RULES 11.1)

- **Fill cross-fade, 200ms, on year change:** shows which states changed between years. A person comparing years by hand would want that cue. Off under reduced motion.
- **Hatching fade (opacity, 200ms):** the same cue for flips, since a pattern cannot be colour-interpolated.
- **Hover outline (1px ink):** shows which state the tooltip describes. Nothing moves, grows or fades.
- **Selected or focused outline (2px ink, white edge):** shows which state the panel or keyboard is on.

There is no autoplay, no play button and no scroll effects.

## Deviations, and why

1. **Not `d3.geoAlbersUsa()` itself, but its three parts with d3's own parameters.** The composite cannot draw ocean and contours inside framed insets, and it fixes Alaska and Hawaii at the bottom left, exactly where the title block must go. On tablet and desktop, Alaska and Hawaii sit in a left column over the Pacific with the title block below them. On phones they sit bottom left, and the title moves above the map.
2. **us-atlas shapes simplified with mapshaper** (2.5km tolerance, under a pixel at every size). Without this the state paths alone were 159KB.
3. **Labels are HTML over the SVG, not SVG text,** so they never fall below 12px however the map scales.
4. **The "2 races" marker is a boxed "2"** with "Two races: regular and special election" in the key. The words did not fit in states like Mississippi.
5. **House labels on a white chip.** Many grids straddle a coast or a lake, and no single text colour read on both.
6. **House labels on phones:** delegations of 12 or more and the Atlantic column are always labelled. Smaller ones get a label only where it fits, and a tap names any state. Labelling all 50 at 12px made the squares scatter.
7. **The map's seat bars use different counts.** The Senate bar uses opening-day counts from `chamber_control.csv`. The House bar sums the delegations, so it matches the squares. That is why 2010 shows +64 Republican seats, not the opening-day +63 (which counts one 2008 seat differently).
8. **No House flip hatching.** The data has delegations, not district-to-district flips, and redistricting makes "the same seat" unclear. The panel shows the net change since the previous election when the state's seat count is unchanged.
9. **Winners' names in capitals, as MEDSL prints them.** "LAST, FIRST" is turned round; suffixes like "CASEY, JR." are left alone. I did not title-case them, because rules like Mc or De would get some names wrong.
10. **Panel beside the map from 1024px,** 260px wide.

## Data gaps

- **2026 has no results**, so the default view (Senate 2026, as the prompt asks) shows 35 dotted states and an empty seat bar. The House 2026 squares are outlined as "not yet entered". Nothing was filled in.
- **No `called` column** in `senate_results_by_state.csv` or the delegation file. When 2026 results arrive, the map will show every provisional winner as a tint ("leading") until the pipeline carries `called` through from `2026_provisional.csv`. The map already reads a `called` column if one appears.
- **Odd-year specials are not shown:** MA 2013, NJ 2013 and AL 2017. A footnote lists them. The MA January 2010 special appears on the 2010 map, dated to November as in the pipeline.
- **House independents' caucus** comes from `independents.csv` rows marked unverified (Sanders, Goode).

## Things you should know

- Another session committed `149a725` ("Verify manual Senate entries…") during this step and edited `prompts/00-HOW-TO-USE.md` and `prompts/04-charts.md`. I did not touch or commit any of those. My 4 commits contain only step 03 files.
- **New dependencies.** CLAUDE.md lists `d3-geo` and `topojson-client`; the step 03 prompt names `us-atlas` and `mapshaper` (dev only). I added nothing else. The other D3 modules weren't needed, since the island uses CSS transitions and plain DOM.
- **Natural Earth zips are not committed.** At about 20MB they are gitignored and re-fetched by the script, which stops if a hash no longer matches.

## Open questions

1. **Default year:** keep 2026 (empty until results are entered), as the prompt says, or default to 2024 until 2026 has results?
2. **`called` for 2026:** may I add `called` to the processed Senate and House files in the pipeline, so called races show in full colour?
3. **House phone labels:** is labelling only the bigger delegations (with tap for the rest) acceptable, or would you rather have a label on every state and accept squares further from their states?
4. **Names:** keep the source's capitals, or title-case them with a short hand-checked exceptions list?
5. **Split Senate states:** if a state's regular and special races are ever won by different parties, how should it be drawn? It hasn't happened from 2000 to 2026, and for now the build stops if it does.
