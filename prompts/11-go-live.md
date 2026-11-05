# Step 11: put the site live on GitHub Pages

Written by Claude (Opus) for Sonnet, 5 November 2026. Stephane wants a public link to share. This replaces the old `prompts/06-polish-review-deploy.md` for deployment.

## 1. Check before merging

- Run `run_all.py`, `npm test` and `npm run test:e2e` on `step-09-pages`. All must pass.
- Quick audit against DESIGN_RULES.md section 2 (banned list): search for gradients, `border-radius` above 4px other than the documented railway exception, `@keyframes` used for reveals, em dashes in copy. Fix anything you find and list it.
- Lighthouse (mobile) on the built site for every page; record the scores.

## 2. Merge into main

The open pull requests are stacked: #5 (step 07, base main), #6 (step 08, base step-07-data) and #7 (step 09, base step-08-build). `step-09-pages` contains all of them.
- Check with `gh pr list` and `git merge-base --is-ancestor` that `main` is an ancestor of `step-09-pages` and that #1 (docs, sources and licence) is merged or included; if #1 is still open and not included, merge it into main first and rebase.
- Open one pull request from `step-09-pages` into `main` titled "Steps 07 to 09: data, board, pages", whose description links #5, #6 and #7, and merge it with a merge commit.
- Then close #5, #6 and #7 with the comment "Included in <link to the merged PR>".

## 3. Deploy

- Add `.github/workflows/deploy.yml`: on push to main, set up Node (the version in `package.json` engines, or 22), `npm ci`, `npm test`, `npx astro build`, then deploy `dist/` with the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions. Do not run the Python pipeline in CI; the processed data is committed.
- Turn on Pages with the workflow as the source: `gh api -X POST repos/Kinjuriu/us-elections-dashboard/pages -f build_type=workflow` (or PUT if it already exists).
- Push, wait for the workflow, and open https://kinjuriu.github.io/us-elections-dashboard/ to confirm every page loads with no console errors and no 404s.
- Add a `README.md` if missing: what the site shows, each page, how to run it locally, how to update 2026 results, sources and licences (CC0 data, plus the CC BY-SA 4.0 governors files).

## 4. Report

`review/11-report.md` with the test results, Lighthouse scores, the live link, and anything left. Update PROGRESS.md. Then stop and send Stephane the live link.
