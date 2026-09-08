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
  groupsWithSales,
  resetStorage,
  salesToken,
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

  it('artifact 預設帶 CSP sandbox', async () => {
    const res = await put('sb', '<p>x</p>', { 'X-Visibility': 'public' });
    expect((await res.json()).sandbox).toBe('on');
    const get = await SELF.fetch(url('/r/sb'));
    const csp = get.headers.get('Content-Security-Policy');
    expect(csp).toContain('sandbox');
    expect(csp).toContain('allow-scripts');
    // 這兩個會讓 sandbox 形同虛設
    expect(csp).not.toContain('allow-same-origin');
    expect(csp).not.toContain('allow-popups-to-escape-sandbox');
  });

  it('X-Sandbox: off 可以個別關掉，group 內容也一樣', async () => {
    await put('opt-out', '<p>x</p>', { 'X-Sandbox': 'off' });
    const get = await SELF.fetch(url('/r/opt-out'), {
      headers: { Cookie: (await join()).cookie },
    });
    expect(get.status).toBe(200);
    expect(get.headers.get('Content-Security-Policy')).toBeNull();
  });

  it('重推不會悄悄把 X-Sandbox: off 關回去', async () => {
    await put('sticky', 'v1', { 'X-Sandbox': 'off', 'X-Visibility': 'public' });
    const res = await put('sticky', 'v2', { 'X-Visibility': 'public' });
    expect((await res.json()).sandbox).toBe('off');
    expect((await SELF.fetch(url('/r/sticky'))).headers.get('Content-Security-Policy')).toBeNull();
  });

  it('sandbox off + 第三方 script 會被擋下，而且什麼都不寫進去', async () => {
    const html = '<script src="https://cdn.tailwindcss.com"></script><p>x</p>';
    const res = await put('risky', html, { 'X-Sandbox': 'off', 'X-Visibility': 'public' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('third-party scripts');
    expect(body.reason).toContain('cdn.tailwindcss.com');
    expect(body.fix).toContain('publishing-rules.md');
    // 擋下來的東西不該留下痕跡
    expect(await env.R2_BUCKET.head('artifacts/risky.html')).toBeNull();
    expect(await env.KV_INDEX.get('idx:risky')).toBeNull();
  });

  it('內聯之後同一份就過得了', async () => {
    const html = '<script>/* inlined */ window.x = 1;</script><p>localStorage</p>';
    const res = await put('inlined', html, { 'X-Sandbox': 'off', 'X-Visibility': 'public' });
    expect(res.status).toBe(200);
    expect((await res.json()).sandbox).toBe('off');
  });

  it('sandbox on 但用到 storage API 會回警告，不擋', async () => {
    const res = await put('warned', '<script>localStorage.setItem("a","b")</script>', {
      'X-Visibility': 'public',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.warnings).toHaveLength(1);
    expect(body.warnings[0].code).toBe('storage-api-with-sandbox-on');
    expect(body.warnings[0].fix).toContain('publishing-rules.md');
  });

  it('sandbox off 但根本用不到，回警告不擋', async () => {
    const res = await put('pointless', '<p>就是一份報告</p>', {
      'X-Sandbox': 'off',
      'X-Visibility': 'public',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sandbox).toBe('off');
    expect(body.warnings.map((w) => w.code)).toEqual(['sandbox-off-not-needed']);
  });

  it('sandbox 出現在 GET /v1/a —— 「站上還有幾份 off」要查得到', async () => {
    await put('boxed', '<p>x</p>', { 'X-Visibility': 'public' });
    await put('unboxed', '<script>localStorage.getItem("a")</script>', {
      'X-Sandbox': 'off',
      'X-Visibility': 'public',
    });
    const listed = await (await SELF.fetch(url('/v1/a'), { headers: auth() })).json();
    expect(listed.find((r) => r.slug === 'boxed').sandbox).toBe('on');
    expect(listed.find((r) => r.slug === 'unboxed').sandbox).toBe('off');
    expect(listed.filter((r) => r.sandbox === 'off').map((r) => r.slug)).toEqual(['unboxed']);
  });

  it('一般的報告不會有警告', async () => {
    const res = await put('plain', '<p>就是一份報告</p>', { 'X-Visibility': 'public' });
    expect((await res.json()).warnings).toBeUndefined();
  });

  it('sandbox on 時第三方 script 是允許的（268 份舊報告就是這樣）', async () => {
    const html = '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script><p>x</p>';
    expect((await put('charty', html, { 'X-Visibility': 'public' })).status).toBe(200);
  });

  it('X-Sandbox 只接受 on / off', async () => {
    expect((await put('x', 'y', { 'X-Sandbox': 'maybe' })).status).toBe(400);
  });

  it('X-Updated-At 可以指定真實時間，並決定列表順序', async () => {
    const old = '2025-05-26T01:51:27.000Z';
    const res = await put('vintage', '<p>x</p>', {
      'X-Visibility': 'public',
      'X-Updated-At': old,
    });
    expect((await res.json()).updatedAt).toBe(old);

    const meta = (await env.R2_BUCKET.head('artifacts/vintage.html')).customMetadata;
    expect(meta.updatedAt).toBe(old);
    // 指定的時間比 createdAt 早時，createdAt 要跟著往前，不能留下矛盾的紀錄
    expect(meta.createdAt).toBe(old);

    await put('recent', '<p>x</p>', {
      'X-Visibility': 'public',
      'X-Updated-At': '2026-01-01T00:00:00.000Z',
    });
    const listed = await SELF.fetch(url('/v1/a'), { headers: auth() });
    expect((await listed.json()).map((r) => r.slug)).toEqual(['recent', 'vintage']);
  });

  it('X-Updated-At 擋掉壞掉的與未來的日期', async () => {
    expect((await put('a', 'x', { 'X-Updated-At': 'yesterday' })).status).toBe(400);
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    expect((await put('b', 'x', { 'X-Updated-At': future })).status).toBe(400);
  });

  it('樣式指紋會被存下來、列表看得到、重推沒帶就清掉', async () => {
    const withFp = `<!doctype html><meta charset="utf-8">
      <style>/* imitator report chassis */ @media (prefers-color-scheme: dark){:root{--x:1}}</style>
      <meta name="imitator-style" content="v3">
      <meta name="imitator-register" content="工單 — 一張開了三週才結案的維修單">
      <meta name="imitator-reference" content="1978 年科學月刊內頁">
      <meta name="imitator-paper" content="hsl(352 26% 95%)">
      <meta name="imitator-accent" content="hsl(218 66% 33%)">
      <title>t</title><body><p>x</p></body>`;
    const res = await put('fp', withFp, { 'X-Visibility': 'public' });
    const body = await res.json();
    expect(body.style).toMatchObject({ style: 'v3', paper: 'hsl(352 26% 95%)', accent: 'hsl(218 66% 33%)' });

    // R2 上是完整的 JSON 字串
    const meta = (await env.R2_BUCKET.head('artifacts/fp.html')).customMetadata;
    expect(JSON.parse(meta.style).register).toBe('工單 — 一張開了三週才結案的維修單');

    // 列表回的是精簡版：版本、顏色，長字串截短
    let listed = await (await SELF.fetch(url('/v1/a'), { headers: auth() })).json();
    expect(listed.find((r) => r.slug === 'fp').style).toEqual({
      v: 'v3', paper: 'hsl(352 26% 95%)', accent: 'hsl(218 66% 33%)',
      register: '工單 — 一張開了三週才結案的維修單', reference: '1978 年科學月刊內頁',
    });

    // 沒帶指紋的內容重推上去：指紋跟著 body 走，不會留下舊的
    await put('fp', '<p>plain</p>', { 'X-Visibility': 'public' });
    listed = await (await SELF.fetch(url('/v1/a'), { headers: auth() })).json();
    expect(listed.find((r) => r.slug === 'fp').style).toBeNull();
    expect((await env.R2_BUCKET.head('artifacts/fp.html')).customMetadata.style).toBeUndefined();
  });

  it('title 塞滿 200 字時指紋不會把 KV metadata 撐爆', async () => {
    const withFp = `<meta name="imitator-style" content="v3"><meta name="imitator-register" content="${'語'.repeat(120)}"><meta name="imitator-reference" content="${'參'.repeat(160)}"><meta name="imitator-paper" content="hsl(1 2% 3%)"><meta name="imitator-accent" content="hsl(4 5% 6%)"><body></body>`;
    const res = await put('big', withFp, { 'X-Visibility': 'public', 'X-Title': encodeURIComponent('題'.repeat(200)).replace(/%/g, '') .slice(0, 0) || '題'.repeat(200) });
    expect(res.status).toBe(200);
    const listed = await (await SELF.fetch(url('/v1/a'), { headers: auth() })).json();
    const row = listed.find((r) => r.slug === 'big');
    expect(row).toBeTruthy();
    // 進得了列表就代表 metadata 沒有超過上限；指紋可能被縮短或拿掉，但 title 不能丟
    expect(row.title.length).toBe(200);
  });

  it('沒帶 X-Updated-At 就是上傳當下', async () => {
    const before = Date.now() - 1000;
    const res = await put('now-ish', '<p>x</p>');
    const t = Date.parse((await res.json()).updatedAt);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(Date.now() + 1000);
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

  it('寫入時記下 owner，之後的更新不會改掉它，而且回應看得到', async () => {
    const first = await put('owned', 'v1', { 'X-Visibility': 'public' });
    expect((await first.json()).owner).toBe('rd');
    expect((await env.R2_BUCKET.head('artifacts/owned.html')).customMetadata.owner).toBe('rd');

    const second = await put('owned', 'v2', { 'X-Visibility': 'public' });
    expect((await second.json()).owner).toBe('rd');
    expect((await env.R2_BUCKET.head('artifacts/owned.html')).customMetadata.owner).toBe('rd');
  });

  it('別組不能覆寫或刪掉我的 public artifact', async () => {
    await seed(groupsWithSales());
    await put('mine-public', '<p>原文</p>', { 'X-Visibility': 'public' });

    // public 的 visibility 不帶身分，靠 owner 擋 —— 這是這個測試的重點。
    const overwrite = await put('mine-public', '<p>被換掉</p>', {
      'X-Visibility': 'public',
      ...auth(salesToken()),
    });
    expect(overwrite.status).toBe(403);

    const capture = await put('mine-public', '<p>佔走</p>', auth(salesToken()));
    expect(capture.status).toBe(403);

    const del = await SELF.fetch(url('/v1/a/mine-public'), {
      method: 'DELETE',
      headers: auth(salesToken()),
    });
    expect(del.status).toBe(404);

    // 原文原封不動
    expect(await (await SELF.fetch(url('/r/mine-public'))).text()).toBe('<p>原文</p>');
  });

  it('沒有 owner 的物件誰都寫不動 —— 包含它原本的作者', async () => {
    // 相容分支拿掉之後刻意選的失敗方向：鎖死可以從 R2 dashboard 手動處理，
    // 被別組永久佔走不行。
    await env.R2_BUCKET.put('artifacts/legacy.html', 'old', {
      customMetadata: { visibility: 'public', title: 't', createdAt: 'x', updatedAt: 'x' },
    });
    expect((await put('legacy', 'new', { 'X-Visibility': 'public' })).status).toBe(403);
    const del = await SELF.fetch(url('/v1/a/legacy'), { method: 'DELETE', headers: auth() });
    expect(del.status).toBe(404);
    // 內容原封不動
    expect(await (await env.R2_BUCKET.get('artifacts/legacy.html')).text()).toBe('old');
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
    const listed = await res.json();
    expect(listed.map((r) => r.slug).sort()).toEqual(['mine', 'pub']);
    // owner 要看得到，否則「backfill 補完了沒」沒有唯讀的驗證方法。
    expect(listed.every((r) => r.owner === 'rd')).toBe(true);
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
  it('HTML 結構完整（Cloudflare 的注入腳本會找 </body>）', async () => {
    for (const [label, res] of [
      ['portal', await SELF.fetch(url('/'))],
      ['404', await SELF.fetch(url('/r/nope'))],
    ]) {
      const body = await res.text();
      expect(body, label).toContain('<body>');
      expect(body, label).toContain('</body>');
      expect(body.indexOf('</body>'), label).toBeLessThan(body.indexOf('</html>'));
    }
  });

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

  it('預設只列最近三個月，?all=1 才全部', async () => {
    const old = new Date(Date.now() - 200 * 86_400_000).toISOString();
    await put('fresh', 'a', { 'X-Visibility': 'public', 'X-Title': '新的報告' });
    await put('stale', 'b', {
      'X-Visibility': 'public',
      'X-Title': '很久以前的報告',
      'X-Updated-At': old,
    });

    const def = await (await SELF.fetch(url('/'))).text();
    expect(def).toContain('新的報告');
    expect(def).not.toContain('很久以前的報告');
    expect(def).toContain('顯示全部 2 份');

    const all = await (await SELF.fetch(url('/?all=1'))).text();
    expect(all).toContain('新的報告');
    expect(all).toContain('很久以前的報告');
    expect(all).toContain('只看最近三個月');
  });

  it('最近三個月剛好沒東西時就全部列出來', async () => {
    const old = new Date(Date.now() - 200 * 86_400_000).toISOString();
    await put('stale', 'b', {
      'X-Visibility': 'public',
      'X-Title': '很久以前的報告',
      'X-Updated-At': old,
    });
    const body = await (await SELF.fetch(url('/'))).text();
    // 明明有東西卻說「沒有報告」是最差的那種正確
    expect(body).toContain('很久以前的報告');
    expect(body).not.toContain('顯示全部');
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

  it('只有 write 區塊的 group：outbox 只有 token，而且沒有人 join 得進去', async () => {
    await seed({
      rd: { name: '研發', epoch: 1, read: { secret: 'ROTATE' }, write: { secret: 'ROTATE' } },
      bot: { name: '自動發佈', epoch: 1, write: { secret: 'ROTATE' } },
    });
    await SELF.fetch(url('/'));

    const listed = await env.R2_BUCKET.list({ prefix: 'outbox/' });
    const files = Object.fromEntries(
      await Promise.all(
        listed.objects.map(async (o) => [
          o.key.split('/')[1].split('-')[0],
          await (await env.R2_BUCKET.get(o.key)).text(),
        ]),
      ),
    );

    // 每個 group 各自一份檔案 —— link 只會出現在有 read 區塊的那一份。
    expect(files.bot).toContain('imi_bot_1_');
    expect(files.bot).not.toContain('/join/');
    expect(files.rd).toContain('/join/rd/');
    expect(files.rd).toContain('imi_rd_1_');

    // 沒有 read secret 就沒有人 join 得進去，連別組的 secret 也不行。
    const config = await readConfig();
    const join = await SELF.fetch(url(`/join/bot/${config.groups.rd.read.secret}`), {
      redirect: 'manual',
    });
    expect(join.status).toBe(403);
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

describe('安全標頭', () => {
  // 基線 §1.5 把 XFO 與 HSTS 列為正式站必備。先前 SECURITY_HEADERS 只有
  // nosniff 與 Referrer-Policy,portal / 404 / artifact 一律沒有其他保護。
  const BASE = ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Strict-Transport-Security'];

  it('portal 帶滿基本標頭,而且有自己的 CSP 與 nonce', async () => {
    const res = await SELF.fetch(url('/'));
    for (const h of BASE) expect(res.headers.get(h), h).toBeTruthy();
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    const nonce = /script-src 'nonce-([A-Za-z0-9+/]+)'/.exec(csp)?.[1];
    expect(nonce, 'CSP 要帶 nonce').toBeTruthy();
    // 頁面裡那段行內 script 必須帶同一個 nonce,否則自己會被自己擋掉
    expect(await res.text()).toContain(`<script nonce="${nonce}">`);
  });

  it('每次請求的 nonce 都不一樣', async () => {
    const a = (await SELF.fetch(url('/'))).headers.get('Content-Security-Policy');
    const b = (await SELF.fetch(url('/'))).headers.get('Content-Security-Policy');
    expect(a).not.toBe(b);
  });

  it('404 也帶標頭與頁面 CSP', async () => {
    const res = await SELF.fetch(url('/r/does-not-exist'));
    expect(res.status).toBe(404);
    for (const h of BASE) expect(res.headers.get(h), h).toBeTruthy();
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
  });

  it('artifact 帶基本標頭,但拿到的是 sandbox CSP,不是頁面 CSP', async () => {
    await put('hdr', '<p>x</p>', { 'X-Visibility': 'public' });
    const res = await SELF.fetch(url('/r/hdr'));
    for (const h of BASE) expect(res.headers.get(h), h).toBeTruthy();
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toContain('sandbox');
    expect(csp).not.toContain("default-src 'none'");
  });

  it('sandbox off 的 artifact 仍然完全沒有 CSP —— 頁面 CSP 不該外溢過去', async () => {
    await put('hdr-off', '<p>x</p>', { 'X-Sandbox': 'off', 'X-Visibility': 'public' });
    const res = await SELF.fetch(url('/r/hdr-off'));
    expect(res.headers.get('Content-Security-Policy')).toBeNull();
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
