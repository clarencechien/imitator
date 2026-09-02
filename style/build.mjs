#!/usr/bin/env node
// 產生 style/mockup.html：把 report.css 原封不動內聯進去，圖表座標在這裡算好。
//
//   node style/build.mjs
//
// 生成而不是手寫，是因為 mockup 的重點就是「chassis 原封不動貼進單一檔案」——
// 手寫兩份一定會漂。圖表資料是這個 repo 自己的真實統計（archive/report_list.json
// 加上掃 archive/report/*.html），不是編出來的示範數字。
//
// 只用 Node 內建模組。

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = await readFile(path.join(here, 'report.css'), 'utf8');

// ── 資料（量出來的，見 style/README.md）─────────────────────────────────────
const MONTHS = [
  ['2025-05', 39, 38], ['2025-06', 87, 87], ['2025-07', 21, 21], ['2025-08', 38, 38],
  ['2025-09', 17, 17], ['2025-10', 5, 5],   ['2025-11', 8, 7],   ['2025-12', 2, 2],
  ['2026-01', 3, 3],   ['2026-02', 4, 4],   ['2026-03', 3, 1],   ['2026-04', 3, 3],
  ['2026-05', 4, 3],   ['2026-06', 6, 1],   ['2026-07', 17, 1],  ['2026-08', 14, 0],
  ['2026-09', 1, 0],
];
const FONTS = [
  ['Noto Sans TC', 208], ['Inter', 35], ['Noto Serif TC', 19],
  ['IBM Plex Mono', 16], ['其他 8 種', 18],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r1 = (n) => Math.round(n * 10) / 10;

// ── 圖一：折線，兩個系列，共用一條 y 軸（單位都是「份」）────────────────────
function lineChart() {
  const W = 640, H = 300, L = 40, R = 88, T = 14, B = 36;
  const yMax = 90, ticks = [0, 30, 60, 90];
  const x = (i) => L + (i * (W - L - R)) / (MONTHS.length - 1);
  const y = (v) => T + (1 - v / yMax) * (H - T - B);
  const pathFor = (idx) =>
    MONTHS.map((m, i) => `${i ? 'L' : 'M'}${r1(x(i))} ${r1(y(m[idx]))}`).join(' ');

  const grid = ticks
    .map((t) => `<line class="grid" x1="${L}" y1="${r1(y(t))}" x2="${W - R}" y2="${r1(y(t))}"/>
    <text class="axis" x="${L - 8}" y="${r1(y(t)) + 4}" text-anchor="end">${t}</text>`)
    .join('\n    ');

  const xticks = [0, 4, 8, 12, 16]
    .map((i) => `<text class="axis" x="${r1(x(i))}" y="${H - 12}" text-anchor="middle">${MONTHS[i][0]}</text>`)
    .join('\n    ');

  // 標三個點就好：高峰，以及兩條線分開得最開的那個月。終點不標 —— 兩個系列都收在
  // 0 附近，端點標籤會疊在一起，而把它們上下推開就等於讓標籤脫離自己的線。
  const mark = (i, series, text, dy) => {
    const v = MONTHS[i][series];
    return `<circle class="dot" cx="${r1(x(i))}" cy="${r1(y(v))}" r="4.5" fill="var(--c${series})"/>
    <text class="label" x="${r1(x(i)) + 9}" y="${r1(y(v)) + dy}">${text}</text>`;
  };
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="每月產出的報告份數，以及其中在 runtime 抓 Tailwind CDN 的份數，2025 年 5 月到 2026 年 9 月">
    ${grid}
    ${xticks}
    <path class="line" d="${pathFor(1)}" stroke="var(--c1)"/>
    <path class="line" d="${pathFor(2)}" stroke="var(--c2)"/>
    ${mark(1, 1, '87 份，兩條線完全重疊', 4)}
    ${mark(14, 1, '17', -10)}
    ${mark(14, 2, '1', 16)}
  </svg>`;
}

// ── 圖二：橫條，單一系列（所以不需要圖例）──────────────────────────────────
function barChart() {
  const W = 640, ROW = 36, BAR = 20, L = 124, R = 56, T = 8;
  const H = T + FONTS.length * ROW + 8;
  const max = Math.max(...FONTS.map((f) => f[1]));
  const w = (v) => (v / max) * (W - L - R);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Google Fonts 家族在 275 份舊報告裡的引用次數">
    ${FONTS.map(([name, v], i) => {
      const yTop = T + i * ROW + (ROW - BAR) / 2;
      return `<text class="axis" x="${L - 10}" y="${yTop + BAR / 2 + 4}" text-anchor="end">${esc(name)}</text>
    <rect class="bar" x="${L}" y="${yTop}" width="${r1(w(v))}" height="${BAR}" fill="var(--c1)"/>
    <text class="label" x="${L + r1(w(v)) + 8}" y="${yTop + BAR / 2 + 4}">${v}</text>`;
    }).join('\n    ')}
  </svg>`;
}

const monthRows = MONTHS.map(
  ([m, total, tw]) =>
    `<tr><td>${m}</td><td class="num">${total}</td><td class="num">${tw}</td><td class="num">${total ? Math.round((tw / total) * 100) : 0}%</td></tr>`,
).join('\n      ');

const html = `<!doctype html>
<html lang="zh-Hant">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="imitator-style" content="v2">
<title>一個習慣，怎麼在十六個月裡消失</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
${css}

/* ══ 這一份的聲音 ══════════════════════════════════════════════════════════
 * 骨牌色：檔案櫃裡的紙、印刷的黑、蓋章的靛藍。三個字面各一份工作：
 * 標題用思源宋（中文標題的質地跟內文明顯不同）、內文用思源黑、
 * 路標與程式碼用 IBM Plex Mono（中文自動落回思源黑，這就是混排的做法）。
 */
:root {
  --paper:#f3f0e8; --card:#fbf9f4;
  --ink:#1c1a16; --ink-2:#4c473d; --mist:#75705f;
  --rule:#ded8c9; --rule-hard:#bdb5a0;
  --accent:#2c3e6b; --accent-soft:#e2e4ee;

  --sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
  --disp:"Noto Serif TC",Georgia,"Songti TC",serif;
  --mono:"IBM Plex Mono","Noto Sans TC",ui-monospace,monospace;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    --paper:#16161a; --card:#1e1e24;
    --ink:#eae7de; --ink-2:#b3aea1; --mist:#8d8877;
    --rule:#32323a; --rule-hard:#4a4a54;
    --accent:#9db0e0; --accent-soft:#262b3a;
  }
}
:root[data-theme="dark"] {
  --paper:#16161a; --card:#1e1e24;
  --ink:#eae7de; --ink-2:#b3aea1; --mist:#8d8877;
  --rule:#32323a; --rule-hard:#4a4a54;
  --accent:#9db0e0; --accent-soft:#262b3a;
}

/* mockup 自己需要的一顆按鈕，用同一組 token 疊上去。 */
.themebtn {
  position: fixed; top: 1rem; right: 1rem; z-index: 20;
  min-height: 44px; padding: .4rem .85rem;
  background: var(--card); color: var(--ink-2);
  border: 1px solid var(--rule); border-radius: var(--radius);
  font: var(--fs-xs)/1 var(--mono); letter-spacing: .06em; cursor: pointer;
}
</style>
<body>
<div class="progress"></div>
<button class="themebtn" id="theme" type="button">DARK / LIGHT</button>

<main class="report">

  <p class="eyebrow">樣式檔案 · REPORT.CSS V2 · 2026-09</p>
  <h1 class="display">一個習慣，<br>怎麼在十六個月裡<em>消失</em></h1>
  <p class="lede">這一頁同時是說明和範例。它示範 <code>report.css</code> 這副底盤能長成什麼樣子，
    而它講的是一件真的發生過的事：275 份報告曾經每一份都向第三方要 JavaScript，然後在十六個月裡
    不再這麼做。</p>
  <p class="byline">imitator · 資料來自 archive/report_list.json 與 archive/report/*.html</p>

  <p class="eyebrow">序幕 · PROLOGUE</p>
  <h2>先看這四個數字</h2>

  <div class="tiles wide stagger">
    <div class="stat"><p class="label">報告總數</p><div class="value">275</div><div class="delta">含遷移進來的 272 份</div></div>
    <div class="stat"><p class="label">抓 Tailwind CDN</p><div class="value">231</div><div class="delta down">佔 84%</div></div>
    <div class="stat"><p class="label">抓 Google Fonts</p><div class="value">222</div><div class="delta down">佔 81%</div></div>
    <div class="stat"><p class="label">支援深色模式</p><div class="value">15</div><div class="delta">佔 5%</div></div>
  </div>

  <p>這些報告出自四個不同的模型、橫跨十六個月。它們最像的地方不是版面，是<span class="mark">每一份都在讀者打開的當下，向一個它從沒檢查過的第三方要程式碼</span>。</p>

  <div class="hero reveal">84%</div>
  <p class="byline">的舊報告有這個習慣。</p>

  <p class="eyebrow">第一幕 · 2025</p>
  <h2>兩條線完全重疊的那一年</h2>

  <p>把「每月產出幾份」和「其中幾份抓 CDN」畫在同一條 y 軸上 —— 單位都是「份」，
    所以不需要第二條軸。2025 年的一整年，這兩條線是同一條線。</p>

  <figure class="reveal">
    <p class="title">每月產出，與其中依賴 CDN 的份數</p>
    <p class="subtitle">兩個系列共用一條 y 軸。同一張圖上絕不放第二條。</p>
    <div class="chart">
${lineChart()}
    </div>
    <div class="legend">
      <span class="key"><span class="swatch" style="background:var(--c1)"></span>當月產出</span>
      <span class="key"><span class="swatch" style="background:var(--c2)"></span>其中抓 Tailwind CDN</span>
    </div>
    <details class="datatable">
      <summary>看數字</summary>
      <div class="table-scroll">
        <table>
          <thead><tr><th>月份</th><th class="num">產出</th><th class="num">抓 CDN</th><th class="num">比例</th></tr></thead>
          <tbody>
      ${monthRows}
          </tbody>
        </table>
      </div>
    </details>
    <figcaption>2025-05 到 2026-06 兩條線幾乎完全重疊。之後分開，到 2026-08 歸零。</figcaption>
  </figure>

  <p class="pull">有 sandbox 的話問題不大 —— 但那是對三個第三方的長期依賴，
    它們隨時可以改掉自己送出來的東西。</p>

  <p class="eyebrow">第二幕 · 2026</p>
  <h2>字體其實早就收斂了</h2>

  <p>令人意外的是：真正各異的從來不是字體。<span class="chip">208 / 275</span>
    用的是同一套 Noto Sans TC。各不相同的是配色、密度、圖表長相，以及有沒有人想過深色模式。</p>

  <figure class="reveal">
    <p class="title">Google Fonts 家族的引用次數</p>
    <p class="subtitle">一個系列就用 <code>--c1</code>，標題已經說了它是什麼，再放一個只有一格的圖例是浪費。</p>
    <div class="chart">
${barChart()}
    </div>
  </figure>

  <div class="table-scroll wide">
    <table>
      <thead><tr><th>檢查項目</th><th class="num">份數</th><th class="num">佔比</th><th class="wrap">說明</th></tr></thead>
      <tbody>
        <tr><td>自己寫 <code>&lt;style&gt;</code><span class="sub">everyone reinvents</span></td><td class="num">274</td><td class="num">99.6%</td><td class="wrap">幾乎每一份都自己發明了一套樣式</td></tr>
        <tr><td>抓 cdn.tailwindcss.com<span class="sub">runtime dependency</span></td><td class="num">231</td><td class="num">84.0%</td><td class="wrap">對第三方的長期依賴，隨時可能被改掉</td></tr>
        <tr><td>用 Chart.js<span class="sub">the loud surface</span></td><td class="num">185</td><td class="num">67.3%</td><td class="wrap">最大的視覺表面，也是最不一致的地方</td></tr>
        <tr><td>支援深色模式<span class="sub">an afterthought</span></td><td class="num">15</td><td class="num">5.5%</td><td class="wrap">其餘 260 份在深色模式下是一片白</td></tr>
      </tbody>
    </table>
  </div>

  <p class="eyebrow">終幕 · 現在</p>
  <h2>底盤固定什麼，放掉什麼</h2>

  <p>結論不是「統一樣式」。這些報告是要說服人的文章，不是產線上的產出 ——
    每一篇本來就該長得像有人做過它。所以 <code>report.css</code> 只固定那些不論什麼聲音
    都必須做對的事，其餘全部交出去。</p>

  <div class="cols">
    <div class="card">
      <h3>固定</h3>
      <p>可讀性（內文 17px 起跳、行高 1.85）、結構、RWD、深淺兩套配色的契約、
        動態的衛生（只做進場、只動 transform 與 opacity、尊重 reduced-motion）、
        圖表的色序。</p>
    </div>
    <div class="card">
      <h3>交出去</h3>
      <p>紙色與墨色、重點色、三個字面分別派給誰、標題多大、分節怎麼標、
        用哪些編輯手法。這一頁自己選的是：檔案櫃的紙、蓋章的靛藍、
        中文標題用宋體。</p>
    </div>
  </div>

  <div class="note">
    <p class="head">圖表的顏色不歸你挑</p>
    <p>聲音停在繪圖區外面。<code>--c1</code> 到 <code>--c6</code> 的順序是用工具驗過的 ——
      它保證相鄰的系列在色盲下還分得開。換色請先跑驗證器，不要用眼睛判斷。</p>
  </div>

  <pre><code>curl -X PUT https://imitator.ai-apps.work/v1/a/my-report \\
  -H "Authorization: Bearer $IMITATOR_TOKEN" \\
  -H "X-Title: 一個習慣，怎麼在十六個月裡消失" \\
  --data-binary @report.html</code></pre>

  <hr>
  <p class="byline">完整規則見 <a href="https://github.com/clarencechien/imitator/blob/main/style/STYLE.md">style/STYLE.md</a>。
    這一頁由 <code>node style/build.mjs</code> 產生。</p>

</main>
<script>
  // 主題狀態放在變數裡。sandbox 下所有 storage API 都會丟 SecurityError，
  // 而報告本來就不該需要持久化任何東西。
  let dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.getElementById('theme').addEventListener('click', () => {
    dark = !dark;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  });
</script>
</body>
</html>
`;

await writeFile(path.join(here, 'mockup.html'), html);
console.log(`mockup.html 已產生（${Buffer.byteLength(html)} bytes）`);
