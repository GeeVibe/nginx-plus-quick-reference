---
name: nginx-plus-guide-updater
description: Detects new NGINX Plus directives from official release notes, reads docs.nginx.com as source of truth, and drafts entries for the NGINX Plus Quick Reference guide. Opens a pull request with the proposed changes for human review. Use when checking for NGINX Plus updates, when the user mentions a new NGINX Plus release, or when invoked by the scheduled GitHub Action.
---

# NGINX Plus Guide Updater

This skill keeps the [NGINX Plus Quick Reference](https://geevibe.github.io/nginx-plus-quick-reference/) current as new NGINX Plus releases ship.

It does **not** push directly to `main`. It always opens a pull request so a human can review and merge.

## When to use this skill

Invoke this skill when any of the following happens:

- The scheduled GitHub Action fires (weekly Sunday)
- The user manually runs the workflow from the Actions tab
- The user says "check for NGINX Plus updates" or "see what's new in the latest release"
- A new NGINX Plus release is announced and someone asks you to update the guide

## Inputs

- `REPO_ROOT` — absolute path to the repo checkout (the working directory of the GitHub Action)
- `LAST_SEEN_VERSION` — read from `skills/nginx-plus-guide-updater/state/last-seen-version.txt`
- `DOCS_BASE_URL` — `https://docs.nginx.com/nginx/`
- `RELEASE_NOTES_URL` — `https://docs.nginx.com/nginx/releases/`

## A note on release naming

NGINX Plus releases come in two naming schemes the parser recognizes:

- **R-series** (legacy): `R1` … `R36`, with optional patches like `R36 P5`. Frozen at R36 (Dec 2025).
- **PLS-series** (current): `PLS.37.0.0.1`, `PLS.37.0.1.1`, `PLS.37.1.0.0`, etc. — used from May 2026 onward.

For the purposes of this guide we don't care about LTS vs CR tracks or version-numbering nuance. The only question is: **"is there a newer release string than the one we last saw, and does it list any new directives?"** If yes, ingest the new directives. If no, stop.

## The five-step workflow

### Step 1 — Check the release notes

Run `scripts/check-release-notes.py` (or fetch `https://docs.nginx.com/nginx/releases/` manually). The script returns the latest release string it found, whether R-series or PLS-series.

Compare against `state/last-seen-version.txt` (plain text, one line, the version string).

- If unchanged → **stop**. No PR. Exit clean.
- If newer → continue to Step 2 with the new version.

The release-notes page lists every release with its new directives, modules, and modules-changed sections. Parse those.

### Step 2 — Extract new directives

For each "new directive" or "new module" entry in the latest release notes:

- Get the directive name (e.g., `js_periodic`, `oidc_token_endpoint`)
- Get the module/context it lives in (e.g., `http`, `stream`, `ngx_http_oidc_module`)
- Follow the link to the directive's full documentation page on `docs.nginx.com`
- Verify the directive is **Plus-only** — check for the "NGINX Plus" badge or note on the docs page. If it's also in OSS, do not add it; this guide is for *Plus-only* features.

Document the directive's:

- Full syntax signature
- Default value (if any)
- Context (where it can appear: `http`, `server`, `location`, `upstream`, etc.)
- Description (paraphrase the official docs in 1-2 plain-English sentences)
- A minimal config example (lift from the docs example, brevity-edit it)

**docs.nginx.com is the source of truth.** Do not invent or speculate. If a field isn't in the docs, leave it blank and flag it in the PR description.

### Step 3 — Categorize

The guide is organized into 17 use-case categories defined in `docs/app.js` as `CATEGORIES`:

```
auth · health · api · lb · kv · ha · iot · cache · media ·
session-log · routing · tls · tunnel · internal ·
stream-session · perf · proxy-proto
```

Read `docs/app.js` to confirm the current categories (they may have evolved).

For each new directive, match it to the **best-fit existing category** based on the directive's use case (not the module). Examples:

- `oidc_*` directives → `auth`
- `health_check_*` → `health`
- `keyval_*` → `kv`
- `js_periodic` → `routing` or `perf` (judgment call — flag for human review)

If no category fits well, **propose a new category** in the PR description with a 1-line justification. Do not silently create a new category in the code.

### Step 4 — Generate the entry

Each entry in `docs/app.js` follows this shape (read the existing entries to mirror the format exactly):

```js
{
  id: 'directive_name',
  category: 'auth',
  directive: 'directive_name',
  title: 'Plain-English Use Case Title',
  description: 'Short paragraph: what this unlocks for the customer.',
  customerValue: 'One-line statement of business value.',
  docsUrl: 'https://docs.nginx.com/nginx/admin-guide/...',
  diagram: 'category-key',   // reuse an existing diagram if appropriate
  config: `# minimal working example
http {
    upstream backend {
        zone backend 64k;
        # ...
    }
}`
}
```

**Diagram handling:**

- If a similar use-case diagram already exists, reuse it.
- If a brand-new diagram is needed, **do not generate SVG.** Add `diagram: null` and flag in the PR description: *"New directive needs a custom diagram — please add to `svgDiagrams` in `docs/app.js`."*

### Step 5 — Open the PR

Create a new branch: `auto-update/<RELEASE_VERSION>-<YYYY-MM-DD>` (e.g., `auto-update/R35-2026-06-15`).

Commit the changes:

1. New entries appended to the directives array in `docs/app.js`
2. Updated `state/last-seen-version.txt` with the new version
3. Updated `CHANGELOG.md` with a new entry under `## [Unreleased]`

Open a PR titled: **`Auto-update: NGINX Plus <VERSION> — N new directives`**

The PR body must include:

```markdown
## NGINX Plus <VERSION> — Detected Changes

**Source:** https://docs.nginx.com/nginx/releases/

### New directives added

For each directive:
- **`directive_name`** — categorized as `<category>`
  - Source: <link to docs.nginx.com page>
  - Plus-only confirmed: ✅ / ⚠️ (could not verify)
  - Diagram: reused `<diagram-key>` / needs new diagram
  - Notes: (any judgment calls or fields left blank)

### Review checklist for the human

- [ ] Directive is genuinely Plus-only (not in OSS)
- [ ] Description matches the official docs (no hallucinated behavior)
- [ ] Category is the best fit (or new category is justified)
- [ ] Config example is minimal but valid
- [ ] Diagram assignment makes sense
- [ ] Customer-value line resonates (rewrite if needed)

### Notes from the updater

(Any flags, ambiguities, or things the skill couldn't decide.)
```

After the PR is opened, **stop**. Do not merge. Do not push to `main`.

## What this skill must NEVER do

- ❌ Push directly to `main`
- ❌ Add a directive that isn't in the official NGINX Plus release notes
- ❌ Invent syntax, defaults, or behavior not present in `docs.nginx.com`
- ❌ Delete or modify existing directive entries (separate workflow for that)
- ❌ Add OSS directives (this guide is Plus-only)
- ❌ Silently create a new category — always propose in PR description first

## Files this skill touches

- `docs/app.js` — append new entries to the directives array
- `state/last-seen-version.txt` — last release version we've processed (plain text)
- `CHANGELOG.md` — log what changed

## Files this skill READS (source of truth)

- `https://docs.nginx.com/nginx/releases/` — release notes
- `https://docs.nginx.com/nginx/admin-guide/**` — admin guide for context
- `https://nginx.org/en/docs/**` — official directive reference
- `docs/app.js` — existing entries (for format + categories)

## Helper scripts

The `scripts/` subdirectory contains:

- `check-release-notes.py` — quick check whether a new version exists; outputs JSON
- `extract-directive.py` — given a directive name and module, fetches the docs page and returns structured fields

Use these when you need deterministic parsing. For prose and judgment calls (categorization, customer-value framing), use your own reasoning.

## Failure modes

If you cannot complete the workflow:

- **Network failure fetching docs.nginx.com** → Exit non-zero. The GitHub Action will retry next week.
- **Release notes format changed and parser breaks** → Open a PR titled `Auto-update: parser needs human attention` with a description of what changed.
- **More than 10 new directives detected** → Don't try to do them all at once. Add the first 5, flag in the PR that more remain, and let the human triage.

## Quality bar

A good PR from this skill:

- Has factually accurate directive entries (cross-checked against docs)
- Picks reasonable categories (with reasoning visible)
- Writes plain-English customer-value lines (not marketing fluff)
- Surfaces ambiguities for human review rather than guessing silently

The skill is a drafter, not a publisher. The human is always in the loop.
