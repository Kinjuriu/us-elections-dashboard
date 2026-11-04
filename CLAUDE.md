# Project: US Congress, 1946 to 2026

A historical dashboard showing how Democrats and Republicans have performed in the US House of Representatives and the US Senate, with a strong map at its centre. Owner: Stephane (data analyst, Nairobi). Built with Claude Opus 5.5 in VS Code, hosted on GitHub Pages.

Congress is the two chambers together: the House of Representatives (435 voting seats, all elected every two years) and the Senate (100 seats, about a third elected every two years).

## Read these first

1. `DESIGN_RULES.md`: the visual and writing rules. Non-negotiable.
2. `reference/ap-teardown.md` and `reference/screenshots/`: the look we are aiming for.
3. The prompt for the current step in `prompts/`.

## Stack

- **Astro** (static output) with plain TypeScript islands; no React, no Tailwind, no UI kits
- **D3 modules** (`d3-geo`, `d3-scale`, `d3-shape`, `d3-array`, `d3-selection`, `d3-transition`) and `topojson-client`, rendering SVG
- **Python 3.11+** for the data pipeline (`pandas`, `requests`), outputting JSON/CSV the site reads at build time
- Plain CSS with custom properties (tokens from `DESIGN_RULES.md`)
- GitHub Actions deploys `dist/` to GitHub Pages

## Folder layout

```
data/raw/           downloaded source files, never edited by hand
data/manual/        small hand-checked CSVs, each row with source_url and accessed_at
data/processed/     clean outputs the site reads
data/SOURCES.md     every source, URL, licence, date accessed, coverage
pipeline/           Python scripts, one per output, plus tests
src/                Astro site
public/geo/         topojson for states and ocean contours
reference/          screenshots and notes (do not ship)
review/             screenshots you save for Stephane after each step
prompts/            the step-by-step build prompts
```

## Data rules

- Never invent, estimate or "fill in" a number. If a value is missing, leave it null, show it as missing on the page, and list it in your report.
- Every processed file is produced by a script in `pipeline/`; re-running the pipeline reproduces it exactly.
- Validate totals: House rows sum to 435 voting seats (plus vacancies); Senate rows sum to 96 or 100 depending on the year (100 since 1959). Independents are kept separate, with a `caucuses_with` field.
- 2026 is **provisional**: label it on every chart until results are certified, and keep its values in `data/manual/2026_provisional.csv` with a source and timestamp per row.

## Working style

- Do one prompt per session. Finish it, run it, check it in the browser, then stop and write a short report: what you built, what you could not do, any data gaps, and open questions.
- Commit in small steps with clear messages.
- Ask before adding any dependency not listed above.
- Copy follows `DESIGN_RULES.md` section 9: plain English, no em dashes.
