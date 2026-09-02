// 三種憑證的驗證（spec §5）。這一層只做純運算，唯一的 I/O 是呼叫端傳進來的 config。

import { b64urlDecodeToString, b64urlEncode, hmacSha256, safeEqual } from './crypto.js';
import { SENTINEL, getGroup, notExpired } from './config.js';

export const COOKIE_NAME = '__Host-imi';

// imi_{gid}_{epoch}_{random}。gid 不含底線、epoch 是數字，所以前三個底線的位置
// 是唯一的 — random 本身是 base64url，裡面可以有底線，不能直接 split('_')。
const TOKEN_RE = /^imi_([a-z0-9-]{1,64})_(\d{1,9})_([A-Za-z0-9_-]{16,512})$/;

/** @param {string|null} header 完整的 Cookie header */
export function readCookie(header) {
  if (typeof header !== 'string' || header.length > 4096) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== COOKIE_NAME) continue;
    const value = part.slice(i + 1).trim();
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ? value : null;
  }
  return null;
}

function cookieDays(env) {
  const n = Number(env.COOKIE_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 90;
}

/**
 * 發 cookie。exp 是絕對效期，不續期（spec §5）。
 * @returns {Promise<{value:string, maxAge:number}>}
 */
export async function issueCookie(env, gid, epoch) {
  const maxAge = Math.floor(cookieDays(env) * 86_400);
  const exp = Date.now() + maxAge * 1000;
  const payload = b64urlEncode(JSON.stringify({ gid, epoch, exp }));
  const sig = b64urlEncode(await hmacSha256(env.SESSION_SECRET, payload));
  return { value: `${payload}.${sig}`, maxAge };
}

/** @param {{value:string, maxAge:number}} cookie */
export function cookieHeader({ value, maxAge }) {
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/** 讓瀏覽器丟掉一個已經沒用的 cookie（epoch 過期或簽章不符時）。 */
export function clearCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * 驗 cookie：簽章 → exp → **epoch 與 groups.json 當前值相符**。
 *
 * 最後那一步每次都要做。少了它，epoch++ 就管不到已經發出去的 cookie，
 * 撤銷機制等於沒有（spec §6.2）。
 *
 * @returns {Promise<string|null>} 通過驗證的 gid
 */
export async function verifySession(env, config, cookieValue, now = Date.now()) {
  if (!cookieValue || !env.SESSION_SECRET) return null;
  const dot = cookieValue.indexOf('.');
  if (dot < 1) return null;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);

  const expected = b64urlEncode(await hmacSha256(env.SESSION_SECRET, payload));
  if (!(await safeEqual(sig, expected))) return null;

  let claims;
  try {
    claims = JSON.parse(b64urlDecodeToString(payload) ?? '');
  } catch {
    return null;
  }
  if (!claims || typeof claims.gid !== 'string' || typeof claims.exp !== 'number') return null;
  if (typeof claims.epoch !== 'number') return null;
  if (!(claims.exp > now)) return null;

  const group = getGroup(config, claims.gid);
  if (!group) return null;
  // epoch 必須是數字。少了這個檢查，漏填 epoch 的 group 會讓 undefined 對上
  // undefined，epoch++ 的撤銷機制就管不到它了。
  if (typeof group.epoch !== 'number' || claims.epoch !== group.epoch) return null;

  return claims.gid;
}

/**
 * 用 magic link 的 readSecret 換 cookie（spec §6.1）。
 * @returns {Promise<{gid:string, epoch:number}|null>}
 */
export async function verifyReadSecret(config, gid, secret, now = Date.now()) {
  const group = getGroup(config, gid);
  if (!group || typeof group.epoch !== 'number') return null;
  const stored = group.read?.secret;
  // 哨兵值永遠不能通過驗證：輪替寫入失敗時它可能還留在檔案裡。
  if (typeof stored !== 'string' || stored === SENTINEL) return null;
  if (!notExpired(group.read?.expiresAt, now)) return null;
  if (!(await safeEqual(secret, stored))) return null;
  return { gid, epoch: group.epoch };
}

/** @param {string|null} header Authorization header */
export function parseBearer(header) {
  if (typeof header !== 'string') return null;
  const m = /^Bearer ([A-Za-z0-9_.-]{20,600})$/.exec(header.trim());
  if (!m) return null;
  const parsed = TOKEN_RE.exec(m[1]);
  if (!parsed) return null;
  return { gid: parsed[1], epoch: Number(parsed[2]), secret: parsed[3] };
}

/**
 * 驗 write token：epoch 相符 → 未過期 → secret 相符。
 *
 * token 自帶 gid，所以上傳者只能推到自己組別，不需要額外的授權判斷（spec §5.3）。
 * @returns {Promise<string|null>} 通過驗證的 gid
 */
export async function verifyWriteToken(config, parsed, now = Date.now()) {
  if (!parsed) return null;
  const group = getGroup(config, parsed.gid);
  if (!group || typeof group.epoch !== 'number') return null;
  if (parsed.epoch !== group.epoch) return null;
  const stored = group.write?.secret;
  if (typeof stored !== 'string' || stored === SENTINEL) return null;
  if (!notExpired(group.write?.expiresAt, now)) return null;
  if (!(await safeEqual(parsed.secret, stored))) return null;
  return parsed.gid;
}
