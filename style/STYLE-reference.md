# Reading beyond the floor

This is the long half of the imitator style guide. `STYLE.md` is the short half —
the rules every report must satisfy — and it is the one to read first. Nothing here
overrides it. Come here for the craft, and for the reasons behind the rules.

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

## Why the floor is what it is

Every floor rule in `STYLE.md` is short because the reason is here. Each of these shipped.

**`<link>` to raw.githubusercontent.com drops the whole chassis.** That host serves files
as `text/plain` with `X-Content-Type-Options: nosniff`, so a browser refuses to apply the
file as CSS — silently. One report (`macbook`) linked `report.css` that way and every
reader got an unstyled page with no error anywhere. The host now warns on it
(`third-party-stylesheet`). Read the URL, paste the bytes.

**Widening the page is the wrong lever for a scrolling table.** Twice, a model told
"the table scrolls sideways" reached for the biggest lever it had — `--page: 72rem`,
`--measure: 46em`, `overflow-x: visible`. The first two widened the prose column from 34
to 46 characters a line, which nobody asked for; the third removed the only thing standing
between one long cell and a page that scrolls sideways. The chassis now does the right
thing by default (wrap and widen on desktop, scroll-in-box with a pinned first column on
a phone), so the rule is simply: do not touch those three.

**A bare `1fr` track is min-content wide.** A grid track's default minimum is
`min-content`, so one unbreakable string — a URL, an OAuth scope, a long identifier —
widens the track past the viewport and takes the whole page with it. This shipped as
`grid-template-columns: 1fr` around one `<code>` holding
`https://www.googleapis.com/auth/…`, and the page measured 534px on a 375px screen. Hence
`minmax(0, 1fr)` and `min-width: 0` on the children, or the chassis `.cols` / `.tiles`.

**An import turned a harmless interpolation into a stored XSS.** A checklist report had
always built its rows with a template literal and `innerHTML`; that was fine while the
only source of rows was the reader's own typing. An export/import pair was added, the
renderer was not touched, and a `.json` from anyone became a reachable source. The fix
had two parts because the two contexts differ: HTML text takes escaping; an `onclick`
attribute does not, because `&#39;` is decoded back to `'` before the JavaScript runs —
so the id is constrained to a safe character set instead. The test that had been run
("export 38 items, import 38 items") proved the feature worked and nothing else. The
security review is what caught it.
