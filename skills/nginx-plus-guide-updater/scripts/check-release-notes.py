#!/usr/bin/env python3
"""
check-release-notes.py

Fetches the NGINX Plus release notes page and returns the latest release version.
Designed to be called by the nginx-plus-guide-updater Claude Code skill.

Outputs JSON to stdout:
{
  "latest_version": "R35",
  "release_date": "2026-05-20",
  "release_notes_url": "https://docs.nginx.com/nginx/releases/#r35"
}

Exit codes:
  0 — success
  1 — could not fetch
  2 — could not parse latest version
"""

import json
import re
import sys
import urllib.request

RELEASE_NOTES_URL = "https://docs.nginx.com/nginx/releases/"
USER_AGENT = "nginx-plus-quick-reference-updater/1.0 (+https://github.com/GeeVibe/nginx-plus-quick-reference)"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_latest_version(html: str) -> tuple[str, str] | None:
    """
    Returns (version, release_date) for the latest NGINX Plus release.
    Looks for headings like "NGINX Plus R35" with a date nearby.
    Fragile by design — docs.nginx.com structure may change. Update this when it does.
    """
    # Find all "R<n>" version mentions in heading-like context
    version_matches = re.findall(r"NGINX\s+Plus\s+(R\d+)", html, re.IGNORECASE)
    if not version_matches:
        return None
    # Highest R number = latest
    latest = max(version_matches, key=lambda v: int(v[1:]))

    # Try to grab a release date near the latest version heading
    date_pattern = rf"{latest}.*?(\d{{4}}[-/]\d{{2}}[-/]\d{{2}}|\w+\s+\d+,\s+\d{{4}})"
    date_match = re.search(date_pattern, html, re.IGNORECASE | re.DOTALL)
    release_date = date_match.group(1) if date_match else ""

    return latest, release_date


def main() -> int:
    try:
        html = fetch(RELEASE_NOTES_URL)
    except Exception as e:
        sys.stderr.write(f"Fetch failed: {e}\n")
        return 1

    result = extract_latest_version(html)
    if result is None:
        sys.stderr.write("Could not find any NGINX Plus version in release notes\n")
        return 2

    latest_version, release_date = result
    output = {
        "latest_version": latest_version,
        "release_date": release_date,
        "release_notes_url": f"{RELEASE_NOTES_URL}#{latest_version.lower()}",
    }
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
