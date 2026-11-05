"""Checks for the governor files (Wikipedia, CC BY-SA 4.0). Run: pytest pipeline/tests"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import PROCESSED, STATES  # noqa: E402


@pytest.fixture(scope="module")
def terms():
    return pd.read_csv(PROCESSED / "governors_terms.csv", keep_default_na=False)


@pytest.fixture(scope="module")
def by_year():
    return pd.read_csv(PROCESSED / "governors_by_year.csv")


def d(s: str) -> date:
    return date.fromisoformat(s)


def test_fifty_governors_every_year(by_year):
    assert set(by_year.year) == set(range(2000, 2026))
    assert not by_year.duplicated(["year", "state_po"]).any()
    counts = by_year.groupby("year").size()
    assert (counts == 50).all(), counts[counts != 50]
    for _, grp in by_year.groupby("year"):
        assert set(grp.state_po) == set(STATES)


def test_grouped_party_is_only_d_r_or_i(terms, by_year):
    assert set(terms.party) <= {"D", "R", "I"}
    assert set(by_year.party) <= {"D", "R", "I"}
    detail_to_group = {"Democratic": "D", "Democratic-Farmer-Labor": "D", "Republican": "R",
                       "Independent": "I", "Reform/Independence": "I"}
    for df in (terms, by_year):
        assert set(df.party_detail) <= set(detail_to_group)
        assert (df.party_detail.map(detail_to_group) == df.party).all()


def test_no_blank_fields(terms, by_year):
    for df in (terms.drop(columns=["left_office", "party_note"]), by_year):
        assert (df.astype(str).apply(lambda c: c.str.strip()) != "").all().all()
    assert terms.source_url.str.startswith("https://en.wikipedia.org/w/index.php?title=List_of_governors_of_").all()


def test_terms_run_in_order_with_no_gaps_or_overlaps(terms):
    # Pages end a term either on the last day in office or on the day the successor starts,
    # so the next term starts 0 or 1 days after the stated end.
    for po, grp in terms.groupby("state_po"):
        grp = grp.sort_values("took_office").reset_index(drop=True)
        for i, row in grp.iterrows():
            if row.left_office == "":
                assert i == len(grp) - 1, f"{po}: open-ended term is not the last: {row.governor}"
                continue
            assert d(row.left_office) >= d(row.took_office), f"{po}: {row.governor} ends before it starts"
            if i + 1 < len(grp):
                gap = (d(grp.took_office[i + 1]) - d(row.left_office)).days
                assert gap in (0, 1), f"{po}: {row.governor} to {grp.governor[i + 1]}: {gap} days"


def test_every_state_has_terms_across_the_window(terms):
    for po, grp in terms.groupby("state_po"):
        assert d(grp.took_office.min()) <= date(2000, 1, 1), po
        last = grp.sort_values("took_office").iloc[-1]
        assert last.left_office == "" or d(last.left_office) >= date(2025, 1, 1), po
    assert set(terms.state_po) == set(STATES)


def test_by_year_matches_terms(terms, by_year):
    for r in by_year.itertuples():
        jan1 = f"{r.year}-01-01"
        t = terms[(terms.state_po == r.state_po) & (terms.governor == r.governor) & (terms.took_office == r.took_office)]
        assert len(t) == 1
        t = t.iloc[0]
        assert t.took_office <= jan1 and (t.left_office == "" or t.left_office >= jan1)


def test_party_switches_follow_the_manual_file(by_year):
    pick = lambda y, po: by_year[(by_year.year == y) & (by_year.state_po == po)].iloc[0].party  # noqa: E731
    assert pick(2010, "FL") == "R" and pick(2011, "FL") == "I"
    assert pick(2013, "RI") == "I" and pick(2014, "RI") == "D"
    assert pick(2018, "WV") == "R"
    detail = by_year[(by_year.year == 2014) & (by_year.state_po == "RI")].iloc[0].party_detail
    assert detail == "Democratic"
    assert by_year[(by_year.year == 2003) & (by_year.state_po == "MN")].iloc[0].party_detail == "Reform/Independence"
