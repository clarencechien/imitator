import { SELF, env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetConfigCache } from '../src/config.js';
import {
  ORIGIN,
  READ_SECRET,
  auth,
  cookieFrom,
  future,
  groups,
  past,
  readConfig,
  resetStorage,
  seed,
  token,
} from './helpers.js';

const url = (path) => `${ORIGIN}${path}`;

async function put(slug, body, headers = {}) {
  return SELF.fetch(url(`/v1/a/${slug}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'text/html', ...auth(), ...headers },
    body,
  });
}

/** 走完整的 magic link 流程拿一個 cookie 回來。 */
async function join(secret = READ_SECRET, gid = 'rd') {
  const res = await SELF.fetch(url(`/join/${gid}/${secret}`), { redirect: 'manual' });
  return { res, cookie: cookieFrom(res) };
}

beforeEach(async () => {
  await resetStorage();
  await seed();
});

describe('路由與早退', () => {
  it('認不得的 path 直接 404', async () => {
    for (const path of ['/wp-admin', '/.env', '/.git/config', '/r/', '/v1']) {
      const res = await SELF.fetch(url(path));
      expect(res.status, path).toBe(404);
    }
  });

  it('slug 格式不合就不碰後端', async () => {
    const res = await SELF.fetch(url('/r/Not_A_Slug'));
    expect(res.status).toBe(404);
  });

  it('method 不對回 405', async () => {
    const res = await SELF.fetch(url('/r/anything'), { method: 'POST' });
    expect(res.status).toBe(405);
  });

  it('Content-Length 超過 25MB 在讀 body 之前就 413', async () => {
    const res = await SELF.fetch(url('/v1/a/big'), {
      method: 'PUT',
      headers: { 'Content-Length': String(30 * 1024 * 1024), ...auth() },
      body: 'x',
    });
    expect(res.status).toBe(413);
  });
});

describe('寫入（write token）', () => {
  it('推上去再讀回來', async () => {
    const res = await put('hello', '<h1>hi</h1>', { 'X-Visibility': 'public', 'X-Title': 'Hi' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ slug: 'hello', visibility: 'public' });
    expect(body.url).toBe(`${ORIGIN}/r/hello`);

    const get = await SELF.fetch(url('/r/hello'));
    expect(get.status).toBe(200);
    expect(await get.text()).toBe('<h1>hi</h1>');
    expect(get.headers.get('Content-Type')).toContain('text/html');
    expect(get.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(get.headers.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('覆寫 public 內容時邊緣快取會被清掉', async () => {
    await put('cached', '<p>v1</p>', { 'X-Visibility': 'public' });
    expect(await (await SELF.fetch(url('/r/cached'))).text()).toBe('<p>v1</p>');
    await put('cached', '<p>v2</p>', { 'X-Visibility': 'public' });
    expect(await (await SELF.fetch(url('/r/cached'))).text()).toBe('<p>v2</p>');
  });

  it('刪除後連快取都拿不到', async () => {
    await put('gone', '<p>x</p>', { 'X-Visibility': 'public' });
    await SELF.fetch(url('/r/gone'));
    await SELF.fetch(url('/v1/a/gone'), { method: 'DELETE', headers: auth() });
    expect((await SELF.fetch(url('/r/gone'))).status).toBe(404);
  });

  it('預設是 group 可見度', async () => {
    const res = await put('secret-report', '<p>internal</p>');
    expect((await res.json()).visibility).toBe('group:rd');
  });

  it('X-Title 的 UTF-8 會被還原', async () => {
    // curl 與 scripts/migrate.mjs 送的是原始 UTF-8 位元組，到 Worker 這邊會被
    // 當成 latin-1 解碼。這裡就用那個形狀測，才測得到真正會發生的事。
    const asBytes = String.fromCharCode(...new TextEncoder().encode('報告標題'));
    await put('cjk', '<p>x</p>', { 'X-Title': asBytes });
    expect((await env.R2_BUCKET.head('artifacts/cjk.html')).customMetadata.title).toBe('報告標題');

    await put('ascii', '<p>x</p>', { 'X-Title': 'Quarterly Report' });
    expect((await env.R2_BUCKET.head('artifacts/ascii.html')).customMetadata.title).toBe(
      'Quarterly Report',
    );
  });

  it('沒有 token 就 401，而且不建立任何物件', async () => {
    const res = await SELF.fetch(url('/v1/a/nope'), { method: 'PUT', body: 'x' });
    expect(res.status).toBe(401);
    expect(await env.R2_BUCKET.head('artifacts/nope.html')).toBeNull();
  });

  it('epoch 不符的 token 無效', async () => {
    const res = await put('x', 'y', auth(token('rd', 2)));
    expect(res.status).toBe(401);
  });

  it('過期的 write token 無效', async () => {
    await seed(groups({ write: { secret: 'write-secret-bbbbbbbbbbbbbbbbbbbb', expiresAt: past(1) } }));
    const res = await put('x', 'y');
    expect(res.status).toBe(401);
  });

  it('哨兵值本身永遠不能當 token 用', async () => {
    await env.R2_BUCKET.put(
      'config/groups.json',
      JSON.stringify({
        version: 1,
        groups: { rd: { epoch: 3, write: { secret: 'ROTATE', expiresAt: future(90) } } },
      }),
    );
    resetConfigCache();
    const res = await put('x', 'y', auth(token('rd', 3, 'ROTATE')));
    expect(res.status).toBe(401);
  });

  it('X-Visibility 只接受 public / group', async () => {
    const res = await put('x', 'y', { 'X-Visibility': 'everyone' });
    expect(res.status).toBe(400);
  });

  it('覆寫保留 createdAt', async () => {
    await put('same', 'v1');
    const first = (await env.R2_BUCKET.head('artifacts/same.html')).customMetadata.createdAt;
    await put('same', 'v2');
    const after = (await env.R2_BUCKET.head('artifacts/same.html')).customMetadata;
    expect(after.createdAt).toBe(first);
    expect(after.updatedAt).not.toBe(first);
  });

  it('不能覆寫別組的 slug', async () => {
    await env.R2_BUCKET.put('artifacts/theirs.html', 'x', {
      customMetadata: { visibility: 'group:sales', title: 't', createdAt: 'x', updatedAt: 'x' },
    });
    const res = await put('theirs', 'mine');
    expect(res.status).toBe(403);
  });
});

describe('讀取與可見度', () => {
  it('group 內容對沒有 cookie 的人是 404，不是 403', async () => {
    await put('internal', '<p>secret</p>');
    const res = await SELF.fetch(url('/r/internal'));
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('secret');
  });

  it('拿到 magic link 就看得到', async () => {
    await put('internal', '<p>secret</p>');
    const { res, cookie } = await join();
    expect(res.status).toBe(302);
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(cookie).toMatch(/^__Host-imi=/);

    const get = await SELF.fetch(url('/r/internal'), { headers: { Cookie: cookie } });
    expect(get.status).toBe(200);
    expect(await get.text()).toBe('<p>secret</p>');
    expect(get.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('錯的 secret 回泛用畫面', async () => {
    const res = await SELF.fetch(url('/join/rd/wrong-secret-cccccccccccccc'), { redirect: 'manual' });
    expect(res.status).toBe(403);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(await res.text()).toContain('連結無效或已過期');
  });

  it('過期的 readSecret 換不到 cookie', async () => {
    await seed(groups({ read: { secret: READ_SECRET, expiresAt: past(1) } }));
    const { res } = await join();
    expect(res.status).toBe(403);
  });

  it('next 只吃站內路徑', async () => {
    const ok = await SELF.fetch(url(`/join/rd/${READ_SECRET}?next=/r/abc`), { redirect: 'manual' });
    expect(ok.headers.get('Location')).toBe('/r/abc');
    const evil = await SELF.fetch(url(`/join/rd/${READ_SECRET}?next=//evil.example`), { redirect: 'manual' });
    expect(evil.headers.get('Location')).toBe('/');
  });

  it('epoch++ 讓已經發出去的 cookie 立刻失效', async () => {
    await put('internal', '<p>secret</p>');
    const { cookie } = await join();
    expect((await SELF.fetch(url('/r/internal'), { headers: { Cookie: cookie } })).status).toBe(200);

    await seed(groups({ epoch: 4 }));
    const after = await SELF.fetch(url('/r/internal'), { headers: { Cookie: cookie } });
    expect(after.status).toBe(404);
  });

  it('group 漏填 epoch 時整組進不去', async () => {
    await put('internal', '<p>secret</p>');
    const { cookie } = await join();
    await seed({ rd: { read: { secret: READ_SECRET, expiresAt: future(7) } } });
    expect((await SELF.fetch(url('/r/internal'), { headers: { Cookie: cookie } })).status).toBe(404);
    const { res } = await join();
    expect(res.status).toBe(403);
  });

  it('偽造簽章的 cookie 沒有用', async () => {
    await put('internal', '<p>secret</p>');
    const { cookie } = await join();
    const tampered = `${cookie.slice(0, -3)}aaa`;
    const res = await SELF.fetch(url('/r/internal'), { headers: { Cookie: tampered } });
    expect(res.status).toBe(404);
  });

  it('KV 索引落後時仍以 R2 metadata 為準', async () => {
    await put('flipped', '<p>secret</p>'); // group:rd
    // 模擬 KV 還停在舊的 public 值
    await env.KV_INDEX.put(
      'idx:flipped',
      JSON.stringify({ visibility: 'public', title: 't', updatedAt: 'x' }),
    );
    const res = await SELF.fetch(url('/r/flipped'));
    expect(res.status).toBe(404);
  });
});

