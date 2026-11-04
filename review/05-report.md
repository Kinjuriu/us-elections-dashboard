# Step 05 report: the map board

## What changed
- **Board first.** The page is now one framed board: control strip, summary band, one finding line, the map (856px wide at 1440) and a 320px side panel, with one legend row. The map's top edge is at 395px at 1440 (limit 900) and 584px at 375 with compare and a state open (limit 667; the default view is higher).
- **Congress strip** as the year control: 41 columns, 1946 to 2026, coloured by the chosen chamber's majority. Years before 2000 are visible, dimmed, not selectable, with a footnote. Prev and next arrows, the year in full beside it, Left/Right/Home/End on the strip. 2026 is dotted and marked "prov.".
- **Summary band** replaces the balance bars: one row per chamber, one square per Senate seat and one per five House seats, a tick at the majority, counts with D and R letters. Compare adds a second row and the written change.
- **Side panel** has two modes. National (default, also in the built HTML): seats up, flipped states as links, independents, majority, the provisional count, and the changed states when comparing. State: the existing record, with Close.
- **Charts row**: three compact panels. They pick narrow or wide drawing from their panel width (container queries), so they work at a third of the page.
- **Story page** (`/story`): lede, standfirst, five finding headlines each linking to the dashboard at the matching year. No charts.
- One "Notes and sources" disclosure holds every footnote and the sources. Masthead is one line with Story and Sources.
- Removed: SectionHeader, SeatBar, HeaderBars, ControlBar, every provisional banner, the second Senate bar, the intro section.
- Common names for presidents are applied when the data is read (`commonName` in `src/lib/data.ts`); the CSVs are untouched.

## Departures from the memo
- **Phones and tablets under 900px** use a second row of year buttons instead of the strip (columns would be 8px wide). The strip is hidden there, so the "1946 to 2026" scope shows only in the masthead.
- The two-column board starts at 1100px, not 1024, so the map stays at least 676px wide. Between 1024 and 1099 the panel sits under the map.
- Story links use years from 2000 on. The memo's `/?year=1994` example is not valid, because the store has no years before 2000.
- Chart titles are short names ("The midterm penalty"). The finding headlines moved to the story page, as the memo says. This leaves rule 3 (a graphic's headline states the finding) unmet for the charts; the finding line above the map is the only live headline.
- The majority tick sits after the Nth square from the left, so it is off by one seat from the Republican side.
- The map title block still sits above the map on phones, as in step 04.

## Colour check
`--ind` is now `#E8B730`, with `--ink` text (10.1:1). Lab distance from `--gop`: deuteranopia 34 (ochre was 4), protanopia 60 (ochre 23), normal vision 73. From `--dem`: 138 or more in all three. Dem against gop is 88 or more. Independent labels on the map switched from white to ink. DESIGN_RULES.md section 4 is updated. Amber on white as a thin line is weak, but it is only used as a fill.

## Checks
- `npm test` 11 pass; `npm run test:e2e` 7 pass. The key test now also asserts that the panel and finding line change with the year, plus a compare test and a map-in-first-screen test.
- No sideways scroll at 360 or 375. No console errors across the e2e run and my checks.
- JavaScript off: the built HTML carries the Senate 2024 board, band, finding line and national panel. I checked the HTML only, not a browser with JS disabled.
- Twelve screenshots are in `review/05-*`.

## Effects
- 200ms colour cross-fade on map fills and 200ms on strip columns (data changing; off under reduced motion). The phone panel scroll is smooth only without reduced motion, so a person following a state to its panel is not lost. Nothing else moves.

## Open questions
- Is "Provisional" as a tag next to the finding enough, or should 2026 show more on the map?
- The Georgia panel on phones scrolls the page. Keep that, or leave scroll to the reader?
- Lighthouse and the full pre-ship list are left for step 06.
