// 共用的回應建構器與 header 常數。

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** @param {string} body @param {ResponseInit & {headers?: Record<string,string>}} [init] */
export function html(body, init = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...SECURITY_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

/** @param {unknown} data @param {ResponseInit & {headers?: Record<string,string>}} [init] */
export function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      ...SECURITY_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

/**
 * 泛用 404。
 *
 * group 內容拿不到權限時也走這裡（spec §6.3）：不對外洩漏「這個 slug 存在
 * 但你沒權限」。掃描器打 /wp-admin 拿到的也是同一個畫面。
 */
export function notFound() {
  return html(page('找不到頁面', '<p>這個網址沒有東西，或者你沒有權限看它。</p>'), {
    status: 404,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

/** 連結／token 失敗一律回這個，不區分原因（spec §6.1）。 */
export function invalidLink() {
  return html(
    page('連結無效', '<p>連結無效或已過期，請向發送者索取新連結。</p>'),
    { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/** @param {number} status @param {string} message */
export function apiError(status, message) {
  return json({ error: message }, { status });
}

export function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

/** 最小的頁面外殼，給 404 / 錯誤 / portal 共用。 */
export function page(title, bodyHtml) {
  return `<!doctype html>
<html lang="zh-Hant">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; --bg:#fbfbfa; --fg:#1a1a19; --muted:#6b6b68; --line:#e4e4e1; --card:#fff; --accent:#b0552b; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#191917; --fg:#eeeeec; --muted:#9a9a95; --line:#333331; --card:#222220; --accent:#e08a5c; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Noto Sans TC",sans-serif; }
  main { max-width: 52rem; margin: 0 auto; padding: 3rem 1.25rem 5rem; }
  h1 { font-size: 1.35rem; margin: 0 0 .35rem; letter-spacing: -.01em; }
  a { color: var(--accent); }
  p { color: var(--muted); }
</style>
<main>
  <h1>${escapeHtml(title)}</h1>
  ${bodyHtml}
</main>
</html>`;
}
