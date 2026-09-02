#!/usr/bin/env node
// 遷移之後逐份驗證：內容是否 byte-for-byte 一致、sandbox 判定是否正確。
//
//   IMITATOR_BASE=https://imitator.ai-apps.work node scripts/verify.mjs [--dir report]
//
// 不需要 token — 驗的是 public 內容，走跟一般讀者一樣的路徑。
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const base = (process.env.IMITATOR_BASE ?? 'https://imitator.ai-apps.work').replace(/\/$/, '');
const NEEDS_ORIGIN = /\b(?:localStorage|sessionStorage|indexedDB|Notification|BroadcastChannel|SharedWorker)\b|document\.(?:cookie|domain)|serviceWorker/;
const toSlug = (f) => path.basename(f, '.html').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dir = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : 'report';
const files = (await readdir(dir)).filter((f) => f.endsWith('.html')).sort();
const bad = [];
let okBytes = 0, okCsp = 0;

for (const file of files) {
  const local = await readFile(path.join(dir, file));
  const slug = toSlug(file);
  const res = await fetch(`${base}/r/${slug}`);
  if (!res.ok) { bad.push(`${slug}: HTTP ${res.status}`); await sleep(40); continue; }
  // Cloudflare 的 Bot Management JS Detections 會在邊緣把一段 script 注入
  // </body> 之前。R2 裡存的沒被動到，比對前先剝掉。
  const remote = Buffer.from(
    Buffer.from(await res.arrayBuffer())
      .toString('utf-8')
      .replace(/<script>\(function\(\)\{[^]*?__CF\$cv\$params[^]*?\}\)\(\);<\/script>/, ''),
    'utf-8',
  );
  if (sha(local) !== sha(remote)) bad.push(`${slug}: 內容不符 (${local.length} vs ${remote.length} bytes)`);
  else okBytes++;

  const csp = res.headers.get('content-security-policy');
  const wantSandbox = !NEEDS_ORIGIN.test(local.toString('utf-8'));
  if (wantSandbox && !csp?.includes('sandbox')) bad.push(`${slug}: 應該要有 sandbox 但沒有`);
  else if (!wantSandbox && csp) bad.push(`${slug}: 應該是例外但被 sandbox 了`);
  else okCsp++;

  if (res.headers.get('x-content-type-options') !== 'nosniff') bad.push(`${slug}: 少了 nosniff`);
  await sleep(40);
}

console.log(`內容一致: ${okBytes}/${files.length}`);
console.log(`sandbox 判定正確: ${okCsp}/${files.length}`);
console.log(bad.length ? `\n問題 ${bad.length} 筆:\n` + bad.slice(0, 20).join('\n') : '\n沒有任何問題');
