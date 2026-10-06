# Extending the guide

How to add or change entries by hand. The auto-updater adds new directives from official releases. Use this guide for everything else: corrections, custom regional content, and patterns for specific verticals.

---

## How the site is put together

There's no build step and no JS data model for entries.

| What | Where | Scope |
|---|---|---|
| **Directive cards** | `docs/index.html`, as static `<article class="card">` elements | One per directive or group of directives |
| **Categories** | `docs/index.html`: a filter pill + a `<section class="category-section">` | 17 of them |
| **Marketecture diagrams** | `docs/app.js` → `DIAGRAMS['<key>']` (function returning SVG) | **One per category** |
| **Config snippets** | `docs/app.js` → `CONFIG_SNIPPETS['<key>']` (`{ title, source, code }`) | **One per category** |
| **Search** | Matches each card's `data-search` attribute | Per card |

Clicking a category pill shows that category's diagram and config snippet above its cards.

---

## Anatomy of a card

```html
<article class="card" data-search="oidc_provider auth_oidc ngx_http_oidc_module oidc sso okta auth0 entra login">
  <div class="card-badge">Entire Module — Plus Only</div>
  <h3 class="card-module">ngx_http_oidc_module</h3>
  <div class="card-directives">
    <code>oidc_provider</code> <code>auth_oidc</code>
  </div>
  <p class="card-usecase">OIDC single sign-on with Okta, Auth0 or Entra ID</p>
  <p class="card-value">Replace per-app login code with one OIDC flow at the edge. Users stay in their identity provider; NGINX validates the session and proxies.</p>
  <a class="card-link" href="https://nginx.org/en/docs/http/ngx_http_oidc_module.html" target="_blank" rel="noopener noreferrer">View Docs <span class="arrow">→</span></a>
</article>
```

| Element | Notes |
|---|---|
| `data-search` | The only text search matches on. Include every directive name, the module, and the words people would search for. |
| `card-badge` | Use one already on the site: `Entire Module — Plus Only`, `Plus-Only Directive`, `Plus-Only Directives`, `Plus-Only Parameters`, `Plus-Only Server Parameter` |
| `card-module` | The module name. For http and stream, use `ngx_http_x_module &amp; ngx_stream_x_module` |
| `card-directives` | One `<code>` per directive. Optional extras: `<span class="card-directives-more">+N more …</span>`, and `<span class="card-directives-note">…</span>` when there are no directives |
| `card-link` | Link to the nginx.org reference. For several links, wrap them in `<div class="card-links-multi">` (see the `state` card) |

Escape `&` as `&amp;`.

---

## The 17 categories

Each key shows up in four places: the pill, the section, `DIAGRAMS`, and `CONFIG_SNIPPETS`.

| Key | Pill label |
|---|---|
| `auth` | Authentication & SSO |
| `health` | Active Health Checks |
| `api` | Dynamic Configuration & API |
| `lb` | Advanced Load Balancing |
| `kv` | Key-Value Store |
| `ha` | High Availability & Clustering |
| `iot` | IoT & MQTT |
| `cache` | Cache Management |
| `media` | Media Streaming |
| `session-log` | Session Logging |
| `routing` | Dynamic Upstream Routing |
| `tls` | TLS/SSL Debugging & Security |
| `tunnel` | HTTP Tunneling |
| `internal` | Internal Routing |
| `stream-session` | Stream Session Management |
| `perf` | Performance & Observability |
| `proxy-proto` | PROXY Protocol Vendor Extensions |

To add a category:

1. Add a `<button class="pill" data-category="<key>">` to the filter pills
2. Add a `<section class="category-section" data-category="<key>" id="section-<key>">` with a header (icon, title, count) and a `.cards-grid`
3. Add `DIAGRAMS['<key>']` and `CONFIG_SNIPPETS['<key>']` to `docs/app.js`
4. Update the "Use Case Categories" number in the stats bar

---

## Step-by-step: add a card

1. Get the facts from the source. `python3 skills/nginx-plus-guide-updater/scripts/extract-directive.py <directive>` returns the syntax, context, description, examples and Plus-only status from the nginx.org XML.
2. In `docs/index.html`, find the `<section … data-category="<key>">` and add your `<article class="card">` to the end of its `.cards-grid`.
3. Update the counts:
   - that section's `<span class="category-count">N entries</span>`
   - `<span id="resultsText">Showing all N entries</span>`, which should equal `grep -c '<article class="card"' docs/index.html`
4. If the category's diagram or config snippet should now show the new directive, edit `DIAGRAMS` / `CONFIG_SNIPPETS` in `docs/app.js`.
5. Run `python3 -m http.server 8000 -d docs`, check the card, the category pill (diagram and snippet) and search.
6. Open a PR.

---

## Style guide

### Use-case lines (`card-usecase`)

Use plain-English use-case phrasing written for customers, not directive names.

✅ "OIDC single sign-on with Okta or Auth0"
❌ "auth_oidc directive"

### Value lines (`card-value`)

One or two sentences. Explain *what this unlocks*, not how it works, and stay within what the docs say.

✅ "Replace per-app login pages with a single OIDC flow. Customers stay in their identity provider; NGINX validates and proxies the session."
❌ "Configures the auth_oidc directive to validate JWT tokens."

### Config snippets

Minimal but **valid**: it should pass `nginx -t`. Keep it under ~25 lines and give the `source` doc link. Each category has a single snippet, so extend it rather than adding a second one.

---

## Adding or changing a diagram

Diagrams are functions in the `DIAGRAMS` object in `docs/app.js`. They're built with the helpers `box(x, y, w, h, label, sublabel, color)`, `arrow(x1, y1, x2, y2, color, label)` and `svgWrap(w, h, content)`.

Style conventions:

- Colors: `teal` (default), `green` (healthy/target), `red` (failure), `orange` (highlight)
- Labels: short. Sublabels for directive names or ports
- Use the existing diagrams as templates

Sketch a new diagram on paper before writing SVG. The diagram is the most important asset on the page.

---

## When the auto-updater touches your edits

The auto-updater only **adds** cards and updates counts. It doesn't change existing cards, diagrams or config snippets.

To protect a card from any future automated edits (for example, a heavily customized value line), put this immediately above it:

```html
<!-- pinned: do not auto-edit -->
<article class="card" …>
```

---

## Pull request checklist

- [ ] The card follows the markup above
- [ ] The category is one of the 17, or you're proposing a new one with justification
- [ ] The use-case line is plain English and written for customers
- [ ] The value line stays within what the docs say
- [ ] The section count and "Showing all N entries" are updated
- [ ] Any diagram or snippet change passes `nginx -t`, and the snippet's `source` is linked
- [ ] You've checked it in a browser
- [ ] Sources are cited in the PR description (nginx.org / docs.nginx.com)
