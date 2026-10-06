"""
plus_marker.py — shared rule for "is this nginx.org directive Plus-only?"

Used by check-upstream.py and extract-directive.py so detection and
extraction always agree. Works on the raw XML source in nginx/nginx.org.

nginx.org marks commercial (NGINX Plus) features with <commercial_version>.
The wording around that tag tells us the scope:

  module     — module summary: "This module is available as part of our
               <commercial_version>"  → every directive is Plus-only
  directive  — directive body: "This directive is available as part of our
               <commercial_version>"  → this directive is Plus-only
  partial    — any other current mention, e.g. "Additionally, as part of our
               <commercial_version>…" or "The parameter is available as part
               of our…" → OSS directive with some Plus-only behavior
  None       — no marker, or only historical notes ("Prior to version 1.29.6,
               this directive was available only as part of our…"), meaning
               the feature has moved to OSS

Only "module" and "directive" count as Plus-only for the guide.
"""

import re

_TAG = r"<commercial_version>"
_MODULE_RE = re.compile(r"This\s+module\s+is\s+available\s+as\s+part\s+of\s+our\s*" + _TAG)
_DIRECTIVE_RE = re.compile(r"This\s+directive\s+is\s+available\s+as\s+part\s+of\s+our\s*" + _TAG)
_HISTORICAL_RE = re.compile(r"(?:Prior\s+to|Since)\s[^<]*?" + _TAG)
_SUMMARY_RE = re.compile(r'<section\s+id="summary"\s*>(.*?)</section>', re.DOTALL)
_DIRECTIVE_BLOCK_RE = re.compile(r'<directive\s+name="([^"]+)"\s*>(.*?)</directive>', re.DOTALL)

PLUS_ONLY = ("module", "directive")


def module_is_plus(xml: str) -> bool:
    m = _SUMMARY_RE.search(xml)
    return bool(m and _MODULE_RE.search(m.group(1)))


def directive_signal(body: str, module_plus: bool):
    """Classify one <directive> body. Returns 'module'|'directive'|'partial'|None."""
    if module_plus:
        return "module"
    flat = re.sub(r"\s+", " ", body)
    if _DIRECTIVE_RE.search(flat):
        return "directive"
    remaining = _HISTORICAL_RE.sub("", flat)
    if _TAG in remaining:
        return "partial"
    return None


def classify(xml: str) -> dict:
    """{directive_name: signal} for every directive in a module XML (signal may be None)."""
    if not xml:
        return {}
    mod = module_is_plus(xml)
    return {name: directive_signal(body, mod) for name, body in _DIRECTIVE_BLOCK_RE.findall(xml)}


def signal_for(xml: str, directive: str):
    m = re.search(
        rf'<directive\s+name="{re.escape(directive)}"\s*>(.*?)</directive>', xml, re.DOTALL)
    if not m:
        return None
    return directive_signal(m.group(1), module_is_plus(xml))
