# How the auto-update works

> *Documentation matters as much as the project itself.*
> This file explains the brain of the project — the Claude Code skill that keeps the guide current with little human overhead.

---

## The 30-second version

```
                ┌──────────────────────────────────────┐
                │   GitHub Action (cron: weekly Sun)   │
                └──────────────────┬───────────────────┘
                                   │
                                   ▼
              ┌───────────────────────────────────────┐
              │  Check docs.nginx.com/nginx/releases  │
              │  Is there a newer NGINX Plus version  │
              │  than state/last-seen-version.txt?    │
              └──────────────────┬────────────────────┘
                                 │
                  ┌──────── No ──┴── Yes ────────┐
                  ▼                                ▼
              Exit clean             ┌──────────────────────────────┐
                                     │ Invoke Claude Code skill:    │
                                     │ nginx-plus-guide-updater     │
                                     └──────────────┬───────────────┘
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              │                                           │
                              ▼                                           ▼
              Extract new directives from              Categorize each into one of
              release notes →                          the 17 existing use-case
              follow each link to docs.nginx.com       categories (or propose a new one)
              and read source of truth                                    │
                              │                                           │
                              └─────────────────┬─────────────────────────┘
                                                ▼
                          ┌─────────────────────────────────────────┐
                          │ Generate JS entries matching app.js     │
                          │ format. Reuse existing diagrams when    │
                          │ possible; flag when a new diagram needs │
                          │ human design.                           │
                          └────────────────────┬────────────────────┘
                                               ▼
                          ┌─────────────────────────────────────────┐
                          │ Open a Pull Request                     │
                          │ Title: "Auto-update: NGINX Plus R<n>"   │
                          │ Body: diff summary, source links,       │
                          │       review checklist                  │
                          └────────────────────┬────────────────────┘
                                               ▼
                          ┌─────────────────────────────────────────┐
                          │ Human reviews → merges → site rebuilds  │
                          └─────────────────────────────────────────┘
```

---

## Why a Claude Code skill, not just a script?

Static scrapers break the moment docs.nginx.com restructures a page. A Claude Code skill is **prompted with intent** — "find new directives, read their docs, draft entries in this format" — and adapts to layout changes. The deterministic parts (release-notes version check, HTML parsing) live in Python scripts; the judgment calls (categorization, customer-value phrasing) live in the skill's reasoning.

The skill always opens a **pull request** instead of pushing to `main`. A human is always in the loop. The bar for an auto-merge is intentionally never met.

---

## The five-step workflow

The skill follows the workflow defined in [`skills/nginx-plus-guide-updater/SKILL.md`](../skills/nginx-plus-guide-updater/SKILL.md):

1. **Check release notes** — Fetch `docs.nginx.com/nginx/releases/`, find the latest NGINX Plus version, compare against `state/last-seen-version.txt`.
2. **Extract new directives** — For each new directive in the release notes, follow the link to its official documentation page. Verify it's Plus-only (not OSS).
3. **Categorize** — Match each directive to one of the 17 existing use-case categories. Propose a new category if nothing fits.
4. **Generate the entry** — Produce a JS object matching the shape of existing entries in `docs/app.js`. Reuse diagrams when appropriate.
5. **Open the PR** — Commit to a branch, push, open a PR titled `Auto-update: NGINX Plus <version> — <N> new directives`. Stop. Never auto-merge.

---

## What the skill is told it must NEVER do

These guardrails live in the skill's `SKILL.md`:

- ❌ Push directly to `main`
- ❌ Invent syntax, defaults, or behavior not present in official docs
- ❌ Delete or modify existing directive entries (separate workflow)
- ❌ Add OSS-only directives (this guide is Plus-only)
- ❌ Silently create a new category — always propose first in the PR description

---

## Triggers

| Trigger | When | Who |
|---|---|---|
| **Weekly cron** | Sundays, 06:00 UTC | GitHub |
| **Manual run** | Anytime via the Actions tab → "Run workflow" | Repo maintainer |
| **(Future) Release-notes RSS hook** | Within minutes of a new NGINX Plus release | Optional Webhook integration |

---

## Reading a PR opened by the skill

Each PR includes:

- A summary of what changed (which release, how many directives)
- A breakdown of each directive: name, category, source URL, Plus-only confirmation, diagram assignment
- A human-review checklist with explicit verification items
- Any notes/flags the skill couldn't decide on its own

**Review process** (recommended for the maintainer):

1. Scan the diff in `docs/app.js` for the new entries
2. For each new directive: click the source URL, verify the description matches
3. Confirm the category assignment is sensible
4. Spot-check the config example by mentally running it through `nginx -t`
5. Adjust the customer-value line if it sounds like marketing fluff
6. Approve and merge

---

## What about overrides?

Sometimes a directive is in the release notes but **shouldn't be in the guide** — internal-only, deprecated on arrival, or already covered by an existing entry.

To override:

- **Skip a directive permanently:** Add it to `skills/nginx-plus-guide-updater/state/excluded-directives.txt`.
- **Force a re-process of an old release:** Manually rewind `state/last-seen-version.txt` and run the workflow.
- **Pin an entry against auto-update edits:** Tag the entry with `// pinned: do not auto-edit` in `docs/app.js`.

---

## Failure modes

| Failure | What happens |
|---|---|
| docs.nginx.com unreachable | Workflow exits non-zero; retries next week |
| Release notes format changed | Skill opens a PR titled "parser needs human attention" |
| >10 new directives in a single release | Skill handles the first 5, flags the rest for human triage |
| Skill flags a directive as ambiguous | Goes in the PR description under "Notes from the updater" |

---

## Cost & operational profile

- **Compute:** GitHub Actions free tier (well under 2,000 minutes/month)
- **Anthropic API:** ~$1–3 per PR (depends on release size); $0 when no new release
- **Maintenance:** Roughly 15 minutes of human review per merged PR

This is designed to be a **set-and-forget** project. Expect ~10–12 PRs per year (NGINX Plus releases ~4 times/year, plus occasional minor releases).

---

## Wanting to disable auto-updates?

Edit `.github/workflows/auto-update.yml` and either:

- Comment out the `schedule:` block to keep manual-only mode, or
- Add a workflow-level `if: false` to fully pause

The site keeps working perfectly without the auto-updater. The auto-updater is a *quality-of-life* feature, not a dependency.
