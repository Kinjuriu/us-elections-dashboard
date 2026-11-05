# US Congress, 1946 to 2026

A historical dashboard of how Democrats and Republicans have fared in the US House of Representatives and the US Senate since 1946, built around a map of the states.

## Run it

```sh
npm install
npm run build      # static site in dist/
npm run preview    # serves it at http://localhost:4321/us-elections-dashboard/
```

The data pipeline is Python 3.11 (`pandas`, `requests`, `pytest`):

```sh
python pipeline/run_all.py    # download, build data/processed/, run the tests
```

Every source, its coverage and caveats are in [`data/SOURCES.md`](data/SOURCES.md).

## Data and licences

The code in this repository is under the [MIT licence](LICENSE). The licence covers the code only. The data keeps the terms set by each source:

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
| Wikipedia, *2026 United States Senate elections* | The list of 2026 races only, no results | Text under CC BY-SA 4.0; only the race list (facts) is used |

The fonts (Source Serif 4, Barlow, Barlow Semi Condensed) are loaded from Google Fonts under the SIL Open Font License 1.1.
