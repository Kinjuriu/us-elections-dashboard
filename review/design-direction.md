# Design direction: from AP article to dashboard

4 November 2026. A design review only. No code was changed, nothing was built or installed.

Reviewed: CLAUDE.md, DESIGN_RULES.md, reference/ap-teardown.md, review/04-report.md, every step 04 screenshot at 375 and 1440, reference screenshots 01, 02, 10, 11 and 12, the src/ file list and the outline of src/pages/index.astro.

## 1. Summary

The site has good parts: the data, the dark map, the shared store, compare mode and the state panel all work and all follow the rules. The problem is the page they sit in. It is an article. A reader arrives at a headline and three paragraphs, scrolls past a balance-of-power block, and reaches the map on the second screen of a laptop and the fourth screen of a phone. The controls sit at the top of the page, far from anything they change.

The fix is a layout change, not a rebuild. Put one framed "map board" at the top: controls, a thin summary band, one finding line, the map, and a side panel that always shows something. Put the three history charts in a row beneath it. Move the essay to a separate story page. Restyle the seat bars and section headers so they stop quoting AP. Sections 6 and 7 give the design in detail; section 10 is the ordered change list.

## 2. What the page does now

Desktop, 1440 wide, from the top:

| Position | Element | Reads as |
|---|---|---|
| 0 to 90px | Masthead with jump links, then the control bar | AP's tab strip under its nav |
| 90 to 720px | Kicker, three-line serif headline, three standfirst paragraphs, dateline | A news story lede |
| 720 to 1,300px | "Republicans control both the House and the Senate" block: two balance bars with big coloured numbers, then four footnote paragraphs | AP's balance-of-power module |
| 1,300 to 1,850px | "THE MAP" kicker and rule, section title, finding headline, subtitle, provisional line, legend, a second Senate balance bar | Another article section |
| 1,850 to 2,450px | The map, with a help text beside it | The first thing the owner wanted first |
| 2,450px on | Three more sections, each with kicker, rule, title, finding, subtitle, provisional line, legend, chart, readout, notes | Three more article sections |

Phone, 375 wide: the map starts after about 4,000px of scrolling, with the same lede, balance block, kickers and legend ahead of it. When a state is open, the panel starts a further 900px below the map, with a Close button the reader cannot see from the map.

## 3. Diagnosis

### Where the page became an article

- **The first screen is a lede.** Kicker ("CONGRESS SINCE 1946"), a three-line Source Serif headline, three paragraphs explaining what Congress is, and a dateline. That is the opening of a feature, and it pushes everything interactive below the fold.
- **Every block is a section with its own full title stack.** Kicker, 1px black rule, section title, finding headline, subtitle, provisional line, legend. Five times down the page. The repetition, more than any single element, is what makes it read as a long scroll story.
- **Controls are separated from their effect.** The control bar sits under the masthead. The map it changes is 1,400px lower on desktop. A reader who clicks 2018 on arrival sees the lede headline not change, and concludes the control is broken.
- **The masthead is story navigation.** "Map, Control, Midterms, Flips, Sources" are jump links for a reader working down a long page. A dashboard has nowhere to jump to because everything is already in view.
- **Notes are written as body copy.** Four paragraphs of footnotes sit between the balance block and the map, and more between each chart. In a story that is fine. On a dashboard they belong in one disclosure.
- **The state panel, the best thing on the page, is hidden on arrival.** It lives beside a map that is below the fold, and on phones its Close button is a full screen below the map.

### Where it borrows AP's visual identity

