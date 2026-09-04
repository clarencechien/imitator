// 共用的回應建構器與 header 常數。

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  // artifact 也會帶到這一條。那是有意的:一份報告不該能被別人的頁面嵌起來
  // 當背景 —— sandbox CSP 擋的是它讀別人,XFO 擋的是別人拿它當畫面。
  'X-Frame-Options': 'DENY',
  // zone 上也有一份,但 dashboard 的設定在 repo 裡看不到、改掉沒有人會發現。
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Worker 自己組的 HTML 頁面(portal、404、連結無效、尚未設定)的 CSP。
 *
 * 這些頁面沒有任何外部資源,樣式全是行內 `<style>`,所以 `default-src 'none'`
 * 加 `style-src 'unsafe-inline'` 就夠。**這條不會套到 artifact** ——
 * artifact 的 CSP 是 artifacts.js 自己決定的 sandbox 指令,或者(X-Sandbox: off
 * 的那幾份)刻意不送。把兩者混在一起會把 off 的頁面一起鎖死。
 *
 * portal 有一段行內 `<script>`,所以它另外帶一個 nonce —— 見 pageCsp()。
 */
export const PAGE_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; " +
  "frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

/** 產生一個 CSP nonce,以及帶著它的 PAGE_CSP。 */
export function pageCspWithNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes)).replace(/=+$/, '');
  return { nonce, csp: `${PAGE_CSP}; script-src 'nonce-${nonce}'` };
}

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
    headers: { 'Cache-Control': 'private, no-store', 'Content-Security-Policy': PAGE_CSP },
  });
}

/** 連結／token 失敗一律回這個，不區分原因（spec §6.1）。 */
export function invalidLink() {
  return html(
    page('連結無效', '<p>連結無效或已過期，請向發送者索取新連結。</p>'),
    {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store', 'Content-Security-Policy': PAGE_CSP },
    },
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
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  ${bodyHtml}
</main>
</body>
</html>`;
}
