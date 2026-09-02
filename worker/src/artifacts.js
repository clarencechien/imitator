// artifact 的讀寫與 KV 索引（spec §4.2、§4.3、§6.3、§6.4）。
//
// dumb host：收什麼 HTML 就吐什麼 HTML，不 render、不轉檔、不套 template。

import { SECURITY_HEADERS, apiError, json, notFound } from './http.js';

export const SLUG_RE = /^[a-z0-9-]{1,64}$/;
export const MAX_BYTES = 25 * 1024 * 1024; // spec §6.4
const IDX_PREFIX = 'idx:';
const TITLE_MAX = 200;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/**
 * artifact 是任意 HTML 且會執行 JS，而它跟 portal 同一個 origin（spec §8.5）。
 * 沒有這一行的話，artifact 裡的 JS 可以 fetch('/') 或 fetch('/r/{slug}') —
 * cookie 是 HttpOnly 沒錯，但 HttpOnly 只擋 document.cookie，不擋瀏覽器自動
 * 附帶，所以它讀得到整個 group 的內容再送出去。
 *
 * sandbox 會把 artifact 丟進 opaque origin：同樣那些 fetch 變成跨源、
 * Origin: null，而我們不送 CORS header，所以讀不到 response body。
 *
 * 刻意不給 allow-same-origin（那等於沒 sandbox），也不給
 * allow-popups-to-escape-sandbox（popup 會拿回正常 origin，洞就回來了）。
 */
const SANDBOX_CSP = 'sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads';

const objectKey = (slug) => `artifacts/${slug}.html`;
const indexKey = (slug) => `${IDX_PREFIX}${slug}`;

/** 有效的 visibility 值：'public' 或 'group:{gid}'。 */
export function canRead(visibility, sessionGid) {
  if (visibility === 'public') return true;
  return typeof sessionGid === 'string' && visibility === `group:${sessionGid}`;
}

function canWrite(visibility, gid) {
  return visibility === 'public' || visibility === `group:${gid}`;
}

/**
 * HTTP header 的位元組會被當成 latin-1 解碼，而 curl 送的是原始 UTF-8。
 * 全部字元都 <= 0xFF 時試著還原成 UTF-8；還原不了就維持原樣。
 */
export function decodeHeaderValue(value) {
  if (typeof value !== 'string' || value === '') return '';
  if ([...value].some((c) => c.codePointAt(0) > 0xff)) return value;
  const bytes = Uint8Array.from(value, (c) => c.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

function cleanTitle(raw) {
  return decodeHeaderValue(raw ?? '')
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, TITLE_MAX);
}

/**
 * Cache API 的 key。用網址重新組一個乾淨的 Request，不重用進來的那一個 —
 * 進來的請求帶著 Cookie 與 body stream，不該被拿去當快取鍵。
 */
function cacheKey(origin, slug) {
  return new Request(`${origin}/r/${slug}`, { method: 'GET' });
}

/**
 * public 的內容會進 Cache API（spec §6.3），覆寫與刪除時要把它踢掉。
 *
 * 這裡 await 而不用 waitUntil：PUT 回 200 之後緊接著的 GET 不該還看到舊內容。
 * Cache API 是同 colo 的本地操作，代價可以忽略。（跨 colo 的舊內容仍會活到
 * max-age 到期為止 — 300 秒，這是 spec 接受的取捨。）
 */
function purge(request, slug) {
  return caches.default.delete(cacheKey(new URL(request.url).origin, slug));
}

/**
 * GET /r/{slug}
 *
 * 授權判斷在 R2 get() 之前（spec §8.1）：先用 KV 索引拿 visibility，
 * 沒有索引才退回 R2 head()。拿到物件後再用 customMetadata 覆核一次 —
 * KV 是最終一致的，改過 visibility 的物件可能有最多一分鐘的舊值。
 */
export async function serveArtifact(request, env, slug, sessionGid) {
  const cache = caches.default;
  const key = cacheKey(new URL(request.url).origin, slug);
  // 只有 public 的回應會被放進快取，所以命中就代表這是 public 內容。
  const hit = await cache.match(key);
  if (hit) return hit;

  const idx = await env.KV_INDEX.get(indexKey(slug), 'json').catch(() => null);
  let visibility = idx?.visibility;
  if (!visibility) {
    const head = await env.R2_BUCKET.head(objectKey(slug));
    visibility = head?.customMetadata?.visibility;
  }
  if (!visibility || !canRead(visibility, sessionGid)) return notFound();

  const obj = await env.R2_BUCKET.get(objectKey(slug));
  if (!obj) return notFound();

  const actual = obj.customMetadata?.visibility ?? visibility;
  if (!canRead(actual, sessionGid)) return notFound();

  const isPublic = actual === 'public';
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    ...SECURITY_HEADERS,
    'Cache-Control': isPublic ? 'public, max-age=300' : 'private, no-store',
  };
  if (!isPublic) headers.Vary = 'Cookie';
  // 用到 localStorage 之類的報告可以在 PUT 時用 X-Sandbox: off 個別關掉。
  if (obj.customMetadata?.sandbox !== 'off') headers['Content-Security-Policy'] = SANDBOX_CSP;

  if (isPublic) {
    const body = await obj.arrayBuffer();
    const response = new Response(body, { headers });
    await cache.put(key, response.clone());
    return response;
  }
  return new Response(obj.body, { headers });
}

