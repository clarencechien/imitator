#!/usr/bin/env node
// 產生 style/voices/*.html：六種聲音，每一種都站在同一副底盤（report.css）上。
//
//   node style/voices/build.mjs
//
// 這六種不是選單，是「六個不同的答案」——每一種都對應 archive/ 裡真的存在的一類
// 報告，內容也直接取自那些報告，好讓聲音跟題材是綁在一起的，而不是套上去的。
// 詳見 style/voices/README.md。只用 Node 內建模組。

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const chassis = await readFile(path.join(here, '..', 'report.css'), 'utf8');

const head = (title, fonts) => `<!doctype html>
<html lang="zh-Hant">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="imitator-style" content="v2">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap">`;

const foot = `<script>
  // 主題狀態放在變數裡；sandbox 底下所有 storage API 都會丟 SecurityError。
  let dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.getElementById('theme')?.addEventListener('click', () => {
    dark = !dark; document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  });
</script>
</body>
</html>
`;

const themeBtn = `<button class="themebtn" id="theme" type="button">DARK / LIGHT</button>`;
const themeBtnCss = `.themebtn{position:fixed;top:1rem;right:1rem;z-index:20;min-height:44px;padding:.4rem .85rem;background:var(--card);color:var(--ink-2);border:1px solid var(--rule);border-radius:var(--radius);font:var(--fs-xs)/1 var(--mono);letter-spacing:.06em;cursor:pointer}\n@media (max-width:40rem){.themebtn{top:auto;bottom:1rem}}`;

const voices = [];

/* ══ 1. 史詩 · 敘事 ═══════════════════════════════════════════════════════ */
voices.push({
  file: 'epic.html',
  title: '演員登台 — 聲音樣張：史詩',
  fonts: 'family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@600;700&family=IBM+Plex+Mono:wght@400;500',
  css: `
/* 聲音：舞台。暖紙、墨、幕布的酒紅、一點琥珀。中文標題用宋體，因為這是在講一段歷史。 */
:root{--paper:#faf7f0;--card:#fffdf8;--ink:#26211b;--ink-2:#4b4339;--mist:#6e6457;--rule:#e4dccb;--rule-hard:#c9bda6;
      --accent:#8c2332;--accent-soft:#f3e2e0;--amber:#c97f1e;
      --disp:"Noto Serif TC",Georgia,serif;--mono:"IBM Plex Mono","Noto Sans TC",monospace}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--paper:#16130f;--card:#221e18;--ink:#e9e1d2;--ink-2:#bfb5a4;--mist:#9c9182;--rule:#332d25;--rule-hard:#4d453a;--accent:#d9737f;--accent-soft:#3a2226;--amber:#e0a04a}}
:root[data-theme="dark"]{--paper:#16130f;--card:#221e18;--ink:#e9e1d2;--ink-2:#bfb5a4;--mist:#9c9182;--rule:#332d25;--rule-hard:#4d453a;--accent:#d9737f;--accent-soft:#3a2226;--amber:#e0a04a}
/* 劇場的東西：幕數與閱讀時間那條資訊列，公理卡片，琥珀色的程式碼上緣。 */
.playbill{display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-5);font-family:var(--mono);font-size:var(--fs-xs);letter-spacing:.06em;color:var(--mist);border-top:1px solid var(--rule-hard);border-bottom:1px solid var(--rule-hard);padding:var(--sp-3) 0;margin:var(--sp-5) 0 var(--sp-6)}
.playbill b{color:var(--ink-2);font-weight:500}
.axioms{counter-reset:ax;display:grid;gap:var(--sp-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));margin:var(--sp-5) 0}
.axiom{background:var(--card);border:1px solid var(--rule);border-radius:var(--radius);padding:var(--sp-4);position:relative}
.axiom::before{counter-increment:ax;content:"公理 " counter(ax,cjk-ideographic);font-family:var(--mono);font-size:var(--fs-xs);letter-spacing:.14em;color:var(--accent)}
.axiom h3{margin:.3em 0 .35em;font-size:var(--fs-3)}
.axiom p{margin:0;font-size:var(--fs-sm);color:var(--ink-2)}
pre{border-top-color:var(--amber)}
${themeBtnCss}`,
  body: `
<div class="progress"></div>${themeBtn}
<main class="report">
  <p class="eyebrow">1973 → 2026 · 一部分散式系統史</p>
  <h1 class="display">演員登台：<br>從 <em>Actor</em> 模型到<br>Durable Objects 的五十年</h1>
  <p class="lede">一個 1973 年的學術構想，如何在電話交換機裡熬過三十年，最後變成你 <code>wrangler.jsonc</code> 裡的三行設定。</p>
  <div class="playbill"><span>幕數 · <b>五幕一謝幕</b></span><span>閱讀時間 · <b>約 20 分鐘</b></span><span>出處 · <b>archive/actor</b></span></div>

  <p class="eyebrow">序幕 · PROLOGUE</p>
  <h2>兩個請求，同一個計數器</h2>
  <p>先從一個你八成寫過的 bug 開始。</p>
  <p>你做了一個服務，每個使用者每天有 600 秒的免費額度。程式很直覺：讀出今日用量，加上這次的秒數，寫回去。</p>
<pre><code>// 看起來人畜無害
const used = await db.get(\`usage:\${user}\`);
if (used + seconds > QUOTA) return reject();
await db.put(\`usage:\${user}\`, used + seconds);</code></pre>
  <p>然後某天，同一個使用者在手機和平板上同時開了兩個 session。兩個請求同時讀到 <code>used = 590</code>，各自判斷「還有 10 秒，放行」，各自寫回。<span class="mark">你的 600 秒上限，就這樣被兩個誠實的請求聯手繞過了。</span></p>
  <p>這叫 race condition。五十年來，工程師發明了鎖、交易、樂觀併發、CAS 指令來對付它 —— 每一種都有效，每一種都讓程式碼更難寫、更難讀、更難證明是對的。</p>
  <p class="pull">但在 1973 年，有一個人提出了完全不同的解法：與其學會安全地共享，不如從一開始就不要共享。</p>

  <p class="eyebrow">第一幕 · 1973</p>
  <h2>Hewitt 的三條公理</h2>
  <p>MIT 的 Carl Hewitt 當時在做人工智慧研究。他問的不是「怎麼寫並行程式」，而是一個更根本的問題：運算的最小單位，到底應該是什麼？</p>
  <p>一個 actor 收到一則訊息時，只被允許做三件事：</p>
  <div class="axioms stagger">
    <div class="axiom"><h3>送訊息</h3><p>送出有限則訊息，給它「認識位址」的其他 actor。不認識就送不到。</p></div>
    <div class="axiom"><h3>生小孩</h3><p>建立有限個新的 actor。系統的規模是長出來的，不是配置出來的。</p></div>
    <div class="axiom"><h3>決定下一步</h3><p>指定「下一則訊息要用什麼行為處理」。這就是它改變狀態的唯一方式。</p></div>
  </div>
  <p>第三條是整個模型的靈魂，也最容易被略過。Actor 沒有「變數」—— 所謂改變狀態，是換一個行為去面對下一則訊息。狀態被定義成「未來的行為」，而不是「現在記憶體裡的值」。</p>
  <hr>
  <p class="byline">聲音樣張 · 史詩。內容節錄自 archive/report/actor.html。這是六個答案之一，不是範本。</p>
</main>`,
});