- **The balance-of-power bar.** Large coloured seat counts in the top corners, "Democrats" and "Republicans" captions beneath, a triangle at the majority line, a "218 seats for a majority" note under the bar. Compare review/04-default-1440.png with reference 02 and 10. The two are the same module in a different font. The Senate bar is also drawn twice, in the header block and again above the map.
- **The kicker-and-rule section header.** A small tracked label above a hairline, then a serif title. This is AP's section furniture and it is the strongest visual echo on the page.
- **The tab strip under the masthead.** A segmented chamber control plus a row of year tabs, directly below the site name, is the layout of AP's "ALL / SENATE / HOUSE / GOVERNOR" strip.
- **The tracked uppercase status line in red-adjacent position.** "2026 IS PROVISIONAL UNTIL RESULTS ARE CERTIFIED" sits where AP puts "LIVE". It should be a tag on the 2026 data, not a banner on every section.

### What is already right and must not change

- **The map.** Dark ocean, bathymetry contours, flat fills, white borders, tracked labels, the bottom-left "SENATE 2024" title block. It matches references 11 and 12 and looks nothing like AP's white tile map. It is the identity of the site.
- **The data layer, the store and the URL.** One year drives everything, the view is shareable, invalid values are handled. This is the dashboard already; it just needs a page shaped like one.
- **Compare mode** with the written change and the diamond markers.
- **The state panel content**: result, races since 2000, delegation squares.
- **The three charts' internals**: the control strip, the midterm bars, the flips bars and table are sound. Only their framing is wrong.
- **Fonts, colours and tokens.**

## 4. What a dashboard needs here

Six properties, in order of importance. Each direction below is judged against them.

1. **The map is the first thing seen** at 1440 and at 375, without scrolling.
2. **One selection drives everything**, and the thing that changes is next to the control that changes it.
3. **The key numbers are visible without interaction**: seats by party in both chambers, the majority, seats up, flips, and whether the year is provisional.
4. **The side panel always has a job.** Before a click it summarises the nation for the selected year. After a click it shows the state. It never says "select a state" and nothing else.
5. **Nothing is repeated.** One legend, one provisional tag, one finding line, one notes disclosure.
6. **The story lives elsewhere.** The explanatory prose and the narrative headlines move to a story page, linked from the masthead and footer.

## 5. Three directions

### Direction A: the map board

One framed block holds the control strip, a summary band, a finding line, the map and a side panel. The charts sit in a row beneath. The story is a separate page.

Desktop, 1440 (content 1200 wide):

```
+-----------------------------------------------------------------------------+
| US CONGRESS, 1946 TO 2026                                   Story   Sources |  48px
+=============================================================================+
| [Senate][House]   <  1946 ....... 2000 2002 ... 2022 2024 [2026 prov.]  >   |  48px
|                   |  strip of 40 Congresses, majority colour, 2000+ live  | |
|                   Compare with [None v]                                     |
+-----------------------------------------------------------------------------+
| HOUSE  215 D |||||||||||||||||^|||||||||||||| 220 R     218 to win          |  72px
| SENATE  45 D ||||||||||||^||||||||||||||| 53 R          51 to win   2 ind   |
| Republicans took the Senate in 2024, flipping 4 seats.     [PROVISIONAL]    |  28px
+------------------------------------------------------+----------------------+
|                                                      | SENATE 2024          |
|                                                      | 119th Congress       |
|   dark ocean, Albers USA, AK and HI inset            |                      |
|   flat fills, white borders, tracked state codes     | Seats up         35  |
|                                                      | Flipped           4  |
|                                                      |   MT OH PA WV        |
|                                                      | Independents      2  |
|                                                      | Majority         51  |
|                                                      |                      |
|   SENATE 2024                                        | Select a state on    |
|   35 SEATS UP . 4 FLIPPED                            | the map for its      |
|                                                      | record since 2000.   |
+------------------------------------------------------+----------------------+
| Legend: Democrat  Republican  Independent  //Flipped  ..Not yet entered     |  28px
+-----------------------------------------------------------------------------+
                                                                                 ~900px
| Who held the majority      | The midterm penalty      | Seats that flipped   |
| 1947 to 2027               | 1946 to 2026             | 2000 to 2026         |
| [control strip chart]      | [diverging bars]         | [bars + table]       |
| Source . Data as of        | Source . Data as of      | Source . Data as of  |
+-----------------------------------------------------------------------------+
| > Notes and sources                                                          |
| Story: The president's party lost House seats in 18 of 20 midterms  ->      |
```

