#!/usr/bin/env node
// 把 HTML 裡 runtime 抓取的第三方 <script src> 換成內聯的快照。
//
//   node scripts/inline-cdn.mjs report.html            就地改寫
//   node scripts/inline-cdn.mjs --check report.html    只報告，不動檔案（有事做時回 1）
//   node scripts/inline-cdn.mjs inbox/*.html           可以一次多個檔案
//
// 為什麼需要這個：imitator 的 artifact 預設被 CSP sandbox 丟進 opaque origin，
// 而用到 localStorage 那類 API 的報告必須 `X-Sandbox: off` 才能運作 —— 那會拿掉
// sandbox，於是那一頁的 JS 有完整的同源權限，它載入的任何第三方腳本都繼承了
// 「帶著讀者的 cookie 讀走全站內容」的能力。所以 host 會擋下
// 「sandbox off ＋ 第三方 script」這個組合，回 400。
// 規則見 docs/publishing-rules.md。
//
// 只用 Node 內建模組，沒有相依套件 —— 單獨抓這一支檔案下去跑就會動。
//
// 這支工具刻意**不**放進 CI 自動執行：那等於發佈當下去下載任意第三方程式碼、
// 直接烤進 artifact 而沒有人看過。要有意識地在本機跑，結果 commit 進 repo。

import { readFile, writeFile } from 'node:fs/promises';

const MAX_LIB_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 60_000;

// <script ... src="URL" ...></script>，屬性順序不拘
const SCRIPT_TAG = /<script\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*?)>\s*<\/script>/gi;
const EXTERNAL = /^(?:https?:)?\/\//i;

const args = process.argv.slice(2);
const check = args.includes('--check');
const files = args.filter((a) => !a.startsWith('--'));

if (files.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`用法: node scripts/inline-cdn.mjs [--check] <file.html...>

  --check   只報告要做什麼，不改檔案。有事情要做時回離開碼 1。

把 <script src="https://..."></script> 換成內聯的快照。抓不動或無法安全處理的
會報告出來但不動它 —— 詳見 docs/publishing-rules.md。`);
  process.exit(files.length === 0 ? 1 : 0);
}

/** @type {Map<string, string|Error>} */
const cache = new Map();

async function fetchLib(url) {
  if (cache.has(url)) {
    const hit = cache.get(url);
    if (hit instanceof Error) throw hit;
    return hit;
  }
  const target = url.startsWith('//') ? `https:${url}` : url;
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    const text = await res.text();
    if (text.length > MAX_LIB_BYTES) throw new Error(`超過 ${MAX_LIB_BYTES / 1048576} MB`);
    // 抓到一頁 HTML 通常代表那是錯誤頁或挑戰頁，不是函式庫
    if (/text\/html/i.test(type) || /^\s*<(?:!doctype|html)\b/i.test(text)) {
      throw new Error('回應是 HTML，不是 JavaScript（錯誤頁？）');
    }
    cache.set(url, text);
    return text;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    cache.set(url, e);
    throw e;
  }
}

/** 內聯的 JS 若含 </script 會提前關掉外層標籤。 */
const escapeClose = (js) => js.replace(/<\/script/gi, '<\\/script');

const today = new Date().toISOString().slice(0, 10);
let touched = 0;
let pending = 0;
let problems = 0;

for (const file of files) {
  let html;
  try {
    html = await readFile(file, 'utf-8');
  } catch (err) {
    console.error(`✗ ${file}: 讀不到（${err.message}）`);
    problems += 1;
    continue;
  }

  const jobs = [];
  for (const m of html.matchAll(SCRIPT_TAG)) {
    const [full, pre, , url, post] = m;
    if (!EXTERNAL.test(url)) continue;
    jobs.push({ full, url, attrs: `${pre} ${post}` });
  }

  if (jobs.length === 0) {
    console.log(`  ${file}: 沒有 runtime 抓取的第三方 script`);
    continue;
  }

  let out = html;
  let done = 0;
  for (const job of jobs) {
    // type="module" 內聯之後，它自己的 import 還是會在 runtime 去抓 —— 改了也
    // 沒解決問題，反而讓人以為解決了。報告出來讓人自己處理。
    if (/\btype\s*=\s*["']?module\b/i.test(job.attrs)) {
      console.log(`  ${file}: ⚠ 跳過 ${job.url} —— type="module"，內聯後它的 import 仍會 runtime 抓取`);
      problems += 1;
      continue;
    }

    if (check) {
      console.log(`  ${file}: 要內聯 ${job.url}`);
      pending += 1;
      continue;
    }

    let src;
    try {
      src = await fetchLib(job.url);
    } catch (err) {
      console.log(`  ${file}: ✗ 抓不到 ${job.url} —— ${err.message}`);
      problems += 1;
      continue;
    }

    // defer／async 對內聯 script 沒有作用，執行時機會從「延後」變成「當場」。
    const timing = /\b(defer|async)\b/i.exec(job.attrs)?.[1];
    if (timing) {
      console.log(`  ${file}: ⚠ 原本有 ${timing}，內聯後會變成同步執行（順序可能改變，記得驗一下）`);
    }

    const replacement =
      `<!-- inlined ${today} from ${job.url} — 原本是 runtime 抓取的第三方腳本，\n` +
      `     見 docs/publishing-rules.md -->\n` +
      `<script>\n${escapeClose(src)}\n</script>`;
    // 一定要用 function 當替換值：字串形式會把 $&、$'、$1 這些當成特殊語法，
    // 而壓縮過的 JS 裡到處是 $，整份程式碼會被改壞（而且壞得很難看出來 ——
    // 檔案大小正常、只有執行時丟 SyntaxError）。
    out = out.replace(job.full, () => replacement);
    console.log(`  ${file}: ✓ 內聯 ${job.url}（${src.length} bytes）`);
    done += 1;
  }

  if (done > 0) {
    await writeFile(file, out, 'utf-8');
    touched += 1;
  }
}

if (check && pending > 0) {
  console.log(`\n${pending} 個第三方 script 要內聯。拿掉 --check 就會處理。`);
  process.exit(1);
}
if (problems > 0) {
  console.log(`\n${problems} 個沒辦法自動處理，要手動看一下。`);
  process.exit(1);
}
if (touched > 0) console.log(`\n改寫了 ${touched} 個檔案。記得在瀏覽器裡開一次確認沒壞。`);
