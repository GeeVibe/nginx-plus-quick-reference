#!/usr/bin/env python3
"""
check-release-notes.py

Fetches the NGINX Plus release notes page and returns the latest release
version string. Designed to be called by the nginx-plus-guide-updater
Claude Code skill.

Handles two naming schemes that have appeared on docs.nginx.com:

  • R-series (R1 .. R36, optionally with patches like "R36 P5") — used through Dec 2025.
  • PLS-series (PLS.37.0.0.1, PLS.37.0.1.1, PLS.37.1.0.0, ...) — used from May 2026 onward.

For the purposes of the guide, LTS vs CR distinctions don't matter — the only
question is "what's the newest version string, and have we seen it before?".

Outputs JSON to stdout, e.g.:

{
  "latest_version": "PLS.37.0.1.1",
  "release_date":   "May 22, 2026",
  "release_notes_url": "https://docs.nginx.com/nginx/releases/",
  "checked_at_utc": "2026-06-02T20:55:00Z"
}

Exit codes:
  0 — success
  1 — could not fetch
  2 — could not parse any version
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone

RELEASE_NOTES_URL = "https://docs.nginx.com/nginx/releases/"
USER_AGENT = (
    "nginx-plus-quick-reference-updater/2.0 "
    "(+https://github.com/GeeVibe/nginx-plus-quick-reference)"
)

# PLS.<major>.<x>.<y>.<z>, with optional " LTS"/" CR" label we ignore.
RE_PLS = re.compile(
    r"PLS\.(\d+)\.(\d+)\.(\d+)\.(\d+)(?:\s+(?:LTS|CR))?",
    re.IGNORECASE,
)

# Legacy R-series, with optional patch designation: "R36", "R36 P5".
RE_R = re.compile(r"\bR(\d+)(?:\s*P(\d+))?\b")

MONTHS = (
    "January|February|March|April|May|June|"
    "July|August|September|October|November|December"
)
RE_DATE = re.compile(
    rf"\b((?:{MONTHS})\s+\d{{1,2}},\s+\d{{4}}|\d{{4}}[-/]\d{{2}}[-/]\d{{2}})\b",
    re.IGNORECASE,
)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _date_near(html: str, idx: int) -> str:
    if idx < 0:
        return ""
    m = RE_DATE.search(html[idx : idx + 600])
    return m.group(1) if m else ""


def latest_pls(html: str):
    """Return (version_string, sort_tuple, match_index) for the newest PLS version, or None."""
    best = None  # (sort_tuple, version_string, match_index)
    for m in RE_PLS.finditer(html):
        sort_key = tuple(int(p) for p in m.groups())
        if best is None or sort_key > best[0]:
            version = f"PLS.{sort_key[0]}.{sort_key[1]}.{sort_key[2]}.{sort_key[3]}"
            best = (sort_key, version, m.start())
    return best


def latest_r(html: str):
    """Return (version_string, sort_tuple, match_index) for the newest R version, or None."""
    best = None
    for m in RE_R.finditer(html):
        # Avoid grabbing stray "R1"-style strings outside release contexts.
        start = max(0, m.start() - 40)
        window = html[start : m.end() + 5].lower()
        if "nginx plus" not in window and "release" not in window:
            continue
        major = int(m.group(1))
        patch = int(m.group(2)) if m.group(2) else 0
        sort_key = (major, patch)
        if best is None or sort_key > best[0]:
            version = f"R{major}" + (f" P{patch}" if patch else "")
            best = (sort_key, version, m.start())
    return best


def main() -> int:
    try:
        html = fetch(RELEASE_NOTES_URL)
    except Exception as e:
        sys.stderr.write(f"Fetch failed: {e}\n")
        return 1

    pls = latest_pls(html)
    r = latest_r(html)

    # PLS supersedes R-series — if any PLS version is present, it's the newest.
    chosen = pls or r
    if chosen is None:
        sys.stderr.write(
            "Could not find any NGINX Plus version (R-series or PLS-series) "
            f"in release notes at {RELEASE_NOTES_URL}. "
            "The page structure may have changed — update this parser.\n"
        )
        return 2

    _, version, idx = chosen
    output = {
        "latest_version": version,
        "release_date": _date_near(html, idx),
        "release_notes_url": RELEASE_NOTES_URL,
        "checked_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
