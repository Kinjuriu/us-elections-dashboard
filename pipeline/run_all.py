"""Run the whole pipeline in order: download, build every output, test.

Usage:  python pipeline/run_all.py [--force-download]
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
STEPS = [
    ["download.py"],
    ["build_chamber_control.py"],
    ["build_midterm_swing.py"],
    ["build_senate_results.py"],
    ["build_house_delegations.py"],
    ["build_members.py"],
    ["geo/build_geo.py"],  # map shapes; needs `npm install` for mapshaper
]


def main() -> int:
    force = "--force-download" in sys.argv
    for step in STEPS:
        args = step + (["--force"] if force and step[0] == "download.py" else [])
        print(f"\n== {' '.join(args)}")
        if subprocess.run([sys.executable, str(HERE / args[0]), *args[1:]], cwd=HERE).returncode:
            print(f"stopped: {args[0]} failed", file=sys.stderr)
            return 1
    print("\n== pytest")
    return subprocess.run([sys.executable, "-m", "pytest", str(HERE / "tests"), "-q"]).returncode


if __name__ == "__main__":
    sys.exit(main())
