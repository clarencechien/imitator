// imitator v2 — 單檔 HTML 的 dumb host。
//
// 這支 Worker 的路由順序就是 spec §8.3 的早退順序：沒有請求能在通過一個
// 「攻擊者要付出成本才滿足」的檢查之前碰到 R2。
//
//   1. path 認不認得        純字串比對，不碰任何 binding
//   2. method 是否允許      同上
//   3. Content-Length       在讀 body 之前就 413
//   4. cookie / bearer 格式 純運算，零 I/O
//   5. groups.json          isolate 快取命中則零 I/O
//   6. KV idx               僅 portal 與讀取需要
//   7. R2 get()             最後

import {
  MAX_BYTES,
  SLUG_RE,
  deleteArtifact,
  listArtifacts,
  putArtifact,
  serveArtifact,
} from './artifacts.js';
import { loadConfig } from './config.js';
import { apiError, html, invalidLink, json, notFound, page } from './http.js';
import { renderPortal } from './portal.js';
import {
  clearCookieHeader,
  cookieHeader,
  issueCookie,
  parseBearer,
  readCookie,
  verifyReadSecret,
  verifySession,
  verifyWriteToken,
} from './session.js';

const GID_RE = /^[a-z0-9-]{1,64}$/;
const SECRET_RE = /^[A-Za-z0-9_-]{16,512}$/;
const CTRL_RE = /[\u0000-\u001F\u007F]/;

// ── isolate 內的減速帶（spec §8.3）───────────────────────────────────────────
// per-colo、per-isolate、會被回收，統計上不可靠。擋笨迴圈夠用，成本為零。
// 真正的洪水上限是 Cloudflare 的全站限速規則，見 worker/README.md。
const BUMP_WINDOW_MS = 10_000;
const BUMP_LIMIT = 200;
const BUMP_MAX_ENTRIES = 1000;
const bumps = new Map();

function speedBump(ip) {
  if (!ip) return false;
  const now = Date.now();
  const seen = bumps.get(ip);
  if (!seen || now - seen.ts > BUMP_WINDOW_MS) {
    if (bumps.size >= BUMP_MAX_ENTRIES) bumps.clear();
    bumps.set(ip, { count: 1, ts: now });
    return false;
  }
  seen.count += 1;
  return seen.count > BUMP_LIMIT;
}

/** 只接受站內的相對路徑，擋掉 open redirect。 */
function safeNext(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (CTRL_RE.test(raw)) return '/';
  return raw;
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (err) {
      // 絕不把 config 或憑證印進 log（spec §8.2）。只留訊息，不留內容。
      console.error('unhandled error:', err?.message ?? 'unknown error');
      return apiError(500, 'internal error');
    }
  },
};