describe('列表與刪除', () => {
  it('/v1/a 只列 public ＋ 自己組別', async () => {
    await put('pub', 'a', { 'X-Visibility': 'public' });
    await put('mine', 'b');
    await env.KV_INDEX.put('idx:theirs', JSON.stringify({ visibility: 'group:sales' }), {
      metadata: { visibility: 'group:sales', title: 'x', updatedAt: 'x' },
    });

    const res = await SELF.fetch(url('/v1/a'), { headers: auth() });
    const slugs = (await res.json()).map((r) => r.slug).sort();
    expect(slugs).toEqual(['mine', 'pub']);
  });

  it('DELETE 會把物件與索引一起清掉', async () => {
    await put('bye', 'x');
    const res = await SELF.fetch(url('/v1/a/bye'), { method: 'DELETE', headers: auth() });
    expect(res.status).toBe(200);
    expect(await env.R2_BUCKET.head('artifacts/bye.html')).toBeNull();
    expect(await env.KV_INDEX.get('idx:bye')).toBeNull();
  });

  it('刪不到別組的東西', async () => {
    await env.R2_BUCKET.put('artifacts/theirs.html', 'x', {
      customMetadata: { visibility: 'group:sales', title: 't', createdAt: 'x', updatedAt: 'x' },
    });
    const res = await SELF.fetch(url('/v1/a/theirs'), { method: 'DELETE', headers: auth() });
    expect(res.status).toBe(404);
    expect(await env.R2_BUCKET.head('artifacts/theirs.html')).not.toBeNull();
  });
});

