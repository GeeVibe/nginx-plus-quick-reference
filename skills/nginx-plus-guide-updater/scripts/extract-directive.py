#!/usr/bin/env python3
"""
extract-directive.py

Given a directive name (and optionally its module), reads the directive's
XML *source* from the nginx/nginx.org repo and returns structured fields.
No HTML scraping.

Source: github.com/nginx/nginx.org  →  xml/en/docs/[<protocol>/]<module>.xml

Where it reads from, in order:
  1. A local clone given by --repo-dir, or the one check-upstream.py leaves at
     $UPSTREAM_WORKDIR/nginx__nginx.org (default: <tmp>/nginx-plus-upstream).
     Read with `git show <ref>:<path>`; default ref is origin/HEAD.
  2. Otherwise raw.githubusercontent.com/nginx/nginx.org/<ref>/<path>
     (default ref: main).

Usage:
  python3 extract-directive.py <directive> [--module ngx_http_keyval_module]
                               [--ref <sha|branch>] [--repo-dir DIR]

--module is optional when a local clone is available: the module is found by
searching the XML for <directive name="...">. If the name exists in several
modules (e.g. proxy_bind_dynamic in http and stream), the candidates are listed
and --module is required. The protocol directory (http/,
stream/, mail/, or none) is inferred from the module name.

Output (JSON to stdout):
{
  "directive": "keyval_zone",
  "module": "ngx_http_keyval_module",
  "syntax": "keyval_zone zone=name:size [state=file] ...;",
  "default": "—",
  "context": ["http"],
  "appeared_in": null,
  "description": "Sets the name and size of the shared memory zone ...",
  "is_plus_only": true,
  "plus_signal": "module",          # "module" | "directive" | "partial" | null
                                    # (see plus_marker.py; "partial" = OSS directive
                                    #  with some Plus-only parameters/behavior)
  "examples": ["keyval_zone zone=one:32k state=...;"],
  "example": "keyval_zone zone=one:32k state=...;",   # first example, or null
  "docs_url": "https://nginx.org/en/docs/http/ngx_http_keyval_module.html#keyval_zone",
  "source_path": "xml/en/docs/http/ngx_http_keyval_module.xml",
  "source_ref": "<sha>"
}

Exit codes:
  0 — success
  1 — could not fetch / read source
  2 — module or directive not found
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.entities import name2codepoint
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from plus_marker import PLUS_ONLY, signal_for  # noqa: E402

USER_AGENT = (
    "nginx-plus-quick-reference-updater/2.0 "
    "(+https://github.com/GeeVibe/nginx-plus-quick-reference)"
)
REPO = "nginx/nginx.org"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}"
DOCS_ROOT = "xml/en/docs"
DEFAULT_WORKDIR = Path(os.environ.get(
    "UPSTREAM_WORKDIR", str(Path(tempfile.gettempdir()) / "nginx-plus-upstream")))

# Entities defined in nginx.org's dtd/content.dtd that aren't HTML-standard.
EXTRA_ENTITIES = {"mdash": " — "}
XML_BUILTIN = {"amp", "lt", "gt", "quot", "apos"}


# ── source access ─────────────────────────────────────────────────────────

class Source:
    def __init__(self, repo_dir, ref):
        self.repo_dir = repo_dir
        if repo_dir:
            self.ref = self._git("rev-parse", ref or "origin/HEAD").strip()
        else:
            self.ref = ref or "main"

    def _git(self, *args) -> str:
        return subprocess.run(
            ["git", "-C", str(self.repo_dir), *args],
            check=True, capture_output=True, text=True,
        ).stdout

    def read(self, path: str):
        if self.repo_dir:
            try:
                return self._git("show", f"{self.ref}:{path}")
            except subprocess.CalledProcessError:
                return None
        req = urllib.request.Request(f"{RAW_BASE}/{self.ref}/{path}",
                                     headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise

    def find_module_paths(self, directive: str) -> list:
        """All English module files in the clone that define the directive."""
        if not self.repo_dir:
            return []
        try:
            out = self._git("grep", "-l", "-F", f'<directive name="{directive}">',
                            self.ref, "--", f"{DOCS_ROOT}/")
        except subprocess.CalledProcessError:
            return []  # git grep exits 1 when nothing matches
        paths = [line.split(":", 1)[1] for line in out.splitlines()]
        return sorted(p for p in paths if Path(p).name.startswith("ngx_"))


def module_path(module: str) -> str:
    for proto in ("http", "stream", "mail"):
        if module.startswith(f"ngx_{proto}_"):
            return f"{DOCS_ROOT}/{proto}/{module}.xml"
    return f"{DOCS_ROOT}/{module}.xml"  # ngx_core_module, ngx_mgmt_module, ...


# ── XML parsing ───────────────────────────────────────────────────────────

def parse_xml(raw: str) -> ET.Element:
    raw = re.sub(r"<!DOCTYPE[^>]*>", "", raw, count=1)

    def entity(m):
        name = m.group(1)
        if name in XML_BUILTIN:
            return m.group(0)
        if name in EXTRA_ENTITIES:
            return EXTRA_ENTITIES[name]
        if name in name2codepoint:
            return chr(name2codepoint[name])
        return ""

    raw = re.sub(r"&([A-Za-z][A-Za-z0-9]*);", entity, raw)
    return ET.fromstring(raw)


def text_of(el) -> str:
    """Flatten an element to plain text with collapsed whitespace.

    <example> and <note> children are skipped (examples are returned
    separately; notes are side remarks). Empty <link id="x"/> renders as x.
    """
    if el is None:
        return ""
    parts = []

    def walk(e):
        if e.tag == "link" and not (e.text or len(e)):
            parts.append(e.get("id") or e.get("doc") or e.get("url") or "")
            return
        if e.tag == "http-status":
            parts.append(e.get("code", "") + (f" ({e.get('text')})" if e.get("text") else ""))
            return
        if e.tag in ("example", "note"):
            return
        parts.append(e.text or "")
        for child in e:
            walk(child)
            parts.append(child.tail or "")

    walk(el)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def example_text(el) -> str:
    return textwrap.dedent("".join(el.itertext())).strip("\n")


# ── main ──────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("directive", help="Directive name, e.g. 'keyval_zone'")
    ap.add_argument("--module", help="Module name, e.g. 'ngx_http_keyval_module'")
    ap.add_argument("--ref", help="Commit SHA or branch of nginx/nginx.org "
                                  "(default: origin/HEAD with a clone, else main)")
    ap.add_argument("--repo-dir", help="Local clone of nginx/nginx.org "
                                       "(default: check-upstream.py's clone, if present)")
    ap.add_argument("--protocol", help=argparse.SUPPRESS)  # legacy; now inferred
    args = ap.parse_args()

    repo_dir = Path(args.repo_dir) if args.repo_dir else DEFAULT_WORKDIR / "nginx__nginx.org"
    if not (repo_dir / ".git").exists():
        if args.repo_dir:
            sys.stderr.write(f"Not a git clone: {repo_dir}\n")
            return 1
        repo_dir = None

    try:
        src = Source(repo_dir, args.ref)
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"git failed: {e.stderr}\n")
        return 1

    candidates = []
    if args.module:
        path = module_path(args.module)
    else:
        candidates = src.find_module_paths(args.directive)
        if len(candidates) > 1:
            sys.stderr.write(
                f"'{args.directive}' is defined in {len(candidates)} modules; pass --module:\n"
                + "".join(f"  --module {Path(c).stem}\n" for c in candidates))
            return 2
        path = candidates[0] if candidates else None
        if not path:
            sys.stderr.write(
                f"Could not locate '{args.directive}'. Pass --module ngx_<protocol>_<name>_module"
                + ("" if repo_dir else " (or run check-upstream.py first so a local clone exists)")
                + "\n")
            return 2

    try:
        raw = src.read(path)
    except Exception as e:
        sys.stderr.write(f"Fetch failed for {path}@{src.ref}: {e}\n")
        return 1
    if raw is None:
        sys.stderr.write(f"Module source not found: {path}@{src.ref}\n")
        return 2

    try:
        root = parse_xml(raw)
    except ET.ParseError as e:
        sys.stderr.write(f"XML parse error in {path}: {e}\n")
        return 1

    d = root.find(f".//directive[@name='{args.directive}']")
    if d is None:
        sys.stderr.write(f"Directive '{args.directive}' not found in {path}@{src.ref}\n")
        return 2

    module = re.sub(r"^Module\s+", "", root.get("name", "")) or Path(path).stem
    link = root.get("link") or "/" + path[len("xml/"):-len(".xml")] + ".html"

    syntax_els = d.findall("syntax")
    syntax = "\n".join(
        " ".join(filter(None, [args.directive, text_of(s)]))
        + (" { ... }" if s.get("block") == "yes" else ";")
        for s in syntax_els
    ) or None
    defaults = [text_of(x) for x in d.findall("default")]
    default = "\n".join(f"{args.directive} {x};" for x in defaults if x) or "—"
    contexts = [c.strip() for x in d.findall("context") for c in text_of(x).split(",")]
    appeared = text_of(d.find("appeared-in")) or None
    paras = [text_of(p) for p in d.findall("para")]
    description = next((p for p in paras if p), None)
    examples = [example_text(e) for e in d.iter("example")]
    signal = signal_for(raw, args.directive)

    output = {
        "directive": args.directive,
        "module": module,
        "syntax": syntax,
        "default": default,
        "context": [c for c in contexts if c],
        "appeared_in": appeared,
        "description": description,
        "is_plus_only": signal in PLUS_ONLY,
        "plus_signal": signal,
        "examples": examples,
        "example": examples[0] if examples else None,
        "docs_url": f"https://nginx.org{link}#{args.directive}",
        "source_path": path,
        "source_ref": src.ref,
    }
    print(json.dumps(output, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
