# Writing a report for imitator

**Guide version: v3.** The fingerprint you leave in the file must say `v3`.

You are producing **one self-contained HTML file**. Read this before you write a line of it.

**Fetch the chassis and paste its contents into a `<style>` block. Never `<link>` it.**
`https://raw.githubusercontent.com/clarencechien/imitator/main/style/report.css`

That URL is a source to read, not a stylesheet to reference. `raw.githubusercontent.com`
serves files as `text/plain` with `X-Content-Type-Options: nosniff`, so a browser refuses
to apply it as CSS — `<link rel="stylesheet" href="…/report.css">` silently drops the
entire chassis and every reader gets an unstyled page with no error anywhere. This has
already happened once. Read the file, paste the bytes.
Worked example: `https://raw.githubusercontent.com/clarencechien/imitator/main/style/mockup.html`
Six registers, six specimens: `https://github.com/clarencechien/imitator/tree/main/style/voices`

**This file is the short version — everything a report must get right.** The craft
(headline, spine, editorial devices, motion, charts, the reject list) and the incidents
behind each floor rule live in
`https://raw.githubusercontent.com/clarencechien/imitator/main/style/STYLE-reference.md`.
Open it when you reach that part of the work; you do not need it to start. **If you draw a
chart, read its Charts section first — the series colours are not yours to pick.**

## What these reports are

Not status reports. Not dashboards. Each one is an **argument someone wants to spread** —
a concept, a technique, a way of seeing a problem — written to be read end to end and
passed on. The job is to make an idea land and stick.

That has a consequence for how it looks: **each report gets its own voice.** A fifty-year
history of the actor model should feel like a five-act play on warm paper. A note on agent
architecture should feel like a field notebook in condensed type on cold grey. They should
not look like two issues of the same newsletter, and they must not look like the same
generic AI output with different words in it.

So: the chassis fixes readability, structure, responsiveness and motion hygiene. **Colour,
typeface, scale, signposting and editorial devices are yours to choose for this piece.**
Choose them deliberately, from the content — then commit.

## Step 0 — name the register before you write a single rule

Left to itself, a model given freedom converges on the same page every time. The way out
is a forced intermediate step: **before any CSS, write a comment that names this piece's
register in your own words, and derive the voice from it.**

```html
<style>
/* REGISTER:  驗屍 — 用 231 萬筆資料檢驗三個流行說法，讀者是準備進場的散戶。
   REFERENCE: 1990 年代法醫學教科書的病例頁 — 表格化的檔案欄、編號的所見、一枚結論章。
   PAPER:     解剖室的紀錄紙 — 奶油色，hsl(42 30% 96%)。
   VOICE:     驗屍紅只給裁決用、宋體標題、等寬體的檔案欄。
   NOT:       儀表板。沒有互動元件，數字是證據不是裝飾。
   RECENT:    paper 352° 62° 76° · accent 218° 220° 250° — 42° 與 4° 都離得夠遠，不用改。 */
```

The order of those lines is the order you work in. REFERENCE and PAPER come from the
content. RECENT comes **last**, and it is a check, not a search.

If the register you wrote could describe half the reports in the archive, it is too
generic — go again.

### REFERENCE — a real printed object, named

A model's taste is the mean of everything it has seen. Words like "warm" or "restrained"
point at that mean. A **named object** points at one place in the distribution instead:
*1978 年《科學月刊》的內頁* is a specific thing with a specific paper, face, column and
signposting; "a science magazine" is not. So name one — publication or document type,
era, and which page — and derive faces, paper, devices from it. It goes in the
`imitator-reference` meta so the choice is on record. Not a website, not a brand, not
another report on this host.

### RECENT — check against what was published last

Divergence is a property of the archive, not of one report, so the last few reports are
worth a look. Fetch their fingerprints:

```bash
IMITATOR_TOKEN=$IMITATOR_TOKEN node scripts/style-census.mjs --recent 3
# → RECENT: paper 352° 62° 76° · accent 218° 220° 250°
```

