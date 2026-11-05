"""Build who serves in Congress: members, women and age, 80th to 119th Congress.

Source: unitedstates/congress-legislators (CC0), legislators-current and
legislators-historical YAML. Outputs in data/processed/:

  members_by_congress.csv      one row per member per chamber per Congress
  women_by_congress.csv        women and men by party, any-time-in-Congress counts
  age_by_congress.csv          median age and age bands

Rules
- "Served in the Congress" means a term overlapped the Congress at any point
  (start before the Congress ends, end after it begins). Members who died,
  resigned or joined mid-Congress count once, so House totals exceed 435.
- Voting seats only: delegates and resident commissioners (DC, PR, GU, VI, AS,
  MP, the Philippines) and the territorial delegates of Alaska and Hawaii
  before statehood (terms ending on or before 3 January 1959) are excluded.
- Party is the party on the member's first day of service in that Congress
  (after any switch recorded in `party_affiliations`). DEM and GOP cover
  Democrat, Republican and their fusion labels; IND is Independent or
  Ind. Democrat; OTHER is everything else.
- age_at_start is whole years on the Congress's opening date (3 January of its
  first year), even for members who joined later. Missing birthdays stay null.
- Opening-day counts are not built. The source holds only a term start date, and
  for some Congresses it gives that date to members who joined later (the 86th
  House has 447 terms starting on opening day for 435 seats, including both Hawaii's
  delegate and its first member), so a reliable opening-day roster cannot be derived.
"""
from __future__ import annotations

from datetime import date

import pandas as pd
import yaml

from common import RAW, STATES, write_csv

FIRST, LAST = 80, 119
SRC = RAW / "congress_legislators"
STATEHOOD_CUTOFF = "1959-01-03"  # Alaska and Hawaii delegate terms end by this date


def congress_start(n: int) -> date:
    return date(1787 + 2 * n, 1, 3)


def map_party(label: str | None) -> str | None:
    if not label:
        return None
    if label in ("Independent", "Ind. Democrat"):
        return "IND"
    if label.startswith("Democrat"):
        return "DEM"
    if label.startswith("Republican"):
        return "GOP"
    return "OTHER"


def party_on(term: dict, day: str) -> str | None:
    """Party label on a date, following recorded switches inside the term."""
    for a in term.get("party_affiliations") or []:
        if a["start"] <= day <= a["end"]:
            return a["party"]
    return term.get("party")


def load_people() -> list[dict]:
    people = []
    for name in ("legislators-current.yaml", "legislators-historical.yaml"):
        people += yaml.load((SRC / name).read_text(), Loader=yaml.CSafeLoader)
    return people


def is_voting(t: dict) -> bool:
    if t["state"] not in STATES:
        return False
    if t["state"] in ("AK", "HI") and t["type"] == "rep" and t["end"] <= STATEHOOD_CUTOFF:
        return False
    return True


def build_members() -> pd.DataFrame:
    rows = []
    for p in load_people():
        bio = p["bio"]
        bday = bio.get("birthday")
        gender = bio.get("gender")
        name = p["name"].get("official_full") or f"{p['name'].get('first', '')} {p['name']['last']}".strip()
        for n in range(FIRST, LAST + 1):
            c0, c1 = congress_start(n), congress_start(n + 1)
            by_chamber: dict[str, list[dict]] = {}
            for t in p["terms"]:
                if is_voting(t) and t["start"] < c1.isoformat() and t["end"] > c0.isoformat():
                    by_chamber.setdefault(t["type"], []).append(t)
            for kind, terms in by_chamber.items():
                first = min(terms, key=lambda t: t["start"])
                day = max(first["start"], c0.isoformat())
                birth_year = int(bday[:4]) if bday else None
                age = None
                if bday:
                    b = date.fromisoformat(bday)
                    age = c0.year - b.year - ((c0.month, c0.day) < (b.month, b.day))
                rows.append({
                    "congress": n,
                    "chamber": "house" if kind == "rep" else "senate",
                    "bioguide_id": p["id"].get("bioguide"),
                    "name": name,
                    "party": map_party(party_on(first, day)),
                    "state_po": first["state"],
                    "gender": gender,
                    "birth_year": birth_year,
                    "age_at_start": age,
                        })
    df = pd.DataFrame(rows).sort_values(["congress", "chamber", "state_po", "name"]).reset_index(drop=True)
    for col in ("birth_year", "age_at_start"):
        df[col] = df[col].astype("Int64")
    return df


def women_table(m: pd.DataFrame) -> pd.DataFrame:
    out = []
    for (n, ch), g in m.groupby(["congress", "chamber"]):
        w = g[g.gender == "F"]
        out.append({
            "congress": n, "start_year": congress_start(n).year, "chamber": ch,
            "women": len(w), "men": int((g.gender == "M").sum()),
            "women_dem": int((w.party == "DEM").sum()), "women_gop": int((w.party == "GOP").sum()),
            "women_other": int((~w.party.isin(["DEM", "GOP"])).sum()),
        })
    t = pd.DataFrame(out)
    t["share_women"] = (t.women / (t.women + t.men)).round(4)
    return t


def age_table(m: pd.DataFrame) -> pd.DataFrame:
    out = []
    for (n, ch), g in m.groupby(["congress", "chamber"]):
        a = g.age_at_start.dropna().astype(float)
        out.append({
            "congress": n, "chamber": ch, "median_age": float(a.median()),
            "share_under_45": round((a < 45).mean(), 4),
            "share_45_64": round(((a >= 45) & (a < 65)).mean(), 4),
            "share_65_plus": round((a >= 65).mean(), 4),
        })
    return pd.DataFrame(out)


def main() -> None:
    m = build_members()
    public = m
    write_csv(public, "members_by_congress.csv")
    write_csv(women_table(m), "women_by_congress.csv")
    write_csv(age_table(m), "age_by_congress.csv")
    miss = public.age_at_start.isna().sum()
    print(f"members with no birthday (age left null): {miss}; no gender: {public.gender.isna().sum()}")


if __name__ == "__main__":
    main()