Map area: 856 wide by about 560 tall. Panel: 320 wide, same height, scrolls inside itself when a state is open. Everything above the legend fits in a 900px viewport.

Phone, 375:

```
| US CONGRESS 1946-2026          Story |  44px
|======================================|
| [Senate][House]  < 2024 >  [Cmp v]   |  48px, sticky while the board is in view
| 1946 ...........|||||||||||| 2026    |  the Congress strip, tap or drag
|--------------------------------------|
| HOUSE 215 |||||||^||||||| 220        |  56px
| SENATE 45 |||||^||||||| 53  PROV     |
| Republicans took the Senate in 2024, |
| flipping 4 seats.                    |
|--------------------------------------|
|                                      |
|   map, full width, ~230px tall       |
|   SENATE 2024 . 35 UP . 4 FLIPPED    |
|                                      |
|--------------------------------------|
| NATIONAL / GEORGIA         [Close]   |  panel sits directly under the map
| ...                                  |
|--------------------------------------|
| Legend (one line, wraps)             |
| Who held the majority                |
| The midterm penalty                  |
| Seats that flipped                   |
| > Notes and sources                  |
| Story ->                             |
```

Map, band and finding fit in the first 667px. When a state is selected on a phone, the panel replaces the national summary under the map and the page scrolls so the map's bottom edge and the panel's top are both in view; Close restores the national summary and returns focus to the state.

How it works:

- The year control is the control chart's own strip, 1946 to 2026, one column per Congress coloured by majority of the selected chamber. Columns before 2000 show the colour but are not selectable, which states the "1946 to 2026" scope on the first screen without a word of prose. Arrows step one election; keyboard arrows do the same. 2026 is the last column, drawn with a dotted outline and labelled "prov."
- The summary band is one row per chamber: label, Democratic count, a single row of squares, Republican count, the majority number. One square per Senate seat and one per five House seats, stated in the notes. No corner numbers, no captions, no triangle.
- The finding line is the existing map headline, one sentence, from mapText.
- The panel has two modes. National: the numbers above, with flipped states as links that open the state. State: the existing stateRecordHtml content.
- Compare: the band gains a second row per chamber for the comparison year with the written change ("2018 to 2022: Democrats -22"). The map shows the existing diamond markers. The panel's national mode shows the changed states.

### Direction B: console with a left rail

Filters and summary in a 240px rail, map centre, panel right.

```
| US CONGRESS, 1946 TO 2026                                   Story   Sources |
+----------+-----------------------------------------------+------------------+
| CHAMBER  |                                               | STATE            |
| [Senate] |                                               |                  |
| [House]  |   map, 620 wide                               | empty until a    |
|          |                                               | state is chosen  |
| YEAR     |                                               |                  |
| 2000     |                                               |                  |
| 2002     |                                               |                  |
| ...      |                                               |                  |
| 2024     |                                               |                  |
| 2026 pr. |   SENATE 2024                                 |                  |
|          |                                               |                  |
| COMPARE  |                                               |                  |
| [None v] |                                               |                  |
|          |                                               |                  |
| HOUSE    |                                               |                  |
| 215|220  |                                               |                  |
| SENATE   |                                               |                  |
| 45|53    |                                               |                  |
+----------+-----------------------------------------------+------------------+
| charts, notes                                                                |
```

Phone: the rail collapses to the same sticky strip as A, so the two are identical under 768px. On desktop the rail costs 236px of map width, the vertical year list is slow to scan, and the summary ends up in the bottom-left corner where nobody looks first. This is the layout of a SaaS admin screen more than a graphics desk.

### Direction C: split screen with a tabbed panel

