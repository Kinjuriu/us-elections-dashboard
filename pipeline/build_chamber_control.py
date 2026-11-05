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
    # The Historian gives one division per Congress and no House majority changed
    # hands during a Congress in this period (checked against "Party Government").
    df["majority_party_most_of_congress"] = df.majority_party
    df["majority_note"] = ""
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


def _date(text: str) -> date | None:
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text or "")
    return date(int(m.group(3)), int(m.group(1)), int(m.group(2))) if m else None


def congress_span(n: int) -> tuple[date, date]:
    start = election_year(n) + 1
    return date(start, 1, 3), date(start + 2, 1, 3)


def parse_senate_rows(first: int = FIRST_CONGRESS - 1) -> pd.DataFrame:
    """Every dated row of every session table on the Senate's party division page.

    Each session table lists the majority party first. A row with no date takes
    the start of its session table; a date outside the Congress (e.g. "6/15/1959"
    inside the 87th) is a typo in the source and takes the previous row's date.
    """
    page = (RAW / "senate" / "party_division.html").read_text(encoding="utf-8", errors="replace")
    rows = []
    for block in page.split('<tr class="view"')[1:]:
        n = congress_number(_tag(block, "date"))
        if n is None or n < first:
            continue
        lo, hi = congress_span(n)
        footnotes = _text(block[block.find("<footnote>"):]) if "<footnote>" in block else ""
        prev = lo
        for t, table in enumerate(re.findall(r"<table>(.*?)</table>", block, re.S)):
            headers = [_text(h) for h in re.findall(r"<header>(.*?)</header>", table, re.S)]
            p1, p2 = (PARTY_WORDS[h.lower()] for h in headers[1:3])
            table_start = _date(headers[0]) or prev
            body = table[table.index("<tbody>"):]
            for r, row in enumerate(re.findall(r"<tr>(.*?)</tr>", body, re.S)):
                d = _date(_tag(row, "date")) or table_start
                if not lo <= d <= hi or d < prev:
                    d = prev
                prev = d
                rec = {"congress": n, "table": t, "row": r, "table_start": table_start, "as_of": d,
                       "majority_party": p1, "dem": 0, "gop": 0, "ind": 0, "other": 0}
                rec[p1.lower()] = int(_tag(row, "party1"))
                rec[p2.lower()] = int(_tag(row, "party2"))
                other = _tag(row, "other_party")
                details = []
                for k, label in re.findall(r"(\d+)\s*([A-Za-z][A-Za-z ]*)?", other):
                    if int(k) == 0:
                        continue
                    if not label:
                        # Only the 107th leaves the label off (Jeffords, then Barkley);
                        # its footnotes name both as independents.
                        if "Independent" not in footnotes:
                            raise ValueError(f"unlabelled 'Other' count in Senate {n}: {other!r}")
                        label = "Independent"
                    rec[_ind_or_other(label)] += int(k)
                    details.append(f"{label.strip()} ({k})")
                rec["other_detail"] = "; ".join(details)
                rec["total_seats"] = int(_tag(row, "total"))
                vac = _tag(row, "vacancies")
                # One 97th Congress row leaves the vacancy cell empty; it is the remainder.
                rec["vacant"] = int(vac) if vac else (
                    rec["total_seats"] - rec["dem"] - rec["gop"] - rec["ind"] - rec["other"])
                rows.append(rec)
    return pd.DataFrame(rows)


# Notes for Congresses where Senate control changed hands, from the footnotes of
# the Senate's party division page. build() checks that these are exactly the
# Congresses whose session tables change majority party.
SENATE_MAJORITY_NOTES = {
    107: ("Opening day 50 D, 50 R: Democratic from 3 to 20 January 2001 through outgoing "
          "Vice President Gore's tie-breaking vote; Republican from 20 January 2001 through "
          "Vice President Cheney's; Democratic from 6 June 2001, after Jim Jeffords left the "
          "Republicans to sit as an independent caucusing with the Democrats."),
    117: ("Opening day 51 R, 46 D, 2 independents, 1 vacant: Republican until the Georgia "
          "runoff winners were seated. Democratic from 20 January 2021, with both independents "
          "caucusing with the Democrats and Vice President Harris's tie-breaking vote."),
}


