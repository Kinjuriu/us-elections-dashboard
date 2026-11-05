# Step 08b: changes Stephane asked for on 5 November

Made by Claude (Opus) directly, on top of step 08 and with step 07 (governors) merged in.

- **Governors map** (new): a map of each state's governor by party, below the map board. It follows the year on the railway and shows the governors in office on 1 February of the next year, after the January inaugurations (2024 shows 1 February 2025). 2026 says its results are not yet entered and shows the latest date in the data. Click a state for its governor; "All 50 governors" lists every one, which is also the keyboard path. Data: `governors_terms.csv` plus `data/manual/governor_party_changes.csv` (CC BY-SA 4.0, Wikipedia). Checked: 2010 gives 29 R, 20 D, 1 I (Chafee); 2024 gives 27 R, 23 D.
- **Charts stacked full width**, so the midterm penalty is drawn as columns along the years, like the flips chart, and each chart's table sits under it.
- **"Senate races involving independents"** is now its own table under the midterm penalty, read from the table in `data/SOURCES.md`, and removed from the notes at the foot so it is not shown twice.
- **Flips chart** now uses the full width; "No results yet" no longer crosses the zero line.
- **Wording**: "the president's party" is now "the party holding the White House" in the midterm headlines, the median sentence, the chart subtitle and the story title.
- **Story page**: each finding has a small preview of its chart or map in place of the "Open the dashboard" link; the preview is the link.

Checks: `astro build` passes, `npm test` 15 of 15, no horizontal scroll at 390px, no console errors. Browser tests (`npm run test:e2e`) not run here, because the machine I built on has no Chrome.