/* ══ 2. 論證 · 架構筆記 ══════════════════════════════════════════════════ */
voices.push({
  file: 'argument.html',
  title: '第一百次，要比第一次聰明 — 聲音樣張：論證',
  fonts: 'family=Noto+Sans+TC:wght@400;500;700&family=IBM+Plex+Sans+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@400;500',
  css: `
/* 聲音：現場筆記。冷灰綠的紙、壓縮體標題、紅色的裁決、綠色的另一邊。 */
:root{--paper:#e9eae4;--card:#f6f6f2;--ink:#131a20;--ink-2:#4a5560;--mist:#6f7a83;--rule:#c7c9c0;--rule-hard:#9ea298;
      --accent:#a5372a;--accent-soft:#efe1dc;--green:#2e6e52;--green-soft:#e4ede7;
      --disp:"IBM Plex Sans Condensed","Noto Sans TC",sans-serif;--mono:"IBM Plex Mono","Noto Sans TC",monospace}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--paper:#171a1c;--card:#20242a;--ink:#e6e8e3;--ink-2:#b4b9b2;--mist:#8b928c;--rule:#33393c;--rule-hard:#4d5458;--accent:#e07a6c;--accent-soft:#3a2622;--green:#7fc4a0;--green-soft:#22332b}}
:root[data-theme="dark"]{--paper:#171a1c;--card:#20242a;--ink:#e6e8e3;--ink-2:#b4b9b2;--mist:#8b928c;--rule:#33393c;--rule-hard:#4d5458;--accent:#e07a6c;--accent-soft:#3a2622;--green:#7fc4a0;--green-soft:#22332b}
.display{letter-spacing:-.03em;font-weight:700}
/* 壓縮體的中文會落回思源黑 —— 所以標題的中文要粗一點才壓得住拉丁字 */
.display, h2 { font-weight:700 }
.vol{border-left:2px solid var(--rule-hard);padding:var(--sp-2) 0 var(--sp-2) var(--sp-4);font-size:var(--fs-sm);color:var(--ink-2);margin:var(--sp-5) 0}
.vol b{font-family:var(--mono);font-weight:500;color:var(--ink)}
table{font-size:var(--fs-sm)}
th{font-family:var(--mono);font-weight:500;letter-spacing:.06em;font-size:var(--fs-xs);text-transform:uppercase}
td.term{font-family:var(--disp);font-size:1.15em;font-weight:600}
tr.fork td{background:var(--green-soft)}
.rule-box{border:1px solid var(--rule-hard);padding:var(--sp-4) var(--sp-5);margin:var(--sp-5) 0;font-size:var(--fs-sm)}
.rule-box .head{font-family:var(--mono);font-size:var(--fs-xs);letter-spacing:.14em;color:var(--accent);margin-bottom:var(--sp-2)}
${themeBtnCss}`,
  body: `
<div class="progress"></div>${themeBtn}
<main class="report">
  <p class="eyebrow">架構筆記 · VOL.2 · 2026-08</p>
  <h1 class="display">第一百次，<br>要比第一次<em>聰明</em></h1>
  <p class="lede">上一篇講單次執行怎麼不出錯 —— 凍結、契約、有界迴圈，那是防線。這一篇講防線沒回答的問題：同一套系統跑到第一百次，憑什麼比第一次強？<strong>agent loop 不會自己累積，棘輪要刻意設計。</strong></p>
  <div class="vol"><b>← VOL.1 · 它們不會報錯，它們會成功</b> — 兩個案子、兩條軸（Q1 控制流由誰決定、Q2 有沒有裁判）、十一個 anti-pattern。本篇沿用全部編號與詞彙，不重複內容。</div>

  <p class="eyebrow">01 · VOCABULARY</p>
  <h2>五層詞彙，與一個常見的誤讀</h2>
  <p>市面上把 AI 工程拆成五個詞：Prompt、Context、Harness、Loop、Graph，常畫成 1→5 的遞進階梯。前三層確實是累加的基座，但第 4、5 層不是第 4、5 階 —— <span class="mark">Loop 與 Graph 是同一層的分岔</span>，是「控制流交給誰」這個問題的兩個答案。</p>
  <p>比較有用的讀法：五層各自回答「正確性從哪裡來」。</p>
  <div class="table-scroll wide">
    <table>
      <thead><tr><th>層</th><th></th><th>正確性來源</th><th>何時失效</th></tr></thead>
      <tbody>
        <tr><td class="num">1</td><td class="term">Prompt<span class="sub">the instruction</span></td><td class="wrap">指令品質 — 把要求講清楚</td><td class="wrap">任務需要事實時</td></tr>
        <tr><td class="num">2</td><td class="term">Context<span class="sub">the information</span></td><td class="wrap">資訊完整度 — 該看的都在視野裡</td><td class="wrap">任務需要動作時</td></tr>
        <tr><td class="num">3</td><td class="term">Harness<span class="sub">the operating env</span></td><td class="wrap">不產生正確性 — 它界定錯誤的代價</td><td class="wrap">它不會失效，它只會被略過</td></tr>
        <tr class="fork"><td class="num">4a</td><td class="term">Loop<span class="sub">the feedback</span></td><td class="wrap">回饋 — 做、驗、修，由裁判收斂</td><td class="wrap">沒有 oracle 時</td></tr>
        <tr class="fork"><td class="num">4b</td><td class="term">Graph<span class="sub">the structure</span></td><td class="wrap">結構 — 順序寫死，錯誤關進節點</td><td class="wrap">分支枚舉不完時</td></tr>
      </tbody>
    </table>
  </div>
  <p><span class="chip">接回 VOL.1</span> Q1（控制流交給誰）就是 4a/4b 這個分岔本身；Q2（有沒有裁判）決定你該站在分岔的哪一邊。五層是詞彙表，兩軸是選擇函數。</p>

  <h3>Harness 該獨立成一族</h3>
  <p>Harness 不決定系統對不對，它決定錯了會多貴。這層有一條可以直接抄的設計規則，來自 NanoClaw 一整季的 breaking changes：</p>
  <div class="rule-box"><p class="head">RULE · HARNESS</p><p>agent 能呼叫的工具只能「做事」，不能改變自己的能力邊界。排程、掛載、裝套件、加 MCP server —— 一律移出工具表，改走 host-only CLI 或人類審批。</p></div>
  <p>理由不是整潔，是持久化：容器 <code>--rm</code> 之後，排程是注入唯一活得過 session 的路徑。一次成功的注入，能種一個每天自己重新注入的後門。</p>
  <hr>
  <p class="byline">聲音樣張 · 論證。內容節錄自 archive/report/agent-arch-2.html。這是六個答案之一，不是範本。</p>
</main>`,
});

