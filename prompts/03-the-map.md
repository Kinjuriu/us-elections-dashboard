# Step 03: the map (the centrepiece)

Read `CLAUDE.md` and `DESIGN_RULES.md` section 7. Study these references closely before writing code:

- `reference/screenshots/11-map-style-europe-1938.png` and `12-map-style-nordic-baltic.png`: the **style** (dark carved ocean with contour lines, pale flat land, big tracked uppercase title bottom-left, small tracked labels).
- `reference/screenshots/01-nyt-senate-control-map.png`, `02-ap-governor-balance-and-map.png`, `10-ap-house-tile-map-live.png`: the **content conventions** (states with no race in neutral, hatching for flips, seat squares per state for the House).

Our version uses bright party colours on white land instead of the copper tones in the style reference.

## Geography

1. `us-atlas` (npm) `states-10m.json` for state shapes; project with `d3.geoAlbersUsa()` fitted to the container.
2. Ocean and Great Lakes: Natural Earth 10m bathymetry and lakes layers, clipped to the map extent, simplified with `mapshaper` into `public/geo/ocean.topo.json` (keep it under 400KB). Draw bathymetry depth bands as thin `--ocean-line` contour strokes over `--ocean`, so the water looks carved like the reference. Script this in `pipeline/geo/` so it is reproducible, and add the sources to `SOURCES.md`.
3. Render all geometry to SVG at build time (Astro), then hydrate a small TypeScript island only for the controls and tooltip.

## Two views, one map

**Senate view** (default):
- Year control: segmented buttons for every even year 2000 to 2026, default the latest. 2026 labelled "2026 (provisional)" until certified.
- States with a race that year: filled `--dem` or `--gop` (tint if provisional and uncalled); flipped seats hatched; independents in `--ind`.
- States without a race: `--no-race`. States with two races (a special) show a small "2 races" marker.
- Title block bottom-left over the ocean, in the reference style: `SENATE 2018` (big, tracked) and a subtitle line such as `35 SEATS UP · 2 FLIPPED` (small, tracked, tinted).

**House view**:
- Each state shows its delegation as a grid of small squares (one per seat) placed at the state's centroid, like `10-ap-house-tile-map-live.png`; the state shape itself in white with a hairline border. Large states (CA, TX, FL, NY) need compact grids; handle collisions so no squares overlap.
- A `SeatBar` above the map with the national total for that year and the 218 marker.

**State details** (hover, tap, click and keyboard focus): state name, winner and party, vote shares, margin, "Flipped from R" where true. On hover this shows as a squared, instant tooltip; on tap, click or Enter it pins into a details panel beside the map (below it on phones), because phones have no hover and nothing important may live only behind hover. The year's headline numbers (seats up, flips, resulting balance) are always visible without any interaction.

## Details that make it look professional

- Labels: postal codes in Barlow Semi Condensed 600, uppercase, letter-spaced; white on party fills, `--ink` on light fills. Small northeastern states get labels in the ocean with 1px leader lines.
- Alaska and Hawaii insets with a thin rule separating them.
- Map caption under it: source line and "Data as of" date.
- On phones (under 640px): the map stays full width; the year control becomes a horizontally scrollable row of squared buttons with the current year centred; the title block moves above the map.
- Year change: fills cross-fade in 200ms; instant under `prefers-reduced-motion`.
- With JavaScript off, the latest Senate year renders correctly.

## When finished

Screenshots of Senate 2018, Senate 2026, House 2010 and House 2026 at 375px and 1440px into `review/03-*.png`, and `review/03-report.md` (decisions, deviations, gaps). Then stop.
