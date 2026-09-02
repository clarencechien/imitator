#!/usr/bin/env node
// 把舊站的 archive/report/*.html 一次推到 imitator v2（spec §9 步驟 1）。
//
//   IMITATOR_BASE=https://imitator.ai-apps.work \
//   IMITATOR_TOKEN=imi_rd_1_xxx \
//   node scripts/migrate.mjs --visibility=public [--dry-run] [--dir archive/report] [--force]
//                            [--timestamps=archive/report_list.json | none]
//
// slug 由檔名推導，衝突會在開始上傳前就報錯。
//
// updatedAt 預設取自 report_list.json（舊 Action 逐次累積下來的真實時間，
// 視為 UTC），透過 X-Updated-At 送出。portal 依 updatedAt 由新到舊排序，
// 少了這個，272 份會全部變成上傳當天、排序完全沒有意義。
// 注意不要改用 git log — 這份 repo 的歷史被整批重傳過，每個檔案的 committer
// date 都是同一天。
//
// 預設會先拉一次 /v1/a，已經在站上的 slug 直接跳過，所以中斷之後重跑只會補
// 沒上去的那些。要強制全部重推就加 --force。

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const base = (process.env.IMITATOR_BASE ?? '').replace(/\/$/, '');
const token = process.env.IMITATOR_TOKEN ?? '';
const visibility = args.get('visibility');
const dir = typeof args.get('dir') === 'string' ? args.get('dir') : 'archive/report';
const dryRun = args.has('dry-run');
const force = args.has('force');
const timestampsArg = args.get('timestamps');
const timestampsFile =
  timestampsArg === undefined ? 'archive/report_list.json' : timestampsArg === 'none' ? null : timestampsArg;