/* ══ 3. 綜述 · 研究 ══════════════════════════════════════════════════════ */
voices.push({
  file: 'digest.html',
  title: '同一個工具，為什麼結果差這麼多 — 聲音樣張：綜述',
  fonts: 'family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700&family=IBM+Plex+Mono:wght@400;500',
  css: `
/* 聲音：實驗室的方格紙。白底帶淡格線、宋體標題、綠色是證據、橘色是體感 ——
   兩個 accent，因為整篇報告就是在對照這兩件事。這是「第二個 accent 需要理由」的理由。 */
:root{--paper:#fbfbf9;--card:#ffffff;--ink:#1b2a24;--ink-2:#46564e;--mist:#6f7d75;--rule:#dfe4e0;--rule-hard:#b9c3bc;
      --accent:#1f6b4a;--accent-soft:#e2efe7;--felt:#c8641e;--felt-soft:#f8e8dc;--grid:#e6ebe7;
      --disp:"Noto Serif TC",Georgia,serif;--mono:"IBM Plex Mono","Noto Sans TC",monospace;
      --fs-display:clamp(2.3rem, 1.2rem + 4.4vw, 4.2rem)}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--paper:#14181a;--card:#1c2124;--ink:#e6ebe8;--ink-2:#b3bdb7;--mist:#8a958f;--rule:#2e3538;--rule-hard:#465054;--accent:#7dcaa2;--accent-soft:#1f3329;--felt:#e59a5c;--felt-soft:#3a2a1c;--grid:#1c2225}}
:root[data-theme="dark"]{--paper:#14181a;--card:#1c2124;--ink:#e6ebe8;--ink-2:#b3bdb7;--mist:#8a958f;--rule:#2e3538;--rule-hard:#465054;--accent:#7dcaa2;--accent-soft:#1f3329;--felt:#e59a5c;--felt-soft:#3a2a1c;--grid:#1c2225}
body{background-color:var(--paper);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:24px 24px}
.display em{color:var(--accent)}
.finding{background:var(--card);border:1px solid var(--rule-hard);border-left:4px solid var(--accent);padding:var(--sp-4) var(--sp-5);margin:var(--sp-5) 0;font-family:var(--disp);font-size:1.08em;line-height:1.6}
.felt{color:var(--felt)} .evid{color:var(--accent)}
.tldr{counter-reset:t;list-style:none;padding:0;margin:var(--sp-5) 0}
.tldr li{position:relative;padding-left:2.4em;margin-bottom:var(--sp-3)}
.tldr li::before{counter-increment:t;content:counter(t,decimal-leading-zero);position:absolute;left:0;top:.15em;font-family:var(--mono);font-size:var(--fs-xs);letter-spacing:.06em;color:var(--accent)}
.tldr b{font-weight:700}
${themeBtnCss}`,
  body: `
<div class="progress"></div>${themeBtn}
<main class="report">
  <p class="eyebrow">LLM 使用者差異 · 實證研究綜述 · 2026.07</p>
  <h1 class="display">同一個工具，<br>為什麼不同的人用，<br><em>結果差這麼多</em>？</h1>
  <p class="lede">「放大器」「鏡子」「新模型降智了」—— 這些流傳的說法各自抓到一角，也各自錯了一塊。本報告對照 2023–2026 年的實證研究，把它們收攏成一個自洽的圖像。</p>
  <div class="finding">核心結論：LLM 把「生成」的價格打到趨近於零，於是所有價值集中到「鑑別」—— 而鑑別力來自領域判斷、自我校準、驗證迴路，三者都無法委派給模型。</div>

  <figure class="reveal">
    <p class="title">Signature finding — METR 隨機對照試驗，2025 上半年</p>
    <p class="subtitle">同一批資深開發者、同一批真實任務。<span class="felt">橘色是體感與傳說</span>，<span class="evid">綠色是實測與證據</span> —— 這個對照貫穿全篇。</p>
    <div class="chart">
      <svg viewBox="0 0 640 260" role="img" aria-label="體感快了 20%，實測慢了 19%">
        <line class="grid" x1="60" y1="130" x2="560" y2="130"/>
        <text class="axis" x="52" y="134" text-anchor="end">0%</text>
        <text class="axis" x="52" y="44" text-anchor="end">+20</text>
        <text class="axis" x="52" y="224" text-anchor="end">−20</text>
        <path class="line" d="M100 130 L500 44" stroke="var(--felt)"/>
        <path class="line" d="M100 130 L500 212" stroke="var(--accent)"/>
        <circle class="dot" cx="100" cy="130" r="4.5" fill="var(--ink-2)"/>
        <circle class="dot" cx="500" cy="44" r="4.5" fill="var(--felt)"/>
        <circle class="dot" cx="500" cy="212" r="4.5" fill="var(--accent)"/>
        <text class="label" x="512" y="40">+20%</text><text class="label" x="512" y="56" fill="var(--mist)">體感：變快了</text>
        <text class="label" x="512" y="208">−19%</text><text class="label" x="512" y="224" fill="var(--mist)">實測：變慢了</text>
        <text class="axis" x="100" y="250" text-anchor="middle">事前</text>
        <text class="axis" x="500" y="250" text-anchor="middle">事後</text>
      </svg>
    </div>
    <div class="legend"><span class="key"><span class="swatch" style="background:var(--felt)"></span>體感／傳說</span><span class="key"><span class="swatch" style="background:var(--accent)"></span>實測／證據</span></div>
    <figcaption>16 位資深開源開發者、246 件自家專案的真實任務，隨機分派可否使用 AI。事前預測能加速 24%，事後仍「感覺」快了 20%，實測反而慢 19%。</figcaption>
  </figure>

  <p class="eyebrow">TL;DR · 三十秒版本</p>
  <h2>同一個工具，結果差在你 —— 但差在哪一種能力，跟大家想的不一樣</h2>
  <ol class="tldr">
    <li><b>不是放大器，也不是鏡子。</b>簡單任務上 AI 拉平差距（新手受益最大）；困難任務上才放大差距（專家受益）。真正的分水嶺是你能不能鑑別輸出好壞。</li>
    <li><b>你的體感會騙你。</b>資深工程師「感覺」快了 20%，實測其實慢 19%。靠感覺調整用法的人，方向是反的。</li>
    <li><b>危險不是它太笨，是它太順。</b>模型傾向附和你、鏡像你的立場；「連 AI 都同意」往往只是自己的觀點洗過一手。</li>
    <li><b>技能沒消失，是往上移。</b>下指令的門檻在降，規格化、任務分派、驗證的門檻在升 —— 價值集中到最上面那層，而且外包不掉。</li>
  </ol>
  <hr>
  <p class="byline">聲音樣張 · 綜述。內容節錄自 archive/report/ai-amp-or-mir.html。這是六個答案之一，不是範本。</p>
</main>`,
});

