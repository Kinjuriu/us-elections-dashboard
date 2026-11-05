# Design decisions for step 08 (agreed with Stephane, 4 November 2026)

These override review/design-direction.md where they differ. The step 08 build prompt will be written from this file once step 07 (PR #5) is merged.

## Title
- "US Congress, 1946 to 2026", larger than now.
- Second line: "Results from 2000 to 2026".
- A tiny note: earlier results may be added later.
- The finding line says when data is missing, for example "2026 results are not yet entered; showing the Congress elected in 2024".

## Year selector: the railway (desktop), stepper (phones)
- One horizontal track, 1946 to 2026, with two rails: House on top, Senate below.
- A clear white gap between the two rails; nothing fills it.
- The rails ("the metal") carry party colours: each two-year segment is coloured by the majority party of that chamber (Democrat blue, Republican red). Independent amber appears only where independents decided control, and the legend says so.
- Grey sleepers cross under both rails at regular spacing, visible above and below the rails, like a real track; the gap between the rails stays white.
- Before 2000 the track is faded and has no stations (not selectable).
- Stations at every election from 2000 to 2026: large rounded blocks spanning both rails, easy to see and press, filled with party colour: the top half in the House majority colour, the bottom half in the Senate majority colour (amber where an independent decides), so 2004 is all red and 2006 all blue. Never plain white. The white is only the gap between the two rails.
- The selected station is bigger, with a 3px ink outline and the year in bold beneath; other years show as '02, '04 and so on. 2026 stations are outlined and dashed until results are entered.
- 2026 rails are outlined (dashed), labelled provisional.
- The selected station can be dragged along the track and snaps to the nearest election; clicking a station and the keyboard arrows also work.
- Phones (under 900px): the big-year stepper (large year, previous and next arrows) with a small read-only railway beneath.

## Balance cards
- Senate: semicircle of 100 seats (design A), the big number in the middle changes with the selected party.
- House: labelled blocks (design B) with each party's seats and change since the previous election written on the block, dotted line at 218.
- Selection style everywhere: the chosen item gets a dark outline and the others fade.

## Still to come (from Stephane's references)
- Searchable "result in each state" table with share bars and change arrows, replacing the flips table.
- Swing map mode (county presidential shift 2020 to 2024), once the county file is in.
- Governors map mode: party holding each governorship by year, plus 2026 races.
- Replace "Who held the majority" with a seat-share line since 1947 with the 50% line and the selected year outlined.
- Firsts page: typographic cards (no photos) with status and source.
- Story page: women in Congress over time, the 2026 House majority bar.
- Backlog: issues heatmap.
