import { env } from 'cloudflare:test';
import { resetConfigCache } from '../src/config.js';

export const READ_SECRET = 'read-secret-aaaaaaaaaaaaaaaaaaaa';
export const WRITE_SECRET = 'write-secret-bbbbbbbbbbbbbbbbbbbb';
export const ORIGIN = 'https://r.test';

export const future = (days) => new Date(Date.now() + days * 86_400_000).toISOString();
export const past = (days) => new Date(Date.now() - days * 86_400_000).toISOString();

export function groups(overrides = {}) {
  return {
    rd: {
      name: '研發',
      epoch: 3,
      read: { secret: READ_SECRET, expiresAt: future(7) },
      write: { secret: WRITE_SECRET, expiresAt: future(90) },
      ...overrides,
    },
  };
}

/** isolatedStorage 關掉了，所以每個測試自己把 R2 與 KV 清乾淨。 */
export async function resetStorage() {
  resetConfigCache();
  const objects = await env.R2_BUCKET.list({ limit: 1000 });
  await Promise.all(objects.objects.map((o) => env.R2_BUCKET.delete(o.key)));
  const keys = await env.KV_INDEX.list({ limit: 1000 });
  await Promise.all(keys.keys.map((k) => env.KV_INDEX.delete(k.name)));
}

export async function seed(groupMap = groups()) {
  await env.R2_BUCKET.put('config/groups.json', JSON.stringify({ version: 1, groups: groupMap }));
  resetConfigCache();
}

export async function readConfig() {
  const obj = await env.R2_BUCKET.get('config/groups.json');
  return JSON.parse(await obj.text());
}

export const token = (gid = 'rd', epoch = 3, secret = WRITE_SECRET) =>
  `imi_${gid}_${epoch}_${secret}`;

export const auth = (t = token()) => ({ Authorization: `Bearer ${t}` });

/** 從 Set-Cookie 抓出可以直接放回 Cookie header 的值。 */
export function cookieFrom(response) {
  const raw = response.headers.get('Set-Cookie');
  if (!raw) return null;
  return raw.split(';')[0];
}