async function route(request, env) {
  if (speedBump(request.headers.get('CF-Connecting-IP'))) {
    return new Response('slow down', { status: 429, headers: { 'Retry-After': '10' } });
  }

  const url = new URL(request.url);
  const method = request.method;
  const segments = url.pathname.split('/').filter(Boolean);

  // ── 1+2. path / method ─────────────────────────────────────────────────────
  if (segments.length === 0) {
    if (method !== 'GET' && method !== 'HEAD') return methodNotAllowed('GET');
    return handlePortal(request, env, url);
  }

  if (segments.length === 1 && segments[0] === 'favicon.ico') {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  if (segments[0] === 'join') {
    if (method !== 'GET' && method !== 'HEAD') return methodNotAllowed('GET');
    if (segments.length !== 3) return notFound();
    const [, gid, secret] = segments;
    if (!GID_RE.test(gid) || !SECRET_RE.test(secret)) return invalidLink();
    return handleJoin(env, url, gid, secret);
  }

  if (segments[0] === 'r') {
    if (method !== 'GET' && method !== 'HEAD') return methodNotAllowed('GET');
    if (segments.length !== 2 || !SLUG_RE.test(segments[1])) return notFound();
    return handleRead(request, env, url, segments[1]);
  }

  if (segments[0] === 'v1' && segments[1] === 'a') {
    return handleApi(request, env, url, segments);
  }

  return notFound();
}

function methodNotAllowed(allow) {
  return new Response(null, { status: 405, headers: { Allow: allow } });
}

/** 讀 cookie 並驗證。回傳通過驗證的 gid，以及要不要順手清掉壞掉的 cookie。 */
async function resolveSession(request, env, url) {
  const cookie = readCookie(request.headers.get('Cookie')); // 純運算，零 I/O
  if (!cookie) return { gid: null, stale: false, config: null };
  const config = await loadConfig(env, url.origin);
  const gid = await verifySession(env, config, cookie);
  return { gid, stale: gid === null, config };
}

async function handlePortal(request, env, url) {
  const session = await resolveSession(request, env, url);
  // 沒有 cookie 的請求也要載入 config：打開網站就是哨兵值輪替的觸發點（spec §7.1）。
  const config = session.config ?? (await loadConfig(env, url.origin));
  const groupName = session.gid ? config.groups?.[session.gid]?.name : null;
  return renderPortal(
    env,
    session.gid,
    groupName,
    session.stale ? { 'Set-Cookie': clearCookieHeader() } : {},
  );
}

/** GET /join/{gid}/{secret}?next=/r/{slug} — 換 cookie（spec §6.1）。 */
async function handleJoin(env, url, gid, secret) {
  if (!env.SESSION_SECRET) {
    console.error('SESSION_SECRET is not set; cannot issue cookies');
    return html(page('尚未設定完成', '<p>這個站台還沒設定完成，請聯絡管理者。</p>'), {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const config = await loadConfig(env, url.origin);
  const ok = await verifyReadSecret(config, gid, secret);
  // 失敗一律回同一個泛用畫面，不區分原因（spec §6.1）。
  if (!ok) return invalidLink();

  const cookie = await issueCookie(env, ok.gid, ok.epoch);
  return new Response(null, {
    status: 302,
    headers: {
      Location: safeNext(url.searchParams.get('next')),
      'Set-Cookie': cookieHeader(cookie),
      // secret 在網址裡，不能讓它經由 Referer 流到下一頁（spec §6.1）。
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'private, no-store',
    },
  });
}

/** GET /r/{slug} */
async function handleRead(request, env, url, slug) {
  // 沒帶 cookie 的請求不需要 config：省掉冷 isolate 上的一次 R2 讀取。
  const cookie = readCookie(request.headers.get('Cookie'));
  let gid = null;
  if (cookie) {
    const config = await loadConfig(env, url.origin);
    gid = await verifySession(env, config, cookie);
  }
  return serveArtifact(request, env, slug, gid);
}

/** /v1/a — 寫入 API（spec §6.4）。憑證是 write token，與 cookie 無關。 */
async function handleApi(request, env, url, segments) {
  const method = request.method;
  const isCollection = segments.length === 2;

  if (isCollection && method !== 'GET') return methodNotAllowed('GET');
  if (!isCollection && segments.length !== 3) return notFound();
  if (!isCollection && method !== 'PUT' && method !== 'DELETE') {
    return methodNotAllowed('PUT, DELETE');
  }

  // 3. Content-Length：在讀 body 之前就擋掉（spec §8.3）。
  if (method === 'PUT') {
    const declared = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      return apiError(413, 'body exceeds 25 MB');
    }
  }

  // 4. bearer 格式：純運算，格式不對就不用碰 R2。
  const parsed = parseBearer(request.headers.get('Authorization'));
  if (!parsed) return apiError(401, 'missing or malformed bearer token');

  // 5. groups.json
  const config = await loadConfig(env, url.origin);
  const gid = await verifyWriteToken(config, parsed);
  if (!gid) return apiError(401, 'invalid token');

  if (isCollection) return json(await listArtifacts(env, gid));

  const slug = segments[2];
  if (!SLUG_RE.test(slug)) return apiError(400, 'slug must match [a-z0-9-]{1,64}');

  return method === 'PUT'
    ? putArtifact(request, env, slug, gid)
    : deleteArtifact(request, env, slug, gid);
}
