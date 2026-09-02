// Portal（spec §6.5）。inline 在 Worker 裡，不放 R2 也不用 Static Assets —
// 這樣「打開網站」這個動作本身一定會叫起 Worker，哨兵值輪替才有觸發點（spec §7.1）。

import { escapeHtml, html } from './http.js';
import { listArtifacts } from './artifacts.js';

/**
 * 預設只列最近三個月。
 *
 * 不是純粹的 UI 偏好 —— portal 是整個設計裡第一個會被份數壓垮的東西：每一筆
 * 大約 271 bytes，275 筆是 75 KB，1000 筆就 264 KB，而且全部塞在一個回應裡。
 * 在伺服器端先切掉，比在瀏覽器端隱藏有意義（後者省不到任何位元組）。
 */
const RECENT_DAYS = 90;

/**
 * @param {any} env
 * @param {string|null} gid 通過驗證的 group，沒有則只列 public
 * @param {string|null} groupName group 的顯示名稱，取自 groups.json
 * @param {{all?: boolean, extraHeaders?: Record<string,string>}} [opts]
 */
export async function renderPortal(env, gid, groupName, opts = {}) {
  const { all = false, extraHeaders = {} } = opts;
  const items = await listArtifacts(env, gid);
  const label = gid ? escapeHtml(groupName || gid) : null;

  const cutoff = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
  const recent = items.filter((item) => (item.updatedAt ?? '') >= cutoff);
  // 最近三個月剛好沒有東西時就全部列出來 —— 明明有 275 份卻說「沒有報告」
  // 是最差的那種正確。
  const truncated = !all && recent.length > 0 && recent.length < items.length;
  const shown = truncated ? recent : items;

  const rows = shown
    .map((item) => {
      const isGroup = item.visibility !== 'public';
      const when = item.updatedAt ? item.updatedAt.slice(0, 10) : '';
      return `<li class="row" data-q="${escapeHtml((item.title + ' ' + item.slug).toLowerCase())}">
  <a href="/r/${escapeHtml(item.slug)}">
    <span class="title">${escapeHtml(item.title)}</span>
    <span class="meta">${isGroup ? '<span class="tag">group</span>' : ''}<time>${escapeHtml(when)}</time></span>
  </a>
</li>`;
    })
    .join('\n');

  const empty = items.length === 0 ? '<p class="empty">目前沒有任何報告。</p>' : '';
  const badge = gid
    ? `<span class="who">已加入 ${label}</span>`
    : '<span class="who muted">僅顯示公開報告</span>';

  const scope = truncated
    ? `最近三個月的 ${shown.length} 份 · <a href="/?all=1">顯示全部 ${items.length} 份</a>`
    : all && items.length > 0
      ? `全部 ${items.length} 份 · <a href="/">只看最近三個月</a>`
      : `${items.length} 份報告`;

  const body = `<!doctype html>
<html lang="zh-Hant">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>imitator</title>
<style>
  :root { color-scheme: light dark; --bg:#fbfbfa; --fg:#1a1a19; --muted:#6b6b68; --line:#e6e6e3; --card:#fff; --accent:#b0552b; --tag:#efe7df; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#191917; --fg:#eeeeec; --muted:#9a9a95; --line:#333331; --card:#222220; --accent:#e08a5c; --tag:#3a2f28; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Noto Sans TC",sans-serif; }
  main { max-width: 52rem; margin: 0 auto; padding: 3rem 1.25rem 5rem; }
  header { display:flex; align-items:baseline; gap:.75rem; flex-wrap:wrap; margin-bottom:1.25rem; }
  h1 { font-size:1.35rem; margin:0; letter-spacing:-.01em; }
  .who { font-size:.8rem; color:var(--accent); }
  .who.muted { color:var(--muted); }
  input { width:100%; padding:.6rem .75rem; margin-bottom:1.25rem; border:1px solid var(--line); border-radius:8px; background:var(--card); color:var(--fg); font:inherit; }
  input:focus { outline:2px solid var(--accent); outline-offset:-1px; }
  ul { list-style:none; margin:0; padding:0; border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--card); }
  li + li { border-top:1px solid var(--line); }
  a { color:var(--accent); }
  li a { display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:.7rem .9rem; color:inherit; text-decoration:none; }
  li a:hover { background:color-mix(in srgb, var(--accent) 8%, transparent); }
  .title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .meta { display:flex; align-items:center; gap:.5rem; flex:none; font-size:.78rem; color:var(--muted); font-variant-numeric:tabular-nums; }
  .tag { background:var(--tag); color:var(--muted); padding:.1rem .4rem; border-radius:4px; font-size:.7rem; }
  .empty, footer, #hint { color:var(--muted); font-size:.85rem; }
  footer { margin-top:1.5rem; }
  #hint { margin-top:1rem; }
  .hidden { display:none; }
</style>
<main>
  <header><h1>imitator</h1>${badge}</header>
  ${shown.length > 8 ? '<input id="q" type="search" placeholder="搜尋報告…" autocomplete="off">' : ''}
  ${empty}
  <ul id="list">
${rows}
  </ul>
  <p id="hint" class="hidden">這裡沒有符合的 — <a href="/?all=1">在全部 ${items.length} 份裡找</a></p>
  <footer>${scope}</footer>
</main>
<script>
  const q = document.getElementById('q');
  if (q) {
    const rows = [...document.querySelectorAll('#list .row')];
    const hint = document.getElementById('hint');
    const truncated = ${truncated};
    q.addEventListener('input', () => {
      const term = q.value.trim().toLowerCase();
      let visible = 0;
      for (const row of rows) {
        const hit = !term || row.dataset.q.includes(term);
        row.classList.toggle('hidden', !hit);
        if (hit) visible++;
      }
      // 只列了最近三個月時，搜不到東西多半是因為它比較舊，而不是不存在。
      if (hint) hint.classList.toggle('hidden', !(truncated && term && visible === 0));
    });
  }
</script>
</html>`;

  return html(body, { headers: { 'Cache-Control': 'private, no-store', ...extraHeaders } });
}
