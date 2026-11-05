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


# Step 09b: comparing years, the Senate card's big number, women in Congress

## Comparing (US Congress page)

- The pair is always earlier then later ("2020 compared with 2024"), whichever year is on the railway. The finding line is replaced with a sentence built from the seat counts: "2020 compared with 2024: Republicans gained 2 Senate seats and 8 House seats" (when different parties made the biggest move in each chamber, both are named).
- **Cards.** House: two bars on the same scale, labelled 2020 and 2024, with "Democrats 222 to 215 (-7)" and "Republicans 212 to 220 (+8)" underneath. Senate: **two small semicircles side by side**. I chose that over one semicircle with outlined seats because seats in a semicircle are sorted by party, so a seat has no identity from one year to the next and an outline on "the seats that changed" would be meaningless. Side by side, each is about 170px wide at 390 and 340px at 1440, and both stay readable. No "since" wording while comparing.
- **Map.** Changed states keep the later year's colour and get a 2px ink outline (drawn as a separate layer so a neighbour never covers it); every other state is `--no-race` grey. House view: unchanged delegations' squares are grey, changed ones keep their colours, and the state is outlined. Title block "SENATE 2020 TO 2024" over "5 SEATS CHANGED CAUCUS" (or "4 DELEGATIONS CHANGED MAJORITY"); the legend is that one line only. The side panel while comparing lists the changed states.
- "Stop comparing" button beside the menu; Esc also stops it (it closes an open state record first). The compact bar shows "2020 vs 2024".
- A year with no results of its own (2026 today) cannot be compared; the menu disables it and the URL is tidied.
- The old diamond markers are gone.

## The hang after choosing a year

**Could not reproduce.** I tried headed Chrome (`headless: false`), at 1440 and 390 wide, with the compact bar shown and hidden, also with `--force-renderer-accessibility`, choosing 2024 in the menu while 2020 was on the railway. Each change took 13 to 150 ms and no long tasks were recorded. I cannot open the native macOS menu popup from the test driver, so that part is untested. As a precaution I changed `control-strip.ts` so the change handler no longer rewrites the menu's options or value when they already say the right thing (it used to rewrite all of them inside the change event, while the native list was closing). If it still hangs for you, tell me the browser, whether VoiceOver or another screen reader is on, and which two years.

## The Senate card's big number

The card now names the party that held the majority for most of the Congress (`majority_most_of_congress`) when that differs from the opening-day leader, and the line under it gives opening day: "On opening day: 51 Republicans, 46 Democrats, 2 independents, 1 vacant".
- **Years changed (2000 to 2026):** 2020 (opening day 51 R against 48 D with independents, but Democratic control) and 2000 (tied 50-50 on opening day, Democratic control). No other year, in either chamber, differs.
- **Open question: the "50".** Your example said "50 Democrats, with the vice president". The data holds 46 Democrats and 2 independents on opening day, and does not hold the two Georgia winners seated in January 2021, so 50 is not a number I can show without making it up. The card says "Democrats held the majority for most of this Congress" in place of a number. If you want the 50, I can add a sourced row to `data/manual/` and have the pipeline carry it (that touches `pipeline/`, which this step said not to).

## Women in Congress (Story page)

Pictogram after the first finding: 11 rows (every fourth Congress from the 80th, plus the 119th), two lines of 50 squares per row so the squares stay large, ink for women and rule grey for the rest, no party colours, the percentage at the end of every row. Headline from the data: "Women held 28.2% of seats in Congress in 2025, up from 1.4% in 1947". Women divided by all members who served in that Congress, both chambers together. Hover gives a plain browser tooltip with women, men and women by party; the percentage is always visible. Squares are rounded to the nearest 1% (1.4% shows 1 square), the written percentage is exact to one decimal.

## Not done / notes

- Comparison with 2026 is switched off until results are entered.
- The tooltip on the women chart is the browser's own `title`, which does not appear on touch; the row's accessible label carries the same numbers.

## Checks

`npm test` 21 of 21 (new: `tests/compare.test.ts`, a store test); `npm run test:e2e` 25 of 25 (new: comparing 2020 with 2024 in both orders, House map and Stop/Esc, the Senate card for 2020). Screenshots in `review/09/`: `compare-senate-*`, `compare-house-*`, `women-*` at 390 and 1440.
