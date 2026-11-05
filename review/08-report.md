# Step 08 report: title, railway, balance cards

Built on branch `step-08-build` (from `step-07-data`). The pipeline, `data/`, `run_all.py` and `PROGRESS.md` are untouched. `review/design-decisions-08.md` was already in the worktree, so nothing was copied.

## What I built
1. **Title block**: "US Congress, 1946 to 2026" (48px on desktop, 34px on phones), "Results from 2000 to 2026", and "Earlier results may be added later." The masthead no longer repeats the title on the dashboard.
2. **Railway** (900px and up): House rail on top, Senate rail below, coloured by majority party, grey sleepers above and below the rails with the gap between them white. Stations 2000 to 2026, House colour on top and Senate colour below with no gap, 8px radius, 2.5px white outline, selected one larger with a 3px ink ring outside the white. Full year labels under every station. Faded grey track before 2000 (not selectable). 2026 is a dashed station and a dashed rail stub, labelled "prov.". Click, drag anywhere along the track (snaps to the nearest station), arrow keys, Home and End.
3. **Phone stepper** (under 900px, the breakpoint the decisions file gives): big year with previous and next arrows over a small read-only railway. Labels on the phone railway alternate between two lines so no two overlap.
4. **Cards** (below the map): Senate semicircle of 100 square seats with a line and triangle labelled "51 for a majority"; House as blocks drawn to scale with a dotted line labelled "218 for a majority". Each shows change since the previous election (or since the comparison year when one is set). Picking a party outlines it and fades the other to its tint.
5. **Finding line**: for a year with no data it reads "2026 results are not yet entered; showing the Congress elected in 2024".
6. **JavaScript off**: the default view (title, railway, both cards, finding line, map, panel) is in the built HTML. I checked it in a browser with scripts disabled (`review/08/js-off-1280.png`, `js-off-360.png`). The controls do nothing without scripts, as before.

## Choices to check
- **ARIA**: the stations are a **radio group** (`role=radiogroup` with `role=radio` buttons, one tab stop, arrows move and select). Fourteen named choices fit radios better than a slider: voice control and screen readers can reach "2018" by name, and each station can say its House and Senate result. Dragging is a pointer shortcut on top.
- **Radius exception**: stations use an 8px radius, a deliberate exception to the 2px control radius in DESIGN_RULES.md section 5, as you asked.
- **Railway is HTML and CSS, not SVG** (only the sleeper pattern is SVG). Real buttons and real text at any width were easier than scaling an SVG. It still renders without JavaScript.
- **Rail breaks**: the short white line where the majority changes is the station's own white outline, because each rail changes colour under a station. There is no separate break between stations.
- **Before 2000** the rails are grey, not party-coloured (your override). The decisions file had coloured rails there.
- **Amber** (kept as built) is built (independent majority) but the data has none: I colour by the recorded majority and count caucusing independents with their party, so 2006 is all blue as the decisions file says. Under a stricter reading (party seats alone below 50) Senate 2006, 2020 and 2022 would be amber. The legend only shows amber if it is used.
- **Senate mark at 51** (your decision): the line sits between the 51st seat from the left and the next, so it is slightly off vertical. The note says a 50-50 Senate is controlled by the vice president's party. DESIGN_RULES.md section 6 now says 51 senators.
- **Odd-year Senate specials** (2013, 2017), kept as built, have no station. They are two small buttons under the railway while the Senate is chosen, and the phone stepper steps through them.
- **Default party pick** is none; the semicircle centre shows the party with more seats (independents counted with their caucus), or "50 to 50" for a tie.
- **Cards below the map** (your decision): the map's top is in the first screen at 1280 and 1440 wide, and the browser test for that is restored (top under 900px, checked at both widths).
- On a phone the map is now directly under the controls; the cards follow it.
- Phone controls are no longer sticky: the stepper is about 110px tall with the railway, too much to pin on a 667px screen.

## Effects and animations (one line each on why a human would build it)
- Station hover: a 1px ink-2 outline. Shows it can be pressed; the same effort as any button state.
- Selected station ring and enlargement: instant, no animation. A person would mark the current year clearly on a control that doubles as a chart.
- Sleepers (SVG pattern): the railway metaphor you asked for; one repeating rect, a few minutes by hand.
- Dashed outline on 2026: states "not final" without words, as printed graphics do.
- Drag to snap: the control is a track, so dragging is what people try first.
- Party pick fade: instant swap to tint colours, no transition. Keeps the focus on one party; tints keep text readable.
- Nothing else moves. The existing 200ms map and chart cross-fades are unchanged (off under reduced motion; I confirmed `--dur-data` is 0s).

## Checks
- Screenshots in `review/08/` (retaken with the cards below the map): `board-360/768/1280/1600.png`, `board-2026-1280/360.png`, `railway-focus-1280.png`, `js-off-1280/360.png`.
- Year labels never overlap at 360, 768, 900, 1280 and 1600 (measured from their boxes); no sideways scroll.
- Keyboard only: Tab reaches the railway as one stop, arrows change year (2024 to 2020 in two presses), then the special-election buttons, chamber and compare. Focus ring is 2px ink.
- No console errors in the e2e run or my checks.
- Lighthouse (mobile preset, via `npx`, not added to the project): accessibility 97, best practices 100, from the first build; not rerun after moving the cards. The one failing audit, touch target size, is the existing flips chart cycle buttons, not this step.
- Contrast: white on `--dem` 5.85, white on `--gop` 4.99, ink on `--ind` 10.1, ink on `--dem-tint` 9.96, ink on `--gop-tint` 9.69, ink on `--no-race` 15.96, ink-2 on white 7.46, ink-2 on `--paper-2` 6.89. All 4.5 or above.
- `npm test` 15 pass; `npm run test:e2e` 10 pass, including the map-in-first-screen test at 1280 and 1440 (new: railway click, keys and drag; 2026 finding line; party pick).

## Could not do or not checked
- No real touch device. The phone stepper and the inert railway were checked in headless Chrome at 360px only.
- Drag was tested with mouse events, not touch events.
- The Lighthouse score is for the mobile preset only.
- No phone notification: CLAUDE.md sets none up.

## Removed
`Band.astro`, `src/scripts/band.ts`, `src/lib/band.ts` (replaced by the cards; the helper functions moved to `src/lib/cards.ts`).

## Next steps (from the decisions file, not built)
Searchable state results table; swing map mode (county shift 2020 to 2024); governors map mode; seat-share line replacing "Who held the majority"; firsts page; story page additions (women in Congress, 2026 House majority bar); issues heatmap (backlog).
