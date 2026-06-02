# Contributing

Thanks for considering a contribution. This project welcomes PRs, issues, and discussion from:

- F5 employees (any team — field, marketing, partner, eng)
- NGINX Plus customers and prospects
- Partners and the broader NGINX community

---

## Ways to contribute

| What | How |
|---|---|
| **Spot a factual error** | Open an issue with the page link and the correction |
| **Suggest a missing use case** | Open an issue describing the use case and which Plus directive(s) it'd showcase |
| **Improve a diagram or description** | Fork → edit → PR |
| **Add a translation** | Fork → translate `docs/app.js` strings → PR |
| **Vertical/regional customization** | Fork to your own GitHub org and deploy independently (no PR back needed — the license permits this) |
| **Fix a typo** | Just open the PR directly |

---

## PR process

1. Fork the repo
2. Create a feature branch (`fix/typo-oidc-description` or `add/grpc-use-case`)
3. Edit `docs/app.js` for content; `docs/style.css` for visuals; `docs-meta/` for documentation
4. Open the live preview locally (`python3 -m http.server 8000 -d docs`)
5. Open the PR with a short description of *why* the change matters

Style conventions are in [`docs-meta/EXTENDING-THE-GUIDE.md`](docs-meta/EXTENDING-THE-GUIDE.md).

---

## What gets auto-updated vs. needs a human

| Change type | How it happens |
|---|---|
| New directive in an NGINX Plus release | Auto-updater opens a PR; human reviews & merges |
| Fix to an existing entry | Manual PR |
| New use-case category | Manual PR (auto-updater proposes but never creates) |
| New SVG diagram | Manual PR |
| Translation | Manual PR (fork) |

---

## Code of conduct

Be respectful. Disagree on technical merit, not people. Assume good faith.

This is a community resource for the NGINX ecosystem, not a battleground.
