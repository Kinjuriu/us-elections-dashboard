# Step 12: phone fixes and page endings

Written by Claude (Opus) for Sonnet, 5 November 2026, from Stephane's phone check of the live site (iPhone, Chrome, 390px). New branch `step-12-phone` from `main`; open a pull request into main and stop (Stephane merges).

1. **Filters must stay in reach on phones.** When the compact year bar shows, it has only prev, year and next. Add the Senate/House switch to it (and "Compare" as a small menu) so someone looking at the House blocks or the Senate semicircle can change chamber and year without scrolling back up. Keep it one row, about 48px; if it does not fit at 360px, put the chamber switch on the right and move Compare into a "More" menu. Test at 360 and 390.
2. **Page endings and footer: already done** on 6 November (the footer now lists every page with a line on what it holds, marks the current page, and has "Back to top"). Check it at 360 and 1440 and leave it as it is.
3. **Map on phones.** On the Senate 2022 view at 390px the map title block ("SENATE 2022") runs against the left edge and the map is cropped at the right. Give the title block the same 16px gutter as the page and make sure the whole lower 48 is visible.
4. **CI warning.** Bump actions/checkout, setup-node, upload-pages-artifact and deploy-pages to versions that run on Node 24, so the deprecation warning goes.
5. **Report.** Update review/11-report.md and PROGRESS.md with the live link (https://kinjuriu.github.io/us-elections-dashboard/).

Checks: npm test, npm run test:e2e, screenshots at 390 and 1440 of every page end and of the compact bar into review/12/, review/12-report.md.
