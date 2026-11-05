# Step 09: pages, year bar, richer tables and cards

Branch `step-09-pages`, built on `step-08-build`. Site code only: `pipeline/`, `data/processed/` and `run_all.py` are untouched.

## What changed

- **Five pages**: US Congress `/`, Governors `/governors/`, Senate `/senate/`, Story `/story/`, Notes and sources `/sources/`. Each has its own title and description. The masthead has the site name on the left and the five links on the right, the current one with `aria-current="page"` and a 2px underline; on phones the links wrap to a second line.
- **Year carried between pages**: Congress, Governors and Senate each have the railway and read and write `?year=` and `chamber=`. Masthead and footer links carry the current query (`src/scripts/nav-query.ts`).
- **Compact year bar** (`YearBar.astro`, `year-bar.ts`): 48px, white, 1px ink rule. Previous, year (Barlow Semi Condensed 600, 20px), next, and from 900px a mini railway you can click or drag. Phones get the stepper only. An IntersectionObserver on the full railway switches it; the bar shows only while no part of the railway is on screen and it has gone off the top. Hidden, its buttons are out of the tab order. The test checks the exact switch point (2px of railway visible: no bar; scrolled past: bar) and a run of scroll positions to show they never appear together.
- **Independents table**, AP summary style: 32px square in the winning party colour (amber for an independent winner) with the state outline in white; bold state and year, grey "special"; names in bold with grey DEM/GOP/IND tags and "caucused with ..."; flip rows tinted at 25% of `--dem-tint` or `--gop-tint`. Phones: one block per race. From AP's screenshot I took the one-row-per-race layout, the coloured square at the start, bold names with small grey tags and the tint on rows that advance. I did not copy its vote bars, because this table has no vote counts.
- **Bioguide links**: all 16 names in the table link to `bioguide.congress.gov/search/bio/<id>`, matched from `members_by_congress.csv` by state and surname. **Names not matched: none.**
- **State outlines** (`StateShape.astro`, `stateShapes.ts`): drawn from `us-atlas/states-albers-10m.json`, each state fitted to its own square, `currentColor`, `aria-hidden`. Used in the flips table, the independents table and the governor card. `StateSprite.astro` holds the same shapes as symbols for the table and card that script redraws. The notes page says once that states are not to scale.
- **Governor card**: beside the map from 1024px, under it below. Shows the 64px outline in party colour, state label, name (Source Serif 4, 26px), party mark and the page's party wording, "In office since ...", "Previous governor: ... (party)", and the Wikipedia source link. With nothing selected it shows the national count and "Select a state for its governor." Selection works by click on the map or a button in "All 50 governors" (now a plain section, not a disclosure). The card keeps the state when the year changes. Map paths take no focus.
- **Party marks**: 16px squares with a white D or R (ink I on amber), used on the Senate chips, governor card and the governors table. The House blocks are already party-coloured, so a same-colour square there would be invisible; I did not add one. Independents table uses the grey tags the prompt describes.
- **Flips table**: state names are now links to that state's record on the Congress map (the map is not on this page).
- **Governors page** ends with an empty "Firsts" heading and "Coming in the next update".

## Dev toolbar audit

The toolbar did not appear in headless Chrome, so I bundled Astro's own audit rules and ran them in the page on all five pages (plus a state-open view and a governors year) at 1440 and 390 wide: **0 problems**. The same harness flags both old problems when I inject them, so it is a real check.
- `CongressMap.astro`: removed `tabindex="-1"` from the `<aside>`; the focus target is now the `div` inside it (`data-panel-focus`).
- Removed `role="button"`, `tabindex` and `aria-label` from the state `<use>` elements. Keyboard users get one real `<button>` before the map (visually hidden; focus shows a 2px outline on the map and the ring on the state). Arrows, Home, End, Enter and Escape work as before; a live region reads out the state the arrows are on.

## Effects, and why a person would hand-code them

- Compact year bar appearing: no animation; a designer would build it because a reader changing the year must not scroll back up to do it.
- Mini railway drag: same reason as the full railway; one control, two sizes.
- Row tint on flip rows: AP does this; it answers "which of these are flips" without reading a column.
- Colour cross-fades on the governors map: existing 200ms data transition, off under reduced motion.
- Smooth scroll to the governor card from the list: only when the card is off screen; instant under reduced motion.

## Unsure

- White state outlines on amber squares have weak contrast (as asked). They are decoration beside a text label, but you may want ink on amber.
- The tint on a "Maine 2012" row uses the winner's caucus (Democratic), since King is an independent who caucuses with the Democrats.
- Specials: on the Senate page, if the URL says `chamber=house`, the odd-year special buttons are hidden, as on the Congress page.
- I ran `astro dev stop` after my audit; if you had your own dev server running from this folder, restart it.

## Not done

- Lighthouse run not repeated. Keyboard pass was done through the browser tests and a code read, not by hand on a real screen reader.

## Checks

`npm test` 15 of 15; `npm run test:e2e` 22 of 22 (new: pages, year carried, sticky bar switch, bar controls, phone stepper, governor card and layout, Senate page links, independents table, no sideways scroll at 360px on all pages, JavaScript off, and that every internal link in `dist/` resolves). Screenshots in `review/09/` at 390 and 1440 for every page plus `year-bar-*.png`. Deleted as out of date: all `review/02-*` to `review/05-*` PNGs and everything in `review/08/`.
