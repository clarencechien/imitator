#!/usr/bin/env node
// 把 /v1/a 裡的樣式指紋列出來 —— 每一份報告選了什麼語域、參照物、紙色、重點色。
//
//   IMITATOR_TOKEN=imi_... node scripts/style-census.mjs            # 全部
//   IMITATOR_TOKEN=imi_... node scripts/style-census.mjs --recent 3 # 最近 3 份的色相，貼進 RECENT: 用
//
//   IMITATOR_TOKEN=imi_... node scripts/style-census.mjs --audit          # 哪一條最常被漏掉
//
// 這是 style/STYLE.md 「RECENT」那一步的工具、稽核結果的統計，也是日後整理個人
// 偏好的材料。
// 只用 Node 內建模組。

const base = (process.env.IMITATOR_BASE ?? 'https://imitator.ai-apps.work').replace(/\/$/, '');
const token = process.env.IMITATOR_TOKEN ?? '';
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`用法: IMITATOR_TOKEN=imi_... node scripts/style-census.mjs [--recent N] [--json]

列出站上每一份報告的樣式指紋（版本、紙色、重點色、語域、參照物）。
  --recent N   只看最近 N 份有指紋的（預設 3），輸出成可以貼進 RECENT: 的一行
  --audit      統計稽核結果：哪一條最常被漏掉、各版本各幾份
  --json       原始 JSON`);
  process.exit(0);
}
if (!token) { console.error('✗ IMITATOR_TOKEN 沒設'); process.exit(1); }

const hue = (c) => {
  if (!c) return null;
  const m = /hsl\(\s*([\d.]+)/i.exec(c);
  if (m) return Math.round(+m[1]);
  const h = /^#([0-9a-f]{6})$/i.exec(c);
  if (!h) return null;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h[1].slice(i - 1, i + 1), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((hh * 60) + 360) % 360);
};

const res = await fetch(`${base}/v1/a`, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) { console.error(`✗ ${res.status} ${(await res.text()).slice(0, 200)}`); process.exit(1); }
const rows = await res.json();
const withFp = rows.filter((r) => r.style);

if (args.includes('--json')) { console.log(JSON.stringify(withFp, null, 1)); process.exit(0); }

const n = args.indexOf('--recent');
if (n !== -1) {
  const k = Number(args[n + 1]) || 3;
  const recent = withFp.slice(0, k);
  const papers = recent.map((r) => hue(r.style.paper)).filter((x) => x !== null);
  const accents = recent.map((r) => hue(r.style.accent)).filter((x) => x !== null);
  console.log(`RECENT: paper ${papers.map((h) => h + '°').join(' ') || '—'} · accent ${accents.map((h) => h + '°').join(' ') || '—'}`);
  for (const r of recent) console.log(`  ${(r.updatedAt ?? '').slice(0, 10)}  ${r.slug.padEnd(28)} ${r.style.register ?? ''}`);
  process.exit(0);
}

if (args.includes('--audit')) {
  const tally = new Map();
  for (const r of withFp) for (const c of r.style.checks ?? []) tally.set(c, (tally.get(c) ?? 0) + 1);
  const clean = withFp.filter((r) => !(r.style.checks ?? []).length).length;
  console.log(`${rows.length} 份，${withFp.length} 份有指紋，其中 ${clean} 份完全乾淨\n`);
  if (!tally.size) console.log('  沒有任何一條被觸發。');
  for (const [code, n] of [...tally].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)} 份  ${code}`);
    for (const r of withFp.filter((x) => (x.style.checks ?? []).includes(code)).slice(0, 5)) {
      console.log(`         ${r.slug}`);
    }
  }
  const byVersion = new Map();
  for (const r of withFp) byVersion.set(r.style.v, (byVersion.get(r.style.v) ?? 0) + 1);
  console.log('\n  版本分布:', [...byVersion].map(([v, n]) => `${v}×${n}`).join(' ') || '—');
  process.exit(0);
}

console.log(`${rows.length} 份，其中 ${withFp.length} 份有指紋\n`);
const P = (s, w) => String(s ?? '—').padEnd(w);
console.log(P('日期', 11), P('slug', 28), P('版', 4), P('紙', 18), P('重點', 18), '語域 · 參照物');
for (const r of withFp) {
  console.log(P((r.updatedAt ?? '').slice(0, 10), 11), P(r.slug, 28), P(r.style.v, 4), P(r.style.paper, 18), P(r.style.accent, 18), `${r.style.register ?? ''} · ${r.style.reference ?? ''}`);
}