if (!base || !token) fail('請設定 IMITATOR_BASE 與 IMITATOR_TOKEN');
if (visibility !== 'public' && visibility !== 'group') {
  fail('請明確指定 --visibility=public 或 --visibility=group');
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** 檔名 → slug。[a-z0-9-]{1,64}，spec §2。 */
export function toSlug(filename) {
  return path
    .basename(filename, '.html')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
    .replace(/-$/, '');
}

/**
 * Node 的 fetch 不收非 ASCII 的 header 值（ByteString），所以先把 UTF-8
 * 位元組攤成 latin-1 字元 — 這正是 curl 送出去的位元組，Worker 那邊會還原。
 */
function toHeaderValue(s) {
  return String.fromCharCode(...new TextEncoder().encode(s));
}

function titleOf(html, fallback) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const raw = m ? m[1].replace(/\s+/g, ' ').trim() : '';
  return raw || fallback;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * report_list.json 的 `2025/06/06 17:28:45` → ISO 8601。
 * 來源是 git committer date（%cI），GitHub 網頁介面的 commit 是 UTC。
 */
function toIso(stamp) {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(stamp).trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, sec] = m;
  const t = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${sec}Z`);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

async function loadTimestamps() {
  if (!timestampsFile) return null;
  let raw;
  try {
    raw = JSON.parse(await readFile(timestampsFile, 'utf-8'));
  } catch (err) {
    fail(`讀不到 ${timestampsFile}（用 --timestamps=none 可以跳過）：${err.message}`);
  }
  const map = new Map();
  for (const entry of raw) {
    const iso = toIso(entry?.timestamp);
    if (entry?.name && iso) map.set(entry.name, iso);
  }
  return map;
}

/** 站上已經有哪些 slug — 用來跳過已上傳的，以及跑完之後對總數。 */
async function listExisting() {
  const res = await fetch(`${base}/v1/a`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) fail(`列不出既有的 artifact：${res.status} ${(await res.text()).slice(0, 200)}`);
  return new Set((await res.json()).map((r) => r.slug));
}

// artifact 預設會被 Worker 加上 CSP sandbox（opaque origin）。在 opaque origin
// 下會丟 SecurityError 或被拒絕的 API，偵測到就個別關掉 sandbox。
// 寧可誤判成需要例外，也不要讓報告靜靜地壞掉 — 被關掉的會列在結尾。
// （對 report/ 這 272 份實測過：命中 8 份，Chromium 下確實只有那 8 份會壞。）
const NEEDS_ORIGIN = /\b(?:localStorage|sessionStorage|indexedDB|Notification|BroadcastChannel|SharedWorker)\b|document\.(?:cookie|domain)|serviceWorker/;

async function upload(slug, title, body, sandbox, updatedAt) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${base}/v1/a/${slug}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/html',
        'X-Visibility': visibility,
        'X-Title': toHeaderValue(title),
        'X-Sandbox': sandbox,
        ...(updatedAt ? { 'X-Updated-At': updatedAt } : {}),
      },
      body,
    });
    if (res.ok) return res.json();
    // 減速帶與邊緣限速都可能在大量上傳時擋人（spec §8.3），退避重試即可。
    if (res.status === 429 || res.status >= 500) {
      await sleep(2 ** attempt * 1000);
      continue;
    }
    throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error('重試 5 次仍失敗');
}

const files = (await readdir(dir)).filter((f) => f.endsWith('.html')).sort();
if (files.length === 0) fail(`${dir}/ 裡沒有 .html`);

const stamps = await loadTimestamps();
const seen = new Map();
const plan = [];
const missing = [];
for (const file of files) {
  const slug = toSlug(file);
  if (!slug) fail(`${file} 推導不出合法的 slug`);
  if (seen.has(slug)) fail(`slug 衝突：${file} 與 ${seen.get(slug)} 都對應到 "${slug}"`);
  seen.set(slug, file);
  const updatedAt = stamps?.get(file) ?? null;
  if (stamps && !updatedAt) missing.push(file);
  plan.push({ file, slug, updatedAt });
}
// 這裡曾經是硬性中止 —— 一次性遷移的時候「每個檔都要有時間戳」是對的不變式。
// 但 archive/report/ 現在是活的目錄（inbox 的 Action 會往裡面加檔案），而
// report_list.json 是 v1 的凍結快照，不會再長出新的項目。所以改成警告：
// 沒有時間戳的就不送 X-Updated-At，updatedAt 會變成上傳當下。
if (missing.length) {
  console.log(
    `注意：${missing.length} 個檔在 ${timestampsFile} 裡沒有時間戳，` +
      `updatedAt 會用上傳當下的時間 → ${missing.join(', ')}`,
  );
}

console.log(`${plan.length} 個檔案 → ${base}（visibility: ${visibility}）`);
if (dryRun) {
  for (const { file, slug, updatedAt } of plan) {
    console.log(`  ${file} → /r/${slug}${updatedAt ? `  (${updatedAt})` : ''}`);
  }
  process.exit(0);
}

const existing = force ? new Set() : await listExisting();
const todo = plan.filter((p) => !existing.has(p.slug));
if (existing.size) {
  console.log(`站上已有 ${existing.size} 個，這次要推 ${todo.length} 個（--force 可強制重推）`);
}

let done = 0;
let failed = 0;
const noSandbox = [];
for (const { file, slug, updatedAt } of todo) {
  const html = await readFile(path.join(dir, file), 'utf-8');
  const sandbox = NEEDS_ORIGIN.test(html) ? 'off' : 'on';
  try {
    await upload(slug, titleOf(html, slug), html, sandbox, updatedAt);
    done += 1;
    if (sandbox === 'off') noSandbox.push(slug);
    console.log(`  ✓ ${file} → /r/${slug}${sandbox === 'off' ? '  (sandbox off)' : ''}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${file}: ${err.message}`);
  }
  await sleep(60); // 別把自己的減速帶踩爆
}

const total = (await listExisting()).size;
console.log(`\n完成 ${done}／${todo.length}${failed ? `，失敗 ${failed}` : ''}；站上現在共 ${total} 個 artifact`);
if (noSandbox.length) {
  console.log(`sandbox 關掉的 ${noSandbox.length} 份（opaque origin 下會壞）：${noSandbox.join(', ')}`);
}
process.exit(failed ? 1 : 0);
