# Step 07 report: data for the next round of visuals

Only **B (members, gender, age)** is done. **A, C and E are blocked on sources**, and I stopped on each rather than substitute something unapproved. Nothing was estimated or typed from memory.

## B. Who serves in Congress: built

- Source: `unitedstates/congress-legislators` (CC0), pinned to commit `15530b7d` (24 Oct 2026). Downloaded by `pipeline/download.py`, built by `pipeline/build_members.py`, added to `run_all.py`. `pyyaml` added to requirements (pre-approved).
- Outputs, 80th to 119th Congress (1947 to 2025):
  - `members_by_congress.csv`: 21,903 rows
  - `women_by_congress.csv`: 80 rows
  - `age_by_congress.csv`: 80 rows
- **Counting rule:** anyone who served at any point in the Congress, once per chamber. House totals therefore run above 435.
- **Opening-day counts: not built.** The source has only a term start date and gives some later joiners the opening date. In the 86th House, 447 terms start on opening day for 435 seats.
- Voting seats only. Delegates, resident commissioners and Alaska and Hawaii's delegates before statehood are excluded.
- Party is the party on a member's first day in that Congress. `women_other` includes independents.
- Gaps: three members have no birthday, so their age is null (80th Rohrbough, 88th Burkhalter, 96th Hutchinson). No member lacks a gender.
- 120th Congress left out as instructed.
- Tests added (32 pass): coverage, no duplicates, seat-count bounds, women counts match members, age bands sum to 1, cross-check within 5.

### Cross-check against published totals

CAWP's site returns HTTP 403 to scripts, so for 1991 to 2021 I used the Congressional Research Service report R43244 (Table A-1, "served in each Congress", Representatives only, as of 16 Dec 2021). That is not CAWP, so please treat it as a stand-in. For 2025 I used CAWP's own 2 January 2025 release. Rows are in `data/manual/women_crosscheck.csv` with URLs.

| Congress | Chamber | Published | Ours | Difference |
|---|---|---|---|---|
| 102nd (1991) | House | 29 | 29 | 0 |
| 102nd | Senate | 4 | 4 | 0 |
| 107th (2001) | House | 60 | 60 | 0 |
| 107th | Senate | 14 | 13 | -1 |
| 112th (2011) | House | 76 | 76 | 0 |
| 112th | Senate | 17 | 17 | 0 |
| 117th (2021) | House | 122 | 126 | +4 |
| 117th | Senate | 26 | 26 | 0 |
| 119th (2025) | House | 125 | 128 | +3 |
| 119th | Senate | 25 | 27 | +2 |

- The 117th CRS figure is as of 16 Dec 2021, before the Congress ended, so the +4 is expected.
- The 119th CAWP figure is the count on the first day. Ours includes women who joined later, so +3 and +2 are expected.
- The 107th Senate is one short. CRS's footnote mentions appointed senators. I have not found which woman is missing; it needs a look.

## A. County presidential shift: blocked

MEDSL "County Presidential Election Returns 2000-2024", doi:10.7910/DVN/VOQCHQ, version 20.0 (25 Feb 2026), CC0. The file `countypres_2000-2024.tab` needs a Dataverse guestbook response (name, email, institution), as the House file did. I did not fill in the form for you.

**Needed from you:** download it in a browser and save as `data/raw/medsl/countypres_2000-2024.tab`. Then I can build the output, the Alaska, Connecticut and Virginia handling, and the join check against `us-atlas`.

## C. Issue priority by group: blocked

- CES 2024 Common Content (doi:10.7910/DVN/X11EP6, version 9, CC0) downloads fine and its licence allows aggregates. But **it has no "most important issue" question.** I checked all 694 variables and both questionnaires (pre and post).
- The fallback, ANES 2024 Time Series, needs a registered download from electionstudies.org, and the site blocks scripted access (HTTP 403). The ANES most-important-problem items are open-ended and coded, listed in its codebook as `V242165POST` to `V242171POST`. I have not verified that.
- **Needed from you:** download the ANES 2024 Time Series full release (CSV or Stata) and its codebook, put them in `data/raw/anes/`, and confirm you are happy with the open-ended coded question. Or tell me to drop this heatmap.
- I deleted the 183 MB CES file I had downloaded. It was over GitHub's file limit and unused.

## E. Governors: blocked

- Dataverse has no open governor dataset covering 2000 to 2024 with vote shares. MEDSL's State Office-Level Returns covers 2016 only.
- "United States Governors 1775-2020" (doi:10.7910/DVN/RYY3OW, CC BY 4.0) has party by governor and year, but it ends in 2020. Its year counts are patchy: 40 rows in 2016, 29 in 2018, 24 in 2019, 1 in 2020, with 50 to 80 in earlier years. There are no vote shares. It cannot pass the 50-governors-per-year test.
- **Options for you:** (1) allow Wikipedia (CC BY-SA) as the source, which means parsing about 125 election pages; (2) allow the NGA database if its terms permit republishing; (3) drop the governors map.

## Open questions

1. Will you place the county file and the ANES files, or should those steps be dropped?
2. Which source do you want for governors?
3. Is the CRS stand-in fine for the cross-check, or will you check CAWP's tables by hand?
