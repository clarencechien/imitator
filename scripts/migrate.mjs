#!/usr/bin/env node
// 把現行 report/*.html 一次推到 imitator v2（spec §9 步驟 1）。
//
//   IMITATOR_BASE=https://r.example.com \
//   IMITATOR_TOKEN=imi_rd_3_xxx \
//   node scripts/migrate.mjs --visibility=public [--dry-run] [--dir report]
//
// slug 由檔名推導，衝突會在開始上傳前就報錯。updatedAt 會是上傳當下的時間，
// 舊的 report_list.json 時間戳不會被保留 — 需要的話那份 JSON 還在 git 歷史裡。

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
const dir = typeof args.get('dir') === 'string' ? args.get('dir') : 'report';
const dryRun = args.has('dry-run');

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

function titleOf(html, fallback) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const raw = m ? m[1].replace(/\s+/g, ' ').trim() : '';
  return raw || fallback;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upload(slug, title, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${base}/v1/a/${slug}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/html',
        'X-Visibility': visibility,
        'X-Title': title,
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

const seen = new Map();
const plan = [];
for (const file of files) {
  const slug = toSlug(file);
  if (!slug) fail(`${file} 推導不出合法的 slug`);
  if (seen.has(slug)) fail(`slug 衝突：${file} 與 ${seen.get(slug)} 都對應到 "${slug}"`);
  seen.set(slug, file);
  plan.push({ file, slug });
}

console.log(`${plan.length} 個檔案 → ${base}（visibility: ${visibility}）`);
if (dryRun) {
  for (const { file, slug } of plan) console.log(`  ${file} → /r/${slug}`);
  process.exit(0);
}

let done = 0;
let failed = 0;
for (const { file, slug } of plan) {
  const html = await readFile(path.join(dir, file), 'utf-8');
  try {
    await upload(slug, titleOf(html, slug), html);
    done += 1;
    console.log(`  ✓ ${file} → /r/${slug}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${file}: ${err.message}`);
  }
  await sleep(60); // 別把自己的減速帶踩爆
}

console.log(`\n完成 ${done}／${plan.length}${failed ? `，失敗 ${failed}` : ''}`);
process.exit(failed ? 1 : 0);
