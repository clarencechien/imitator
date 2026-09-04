# Publishing rules

Rules the host enforces when you `PUT` an artifact. Error responses point here, so
this file is written in English — the thing reading it is usually an agent.

## 1. `X-Sandbox: off` and third-party scripts are mutually exclusive

**Enforced. A `PUT` that breaks this returns `400` and stores nothing.**

By default every artifact is served with
`Content-Security-Policy: sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads`.
That puts the page in an **opaque origin**: its JavaScript cannot read same-origin
responses, so it cannot reach other artifacts.

`X-Sandbox: off` removes that. The page then runs with full same-origin access, and
its JavaScript can `fetch('/')` to list every artifact the viewer may see — including
group-only ones, using the viewer's own cookie — and send the contents anywhere.
`HttpOnly` does not stop this: it blocks `document.cookie`, not the browser attaching
the cookie to a same-origin request.

**Any third-party script on such a page inherits that access.** The realistic threat
is not a malicious upload — you already hold a write token — it is a CDN that is
compromised months later, the polyfill.io pattern. One page is enough to read
everything, including the artifacts that *are* sandboxed: a CSP governs the document
built from a response, not a `fetch()` that reads it as data.

So: if a page needs `X-Sandbox: off`, **inline its dependencies** — including its
webfonts, since on a same-origin page even a stylesheet can be made to leak (a
selector that fires a background-image request reports what it matched). Paste the
library source into a `<script>` tag instead of loading it at runtime. Pinning a
version and adding Subresource Integrity is *not* sufficient for anything served from
an unversioned always-latest URL (`cdn.tailwindcss.com` is the common one).

### Webfonts are allowed on a sandboxed page

`<link>`ing a stylesheet from `fonts.googleapis.com` is fine, and is not what this
rule is about. A stylesheet cannot execute code, and under the default sandbox the
page sits in an opaque origin where there is nothing for it to read. The line is
**executable code from a third party**, not "anything over the network".

```html
<!-- fine, sandbox on -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap">
```

Ask for only the weights you use, and always `&display=swap` so text renders while
the font is still in flight.

**Any other third-party stylesheet gets a warning** (`third-party-stylesheet`) — not a
rejection. It cannot execute code, so it is not the risk this rule is about; it just makes
the report stop being one self-contained file. One case is worth calling out because it
fails silently: linking `report.css` straight from `raw.githubusercontent.com`. That host
serves `text/plain` with `nosniff`, so the browser will not apply it as CSS, and the page
loses the whole chassis with nothing reported anywhere.

```html
<!-- rejected -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- accepted -->
<script>/* Chart.js 4.5.1 */ ...library source... </script>
```

There is a tool for this — `scripts/inline-cdn.mjs`, Node built-ins only, no
dependencies, so an agent can fetch that one file and run it:

```bash
node scripts/inline-cdn.mjs --check report.html   # report only, exit 1 if work remains
node scripts/inline-cdn.mjs report.html           # rewrite in place
```

It leaves alone what it cannot fix safely and says so: `type="module"` (inlining it
would not stop its own `import`s from fetching at runtime), scripts injected by other
scripts, and stylesheets. It warns when the original tag had `defer`/`async`, because
an inline script ignores both and runs immediately — the ordering changes.

Open the result in a browser before uploading. Inlining freezes a snapshot: you stop
receiving upstream fixes, which is the right trade for a frozen report and the wrong
one for something you actively maintain.

## 2. Storage APIs and `X-Sandbox`

**Warned, not enforced, in both directions.** A successful `PUT` may return a
`warnings` array.

An opaque origin makes these throw `SecurityError`:

`localStorage` · `sessionStorage` · `indexedDB` · `document.cookie` ·
`document.domain` · `Notification` · `BroadcastChannel` · `SharedWorker` ·
`serviceWorker`

### `storage-api-with-sandbox-on` — the page will break, silently

Your HTML uses one of those APIs but was uploaded sandboxed. The calls throw in the
browser and nothing reaches you. The warning exists because that failure is silent.

**The fix is almost always to drop the storage call, not to drop the sandbox.**

- Per-view state — a theme, a language, a collapsed section — belongs in a variable.
  Default it from `prefers-color-scheme` or `navigator.language` and you get better
  behaviour than a remembered value: it follows the reader's system.
- State the reader should keep belongs in an explicit **export/import** — a download
  plus a file picker. A file travels between devices; `localStorage` does not.

Only when the page genuinely needs a real origin — `Notification` has no
sandbox-compatible equivalent at all — is `X-Sandbox: off` the answer, and then
rule 1 applies: no third-party `<script src>`, or the upload is refused outright.