/* ══ 4. 驗屍 · 實證 ══════════════════════════════════════════════════════ */
voices.push({
  file: 'autopsy.html',
  title: '你聽過的台股必勝法，為什麼都經不起檢驗 — 聲音樣張：驗屍',
  fonts: 'family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700&family=IBM+Plex+Mono:wght@400;500',
  css: `
/* 聲音：解剖檯。奶油紙、驗屍紅、宋體標題、等寬體的檔案欄。裁決是一枚章。 */
:root{--paper:#fbf7ee;--card:#fffdf7;--ink:#1d1a14;--ink-2:#4d463a;--mist:#7a7160;--rule:#e5dcc8;--rule-hard:#c9bd9f;
      --accent:#b3261e;--accent-soft:#f6e1de;--verdict:#7a1a14;
      --disp:"Noto Serif TC",Georgia,serif;--mono:"IBM Plex Mono","Noto Sans TC",monospace;
      --fs-display:clamp(2.3rem, 1.2rem + 4.4vw, 4.2rem)}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--paper:#171410;--card:#221e17;--ink:#ece5d6;--ink-2:#c1b7a3;--mist:#958b78;--rule:#352e24;--rule-hard:#514838;--accent:#ef7a70;--accent-soft:#3d2320;--verdict:#f0a39c}}
:root[data-theme="dark"]{--paper:#171410;--card:#221e17;--ink:#ece5d6;--ink-2:#c1b7a3;--mist:#958b78;--rule:#352e24;--rule-hard:#514838;--accent:#ef7a70;--accent-soft:#3d2320;--verdict:#f0a39c}
.dossier{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr));gap:var(--sp-2) var(--sp-5);font-family:var(--mono);font-size:var(--fs-xs);color:var(--mist);border-top:1px solid var(--rule-hard);border-bottom:1px solid var(--rule-hard);padding:var(--sp-3) 0;margin:var(--sp-5) 0 var(--sp-6)}
.dossier b{display:block;color:var(--ink);font-weight:500;font-size:var(--fs-sm);letter-spacing:0}
.verdict{display:inline-block;font-family:var(--disp);font-weight:700;color:var(--verdict);border:2px solid currentColor;padding:.1em .6em;transform:rotate(-2deg);letter-spacing:.1em;margin:var(--sp-3) 0}
.q{font-family:var(--disp);font-weight:700;font-size:1.08em;margin:var(--sp-5) 0 var(--sp-2)}
.q::before{content:"Q1 ｜ ";font-family:var(--mono);font-weight:500;color:var(--accent);font-size:.85em;letter-spacing:.1em}
.chart .phase{fill:var(--ink-2);font-size:12px;font-family:var(--sans)}
${themeBtnCss}`,
  body: `
<div class="progress"></div>${themeBtn}
<main class="report">
  <p class="eyebrow">實證驗屍報告 · 2013–2026</p>
  <h1 class="display">你聽過的台股必勝法，<br>為什麼都<br><em>經不起檢驗</em>？</h1>
  <p class="lede">我們抓了 231 萬筆台股公開資料，親手檢驗三個最流行的散戶戰法：跟大戶買、追漲停、無腦正2。結果全部指向同一條曲線 —— 而這條曲線，值得每個進場前的人先看一眼。</p>
  <div class="dossier">
    <span>期間<b>2013.01–2026.07</b></span><span>樣本<b>804 檔上市櫃</b></span><span>資料<b>FinMind 公開 API</b></span><span>可重製<b>任何人皆可驗證</b></span>
  </div>

  <figure class="reveal">
    <p class="title">顯學衰減曲線</p>
    <p class="subtitle">本研究在三個互不相干的市場角落各量出一次同樣的形狀。</p>
    <div class="chart">
      <svg viewBox="0 0 640 260" role="img" aria-label="顯學衰減曲線：有效期、衰減期、反噬期">
        <line class="grid" x1="40" y1="150" x2="600" y2="150"/>
        <text class="axis" x="600" y="166" text-anchor="end">損益兩平線</text>
        <path class="line" d="M60 120 C160 40, 240 30, 320 80 S460 170, 600 220" stroke="var(--accent)"/>
        <circle class="dot" cx="200" cy="38" r="4.5" fill="var(--accent)"/>
        <circle class="dot" cx="360" cy="112" r="4.5" fill="var(--accent)"/>
        <circle class="dot" cx="560" cy="205" r="4.5" fill="var(--accent)"/>
        <text class="phase" x="200" y="24" text-anchor="middle">① 有效期：少數人知道，真的能賺</text>
        <text class="phase" x="360" y="100" text-anchor="middle">② 衰減期：全民皆知，利潤被分食</text>
        <text class="phase" x="500" y="236" text-anchor="middle">③ 反噬期：跟的人變成獵物</text>
      </svg>
    </div>
    <figcaption>任何公開、可複製、沒有結構保護的賺錢方法，壽命與它的知名度成反比。</figcaption>
  </figure>

  <p class="eyebrow">第壹部</p>
  <h2>跟著大戶買，可以嗎？</h2>
  <p>外資、投信每天買了什麼，證交所都會公布，看盤軟體人人看得到。跟著地表最強的資金走，聽起來穩贏 —— 我們測了 13 年的資料。</p>
  <div class="verdict">判決：不行</div>
  <p class="q">看盤軟體上，法人買超的股票當天幾乎都在漲。跟著大戶買，不就好了？</p>
  <p><strong>不行。<span class="mark">你看到的漲，發生在你知道消息之前。</span></strong></p>
  <p>法人買賣超是收盤後才公布的。「法人買的股票在漲」這個畫面之所以天天上演，是因為法人買進和股價上漲發生在同一天 —— 等你晚上看到資料、隔天開盤進場，那段漲幅早就結束了。</p>
  <div class="note"><p class="head">本文的進場假設</p><p>法人資料每天收盤後才公布，所以所有回測一律假設「隔天開盤價買進」—— 這是你現實中最早能動手的時間點。很多網路回測用「訊號當天收盤價」，那是買不到的價格。</p></div>
  <hr>
  <p class="byline">聲音樣張 · 驗屍。內容節錄自 archive/report/tw-stock-winner.html。這是六個答案之一，不是範本。</p>
</main>`,
});

