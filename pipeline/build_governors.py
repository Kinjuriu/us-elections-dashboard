"""Build governors_terms.csv and governors_by_year.csv from Wikipedia's
"List of governors of <State>" pages (CC BY-SA 4.0, see data/SOURCES.md).

Inputs:  data/raw/wikipedia_governors/<PO>.html (from download.py),
         data/manual/governor_party_changes.csv (mid-term party switches, from the pages' footnotes)
Outputs: data/processed/governors_terms.csv    one row per term overlapping 2000 to 2025
         (party is D, R or I; party_detail is Wikipedia's wording)
         data/processed/governors_by_year.csv  the governor in office on 1 January of each year

Dates are as the pages give them. Some pages end a term on the last day in office
and some on the day the successor starts, so consecutive terms are 0 or 1 days apart.
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime
from html.parser import HTMLParser

import pandas as pd

from common import MANUAL, PROCESSED, RAW, STATES, write_csv

FIRST_YEAR, LAST_YEAR = 2000, 2025
# Wikipedia's party wording grouped for the map. Any other wording stops the build.
PARTY_GROUP = {
    "Democratic": "D",
    "Democratic-Farmer-Labor": "D",
    "Republican": "R",
    "Independent": "I",
    "Reform/Independence": "I",  # Jesse Ventura, Minnesota
}
DATE_RE = re.compile(r"([A-Z][a-z]+ \d{1,2}, \d{4})")


class _Tables(HTMLParser):
    """Top-level tables as rows of cells {text, rowspan, colspan}. Footnote marks are dropped."""

    def __init__(self):
        super().__init__()
        self.tables, self.depth, self.table, self.row, self.cell, self.skip = [], 0, None, None, None, 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "table":
            self.depth += 1
            if self.depth == 1:
                self.table = []
        elif self.table is None or self.depth > 1:
            return
        elif tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            span = lambda k: int(re.sub(r"\D", "", a.get(k, "1")) or 1)  # noqa: E731
            self.cell = {"text": "", "rs": span("rowspan"), "cs": span("colspan")}
        elif tag in ("sup", "style"):
            self.skip += 1
        elif tag == "br" and self.cell is not None:
            self.cell["text"] += " | "

    def handle_endtag(self, tag):
        if tag == "table":
            if self.depth == 1 and self.table is not None:
                self.tables.append(self.table)
                self.table = None
            self.depth -= 1
        elif self.depth > 1:
            return
        elif tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(self.cell)
            self.cell = None
        elif tag == "tr" and self.row is not None and self.table is not None:
            self.table.append(self.row)
            self.row = None
        elif tag in ("sup", "style") and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if self.cell is not None and not self.skip and self.depth == 1:
            self.cell["text"] += data


def _text(cell: dict) -> str:
    return re.sub(r"\s+", " ", cell["text"]).strip()


def expand(rows: list[list[dict]]) -> list[list[str]]:
    """Fill rowspans and colspans so every row has one text per column."""
    out, pending = [], {}  # pending: column -> (text, rows still to fill)
    for cells in rows:
        line, col, i = [], 0, 0
        while i < len(cells) or col in pending:
            if col in pending:
                txt, left = pending[col]
                line.append(txt)
                if left > 1:
                    pending[col] = (txt, left - 1)
                else:
                    del pending[col]
                col += 1
                continue
            cell = cells[i]
            i += 1
            for _ in range(cell["cs"]):
                line.append(_text(cell))
                if cell["rs"] > 1:
                    pending[col] = (_text(cell), cell["rs"] - 1)
                col += 1
        out.append(line)
    return out


def clean_party(text: str) -> str:
    text = re.sub(r"\s*\|\s*", " ", text)
    return re.sub(r"([-/]) ", r"\1", text).strip()


def parse_state(po: str) -> list[dict]:
    """Every governor term in the state's statehood-era table, with the party or parties listed."""
    parser = _Tables()
    parser.feed((RAW / "wikipedia_governors" / f"{po}.html").read_text(encoding="utf-8"))
    found = []
    for rows in parser.tables:
        hdr = [_text(c) for c in rows[0]]
        if "Party" in hdr and "Term in office" in hdr and "Governor" in hdr:
            found.append(expand(rows))
    if len(found) != 1:
        raise SystemExit(f"{po}: expected one governors table, found {len(found)}")
    grid = found[0]
    hdr = grid[0]
    term_i, party_i = hdr.index("Term in office"), hdr.index("Party")
    name_cols = [i for i, h in enumerate(hdr) if h == "Governor"]

    terms: dict[tuple[str, str], list[str]] = {}
    for row in grid[1:]:  # the table repeats a governor's row once per lieutenant governor
        name = next((row[i].split(" | ")[0].strip() for i in name_cols if row[i]), "")
        term = row[term_i]
        party = clean_party(row[party_i])
        parties = terms.setdefault((name, term), [])
        if party not in parties:
            parties.append(party)

    out = []
    for (name, term), parties in terms.items():
        if "Governor-elect" in term:
            continue  # takes office after 2025
        dates = DATE_RE.findall(term)
        if not dates:
            if "Died before" in term:
                continue  # never took office
            if re.search(r"\b(1[89]\d\d)\b", term) and not re.search(r"\b(19[9]\d|20\d\d)\b", term):
                continue  # month-only dates in the 1700s and 1800s
            raise SystemExit(f"{po}: cannot read term {name!r}: {term!r}")
        if len(dates) > 2:
            raise SystemExit(f"{po}: more than two dates in term {name!r}: {term!r}")
        start = datetime.strptime(dates[0], "%B %d, %Y").date()
        if len(dates) == 2:
            end = datetime.strptime(dates[1], "%B %d, %Y").date()
        elif "Incumbent" in term:
            end = None
        elif start.year < 1950:
            continue  # month-only end date, long before the window
        else:
            raise SystemExit(f"{po}: term has one date and is not marked Incumbent: {name!r}: {term!r}")
        if start > date(LAST_YEAR, 12, 31) or (end and end < date(FIRST_YEAR, 1, 1)):
            continue
        out.append({"state_po": po, "governor": name, "parties": parties, "took_office": start, "left_office": end})
    return out


