"""Checks for data/manual/firsts.csv, its processed copy, and senate_control_day.csv."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import MANUAL, PROCESSED  # noqa: E402

SOURCES = ("CAWP", "Center for American Women and Politics", "House Office of the Historian",
           "Senate Historical Office", "National Governors Association", "AP", "Associated Press",
           "Reuters", "The New York Times", "The Washington Post", "NPR")


def firsts() -> pd.DataFrame:
    return pd.read_csv(PROCESSED / "firsts.csv", dtype=str, keep_default_na=False)


def test_no_duplicate_firsts():
    f = firsts()
    assert not f.duplicated(["year", "office", "state_po", "person", "first"]).any()


def test_every_first_has_a_source_and_an_access_date():
    f = firsts()
    for col in ("source_url", "source_publisher", "accessed_at", "first", "person", "state_po"):
        assert (f[col].str.strip() != "").all(), col
    assert f.source_url.str.startswith("https://").all()


def test_every_2026_row_is_provisional():
    f = firsts()
    assert (f[f.year.astype(int) >= 2026].provisional == "True").all()


def test_processed_matches_manual():
    assert len(firsts()) == len(pd.read_csv(MANUAL / "firsts.csv", dtype=str))


def test_articles_are_complete_when_given():
    f = firsts()
    given = f[f.article_url != ""]
    for col in ("article_title", "article_publisher", "article_date"):
        assert (given[col] != "").all(), col


def test_senate_control_day_rows_sum_to_100_and_name_the_controller():
    d = pd.read_csv(PROCESSED / "senate_control_day.csv")
    assert set(d.congress) == {107, 117}
    assert (d[["dem", "gop", "ind", "other", "vacant"]].sum(axis=1) == 100).all()
    for r in d.itertuples():
        side = {"DEM": r.dem + r.ind_with_dem, "GOP": r.gop + r.ind_with_gop}[r.controller]
        other = {"DEM": r.gop + r.ind_with_gop, "GOP": r.dem + r.ind_with_dem}[r.controller]
        assert side > other or (side == other and r.control_basis == "vice_president")
        assert str(r.source_url).startswith("https://") and str(r.accessed_at)