/* ══ 5. 深夜 · 數據敘事 ══════════════════════════════════════════════════ */
voices.push({
  file: 'night.html',
  title: '房價，真的是那盞熄掉的燈嗎 — 聲音樣張：深夜',
  fonts: 'family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@700&family=IBM+Plex+Mono:wght@400;500',
  css: `
/* 聲音：深夜的窗。這一篇天生是深色的 —— 所以「淺色」才是它的第二套配色，
   跟其他五份相反。海軍藍、暖白的字、一盞金色的燈。 */
:root{--paper:#0f1a2e;--card:#172440;--ink:#ece7da;--ink-2:#b7b3a6;--mist:#8a8879;--rule:#25324d;--rule-hard:#3b4a6b;
      --accent:#e0a53a;--accent-soft:#3a3120;--lit:#e0a53a;--dark-win:#243252;
      --disp:"Noto Serif TC",Georgia,serif;--mono:"IBM Plex Mono","Noto Sans TC",monospace}
:root{color-scheme:dark}
@media (prefers-color-scheme:light){:root:where(:not([data-theme="dark"])){color-scheme:light;--paper:#f4f1ea;--card:#fbf9f4;--ink:#1a2030;--ink-2:#4a5266;--mist:#727a8c;--rule:#dcd8cc;--rule-hard:#b9b3a3;--accent:#9a6a12;--accent-soft:#f0e4c8;--lit:#c8901e;--dark-win:#d8d3c6}}
:root[data-theme="light"]{color-scheme:light;--paper:#f4f1ea;--card:#fbf9f4;--ink:#1a2030;--ink-2:#4a5266;--mist:#727a8c;--rule:#dcd8cc;--rule-hard:#b9b3a3;--accent:#9a6a12;--accent-soft:#f0e4c8;--lit:#c8901e;--dark-win:#d8d3c6}
.hero{color:var(--accent);font-family:var(--mono);font-weight:500;letter-spacing:-.02em}
.waffle svg{width:100%;height:auto;display:block}
.counter{font-family:var(--mono);font-size:var(--fs-xs);letter-spacing:.12em;color:var(--mist);display:flex;gap:var(--sp-4);justify-content:space-between;border-top:1px solid var(--rule);padding-top:var(--sp-3);margin-top:var(--sp-6)}
${themeBtnCss}`,
  body: (() => {
    // 2016 年 208,440 名新生兒 = 200 格；2025 年約半數 → 一半的窗還亮著
    const cols = 20, rows = 10, lit = 100;
    const cells = [];
    for (let i = 0; i < cols * rows; i++) {
      const x = 4 + (i % cols) * 31.6, y = 4 + Math.floor(i / cols) * 24;
      cells.push(`<rect x="${x}" y="${y}" width="26" height="18" rx="2" fill="${i < lit ? 'var(--lit)' : 'var(--dark-win)'}"/>`);
    }
    return `
<div class="progress"></div>${themeBtn}
<main class="report">
  <p class="eyebrow">專題 · 台灣人口與居住</p>
  <h1 class="display">房價，<br>真的是那盞<br><em>熄掉的燈</em>嗎？</h1>
  <p class="lede">十年之間，台灣的新生兒少了一半。同一段時間，房價漲了。兩件事同時發生 —— 但「同時」不等於「因為」。</p>

  <figure class="wide reveal">
    <div class="waffle">
      <svg viewBox="0 0 640 244" role="img" aria-label="兩百格窗戶，一半亮著：2016 年到 2025 年，新生兒數減半">
        ${cells.join('\n        ')}
      </svg>
    </div>
    <figcaption>每一格是一千名新生兒。2016 年的 208,440 盞燈，到 2025 年只剩下一半還亮著。</figcaption>
  </figure>

  <div class="hero">208,440</div>
  <p class="byline">2016 年新生兒（人）。十年後：約 104,000。</p>

  <p class="eyebrow">01 · 兩條線</p>
  <h2>先把「同時」跟「因為」分開</h2>
  <p>把出生數和房價指數畫在同一張圖上，兩條線的方向確實相反。但反向相關能講的故事至少有三個：房價壓垮了生育、生育率下降推高了房價（少子化家庭把資源集中在一間房上）、或者兩者都被第三件事推著走 —— 薪資停滯、晚婚、都市集中。</p>
  <p><span class="mark">這篇不打算選一個答案，而是把三個故事各自需要的證據列出來，看哪一個站得住。</span></p>
  <div class="counter"><span>熄燈的窗 · 台灣少子化與房價</span><span>01 / 08</span></div>
  <hr>
  <p class="byline">聲音樣張 · 深夜。內容節錄自 archive/report/birthrate-vs-housing.html。這是六個答案之一，不是範本。</p>
</main>`;
  })(),
});

