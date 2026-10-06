# State

This directory holds machine-managed state for the updater skill.

## Files

### `upstream-commits.json`

The last-processed commit SHA of each upstream source repo:

- `nginx/documentation` (`content/nginx/releases.md`)
- `nginx/nginx.org` (`xml/en/docs/`)

`scripts/check-upstream.py` diffs each repo from this SHA to `HEAD`. If there are new release sections or new Plus-only directives, the workflow drafts a PR, and that PR moves these SHAs forward. Once it's **merged**, the next run starts from there.

To re-process changes, rewind a SHA to an older commit. Otherwise, **do not edit by hand**.

### `last-seen-version.txt`

A single line: the newest NGINX Plus release string (e.g., `PLS.37.1.1.2`). This is **display-only**: `deploy-pages.yml` copies it into the site as the version badge. It no longer drives change detection.

## Why files and not a GitHub Release tag?

A file in the repo is:
- Diffable in PRs (so the version bump is visible)
- Survives repo migrations
- Easy for humans to override
