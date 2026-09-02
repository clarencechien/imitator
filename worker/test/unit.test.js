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
