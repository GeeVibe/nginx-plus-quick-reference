# For F5 Field Solutions Engineers

> This page is for you — the SE in the field who wants a tool that makes the whiteboard moment portable.

---

## What this tool does *on a call*

You're on a Zoom (or in a customer office) with a prospect. They're running open-source NGINX. They ask: *"What do I actually get if I move to Plus?"*

The wrong answer is "let me send you a doc link later." Time kills deals.

The right answer is to **show them.** Pull up the guide, click the use case they care about, screen-share the diagram, and have a real architecture conversation.

That's what this tool is built for.

---

## The three jobs

### 1. Recreate the whiteboard moment

Click a use case → marketecture diagram appears → press `F` for fullscreen. No tabs. No PDFs. No slides between you and the customer. You're advising, not demoing a product.

### 2. Power up MEDDIC

- **Metrics** — Every card frames the directive as customer outcome, not feature
- **Economic Buyer** — Fullscreen diagrams work for execs who don't care about syntax
- **Decision Criteria** — 17 use-case categories map directly to how a technical eval gets structured
- **Decision Process** — Share the URL with your champion; it's self-serve
- **Identify Pain** — Pain → solution in 10 seconds via search
- **Champion** — Arm them with a cheat sheet they can show their boss

Especially shines when **procurement** asks "what are we getting for the commercial license?" — you have a visual answer in one click.

### 3. Plus vs. OSS decision aid

Every entry is scoped to *what Plus unlocks beyond open source*. When a prospect or partner is on the fence, the use cases make the case for you.

---

## How to use it (practical mechanics)

| Action | How |
|---|---|
| Filter by use case | Click any category pill |
| See diagram + config | Click the directive card |
| Whiteboard mode | Press `F` (fullscreen the diagram) |
| Navigate diagrams | Arrow keys ← → |
| Exit fullscreen | `ESC` |
| Search | Press `/` and type |
| Copy a config example | Hover the snippet, click the copy button |

---

## Tips from the field

- **Pre-call:** Have the tool open in a tab before you join. Don't fumble.
- **Discovery:** Use search (`/`) to jump straight to a directive when a customer mentions it
- **Architecture review:** Lead with fullscreen diagrams. The architect leans in.
- **Procurement call:** "Here's the line item you're paying for. Let me show you what it does." Click. Fullscreen. Done.
- **Follow-up:** Send the deep link to the specific category, not the homepage

---

## Customizing it for your region or vertical

The repo is licensed CC BY-NC-SA 4.0 — you can fork it and edit:

- Translate to another language
- Add your own use cases (e.g., regional compliance, vertical-specific patterns)
- Re-skin to match your team's branding
- Add notes/disclaimers specific to your geo

Fork, edit, deploy your own GitHub Pages copy. The repo structure is intentionally simple.

See [`EXTENDING-THE-GUIDE.md`](EXTENDING-THE-GUIDE.md) for how to add or modify entries.

---

## Want it to stay current without you doing anything?

That's the whole point of the auto-updater. See [`HOW-THE-AUTO-UPDATE-WORKS.md`](HOW-THE-AUTO-UPDATE-WORKS.md).

When NGINX Plus ships a new release, a Claude Code skill drafts the new entries and opens a pull request. You (or whoever maintains your fork) reviews and merges. The site refreshes itself.

---

## Questions or want to contribute back?

See [`CONTACT.md`](CONTACT.md) and [`../CONTRIBUTING.md`](../CONTRIBUTING.md).
