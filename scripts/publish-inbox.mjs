#!/usr/bin/env node
// 把 inbox/*.html 發佈到 imitator，然後把原始檔搬進 archive/report/。
//
// 由 .github/workflows/publish-inbox.yml 觸發，也可以在本機跑：
//
//   IMITATOR_BASE=https://imitator.ai-apps.work \
//   IMITATOR_TOKEN=imi_... \
//   node scripts/publish-inbox.mjs [--dry-run]
//
// 掃的是 inbox/ 目前的內容，不是 git diff —— 上一輪失敗留下的檔案下次會自動重試，
// 而重推同一個 slug 本來就是冪等的（同名視為更新）。

import { readdir, readFile, rename, appendFile, access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { sandboxFor, SANDBOX_META_TAG } from './sandbox.mjs';

const INBOX = 'inbox';
const REJECTED = 'inbox/rejected';
const ARCHIVE = 'archive/report';
const MAX_BYTES = 25 * 1024 * 1024;
const VISIBILITY = 'public'; // inbox 就是「公開發佈」的意思，見 inbox/README.md

const base = (process.env.IMITATOR_BASE ?? '').replace(/\/$/, '');
const token = process.env.IMITATOR_TOKEN ?? '';
const dryRun = process.argv.includes('--dry-run');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// --help 要在檢查環境變數之前 —— 想知道用法的人手上通常還沒有 token。
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`用法: IMITATOR_BASE=https://... IMITATOR_TOKEN=imi_... \\
       node scripts/publish-inbox.mjs [--dry-run]

把 inbox/*.html 以 public 發佈，成功的搬進 archive/report/，
被永久拒絕的（403、400、slug 不合法、超過 25 MB）搬進 inbox/rejected/。
--dry-run 只印會做什麼，不發佈也不搬檔案。`);
  process.exit(0);
}

// 絕不印 token。GitHub 會遮蔽登記過的 secret，但只比對完全相同的字串 ——
// 不要依賴它，這個 repo 是公開的，workflow log 也是公開的。
if (!base) fail('IMITATOR_BASE 沒設');
if (!token) fail('IMITATOR_TOKEN 沒設（repo secret）');

const toSlug = (filename) =>
  path
    .basename(filename, '.html')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
    .replace(/-$/, '');

function titleOf(html, fallback) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const raw = m ? m[1].replace(/\s+/g, ' ').trim() : '';
  return raw || fallback;
}

/** Node 的 fetch 用 ByteString 驗 header 值，中文標題要先攤成 latin-1 位元組。 */
const toHeaderValue = (s) => String.fromCharCode(...new TextEncoder().encode(s));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 永久性失敗 —— 重試不會有幫助（403、檔名推不出 slug、超過大小上限）。
 *
 * 這種檔案不能留在 inbox/：它會在之後的每一次 push 重試、每一次失敗，
 * workflow 就永遠紅著。移到 inbox/rejected/ 讓下一次能綠，本次仍然回非零
 * 讓你看得到。
 */
function permanent(message) {
  const err = new Error(message);
  err.permanent = true;
  return err;
}

async function summary(line) {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
  }
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function upload(slug, title, body, sandbox) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${base}/v1/a/${slug}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/html',
        'X-Visibility': VISIBILITY,
        'X-Title': toHeaderValue(title),
        'X-Sandbox': sandbox,
      },
      body,
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(2 ** attempt * 1000);
      continue;
    }
    const text = await res.text();

    // Cloudflare 攔在 Worker 前面時也會回 403（挑戰頁、WAF、受管規則），而且
    // 回的是 HTML 不是我們的 JSON。**這一段必須排在 403 之前** —— 先前排在
    // 後面，於是每一次 Bot Fight Mode 的挑戰都被誤報成「slug 屬於別的 group」，
    // 檔案被丟進 rejected/，而真正的原因（runner 走 Azure IP、UA 是 node）
    // 完全沒有出現在訊息裡。
    const fromWorker = (() => {
      try {
        return typeof JSON.parse(text)?.error === 'string';
      } catch {
        return false;
      }
    })();
    if (!fromWorker) {
      const challenge = /Just a moment|cf-browser-verification|__cf_chl|challenge-platform/.test(text);
      throw new Error(
        challenge
          ? '被 Cloudflare 的挑戰頁擋下（多半是 Bot Fight Mode）。GitHub 的 runner 走 ' +
            'Azure 的資料中心 IP、UA 是 node，會被判成自動化流量。BFM 跑在 Ruleset ' +
            'Engine 之外，WAF custom rule 的 Skip 對它無效，只能整個關掉；' +
            'Super Bot Fight Mode 則可以用 Skip 對 /v1/a 放行。見 inbox/README.md。'
          : `Cloudflare 在 Worker 之前擋下（HTTP ${res.status}），回的不是 API 的 JSON。` +
            `檢查 WAF custom rule 有沒有把 /v1/a 放行。內文開頭：${text.replace(/\s+/g, ' ').slice(0, 160)}`,
      );
    }

    // 到這裡才確定 403 是 Worker 自己回的：這個 slug 屬於別的 group（owner 擋下）。
    // 重試沒有用，訊息要能讓人直接知道 inbox 用的 token 跟當初發佈那個 slug 的不是同一個。
    if (res.status === 403) {
      throw permanent(
        `slug "${slug}" 屬於別的 group —— inbox 用的 token 不是當初發佈它的那個。` +
          '換檔名發成新的一份，或改用原本那個 token 從 CLI 更新。',
      );
    }
    // 400 = 內容政策擋下來的（例如 sandbox off 又載入第三方腳本）。重試不會過，
    // 而 server 回的 reason／fix 是照著改的說明，直接帶出來。
    if (res.status === 400) {
      try {
        const body = JSON.parse(text);
        throw permanent([body.error, body.reason, body.fix].filter(Boolean).join(' — '));
      } catch (err) {
        if (err.permanent) throw err;
        throw permanent(`400 ${text.slice(0, 200)}`);
      }
    }
    // 錯誤內文可能回顯我們送出去的 header，但不會包含 Authorization。
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  throw new Error('重試 4 次仍失敗');
}

