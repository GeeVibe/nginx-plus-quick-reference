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
- `UPSTREAM_STATE` — `skills/nginx-plus-guide-updater/state/upstream-commits.json` (last-processed commit SHA of each upstream repo)
- `UPSTREAM_DIFF` — JSON output of `scripts/check-upstream.py` (in CI it is pre-computed at `$RUNNER_TEMP/upstream.json`)
- `DOCS_BASE_URL` — `https://docs.nginx.com/nginx/`
- `RELEASE_NOTES_URL` — `https://docs.nginx.com/nginx/releases/`

## A note on release naming

NGINX Plus releases come in two naming schemes the parser recognizes:

- **R-series** (legacy): `R1` … `R36`, with optional patches like `R36 P5`. Frozen at R36 (Dec 2025).
- **PLS-series** (current): `PLS.37.0.0.1`, `PLS.37.0.1.1`, `PLS.37.1.0.0`, etc. — used from May 2026 onward.

For the purposes of this guide we don't care about LTS vs CR tracks or version-numbering nuance. The only question is: **"is there a newer release string than the one we last saw, and does it list any new directives?"** If yes, ingest the new directives. If no, stop.

## The five-step workflow

### Step 1 — Check the release notes

Change detection reads the **upstream source repos directly** — never scrape rendered HTML to detect changes:

| Repo | Path | What it gives us |
|---|---|---|
| [`nginx/documentation`](https://github.com/nginx/documentation) | `content/nginx/releases.md` | Markdown source of docs.nginx.com/nginx/releases/ |
| [`nginx/nginx.org`](https://github.com/nginx/nginx.org) | `xml/en/docs/**/*.xml` | XML source of the nginx.org directive reference |

Run `scripts/check-upstream.py` (in CI, read the pre-computed `$RUNNER_TEMP/upstream.json` instead). It partial-clones both repos, diffs from the SHAs in `state/upstream-commits.json` to `HEAD`, and returns:

- `new_releases[]` — release sections added to `releases.md` since the baseline, each with its raw `notes_markdown`
- `new_plus_directives[]` — `<directive>` blocks added to nginx.org XML that are Plus-only (module summary says "available as part of our commercial subscription", or the directive body has a current `<commercial_version>` note)
- `latest_version`, `needs_update`, and `repos.<name>.head` (the SHAs to record when you're done)

- If `needs_update` is `false` → **stop**. No PR. Exit clean.
- Otherwise → continue to Step 2.

### Step 2 — Extract new directives

Candidates come from two places — merge and de-duplicate them:

1. Every entry in `new_plus_directives[]` (already confirmed Plus-only by the XML marker).
2. Directives/modules mentioned in each `new_releases[].notes_markdown` (links to `nginx.org/en/docs/...#<directive>`). Security-only releases usually have none.

Many release-note mentions are OSS features that Plus inherits — the nginx.org XML is how you tell them apart. Read the XML source rather than the rendered page: `https://raw.githubusercontent.com/nginx/nginx.org/<head-sha>/xml/en/docs/<path>.xml` (or `git show` in the clone).

For each candidate:

- Get the directive name (e.g., `js_periodic`, `oidc_token_endpoint`)
- Get the module/context it lives in (e.g., `http`, `stream`, `ngx_http_oidc_module`)
- Follow the link to the directive's full documentation page on `docs.nginx.com`
- Verify the directive is **Plus-only** — a `<commercial_version>` marker in the module summary or the directive's own body (ignore "Prior to version X … commercial subscription" notes; those features moved to OSS). If it's also in OSS, do not add it; this guide is for *Plus-only* features.

Run `scripts/extract-directive.py` to get these fields from the XML source, then document the directive's:

- Full syntax signature
- Default value (if any)
- Context (where it can appear: `http`, `server`, `location`, `upstream`, etc.)
- Description (paraphrase the official docs in 1-2 plain-English sentences)
- A minimal config example (lift from the docs example, brevity-edit it)

**The upstream docs sources are the source of truth**: the nginx.org XML for directive fields, and the docs.nginx.com release notes for what shipped. Do not invent or speculate. If a field isn't in the source, leave it blank and flag it in the PR description.

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
2. Updated `state/upstream-commits.json` — set each repo's `sha` to `repos.<name>.head` from the diff output
3. Updated `state/last-seen-version.txt` with `latest_version` (shown as the version badge on the site)
4. Updated `CHANGELOG.md` with a new entry under `## [Unreleased]`

Open a PR titled: **`Auto-update: NGINX Plus <VERSION> — N new directives`**

The PR body must include:

```markdown
## NGINX Plus <VERSION> — Detected Changes

**Source:** nginx/documentation `<base>..<head>` · nginx/nginx.org `<base>..<head>` (link the GitHub compare URLs)

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
- ❌ Invent syntax, defaults, or behavior not present in the official docs sources (nginx.org XML / docs.nginx.com)
- ❌ Delete or modify existing directive entries (separate workflow for that)
- ❌ Add OSS directives (this guide is Plus-only)
- ❌ Silently create a new category — always propose in PR description first

## Files this skill touches

- `docs/app.js` — append new entries to the directives array
- `state/upstream-commits.json` — last-processed commit of each upstream repo (drives change detection)
- `state/last-seen-version.txt` — latest release version string (display only)
- `CHANGELOG.md` — log what changed

## Files this skill READS (source of truth)

- `github.com/nginx/documentation` → `content/nginx/releases.md` — release notes source
- `github.com/nginx/nginx.org` → `xml/en/docs/**` — official directive reference source
- `https://docs.nginx.com/nginx/admin-guide/**` — admin guide for context (optional)
- `docs/app.js` — existing entries (for format + categories)

## Helper scripts

The `scripts/` subdirectory contains:

- `check-upstream.py` — diffs the upstream source repos since the last-processed commits; outputs JSON
- `extract-directive.py <directive> [--module ngx_..._module] [--ref <sha>]` — reads the directive's XML source from `nginx/nginx.org` and returns syntax, default, context, `appeared_in`, description, examples, and `is_plus_only`. It uses `check-upstream.py`'s local clone when there is one (pass `--ref` = `repos["nginx/nginx.org"].head`), and otherwise falls back to raw.githubusercontent.com. If a name exists in more than one module, for example in both http and stream, it lists the candidates and asks for `--module`. Use the `module` field from `new_plus_directives[]`.
- `plus_marker.py` — the shared Plus-only rule both scripts use. `plus_signal` is `module`, `directive`, `partial` (an OSS directive with some Plus-only parameters, which is **not** Plus-only for this guide), or `null`

Use these when you need deterministic parsing. For prose and judgment calls (categorization, customer-value framing), use your own reasoning.

## Failure modes

If you cannot complete the workflow:

- **git clone/fetch of an upstream repo fails** → Exit non-zero. The GitHub Action will retry next week.
- **Upstream files moved or format changed** (e.g. `releases.md` renamed, XML schema changed) → Open a PR titled `Auto-update: parser needs human attention` with a description of what changed.
- **More than 10 new directives detected** → Don't try to do them all at once. Add the first 5, flag in the PR that more remain, and let the human triage.

## Quality bar

A good PR from this skill:

- Has factually accurate directive entries (cross-checked against docs)
- Picks reasonable categories (with reasoning visible)
- Writes plain-English customer-value lines (not marketing fluff)
- Surfaces ambiguities for human review rather than guessing silently

The skill is a drafter, not a publisher. The human is always in the loop.
