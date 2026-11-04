# Step 05: turn the article into a dashboard (direction A, the map board)

Model: Sonnet 5.5. Keep token use low: read only what is listed, do not re-read files you have already read, do not explore the codebase broadly, and keep the report short.

## Read first (only these)

1. `CLAUDE.md` and `DESIGN_RULES.md`
2. `review/design-direction.md`: this is the design spec. Sections 7 (detailed design), 9 (keep, restyle, move) and 10 (change list) are what you build. Follow it unless a decision below overrides it.
3. The source files the change list names, as you reach each item.

## Decisions already made (these override the memo where they differ)

- **Build direction A**, the map board, exactly as section 7 describes: map in the first screen at 1440 and at 375.
- **Year control: the Congress strip** (section 7.2), with prev and next arrows and the selected year written in full beside it. Years before 2000 are visible but not selectable, with a footnote that the map starts in 2000. If the strip is not usable on a 360px phone (tap targets under 24px), use a second row of year buttons on phones only and say so in the report.
- **Independent colour:** set `--ind` to `#E8B730` with `--ink` text on it. Check it against `--dem` and `--gop` in deuteranopia and protanopia simulations and report the result. Update DESIGN_RULES.md section 4.
- **Story page:** text and the finding headlines only, each with a link that opens the dashboard at the matching year (for example `/?year=1994&chamber=house`). No static chart copies.
- **Do not copy AP's furniture:** no kicker-and-rule section headers, no corner seat counts with triangles, no tab strip under the masthead, no uppercase provisional banners. These are listed in the memo's diagnosis; check your output against that list.
- **Common names for presidents** in all copy (Bill Clinton, not William J. Clinton).

## Git

Branch `step-05-board` from `step-04-dashboard`. First commit `review/design-direction.md`, `PROGRESS.md` and the prompt renumbering (this file, and `05-polish-review-deploy.md` renamed to `06-polish-review-deploy.md`). Then build. Push and open a pull request against `step-04-dashboard`. Never push to or merge into main.

## Build

Work through the memo's change list, items 1 to 16, in order, committing after each group. Keep every existing test passing and update the end-to-end check as item 16 says.

## Check and report

- Screenshots as `review/05-*` at 375 and 1440: default, House, Georgia open, compare 2018 with 2022, 2026, the charts row. Twelve images, no more.
- Confirm: the map's top edge is inside the first 900px at 1440 and the first 667px at 375; no sideways scroll at 360; no console errors; the page works with JavaScript off at its default view.
- `review/05-report.md`, under 600 words: what changed, any departures from the memo and why, the colour check result, open questions.

Push, open the pull request, then stop.
