# US Congress, 1946 to 2026

A historical dashboard of how Democrats and Republicans have fared in the US House of Representatives and the US Senate since 1946, built around a map of the states.

## The pages

| Page | What it shows |
|---|---|
| US Congress (home) | The map board: a year railway, the state map for the House or the Senate, a state panel, Senate and House balance cards, and two history charts (control by year and the midterm swing). |
| Governors | Which party holds each state's governor in the year chosen, a governor card, and the list of all 50. |
| Senate | The Senate in the year chosen: seats that flipped, and a table of independents. |
| Firsts of 2026 | Milestones in this year's elections. The page is built, but nothing links to it until `data/manual/firsts.csv` has rows. |
| Story | A short written tour of the findings, linking to the dashboard. |
| Notes and sources | Where every number comes from and what is missing. |

The year and the chamber chosen on one page carry to the others through the `?year=` and `chamber=` parts of the address.

## Run it

```sh
npm install
npm test            # unit tests
npm run test:e2e   # builds the site and checks every page in Chrome
npm run build      # static site in dist/
npm run preview    # serves it at http://localhost:4321/us-elections-dashboard/
```

The data pipeline is Python 3.11 (`pandas`, `requests`, `pytest`):

```sh
python pipeline/run_all.py    # download, build data/processed/, run the tests
```

Every source, its coverage and caveats are in [`data/SOURCES.md`](data/SOURCES.md).

## Updating the 2026 results

2026 is provisional until the states certify. The results live in `data/manual/2026_provisional.csv`, one row per race.

1. For each race that has been called, fill in the winner, party, vote shares, `result_source_url`, `result_accessed_at`, and set `called` to `true`. Leave anything you cannot source empty.
2. When a state certifies, update the row from the certified result and set `certified` to `true`.
3. Run `python pipeline/run_all.py`, then `npm run test:e2e`.
4. Commit the changed files in `data/manual/` and `data/processed/`, and push to `main`. The deploy workflow publishes the site.

The Python pipeline does not run in CI. The processed data is committed, so rebuilding it locally and committing the result is the update step.

For Firsts, add rows to `data/manual/firsts.csv` (each with a source and article), re-run the pipeline, and the page and its links appear.

## Data and licences

The code in this repository is under the [MIT licence](LICENSE). The licence covers the code only. The data keeps the terms set by each source. Apart from the two governors files, which are CC BY-SA 4.0, the project's data is CC0 or public domain. The full list, with licences and dates accessed, is in [`data/SOURCES.md`](data/SOURCES.md) (members, women and age by Congress, and the county vote shift are listed there too).

| Source | Used for | Terms |
|---|---|---|
| US House of Representatives, Office of the Historian ([history.house.gov](https://history.house.gov/Institution/Party-Divisions/Party-Divisions/)) | House party divisions, presidents, party government | US government work, public domain |
| US Senate Historical Office ([senate.gov](https://www.senate.gov/about/parties-leadership/party-division.htm)), via an Internet Archive capture | Senate party divisions | US government work, public domain |
| MIT Election Data and Science Lab, *U.S. Senate statewide 1976 to 2024* ([doi:10.7910/DVN/PEJ5QU](https://doi.org/10.7910/DVN/PEJ5QU)) | Senate results by state | CC0 1.0 |
| MIT Election Data and Science Lab, *U.S. House 1976 to 2024* ([doi:10.7910/DVN/IG0UN2](https://doi.org/10.7910/DVN/IG0UN2)) | House results by district | CC0 1.0 |
| Federal Election Commission, *Federal Elections* reports ([fec.gov](https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/)) | Senate seat classes, party labels, manual results | US government work, public domain |
| Clerk of the US House ([clerk.house.gov](https://clerk.house.gov/Votes/ElectionStatistics)) | Manual Senate results | US government work, public domain |
| State election offices: Massachusetts, New Jersey, Alabama | Manual Senate results for off-cycle specials | Official public election records; no licence stated |
| Laramie County, Wyoming, County Clerk | Two 2020 party labels | Official public election record; no licence stated |
| Wikipedia, English edition, governor pages for each state ([en.wikipedia.org](https://en.wikipedia.org)) | `governors_terms.csv` and `governors_by_year.csv` | **CC BY-SA 4.0** (credit: Wikipedia contributors). These two files are adapted from Wikipedia and must be shared under the same licence |
| Wikipedia, *2026 United States Senate elections* | The list of 2026 races only, no results | Text under CC BY-SA 4.0; only the race list (facts) is used |

The fonts (Source Serif 4, Barlow, Barlow Semi Condensed) are loaded from Google Fonts under the SIL Open Font License 1.1.
