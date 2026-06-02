# Setup — for the maintainer

Step-by-step guide to publish this repo to `GeeVibe/nginx-plus-quick-reference` and turn on the auto-updater.

---

## Step 1 — Create the GitHub repo

Option A — via the web:

1. Go to [github.com/new](https://github.com/new) (signed in as `GeeVibe`)
2. Repository name: `nginx-plus-quick-reference`
3. Description: *"A use-case field guide to what NGINX Plus unlocks beyond open-source NGINX. For F5 SEs, customers, and the NGINX community."*
4. Visibility: **Public**
5. **Do not** initialize with README, .gitignore, or LICENSE (we have those)
6. Click *Create repository*

Option B — via the GitHub CLI (faster):

```bash
gh repo create GeeVibe/nginx-plus-quick-reference \
  --public \
  --description "A use-case field guide to what NGINX Plus unlocks beyond open-source NGINX."
```

---

## Step 2 — Push the prepared repo

Unzip/extract the bundle, then:

```bash
cd nginx-plus-quick-reference

git init
git branch -M main
git add .
git commit -m "Initial commit — NGINX Plus Quick Reference v1.0.0"
git remote add origin https://github.com/GeeVibe/nginx-plus-quick-reference.git
git push -u origin main
```

---

## Step 3 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under *Build and deployment*:
   - **Source:** GitHub Actions (not "Deploy from a branch" — we have a workflow that handles it)
3. Save

Within 1–2 minutes, the *Deploy site to GitHub Pages* workflow will run and your site will be live at:

```
https://geevibe.github.io/nginx-plus-quick-reference/
```

To verify:

- Go to the **Actions** tab in your repo
- Confirm the *Deploy site to GitHub Pages* workflow finished green
- Visit the URL above

---

## Step 4 — Add the Anthropic API key (for the auto-updater)

The Claude Code skill runs in GitHub Actions and needs an Anthropic API key.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com) → API Keys
2. In your repo: **Settings** → **Secrets and variables** → **Actions** → *New repository secret*
3. Name: `ANTHROPIC_API_KEY`
4. Value: paste the key
5. Save

The `GITHUB_TOKEN` secret is automatically provided by GitHub — you don't need to create it.

---

## Step 5 — Test the auto-updater manually

1. Go to **Actions** tab → *Auto-update NGINX Plus directives*
2. Click *Run workflow* → select `main` → *Run workflow*
3. Watch it run. Two outcomes:
   - **No new version detected** → workflow exits clean (most weeks)
   - **New version detected** → skill drafts entries and opens a PR

Either is correct. If you want to *force* a PR for testing, edit `skills/nginx-plus-guide-updater/state/last-seen-version.txt` to an older version (e.g., `R30`), commit, push, then re-run the workflow.

---

## Step 6 — (Optional) Customize branding

A few small things you may want to personalize:

| File | What to change |
|---|---|
| `README.md` | Update contact info, badges if needed |
| `docs/index.html` | Add a favicon (place `favicon.ico` in `docs/` and reference it in `<head>`) |
| `docs-meta/CONTACT.md` | Update email / LinkedIn |
| `LICENSE` | Already set to CC BY-NC-SA 4.0 — change only if you want a different license |

---

## What you have now

✅ Live public site at `https://geevibe.github.io/nginx-plus-quick-reference/`
✅ Auto-updater that runs every Sunday at 6am UTC
✅ Manual workflow trigger available anytime
✅ Public docs explaining the project for SEs, customers, and contributors
✅ CC BY-NC-SA 4.0 license blocking competitor repackaging while welcoming F5 ecosystem use
✅ Clean repo structure that can grow

The maintenance overhead from here is roughly **15 minutes per auto-update PR** (~10–12 PRs/year).

---

## Need help with any of this?

The most common stumbles:

- **Pages not deploying** → Check Actions tab; the workflow may need to be approved on first run for new repos
- **Workflow needs permissions** → Settings → Actions → General → Workflow permissions → "Read and write permissions"
- **Anthropic API errors** → Check the secret name is exactly `ANTHROPIC_API_KEY` (case-sensitive)
- **Skill not finding new directives** → docs.nginx.com may have changed structure; check `scripts/check-release-notes.py` parser

Open an issue on the repo if you hit something not covered here.