let files;
try {
  files = (await readdir(INBOX)).filter((f) => f.toLowerCase().endsWith('.html')).sort();
} catch {
  files = [];
}
if (files.length === 0) {
  await summary('inbox 是空的，沒有東西要發佈。');
  process.exit(0);
}

await summary(`## 發佈了 ${files.length} 份\n`);
await summary('| 檔案 | 網址 | sandbox |');
await summary('|---|---|---|');

let failed = 0;
let rejected = 0;
const warned = [];

async function reject(file, src, reason) {
  await mkdir(REJECTED, { recursive: true });
  await rename(src, path.join(REJECTED, file));
  await summary(`| \`${file}\` | ✗ ${reason} → 移到 \`inbox/rejected/\` | — |`);
  failed += 1;
  rejected += 1;
}

for (const file of files) {
  const src = path.join(INBOX, file);
  const raw = await readFile(src);
  const slug = toSlug(file);

  if (!slug) {
    await reject(file, src, '推導不出合法的 slug（檔名要有 a-z0-9-）');
    continue;
  }
  if (raw.byteLength > MAX_BYTES) {
    await reject(file, src, `超過 25 MB（${(raw.byteLength / 1048576).toFixed(1)} MB）`);
    continue;
  }

  const html = raw.toString('utf-8');
  // 一律 on，除非檔案自己寫了 SANDBOX_META_TAG。判準在 scripts/sandbox.mjs，
  // 那裡也寫了為什麼不再用「內文有沒有出現 localStorage」來猜。
  const sandbox = sandboxFor(html);

  if (dryRun) {
    await summary(`| \`${file}\` | ${base}/r/${slug}（dry-run）| ${sandbox} |`);
    continue;
  }

  try {
    const result = await upload(slug, titleOf(html, slug), raw, sandbox);
    // 發佈成功才搬走：失敗的留在 inbox，下一次 push 會重試。
    const dest = path.join(ARCHIVE, `${slug}.html`);
    const overwrote = await exists(dest);
    await rename(src, dest);
    await summary(
      `| \`${file}\` | [${result.url}](${result.url}) | ${result.sandbox}${overwrote ? ' · 覆寫既有' : ''} |`,
    );
    for (const w of result.warnings ?? []) {
      warned.push({ file, ...w });
    }
  } catch (err) {
    if (err.permanent) {
      await reject(file, src, err.message);
    } else {
      await summary(`| \`${file}\` | ✗ ${err.message} | — |`);
      failed += 1;
    }
  }
  await sleep(80);
}

if (warned.length) {
  // storage-api-with-sandbox-on 要單獨拉出來:它代表那一頁在 opaque origin 下
  // 會丟 SecurityError 而靜靜地壞掉 —— 沒有任何錯誤會傳回發佈的人手上。
  // 混在一長串警告裡沒有人會看到,所以放最前面並寫清楚後果。
  const broken = warned.filter((w) => w.code === 'storage-api-with-sandbox-on');
  if (broken.length) {
    await summary(`\n### ⚠️ ${broken.length} 份會在瀏覽器裡靜靜壞掉\n`);
    await summary(
      '這些頁面用了 storage API,但跑在 CSP sandbox 的 opaque origin 裡,' +
        '那些呼叫會丟 `SecurityError`。頁面壞掉不會有任何訊息傳回這裡。\n',
    );
    await summary('修法:把 storage 呼叫拿掉(偏好放記憶體、狀態改成明確的匯出/匯入)。');
    await summary(
      '真的需要真實來源才在 HTML 開頭加 `' +
        SANDBOX_META_TAG +
        '` —— 那等於放棄整頁的 sandbox,它的 JS 就讀得到這個來源上每一份讀者看得到的 artifact。\n',
    );
    for (const w of broken) await summary(`- \`${w.file}\``);
  }
  const rest = warned.filter((w) => w.code !== 'storage-api-with-sandbox-on');
  if (rest.length) {
    await summary(`\n### 警告\n`);
    for (const w of rest) await summary(`- \`${w.file}\` — **${w.code}**: ${w.reason} ${w.fix}`);
  }
}

if (failed) {
  const retryable = failed - rejected;
  const parts = [`**${failed} 份失敗**。`];
  if (retryable) parts.push(`${retryable} 份是暫時性的，留在 \`inbox/\`，下次 push 會重試。`);
  if (rejected) {
    parts.push(
      `${rejected} 份重試也不會過，已移到 \`inbox/rejected/\` —— ` +
        '處理完再放回 `inbox/` 即可，下一次執行不會再被它們卡住。',
    );
  }
  await summary(`\n${parts.join(' ')}`);
  process.exit(1);
}
