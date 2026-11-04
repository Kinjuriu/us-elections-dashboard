"""Validation checks for data/processed/. Run: pytest pipeline/tests"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import MANUAL, PROCESSED, RAW, congress_number, html_rows  # noqa: E402


@pytest.fixture(scope="module")
def cc():
    return pd.read_csv(PROCESSED / "chamber_control.csv")


@pytest.fixture(scope="module")
def senate():
    return pd.read_csv(PROCESSED / "senate_results_by_state.csv")


@pytest.fixture(scope="module")
def house():
    return pd.read_csv(PROCESSED / "house_delegations_by_state.csv")


PARTS = ["dem", "gop", "ind", "other", "vacant"]


# ---- chamber_control ---------------------------------------------------------

def test_one_row_per_congress_and_chamber(cc):
    assert set(cc.congress) == set(range(80, 121))
    assert len(cc) == 41 * 2
    assert not cc.duplicated(["congress", "chamber"]).any()


def test_house_totals(cc):
    """435 seats, except the 86th (436 at the opening: Alaska seated, Hawaii's member
    only from 21 August 1959) and the 87th (437). Both per the House Historian."""
    h = cc[(cc.chamber == "house") & ~cc.is_provisional]
    expected = h.congress.map({86: 436, 87: 437}).fillna(435)
    assert (h.total_seats == expected).all()
    assert (h[PARTS].sum(axis=1) == h.total_seats).all()


def test_house_vacancies_match_source_footnotes(cc):
    # Historian footnotes: 99th one vacancy; 116th NC-9 and 117th NY-22 not certified at opening.
    h = cc[(cc.chamber == "house") & ~cc.is_provisional]
    assert set(h[h.vacant > 0].congress) == {99, 116, 117}


def test_senate_totals(cc):
    """96 senators through the 85th Congress, 98 at the opening of the 86th
    (Alaska seated, Hawaii from 21 August 1959), 100 from the 87th."""
    s = cc[(cc.chamber == "senate") & ~cc.is_provisional]
    expected = s.congress.map(lambda n: 96 if n <= 85 else 98 if n == 86 else 100)
    assert (s.total_seats == expected).all()
    assert (s[PARTS].sum(axis=1) == s.total_seats).all()


def test_majority_threshold(cc):
    assert (cc.majority_threshold == cc.total_seats // 2 + 1).all()


def test_majority_party_matches_party_government_page(cc):
    """Cross-check against the House Historian's 'Party Government' table. The Senate's
    107th and 117th differ by design: we record the opening-day majority."""
    words = {"Democrats": "DEM", "Republicans": "GOP"}
    pg = {}
    for r in html_rows(RAW / "house_historian" / "party_government.html"):
        n = congress_number(r[0]) if r else None
        if n and 80 <= n <= 119:
            pg[n] = r
    mismatches = []
    for row in cc[~cc.is_provisional].itertuples():
        cell = pg[row.congress][1 if row.chamber == "house" else 2]
        want = words.get(cell.rstrip("0123456789"))
        if want != row.majority_party:
            mismatches.append((row.chamber, row.congress))
    assert sorted(mismatches) == [("senate", 107), ("senate", 117)]


def test_majority_most_of_congress(cc):
    """Matches the Party Government page in every Congress (it lists the 107th Senate as
    'Republicans / Democrats'); notes are set exactly where Senate control changed."""
    words = {"Democrats": "DEM", "Republicans": "GOP"}
    for r in html_rows(RAW / "house_historian" / "party_government.html"):
        n = congress_number(r[0]) if r else None
        if not n or not 80 <= n <= 119:
            continue
        for chamber, cell in (("house", r[1]), ("senate", r[2])):
            ours = cc[(cc.congress == n) & (cc.chamber == chamber)].iloc[0].majority_party_most_of_congress
            if "/" in cell:
                assert ours in {words[w.strip().rstrip("0123456789")] for w in cell.split("/")}
            else:
                assert ours == words[cell.rstrip("0123456789")], (chamber, n)
    noted = cc[cc.majority_note.fillna("") != ""]
    assert sorted(zip(noted.chamber, noted.congress)) == [("senate", 107), ("senate", 117)]
    s107 = cc[(cc.congress == 107) & (cc.chamber == "senate")].iloc[0]
    s117 = cc[(cc.congress == 117) & (cc.chamber == "senate")].iloc[0]
    assert (s107.majority_party, s107.majority_party_most_of_congress) == ("DEM", "DEM")
    assert (s117.majority_party, s117.majority_party_most_of_congress) == ("GOP", "DEM")


def test_presidents_match_party_government_page(cc):
    party_word = {"Democrat": "DEM", "Republican": "GOP"}
    for r in html_rows(RAW / "house_historian" / "party_government.html"):
        n = congress_number(r[0]) if r else None
        if not n or not 80 <= n <= 119:
            continue
        row = cc[(cc.congress == n) & (cc.chamber == "house")].iloc[0]
        surname = row.president.split()[-1].rstrip(".")
        surname = "Bush" if "Bush" in row.president else ("Biden" if "Biden" in row.president else surname)
        assert surname in r[3], (n, row.president, r[3])
        assert party_word[r[3].split()[0]] == row.president_party, (n, r[3])


def test_independents_side_table_matches_counts(cc):
    ind = pd.read_csv(MANUAL / "independents.csv")
    counts = ind.groupby(["chamber", "congress"]).size()
    have = cc[cc.ind.fillna(0) > 0].set_index(["chamber", "congress"]).ind.astype(int)
    assert counts.sort_index().to_dict() == have.sort_index().to_dict()


def test_2026_is_provisional(cc):
    assert cc[cc.election_year == 2026].is_provisional.all()
    assert not cc[cc.election_year < 2026].is_provisional.any()


# ---- midterm_swing -------------------------------------------------------------

def test_midterm_swing(cc):
    m = pd.read_csv(PROCESSED / "midterm_swing.csv")
    assert sorted(m.year.unique()) == list(range(1946, 2027, 4))
    assert len(m) == 21 * 2
    done = m.dropna(subset=["change"])
    assert (done.seats_after - done.seats_before == done.change).all()
    assert m[m.year == 2026].is_provisional.all()
    assert (m[m.chamber == "senate"].before_basis == "election_day").all()
    house = m[m.chamber == "house"]
    assert (house.before_basis == "opening_day").all() and house.flag.str.contains("opening-day").all()
    # "after" is the president's party at the opening of the new Congress plus at most
    # the independents counted that day.
    for r in done.itertuples():
        row = cc[(cc.election_year == r.year) & (cc.chamber == r.chamber)].iloc[0]
        extra = r.seats_after - row[r.president_party.lower()]
        assert 0 <= extra <= row.ind, (r.year, r.chamber)


def test_midterm_2022_senate_is_plus_one_for_democratic_caucus():
    m = pd.read_csv(PROCESSED / "midterm_swing.csv")
    r = m[(m.year == 2022) & (m.chamber == "senate")].iloc[0]
    assert (r.president_party, r.seats_before, r.seats_after, r.change) == ("DEM", 50, 51, 1)


# ---- senate_results_by_state ------------------------------------------------------

def test_senate_races_per_year(senate):
    """30 to 40 races in every November election year. Odd years hold only the
    off-cycle specials MEDSL omits (MA and NJ 2013, AL 2017)."""
    per_year = senate.groupby("year").size()
    even = per_year[per_year.index % 2 == 0]
    assert ((even >= 30) & (even <= 40)).all(), even.to_dict()
    odd = senate[senate.year % 2 == 1]
    assert odd.special.all()


def test_one_regular_race_per_state_seat(senate):
    reg = senate[~senate.special]
    assert not reg.duplicated(["year", "state_po"]).any()
    assert reg.groupby("year").size().between(33, 34).all()


def test_specials_are_flagged_and_listed(senate):
    specials = pd.read_csv(MANUAL / "senate_specials.csv")
    listed = set(zip(specials.year, specials.state_po))
    for r in senate[senate.special].itertuples():
        assert (r.year, r.state_po) in listed


def test_senate_percentages(senate):
    s = senate.dropna(subset=["winner_pct"])
    assert s.winner_pct.between(0, 100).all()
    both = s.dropna(subset=["runner_up_pct"])
    assert (both.winner_pct >= both.runner_up_pct).all()
    assert ((both.winner_pct - both.runner_up_pct - both.margin_pts).abs() <= 0.011).all()
    assert senate.state_po.str.fullmatch(r"[A-Z]{2}").all()


def test_2026_senate_race_list(senate):
    s26 = senate[senate.year == 2026]
    assert len(s26) == 35 and s26.is_provisional.all()
    assert set(s26[s26.special].state_po) == {"FL", "OH"}
    # Class 2 seats up in 2026 were last up in the 2020 regular races.
    reg2020 = set(senate[(senate.year == 2020) & ~senate.special].state_po)
    assert set(s26[~s26.special].state_po) == reg2020


def test_flip_definitions(senate):
    def race(y, s):
        return senate[(senate.year == y) & (senate.state_po == s) & ~senate.special].iloc[0]
    pa = race(2010, "PA")  # Specter switched to Democrat in 2009
    assert not pa.flipped_vs_last_election and pa.flipped_vs_holder and pa.holder_party == "DEM"
    mn = race(2008, "MN")  # Barkley's interim appointment ended in January 2003
    assert mn.holder_party == "GOP"
    same = senate.dropna(subset=["previous_party", "holder_party", "winner_party"])
    same = same[same.previous_party == same.holder_party]
    assert (same.flipped_vs_last_election == same.flipped_vs_holder).all()


def test_manual_results_resolve_knock_on_flips(senate):
    """With the 8 manual races entered, every race before 2026 has both flip values."""
    done = senate[senate.year < 2026]
    assert done.flipped_vs_holder.notna().all() and done.flipped_vs_last_election.notna().all()
    al = done[(done.year == 2020) & (done.state_po == "AL") & ~done.special].iloc[0]
    assert (al.winner_party, al.holder_party, al.previous_party) == ("GOP", "DEM", "DEM")
    assert al.flipped_vs_holder and al.flipped_vs_last_election


# ---- house_delegations_by_state ----------------------------------------------------

def test_house_delegations_sum_to_435(house):
    for year, g in house.groupby("year"):
        assert g.seats.sum() == 435, year
        assert len(g) == 50, year
    parts = ["dem", "gop", "ind", "other", "vacant"]
    done = house.dropna(subset=parts)
    assert (done[parts].sum(axis=1) == done.seats).all()


def test_house_delegations_match_historian(house, cc):
    """Seats won (MEDSL) against the opening-day division (House Historian). NC-9 2018
    is counted as vacant, as the Historian does. The one gap left is NY-22 2020, kept
    as a Republican seat with a note (count finished after the Congress opened)."""
    h = house[~house.is_provisional].groupby("year")[["dem", "gop", "ind", "other", "vacant"]].sum()
    hist = cc[cc.chamber == "house"].set_index("election_year")
    for year, row in h.iterrows():
        ref = hist.loc[year]
        assert (row.dem, row.ind, row.other) == (ref.dem, ref.ind, ref.other), year
        assert row.gop == ref.gop + (1 if year == 2020 else 0), year
        assert row.vacant == ref.vacant - (1 if year == 2020 else 0), year
    noted = house[house.note.fillna("") != ""]
    assert sorted(zip(noted.year, noted.state_po)) == [(2018, "NC"), (2020, "NY")]


def test_house_vote_shares(house):
    s = house.dropna(subset=["dem_vote_share"])
    assert (s.dem_vote_share + s.gop_vote_share <= 100.01).all()


# ---- manual files ------------------------------------------------------------------

def test_manual_rows_have_sources():
    for name, url_col in [("presidents.csv", "dates_source_url"), ("independents.csv", "source_url"),
                          ("senate_specials.csv", "source_url"),
                          ("senate_seat_changes.csv", "source_url")]:
        df = pd.read_csv(MANUAL / name)
        assert df[url_col].notna().all(), name
        assert df.accessed_at.notna().all(), name
    # Filled values in fix/override files must carry a source.
    for name, val_col in [("senate_results_manual.csv", "winner_party"),
                          ("candidate_party_overrides.csv", "party")]:
        df = pd.read_csv(MANUAL / name)
        filled = df[df[val_col].notna()]
        assert filled.source_url.notna().all() and filled.accessed_at.notna().all(), name
    p26 = pd.read_csv(MANUAL / "2026_provisional.csv")
    has_result = p26[["winner_party", "dem", "gop"]].notna().any(axis=1)
    assert p26[has_result].result_source_url.notna().all()
    assert p26[has_result].result_accessed_at.notna().all()


MANUAL_SOURCE_COLUMNS = {
    "presidents.csv": ["dates_source_url", "party_source_url"],
    "independents.csv": ["source_url"],
    "senate_specials.csv": ["source_url"],
    "senate_seat_changes.csv": ["source_url"],
    "senate_results_manual.csv": ["source_url"],
}
# Templates whose rows are placeholders until filled; every row holding a value
# must carry a source.
MANUAL_TEMPLATES = {
    "candidate_party_overrides.csv": (["party"], "source_url"),
    "2026_provisional.csv": (["winner_name", "winner_party", "runner_up_party", "winner_pct",
                              "runner_up_pct", "dem", "gop", "ind", "other", "vacant",
                              "dem_vote_share", "gop_vote_share"], "result_source_url"),
}


def test_every_manual_row_has_source_url():
    """Fails if any row in data/manual/ lacks a source_url (or, in the two template
    files, if any row holding a value lacks one). New manual files must be registered."""
    listed = set(MANUAL_SOURCE_COLUMNS) | set(MANUAL_TEMPLATES)
    on_disk = {p.name for p in MANUAL.glob("*.csv")}
    assert on_disk == listed, f"register new manual files in this test: {on_disk ^ listed}"
    for name, cols in MANUAL_SOURCE_COLUMNS.items():
        df = pd.read_csv(MANUAL / name)
        for c in cols:
            missing = df[df[c].isna() | (df[c].astype(str).str.strip() == "")]
            assert missing.empty, f"{name}: rows without {c}: {missing.index.tolist()}"
    for name, (value_cols, url_col) in MANUAL_TEMPLATES.items():
        df = pd.read_csv(MANUAL / name)
        has_value = df[value_cols].notna().any(axis=1)
        missing = df[has_value & df[url_col].isna()]
        assert missing.empty, f"{name}: rows with values but no {url_col}: {missing.index.tolist()}"


# ---- spot checks, each verified by hand against the raw source ---------------------------

def test_spot_checks(cc, senate, house):
    # 1. House 80th Congress (House Historian): 188 D, 246 R, 1 American Labor.
    r = cc[(cc.congress == 80) & (cc.chamber == "house")].iloc[0]
    assert (r.dem, r.gop, r.other, r.ind, r.vacant) == (188, 246, 1, 0, 0)
    # 2. Senate 117th opening day, 3 Jan 2021 (Senate Historical Office): 51 R, 46 D, 2 I, 1 vacant.
    r = cc[(cc.congress == 117) & (cc.chamber == "senate")].iloc[0]
    assert (r.gop, r.dem, r.ind, r.vacant, r.majority_party) == (51, 46, 2, 1, "GOP")
    # 3. Senate 86th opening, 7 Jan 1959: 64 D, 34 R, 98 seats.
    r = cc[(cc.congress == 86) & (cc.chamber == "senate")].iloc[0]
    assert (r.dem, r.gop, r.total_seats) == (64, 34, 98)
    # 4. Georgia 2020 regular, decided in the 5 Jan 2021 runoff (MEDSL):
    #    Ossoff 2,269,262 and Perdue 2,213,979 of 4,483,241.
    r = senate[(senate.year == 2020) & (senate.state_po == "GA") & ~senate.special].iloc[0]
    assert r.winner_party == "DEM" and r.winner_pct == 50.62 and r.runner_up_pct == 49.38
    assert bool(r.flipped_vs_last_election) and r.previous_party == "GOP"
    assert bool(r.flipped_vs_holder) and r.holder_party == "GOP"
    # 5. Maine House 2024 (MEDSL): both seats DEM; ME-2 final round Golden 197,151 v Theriault 194,445.
    r = house[(house.year == 2024) & (house.state_po == "ME")].iloc[0]
    assert (r.seats, r.dem, r.gop) == (2, 2, 0)
