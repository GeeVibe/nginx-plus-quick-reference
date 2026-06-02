# Extending the guide

How to add or modify entries by hand. (The auto-updater handles new directives from official releases; this is for everything else — corrections, custom regional content, vertical-specific patterns.)

---

## Anatomy of an entry

Each directive entry lives in `docs/app.js` inside the `directives` array. The shape:

```js
{
  id: 'unique_kebab_id',
  category: 'auth',                    // one of the 17 category keys
  directive: 'oidc_token_endpoint',    // the actual NGINX directive name
  title: 'OIDC SSO with Okta or Auth0',
  description: 'Plain-English: what this enables, who it's for.',
  customerValue: 'One-line: what business outcome this drives.',
  docsUrl: 'https://docs.nginx.com/nginx/...',
  diagram: 'auth',                     // reference an existing diagram, or 'null' for none
  config: `
http {
    upstream backend {
        zone backend 64k;
        server backend1.example.com;
    }
    server {
        listen 443 ssl;
        location / {
            auth_oidc;
            proxy_pass http://backend;
        }
    }
}`
}
```

---

## The 17 categories

Defined in `docs/app.js` as the `CATEGORIES` object. Keys:

| Key | Display name |
|---|---|
| `auth` | Authentication & SSO |
| `health` | Active Health Checks |
| `api` | API Gateway |
| `lb` | Advanced Load Balancing |
| `kv` | Key-Value Store |
| `ha` | HA & Clustering |
| `iot` | IoT & MQTT |
| `cache` | Caching |
| `media` | Streaming & Media |
| `session-log` | Session Logging |
| `routing` | Dynamic Routing |
| `tls` | TLS/SSL Debugging & Security |
| `tunnel` | Tunneling & Proxying |
| `internal` | Internal Tooling |
| `stream-session` | Stream Sessions |
| `perf` | Performance & Optimization |
| `proxy-proto` | PROXY Protocol |

If you need a category that doesn't exist, add it to `CATEGORIES` *and* add a matching diagram key in `svgDiagrams`.

---

## Step-by-step: add a new entry

1. Open `docs/app.js`
2. Find the `directives` array (large object array)
3. Add your new entry, matching the existing format exactly
4. If a new diagram is needed, add an entry to the `svgDiagrams` object with a unique key, and reference it in your entry's `diagram` field
5. Save. Refresh `docs/index.html` in your browser. Confirm it renders.
6. Open a PR

---

## Style guide

### Titles

Use plain-English use-case phrasing, not directive names. Customer-facing.

✅ "OIDC SSO with Okta or Auth0"
❌ "auth_oidc directive"

### Descriptions

One to two sentences. Explain *what this unlocks*, not how it works.

✅ "Replace per-app login pages with a single OIDC flow. Customers stay in their identity provider; NGINX validates and proxies the session."
❌ "Configures the auth_oidc directive to validate JWT tokens."

### Customer-value lines

One sentence. Business outcome, not technical detail.

✅ "Eliminates the need for an external SSO appliance."
❌ "Enables OIDC token validation."

### Config snippets

Minimal but **valid**. Should pass `nginx -t` mentally. Keep it under ~15 lines.

---

## Adding a diagram

Diagrams are inline SVG defined in the `svgDiagrams` object in `docs/app.js`. Each one is a function that returns an SVG string.

Style conventions:

- Dark theme: `#1a1a2e` background, `#00b4d8` (teal) and `#06d6a0` (green) for primary boxes
- Boxes: rounded rects, `rx="6"`
- Labels: white text, 12–14px
- Arrows: white or teal, with arrowheads
- Use the existing diagrams as templates

For new use cases that need a custom diagram, **sketch it on paper first** before writing SVG. The diagram is the most important asset on the page.

---

## When the auto-updater touches your edits

The auto-updater only **appends** new entries. It will not modify existing ones unless explicitly invoked to do so.

If you want to protect an entry from any future auto-edits (e.g., you've heavily customized a description), tag it:

```js
{
  id: 'oidc_token_endpoint',
  // pinned: do not auto-edit
  // ...
}
```

The skill respects this comment.

---

## Pull request checklist

When you open a PR with a new or edited entry:

- [ ] The entry follows the format above exactly
- [ ] Category is one of the 17 (or you're proposing a new one with justification)
- [ ] Description is plain English, customer-facing
- [ ] Customer-value line is a single business-outcome sentence
- [ ] Config example is minimal and would pass `nginx -t`
- [ ] Diagram reference is valid (existing key) or you've added a new diagram
- [ ] Live preview confirmed in a browser
- [ ] Sources cited in the PR description (link to docs.nginx.com)
