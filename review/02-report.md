# Step 02 report: scaffold and design system

4 November 2026.

## What was built

An Astro 7 static site in the repo root. `npm run build` writes `dist/` and `npm run preview` serves it at `/us-elections-dashboard/`.

| Part | File | Notes |
|---|---|---|
| Config | `astro.config.mjs` | `output: 'static'`. The base path comes from one value, `REPO_NAME`. |
| TypeScript | `tsconfig.json` | Extends `astro/tsconfigs/strict` |
| Tokens | `src/styles/tokens.css` | Every colour from DESIGN_RULES section 4, plus the type scale (13 to 48px), 4px spacing steps, layout widths, radii and motion timing. Motion drops to 0ms under `prefers-reduced-motion`. |
| Base | `src/styles/base.css` | Reset, headings in Source Serif 4, tabular lining numbers, ink links with an underline, a 2px ink focus outline, `.label` (tracked uppercase), skip link |
| Fonts | `src/layouts/Base.astro` | Google Fonts with `display=swap`, and only the listed weights: Barlow 400/500/600, Barlow Semi Condensed 500/600/700, Source Serif 4 600/700. The families live in `--font-display`, `--font-text` and `--font-label`. |
| Data | `src/lib/data.ts` | Reads `chamber_control.csv`, `independents.csv`, `midterm_swing.csv`, `senate_results_by_state.csv` and `data/raw/manifest.json` at build time, using a small CSV parser so no dependency is added. Empty cells stay `null` and never become 0. |
| `SectionHeader` | | Tracked uppercase label on a 1px black rule, then a Source Serif 4 `h2` |
| `ChartFrame` | | Title, subtitle, optional legend, graphic, notes, then source line and "Data as of". **The build fails** if the title, subtitle, source, date or graphic is missing. A frame whose graphic comes in a later step must say so through a `pending` prop. A `provisional` prop adds the 2026 label. |
| `SeatBar` | | Pure build-time SVG with one square per seat, or per N seats (rounded by largest remainder). It supports won, leading (tint), flipped (45° hatching, 2px stripes over the tint), independents by caucus, other party, vacant and not-yet-entered seats. A triangle and number mark the majority line. A wide layout and a narrow layout are switched by CSS at 640px, so phones get bigger squares without JavaScript. The key lists only the categories present. The whole graphic has one `role="img"` label that spells out the counts. |
| `SegmentedControl` | | Native buttons with `aria-pressed`, a 2px radius on the outer corners, and Left/Right/Home/End keys. It fires a `segmentchange` event. This is the only client script on the page, and Astro inlines it. |
| `Footnote`, `SourceLine` | | `SourceLine` refuses an empty source or date |
| Page | `src/pages/index.astro` | Masthead, then header and standfirst, the map, who controlled Congress, the midterm penalty, seats that flipped, and methodology. Methodology renders `data/SOURCES.md` with its headings shifted under the section heading. |

### Headlines come from the data

Every number in the copy is computed at build time from `data/processed/`, nothing is typed in by hand:

- H1: "The president's party lost House seats in 18 of the 20 midterms since 1946" (`midterm_swing.csv`, 2026 excluded because it is null)
- Standfirst: Democrats held the House for 26 and the Senate for 26 of the 40 Congresses elected from 1946 to 2024, including a 40-year House run from 1955 to 1995. The only House gains were Clinton in 1998 and Bush in 2002.
- Midterm frame: "Barack Obama's Democrats lost 64 House seats in 2010, the biggest midterm loss since 1946"
- Flips frame: "9 Senate seats changed party in 2014, the most of any election since 2000" (`flipped_vs_holder`). I rebuilt after the concurrent step 01 commits described below, and it still says 9.

### Checks run

- `npm run build`: passes.
- Preview in headless Chrome at 360, 375, 768, 1440 and 1600px: no horizontal scroll and no console errors at any width. All 7 font faces load.
- With JavaScript disabled, the page is identical (`review/02-full-1440.png` matches the no-JS render).
- Keyboard: ArrowRight on the chamber control moves focus, flips `aria-pressed` and fires the event.
- The rendered text has no em or en dashes.

