# For NGINX Plus customers and prospects

> If you're evaluating NGINX Plus — or trying to figure out what you'd get by upgrading from open-source NGINX — this guide is for you.

---

## What is this?

A free, public, community-maintained reference that answers one question:

> **"What does NGINX Plus actually unlock that open-source NGINX doesn't?"**

The answer lives in the [official NGINX docs](https://docs.nginx.com) — but the docs are organized by directive (alphabetical, technical). This guide is organized by **use case** (what you're trying to accomplish).

Examples of use cases the guide covers:

- Authentication & SSO with OIDC, JWT, SAML
- Active health checks with custom probes
- API gateway with rate limiting and key auth
- Advanced load balancing (least-time, sticky, zone-aware)
- Shared key-value store across worker processes
- HA & state synchronization
- mTLS, OCSP stapling, dynamic TLS
- And about a dozen more

---

## How is this different from docs.nginx.com?

| docs.nginx.com | This guide |
|---|---|
| Organized by module and directive name | Organized by use case |
| Comprehensive technical reference | Curated to Plus-only highlights |
| Reads like documentation | Reads like a field guide |
| Always the source of truth | Built *from* the source of truth |

**Use both.** This guide gets you oriented. The official docs get you to production.

---

## How to read an entry

Each entry has four things:

1. **A use-case title** — what you're actually trying to do
2. **A marketecture diagram** — fullscreen-able for sharing in your own internal reviews
3. **The Plus-only directives** that make this use case possible
4. **A minimal config example** — copy-pasteable, with a link to the full official docs

---

## Common questions

### Is this an official F5 product?

No. This is a community-maintained reference, created by an F5 employee but not an official deliverable. The official product, support, and definitive documentation come from F5 / NGINX directly.

### Is the content accurate?

It's built *from* the official docs, with an auto-updater that watches the NGINX Plus release notes and drafts new entries when releases ship. Every PR is human-reviewed before merging. See [`HOW-THE-AUTO-UPDATE-WORKS.md`](HOW-THE-AUTO-UPDATE-WORKS.md) for details.

That said: **always cross-check critical decisions against [docs.nginx.com](https://docs.nginx.com)**.

### Can I share this with my team?

Yes. CC BY-NC-SA 4.0 licensed. Share, fork, translate, customize. The only restriction is you can't repackage and sell it.

### Can I suggest a missing use case or correction?

Please do. See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — opening a GitHub issue is the fastest way.

### I'm new to NGINX Plus. Where do I start?

1. Open the [live site](https://geevibe.github.io/nginx-plus-quick-reference/)
2. Click through 3–4 categories that look relevant to your environment
3. For each one, look at the diagram and ask: *"would I want this in my production stack?"*
4. The categories where the answer is yes → those are your strongest reasons to consider Plus

---

## Decision aid: Plus vs. OSS

If you're sitting between Community NGINX and NGINX Plus, this guide is structured to help you decide:

- **If only 1–2 use cases apply to you** → you can probably build similar functionality with OSS + extra glue, and Plus may be overkill
- **If 4–5+ use cases apply** → the operational simplicity of Plus typically wins; the math favors the commercial license
- **If you need supported HA, observability, or compliance features** → Plus is built for that and OSS isn't

The guide isn't trying to sell you Plus. It's trying to make the decision visible.

---

## Want to talk to someone at F5?

Open the live site → talk to the SE who shared the guide with you. Or reach out via the contact info in [`CONTACT.md`](CONTACT.md).
