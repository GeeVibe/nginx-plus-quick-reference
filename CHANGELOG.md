# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `license_pending_token` (`ngx_mgmt_module`, NGINX Plus PLS.37.1.0.1) in the Dynamic Configuration & API category. It controls when a renewed license token takes effect.
- Release tracking moved forward to NGINX Plus PLS.37.1.1.2.

### Changed

- The auto-updater now finds changes by diffing the upstream source repos (`nginx/documentation` `releases.md` and `nginx/nginx.org` `xml/en/docs/`) from the commits recorded in `state/upstream-commits.json`. It no longer scrapes docs.nginx.com.
- Plus-only status is detected from the `<commercial_version>` marker in the nginx.org XML.
- The workflow skips drafting while an `auto-update/*` PR is already open.
- `extract-directive.py` now parses the directive's XML source in `nginx/nginx.org` with a real XML parser. It no longer regex-scrapes nginx.org HTML. It can find the module automatically from the local clone, returns `appeared_in` and every example, and pins to a commit with `--ref`.
- The Plus-only rule now lives in `scripts/plus_marker.py`, shared by both scripts. It tells "This directive is available as part of our commercial subscription" (Plus-only) apart from OSS directives that only have Plus-only parameters (`partial`, e.g. upstream `zone` and `sticky`).

### Removed

- `scripts/check-release-notes.py` (HTML scraper)

## [1.0.0] — 2026-06-02

### Added

- Initial public release of the NGINX Plus Quick Reference guide
- 36 directives across 17 use-case categories
- Inline SVG marketecture diagrams for each use case
- Fullscreen diagram mode (F key, arrow navigation)
- Search (`/` shortcut)
- Copy-to-clipboard for config snippets
- Tokenizer-based NGINX syntax highlighter
- CC BY-NC-SA 4.0 license
- Auto-updater Claude Code skill (`skills/nginx-plus-guide-updater/`)
- Weekly GitHub Action that watches NGINX Plus release notes
- GitHub Pages deployment workflow
- Public documentation: `FOR-FIELD-SES.md`, `FOR-CUSTOMERS.md`, `HOW-THE-AUTO-UPDATE-WORKS.md`, `EXTENDING-THE-GUIDE.md`

[Unreleased]: https://github.com/GeeVibe/nginx-plus-quick-reference/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/GeeVibe/nginx-plus-quick-reference/releases/tag/v1.0.0
