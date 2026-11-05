# Design rules: how we build websites

These rules apply to every page, chart and map in this repo. Read them before writing any UI code. When a rule and a "nice idea" conflict, the rule wins; if you think a rule is wrong, say so in your report instead of breaking it quietly.

Reference material lives in `reference/` (screenshots plus `ap-teardown.md`). The target feel is a newsroom graphics desk (AP, FT, NYT), not a SaaS landing page.

---

## 1. Principles

1. **Data first.** Colour, weight and motion are spent on data. Page chrome stays black, grey and white.
2. **Sharp, not soft.** Squared corners, hairline rules, tight grids. Things look printed.
3. **Every graphic answers one question.** Its headline states the finding in plain English ("Democrats won the House back in 2018 after eight years out"), and its subtitle defines exactly what is measured.
4. **Show your sources.** Every chart and map carries a source line and an "Updated" or "Data as of" date. Methodology is one click away, never hidden.
5. **Restraint is the style.** If an element would still work without decoration, remove the decoration.

## 2. Banned (these make a site look vibe coded)

Never use any of the following:

- Purple, violet or purple-to-pink gradients; any gradient used as decoration
- Black-and-purple palettes, neon glows, radial "orbs", blurred colour blobs
- Glassmorphism or "liquid glass" panels, frosted backgrounds, heavy drop shadows
- Sections that fade, slide or scale in on scroll; parallax; scroll-jacking
- Hover animations that move, grow, tilt or glow; animated arrows; bouncing anything
- Lucide (or any generic) icon sets; sparkle/AI icons; emoji as UI
- Rows of three feature cards, bento grids, testimonial-style cards
- Pill-shaped buttons and badges, radii above 4px (except tooltips at 4px max)
- Inter, Poppins, Montserrat or system-ui as the primary typeface
- Hero sections with a giant headline, a subheading and two CTA buttons
- Charts made of KPI tiles with big numbers and tiny sparklines as decoration
- Pie and donut charts, 3D charts, dual y-axes
- Placeholder copy ("Lorem ipsum", "Insights at a glance", "Unlock the power of...")
- Em dashes in copy; "not X, but Y" sentence constructions

Exception: the women-in-Congress pictogram uses two person figures drawn for this site; no icon sets.

## 3. Typography

The Financial Times uses **Financier Display** (headlines) and **Metric** (sans), both from Klim Type Foundry. They are commercial fonts; we must not self-host or hotlink them without a paid web licence. We use open fonts with the same character, and keep font names in CSS variables so a licensed font can be dropped in later.

| Role | Font (Google Fonts) | Use |
|---|---|---|
| Display / headlines | **Source Serif 4** (optical size "Display", 600 to 700) | Page title, section titles, chart headlines |
| Text and data | **Barlow** (400, 500, 600) | Body copy, subtitles, tables, tooltips |
| Labels and numbers | **Barlow Semi Condensed** (500, 600, 700) | Axis labels, seat counts, map labels, buttons |

Rules:

- Numbers always use `font-variant-numeric: tabular-nums lining-nums`.
- Map and section labels: uppercase, letter-spacing `0.14em` to `0.2em`, Barlow Semi Condensed 600.
- Type scale (px): 13, 15, 17, 20, 26, 34, 48. Body is 17. Never below 12.
- Line length for prose: 60 to 72 characters.
- Sentence case for all headings. No title case, no all-caps headlines.

## 4. Colour

```css
:root {
  --paper:        #FFFFFF;  /* page */
  --paper-2:      #F6F6F4;  /* table stripes, panels */
  --ink:          #111111;  /* text */
  --ink-2:        #555555;  /* secondary text */
  --ink-3:        #8A8A8A;  /* tertiary, axis ticks */
  --rule:         #D9D9D6;  /* hairlines */

  --dem:          #1A5FD0;  /* bright Democratic blue, called / won */
  --dem-tint:     #9EBEF0;  /* leading, not called */
  --gop:          #D7262E;  /* bright Republican red, called / won */
  --gop-tint:     #F2A6A6;  /* leading, not called */
  --ind:          #E8B730;  /* independents (amber, not purple); text on it is --ink */
  --no-race:      #ECECEA;  /* state with no race this cycle */

  --ocean:        #0D1117;  /* map water */
  --ocean-line:   #2A313C;  /* bathymetry contour lines */
  --land:         #FFFFFF;  /* map land outside the data */
  --border:       #FFFFFF;  /* state borders on filled states */
}
```

- Party colours are only ever used for party data. Links are `--ink` with an underline.
- Flipped seats: diagonal hatching (45 degrees, 2px stripes) in the winning party colour over its tint.
- Colour is never the only signal: pair it with a label, pattern or position.
- Check contrast: text on `--dem` and `--gop` fills must be white and at least 4.5:1. Text on `--ind` must be `--ink` (about 10:1); never white.
- `--ind` was changed from ochre `#8A6D1F` to amber `#E8B730` in step 05 because ochre was too close to `--gop` for deuteranopia. See `review/05-report.md` for the simulation result.

