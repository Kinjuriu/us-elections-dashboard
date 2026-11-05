"""Build data/processed/firsts.csv from data/manual/firsts.csv.

A first is entered only when a reliable source states it (see the step 10
prompt). This script checks the rows; it never adds one. Every 2026 row is
provisional until states certify.
"""
from __future__ import annotations

import pandas as pd

from common import MANUAL, PROVISIONAL_YEAR, write_csv

COLUMNS = ["year", "office", "state_po", "person", "party", "first", "scope", "votes", "vote_share",
           "margin", "source_url", "source_publisher", "article_url", "article_title",
           "article_publisher", "article_date", "accessed_at", "verified"]
OFFICE_GROUPS = {"governor": "governors", "senator": "senate", "representative": "house"}


def build() -> pd.DataFrame:
    df = pd.read_csv(MANUAL / "firsts.csv", dtype=str, keep_default_na=False)
    if list(df.columns) != COLUMNS:
        raise ValueError(f"firsts.csv columns must be {COLUMNS}")
    df["year"] = df.year.astype(int) if len(df) else df.year
    df["group"] = df.office.str.lower().map(OFFICE_GROUPS).fillna("other")
    df["provisional"] = df.year >= PROVISIONAL_YEAR if len(df) else pd.Series(dtype=bool)
    return df


if __name__ == "__main__":
    write_csv(build(), "firsts.csv")
