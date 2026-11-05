# Step 09b: make "Compare with" show the comparison, fix the Senate card's headline number, add the women chart to the story

Written by Claude (Opus) for Sonnet, 5 November 2026. Work on branch `step-09-pages` and push to the same pull request (#7). Site code only; do not touch `pipeline/` or `data/processed/`.

## 1. "Compare with" (US Congress page)

Stephane picked 2020 on the railway and 2024 in "Compare with". What she saw:
- The cards said "+7 since 2024" and "-8 since 2024": "since" a later year reads backwards.
- The map only added small diamonds on the states that changed, and the side panel listed them. She could not see the two years side by side, so it was not clear what was being compared.
- On her Mac the page seemed to hang after choosing a year in the menu. Headless Chrome did not reproduce it. Test in a real, headed Chrome window (`headless: false`) with the compact year bar showing and hidden, find the cause and fix it; if you cannot reproduce it, say so in the report.

What comparing should do: show the two years and the difference between them, and nothing else.
- Always order the pair as earlier year, then later year, whichever one is on the railway: "2020 compared with 2024".
- A comparison line replaces the finding line while comparing, e.g. "2020 compared with 2024: Republicans gained 4 Senate seats; Democrats lost 7 House seats". Build it from the data.
- Cards: each card shows both years. House: two bars, one per year, on the same scale, labelled "2020" and "2024", with the change written as "Democrats 222 to 215 (-7)". Senate: two smaller semicircles side by side, or one semicircle with the seats that changed outlined in ink; pick whichever reads better at 390 and 1440 wide and explain. Drop "since" wording while comparing.
- Map: states whose result changed between the two years are drawn in the later year's colour with a 2px ink outline; every other state is drawn in `--no-race` grey. The map title block reads "SENATE 2020 TO 2024" and "4 SEATS CHANGED CAUCUS". The legend says exactly that.
- A clear "Stop comparing" button next to the menu, and Esc also stops it.
- The compact year bar shows "2020 vs 2024" while comparing.
- Update the browser tests: comparing 2020 with 2024 gives the right numbers in the line, the cards and the map, in both orders (2020 on the railway with 2024 in the menu, and the reverse).

## 2. The Senate card's big number

For 2020 the semicircle's big number says "51 Republicans", while the finding line says "Democrats took the Senate in 2020". The card counts opening day (before the Georgia runoff winners were seated); control for most of that Congress was Democratic, through the vice president's tie-breaking vote.
- The big number and its label show the party that controlled the chamber for most of the Congress (the `majority_most_of_congress` value the history chart already uses), e.g. "50 Democrats, with the vice president" for 2020.
- Keep the opening-day count in the line under the card: "On opening day: 51 Republicans, 46 Democrats, 2 independents, 1 vacant".
- Check every year from 2000 for the same mismatch and list the years you changed in the report.

## 3. Women in Congress, in the story

Add a chart to the Story page modelled on the pictogram Stephane shared ("For the first time ever, women in EU Parliament make more than 40%"), in this site's style:
- Data: `data/processed/women_by_congress.csv`. Use both chambers together: women divided by all members who served in that Congress, so it matches the counting rule in the notes. Rows for every fourth Congress from 1947, plus the latest one.
- Each row is 100 small squares (one square = 1% of members); squares for women in `--ink`, the rest in `--rule`. No person icons and no party colours (this is not party data). The percentage is written at the end of each row, so nothing depends on hover.
- Headline built from the data, e.g. "Women held X% of seats in Congress in 2025, up from Y% in 1947". Subtitle: "Share of members of the House and Senate who were women, by Congress, 1947 to 2025. One square is 1% of members." Source and date lines as for every chart.
- A tooltip on hover or tap may repeat the row's numbers (women, men, by party), but the row's percentage is always visible.
- Place it after the first finding on the Story page.

## Checks

`npm test` and `npm run test:e2e` pass; screenshots of the comparison (2020 with 2024) and the women chart at 390 and 1440 into `review/09/`; update `review/09-report.md`. Commit, push to `step-09-pages`, and stop.
