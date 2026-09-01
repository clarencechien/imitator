// 低階密碼學工具。這裡的每個函式都是純運算，零 I/O — spec §8.3 早退順序的第 4 步靠它。

const enc = new TextEncoder();

/** @param {Uint8Array|ArrayBuffer|string} input */
export function b64urlEncode(input) {
  const bytes =
    typeof input === 'string'
      ? enc.encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} s @returns {Uint8Array|null} */
export function b64urlDecode(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s)) return null;
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** @param {string} s */
export function b64urlDecodeToString(s) {
  const bytes = b64urlDecode(s);
  return bytes === null ? null : new TextDecoder().decode(bytes);
}

const hmacKeys = new Map();

async function importHmacKey(secret) {
  let key = hmacKeys.get(secret);
  if (!key) {
    key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    // isolate 內只會有一兩把 key（SESSION_SECRET 加比較用的臨時 key），
    // 但仍設上限，避免任何意料外的呼叫把 isolate 記憶體吃光。
    if (hmacKeys.size > 8) hmacKeys.clear();
    hmacKeys.set(secret, key);
  }
  return key;
}

/**
 * HMAC-SHA256。
 * @param {string} secret @param {string} data @returns {Promise<Uint8Array>}
 */
export async function hmacSha256(secret, data) {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(sig);
}

// 比較用的一次性 key。每個 isolate 隨機產生一把，只活在記憶體裡。
let compareSecret = null;

/**
 * 定時比較（spec §8.2）。
 *
 * 先把兩邊各自 HMAC 成 32 bytes 再逐 byte 比對，所以連「長度不同」都不會從
 * 執行時間洩漏出去 — crypto.subtle.timingSafeEqual 長度不同會直接丟例外，
 * 那本身就是一個 side channel。key 是 isolate 內隨機產生的，攻擊者無法預先
 * 計算出任何一邊的摘要。
 *
 * @param {unknown} a @param {unknown} b @returns {Promise<boolean>}
 */
export async function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!compareSecret) compareSecret = b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const [da, db] = await Promise.all([hmacSha256(compareSecret, a), hmacSha256(compareSecret, b)]);
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
  return diff === 0;
}

/**
 * 產生新的 secret。
 *
 * spec §7.1 寫 24 bytes、§8.2 寫「至少 32 bytes」— 取嚴格的那個。
 * base64url 編碼後 43 個字元，沒有 padding，可直接放進 URL 與 header。
 */
export function randomSecret(bytes = 32) {
  return b64urlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}
