# Step 11 report: go live

## Tests (on `step-09-pages`, after merging `main` into it)

- `pipeline/run_all.py`: passes, 49 pytest tests. Processed files reproduce exactly. Only download timestamps in `data/raw/manifest.json` changed, and I reverted them. It needs `requests`, which the system Python did not have, so I ran it in a throwaway venv from `pipeline/requirements.txt`.
- `npm test`: 22 of 22 pass.
- `npm run test:e2e`: 26 of 26 pass. The new test checks that no page links to `/firsts/` while `data/manual/firsts.csv` is empty.

## Audit against DESIGN_RULES.md section 2

Nothing to fix.
- Gradients: only hard-stop patterns (hatching, dot fill, split party swatches, select arrow). No decorative gradients.
- `border-radius`: tokens are 2px and 4px. The 8px values are the documented railway exception.
- `@keyframes`: none. Transitions are fill and opacity changes on data, with reduced-motion handling on the governors map.
- Em and en dashes: none in `src`, `data/processed`, `public` or the built `dist`.

## Lighthouse (mobile, local preview of the built site)

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home | 88 | 95 | 100 | 100 |
| Story | 94 | 95 | 100 | 100 |
| Senate | 96 | 94 | 100 | 100 |
| Governors | 93 | 95 | 100 | 100 |
| Firsts | 96 | 96 | 100 | 100 |
| Sources | 98 | 95 | 100 | 100 |

## Changes in this step

- `.github/workflows/deploy.yml`: on push to `main`, Node 22, `npm ci`, `npm test`, `astro build`, then upload and deploy the Pages artifact. No Python in CI.
- Firsts link hidden: the masthead, footer, home and governors links to `/firsts/` appear only when `data/manual/firsts.csv` has rows. The page is still built.
- README: pages, local run, how to update 2026 results, sources and licences (CC0 data, CC BY-SA 4.0 governors files).
- `.gitignore`: ignores Finder and iCloud duplicate copies (`* 2`, `* 2.*`).

## How the merge went

- PR #1 (docs, licence) was merged by Stephane on 5 November.
- A rebase of `step-09-pages` onto `main` needed a force-push, which was blocked. Instead `main` was merged into `step-09-pages` and pushed normally.
- One PR from `step-09-pages` into `main` replaces #5, #6 and #7.

## Left

- Live link and the page-by-page check of the deployed site are reported in the chat once the workflow has run.
- The Firsts page has no rows yet (see `review/10-report.md`).
- Final human QA pass on phone and laptop.
- Housekeeping: Finder or iCloud keeps creating " 2" duplicate files in this folder. The stray ref `main 2` was deleted by Stephane. Consider moving the project out of a synced folder.
