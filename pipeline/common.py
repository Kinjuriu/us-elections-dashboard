"""Shared paths, reference tables and helpers for the pipeline scripts."""
from __future__ import annotations

import re
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
MANUAL = ROOT / "data" / "manual"
PROCESSED = ROOT / "data" / "processed"

FIRST_CONGRESS, LAST_CONGRESS = 80, 120  # elected 1946 to 2026
PROVISIONAL_YEAR = 2026

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

# Candidate rows in MEDSL that are ballot bookkeeping, not votes for anyone.
NON_VOTE_RE = re.compile(r"OVER ?VOTE|UNDER ?VOTE|^BLANK|BLANK VOTE|^VOID|SPOILED|EXHAUSTED", re.I)

# Ballot labels for independents that MEDSL records as a personal party name.
PERSONAL_INDEPENDENT_LABELS = {"CONNECTICUT FOR LIEBERMAN", "INDEPENDENT FOR MAINE"}


def election_year(congress: int) -> int:
    """The November election that chose this Congress (80th -> 1946)."""
    return 1786 + 2 * congress


def years_served(congress: int) -> str:
    start = election_year(congress) + 1
    return f"{start}-{start + 2}"


def is_midterm(year: int) -> bool:
    return year % 4 == 2


def election_day(year: int) -> date:
    """First Tuesday after the first Monday in November."""
    d = date(year, 11, 2)
    while d.weekday() != 1:  # Tuesday
        d = d.replace(day=d.day + 1)
    return d


def normalise_party(label) -> str | None:
    """Map a MEDSL party label to DEM, GOP, IND or OTHER (None if missing)."""
    if label is None or (isinstance(label, float) and pd.isna(label)) or str(label).strip() == "":
        return None
    p = str(label).upper().strip()
    if "DEMOCRAT" in p:  # DEMOCRAT, DEMOCRATIC, DEMOCRATIC-FARMER-LABOR, DEMOCRATIC-NPL
        return "DEM"
    if "REPUBLICAN" in p:
        return "GOP"
    if p in ("INDEPENDENT", "NO PARTY AFFILIATION", "UNAFFILIATED", "NONAFFILIATED") or p in PERSONAL_INDEPENDENT_LABELS:
        return "IND"
    return "OTHER"


def load_presidents() -> pd.DataFrame:
    df = pd.read_csv(MANUAL / "presidents.csv", parse_dates=["term_start", "term_end"])
    return df


def president_on(when: date, presidents: pd.DataFrame) -> tuple[str, str]:
    ts = pd.Timestamp(when)
    for row in presidents.itertuples():
        end = row.term_end if not pd.isna(row.term_end) else pd.Timestamp.max
        if row.term_start <= ts < end:
            return row.president, row.party
    raise ValueError(f"no president on {when}")


class TableParser(HTMLParser):
    """Collect every <tr> as a list of cell texts (stdlib only, no lxml)."""

    def __init__(self):
        super().__init__()
        self.rows: list[list[str]] = []
        self._row = None
        self._cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = ""
        elif tag == "br" and self._cell is not None:
            self._cell += " | "

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None:
            self._row.append(re.sub(r"\s+", " ", self._cell).strip())
            self._cell = None
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell += data


def html_rows(path: Path) -> list[list[str]]:
    p = TableParser()
    p.feed(path.read_text(encoding="utf-8", errors="replace"))
    return p.rows


def congress_number(text: str) -> int | None:
    m = re.match(r"\s*(\d+)(st|nd|rd|th)\b", text)
    return int(m.group(1)) if m else None


def write_csv(df: pd.DataFrame, name: str) -> Path:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    out = PROCESSED / name
    df.to_csv(out, index=False, lineterminator="\n")
    print(f"wrote {out.relative_to(ROOT)} ({len(df)} rows)")
    return out


def load_2026() -> pd.DataFrame:
    return pd.read_csv(MANUAL / "2026_provisional.csv", dtype={"state_po": "string"})
