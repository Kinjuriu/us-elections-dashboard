"""Build the map's water and neighbouring land from Natural Earth.

Outputs (read by the site at build time, see src/lib/geo.ts):
  public/geo/ocean.topo.json  bathymetry contour lines (object "bathymetry",
                              property "depth" in metres) and lakes ("lakes")
  public/geo/land.topo.json   countries other than the US ("land"), drawn as
                              plain land around the states
  public/geo/states.topo.json the 50 states and DC from the us-atlas npm
                              package (states-10m.json), simplified, with
                              shared borders kept intact ("states", id = FIPS)

Steps:
  1. Download each Natural Earth 10m layer into its own folder under
     data/raw/naturalearth/ and record it in data/raw/manifest.json.
     Existing files are checked against the manifest's SHA-256.
  2. With mapshaper (npm dev dependency): simplify, turn the bathymetry
     polygons into lines (so clipping never draws a false edge along the
     frame), clip to the area the map shows, and write TopoJSON.

The zips are not committed (about 20MB); this script fetches them again on
a fresh checkout and stops if a file no longer matches its recorded hash.

us-atlas is pinned in package-lock.json, so its states file is the same on
every machine.

Usage:  python pipeline/geo/build_geo.py [--force]
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
NE_RAW = RAW / "naturalearth"
MANIFEST = RAW / "manifest.json"
OUT = ROOT / "public" / "geo"
MAPSHAPER = ROOT / "node_modules" / ".bin" / "mapshaper"
US_ATLAS_STATES = ROOT / "node_modules" / "us-atlas" / "states-10m.json"

sys.path.insert(0, str(ROOT / "pipeline"))
from download import USER_AGENT, sha256  # noqa: E402

NE_BASE = "https://naciscdn.org/naturalearth/10m"

# Depth bands drawn as contour lines. The 0m layer is the coastline itself,
# so it is left out. Deeper than 6000m only occurs in the Aleutian Trench,
# where the 6000m line already shows it.
BATHYMETRY = [
    ("K", 200), ("J", 1000), ("I", 2000), ("H", 3000), ("G", 4000), ("F", 5000), ("E", 6000),
]
LAYERS = [
    *[(f"ne_10m_bathymetry_{k}_{d}", f"physical/ne_10m_bathymetry_{k}_{d}.zip") for k, d in BATHYMETRY],
    ("ne_10m_lakes", "physical/ne_10m_lakes.zip"),
    ("ne_10m_admin_0_countries", "cultural/ne_10m_admin_0_countries.zip"),
]

# What the map can show: the lower 48 with the Gulf, Caribbean edge and
# Atlantic margin, Hawaii, and Alaska including the Aleutians west of 180.
CLIP = {
    "type": "MultiPolygon",
    "coordinates": [
        [[[-180, 14], [-50, 14], [-50, 72], [-180, 72], [-180, 14]]],
        [[[165, 48], [180, 48], [180, 58], [165, 58], [165, 48]]],
    ],
}

# Simplification tolerances. At the widest layout one pixel is about 7km of
# the lower 48. States keep the most detail; neighbouring land less; the
# contour lines, which are texture, least.
SIMPLIFY_STATES = "interval=2500"
SIMPLIFY = "interval=3000"
SIMPLIFY_BATHYMETRY = "interval=6000"
# Seamounts and small basins: closed rings smaller than this are dropped.
BATHYMETRY_MIN_AREA = "1500km2"

# Lakes worth drawing at this scale (Natural Earth scalerank 0 is the largest).
LAKE_MAX_SCALERANK = 2


def fetch_layer(source_id: str, rel_url: str, manifest: dict, force: bool) -> Path:
    """Download a zip into its own folder, extract it there, return the .shp."""
    folder = NE_RAW / source_id
    zip_path = folder / f"{source_id}.zip"
    entry = manifest.get(source_id)

    if zip_path.exists() and not force:
        if entry and entry.get("sha256") != sha256(zip_path):
            raise SystemExit(f"{zip_path} does not match the SHA-256 in the manifest; re-run with --force")
        print(f"skip  {source_id} (exists)")
    else:
        url = f"{NE_BASE}/{rel_url}"
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=300)
        r.raise_for_status()
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True)
        zip_path.write_bytes(r.content)
        digest = sha256(zip_path)
        if entry and entry.get("sha256") not in (None, digest):
            print(f"note  {source_id}: new file differs from the one recorded before")
        manifest[source_id] = {
            "url": url,
            "path": f"data/raw/naturalearth/{source_id}/{source_id}.zip",
            "accessed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "sha256": digest,
            "bytes": zip_path.stat().st_size,
        }
        print(f"ok    {source_id} ({zip_path.stat().st_size:,} bytes)")

    extract = folder / "extracted"
    if not extract.exists():
        with zipfile.ZipFile(zip_path) as z:
            for name in z.namelist():
                # Flat archives only; refuse anything that would escape the folder.
                if Path(name).is_absolute() or ".." in Path(name).parts:
                    raise SystemExit(f"unsafe path {name!r} in {zip_path}")
            z.extractall(extract)
    shp = sorted(extract.rglob("*.shp"))
    if len(shp) != 1:
        raise SystemExit(f"expected one .shp in {extract}, found {len(shp)}")
    return shp[0]


def mapshaper(*args: str | Path) -> None:
    cmd = [str(MAPSHAPER), "-quiet", *map(str, args)]
    if subprocess.run(cmd).returncode:
        raise SystemExit(f"mapshaper failed: {' '.join(cmd)}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-download the Natural Earth zips")
    args = ap.parse_args()

    if not MAPSHAPER.exists():
        raise SystemExit("mapshaper not found: run `npm install` first")

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    shps = {sid: fetch_layer(sid, url, manifest, args.force) for sid, url in LAYERS}
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")

    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        clip = tmp / "clip.json"
        clip.write_text(json.dumps(CLIP))

        # Each depth band: polygons -> simplified outlines -> clipped lines.
        bands = []
        for k, depth in BATHYMETRY:
            out = tmp / f"bathy_{depth}.json"
            mapshaper(
                "-i", shps[f"ne_10m_bathymetry_{k}_{depth}"],
                # Natural Earth splits each band into tiles; dissolving first
                # stops the tile seams becoming false contour lines.
                "-dissolve",
                "-filter-islands", f"min-area={BATHYMETRY_MIN_AREA}",
                "-simplify", SIMPLIFY_BATHYMETRY,
                "-lines",
                "-clip", clip,
                "-each", f"depth={depth}",
                "-filter-fields", "depth",
                "-o", out, "format=geojson",
            )
            bands.append(out)

        lakes = tmp / "lakes.json"
        mapshaper(
            "-i", shps["ne_10m_lakes"],
            "-filter", f"scalerank <= {LAKE_MAX_SCALERANK}",
            "-clip", clip,
            "-simplify", SIMPLIFY, "keep-shapes",
            "-filter-fields", "name",
            "-o", lakes, "format=geojson",
        )

        mapshaper(
            "-i", *bands, "combine-files",
            "-merge-layers", "name=bathymetry",
            "-i", lakes,
            "-rename-layers", "lakes", "target=2",
            "-o", OUT / "ocean.topo.json", "format=topojson", "quantization=100000", "target=*",
        )

        mapshaper(
            "-i", shps["ne_10m_admin_0_countries"],
            "-filter", "ADM0_A3 != 'USA'",
            "-clip", clip,
            "-simplify", SIMPLIFY, "keep-shapes",
            "-filter-fields", "ADM0_A3",
            "-rename-layers", "land",
            "-o", OUT / "land.topo.json", "format=topojson", "quantization=100000",
        )

    mapshaper(
        "-i", US_ATLAS_STATES,
        "-target", "states",
        "-simplify", SIMPLIFY_STATES, "keep-shapes",
        "-filter-fields", "FID,name",
        "-o", OUT / "states.topo.json", "format=topojson", "id-field=FID", "quantization=100000",
    )

    for f in ("ocean.topo.json", "land.topo.json", "states.topo.json"):
        size = (OUT / f).stat().st_size
        print(f"wrote public/geo/{f} ({size:,} bytes)")
    ocean = (OUT / "ocean.topo.json").stat().st_size
    if ocean > 400_000:
        print(f"ocean.topo.json is {ocean:,} bytes, over the 400KB budget", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
