#!/usr/bin/env node
// 產生 style/mockup.html：把 report.css 原封不動內聯進去，圖表的座標在這裡算好。
//
//   node style/build.mjs
//
// 之所以用生成的而不是手寫，是因為 mockup 的重點就是「CSS 原封不動貼進單一檔案」
// —— 手寫兩份一定會漂。圖表資料是這個 repo 自己的真實統計（archive/report_list.json
// 加上對 archive/report/*.html 的掃描），不是編出來的示範數字。
//
// 只用 Node 內建模組。

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = await readFile(path.join(here, 'report.css'), 'utf8');

// ── 資料（量出來的，見 README）──────────────────────────────────────────────
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

  // x 軸只標得下的那幾個，標滿會糊成一片
  const xticks = [0, 4, 8, 12, 16]
    .map((i) => `<text class="axis" x="${r1(x(i))}" y="${H - 12}" text-anchor="middle">${MONTHS[i][0]}</text>`)
    .join('\n    ');

  // 標三個點就好：高峰，以及兩條線分開得最開的那個月。
  // 終點不標 —— 兩個系列都收在 0 附近，端點標籤會疊在一起，而把它們上下推開
  // 就等於讓標籤脫離自己的線，那比不標更糟。
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
<meta name="imitator-style" content="v1">
<title>報告樣式示範 — imitator</title>
<style>
${css}
/* 只有這份 mockup 需要的東西，放在 report.css 之後、用同一組 token 疊上去。 */
.themebtn {
  position: fixed; top: 1rem; right: 1rem; z-index: 5;
  min-height: 44px; padding: .4rem .8rem;
  background: var(--card); color: var(--fg-2);
  border: 1px solid var(--line); border-radius: var(--radius);
  font: var(--fs-sm)/1 var(--sans); cursor: pointer;
}
</style>
<body>
<button class="themebtn" id="theme" type="button">切換深淺</button>
<main class="report">

  <header class="masthead">
    <p class="kicker">樣式示範 · report.css v1</p>
    <h1>275 份報告的樣式生態</h1>
    <p class="lede">這份 mockup 同時是說明和範例：它示範 <code>report.css</code> 長什麼樣，
      而它用的數字是這個 repo 自己量出來的 —— 舊報告在 runtime 依賴第三方 CDN 的比例，
      以及那個習慣是怎麼在十六個月裡消失的。</p>
    <p class="byline">imitator · 2026-09-02 · 資料來自 <code>archive/report_list.json</code> 與 <code>archive/report/*.html</code></p>
  </header>

  <p>把 <code>report.css</code> 原封不動貼進 <code>&lt;style&gt;</code>，然後照下面這些 class 組版。
    這一頁上的每個元件都來自那份 CSS，沒有額外的框架、沒有 runtime 抓任何東西 ——
    整份就是一個檔案。</p>

  <h2>先看數字</h2>

  <div class="tiles">
    <div class="stat"><p class="label">報告總數</p><div class="value">275</div><div class="delta">含遷移進來的 272 份</div></div>
    <div class="stat"><p class="label">抓 Tailwind CDN</p><div class="value">231</div><div class="delta down">佔 84%</div></div>
    <div class="stat"><p class="label">抓 Google Fonts</p><div class="value">222</div><div class="delta down">佔 81%</div></div>
    <div class="stat"><p class="label">支援深色模式</p><div class="value">15</div><div class="delta">佔 5%</div></div>
  </div>

  <p>一個 hero 數字，整份報告最多一個：</p>
  <div class="hero">84%</div>
  <p class="small">的舊報告在讀者打開的當下，向第三方要一份它從沒檢查過的 JavaScript。</p>

  <h2>這個習慣是怎麼消失的</h2>

  <figure>
    <p class="title">每月產出，與其中依賴 CDN 的份數</p>
    <p class="subtitle">兩個系列共用一條 y 軸，單位都是「份」。同一張圖上絕不放第二條 y 軸。</p>
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
    <figcaption>2025-05 到 2026-06 兩條線幾乎完全重疊 —— 每一份報告都抓 CDN。
      之後分開，到 2026-08 歸零。</figcaption>
  </figure>

  <div class="callout warn">
    <p class="head">⚠ 這裡的顏色不負責表達意思</p>
    <p>callout 的左側色條是輔助，不是訊息本身。狀態一定要用字寫出來，
      因為色盲、灰階列印和 <code>forced-colors</code> 模式都會讓顏色消失。</p>
  </div>

  <h2>單一系列不需要圖例</h2>

  <figure>
    <p class="title">Google Fonts 家族的引用次數</p>
    <p class="subtitle">一個系列就用 <code>--c1</code>，標題已經說了它是什麼，再放一個只有一格的圖例是浪費。</p>
    <div class="chart">
${barChart()}
    </div>
    <figcaption>208 次的 Noto Sans TC 說明一件事：字體其實早就收斂了，
      真正各異的是配色、密度和圖表長相。</figcaption>
  </figure>

  <h2>表格一律包在 <code>.table-scroll</code> 裡</h2>

  <p>表格是最常把手機版面撐爆的東西。包起來之後它在自己的框裡橫向捲動，
    頁面本身永遠不會橫捲。</p>

  <div class="table-scroll">
    <table>
      <thead>
        <tr><th>檢查項目</th><th class="num">份數</th><th class="num">佔比</th><th class="wrap">說明</th></tr>
      </thead>
      <tbody>
        <tr><td>自己寫 <code>&lt;style&gt;</code></td><td class="num">274</td><td class="num">99.6%</td><td class="wrap">幾乎每一份都自己發明了一套樣式</td></tr>
        <tr><td>抓 cdn.tailwindcss.com</td><td class="num">231</td><td class="num">84.0%</td><td class="wrap">對第三方的長期依賴，隨時可能被改掉</td></tr>
        <tr><td>抓 Google Fonts</td><td class="num">222</td><td class="num">80.7%</td><td class="wrap">違反「不要 runtime 抓 CDN」這條自己訂的規則</td></tr>
        <tr><td>用 Chart.js</td><td class="num">185</td><td class="num">67.3%</td><td class="wrap">最大的視覺表面，也是最不一致的地方</td></tr>
        <tr><td>支援 prefers-color-scheme</td><td class="num">15</td><td class="num">5.5%</td><td class="wrap">其餘 260 份在深色模式下是一片白</td></tr>
        <tr><td>帶有樣式標記</td><td class="num">0</td><td class="num">0%</td><td class="wrap">所以「這份指南有沒有被套用」目前答不出來</td></tr>
      </tbody>
    </table>
  </div>

  <h2>其他元件</h2>

  <div class="cols">
    <div class="card">
      <h3>兩欄</h3>
      <p><code>.cols</code> 用 <code>minmax(min(100%, 19rem), 1fr)</code>，
        窄螢幕自己收成一欄，不需要你寫 media query。</p>
    </div>
    <div class="card">
      <h3>引文與程式碼</h3>
      <blockquote>資料是唯一允許大聲的東西。</blockquote>
      <pre><code>curl -X PUT https://imitator.ai-apps.work/v1/a/demo \\
  -H "Authorization: Bearer $IMITATOR_TOKEN" \\
  --data-binary @report.html</code></pre>
    </div>
  </div>

  <div class="callout good">
    <p class="head">✓ 交件前自己檢查一遍</p>
    <p>把視窗拉到 375px 寬，再切一次深色模式。頁面不可以橫向捲動、
      圖表要跟著縮、表格在自己的框裡捲。這一關不能跳過。</p>
  </div>

  <hr>
  <p class="small">完整規則見
    <a href="https://github.com/clarencechien/imitator/blob/main/style/STYLE.md">style/STYLE.md</a>。
    這一頁由 <code>node style/build.mjs</code> 產生。</p>

</main>
<script>
  // 主題狀態放在變數裡。sandbox 下所有 storage API 都會丟 SecurityError，
  // 而報告本來就不該需要持久化任何東西。
  // （順帶一提：連在註解裡寫出那些 API 的名字，都會讓 host 回一則 warning。）
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