Map left 60%, a stacked panel right 40%: controls, summary, state detail, then the three charts as tabs.

```
| US CONGRESS, 1946 TO 2026                                   Story   Sources |
+-----------------------------------------+-----------------------------------+
|                                         | [Senate][House]  <2024>  [Cmp v]  |
|                                         | HOUSE 215 ||||^|||| 220           |
|   map, 700 wide                         | SENATE 45 |||^||||| 53   PROV     |
|                                         | Finding line                      |
|                                         |-----------------------------------|
|                                         | NATIONAL / STATE                  |
|                                         | ...                               |
|   SENATE 2024                           |-----------------------------------|
|                                         | [Control][Midterms][Flips]        |
|                                         | one chart, 440 wide               |
+-----------------------------------------+-----------------------------------+
```

Everything fits one viewport, which is attractive. But the tabs hide two of the three charts, which breaks rule 8 ("the key numbers for each chart are visible without interaction"), and a 440px column is too narrow for the control chart's 41 columns. Phone order is the same as A.

## 6. Recommendation: build direction A

- It is the only one that puts the map in the first screen at full content width on both desktop and phone.
- The controls sit inside the frame of the thing they change, so a click is seen where it lands.
- The side panel has content before any click, and swaps rather than appears.
- All three charts stay visible, so no rule is broken.
- The Congress strip as the year control turns the site's scope into its main control, which no AP page does.
- It stays furthest from AP: no balance-bar hero, no kicker rules, no tab strip, and the dark map is the first thing seen.

B is the fallback if the strip year control proves too fiddly on phones, since its rail collapses to the same thing anyway. C is not recommended.

## 7. Detailed design for direction A

### 7.1 Masthead

One 48px line. Site name left in Barlow Semi Condensed 600, tracked uppercase, 13px. Right: "Story" and "Sources" as underlined ink links. No jump links, no sticky behaviour on desktop. 1px rule beneath.

### 7.2 Control strip

Top edge of the board, 48px tall on desktop, paper-2 background, 1px rule below.

- Chamber: the existing SegmentedControl, 2px radius, ink fill on the selected button.
- Year: the Congress strip. 41 columns, 1946 to 2026, each 16px wide and 20px tall on desktop, coloured by the selected chamber's majority (dem, gop) with a dotted outline for 2026. Years 1946 to 1998 are drawn at 50% opacity and are not focusable, with a title "No map before 2000". The selected column has a 2px ink outline. Tick labels every decade at 12px under the strip, plus the selected year in bold. Prev and next arrows either side (plain text glyphs, not icons). Keyboard: Left and Right step, Home and End jump. 2013 and 2017 appear as half-width columns in Senate view only, as now.
- Compare: the existing menu, moved to the right end of the strip.
- Phone: chamber buttons, arrows with the selected year between, compare menu, in one 48px row, sticky while the board is in view. The strip sits in a second 24px row under it and is draggable.

### 7.3 Summary band

72px on desktop, two rows:

```
HOUSE    215 D  ■■■■■■■■■■■■■■■■|■■■■■■■■■■■■■■■■  220 R    218 to win
SENATE    45 D  ■■■■■■■■■■|■■■■■■■■■■■■■■■■■■■■■   53 R     51 to win   2 I with D
```

- Labels: Barlow Semi Condensed 600, 13px, tracked uppercase.
- Counts: Barlow Semi Condensed 700, 20px, tabular, coloured dem or gop (party colour on party data is allowed).
- Squares: one per Senate seat, one per five House seats, 6px with 1px gaps, independents in ind between the parties, vacancies as outlined squares.
- Majority: a 1px ink tick through the row with the number in 12px above it. No triangle.
- Odd years and 2026 fall back exactly as HeaderBars does now; the note moves into the panel's national mode.
- Compare: each chamber gets a second row for the comparison year with the written change at the right, as now.

### 7.4 Finding line

