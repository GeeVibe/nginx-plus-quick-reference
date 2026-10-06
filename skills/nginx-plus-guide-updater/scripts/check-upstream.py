#!/usr/bin/env python3
"""
check-upstream.py

Detects NGINX Plus changes by diffing the upstream *source* repositories
directly — no HTML scraping of docs.nginx.com or nginx.org.

Watched sources:

  • nginx/documentation  content/nginx/releases.md
        Markdown source of https://docs.nginx.com/nginx/releases/
        → new "### NGINX Plus ..." release sections

  • nginx/nginx.org      xml/en/docs/**/*.xml
        XML source of https://nginx.org/en/docs/
        → new <directive name="..."> blocks that are Plus-only
          (see plus_marker.py for the <commercial_version> rule)

The last-processed commit of each repo lives in
state/upstream-commits.json. This script partial-clones both repos
(blob:none, so only the files we read are downloaded), diffs
<last-seen sha>..HEAD and reports what's new.

Usage:
  python3 check-upstream.py [--state PATH] [--workdir DIR]

Output (JSON to stdout):
{
  "needs_update": true,
  "latest_version": "PLS.37.1.1.2",
  "repos": {
    "nginx/documentation": {"base": "<sha>", "head": "<sha>", "changed": true},
    "nginx/nginx.org":     {"base": "<sha>", "head": "<sha>", "changed": true}
  },
  "new_releases": [
    {"heading": "NGINX Plus PLS.37.1.0.1 CR", "version": "PLS.37.1.0.1",
     "anchor": "pls.37.1.0", "notes_markdown": "..."}
  ],
  "new_plus_directives": [
    {"directive": "license_pending_token", "module": "ngx_mgmt_module",
     "source_path": "xml/en/docs/ngx_mgmt_module.xml",
     "docs_url": "https://nginx.org/en/docs/ngx_mgmt_module.html#license_pending_token",
     "plus_signal": "module" | "directive"}
  ],
  "checked_at_utc": "..."
}

needs_update is true when there is at least one new release section or at
least one new Plus-only directive. Changes to OSS-only docs are ignored.

Exit codes:
  0 — success (check needs_update)
  1 — git/clone failure
  2 — state file missing or invalid
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from plus_marker import PLUS_ONLY, classify  # noqa: E402

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_STATE = SCRIPT_DIR.parent / "state" / "upstream-commits.json"

DOCS_REPO = "nginx/documentation"
DOCS_PATH = "content/nginx/releases.md"
ORG_REPO = "nginx/nginx.org"
ORG_PATH = "xml/en/docs"

RE_RELEASE_HEADING = re.compile(
    r"^###\s+(NGINX Plus\s+.+?)\s*(?:\{#([^}]+)\})?\s*$", re.MULTILINE
)
RE_PLS = re.compile(r"PLS\.(\d+)\.(\d+)\.(\d+)\.(\d+)")
RE_R = re.compile(r"\(R(\d+)(?:\s*P(\d+))?\)|\bR(\d+)(?:\s*P(\d+))?\b")
RE_MODULE = re.compile(r'<module\s+name="Module\s+([^"]+)"\s+link="([^"]+)"')


# ── git helpers ────────────────────────────────────────────────────────────

def git(*args, cwd=None) -> str:
    out = subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    )
    return out.stdout


def ensure_clone(repo: str, workdir: Path) -> Path:
    dest = workdir / repo.replace("/", "__")
    if (dest / ".git").exists():
        git("fetch", "--quiet", "origin", cwd=dest)
        git("reset", "--quiet", "--soft", "origin/HEAD", cwd=dest)
    else:
        git(
            "clone", "--quiet", "--filter=blob:none", "--no-checkout",
            f"https://github.com/{repo}.git", str(dest),
        )
    return dest


def head_sha(clone: Path) -> str:
    return git("rev-parse", "origin/HEAD", cwd=clone).strip()


def show(clone: Path, sha: str, path: str) -> str:
    try:
        return git("show", f"{sha}:{path}", cwd=clone)
    except subprocess.CalledProcessError:
        return ""  # file did not exist at that commit


def changed_files(clone: Path, base: str, head: str, path: str) -> list[str]:
    if base == head:
        return []
    out = git("diff", "--name-only", "--diff-filter=AM", base, head, "--", path, cwd=clone)
    return [p for p in out.splitlines() if p.endswith(".xml")]


# ── releases.md ───────────────────────────────────────────────────────────

def release_sections(md: str) -> dict[str, dict]:
    """Map version → {heading, anchor, body} for every '### NGINX Plus ...' section.

    Keyed by normalized version (not heading text) because upstream edits
    wording/whitespace of existing headings, e.g. 'NGINX Plus  PLS.37.0.1.1 LTS'.
    """
    sections = {}
    # Upstream has used non-breaking spaces in headings ("NGINX\u00a0Plus").
    md = md.replace("\u00a0", " ").replace("\u202f", " ")
    matches = list(RE_RELEASE_HEADING.finditer(md))
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        # stop at the next ## heading if it comes first
        nxt = re.search(r"^##\s", md[m.end():end], re.MULTILINE)
        if nxt:
            end = m.end() + nxt.start()
        heading = re.sub(r"\s+", " ", m.group(1).strip())
        sections[version_of(heading)] = {
            "heading": heading,
            "anchor": m.group(2) or "",
            "body": md[m.end():end].strip(),
        }
    return sections


def version_of(heading: str) -> str:
    m = RE_PLS.search(heading)
    if m:
        return m.group(0)
    m = RE_R.search(heading)
    if m:
        major = m.group(1) or m.group(3)
        patch = m.group(2) or m.group(4)
        return f"R{major}" + (f" P{patch}" if patch else "")
    return heading


def version_key(v: str) -> tuple:
    m = RE_PLS.fullmatch(v)
    if m:
        return (1, *map(int, m.groups()))
    m = re.fullmatch(r"R(\d+)(?: P(\d+))?", v)
    if m:
        return (0, int(m.group(1)), int(m.group(2) or 0))
    return (-1,)


# ── nginx.org XML ─────────────────────────────────────────────────────────

def plus_directives(xml: str) -> dict[str, str]:
    """Return {directive_name: 'module'|'directive'} for Plus-only directives."""
    return {n: sig for n, sig in classify(xml).items() if sig in PLUS_ONLY}


def module_meta(xml: str, path: str) -> tuple[str, str]:
    m = RE_MODULE.search(xml)
    if m:
        return m.group(1), "https://nginx.org" + m.group(2)
    stem = Path(path).stem
    return stem, f"https://nginx.org/{path.removeprefix('xml/').removesuffix('.xml')}.html"


# ── main ──────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--state", default=str(DEFAULT_STATE))
    ap.add_argument("--workdir", default=os.environ.get(
        "UPSTREAM_WORKDIR", str(Path(tempfile.gettempdir()) / "nginx-plus-upstream")))
    args = ap.parse_args()

    try:
        state = json.loads(Path(args.state).read_text())
        docs_base = state[DOCS_REPO]["sha"]
        org_base = state[ORG_REPO]["sha"]
    except Exception as e:
        sys.stderr.write(f"Invalid state file {args.state}: {e}\n")
        return 2

    workdir = Path(args.workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    try:
        docs = ensure_clone(DOCS_REPO, workdir)
        org = ensure_clone(ORG_REPO, workdir)
        docs_head, org_head = head_sha(docs), head_sha(org)

        # Releases
        old_md = show(docs, docs_base, DOCS_PATH)
        new_md = show(docs, docs_head, DOCS_PATH)
        old_secs, new_secs = release_sections(old_md), release_sections(new_md)
        new_releases = [
            {
                "heading": s["heading"],
                "version": v,
                "anchor": s["anchor"],
                "notes_markdown": s["body"],
            }
            for v, s in sorted(new_secs.items(), key=lambda kv: version_key(kv[0]))
            if v not in old_secs
        ]
        all_versions = list(new_secs)
        latest = max(all_versions, key=version_key) if all_versions else ""

        # Directives
        new_dirs = []
        for path in changed_files(org, org_base, org_head, ORG_PATH):
            if "/en/" not in path:
                continue
            new_xml = show(org, org_head, path)
            before = plus_directives(show(org, org_base, path))
            after = plus_directives(new_xml)
            module, url = module_meta(new_xml, path)
            for name, signal in after.items():
                if name not in before:
                    new_dirs.append({
                        "directive": name,
                        "module": module,
                        "source_path": path,
                        "docs_url": f"{url}#{name}",
                        "plus_signal": signal,
                    })
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"git failed: {' '.join(e.cmd)}\n{e.stderr}\n")
        return 1

    output = {
        "needs_update": bool(new_releases or new_dirs),
        "latest_version": latest,
        "repos": {
            DOCS_REPO: {"base": docs_base, "head": docs_head, "changed": docs_base != docs_head},
            ORG_REPO: {"base": org_base, "head": org_head, "changed": org_base != org_head},
        },
        "new_releases": new_releases,
        "new_plus_directives": new_dirs,
        "checked_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