def senate_majority_most_of_congress(rows: pd.DataFrame) -> pd.DataFrame:
    """The majority party that held the Senate for the most days of each Congress."""
    out = []
    for n, g in rows.groupby("congress"):
        lo, hi = congress_span(n)
        periods = g.groupby("table").agg(start=("table_start", "first"), party=("majority_party", "first"))
        periods = periods.sort_values("start")
        ends = list(periods.start.iloc[1:]) + [hi]
        days = {}
        for (start, party), end in zip(periods[["start", "party"]].itertuples(index=False), ends):
            days[party] = days.get(party, 0) + (end - max(start, lo)).days
        out.append({"congress": n, "majority_party_most_of_congress": max(days, key=days.get),
                    "majority_changed": periods.party.nunique() > 1})
    return pd.DataFrame(out)


def parse_senate(first: int = FIRST_CONGRESS - 1) -> pd.DataFrame:
    rows = parse_senate_rows(first)
    # Opening day: the first row of the first session table.
    df = rows[(rows.table == 0) & (rows.row == 0)].drop(columns=["table", "row", "table_start", "as_of"])
    df = df.merge(senate_majority_most_of_congress(rows), on="congress")
    changed = set(df[df.majority_changed].congress)
    if changed != set(SENATE_MAJORITY_NOTES):
        raise ValueError(f"Senate majority changed in {sorted(changed)}; notes exist for {sorted(SENATE_MAJORITY_NOTES)}")
    df["majority_note"] = df.congress.map(SENATE_MAJORITY_NOTES).fillna("")
    df = df.drop(columns="majority_changed").reset_index(drop=True)
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
            "majority_party": pd.NA, "majority_party_most_of_congress": pd.NA,
            "majority_note": "", "other_detail": "",
            "source_id": "manual_2026_provisional",
        })
    df = pd.DataFrame(rows)
    for r in df.itertuples():
        if pd.notna(r.dem) and pd.notna(r.gop):
            half = r.total_seats // 2
            df.loc[r.Index, "majority_party"] = "DEM" if r.dem > half else "GOP" if r.gop > half else pd.NA
    df["majority_party_most_of_congress"] = df.majority_party
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
            "ind", "other", "vacant", "majority_party", "majority_party_most_of_congress",
            "majority_note", "majority_threshold", "president",
            "president_party", "is_midterm", "is_provisional", "source_id"]
    df = df.sort_values(["congress", "chamber"])
    for c in ("dem", "gop", "ind", "other", "vacant"):
        df[c] = df[c].astype("Int64")
    write_csv(df[cols], "chamber_control.csv")

    # Detail table: what "other"/"ind" contain, per Congress, as the source labels them.
    detail = df[df.other_detail.fillna("") != ""][["congress", "chamber", "other_detail", "source_id"]]
    write_csv(detail, "chamber_other_detail.csv")

    write_csv(senate_control_day(), "senate_control_day.csv")

    ind = pd.read_csv(MANUAL / "independents.csv")
    write_csv(ind[["chamber", "congress", "name", "state_po", "label_in_source", "caucuses_with",
                   "verified_in_source", "source_url", "note"]], "independents.csv")
    return df


def senate_control_day() -> pd.DataFrame:
    """Senate counts on the day control was settled, where that differs from opening day.

    data/manual/senate_control_day.csv holds one row per Congress. Each row must
    equal a dated row of the Senate's own session tables, which this checks.
    """
    m = pd.read_csv(MANUAL / "senate_control_day.csv", parse_dates=["as_of"])
    rows = parse_senate_rows()
    for r in m.itertuples():
        hit = rows[(rows.congress == r.congress) & (pd.to_datetime(rows.as_of) == r.as_of)]
        if len(hit) != 1:
            raise ValueError(f"senate_control_day: no dated row for Congress {r.congress} on {r.as_of:%Y-%m-%d}")
        h = hit.iloc[0]
        for k in ("dem", "gop", "ind", "other", "vacant"):
            if int(getattr(r, k)) != int(h[k]):
                raise ValueError(f"senate_control_day: {k} is {getattr(r, k)} but the Senate table says {h[k]} ({r.congress})")
        if r.ind_with_dem + r.ind_with_gop > r.ind:
            raise ValueError(f"senate_control_day: more caucusing independents than independents ({r.congress})")
        if r.dem + r.gop + r.ind + r.other + r.vacant != 100:
            raise ValueError(f"senate_control_day: seats do not sum to 100 ({r.congress})")
    m["as_of"] = m.as_of.dt.strftime("%Y-%m-%d")
    return m.drop(columns=["note"])


def all_congresses() -> pd.DataFrame:
    """House and Senate from the 79th Congress on (the 79th is needed for 1946 swings)."""
    return pd.concat([parse_house(), parse_senate()], ignore_index=True)


if __name__ == "__main__":
    build()
