#!/usr/bin/env python3
"""
extract-directive.py

Given a directive name and (optionally) the module it lives in, fetches the
official NGINX docs page and returns structured fields for the directive.

Usage:
  python3 extract-directive.py <directive_name> [--module <module_name>]

Output (JSON to stdout):
{
  "directive": "keyval_zone",
  "syntax": "keyval_zone name:size [state=file] [timeout=time] [type=string|ip|prefix] [sync];",
  "default": "—",
  "context": ["http"],
  "module": "ngx_http_keyval_module",
  "description": "Sets the name and size of the shared memory zone...",
  "is_plus_only": true,
  "docs_url": "https://nginx.org/en/docs/http/ngx_http_keyval_module.html#keyval_zone",
  "example": "..."
}

Exit codes:
  0 — success
  1 — could not fetch
  2 — directive not found on the expected page
"""

import argparse
import json
import re
import sys
import urllib.request
from html import unescape

USER_AGENT = "nginx-plus-quick-reference-updater/1.0 (+https://github.com/GeeVibe/nginx-plus-quick-reference)"

# Common NGINX module URLs — the skill should consult docs.nginx.com first,
# but nginx.org has the canonical directive reference.
NGINX_ORG_BASE = "https://nginx.org/en/docs"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def strip_tags(s: str) -> str:
    return unescape(re.sub(r"<[^>]+>", "", s)).strip()


def find_directive_block(html: str, directive: str) -> str | None:
    """Find the HTML block for a specific directive on the nginx.org module page."""
    # nginx.org wraps each directive in <a name="directive_name"></a> followed by content
    pattern = rf'<a\s+name="{re.escape(directive)}"></a>(.*?)(?=<a\s+name=|<center>|$)'
    m = re.search(pattern, html, re.DOTALL)
    return m.group(1) if m else None


def parse_directive(block: str) -> dict:
    """Extract syntax / default / context / description from a directive HTML block."""
    fields = {
        "syntax": None,
        "default": None,
        "context": [],
        "description": None,
        "is_plus_only": False,
    }

    # Plus-only markers on nginx.org pages typically show "This directive appeared in version X.X"
    # combined with a "commercial subscription" callout. docs.nginx.com is more reliable
    # for the Plus-only signal — flag this for the skill to cross-reference.
    if re.search(r"commercial\s+subscription", block, re.IGNORECASE):
        fields["is_plus_only"] = True

    # Syntax row
    syntax_match = re.search(r"<i>syntax:</i>.*?<code>(.*?)</code>", block, re.IGNORECASE | re.DOTALL)
    if syntax_match:
        fields["syntax"] = strip_tags(syntax_match.group(1))

    # Default
    default_match = re.search(r"<i>default:</i>.*?<code>(.*?)</code>", block, re.IGNORECASE | re.DOTALL)
    if default_match:
        fields["default"] = strip_tags(default_match.group(1)) or "—"

    # Context
    ctx_match = re.search(r"<i>context:</i>\s*(.*?)<", block, re.IGNORECASE | re.DOTALL)
    if ctx_match:
        contexts = [c.strip() for c in strip_tags(ctx_match.group(1)).split(",")]
        fields["context"] = [c for c in contexts if c]

    # First paragraph after the metadata table is usually the description
    desc_match = re.search(r"</table>\s*<p>(.*?)</p>", block, re.IGNORECASE | re.DOTALL)
    if desc_match:
        fields["description"] = strip_tags(desc_match.group(1))

    return fields


def find_module_for_directive(directive: str, hint: str | None = None) -> str | None:
    """
    Best-effort: search the nginx.org directive index for the module page
    that hosts this directive. The Claude skill can override with a known module name.
    """
    if hint:
        return hint
    # Fallback: try a few common modules
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("directive", help="Directive name, e.g. 'keyval_zone'")
    parser.add_argument("--module", help="Module name hint, e.g. 'ngx_http_keyval_module'")
    parser.add_argument("--protocol", default="http", choices=["http", "stream", "mail"],
                        help="Protocol context (default: http)")
    args = parser.parse_args()

    module = find_module_for_directive(args.directive, args.module)
    if not module:
        sys.stderr.write("Module name required. Pass --module ngx_<protocol>_<name>_module\n")
        return 2

    url = f"{NGINX_ORG_BASE}/{args.protocol}/{module}.html"

    try:
        html = fetch(url)
    except Exception as e:
        sys.stderr.write(f"Fetch failed for {url}: {e}\n")
        return 1

    block = find_directive_block(html, args.directive)
    if not block:
        sys.stderr.write(f"Directive '{args.directive}' not found at {url}\n")
        return 2

    parsed = parse_directive(block)
    output = {
        "directive": args.directive,
        "module": module,
        "docs_url": f"{url}#{args.directive}",
        **parsed,
    }
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