### `sandbox-off-not-needed` — you paid for nothing

You asked for `X-Sandbox: off` but the HTML uses none of those APIs. Dropping the
sandbox buys nothing here and costs a lot: the page gets full same-origin access and
can read every artifact the viewer is allowed to see, including group-only ones.
Upload it again without the header.

### Counting the exceptions

`GET /v1/a` returns `sandbox` on every entry, so the exceptions are countable at any
time:

```bash
curl -s https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN" \
  | node -e 'const a=JSON.parse(require("fs").readFileSync(0,"utf8"));
    console.log(a.filter(x=>x.sandbox==="off").map(x=>x.slug).join("\n")||"0 份")'
```

An entry written before that field existed reports `on`; every write since records it
explicitly. Scanning local files is **not** a substitute — anything pushed straight
with `curl` has no local copy to scan.

## 3. Writing prompts for report generation

Most reports here are generated by an LLM from a prompt. Two things belong in that
prompt:

- **"Do not load any script from a CDN at runtime. Paste the source in."** Of the 272
  migrated reports, 231 pull scripts from `cdn.tailwindcss.com`, `cdn.jsdelivr.net` or
  `unpkg.com` at runtime. That is survivable while they stay sandboxed, but it is a
  standing dependency on three third parties that can change what they serve at any
  time. Webfonts are the exception — see rule 1.
- **"Do not use localStorage or any other storage API."** Keep state in a variable.
  It keeps the page sandboxed, which is what makes rule 1 a non-issue.
- **Point the model at the style guide**, which covers both of the above and the rest
  of what a report here should be:
  <https://github.com/clarencechien/imitator/blob/main/style/STYLE.md>

## 4. The style fingerprint

**Optional. Never rejected.** A report written to
[`style/STYLE.md`](../style/STYLE.md) carries five `<meta name="imitator-*">` tags in
its first 8 KB:

| meta | content |
|---|---|
| `imitator-style` | guide version, `v3` |
| `imitator-register` | what kind of piece this is, ≤ 120 chars |
| `imitator-reference` | the real printed object it was modelled on, ≤ 160 chars |
| `imitator-paper` | `hsl(h s% l%)` or `#rrggbb` |
| `imitator-accent` | `hsl(h s% l%)` or `#rrggbb` |

The host extracts them on `PUT`, keeps the full set in the object's metadata, echoes it
in the `PUT` response as `style`, and returns a compact copy (`v`, `paper`, `accent`,
`register` and `reference` cut to 24 characters) in every row of the `/v1/a` listing.
`style: null` in a row means the report carried no fingerprint.

A field that fails its format is dropped and the rest kept; without `imitator-style`
there is no fingerprint at all.

**A report that carries a fingerprint is also audited** — statically, cheaply, and never
fatally. Four things are checked, each one a defect seen in a real report:

| code | what it means |
|---|---|
| `no-chassis` | claims a version but `report.css` is not in the page |
| `single-colour-scheme` | no dark-mode values declared |
| `bare-fr-grid-track` | a `grid-template-columns` with a bare `fr`; min-content can widen it past the viewport |
| `heavy-inline-image` | an inlined `data:` image over 400 KB |

Failures come back as `warnings` on the `PUT` **and are stored** in the fingerprint as
`checks`, so `scripts/style-census.mjs --audit` can answer "which rule is missed most
often" across the whole archive. A report with **no** fingerprint is not audited at all —
it never claimed to follow the guide, and adoption is already countable from `style: null`. Re-uploading a body without the tags clears the stored
fingerprint — it describes the body, and the body changed.

Why it exists: so the next report can see what was published last and choose a paper and
accent away from it (`STYLE.md`, the `RECENT:` step); so anyone reading a file later knows
which version of the guide it followed; and so the archive accumulates, per report, what
was chosen — the raw material for a taste profile that is not the model's average.

## 5. Everything else

| | |
|---|---|
| `slug` | `[a-z0-9-]`, 64 chars max. Re-using a slug **overwrites**; R2 has no versioning, so the previous version is gone for good. |
| Ownership | The group that first published a slug owns it. Another group's token gets `403` on overwrite and `404` on delete. Ownership never transfers. |
| Body | 25 MB max. Served back byte-for-byte — never rendered, converted or templated. |
| `X-Title` | UTF-8, 200 chars max. Sent as raw bytes; the host repairs the latin-1 decode. |
| `X-Updated-At` | ISO 8601, not in the future. Omit it and you get upload time. |

Content checks are skipped for bodies over 2 MB — the response says so in
`warnings`. Review the rules yourself for those.
