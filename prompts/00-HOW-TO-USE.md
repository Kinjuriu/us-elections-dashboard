# How to run these prompts

1. Open the `us-elections-dashboard` folder in VS Code and start Claude (Opus 5.5) there, so it picks up `CLAUDE.md` automatically.
2. Run the prompts **in order, one per session**. Paste the whole file content as your message.
3. When Opus finishes a step, it writes a report and saves screenshots to `review/`. Tell Claude in the chat ("step 02 is done") so the work can be reviewed before you run the next one.
4. If a step goes wrong, do not run the next one; bring the report back for review first.

| Step | File | Outcome |
|---|---|---|
| 01 | `01-data-pipeline.md` | Clean, sourced data for 1946 to 2026 |
| 02 | `02-scaffold-and-design-system.md` | Astro site, tokens, fonts, layout, empty sections |
| 03 | `03-the-map.md` | The centrepiece map with year control |
| 04 | `04-charts.md` | Dashboard layer (shared year and chamber controls, state view, compare) plus the history charts |
| 05 | `05-polish-review-deploy.md` | Audit against the rules, accessibility, GitHub Pages deploy |

## Page outline (what we are building)

1. **Header**: title, one-paragraph standfirst, data-as-of date.
2. **The map** (centrepiece): Senate results by state for any election year 2000 to 2026, and House delegations by state drawn as seat squares; dark ocean, white land, bright party colours.
3. **Who controlled Congress**: a strip of seat bars for every Congress since 1946, House and Senate, with the majority line, and the president's party marked.
4. **The midterm penalty**: seats gained or lost by the president's party in every midterm since 1946, with 2026 highlighted as provisional.
5. **Flips**: which Senate seats changed party in each cycle, as a small table and a map toggle.
6. **Methodology and sources**.
