# Step 05: polish, review and deploy

Read `CLAUDE.md` and all of `DESIGN_RULES.md`, including any notes Stephane has added to section 11.

## 1. Audit against the rules

Go through `DESIGN_RULES.md` line by line and check the whole site. Produce `review/05-audit.md` as a table: rule, pass/fail, where, fix made. Fix every failure. Search the codebase for:
- gradients, `box-shadow` values beyond the tooltip spec, `border-radius` above 4px
- `@keyframes`, scroll listeners, IntersectionObserver-driven reveals, hover transforms
- em dashes (`—`) and "not ... but" phrasing in any copy
- any font other than the three allowed

## 2. Data check

- Re-run the full pipeline from scratch and the tests.
- Pick 10 numbers shown on the page at random and trace each to its processed row and its source; list them in the audit.
- Confirm every provisional value is labelled as provisional on screen.

## 3. Quality

- Lighthouse (mobile) on the built site: accessibility 95+, performance 90+, best practices 95+. Record scores.
- Keyboard-only walkthrough of every control; screen reader labels on the map (each state path has an accessible name and the tooltip content is reachable).
- `prefers-reduced-motion` check.
- No console errors or warnings.
- Test at 360, 768, 1280 and 1600px.

## 4. Deploy

- Add `.github/workflows/deploy.yml` that installs Node and Python, runs the pipeline tests, builds Astro and deploys `dist/` to GitHub Pages using the official Pages actions.
- Add a `README.md`: what the dashboard shows, how to run it locally, how to update 2026 results when certified, sources and licences.
- Do not push; leave the commits ready and tell Stephane the exact commands to create the repo and push.

## When finished

Write `review/05-report.md` with audit results, Lighthouse scores, remaining issues, and the push commands. Then stop.
