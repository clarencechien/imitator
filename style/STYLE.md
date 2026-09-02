# Report style — instructions for the model writing the HTML

You are producing **one self-contained HTML file**: a report someone will read on a
phone or a laptop and may print. This file tells you how it should look and behave.
It is written to be handed to any model (Claude, GPT, Gemini) as a URL.

Fetch both:

- `https://raw.githubusercontent.com/clarencechien/imitator/main/style/report.css` — paste verbatim
- `https://raw.githubusercontent.com/clarencechien/imitator/main/style/mockup.html` — a worked example

## The one rule that does the work

**Paste `report.css` into a single `<style>` block, unchanged.** Do not rewrite it,
do not "improve" the colours, do not link it at runtime. Everything else here is
about how to use the classes it gives you.

Consistency across reports comes from that paste, not from following prose. If you
need something the stylesheet lacks, add a few rules *after* it in the same block
and build them out of the existing tokens (`var(--line)`, `var(--sp-4)`, …) so they
inherit light and dark for free.

## Hard constraints

1. **One file.** No `<script src>`, no `<link rel=stylesheet>`, no `@import`, no
   webfont URL. If you need a library, paste its source in. The host rejects a
   report that loads a third-party script with the sandbox off.
2. **No storage APIs** — no `localStorage`, `sessionStorage`, `indexedDB`,
   `document.cookie`, `BroadcastChannel`, `serviceWorker`. The page runs in an
   opaque origin and they throw. Keep state in a variable.
3. **Close `</body>`.** The host's CDN injects a script just before it.
4. Start the file with:
   ```html
   <!doctype html>
   <html lang="zh-Hant">
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <meta name="imitator-style" content="v1">
   <title>…</title>
   ```
   The `imitator-style` meta is how the host knows this guide was applied. Keep it.

## Four passes, in this order

1. **Name the reader's job.** What decision or question brings someone here? Write
   that as the lede. A report that opens by restating its own title has skipped this.
2. **Choose the composition.** What sequence of sections answers that job? Lead with
   the finding, then the evidence, then the caveats. Do not lead with methodology.
3. **Apply the visual system.** Only now reach for classes. Most sections are prose;
   reach for a chart when a shape carries the point better than a sentence.
4. **Inspect before you finish.** Re-read your own output at 375px wide and in dark
   mode. Fix what breaks. This pass is not optional.

## Class API

| Class | Use |
|---|---|
| `.report` | the single page wrapper — everything goes inside it |
| `.masthead`, `.kicker`, `.byline`, `.lede` | the opening block |
| `.cols` | auto-reflowing multi-column grid (collapses to one column) |
| `.tiles` | grid of stat tiles |
| `.stat` + `.label` `.value` `.delta up\|down` | one number with context |
| `.hero` | the single headline number — at most one per report |
| `.card` | a bordered surface |
| `.callout good\|warn\|critical` + `.head` | a boxed remark; always word it, never rely on the colour |
| `.table-scroll` > `<table>` | **every** table goes in this wrapper |
| `td.num` / `th.num` | right-aligned, tabular figures |
| `td.wrap` | the one column allowed to wrap |
| `.chart` > inline `<svg>` | a chart — 640-wide viewBox, scrolls itself when narrow |
| `.legend` > `.key` > `.swatch` | series legend |
| `.datatable` (`<details>`) | the numbers behind a chart |
| `.tag` | a quiet chip |
| `.bleed` | let a wide figure escape the prose column on large screens |

## Responsive — the checklist, not a vibe

The stylesheet is mobile-first and needs no media queries from you. What it cannot
do for you:

- **Nothing may scroll the page sideways.** Tables go in `.table-scroll`. Wide
  `<pre>` scrolls itself (already handled). No fixed pixel widths on containers.
- **Draw charts on a 640-unit-wide `viewBox`, with `font-size: 12` on their text,
  and no `width`/`height` attributes.** A viewBox scales the text along with
  everything else: let a 720-wide chart shrink to a 375px screen and its labels
  render at 6px. The stylesheet bounds the rendered width (`min-width: 34rem`,
  `max-width: 44rem`) and scrolls the chart inside `.chart` when the screen is
  narrower, so label text stays around 10–13px on every device. Author to 640 and
  this is handled; author to some other width and it is not.
- **Grids: use `.cols` / `.tiles`.** Do not hand-roll `grid-template-columns` with
  fixed tracks — `minmax(min(100%, …), 1fr)` is what stops a phone overflowing.
- **Tap targets ≥ 44px.** Applies to `<summary>`, tabs, any control you add.
- **Test at 375 × 667 and at 1440 wide.** Both, before you finish.
- Prose stays at `--measure`; charts and tables use the full width. Do not widen prose.

## Charts

- **Use the series colours in fixed order** — `var(--c1)`, then `--c2`, and so on.
  Never reorder them to "look nicer", never cycle past `--c6`: a seventh series
  folds into "Other" or the chart becomes small multiples. This order is what keeps
  adjacent series distinguishable under colour-blindness; it was validated, not
  chosen by eye.
- **One y-axis. Never two.** Two measures of different scale means two charts.
- **A legend for two or more series**, plus direct labels on the endpoint or the
  extreme — not a number on every point. One series needs no legend; the title says
  what it is.
- **Every chart ships its numbers**, in a `<details class="datatable">`. Three of
  the light-mode series colours are below 3:1 against the page, and the table is the
  documented relief for that. It is also what makes the report useful on a printout.
- **Text never wears the series colour.** Labels and values use `--fg-2` / `--muted`;
  identity comes from the swatch beside them.
- Marks: bars ≤ 24px thick with a 4px rounded data-end, lines 2px, dots ≥ 8px with a
  2px ring in the surface colour, gridlines hairline and solid — never dashed.
- Status colours (`--good` `--warn` `--critical`) mean state. They are never series 7.

## Reject list

Things that read as an LLM default. Do not produce them.

- A gradient hero, a purple-to-blue banner, a glassmorphism card, a coloured drop
  shadow. The surface is flat; the data is the only loud thing.
- Emoji as section icons, or an emoji in a heading.
- A number on every data point; a legend for a single series; a pie chart with more
  than five slices; a donut with a number in the hole that is not the total.
- Dual y-axes. 3D anything. A background image behind text.
- `font-family` overrides. `!important`. Fixed `px` page widths.
- A "Key Takeaways" box that repeats the lede verbatim.
- Filler sections — Introduction, Conclusion, Next Steps — with nothing in them.

## Publishing

```bash
curl -X PUT https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  -H "Content-Type: text/html" \
  -H "X-Title: <title>" \
  --data-binary @report.html
```

Full publishing rules, including what the host rejects and why:
<https://github.com/clarencechien/imitator/blob/main/docs/publishing-rules.md>
