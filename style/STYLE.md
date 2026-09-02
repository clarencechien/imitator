# Writing a report for imitator

You are producing **one self-contained HTML file**. Read this before you write a line of it.

Fetch the chassis and paste it in:
`https://raw.githubusercontent.com/clarencechien/imitator/main/style/report.css`
Worked example: `https://raw.githubusercontent.com/clarencechien/imitator/main/style/mockup.html`
Six registers, six specimens: `https://github.com/clarencechien/imitator/tree/main/style/voices`

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
/* REGISTER: 驗屍 — 用 231 萬筆資料檢驗三個流行說法，讀者是準備進場的散戶。
   VOICE: 解剖檯。奶油紙、驗屍紅只給裁決用、宋體標題、等寬體的檔案欄。
   NOT: 儀表板。沒有互動元件，數字是證據不是裝飾。 */
```

If the register you wrote could describe half the reports in the archive, it is too
generic — go again. The registers that actually occur, measured across the 275 reports
already on the host, and a specimen for each:

| Register | What it is | Where the voice tends to come from | Look at |
|---|---|---|---|
| **史詩** epic | a history, a person, an interview, an idea traced through time | warm paper, a serif display face, acts as signposts, a pulled line per act | `voices/epic.html` · live: `/r/actor` `/r/uncle-bob` |
| **論證** argument | an architecture, a method, a choice defended | cool paper, a condensed display face, numbered chapters, a glossary table, one word in red | `voices/argument.html` · `/r/agent-arch-2` `/r/loop-engineering` |
| **綜述** digest | research gathered and weighed, myths tested | plain paper with a faint grid, a boxed core finding, a second accent *only* because the argument has two sides | `voices/digest.html` · `/r/ai-amp-or-mir` |
| **驗屍** autopsy | a popular claim checked against data | cream paper, a dossier strip, a verdict stamp, an annotated curve | `voices/autopsy.html` · `/r/tw-stock-winner` `/r/cb_story` |
| **深夜** night | one large number and what sits behind it | dark-first, a single warm accent, a waffle or a hero figure, page counters | `voices/night.html` · `/r/birthrate-vs-housing` |
| **手帖** field guide | travel, a purchase, a checklist for a first time | bright paper, a colour bar, quick-fact tiles, numbered prep cards, a Latin display word | `voices/fieldguide.html` · `/r/busan_v2` `/r/forties` |
| **手冊** manual | a tool or document explained for use | a contents rail, split panes, mono labels, no hero | `/r/session-connectivity` `/r/kasanemu` |
| **壓力測試** stress test | one household or portfolio run through scenarios | parameter chips, a four-line TL;DR, numbered outcome cards | `/r/bysq_report_tw_case` `/r/four-percent-rule` |

Two things about that table. The third column is a *direction*, not a value — it tells you
what the register usually wants, so that your paper, accent and face are an answer to the
content rather than a default. And the specimens are **six different answers, not a menu**:
their exact palettes are on the reject list below.

## The floor — true in every report, whatever the voice

1. **One file, no third-party `<script src>`.** Any script you need gets pasted in as
   source. This is enforced: a report that loads a third-party script with the sandbox off
   is rejected outright. Webfonts are the exception and are allowed — see Typefaces.
2. **No storage APIs** — no `localStorage`, `sessionStorage`, `indexedDB`,
   `document.cookie`, `BroadcastChannel`, `serviceWorker`. The page runs in an opaque
   origin; they throw. Keep state in a variable.
3. **`</body>` must be present.** The CDN injects a script immediately before it.
4. **Body text ≥ 17px with ≥ 1.8 line-height.** The chassis does this. Do not shrink it,
   and do not set long passages in a display or mono face.
5. **Both colour schemes.** If you override the light tokens you override the dark ones
   too, with values chosen for a dark surface — never an inversion.
6. **Nothing scrolls the page sideways**, at 375px or at 1440px.
7. Open with:
   ```html
   <!doctype html>
   <html lang="zh-Hant">
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <meta name="imitator-style" content="v2">
   <title>…</title>
   ```

## Setup

```html
<style>
  /* 1. the chassis, pasted verbatim */
  …
  /* 2. this report's voice — override the tokens, add what it needs */
  :root {
    --paper:#faf7f0; --card:#fffdf8; --ink:#26211b; --ink-2:#4b4339;
    --mist:#6e6457; --rule:#e4dccb; --rule-hard:#c9bda6;
    --accent:#8c2332; --accent-soft:#f2e3e0;
    --disp:"Noto Serif TC", Georgia, serif;
  }
  :root[data-theme="dark"], :root:where(:not([data-theme="light"])) { /* … dark values … */ }
