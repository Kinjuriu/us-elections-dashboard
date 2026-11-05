# Step 09: split into pages, keep the year control in reach, richer tables and cards

Written by Claude (Opus) for Sonnet, 5 November 2026. Read CLAUDE.md, DESIGN_RULES.md, review/design-decisions-08.md and review/08b-report.md first.

## Where you are

This folder (`us-elections-dashboard-08`) is a git worktree. Branch `step-08-build` holds steps 07, 08 and 08b. Make a new branch `step-09-pages` from it and work only there. Do not change `pipeline/`, `data/processed/` or `run_all.py`; this step is site code only.

## 1. Pages

Today everything is on one long page, which is too long on a phone. Split it into five pages, all sharing the masthead:

| Nav label | Path | What it holds |
|---|---|---|
| US Congress | `/` | Title block, railway, finding line, Congress map with its side panel, Senate semicircle and House blocks, "Who held the majority", "The midterm penalty" |
| Governors | `/governors/` | The governors map with the governor card (section 5), "All 50 governors", and an empty "Firsts" section with the heading only and the line "Coming in the next update" (step 10 fills it) |
| Senate | `/senate/` | "Seats that flipped" with its table, and "Senate races involving independents" |
| Story | `/story/` | As now |
| Notes and sources | `/sources/` | The notes and SOURCES.md content now inside the "Notes and sources" disclosure, as a normal page (no disclosure) |

- Masthead: site name on the left; the five links on the right in that order, the current page marked with `aria-current="page"` and a 2px underline. On phones the links wrap onto a second line; no hamburger menu.
- Every page that shows yearly data (Congress, Governors, Senate) has the railway and reads and writes the same `?year=` (and `chamber=`) query, so moving between pages keeps the year. Nav links carry the current query string.
- Update every internal link (story previews, footer, "Notes and sources" links, `#notes` anchors) to the new paths. Nothing may 404; add a test that every internal link in `dist/` resolves.
- Each page gets its own `<title>` and description.

## 2. The year control must stay in reach

Problem: on a laptop, once you scroll down to the cards or the charts, the railway is off the top of the screen, so you cannot change the year while watching the map or cards move.

Fix: when the full railway scrolls out of view, a compact year bar sticks to the top of the window:
- About 48px tall, full width, white with a 1px `--ink` bottom rule.
- Left to right: a previous-year button, the selected year in Barlow Semi Condensed 600 at 20px, a next-year button, then a miniature railway (stations only, the same split colours, no year labels, the selected station outlined) that you can click or drag.
- Only one of the two is ever visible: the full railway in the page, or the compact bar. Switch with an IntersectionObserver on the full railway; no slide or fade, it simply appears. Test the exact scroll position where it switches so the two never show together (DESIGN_RULES section 11.5).
- Same on phones, with the stepper (prev, year, next) and no mini railway.
- Keyboard: the bar's buttons are in the tab order only while it is visible.
- Keep every size of the existing railway, cards and map as they are. Stephane likes them.

## 3. Independents table, AP summary-table style

Restyle "Senate races involving independents" after AP's results summary table (reference: Stephane's screenshot "Both primaries and general / Summary table"; describe what you take from it in the report):
- One row per race. First column: a 32px square in the winning caucus colour (amber when the winner is an independent) holding the state outline from section 4 in white. Then the state name and year in bold, with "special" in grey if it was one.
- "Seat held by": senator's name in bold, then a small grey party tag (DEM, GOP, IND), then "caucused with Democrats" in grey where it applies.
- "Won by": the same layout.
- "Counted as a flip": Yes or No. Rows that count as a flip get a light tint of the winner's colour (`--dem-tint` or `--gop-tint` at about 25% opacity) across the row, as AP tints the advancing candidates.
- Each senator's name links to their Biographical Directory page (`https://bioguide.congress.gov/search/bio/<bioguide_id>`), using the ids in the congress-legislators data from step 07. If a name cannot be matched to an id, leave it unlinked and list it in the report.
- On phones the table becomes one block per race (no sideways scroll).

## 4. Small state outlines

Add a build-time component `StateShape.astro` that draws one state's outline from `node_modules/us-atlas/states-albers-10m.json`, fitted to a square box of a given size (default 24px), each state scaled to fill its own box (so states are not to scale with each other; say this once in the notes page). Fill `currentColor`, no stroke.
- Use it in front of the state name in "Seats that changed party in <year>" (Senate page), in the independents table, and in the governor card.
- It is decoration next to a text label, so `aria-hidden="true"`.

## 5. Governor card beside the governors map

When a state is selected on the governors map (click, tap, or Enter on its row in "All 50 governors"), show a card beside the map on screens from 1024px, and under the map on narrower ones:
- The state outline (section 4) at 64px in the governor's party colour.
- State name (label style), governor's name (Source Serif 4, 26px), the party mark from section 6 and the party wording from the data ("Democratic-Farmer-Labor" etc.).
- "In office since 13 January 2025" and, where the data shows it, "Previous governor: <name> (<party>)".
- A link "Source: Wikipedia list of governors of <State>" using `source_url`.
- With no state selected, the card shows the national count for the year ("27 Republicans, 23 Democrats") and the line "Select a state for its governor."
- Make each state on the governors map keyboard-reachable through the list, not 50 extra tab stops on the map.

Do not add photos of people anywhere.

## 6. Party marks instead of logos

Where Stephane asked for party logos (the House and Senate cards, the governor card, the tables), use a small square party mark: a 16px square in `--dem`, `--gop` or `--ind` with a white "D" or "R" (ink "I" on amber), Barlow Semi Condensed 700. Do not use the parties' donkey or elephant logos; they are trademarks, and DESIGN_RULES bans stock icons.

## 7. Clean up the Astro dev toolbar audit

The toolbar at the bottom of the page in `npm run dev` (Astro's dev toolbar; it never ships to the live site) lists accessibility problems in `src/components/CongressMap.astro`:
- line 224: `<aside ... tabindex="-1">`; asides should not take tabindex. Move focus to a heading or a `div` inside it instead.
- the states drawn with `role="button" tabindex="-1"` around line 174 are flagged as "interactive ARIA role used on non-interactive element". Give keyboard users a real control (the existing arrow-key handling on the map group, or the state list) and drop the role from the paths, or use elements that can carry it.
Get the audit to zero on every page and say what you changed.

## Checks before you finish

- `npm test`, `npm run test:e2e` and the internal-link test pass; update browser tests for the new pages and the sticky year bar.
- Screenshots to `review/09/` (delete the old ones in `review/08/` and `review/` that no longer match the site, and say which), at 390 and 1440 wide, of each page, plus one with the compact year bar showing.
- No horizontal scroll at 360px; keyboard-only pass; reduced motion; JavaScript off renders each page's default view.
- `review/09-report.md`: what changed, every effect with one line on why a person would hand-code it, anything unsure, anything not done.

Then commit, push `step-09-pages`, open a pull request with base `step-08-build`, and stop.