describe('portal', () => {
  it('沒有 cookie 只看得到 public', async () => {
    await put('pub', 'a', { 'X-Visibility': 'public', 'X-Title': '公開報告' });
    await put('hidden', 'b', { 'X-Title': '內部報告' });

    const res = await SELF.fetch(url('/'));
    const body = await res.text();
    expect(body).toContain('公開報告');
    expect(body).not.toContain('內部報告');
    expect(body).not.toContain('/r/hidden');
  });

  it('有 cookie 就看得到自己組別的', async () => {
    await put('hidden', 'b', { 'X-Title': '內部報告' });
    const { cookie } = await join();
    const body = await (await SELF.fetch(url('/'), { headers: { Cookie: cookie } })).text();
    expect(body).toContain('內部報告');
  });

  it('epoch 過期的 cookie 會被清掉', async () => {
    const { cookie } = await join();
    await seed(groups({ epoch: 9 }));
    const res = await SELF.fetch(url('/'), { headers: { Cookie: cookie } });
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});

describe('哨兵值輪替', () => {
  it('打開網站就完成輪替並寫出 outbox', async () => {
    await seed({
      rd: { name: '研發', epoch: 3, read: { secret: 'ROTATE' }, write: { secret: 'ROTATE' } },
    });

    const res = await SELF.fetch(url('/'));
    expect(res.status).toBe(200);

    const config = await readConfig();
    const rd = config.groups.rd;
    expect(rd.read.secret).not.toBe('ROTATE');
    expect(rd.write.secret).not.toBe('ROTATE');
    expect(rd.read.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Date.parse(rd.read.expiresAt) - Date.now()).toBeGreaterThan(6 * 86_400_000);
    expect(Date.parse(rd.write.expiresAt) - Date.now()).toBeGreaterThan(89 * 86_400_000);

    const listed = await env.R2_BUCKET.list({ prefix: 'outbox/' });
    expect(listed.objects).toHaveLength(1);
    const outbox = await (await env.R2_BUCKET.get(listed.objects[0].key)).text();
    expect(outbox).toContain(`${ORIGIN}/join/rd/${rd.read.secret}`);
    expect(outbox).toContain(`imi_rd_3_${rd.write.secret}`);
  });

  it('輪替後的新連結真的能用，舊的不能', async () => {
    await seed({
      rd: { epoch: 3, read: { secret: 'ROTATE' }, write: { secret: 'ROTATE' } },
    });
    await SELF.fetch(url('/'));
    const rd = (await readConfig()).groups.rd;

    const good = await SELF.fetch(url(`/join/rd/${rd.read.secret}`), { redirect: 'manual' });
    expect(good.status).toBe(302);
    const stale = await SELF.fetch(url(`/join/rd/${READ_SECRET}`), { redirect: 'manual' });
    expect(stale.status).toBe(403);
  });

  it('只輪替被標記的那一個欄位', async () => {
    await seed(groups({ write: { secret: 'ROTATE' } }));
    await SELF.fetch(url('/'));
    const rd = (await readConfig()).groups.rd;
    expect(rd.read.secret).toBe(READ_SECRET);
    expect(rd.write.secret).not.toBe('ROTATE');
  });

  it('併發時只會有一組憑證出線', async () => {
    await seed({ rd: { epoch: 3, read: { secret: 'ROTATE' }, write: { secret: 'ROTATE' } } });
    // 每個請求都清掉 isolate 快取，強迫兩邊都看到哨兵值。
    const hits = [];
    for (let i = 0; i < 2; i++) {
      resetConfigCache();
      hits.push(SELF.fetch(url('/')));
    }
    await Promise.all(hits);

    const listed = await env.R2_BUCKET.list({ prefix: 'outbox/' });
    const rd = (await readConfig()).groups.rd;
    // outbox 裡的每一份都必須對應到 groups.json 現在真正生效的 secret。
    for (const obj of listed.objects) {
      const text = await (await env.R2_BUCKET.get(obj.key)).text();
      expect(text).toContain(rd.read.secret);
    }
  });

  it('groups.json 壞掉時 group 內容全部關門，public 不受影響', async () => {
    await put('pub', 'ok', { 'X-Visibility': 'public' });
    await put('priv', 'no');
    await env.R2_BUCKET.put('config/groups.json', '{ not json');
    resetConfigCache();

    expect((await SELF.fetch(url('/r/pub'))).status).toBe(200);
    const { res } = await join();
    expect(res.status).toBe(403);
    expect((await SELF.fetch(url('/r/priv'))).status).toBe(404);
  });
});
