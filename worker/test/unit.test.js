import { describe, expect, it } from 'vitest';
import { b64urlDecodeToString, b64urlEncode, randomSecret, safeEqual } from '../src/crypto.js';
import { notExpired, writeToken } from '../src/config.js';
import { parseBearer, readCookie } from '../src/session.js';
import { canRead, decodeHeaderValue } from '../src/artifacts.js';

describe('crypto', () => {
  it('base64url 來回一致，且不含 URL 不安全的字元', () => {
    const s = '報告 / secret + value ~';
    expect(b64urlDecodeToString(b64urlEncode(s))).toBe(s);
    expect(b64urlEncode(s)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('壞掉的 base64url 回 null 而不是丟例外', () => {
    expect(b64urlDecodeToString('not valid!!')).toBeNull();
  });

  it('safeEqual 只有完全相同才成立', async () => {
    expect(await safeEqual('abc', 'abc')).toBe(true);
    expect(await safeEqual('abc', 'abd')).toBe(false);
    expect(await safeEqual('abc', 'abcd')).toBe(false);
    expect(await safeEqual('abc', undefined)).toBe(false);
    expect(await safeEqual(null, null)).toBe(false);
  });

  it('secret 是 32 bytes 隨機（spec §8.2）', () => {
    const a = randomSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(randomSecret());
  });
});

describe('token 解析', () => {
  it('接受合法的 token，random 裡可以有底線', () => {
    const secret = 'aaaa_bbbb-cccc_dddd1234';
    expect(parseBearer(`Bearer ${writeToken('rd', 3, secret)}`)).toEqual({
      gid: 'rd',
      epoch: 3,
      secret,
    });
  });

  it('格式不對一律 null，零 I/O', () => {
    for (const header of [
      null,
      'Bearer',
      'Basic imi_rd_3_aaaaaaaaaaaaaaaa',
      'Bearer imi_rd_3_short',
      'Bearer imi_RD_3_aaaaaaaaaaaaaaaa',
      'Bearer imi_rd_x_aaaaaaaaaaaaaaaa',
      'Bearer nope_rd_3_aaaaaaaaaaaaaaaa',
    ]) {
      expect(parseBearer(header), String(header)).toBeNull();
    }
  });
});

describe('cookie 解析', () => {
  it('從一堆 cookie 裡挑出自己那個', () => {
    expect(readCookie('a=1; __Host-imi=abc.def; b=2')).toBe('abc.def');
  });

  it('形狀不對就當沒有', () => {
    expect(readCookie('__Host-imi=no-dot')).toBeNull();
    expect(readCookie('other=abc.def')).toBeNull();
    expect(readCookie(null)).toBeNull();
  });
});

describe('可見度', () => {
  it('public 誰都能看', () => {
    expect(canRead('public', null)).toBe(true);
  });

  it('group 只有同組能看', () => {
    expect(canRead('group:rd', 'rd')).toBe(true);
    expect(canRead('group:rd', 'sales')).toBe(false);
    expect(canRead('group:rd', null)).toBe(false);
    expect(canRead(undefined, 'rd')).toBe(false);
  });
});

describe('expiresAt', () => {
  it('缺漏或壞掉一律當成過期（fail closed）', () => {
    expect(notExpired(undefined)).toBe(false);
    expect(notExpired('not a date')).toBe(false);
    expect(notExpired(new Date(Date.now() - 1000).toISOString())).toBe(false);
    expect(notExpired(new Date(Date.now() + 60_000).toISOString())).toBe(true);
  });
});

describe('header 的 UTF-8 還原', () => {
  it('把 latin-1 解出來的位元組還原成中文', () => {
    const mojibake = String.fromCharCode(...new TextEncoder().encode('報告標題'));
    expect(decodeHeaderValue(mojibake)).toBe('報告標題');
  });

  it('純 ASCII 維持原樣', () => {
    expect(decodeHeaderValue('Quarterly Report')).toBe('Quarterly Report');
  });
});

import { extractFingerprint } from '../src/fingerprint.js';

describe('樣式指紋', () => {
  const head = (metas) => `<!doctype html><html><meta charset="utf-8">${metas}<title>t</title><body></body></html>`;

  it('抽出全部欄位', () => {
    const fp = extractFingerprint(head(`
      <meta name="imitator-style" content="v3">
      <meta name="imitator-register" content="工單 — 三名共犯、沒有主嫌">
      <meta name="imitator-reference" content="1978 年科學月刊內頁">
      <meta name="imitator-paper" content="hsl(352 26% 95%)">
      <meta name="imitator-accent" content="#0a6265">
      <meta name="imitator-generator" content="claude-opus-5">`));
    expect(fp).toEqual({
      style: 'v3', register: '工單 — 三名共犯、沒有主嫌', reference: '1978 年科學月刊內頁',
      paper: 'hsl(352 26% 95%)', accent: '#0a6265', generator: 'claude-opus-5',
    });
  });

  it('沒有版本號就當作沒有指紋', () => {
    expect(extractFingerprint(head(`<meta name="imitator-paper" content="hsl(1 2% 3%)">`))).toBeNull();
  });

  it('顏色格式不對的欄位被丟掉，其他保留', () => {
    const fp = extractFingerprint(head(`<meta name="imitator-style" content="v3"><meta name="imitator-paper" content="warm cream">`));
    expect(fp).toEqual({ style: 'v3' });
  });

  it('屬性順序顛倒、單引號、entity 都認得；重複以第一個為準', () => {
    const fp = extractFingerprint(head(`
      <meta content='v3' name='imitator-style'>
      <meta name="imitator-register" content="A &amp; B">
      <meta name="imitator-register" content="second">`));
    expect(fp).toEqual({ style: 'v3', register: 'A & B' });
  });

  it('只掃前 8 KB —— 指紋規定要在最前面', () => {
    const pad = '<!-- ' + 'x'.repeat(9000) + ' -->';
    expect(extractFingerprint(head(pad + `<meta name="imitator-style" content="v3">`))).toBeNull();
  });

  it('太長的值被丟掉', () => {
    const fp = extractFingerprint(head(`<meta name="imitator-style" content="v3"><meta name="imitator-register" content="${'長'.repeat(121)}">`));
    expect(fp).toEqual({ style: 'v3' });
  });
});

import { auditStyle } from '../src/fingerprint.js';

describe('樣式稽核', () => {
  const fp = { style: 'v3' };
  const good = `<style>/* imitator report chassis */
    @media (prefers-color-scheme: dark){:root{--paper:#111}}
    .cols{grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))}</style>`;

  it('照做的報告沒有任何 warning', () => {
    expect(auditStyle(good, fp)).toEqual({ codes: [], warnings: [] });
  });

  it('沒有指紋就完全不稽核 —— 舊報告與隨手推的東西不該被念', () => {
    expect(auditStyle('<p>plain</p>', null)).toEqual({ codes: [], warnings: [] });
  });

  it('宣稱 v3 卻沒貼底盤、沒有深色', () => {
    const { codes } = auditStyle('<style>:root{--paper:#fff}</style>', fp);
    expect(codes).toEqual(['no-chassis', 'single-colour-scheme']);
  });

  it('[data-theme="dark"] 也算有深色', () => {
    expect(auditStyle(`<style>/* imitator report chassis */ :root[data-theme="dark"]{--x:1}</style>`, fp).codes).toEqual([]);
  });

  it('裸的 fr track 會被抓到，minmax 包起來的不會', () => {
    const bare = `${good}<style>.lane{grid-template-columns:1fr 1fr}</style>`;
    expect(auditStyle(bare, fp).codes).toContain('bare-fr-grid-track');
    const nested = `${good}<style>.a{grid-template-columns:repeat(2,minmax(min(100%,10rem),1fr))}</style>`;
    expect(auditStyle(nested, fp).codes).not.toContain('bare-fr-grid-track');
    const zero = `${good}<style>.b{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}</style>`;
    expect(auditStyle(zero, fp).codes).not.toContain('bare-fr-grid-track');
  });

  it('th/td 一律 nowrap 會被抓到，.nowrap 這個 opt-in 不會', () => {
    const all = `${good}<style>th,td{padding:.7rem;white-space:nowrap}</style>`;
    expect(auditStyle(all, fp).codes).toContain('nowrap-table-cells');
    const optIn = `${good}<style>th,td{padding:.7rem}.nowrap,td.nowrap{white-space:nowrap}</style>`;
    expect(auditStyle(optIn, fp).codes).not.toContain('nowrap-table-cells');
    const wrapOnly = `${good}<style>th,td{padding:.7rem;vertical-align:top}</style>`;
    expect(auditStyle(wrapOnly, fp).codes).not.toContain('nowrap-table-cells');
  });

  it('大的內聯圖回報一次，小的不管', () => {
    const heavy = `${good}<img src="data:image/png;base64,${'A'.repeat(600 * 1024)}">`;
    const w = auditStyle(heavy, fp);
    expect(w.codes).toEqual(['heavy-inline-image']);
    expect(w.warnings[0].reason).toMatch(/about \d+ KB/);
    const light = `${good}<img src="data:image/png;base64,${'A'.repeat(1024)}">`;
    expect(auditStyle(light, fp).codes).toEqual([]);
  });

  it('每一條 warning 都有 code、原因與修法', () => {
    for (const w of auditStyle('<p>x</p>', fp).warnings) {
      expect(w.code).toBeTruthy();
      expect(w.reason.length).toBeGreaterThan(20);
      expect(w.fix.length).toBeGreaterThan(20);
    }
  });
});

import { inspectBody } from '../src/policy.js';

describe('第三方樣式表', () => {
  const enc = (s) => new TextEncoder().encode(s).buffer;
  const codes = (html, sandbox = 'on') => inspectBody(enc(html), sandbox).warnings.map((w) => w.code);

  it('字型的樣式表不算', () => {
    expect(codes('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC">')).toEqual([]);
    expect(codes('<link href="https://fonts.gstatic.com/x.css" rel="stylesheet">')).toEqual([]);
  });

  it('其他第三方樣式表回一則 warning，不擋', () => {
    const r = inspectBody(enc('<link rel="stylesheet" href="https://cdn.example.com/a.css">'), 'on');
    expect(r.error).toBeUndefined();
    expect(r.warnings.map((w) => w.code)).toEqual(['third-party-stylesheet']);
    expect(r.warnings[0].reason).toContain('cdn.example.com');
  });

  it('link 到 raw.githubusercontent 的 report.css 會特別說明它保證失效', () => {
    const r = inspectBody(enc('<link rel="stylesheet" href="https://raw.githubusercontent.com/x/y/main/style/report.css">'), 'on');
    expect(r.warnings[0].reason).toMatch(/text\/plain.*nosniff|nosniff/);
  });

  it('本地的樣式表不算第三方', () => {
    expect(codes('<link rel="stylesheet" href="/style.css">')).toEqual([]);
  });
});

describe('X-Sandbox: off 要有理由', () => {
  const enc = (s) => new TextEncoder().encode(s).buffer;
  const codes = (html, sandbox) => inspectBody(enc(html), sandbox).warnings.map((w) => w.code);

  it('off 但完全沒用到需要真實來源的 API → 警告', () => {
    expect(codes('<p>就是一份報告</p>', 'off')).toEqual(['sandbox-off-not-needed']);
  });

  it('off 而且真的用得到 → 不警告，那是它存在的理由', () => {
    for (const api of [
      'localStorage.setItem("a","b")',
      'sessionStorage.getItem("a")',
      'indexedDB.open("d")',
      'document.cookie = "a=b"',
      'Notification.requestPermission()',
      'navigator.serviceWorker.register("/sw.js")',
    ]) {
      expect(codes(`<script>${api}</script>`, 'off')).toEqual([]);
    }
  });

  it('sandbox on 的時候不會誤發這一則', () => {
    expect(codes('<p>就是一份報告</p>', 'on')).toEqual([]);
  });
});

describe('第三方程式碼:module import 也算', () => {
  const enc = (s) => new TextEncoder().encode(s).buffer;
  const blocked = (html) => Boolean(inspectBody(enc(html), 'off').error);

  // publishing-rules §1 說「sandbox off 不得載入第三方 script」是 enforced,
  // 但先前只掃 <script src>。import 同樣是 runtime 從別人的網域拉可執行程式碼,
  // 而 LLM 產生的頁面用 esm.sh / skypack 相當常見。
  it('static import 被擋', () => {
    expect(blocked('<script type="module">import x from "https://esm.sh/lodash";</script>')).toBe(true);
  });

  it('dynamic import 被擋', () => {
    expect(blocked('<script type="module">import("https://cdn.jsdelivr.net/npm/x")</script>')).toBe(true);
  });

  it('export … from 被擋', () => {
    expect(blocked('<script type="module">export * from "https://esm.sh/y";</script>')).toBe(true);
  });

  it('protocol-relative 的 import 被擋', () => {
    expect(blocked('<script type="module">import x from "//esm.sh/z";</script>')).toBe(true);
  });

  it('本地 import 照常放行', () => {
    expect(blocked('<script type="module">import x from "./local.js";</script>')).toBe(false);
    expect(blocked('<script type="module">import x from "/lib/a.js";</script>')).toBe(false);
  });

  it('錯誤訊息把主機名列出來', () => {
    const r = inspectBody(enc('<script type="module">import x from "https://esm.sh/lodash";</script>'), 'off');
    expect(r.error.reason).toContain('esm.sh');
  });

  it('sandbox on 不受影響 —— 那條規則只在 off 時 enforce', () => {
    const r = inspectBody(enc('<script type="module">import x from "https://esm.sh/lodash";</script>'), 'on');
    expect(r.error).toBeUndefined();
  });
});

describe('掃描上限不該變成繞過的方法', () => {
  const big = (inner) => {
    const pad = '<!-- ' + 'x'.repeat(2 * 1024 * 1024) + ' -->';
    return new TextEncoder().encode(pad + inner).buffer;
  };

  it('sandbox off 的大檔案照樣掃,照樣擋', () => {
    const r = inspectBody(big('<script src="https://cdn.example.com/a.js"></script>'), 'off');
    expect(r.error).toBeDefined();
    expect(r.warnings.map((w) => w.code)).not.toContain('content-checks-skipped');
  });

  it('sandbox on 的大檔案維持原本行為:跳過並警告', () => {
    const r = inspectBody(big('<p>x</p>'), 'on');
    expect(r.warnings.map((w) => w.code)).toEqual(['content-checks-skipped']);
  });
});