</style>
```

Build the voice out of the tokens. A rule you write against `var(--rule)` and `var(--sp-5)`
inherits both colour schemes and the responsive scale for free; a rule you write against
`#ddd` and `24px` does not.

## Choosing a palette

Pick **paper, ink and one accent**, and name them after what they are in this piece —
`--curtain` for the red of a theatre, `--slate` for a technical grey. The naming is not
decoration: it forces you to decide what the colour is doing.

- **Paper is rarely white, and its tint comes from the register.** A history wants warmth;
  an argument wants something cooler and flatter; a night piece is dark-first and its
  *light* mode is the second palette. Derive the tint — do not pick it from a list, and do
  not reuse a specimen's. `#ffffff` reads as a default.
- **One accent, used three ways**: the coloured word in the headline, the section numbers,
  links. A second accent needs a reason — a second voice in the argument, not variety.
- **Contrast is not negotiable.** Body ink on paper ≥ 7:1, secondary ≥ 4.5:1, the accent on
  paper ≥ 4.5:1 wherever it carries text. If your accent is too light for text, use it for
  rules and marks and set the text in ink.
- **Dark mode is a second palette.** Warm cream becomes warm near-black (`#16130f`), not
  grey. Accents usually need to be lighter and less saturated than their light-mode twin.

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

## The headline

One oversized headline per report, in `--disp`, using `.display` — the chassis scales it
from 2.6rem on a phone to 5.25rem on a desktop. **Put exactly one `<em>` inside it.** The
chassis colours it with the accent; it is the report's signature and it stops working the
moment there are two.

```html
<p class="eyebrow">架構筆記 · Agent vs Workflow · VOL.2</p>
<h1 class="display">第一百次，<br>要比第一次<em>聰明</em></h1>
<p class="lede">一句話說清楚這篇要回答什麼問題。不要重述標題。</p>
```

Choose the coloured word for meaning, not rhythm: the word the argument turns on.

**Write the line breaks yourself.** At the top display size the text column holds about
eight CJK characters per line. A headline left to wrap will break inside a word — 台|股,
燈|嗎 — and a `<br>` fixes that where `text-wrap: balance` cannot. Keep the coloured word
on one line. A long headline takes three lines, or a smaller `--fs-display`; it never takes
a mid-word wrap.

## A spine the reader can feel

Long-form needs signposts. Use `.eyebrow` — mono, letterspaced, accent-coloured, with a
rule running to the right margin — above each section, and give it a **system** that fits
the piece:

- acts: `序幕 · PROLOGUE` · `第一幕 · 1973` · `終幕 · 2026`
- numbered chapters: `01 · VOCABULARY` · `02 · THE TWO AXES`
- a running series: `VOL.2 · 2026-08`

Pick one system and hold it for the whole document. Signposting that changes shape halfway
is worse than none. Where a section pays off an earlier one, say so inline with a `.chip`:
`<span class="chip">接回 VOL.1</span>`.

## Editorial devices

Use them where the argument needs them, and sparingly — three or four moments in a report,
not a device per section.

| Device | Use it for |
|---|---|
| `.pull` | one line from the argument, set large in `--serif`. Never a repeat of the lede. |
| `.mark` | a single sentence the whole section turns on. One per section at most. |
| `.chip` | a small inverted label that interrupts the column — a callback, a verdict. |
| `.note` (`.good` `.warn` `.critical`) | an aside that is genuinely aside. The colour never carries the meaning — write it. |
| `.tiles` + `.stat` | numbers that belong together. |
| `.hero` | the one number the piece is about. At most one. |
| `<td>` + `<span class="sub">` | a glossary term with a mono sub-label under it. |
| `pre` | code. The chassis gives it an accent rule along the top. |
| `.wide` | a figure that should break out past the text column on a large screen. |

