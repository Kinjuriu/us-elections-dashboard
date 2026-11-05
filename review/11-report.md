# Step 11 report: go live (incomplete, waiting on merge permission)

## Status

Not live yet. The merge into `main` was denied by the permission classifier, so nothing was merged, deployed or enabled. Nothing was pushed.

## Tests (on `step-09-pages`)

- `pipeline/run_all.py`: passes, 49 pytest tests. Processed files reproduce exactly. Only the download timestamps in `data/raw/manifest.json` changed, and I reverted them. It needs `requests`, which was not installed in the system Python, so I ran it in a throwaway venv from `pipeline/requirements.txt`.
- `npm test`: 22 of 22 pass.
- `npm run test:e2e`: 25 of 25 pass.

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

## Done

- `.github/workflows/deploy.yml` added and committed locally (Node 22, `npm ci`, `npm test`, `astro build`, upload and deploy Pages artifact; no Python in CI).

## Left

1. Merge PR #1 (docs, sources, licence). It is open, mergeable, and not included in `step-09-pages`. It adds `LICENSE`, `README.md`, `data/SOURCES.md` and `review/01-report.md`, so I did not write a new README.
2. Rebase `step-09-pages` onto `main`, open "Steps 07 to 09: data, board, pages", merge with a merge commit, close #5, #6 and #7.
3. Enable Pages with the workflow source, push, wait for the workflow, check every page.
4. Check the README covers: pages, local run, updating 2026 results, sources and licences (CC0 data, CC BY-SA 4.0 governors files).
5. Housekeeping: the shared repo has a stray local branch ref named `main 2` (broken name). Git warns about it and `git fetch` errors with "did not send all necessary objects". Worth deleting by hand.

Live link: https://kinjuriu.github.io/us-elections-dashboard/ (not live yet)
