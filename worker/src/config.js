// groups.json：單一事實來源（spec §4.1）與哨兵值輪替（spec §7.1）。

import { randomSecret } from './crypto.js';

export const CONFIG_KEY = 'config/groups.json';
export const SENTINEL = 'ROTATE';
const CACHE_TTL_MS = 60_000; // spec §4.1：輪替後最多一分鐘生效
const EMPTY = Object.freeze({ version: 1, groups: {} });

// isolate global scope 快取。每個請求都打一次 R2 既慢又是 class B 計費操作。
let cached = null; // { data, etag, at }
let inflight = null;

/** 測試用：清掉 isolate 快取。 */
export function resetConfigCache() {
  cached = null;
  inflight = null;
}

function days(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isoIn(daysAhead, now = Date.now()) {
  return new Date(now + daysAhead * 86_400_000).toISOString();
}

/**
 * 讀 groups.json，必要時就地完成哨兵值輪替。
 *
 * @param {any} env
 * @param {string} origin 用來組 outbox 裡的 magic link
 * @returns {Promise<{version:number, groups:Record<string,any>}>}
 */
export async function loadConfig(env, origin) {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
  if (inflight) return inflight;
  inflight = fetchConfig(env, origin).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function fetchConfig(env, origin) {
  let obj;
  try {
    obj = await env.R2_BUCKET.get(CONFIG_KEY);
  } catch (err) {
    // R2 掛了。用上一份快取撐著總比整站關門好；真的沒有就當空的（全部拒絕）。
    console.error('config: R2 get failed:', err?.message ?? 'unknown error');
    return cached?.data ?? EMPTY;
  }
  if (!obj) {
    cached = { data: EMPTY, etag: null, at: Date.now() };
    return EMPTY;
  }

  let data = parseConfig(await obj.text());
  let etag = obj.etag;

  if (data && hasSentinel(data)) {
    const rotated = await rotate(env, data, etag, origin);
    if (rotated) {
      data = rotated.data;
      etag = rotated.etag;
    } else {
      // If-Match 被拒（412）：別人已經完成輪替了。重讀一次，不再嘗試輪替。
      const fresh = await env.R2_BUCKET.get(CONFIG_KEY);
      if (fresh) {
        data = parseConfig(await fresh.text()) ?? data;
        etag = fresh.etag;
      }
    }
  }

  if (!data) {
    // groups.json 壞掉時 fail closed：public 照常，group 全部進不去。
    console.error('config: groups.json is not valid JSON, denying all group access');
    data = EMPTY;
  }

  cached = { data, etag, at: Date.now() };
  return data;
}

function parseConfig(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || typeof data.groups !== 'object' || !data.groups) {
      return null;
    }
    return data;
  } catch {
    return null; // 絕不把內容印進 log：裡面是明碼 secret（spec §8.2）
  }
}

function hasSentinel(data) {
  return Object.values(data.groups ?? {}).some(
    (g) => g?.read?.secret === SENTINEL || g?.write?.secret === SENTINEL,
  );
}

/**
 * 哨兵值輪替。整份 groups.json 用 If-Match 條件寫入（spec §7.2）：
 * 兩個請求同時看到哨兵值時，只有一個會成功，另一個拿到 null 就放棄。
 */
async function rotate(env, data, etag, origin) {
  if (!etag) return null; // 沒有 etag 就沒有併發保護，寧可不輪替

  const now = Date.now();
  const readDays = days(env.DEFAULT_READ_DAYS, 7);
  const writeDays = days(env.DEFAULT_WRITE_DAYS, 90);
  const next = JSON.parse(JSON.stringify(data));
  const rotated = [];

  for (const [gid, group] of Object.entries(next.groups)) {
    if (!group || typeof group !== 'object') continue;
    const changed = { gid, group, read: false, write: false };
    if (group.read?.secret === SENTINEL) {
      group.read.secret = randomSecret();
      group.read.expiresAt = isoIn(readDays, now);
      changed.read = true;
    }
    if (group.write?.secret === SENTINEL) {
      group.write.secret = randomSecret();
      group.write.expiresAt = isoIn(writeDays, now);
      changed.write = true;
    }
    if (changed.read || changed.write) rotated.push(changed);
  }
  if (rotated.length === 0) return null;

  const written = await env.R2_BUCKET.put(CONFIG_KEY, JSON.stringify(next, null, 2), {
    onlyIf: { etagMatches: etag },
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  if (!written) return null; // 412：別人先寫進去了

  const stamp = new Date(now).toISOString();
  for (const entry of rotated) {
    await env.R2_BUCKET.put(
      `outbox/${entry.gid}-${stamp}.txt`,
      renderOutbox(entry, origin),
      { httpMetadata: { contentType: 'text/plain; charset=utf-8' } },
    );
  }

  return { data: next, etag: written.etag };
}

/** outbox 的內容就是可以直接複製貼上的連結與 token（spec §7.1）。 */
function renderOutbox({ gid, group, read, write }, origin) {
  const lines = [`group: ${gid} (epoch ${group.epoch})`, ''];
  if (read) {
    lines.push(
      `link  (expires ${group.read.expiresAt}，給組員)`,
      `${origin}/join/${gid}/${group.read.secret}`,
      '',
    );
  }
  if (write) {
    lines.push(
      `token (expires ${group.write.expiresAt}，給要 push 的人／agent)`,
      writeToken(gid, group.epoch, group.write.secret),
      '',
    );
  }
  return lines.join('\n');
}

/** token 自帶 gid 與 epoch（spec §5.3）。 */
export function writeToken(gid, epoch, secret) {
  return `imi_${gid}_${epoch}_${secret}`;
}

/** @returns {any|null} */
export function getGroup(config, gid) {
  if (typeof gid !== 'string') return null;
  const group = config?.groups?.[gid];
  return group && typeof group === 'object' ? group : null;
}

/** expiresAt 缺漏或無法解析一律當成過期 — fail closed。 */
export function notExpired(expiresAt, now = Date.now()) {
  if (typeof expiresAt !== 'string') return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t > now;
}