(`scripts/style-census.mjs` is in the imitator repo, Node built-ins only; or call
`GET /v1/a` with the token and read each row's `style.paper` / `style.accent`.)

**Do this after REFERENCE and PAPER, never before.** If your material-derived paper hue is
within 15° of one of the last three papers, or your accent within 25° of one of the last
three accents, go back and choose a **different material** — do not nudge the hue. Write
the hues you checked against in the `RECENT:` line either way. No token or no network:
`RECENT: unavailable`.

Why the order matters, measured: when this step ran *first* with eight recent hues to
avoid, four reports from four unrelated sources all found the same unoccupied stretch of
the wheel (128°–150°), then reverse-engineered a material to justify it — four kinds of
green ledger paper. A hue chosen from the gaps is a shared optimum; a hue derived from the
material is not. The check exists to catch a collision, not to steer.

## The floor — true in every report, whatever the voice

Each of these exists because it was broken once and shipped. The stories are in the
reference; here are the rules.

1. **One file, no third-party `<script src>`.** Any script you need gets pasted in as
   source. Enforced: a report that loads a third-party script with the sandbox off is
   rejected outright. Webfonts are the exception — see Typefaces.
2. **No storage APIs** — no `localStorage`, `sessionStorage`, `indexedDB`,
   `document.cookie`, `BroadcastChannel`, `serviceWorker`. The page runs in an opaque
   origin; they throw. Keep state in a variable. If the reader needs to keep something,
   give them an explicit export and import — and then rule 8 applies to you.
3. **`</body>` must be present.** The CDN injects a script immediately before it.
4. **Body text ≥ 17px with ≥ 1.8 line-height.** The chassis does this. Do not shrink it,
   and do not set long passages in a display or mono face.
5. **Both colour schemes, and a way to see the other one.** If you override the light
   tokens you override the dark ones too, with values chosen for a dark surface — never
   an inversion. Then ship the toggle, so a reader whose devices are all dark can still
   see the light palette you designed. The chassis styles it; you add the button right
   after `<body>` and the script right before `</body>`:
   ```html
   <button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false">theme · auto</button>
   ```
   ```html
   <script>
   (() => {
     const root = document.documentElement, btn = document.getElementById('theme-toggle');
     let dark = matchMedia('(prefers-color-scheme: dark)').matches;   // state in a variable
     btn.textContent = 'theme · ' + (dark ? 'dark' : 'light');
     btn.addEventListener('click', () => {
       dark = !dark; root.dataset.theme = dark ? 'dark' : 'light';
       btn.textContent = 'theme · ' + (dark ? 'dark' : 'light'); btn.setAttribute('aria-pressed', 'true');
     });
   })();
   </script>
   ```
   It stamps `data-theme` only on click; until then the page follows the system. No
   storage: the choice lasts for the visit, and that is intended.
6. **Nothing scrolls the page sideways**, at 375px or at 1440px.
   - **Tables** go inside `<div class="table-scroll">`, always. The chassis handles both
     screens: on a desktop cells wrap and the wrapper widens into the gutter; on a phone
     the table scrolls in its box with the first column pinned (`.plain` on the wrapper
     opts out). Mark the cells that must not break — a model number, a date, a figure —
     with `.nowrap`, never the whole table. **A phone that has to scroll a spec table is
     the correct outcome.** Never fix a scrolling table by widening `--page`, raising
     `--measure` past 34em, or setting `overflow-x: visible`.
   - **Any grid you write yourself** uses `minmax(0, 1fr)`, never a bare `1fr`, and gives
     its children `min-width: 0`. Prefer `.cols` / `.tiles`, which already do both.

   Check it by loading the page at 375px, not by reading the CSS.
7. **Open with the fingerprint** — all five, inside the first 8 KB, before `<title>`:
   ```html
   <!doctype html>
   <html lang="zh-Hant">
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <meta name="imitator-style" content="v3">
   <meta name="imitator-register" content="驗屍 — 用 231 萬筆資料檢驗三個流行說法">
   <meta name="imitator-reference" content="1990 年代法醫學教科書的病例頁">
   <meta name="imitator-paper" content="hsl(42 30% 96%)">
   <meta name="imitator-accent" content="hsl(4 62% 41%)">
   <title>…</title>
   ```
   The host stores these and lists them at `/v1/a`; that is what the `RECENT:` step reads.
   `paper` and `accent` must be `hsl()` (or a hex); the rest is free text, register ≤ 120
   characters, reference ≤ 160. A malformed field is dropped silently, never rejected.
8. **The moment your report reads a file, every `innerHTML` in it becomes an attack
   surface.** A file picker, a paste box, a URL parameter, a `postMessage` listener — the
   values now come from whoever hands the reader a file, and every interpolation that
   was fine a minute ago is a stored XSS. The interpolation does not have to be new.
   Walk **every** one that reaches `innerHTML` and fix it by context; the two contexts
   need different fixes:
   - **HTML text** — `` `<span>${item.text}</span>` `` — HTML-escape `& < > " '`.
   - **An attribute holding JavaScript** — `` `onclick="pick('${item.id}')"` `` —
     escaping is **not** enough: the parser decodes `&#39;` back to `'` before the JS
     is compiled. Constrain the value to `/^[A-Za-z0-9_-]{1,64}$/` and regenerate it when
     it does not match, or drop the inline handler for `addEventListener`.

   Best is no sink at all: `createElement` + `textContent` + `addEventListener`. Then
   test with a hostile file, not a friendly one — a clean round-trip proves nothing here.

## Setup

```html
<style>
  /* 1. the chassis, pasted verbatim — the actual bytes of report.css, not a @import
        and not a <link>. It starts with a comment saying "imitator report chassis";
        if that string is not in your file, you have not pasted it. */
  …
  /* 2. this report's voice — override the tokens, add what it needs */
  :root {
    --paper:#faf7f0; --card:#fffdf8; --ink:#26211b; --ink-2:#4b4339;
    --mist:#6e6457; --rule:#e4dccb; --rule-hard:#c9bda6;
    --accent:#8c2332; --accent-soft:#f2e3e0;
    --disp:"Noto Serif TC", Georgia, serif;
  }
  /* 3. the same tokens for dark — under BOTH scopes, or the toggle only works one way.
        The @media wrapper is not optional: without it the dark block applies to every
        un-stamped page, and every reader on a light system gets the dark palette. */
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) { /* … dark values … */ }
  }
  :root[data-theme="dark"] { /* … the same dark values … */ }
</style>
```

Build the voice out of the tokens. A rule you write against `var(--rule)` and `var(--sp-5)`
inherits both colour schemes and the responsive scale for free; a rule you write against
`#ddd` and `24px` does not.

## Choosing a palette

Pick **paper, ink and one accent**, and name them after what they are in this piece —
`--curtain` for the red of a theatre, `--slate` for a technical grey. The naming is not
decoration: it forces you to decide what the colour is doing.

### Paper: name the material, then write the hue

Do not pick a paper colour. **Name what this document is physically printed on**, then
derive the tint from that material and write it as `hsl()` with the hue stated:

```css
/* PAPER: 證物袋的牛皮 — 暖，因為這是一份會被歸檔的東西 */
--paper: hsl(38 24% 95%);
```

`hsl()` is required here, and it is not a formatting preference. A hex is opaque: `#eef1f3`
hides the fact that you chose hue 200 at 15% saturation. Written as `hsl(200 15% 95%)`, the
choice is visible — to you while writing, and to anyone reading the file later.

Rules that follow from it:

- **State the hue, and mean it.** Kraft paper is ~35°, newsprint ~45°, a blueprint ~215°,
  a laboratory notebook ~150°. The material picks the number.
- **Saturation below 6% is a neutral grey, and neutral grey is a default, not a choice.**
  If you land there, either the material is genuinely colourless — say so in the comment
  and say why — or you have not chosen. Most documents are not printed on nothing.
- **Do not converge.** Cold light grey around `hsl(200 12% 95%)` is where an unconstrained
  model lands: it is the colour that breaks no rule and says nothing. It is on the reject
  list for exactly that reason.
- `#ffffff` reads as a default too. A tint reads as a decision.

Dark mode is a second material, not an inversion: kraft paper in the dark is warm
near-black (`hsl(38 14% 8%)`), never a desaturated grey.

### The rest

- **One accent, used three ways**: the coloured word in the headline, the section numbers,
  links. A second accent needs a reason — a second voice in the argument, not variety.
- **Contrast is not negotiable.** Body ink on paper ≥ 7:1, secondary ≥ 4.5:1, the accent on
  paper ≥ 4.5:1 wherever it carries text. If your accent is too light for text, use it for
  rules and marks and set the text in ink.
- **Dark mode is a second palette.** Warm cream becomes warm near-black (`#16130f`), not
  grey. Accents usually need to be lighter and less saturated than their light-mode twin.

### Two palettes that are already taken

- **Cold neutral grey paper** — anything near `hsl(200 12% 95%)` / `#eef1f3`. Four reports
  written from four unrelated sources under an earlier draft of this guide all landed
  within four units of that colour, because it is the tint that offends no rule. It is now
  the most generic choice available, not the safest one.
- **Any specimen's palette.** These are taken: bone paper with indigo and a Ming headline
  (the mockup); warm cream with curtain red (`epic`); grey-green with condensed type and
  red (`argument`); graph paper with green and orange (`digest`); cream with autopsy red
  and a stamp (`autopsy`); navy with a gold lamp (`night`); a four-colour bar over ivory
  with a heavy Latin word (`fieldguide`). Each was one report's answer. Yours is a
  different report.

## Typefaces — three jobs, three faces

Webfonts from Google Fonts are allowed:

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

A stylesheet cannot execute code, and the report is served in an opaque origin where there
is nothing for it to read. That is why fonts are allowed where scripts are not. **If a
report needs `X-Sandbox: off`, inline the font too** — on a same-origin page even CSS can
be made to leak.

Request only the weights you use, always `&display=swap`, at most three families.

| Job | What to pick |
|---|---|
| **Display** (`--disp`) | The face that carries the voice. `Noto Serif TC` for something historical or argued; `IBM Plex Sans Condensed`, `IBM Plex Serif`, `Space Grotesk`, `Archivo` for something technical. |
| **Body** (`--sans`) | `Noto Sans TC` unless you have a reason. Readability outranks personality here. |
| **Mono** (`--mono`) | `IBM Plex Mono`, `JetBrains Mono`, `Space Mono`. Carries signposts, labels and code — not paragraphs. |

**IBM Plex is a good default for the Latin half.** `IBM Plex Sans`, `IBM Plex Serif`,
`IBM Plex Sans Condensed` and `IBM Plex Mono` are all on Google Fonts, they share a
skeleton so they mix without clashing, and a Latin-only subset costs 13–30 KB — next to
nothing. **`IBM Plex Sans TC` is not on Google Fonts**, so there is no IBM face for the
Chinese half; pair Plex with Noto.

**Do not use `IBM Plex Sans JP` for Traditional Chinese.** It is on Google Fonts and it
covers most of the characters, which makes it a tempting shortcut — but the glyph forms
are Japanese (令 is the obvious one) and the coverage has holes that fall back mid-
sentence to whatever the reader's system has.

**The mixed-script trick.** Google Fonts has no condensed or display CJK face. Put a Latin
display face *first* and a CJK face after it: Latin words take the display face, Chinese
falls through to Noto. That is how a headline gets a distinct texture without a CJK
display font existing.

```css
--disp: "IBM Plex Sans Condensed", "Noto Sans TC", sans-serif;
```

## Before you call it done

Look at your own output, at these four settings, and fix what breaks:

1. **375px wide.** No sideways scroll. Headline still fits. Tables scroll in their boxes.
2. **1440px wide.** The text column has not sprawled; figures use the width, prose does not.
3. **Dark mode.** Every colour you chose, not an inversion. Nothing disappears.
4. **Reduced motion / print.** Nothing is missing that was only visible after an animation.

Check the five `imitator-*` metas are present and agree with the CSS: the paper in the
meta is the paper in `:root`, the register in the meta is the register in the comment.

Read your `--paper` back as `hsl()`. If its saturation is under 6%, or its hue is between
190 and 230 without the comment saying why, you picked the default and called it a choice.

Then read the first screen as a stranger: does it say what this is and why it matters,
before any decoration? And check the register comment is still true of what you built —
if the page drifted toward a dashboard while the comment says 史詩, one of them is wrong.

## Publishing

```bash
curl -X PUT https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  -H "Content-Type: text/html" \
  -H "X-Title: <title>" \
  --data-binary @report.html
```

Full host rules: <https://github.com/clarencechien/imitator/blob/main/docs/publishing-rules.md>

## When to open the reference

`STYLE-reference.md` holds, in this order: **The headline** · **A spine the reader can
feel** · **Editorial devices** · **Motion** · **Charts** · **Reject list** · **Why the floor
is what it is**. Read Charts before drawing one. Read the reject list before calling the
page done. The rest is there when a section of the page feels flat and you want to know
what the specimens did about it.
