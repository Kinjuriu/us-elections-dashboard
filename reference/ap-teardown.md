# What AP used to build its 2026 election pages

Inspected live in Chrome on 4 Nov 2026 at apnews.com/projects/elections-2026/ (Nevada governor results page).

## Stack

| Layer | What AP uses | Evidence |
|---|---|---|
| Site framework | **Astro** (static site generator, "islands" architecture) | All bundles load from `/projects/elections-2026/_astro/`, and the page contains `<astro-island>` elements |
| Interactive components | **React** islands inside Astro | `react-dom` inside `client.js`; React fiber keys on the balance-of-power bar |
| Styling | **styled-components** (CSS-in-JS) plus a small hashed-class CSS layer | `sc-xxxx` class names; hashed classes like `_1hcwyon3` |
| Charts and maps | **Hand-built SVG** (42 SVG elements, zero `<canvas>`) | No charting library is exposed globally; geometry is bundled and drawn as SVG paths and rects |
| Typeface | **"AP"**, a custom variable font (`/fonts/ap_var.woff2`, weights 100 to 1000) | Proprietary, so we cannot use it |

Each island hydrates only when it needs to (`client:load`, `client:idle`, `client:only`), which is why the page feels fast and "printed" rather than app-like.

## Visual system (measured, not guessed)

- Page background: `#FBFBFB` (off-white, never pure white behind text)
- Democrat blue: `rgb(3,117,201)` = `#0375C9`
- Republican red: `rgb(201,6,42)` = `#C9062A`
- Neutral fills: `#F2F2F2`, `#808080`, `#656565`; text is near-black
- Corner radius: overwhelmingly `2px`; a few `8px` cards; nothing pill-shaped
- Lighter tints of each party colour mark "leading, not yet called"; diagonal hatching marks "flipped seat"
- Headings are a condensed grotesk in heavy weights; body text is the same family at regular weight
- Every chart carries a plain-English title, a one-line subtitle that defines the measure, a direct legend, a source line, and an "Updated" timestamp

## Why it does not look vibe coded

1. One typeface family, used at several weights and widths, instead of three trendy fonts.
2. Squared geometry: 2px radii, 1px rules, seats drawn as squares.
3. Colour is reserved for data. The chrome is black, grey and off-white.
4. Labels sit directly on the data (state codes on the map, names in the tooltip), so legends stay tiny.
5. Encodings carry meaning: tint = leading, solid = called, hatching = flipped, small squares = seats not up this cycle.
6. No decorative motion. Nothing fades in on scroll; hover only reveals information.
7. Footnotes and methodology are visible, which reads as journalism.

## What we take, what we change

- Take: Astro static build, SVG rendering, squared seat bars, hatching for flips, tint for "leading", source and timestamp on every chart.
- Change: our own palette (brighter blue and red on white, a dark ocean on the map), FT-style editorial serif headlines, and a historical focus instead of live results.
- Simplify: we use Astro with plain TypeScript and D3 modules instead of React and styled-components, since our pages are mostly static and we host on GitHub Pages.
