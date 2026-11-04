# Progress: US Congress dashboard

Last updated: 4 November 2026, 20:30 Nairobi time. Ticks render as checkboxes on GitHub and in VS Code's Markdown preview.

## Setup
- [x] Project folder, CLAUDE.md, DESIGN_RULES.md, prompts and reference screenshots
- [x] AP teardown (reference/ap-teardown.md)
- [x] No-vibe-coding guide written (Desktop/no-vibe-coding, Project doc, skill card)
- [ ] Push the no-vibe-coding repo to GitHub (if not done yet)
- [ ] Add the reviewers' comments on dashboards to the guide (section 10 slot)
- [x] Phone notifications (ntfy) working
- [x] GitHub repo created and main pushed
- [x] gh signed in; Opus works on branches and opens pull requests

## Build steps
- [x] Step 01: data pipeline (27 tests passing)
- [x] Step 02: site scaffold and design system
- [x] Step 03: the map, built and fixed (PR #2 open)
- [x] Step 04: dashboard layer and history charts (PR #3 open, stacked on #2)
- [x] Design review: page read as an AP article; Fable's memo picks direction A, the map board (review/design-direction.md)
- [x] Step 05: rebuild as a dashboard, map first (Sonnet 5.5), PR open
- [ ] Inspection of step 05 (Opus), then Claude's review
- [ ] Step 06: audit against the rules, Lighthouse, deploy to GitHub Pages

## Pull requests to merge (in this order)
- [ ] PR #1: docs, sources and licence
- [ ] PR #2: step 03 map (rebase after #1; small SOURCES.md conflict expected)
- [ ] PR #3: step 04 dashboard (retargets to main once #2 merges)

## Decisions still open
- [x] Independent colour: light amber #E8B730 (applied in step 05)
- [x] Year control: the Congress strip, years before 2000 visible but not selectable
- [x] Story page: text and links to the dashboard, no chart copies

## Data checks
- [x] 8 missing Senate races filled from official sources
- [x] Party labels for 5 candidates (Wyoming 2020 from a county source)
- [x] Sinema's switch date (3 January 2023, FEC)
- [ ] Seat classes: 21 of 28 verified; 7 rest on seat history
- [ ] Independents list (Byrd Jr., Sanders, King, Lieberman, 5 unnamed House members) and the Jeffords and Manchin switches
- [ ] Hand-check data/manual/display_names.csv (10 names, all verified = false)
- [ ] Optional: Wyoming 2020 party labels from the statewide canvass

## 2026 results
- [ ] Enter 2026 race calls once AP has called them (Claude, from AP via Chrome)
- [ ] Re-run the pipeline; site switches to 2026 (provisional)
- [ ] Replace with certified results when states certify (late November to December)

## Launch
- [ ] Site live at https://kinjuriu.github.io/us-elections-dashboard/
- [ ] Final human QA pass on phone and laptop (guide section 13)
- [ ] Share