### Screenshots

- `review/02-full-375.png` (phone, full page)
- `review/02-full-1440.png` (desktop, full page)

## Effects and animation (DESIGN_RULES 11.1)

There are none. The only interactive state is the segmented button: a pale `--paper-2` fill on hover, black fill when pressed, and the focus outline. A person building this by hand would still add those, because they show what is clickable and what is selected. The tokens include a 200ms data transition for steps 03 and 04, but nothing uses it yet.

## Deviations from the rules or the prompt, and why

1. **The header bar shows 2024, not 2026.** The prompt asks for "the House and Senate after the most recent election". Every 2026 count in `chamber_control.csv` is null, and the data rules forbid filling them. So the bar shows the latest election that has counts (the 119th Congress, elected 2024), and a footnote and the standfirst say that 2026 results are not entered. Nothing needs changing later: once 2026 counts exist, the bar picks them up and shows the "Provisional" tag. `SeatBar` can also draw a fully missing chamber as grey "not yet entered" squares, if you would rather show 2026 as empty. See question 1.
2. **Order inside `SectionHeader`.** The prompt lists "rule, kicker, heading". DESIGN_RULES 5 says "a 1px black line with the section label above it", so the label sits on the rule, then the heading. The rules won.
3. **`--ink-3` (#8A8A8A) is 3.5:1 on white**, which fails contrast for small text. I use it only for square outlines and the "other party" fill. All captions, source lines and keys use `--ink-2` (7.4:1).
4. **Source Serif 4's "Display" size.** Google Fonts serves the variable optical-size axis (8 to 60), not a fixed Display cut. With `font-optical-sizing: auto`, headlines at 26 to 48px get the display shapes.
5. **Narrow House bar.** 435 seats in 10 rows leaves a short last column of 5 at the Republican end. It is a small ragged edge, similar to AP's governor bar.

## What I could not do or did not verify

- **No type check.** `astro check` needs `@astrojs/check` and `typescript`, which are not on the dependency list. Astro builds without type-checking, so the strict tsconfig is not enforced yet. See question 3.
- **SeatBar paths not yet used by real data.** Tints, hatching, other-party, vacant and N-seats-per-square all exist in the component, but the header data uses only won seats and independents, so I have not seen the others rendered. Step 03 or 04 will be the first real test.
- **Focus ring with a real Tab key.** The CSS is in place. Headless Chrome does not apply `:focus-visible` to script-driven focus, so I have not seen the ring.
- **Lighthouse not run.** That belongs in step 05.
- **The chamber toggle in the map frame does nothing yet.** It is in place for step 03.

## Things you should know

- **Another session was editing this repo while I worked.** Three step 01 commits landed during this step (`27beb3a`, `c0cf0f7`, `6989774`, touching flips, `SOURCES.md` and the step 01 report). There are also uncommitted edits in `data/manual/candidate_party_overrides.csv`, `senate_seat_changes.csv` and `senate_specials.csv`. I did not touch, revert or commit any of them. My 5 commits contain only the site files. The page reads the data at build time, so it will reflect whatever those files say when they are committed and the pipeline re-run.
- President names come straight from the data ("William J. Clinton", "Joseph R. Biden Jr.").
- Fonts are loaded from Google's servers, which is a third-party request on every visit. We could self-host the same open fonts later if you prefer.

## Open questions

1. **Header before 2026 results exist:** keep showing the 119th Congress with the note, as now, or show 2026 as an empty "not yet entered" bar?
2. **`site` URL:** GitHub Pages needs the account name (`https://<user>.github.io`) for canonical links and a sitemap. What is it? The base path is already set.
3. **Type checking:** may I add `@astrojs/check` and `typescript` as dev dependencies so `npm run build` runs the strict type check?
4. **Methodology length:** SOURCES.md in full makes up about half the page. Keep it all on the page, or show a summary with the full text one click away (for example, a `details` element or a separate page)?