/* ══ 6. 手帖 · 指南 ══════════════════════════════════════════════════════ */
voices.push({
  file: 'fieldguide.html',
  title: '釜山旅遊書 — 聲音樣張：手帖',
  fonts: 'family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700&family=Archivo:wght@700;800&family=IBM+Plex+Mono:wght@400;500',
  css: `
/* 聲音：旅遊海報。明亮的紙、四色色條（韓國旗色）、拉丁字用 Archivo 的重量壓一個大字 BUSAN。 */
:root{--paper:#fffaf0;--card:#ffffff;--ink:#1f2a3a;--ink-2:#4a5568;--mist:#6b7788;--rule:#eadfca;--rule-hard:#d3c4a4;
      --accent:#c9463d;--accent-soft:#fbe4e0;--navy:#1d3f6e;--gold:#e8b64a;--teal:#2f8f83;
      --disp:"Noto Serif TC",Georgia,serif;--latin:"Archivo","Noto Sans TC",sans-serif;--mono:"IBM Plex Mono","Noto Sans TC",monospace}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--paper:#1a1c22;--card:#23262e;--ink:#eee9df;--ink-2:#bcc2cc;--mist:#8e97a6;--rule:#343842;--rule-hard:#4b515e;--accent:#ee7a70;--accent-soft:#40262a;--navy:#8fb2e0;--gold:#f0c866;--teal:#66c4b8}}
:root[data-theme="dark"]{--paper:#1a1c22;--card:#23262e;--ink:#eee9df;--ink-2:#bcc2cc;--mist:#8e97a6;--rule:#343842;--rule-hard:#4b515e;--accent:#ee7a70;--accent-soft:#40262a;--navy:#8fb2e0;--gold:#f0c866;--teal:#66c4b8}
.bars{position:fixed;inset:0 0 auto 0;height:6px;display:flex;z-index:9}
.bars span{flex:1}.bars span:nth-child(1){background:var(--accent)}.bars span:nth-child(2){background:var(--gold)}.bars span:nth-child(3){background:var(--navy)}.bars span:nth-child(4){background:var(--teal)}
.progress{top:6px}
.display{line-height:1}
.display .latin{display:block;font-family:var(--latin);font-weight:800;color:var(--navy);letter-spacing:.02em;font-size:.72em;margin-top:.1em}
.kicker-kr{font-family:var(--mono);font-size:var(--fs-xs);letter-spacing:.1em;color:var(--accent)}
.stat .label{font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase}
.stat .value{font-family:var(--latin);font-size:1.5rem}
.prep{counter-reset:p;display:grid;gap:var(--sp-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))}
.prep .card{padding:var(--sp-4);position:relative}
.prep h3{font-size:var(--fs-3);margin:0 0 .3em}
.prep h3 small{display:block;font-family:var(--mono);font-size:var(--fs-xs);letter-spacing:.1em;color:var(--mist);font-weight:400}
.prep p{margin:0;font-size:var(--fs-sm);color:var(--ink-2)}
.prep .card.hot{border-top:3px solid var(--accent)}
.prep .card.hot::after{content:"最重要";position:absolute;top:var(--sp-3);right:var(--sp-3);font-family:var(--mono);font-size:var(--fs-xs);color:var(--accent);letter-spacing:.1em}
.skyline{margin:var(--sp-5) 0 0}
${themeBtnCss}`,
  body: `
<div class="bars"><span></span><span></span><span></span><span></span></div>
<div class="progress"></div>${themeBtn}
<main class="report">
  <p class="kicker-kr">부산 여행 가이드 · 처음이라도 OK</p>
  <h1 class="display">釜山<em>旅遊書</em><span class="latin">BUSAN</span></h1>
  <p class="lede">給第一次去釜山的台灣人：從入境、交通、必訪景點到街頭美食，一頁看懂，行李收一收就能出發。</p>

  <div class="tiles wide stagger">
    <div class="stat"><p class="label">Flight · 航程</p><div class="value">約 2h20m</div><div class="delta">桃園直飛金海機場</div></div>
    <div class="stat"><p class="label">Time · 時差</p><div class="value">+1 小時</div><div class="delta">韓國比台灣快（GMT+9）</div></div>
    <div class="stat"><p class="label">Money · 匯率</p><div class="value">₩1 ≈ NT$0.02</div><div class="delta">約 NT$1 ≈ ₩47（2026/7）</div></div>
    <div class="stat"><p class="label">Power · 電壓</p><div class="value">220V 圓孔</div><div class="delta">跟台灣不同，要帶轉接頭</div></div>
  </div>

  <figure class="skyline wide reveal">
    <svg viewBox="0 0 640 120" role="img" aria-label="釜山天際線示意：山、海、大橋">
      <path d="M0 78 L60 40 L110 66 L170 28 L230 62 L300 44 L360 70 L420 36 L480 60 L540 30 L640 74 L640 120 L0 120Z" fill="var(--teal)" opacity=".35"/>
      <path d="M0 120 L0 92 Q160 74 320 92 T640 92 L640 120Z" fill="var(--navy)" opacity=".85"/>
      <path d="M140 92 Q320 40 500 92" fill="none" stroke="var(--accent)" stroke-width="3"/>
      <line x1="230" y1="92" x2="230" y2="66" stroke="var(--accent)" stroke-width="3"/>
      <line x1="410" y1="92" x2="410" y2="66" stroke="var(--accent)" stroke-width="3"/>
      <circle cx="560" cy="34" r="16" fill="var(--gold)"/>
    </svg>
  </figure>

  <p class="eyebrow">01 · 준비물 · PREP</p>
  <h2>行前必知</h2>
  <p>先把入境、行李、藥品和電壓這幾件事搞定，落地就不會手忙腳亂。標著「最重要」的是最容易踩雷的地方。</p>
  <div class="prep stagger">
    <div class="card hot"><h3>簽證與入境<small>VISA · ENTRY</small></h3><p>持效期 6 個月以上護照免簽可停留 90 天。2026 起紙本入境卡取消，改在出發前 72 小時內線上填 e-Arrival Card，免費。</p></div>
    <div class="card hot"><h3>行李新規<small>BAGGAGE</small></h3><p>暖暖包、行動電源禁止託運，一律隨身手提。肉類製品（含肉乾、肉鬆、真空包）禁止帶入韓國，別放行李。</p></div>
    <div class="card"><h3>藥品注意<small>MEDS</small></h3><p>部分止咳藥（含右美沙芬）在韓國列管，入境可能被查。自備藥建議帶英文處方箋、只帶自用量。</p></div>
    <div class="card"><h3>網路與付款<small>SIM · PAY</small></h3><p>出發前買好 eSIM，落地即用。很多地方收 Visa／Master，但小攤仍以現金與交通卡為主。</p></div>
  </div>
  <hr>
  <p class="byline">聲音樣張 · 手帖。內容節錄自 archive/report/busan_v2.html。這是六個答案之一，不是範本。</p>
</main>`,
});

for (const v of voices) {
  const html = `${head(v.title, v.fonts)}
<style>
${chassis}
${v.css}
</style>
<body>${v.body}
${foot}`;
  await writeFile(path.join(here, v.file), html);
  console.log(`${v.file.padEnd(16)} ${Buffer.byteLength(html)} bytes`);
}
