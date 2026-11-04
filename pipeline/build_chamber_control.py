"""Build data/processed/chamber_control.csv and independents.csv.

House: Office of the Historian, "Party Divisions of the House of Representatives",
which gives divisions "as of the initial election results for a particular Congress".
Senate: Senate Historical Office, "Party Division" (archived copy). We take the
first dated row of each Congress's 1st session, which is the division on the
opening day, and that row's header order for the majority party.
"""
from __future__ import annotations

import html
import re
from datetime import date

import pandas as pd

from common import (
    FIRST_CONGRESS, LAST_CONGRESS, MANUAL, PROVISIONAL_YEAR, RAW, congress_number,
    election_year, html_rows, is_midterm, load_2026, load_presidents, president_on,
    write_csv, years_served,
)

IND_LABELS = {"independent", "independents", "independent democrat", "independent democrats"}
PARTY_WORDS = {"democrats": "DEM", "republicans": "GOP"}


def _ind_or_other(label: str) -> str:
    return "ind" if label.strip().lower() in IND_LABELS else "other"


def parse_house(first: int = FIRST_CONGRESS - 1) -> pd.DataFrame:
    rows = []
    for cells in html_rows(RAW / "house_historian" / "party_divisions.html"):
        n = congress_number(cells[0]) if cells else None
        if n is None or n < first or len(cells) < 5:
            continue
        # Footnote markers are glued to the number ("4363" = 436, footnote 3).
        total = int(re.match(r"(4\d\d)", cells[1]).group(1))
        rec = {"congress": n, "total_seats": total, "dem": int(cells[2]), "gop": int(cells[3]),
               "ind": 0, "other": 0, "other_detail": ""}
        if cells[4].strip() != "0":
            parts = re.findall(r"([A-Za-z][A-Za-z\- ]*?)\s*\((\d+)\)", cells[4])
            if not parts:
                raise ValueError(f"cannot parse House 'Other' cell for {n}: {cells[4]!r}")
            for label, k in parts:
                rec[_ind_or_other(label)] += int(k)
            rec["other_detail"] = "; ".join(f"{l.strip()} ({k})" for l, k in parts)
        rec["vacant"] = total - rec["dem"] - rec["gop"] - rec["ind"] - rec["other"]
        rec["majority_party"] = "DEM" if rec["dem"] > rec["gop"] else "GOP"
        rows.append(rec)
    df = pd.DataFrame(rows).drop_duplicates("congress")
    df["chamber"] = "house"
    df["source_id"] = "house_historian_party_divisions"
    return df


def _text(fragment: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", fragment))).strip()


def _tag(block: str, tag: str) -> str:
    m = re.search(rf"<{tag}>(.*?)</{tag}>", block, re.S)
    if not m:
        raise ValueError(f"<{tag}> not found")
    return _text(m.group(1))


def parse_senate(first: int = FIRST_CONGRESS - 1) -> pd.DataFrame:
    page = (RAW / "senate" / "party_division.html").read_text(encoding="utf-8", errors="replace")
    rows = []
    for block in page.split('<tr class="view"')[1:]:
        n = congress_number(_tag(block, "date"))
        if n is None or n < first:
            continue
        first_table = block[block.index("<table>"): block.index("</table>")]
        headers = [_text(h) for h in re.findall(r"<header>(.*?)</header>", first_table, re.S)]
        body = first_table[first_table.index("<tbody>"):]
        first_row = body[: body.index("</tr>")]
        p1, p2 = (PARTY_WORDS[h.lower()] for h in headers[1:3])
        rec = {"congress": n, "dem": 0, "gop": 0, "ind": 0, "other": 0}
        rec[p1.lower()] = int(_tag(first_row, "party1"))
        rec[p2.lower()] = int(_tag(first_row, "party2"))
        other = _tag(first_row, "other_party")
        details = []
        for k, label in re.findall(r"(\d+)\s*([A-Za-z][A-Za-z ]*)?", other):
            if int(k) == 0:
                continue
            if not label:
                raise ValueError(f"unlabelled 'Other' count in Senate {n}: {other!r}")
            rec[_ind_or_other(label)] += int(k)
            details.append(f"{label.strip()} ({k})")
        rec["other_detail"] = "; ".join(details)
        rec["vacant"] = int(_tag(first_row, "vacancies"))
        rec["total_seats"] = int(_tag(first_row, "total"))
        # The Senate lists the majority party first in each session table.
        rec["majority_party"] = p1
        rec["opening_date"] = _text(re.search(r"<date>(.*?)</date>", first_row, re.S).group(1))
        rows.append(rec)
    df = pd.DataFrame(rows)
    df["chamber"] = "senate"
    df["source_id"] = "senate_party_division"
    return df


def provisional_rows() -> pd.DataFrame:
    m = load_2026()
    m = m[m.record_type == "chamber_seats"]
    rows = []
    for r in m.itertuples():
        rows.append({
            "congress": LAST_CONGRESS, "chamber": r.chamber,
            "total_seats": 435 if r.chamber == "house" else 100,
            **{k: (int(getattr(r, k)) if pd.notna(getattr(r, k)) else pd.NA)
               for k in ("dem", "gop", "ind", "other", "vacant")},
            "majority_party": pd.NA, "other_detail": "",
            "source_id": "manual_2026_provisional",
        })
    df = pd.DataFrame(rows)
    for r in df.itertuples():
        if pd.notna(r.dem) and pd.notna(r.gop):
            half = r.total_seats // 2
            df.loc[r.Index, "majority_party"] = "DEM" if r.dem > half else "GOP" if r.gop > half else pd.NA
    return df


def build() -> pd.DataFrame:
    presidents = load_presidents()
    hist = all_congresses()
    df =pd.concat([hist[hist.congress >= FIRST_CONGRESS], provisional_rows()], ignore_index=True)
    df["election_year"] = df.congress.map(election_year)
    df["years_served"] = df.congress.map(years_served)
    df["majority_threshold"] = df.total_seats // 2 + 1
    # President in office on 20 January of the Congress's first year (after any inauguration).
    pres = df.election_year.map(lambda y: president_on(date(y + 1, 1, 20), presidents))
    df["president"] = pres.str[0]
    df["president_party"] = pres.str[1]
    df["is_midterm"] = df.election_year.map(is_midterm)
    df["is_provisional"] = df.election_year >= PROVISIONAL_YEAR
    cols = ["congress", "election_year", "years_served", "chamber", "total_seats", "dem", "gop",
            "ind", "other", "vacant", "majority_party", "majority_threshold", "president",
            "president_party", "is_midterm", "is_provisional", "source_id"]
    df = df.sort_values(["congress", "chamber"])
    for c in ("dem", "gop", "ind", "other", "vacant"):
        df[c] = df[c].astype("Int64")
    write_csv(df[cols], "chamber_control.csv")

    # Detail table: what "other"/"ind" contain, per Congress, as the source labels them.
    detail = df[df.other_detail.fillna("") != ""][["congress", "chamber", "other_detail", "source_id"]]
    write_csv(detail, "chamber_other_detail.csv")

    ind = pd.read_csv(MANUAL / "independents.csv")
    write_csv(ind[["chamber", "congress", "name", "state_po", "label_in_source", "caucuses_with",
                   "verified_in_source", "source_url", "note"]], "independents.csv")
    return df


def all_congresses() -> pd.DataFrame:
    """House and Senate from the 79th Congress on (the 79th is needed for 1946 swings)."""
    return pd.concat([parse_house(), parse_senate()], ignore_index=True)


if __name__ == "__main__":
    build()