## 5. Shape, spacing, layout

- Corner radius: `0` for data marks and panels, `2px` for controls, `4px` max for tooltips.
- Rules: 1px `--rule`. Section dividers are a 1px black line with the section label above it.
- Spacing on a 4px grid; section gaps of 64 to 96px.
- 12-column grid, max content width 1200px, prose column 680px, 16px side gutter on phones.
- No horizontal page scroll at any width down to 360px.

## 6. Charts

- Title (Source Serif 4) + subtitle (Barlow) + chart + source line + date. Always all five.
- Direct labels beat legends; if a legend is needed, it sits above the chart, inline, small.
- Gridlines: horizontal only, 1px `--rule`. Axis lines only where they mean zero or a threshold (e.g. 218 seats, 51 senators).
- Majority thresholds are marked with a small triangle and a number, like AP's 218 marker.
- Seats are drawn as squares (one square per seat or per N seats, stated in the subtitle).
- Tooltips: plain rectangle, 1px border, no shadow beyond `0 1px 2px rgba(0,0,0,.08)`, appear instantly.
- Every chart must render correctly with JavaScript disabled at its default state (build-time SVG), then enhance.

## 7. Maps

Style reference: `reference/screenshots/11-map-style-europe-1938.png` and `12-map-style-nordic-baltic.png`.

- Projection: Albers USA (`d3.geoAlbersUsa`), Alaska and Hawaii inset.
- Ocean and Great Lakes in `--ocean` with thin `--ocean-line` bathymetry contour lines (Natural Earth bathymetry), giving the dark, carved look of the reference.
- States are flat fills: `--dem`, `--gop`, their tints, or `--no-race`. White 0.75px borders. No gradients, no shading, no 3D.
- Labels: state postal codes or short names, uppercase, letter-spaced, white on dark fills and `--ink` on light ones; small states get leader lines or labels in the ocean.
- Map title block sits bottom-left in the reference style: big tracked uppercase line ("SENATE 2018") and a smaller tracked subtitle line.
- A year control (segmented buttons or a stepped slider) switches years. No autoplay; if a "play" button exists, it steps one year per second and stops at the end.

## 8. Interaction and motion

- Motion only to show that data changed: colour cross-fades or bar transitions of 150 to 250ms, ease-out.
- Respect `prefers-reduced-motion`: switch to instant changes.
- Hover may make a clickable thing slightly more inviting (a shade darker, a 1px outline); nothing ever fades, shrinks or disappears on hover.
- Hover is a shortcut, never the only path: every tooltip's content is also reachable by tap, click and keyboard (for the map, a selected-state details panel), because phones have no hover.
- The key numbers for each chart and map are visible on the page without any interaction.
- All controls work by keyboard, with a visible 2px `--ink` focus outline.

## 9. Writing

- Plain English, short paragraphs, journalistic voice. Lead with the finding.
- No em dashes; no "not X, but Y"; no hype words (revolutionary, unlock, seamless, insights).
- Define jargon once (Congress = House + Senate; "midterm" = election halfway through a presidential term).
- Numbers: "218 seats", "51 senators", percentages to one decimal place, margins as "+7.5".

## 10. Pre-ship checklist

- [ ] Nothing from the banned list appears anywhere
- [ ] Every chart has title, subtitle, source, date
- [ ] Every number on screen traces to a file in `data/processed/` and a source in `data/SOURCES.md`
- [ ] Works at 360px, 768px, 1280px, 1600px
- [ ] Lighthouse accessibility 95+, no console errors
- [ ] Reduced-motion and keyboard checks pass
- [ ] Screenshots of each section saved to `review/` for Stephane

## 11. Notes from YC Design Review ("how to avoid a vibe coded site")

The full guide lives in Stephane's `no-vibe-coding` repo (README.md); these are the points that matter most for this project.

1. **The hand-coding test.** Before keeping any effect, ask: if a person had to build this by hand over a day or a week, would they still choose to? Many AI-site effects (lines that follow the scroll, cursor-following glows, buttons that chase the cursor, meteors) exist only because they are now free. If the answer is no, delete it. In every step report, list each animation or effect with one line on why a human would have spent the time on it.
2. **Ubiquity kills meaning.** Trends spread into language models from well-linked sites and then onto every new site within a week; defaults are what make a site look like every other site. Choose deliberately.
3. **Start from our palette, type and references,** never from what the tool produces first.
4. **Hover makes things more inviting and never hides them;** nothing critical lives only behind hover; phones have no hover (see section 8).
5. **Native scrolling,** no reveal animations, no scroll-jacking, one header state at a time, no "scroll down" cues.
6. **Readable contrast** for all text, including captions and source lines.
7. **No stock icons or emoji;** sharp assets only.
8. **The first screen states the finding.** For this dashboard: what it shows, the headline finding, and the map.
9. **A human QA pass** on every interaction, on a phone and a laptop, before anything ships.
10. **Allowed exception:** a thin reading progress indicator is fine on long scroll stories, because it answers a real reader question ("how far through am I?"). This dashboard does not need one.