/** PUT /v1/a/{slug} */
export async function putArtifact(request, env, slug, gid) {
  const rawVisibility = (request.headers.get('X-Visibility') ?? 'group').trim().toLowerCase();
  if (rawVisibility !== 'public' && rawVisibility !== 'group') {
    return apiError(400, 'X-Visibility must be "public" or "group"');
  }
  const visibility = rawVisibility === 'public' ? 'public' : `group:${gid}`;

  const rawSandbox = request.headers.get('X-Sandbox');
  if (rawSandbox !== null && !['on', 'off'].includes(rawSandbox.trim().toLowerCase())) {
    return apiError(400, 'X-Sandbox must be "on" or "off"');
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return apiError(413, 'body exceeds 25 MB');
  if (body.byteLength === 0) return apiError(400, 'empty body');

  const now = new Date().toISOString();
  const existing = await env.R2_BUCKET.head(objectKey(slug));
  // 只有自己組別（或 public）的 artifact 能被覆寫，避免別組拿 slug 佔位。
  if (existing && !canWrite(existing.customMetadata?.visibility, gid)) {
    return apiError(403, 'slug belongs to another group');
  }

  const title =
    cleanTitle(request.headers.get('X-Title')) || existing?.customMetadata?.title || slug;
  const createdAt = existing?.customMetadata?.createdAt ?? now;
  // 沒帶 header 就沿用舊值（跟 X-Title 一樣）。重推一份報告不該悄悄把它先前
  // 明確設定的例外關掉 — 那會讓頁面壞掉而沒有人知道為什麼。
  const sandbox =
    rawSandbox === null
      ? (existing?.customMetadata?.sandbox === 'off' ? 'off' : 'on')
      : rawSandbox.trim().toLowerCase();

  await env.R2_BUCKET.put(objectKey(slug), body, {
    httpMetadata: { contentType: 'text/html; charset=utf-8' },
    customMetadata: { visibility, title, createdAt, updatedAt: now, sandbox },
  });

  const entry = { visibility, title, updatedAt: now };
  // 同時寫進 value 與 metadata：portal 列表只需要一次 list()，不必逐筆 get()。
  await env.KV_INDEX.put(indexKey(slug), JSON.stringify(entry), { metadata: entry });
  await purge(request, slug);

  const url = new URL(request.url);
  return json({ slug, url: `${url.origin}/r/${slug}`, visibility, sandbox, updatedAt: now });
}

/** DELETE /v1/a/{slug} */
export async function deleteArtifact(request, env, slug, gid) {
  const existing = await env.R2_BUCKET.head(objectKey(slug));
  if (!existing) {
    await env.KV_INDEX.delete(indexKey(slug));
    return notFound();
  }
  if (!canWrite(existing.customMetadata?.visibility, gid)) return notFound();

  await env.R2_BUCKET.delete(objectKey(slug));
  await env.KV_INDEX.delete(indexKey(slug));
  await purge(request, slug);
  return json({ slug, deleted: true });
}

/**
 * 列出 public ＋ 指定 group 的 artifact。
 * KV list 一次回 1000 筆並附帶 metadata，spec §4.3 的 500 筆門檻內只要一次呼叫。
 */
export async function listArtifacts(env, gid) {
  const out = [];
  let cursor;
  do {
    const res = await env.KV_INDEX.list({ prefix: IDX_PREFIX, cursor });
    for (const key of res.keys) {
      const meta = key.metadata;
      const slug = key.name.slice(IDX_PREFIX.length);
      if (!meta?.visibility || !canRead(meta.visibility, gid)) continue;
      out.push({
        slug,
        title: meta.title || slug,
        visibility: meta.visibility,
        updatedAt: meta.updatedAt ?? null,
      });
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);

  out.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  return out;
}
