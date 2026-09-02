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

/**
 * 誰可以覆寫或刪除一份既有的 artifact。
 *
 * 判準是 owner，不是 visibility。`public` 這個 visibility 不帶任何身分 ——
 * 拿它當授權依據等於「public artifact 無主」，任何 group 的 token 都能覆寫或
 * 刪掉別組發佈的東西，而 R2 沒有 object versioning，覆寫就是永久消失。
 * 現實中最可能觸發的不是惡意內鬼，是兩個自動發佈者撞到同一個 slug。
 *
 * 曾經有一個相容分支，讓 owner 欄位出現之前的物件沿用舊判準。既有的 273 份
 * 都補完 owner 之後（`GET /v1/a` 的 owner 欄位可以查證）就拿掉了 —— 那個分支
 * 對「無主的 public」是**對所有 group 放行**的，留著等於讓新加的 group 可以
 * 永久佔走任何一個沒補到的 slug。
 *
 * 現在沒有 owner 的物件是誰都寫不動、刪不掉的（包含它原本的作者）。那是刻意
 * 選的失敗方向 —— 鎖死可以從 R2 dashboard 手動處理，被佔走不行。
 *
 * @param {Record<string,string>|undefined} meta 既有物件的 customMetadata
 */
function canWrite(meta, gid) {
  if (!meta) return true; // 全新的 slug
  return meta.owner === gid;
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

  // 遷移舊內容時用得到：讓持有 token 的人指定真實時間，而不是上傳當下的時間。
  // portal 依 updatedAt 排序，全部塞成同一天等於順序完全沒有意義。
  const rawUpdatedAt = request.headers.get('X-Updated-At');
  let stamp = null;
  if (rawUpdatedAt !== null) {
    const parsed = Date.parse(rawUpdatedAt.trim());
    // 擋未來的日期：寫錯一次就會有一份報告永遠釘在列表最上面。
    if (!Number.isFinite(parsed) || parsed > Date.now() + 86_400_000) {
      return apiError(400, 'X-Updated-At must be a valid date and not in the future');
    }
    stamp = new Date(parsed).toISOString();
  }

  const rawSandbox = request.headers.get('X-Sandbox');
  if (rawSandbox !== null && !['on', 'off'].includes(rawSandbox.trim().toLowerCase())) {
    return apiError(400, 'X-Sandbox must be "on" or "off"');
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return apiError(413, 'body exceeds 25 MB');
  if (body.byteLength === 0) return apiError(400, 'empty body');

  // stamp 有值時它就是這份 artifact 的時間，否則用當下。
  const timestamp = stamp ?? new Date().toISOString();
  const existing = await env.R2_BUCKET.head(objectKey(slug));
  if (!canWrite(existing?.customMetadata, gid)) {
    return apiError(403, 'slug belongs to another group');
  }

  const title =
    cleanTitle(request.headers.get('X-Title')) || existing?.customMetadata?.title || slug;
  let createdAt = existing?.customMetadata?.createdAt ?? timestamp;
  // 明確指定的時間比既有的 createdAt 還早，代表這份東西實際上更老（遷移就是
  // 這種情況）。取早的那個，不要留下 updatedAt 早於 createdAt 的紀錄。
  if (stamp && createdAt > timestamp) createdAt = timestamp;
  // 沒帶 header 就沿用舊值（跟 X-Title 一樣）。重推一份報告不該悄悄把它先前
  // 明確設定的例外關掉 — 那會讓頁面壞掉而沒有人知道為什麼。
  const sandbox =
    rawSandbox === null
      ? (existing?.customMetadata?.sandbox === 'off' ? 'off' : 'on')
      : rawSandbox.trim().toLowerCase();
  // 擁有權一旦確立就不會轉手 —— 正常的更新不該把它改掉。
  const owner = existing?.customMetadata?.owner ?? gid;

  await env.R2_BUCKET.put(objectKey(slug), body, {
    httpMetadata: { contentType: 'text/html; charset=utf-8' },
    customMetadata: { visibility, owner, title, createdAt, updatedAt: timestamp, sandbox },
  });

  const entry = { visibility, owner, title, updatedAt: timestamp };
  // 同時寫進 value 與 metadata：portal 列表只需要一次 list()，不必逐筆 get()。
  await env.KV_INDEX.put(indexKey(slug), JSON.stringify(entry), { metadata: entry });
  await purge(request, slug);

  const url = new URL(request.url);
  // owner 一併回傳：否則擁有權只存在於 R2 的 metadata 裡，從外面完全觀測不到，
  // 出問題時無從查起。這不算洩漏 —— 能收到這個回應的人剛剛才寫入成功。
  return json({
    slug,
    url: `${url.origin}/r/${slug}`,
    visibility,
    owner,
    sandbox,
    updatedAt: timestamp,
  });
}

/** DELETE /v1/a/{slug} */
export async function deleteArtifact(request, env, slug, gid) {
  const existing = await env.R2_BUCKET.head(objectKey(slug));
  if (!existing) {
    // 物件不在，順手清掉殘留的索引 —— 但這是這裡唯一一個不需要授權就能碰到
    // 別人 slug 的寫入動作。跟 putArtifact 的 R2 put 與 KV put 之間那一小段
    // 空隙賽跑，就能把剛建好的東西從 portal 與列表裡抹掉。清完再看一次，
    // 東西回來了就把索引補回去。
    await env.KV_INDEX.delete(indexKey(slug));
    const reappeared = await env.R2_BUCKET.head(objectKey(slug));
    if (reappeared) {
      const m = reappeared.customMetadata ?? {};
      const entry = {
        visibility: m.visibility,
        owner: m.owner,
        title: m.title,
        updatedAt: m.updatedAt,
      };
      await env.KV_INDEX.put(indexKey(slug), JSON.stringify(entry), { metadata: entry });
    }
    return notFound();
  }
  if (!canWrite(existing.customMetadata, gid)) return notFound();

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
        // owner 沒有就是還沒被 backfill 到 —— 這是唯一唯讀查得到的地方。
        owner: meta.owner ?? null,
        updatedAt: meta.updatedAt ?? null,
      });
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);

  out.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  return out;
}