## Motion

A report is read, not operated. Motion has one job here: **mark arrival**. Everything else
is decoration that costs the reader.

- `.reveal` on a section opening, a figure, a pulled line. Not on body paragraphs, and
  never on something the reader must wait for.
- `.stagger` on a group entering together — the chassis spaces items 60ms apart, which
  reads as one gesture. Past ~80ms it reads as slow.
- `.progress` once, as the first element in `<body>`, for a reading-progress rule drawn by
  the scroll position itself.
- Anything you add yourself: **`transform` and `opacity` only**, `var(--ease-out)`, under
  300ms for anything that responds to the reader. Never `ease-in` on something being
  watched — it delays exactly the moment they are looking. Never `transition: all`. Never
  `scale(0)`: things appear from `scale(.96)` + opacity, not from nothing.
- Gate hover motion behind `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion` is handled by the chassis — do not defeat it, and do not gate
  any content behind an animation.

All of it is progressive: where scroll-driven animation is unsupported, everything is
simply already visible.

## Charts — the one thing that is not yours to restyle

Voice stops at the plot area.

- **Series colours in fixed order**: `var(--c1)`, `--c2`, … never reordered, never cycled
  past `--c6`. The order is what keeps adjacent series distinguishable under colour
  blindness; it was validated with a tool, not chosen by eye. A seventh series folds into
  "Other" or the chart becomes small multiples.
- **One y-axis. Never two.** Two measures of different scale means two charts.
- **Draw on a 640-wide `viewBox`, `font-size: 12`, no `width`/`height` attributes.** A
  viewBox scales text: a 720-wide chart on a 375px screen renders its labels at 6px. The
  chassis bounds the rendered width and scrolls the chart in its own box below the floor.
- **A legend for two or more series**; one series needs none — the title names it. Direct
  labels on the endpoint or the extreme only, never a number on every point.
- **Every chart ships its numbers** in `<details class="datatable">`. Three light-mode
  series colours sit below 3:1 against paper and the table is the documented relief; it is
  also what makes the report survive being printed.
- **Text never wears the series colour.** Labels use `--ink-2` / `--mist`; identity comes
  from the swatch beside them.
- Marks: bars ≤ 24px with a 4px rounded data-end, lines 2px, dots ≥ 8px with a 2px ring in
  the surface colour, gridlines hairline and solid — never dashed.

## Reject list

These are the tells of a generated page. None of them is a style choice.

- A purple-to-blue gradient anywhere. Gradient text. Glassmorphism. A coloured drop shadow.
- Emoji as section icons or inside a heading. (A `.note` may carry one glyph. One.)
- Everything centred. A hero that is a centred headline over a centred paragraph over two
  centred buttons.
- `border-radius` on everything, uniformly, including things that are not surfaces.
- A "Key Takeaways" box repeating the lede. Sections named Introduction / Conclusion /
  Next Steps with nothing in them. A closing paragraph that begins "In summary".
- Bold on half the words in a paragraph. Emphasis that emphasises nothing.
- A number on every data point; a legend for one series; a pie chart with six slices; two
  y-axes; 3D anything.
- Decorative motion: things that pulse, float, bounce on loop, or animate on hover for no
  reason.
- Filler symmetry — three cards because three fits the grid, when the argument has two
  points.
- **Any specimen's palette.** These are taken: bone paper with indigo and a Ming headline
  (the mockup); warm cream with curtain red (`epic`); grey-green with condensed type and
  red (`argument`); graph paper with green and orange (`digest`); cream with autopsy red
  and a stamp (`autopsy`); navy with a gold lamp (`night`); a four-colour bar over ivory
  with a heavy Latin word (`fieldguide`). Each was one report's answer. Yours is a
  different report.

## Before you call it done

Look at your own output, at these four settings, and fix what breaks:

1. **375px wide.** No sideways scroll. Headline still fits. Tables scroll in their boxes.
2. **1440px wide.** The text column has not sprawled; figures use the width, prose does not.
3. **Dark mode.** Every colour you chose, not an inversion. Nothing disappears.
4. **Reduced motion / print.** Nothing is missing that was only visible after an animation.

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