def group(po: str, detail: str) -> str:
    if detail not in PARTY_GROUP:
        raise SystemExit(f"{po}: party {detail!r} has no group in PARTY_GROUP")
    return PARTY_GROUP[detail]


def main() -> None:
    manifest = json.loads((RAW / "manifest.json").read_text())
    changes = pd.read_csv(MANUAL / "governor_party_changes.csv", dtype=str)
    used = set()

    rows = []
    for po in STATES:
        url = manifest[f"wikipedia_governors_{po}"]["url"]
        for t in sorted(parse_state(po), key=lambda t: t["took_office"]):
            party, note = t["parties"][0], ""
            if len(t["parties"]) > 1 or ((changes.state_po == po) & (changes.governor == t["governor"])).any():
                ch = changes[(changes.state_po == po) & (changes.governor == t["governor"])]
                if ch.empty:
                    raise SystemExit(f"{po}: {t['governor']} lists parties {t['parties']} but has no row in governor_party_changes.csv")
                c = ch.iloc[0]
                if c.party_from != party or (len(t["parties"]) > 1 and t["parties"][1] != c.party_to):
                    raise SystemExit(f"{po}: {t['governor']} parties {t['parties']} do not match governor_party_changes.csv")
                note = f"Changed to {c.party_to} in {c.effective}"
                used.add((po, t["governor"]))
            rows.append({**{k: t[k] for k in ("state_po", "governor")}, "party": group(po, party), "party_detail": party,
                         "took_office": t["took_office"], "left_office": t["left_office"],
                         "source_url": url, "party_note": note})
    unused = set(zip(changes.state_po, changes.governor)) - used
    if unused:
        raise SystemExit(f"governor_party_changes.csv rows matched no term: {sorted(unused)}")

    terms = pd.DataFrame(rows).sort_values(["state_po", "took_office"]).reset_index(drop=True)
    terms["took_office"] = terms.took_office.astype(str)
    terms["left_office"] = terms.left_office.map(lambda d: "" if d is None or pd.isna(d) else str(d))
    write_csv(terms, "governors_terms.csv")

    # Governor in office on 1 January: the latest start on or before that day, and not yet ended.
    by_year = []
    for year in range(FIRST_YEAR, LAST_YEAR + 1):
        jan1 = str(date(year, 1, 1))
        for po, grp in terms.groupby("state_po"):
            live = grp[(grp.took_office <= jan1) & ((grp.left_office == "") | (grp.left_office >= jan1))]
            if live.empty:
                raise SystemExit(f"{po} {year}: no governor in office on {jan1}")
            g = live.sort_values("took_office").iloc[-1]
            detail = g.party_detail
            ch = changes[(changes.state_po == po) & (changes.governor == g.governor)]
            if not ch.empty and int(ch.iloc[0].effective[:4]) < year:  # switch came before this 1 January
                detail = ch.iloc[0].party_to
            by_year.append({"year": year, "state_po": po, "governor": g.governor, "party": group(po, detail),
                            "party_detail": detail, "took_office": g.took_office})
    write_csv(pd.DataFrame(by_year), "governors_by_year.csv")


if __name__ == "__main__":
    main()
