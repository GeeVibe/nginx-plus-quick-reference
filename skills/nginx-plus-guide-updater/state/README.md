# State

This directory holds machine-managed state for the updater skill.

## Files

### `last-seen-version.txt`

A single line: the most recent NGINX Plus release version this skill has processed (e.g., `R35`). The skill compares against this on every run; if the release notes show a higher version, it generates a PR. After a PR is **merged**, this file is updated as part of that same PR.

**Do not edit by hand** unless you're intentionally rewinding to re-process a release.

## Why a file and not a GitHub Release tag?

A file in the repo is:
- Diffable in PRs (so the version bump is visible)
- Survives repo migrations
- Easy for humans to override
