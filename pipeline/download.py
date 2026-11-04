"""Download every raw source file into data/raw/.

Raw files are never edited by hand. Each download is recorded in
data/raw/manifest.json with its URL, access time and SHA-256, so a re-run
can be compared against the files used for the last build.

Usage:  python pipeline/download.py [--force]
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
MANIFEST = RAW / "manifest.json"

USER_AGENT = "us-congress-dashboard-pipeline/0.1 (historical election data project)"

# The Senate's own page (senate.gov) answers scripted requests with HTTP 403,
# so we read a pinned Internet Archive capture of it. The "id_" suffix returns
# the page exactly as archived, without the Wayback toolbar.
SENATE_SNAPSHOT = "20261102191213"
SENATE_URL = "https://www.senate.gov/about/parties-leadership/party-division.htm"

SOURCES = [
    {
        "source_id": "house_historian_party_divisions",
        "url": "https://history.house.gov/Institution/Party-Divisions/Party-Divisions/",
        "path": "house_historian/party_divisions.html",
    },
    {
        "source_id": "house_historian_presidents",
        "url": "https://history.house.gov/Institution/Presidents-Coinciding/Presidents-Coinciding/",
        "path": "house_historian/presidents_coinciding.html",
    },
    {
        "source_id": "house_historian_party_government",
        "url": "https://history.house.gov/Institution/Presidents-Coinciding/Party-Government/",
        "path": "house_historian/party_government.html",
    },
    {
        "source_id": "senate_party_division",
        "url": f"https://web.archive.org/web/{SENATE_SNAPSHOT}id_/{SENATE_URL}",
        "path": "senate/party_division.html",
    },
    {
        "source_id": "medsl_senate",
        "url": "https://dataverse.harvard.edu/api/access/datafile/13887039?format=original",
        "path": "medsl/1976-2024-senate-state.csv",
    },
    {
        "source_id": "medsl_senate_meta",
        "url": "https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/PEJ5QU",
        "path": "medsl/senate_dataset_metadata.json",
    },
    {
        "source_id": "medsl_house_meta",
        "url": "https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=doi:10.7910/DVN/IG0UN2",
        "path": "medsl/house_dataset_metadata.json",
    },
]

# Files that cannot be scripted and must be placed in data/raw/ by hand.
MANUAL_RAW = [
    {
        "source_id": "medsl_house",
        "path": "medsl/1976-2024-house.tab",
        "how": (
            "The MEDSL House file sits behind a Dataverse guestbook (name, email, "
            "institution, position). Download '1976-2024-house.tab' from "
            "https://doi.org/10.7910/DVN/IG0UN2 in a browser and save it as "
            "data/raw/medsl/1976-2024-house.tab"
        ),
    },
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch(url: str) -> bytes:
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=120)
    r.raise_for_status()
    body = r.content
    # Wayback "id_" captures can arrive still gzip-encoded.
    if body[:2] == b"\x1f\x8b":
        body = gzip.decompress(body)
    return body


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-download files that already exist")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    failures = []

    for src in SOURCES:
        dest = RAW / src["path"]
        if dest.exists() and not args.force:
            print(f"skip  {src['path']} (exists)")
            continue
        try:
            body = fetch(src["url"])
        except requests.RequestException as e:
            failures.append(f"{src['source_id']}: {e}")
            print(f"FAIL  {src['path']}: {e}")
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        manifest[src["source_id"]] = {
            "url": src["url"],
            "path": f"data/raw/{src['path']}",
            "accessed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "sha256": sha256(dest),
            "bytes": dest.stat().st_size,
        }
        print(f"ok    {src['path']} ({dest.stat().st_size:,} bytes)")

    for src in MANUAL_RAW:
        dest = RAW / src["path"]
        if dest.exists():
            entry = manifest.get(src["source_id"], {})
            digest = sha256(dest)
            if entry.get("sha256") != digest:
                manifest[src["source_id"]] = {
                    "url": "manual download, see data/SOURCES.md",
                    "path": f"data/raw/{src['path']}",
                    "accessed_at": datetime.fromtimestamp(dest.stat().st_mtime, timezone.utc).isoformat(timespec="seconds"),
                    "sha256": digest,
                    "bytes": dest.stat().st_size,
                }
            print(f"ok    {src['path']} (manual file present)")
        else:
            print(f"MISSING {src['path']}\n        {src['how']}")

    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    if failures:
        print("\nDownload failures:\n  " + "\n  ".join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