One sentence, Source Serif 4 at 20px, from the existing map headline text. This satisfies rule 11.8 (the first screen states the finding) without a lede. Beside it, when the year is 2026, a PROVISIONAL tag: 12px tracked uppercase, 1px ink border, 2px radius, no fill.

### 7.5 Map

Unchanged drawing code. Width 856px at 1200 content, height about 560. The bottom-left title block stays. The legend moves to a single 28px line under the map, shared by the whole board.

### 7.6 Side panel

320px wide, same height as the map, paper-2 background, 1px rule left, internal scroll.

National mode (default):

```
SENATE 2024
119th Congress, 2025 to 2027

Seats up                 35
Flipped                   4
  Montana, Ohio, Pennsylvania, West Virginia   (links)
Independents              2  caucus with Democrats
Majority                 51

Select a state on the map, or Tab to the map and use the arrows.
```

For House view: seats up 435, delegations that changed majority, independents, majority 218. In compare mode: the changed states as links. In 2026: "Provisional. Results are entered as states certify; 0 of 35 races entered" with the count read from the manual CSV.

State mode: the existing stateRecordHtml content with the Close button, unchanged.

### 7.7 Charts row

Three panels of equal width under the board, 64px gap above. Each uses ChartFrame at a reduced scale: title in Source Serif 4 at 20px, one-line subtitle at 15px, chart, source line at 13px with the date. The multi-line finding headlines ("The president's party lost House seats in 18 of the 20 midterms") move to the story page and the readout line under each chart stays. On phones the panels stack.

The control chart's year-setting click now duplicates the strip in the control bar. Keep it; two ways to set a year is fine, and the chart shows the detail the strip only hints at.

### 7.8 Notes and sources

One disclosure at the bottom, "Notes and sources", holding every Footnote the page has today plus the Sources section. Each chart keeps its own source line, as rule 6 requires.

### 7.9 Story page

src/pages/story.astro, prose column at 680px. Contents: the current lede headline and standfirst, the three chart finding headlines each with a static copy of its chart (build-time SVG, no store), the midterm narrative, and a link back to the dashboard with the matching year in the URL. This is where a Source Serif 4 headline at 48px belongs.

### 7.10 2026 provisional, in one place at a time

| Where | Treatment |
|---|---|
| Year strip | Last column, dotted outline, "prov." under it |
| Summary band | Dotted squares for seats not yet entered; PROVISIONAL tag at the end of the finding line |
| Map | Dotted fill for "not yet entered", as now; title block reads "SENATE 2026 . PROVISIONAL" |
| Panel | "Provisional" line with the entered count |
| Charts | Dotted bar and "Provisional" tick label, as now |
| Story | One sentence in the standfirst |

The uppercase banner "2026 IS PROVISIONAL UNTIL RESULTS ARE CERTIFIED" is removed from every section.

### 7.11 Motion, keyboard and no JavaScript

Unchanged from step 04: 200ms colour cross-fade on the map only, instant everywhere else, off under reduced motion. Tab order: chamber, year strip, compare, map, panel, charts. The built HTML carries the default board (Senate 2024, national panel) so the first screen is complete without JavaScript.

## 8. Further ideas, optional

These are worth considering after the layout change, not before it.

