# Step 10: two fixes, the 2026 results, and a Firsts page

Written by Claude (Opus) for Sonnet, 5 November 2026. Stephane wants this done before the site goes live. Work on branch `step-09-pages` and push to the same pull request (#7). Read CLAUDE.md, DESIGN_RULES.md and data/SOURCES.md first. This step may change `pipeline/` and `data/manual/` where it says so.

## Part 0: two fixes

### 0.1 Women in Congress: people, not plain squares

The squares do not say who is a woman and who is a man. Redraw the chart as a pictogram like the Flourish one Stephane shared ("For the first time ever, women in EU Parliament make more than 40%"):
- Draw two small person figures yourself as inline SVG (no icon set, nothing copied from Flourish): a head (circle) and a body; the woman's figure has a skirt-shaped body, the man's has trousers (two legs). Each about 10 by 22px; they must read as different at that size and in greyscale.
- One figure is 1% of members. Women in `--ink`, men in `--rule`; the shape difference carries the meaning as well as the colour.
- Legend above the chart, inline: a grey figure "= 1%", the man figure "Men", the woman figure "Women".
- Keep the rows, the percentage written at the end of each row, the headline, subtitle, source and date. Two lines of 50 per row is fine if one line of 100 is too small.
- Add a line to DESIGN_RULES.md section 2: "Exception: the women-in-Congress pictogram uses two person figures drawn for this site; no icon sets."

### 0.2 Senate card for 2020: show 50 Democrats

Stephane's decision: yes, add the data. Add a row to `data/manual/` (with a source from the US Senate Historical Office party division page, URL and access time) giving the Senate after the Georgia runoff winners and the vice president took office on 20 January 2021: 48 Democrats, 2 independents caucusing with them, 50 Republicans, Democratic control through the vice president. Feed it through the pipeline so the 2020 card reads "50 Democrats, with the vice president" as the big number, and keeps the opening-day count in the line underneath. Do the same for 2000 if the data supports it, and list what you changed.

## Part A: the 2026 results (data)

The election was on 3 November 2026. Results are provisional until states certify.

1. Senate: every 2026 race: winner, party, number of votes, vote shares and whether AP has called it, into the provisional slots the pipeline already reads.
2. House: seats won by each party, by state; uncalled seats stay "not yet entered".
3. Governors: the 36 races of 2026: state, winner, party, votes and vote share, runner-up with votes and share, called or not, and when the winner takes office. The governors map's 2026 view shows the winners (tints where uncalled).

Rules: sources in order are the state's official results page, then AP's race calls on apnews.com; record source URL and access time on every row; nothing from memory, social media or screenshots; mark every 2026 row provisional. If a source blocks scripted access, list the races you could not fill; do not guess.

## Part B: a Firsts page

A sixth page, `/firsts/`, in the masthead between Senate and Story: "Firsts of 2026". It covers every office in this year's elections: governors, senators and representatives (and other statewide offices only where the source covers them, such as Georgia's secretary of state and attorney general). Remove the "Coming in the next update" heading from the Governors page and link to the new page from there and from the US Congress page.

Data: `data/manual/firsts.csv` with columns
`year, office, state_po, person, party, first, scope (national | state), votes, vote_share, margin, source_url, source_publisher, article_url, article_title, article_publisher, article_date, accessed_at, verified`.

- `first` is one plain sentence as a source states it, e.g. "First Black woman elected governor in the US".
- A first counts only when a reliable source states it: CAWP (Center for American Women and Politics), the House Office of the Historian, the Senate Historical Office, the National Governors Association, a state's official page, or a major news organisation's report (AP, Reuters, The New York Times, The Washington Post, NPR and the like). Social media posts are leads, never sources.
- Leads from Stephane to check: Deb Haaland (New Mexico, governor), Keisha Lance Bottoms (Georgia, governor), and Georgia's secretary of state (Penny Brown Reynolds) and attorney general (Tanya Miller) races. Enter each only once a source above confirms the result and the "first".
- `votes`, `vote_share` and `margin` come from Part A's results.
- `article_*` is one news article about the win, for the reader to open. Link to it; do not copy or embed any photo or text from it.
- Do not record anyone's race, ethnicity, religion or sexuality beyond the exact wording of the "first" as the source states it.

Page layout:
- Headline built from the data, e.g. "12 firsts in the 2026 elections". Subtitle says how firsts are counted and sourced.
- A filter row: All, Governors, Senate, House, Other statewide offices (buttons, keyboard-reachable, `aria-pressed`).
- One card per first: the state outline (StateShape) in the party colour, the office in label style, the person's name in Source Serif 4, the party mark, the "first" sentence, then "How they did": "1,234,567 votes, 54.2%, won by 8.7 points" with a provisional tag, then "Read the story: <article title>, <publisher>, <date>" as a link, and the source link.
- Under the cards, a table of all firsts so everything is reachable without the cards.
- No photos of people anywhere on the site.

## Checks

Tests for the new data (no duplicates, every row has a source and an accessed date, every 2026 row is provisional, vote figures match Part A), `npm test`, `npm run test:e2e`, the internal-link test. Screenshots of the Firsts page, the Governors 2026 view and the women pictogram at 390 and 1440 into `review/10/`. `review/10-report.md` lists every lead you rejected and why. Commit, push to `step-09-pages`, and stop.
