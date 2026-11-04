# Step 02: scaffold the site and the design system

Read `CLAUDE.md`, `DESIGN_RULES.md` and `reference/ap-teardown.md`, and look at every image in `reference/screenshots/` before writing code.

## Goal

An Astro static site, deployable to GitHub Pages, with the design system in place and every page section present as a labelled, empty frame. No charts or map yet.

## Build

1. Astro project in the repo root, TypeScript strict, `output: 'static'`, `base` set for GitHub Pages (repo name `us-elections-dashboard`; make it a single config value).
2. `src/styles/tokens.css` with every token from `DESIGN_RULES.md` section 4, plus type scale and spacing variables. `src/styles/base.css` for resets, typography, links, focus outlines.
3. Fonts: Source Serif 4, Barlow and Barlow Semi Condensed from Google Fonts, `font-display: swap`, only the weights listed in the rules. Font family names live in `--font-display`, `--font-text`, `--font-label` so a licensed FT font can replace them later.
4. Components (Astro, plain CSS, no runtime JS unless needed):
   - `SectionHeader`: 1px black rule, small tracked uppercase kicker, Source Serif 4 heading.
   - `ChartFrame`: slots for title, subtitle, legend, graphic, then source line and "Data as of" date. Enforces all five.
   - `SeatBar`: a horizontal bar of squares (one per seat or per N seats), party fills, tints for leading, hatching for flipped, a small triangle marking the majority threshold with its number. Pure SVG, built at render time from props. Model it on `reference/screenshots/03-ap-balance-bar-and-race-table.png`.
   - `SegmentedControl`: squared buttons (2px radius) for switching chamber or year, keyboard accessible, `aria-pressed`.
   - `Footnote` and `SourceLine`.
5. `src/pages/index.astro` with sections in this order, each using `SectionHeader` and an empty `ChartFrame` with real titles and subtitles written in journalistic plain English:
   - Header and standfirst (lead with the story: who has controlled Congress since 1946 and how the president's party fares in midterms)
   - The map
   - Who controlled Congress
   - The midterm penalty
   - Seats that flipped
   - Methodology and sources (render `data/SOURCES.md` content)
6. Load `data/processed/chamber_control.csv` at build time and render one real `SeatBar` in the header showing the House and Senate after the most recent election, labelled provisional if `is_provisional`.

## Do not

Anything in the banned list in `DESIGN_RULES.md` section 2. No hero section with buttons. No cards. No icons.

## When finished

Run `npm run build` and `npm run preview`, take full-page screenshots at 375px and 1440px into `review/02-*.png`, and write `review/02-report.md` (what was built, any deviations from the rules and why, open questions). Then stop.