- **Independent colour.** The step 04 report found ochre fails the deuteranopia check against red. A lighter amber (around #C9A227) or a hatched grey would pass and still avoid purple. Decide before step 05's audit.
- **Both chambers at once.** A third chamber option, "Both", that shows the Senate map with House delegation chips, so a reader sees a whole election in one view. Only if the chips stay legible.
- **Year scrub with a play button.** Rule 7 allows one that steps one year per second and stops. On the Congress strip it would make 1994 and 2006 visible as waves of colour. A human would build it; it answers "how did the map change over time".
- **Small-multiple maps for compare.** Two half-width maps side by side instead of markers. Clearer, but it doubles the drawing and halves the map size. Not for this round.
- **Copy link.** A plain text button in the control strip that copies the URL. Newsroom users ask for it.

## 9. Keep, restyle, move

| Piece | Verdict | Note |
|---|---|---|
| pipeline/, data/processed | Keep | |
| CongressMap, congress-map.ts, geo, mask, mapData | Keep | Drawing unchanged; width grows to 856 |
| store.ts, dashboard.ts, URL mirroring | Keep | |
| Compare mode, diamond markers, written change | Keep | Moves into the band and panel |
| stateRecordHtml, state panel content | Keep | Becomes the panel's state mode |
| ControlChart, MidtermChart, FlipsChart internals | Keep | |
| SegmentedControl, tokens, fonts | Keep | |
| HeaderBars, SeatBar | Restyle | Single row, inline counts, tick majority, no corner numbers |
| ControlBar | Restyle | Into the board; year strip replaces year tabs |
| ChartFrame | Restyle | Smaller title stack; no finding headline, no provisional banner |
| SectionHeader | Retire | Kicker-and-rule pattern goes |
| Footnote | Move | All into one disclosure |
| Base.astro masthead | Restyle | One line, two links |
| Lede, standfirst, chart finding headlines, midterm narrative | Move | To story.astro |

## 10. Change list, in build order

1. Create `src/pages/story.astro` with the lede, standfirst, three finding headlines with static charts, and the midterm narrative. Link it from masthead and footer.
2. Reorder `index.astro`: masthead, board, charts row, notes, footer. Delete the intro section, every SectionHeader and every provisional banner.
3. Build the board as a new component (for example `Board.astro`) with four grid areas: strip, band, map, panel, and a legend row.
4. Move ControlBar into the strip. Replace the year tabs with the Congress strip control, keep the chamber segment and compare menu, add prev and next arrows. Store wiring unchanged.
5. Rebuild HeaderBars and SeatBar as the summary band described in 7.3. Delete the second Senate bar above the map.
6. Add the finding line under the band, driven by the store, reusing the map headline text.
7. Add the panel with national and state modes. National mode reads seats up, flipped states, independents, majority and provisional count from the data already in dashboardData and mapData.
8. Widen the map to the board's map area and move the legend to the shared legend row.
9. Lay the three charts out in a row with compact ChartFrame titles; stack under 1024px.
10. Collapse every Footnote into one "Notes and sources" disclosure at the bottom; keep each chart's source line.
11. Rebuild the masthead as one line with Story and Sources links; remove jump links.
12. Apply the 2026 treatment from 7.10 and remove the banner everywhere.
13. Phone: sticky control row while the board is in view, panel directly under the map, scroll to the panel on state select, no horizontal scroll at 360px.
14. Compare mode: second rows in the band, changed states in the panel, markers on the map, compare menu in the strip.
15. Decide the independent colour and update tokens.css if changed.
16. Update the e2e checks: the key test (click a year, map title, band and flips table change together) should also assert the panel changes.
17. Re-screenshot as `review/05-*` at 375 and 1440: default, House, Georgia open, compare, 2026, and each chart.
18. Run the step 05 audit and pre-ship checklist against the new layout.

## 11. Rule conflicts and open questions

- **Rule 6, every chart carries title, subtitle, source, date.** Still applied; the change is scale and the removal of a second, narrative headline per chart.
- **Rule 7, year control is segmented buttons or a stepped slider.** The Congress strip is a stepped slider with meaning. If you prefer buttons, the strip can sit under them as a read-only timeline.
- **Rule 11.8, the first screen states the finding.** Met by the one-line finding under the band.
- **Rule 6, seats drawn as squares.** The House band uses one square per five seats, stated in the notes, because 435 squares do not fit one row.
- **Open:** should the story page carry the three charts as static copies, or only link back to the dashboard at the right year?
- **Open:** the Congress strip years before 2000 are visible but not selectable. Is that acceptable, or should the whole site's floor move to 1946 for the charts only, as it already does?
