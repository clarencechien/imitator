// 上傳前的內容檢查。
//
// 這是對 spec「dumb host：收什麼吐什麼」的一個刻意偏離。偏離的範圍很窄：
// 我們**不改動 body**，只是拒絕一個已知危險的組合，並回一段能照著修的說明。
// 理由是那個組合的失敗方式太糟 —— 它不會當場壞掉，而是安靜地把整站的內容
// 曝露在某個第三方 CDN 之下，直到那個 CDN 哪天出事為止。
//
// 錯誤訊息一律用英文：推東西上來的多半是 LLM／agent，它要能直接讀懂原因並
// 自己修好，而不是把一坨中文貼給人類看。

/** 超過這個大小就跳過內容檢查 —— 掃描要花 CPU，而 Worker 的預算很小。 */
const SCAN_LIMIT = 2 * 1024 * 1024;

/** `<script src="https://...">` 或 protocol-relative 的 `//host/...`。 */
const THIRD_PARTY_SCRIPT = /<script\b[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\/([^"'\s/>]+)/gi;

/**
 * ES module 的第三方相依。`<script src>` 不是唯一一條路 —— 這幾種同樣是 runtime
 * 從別人的網域拉可執行程式碼進來,而 LLM 產生的頁面用 esm.sh / skypack 相當常見:
 *
 *   <script type="module">import x from "https://esm.sh/…"</script>
 *   import("https://cdn.jsdelivr.net/…")
 *   export * from "https://…"
 *
 * 這個 repo 自己知道這件事 —— `scripts/inline-cdn.mjs` 遇到 module import 會特別
 * 跳過並警告 —— 但 Worker 這一側先前沒有對應的檢查,於是「規則 1 是 enforced」
 * 這句話對 module import 是假的。
 *
 * 只在 sandbox off 時用來擋人,所以寧可寬一點也不要漏:內文裡剛好寫著
 * `import … from "https://…"` 的技術文章會被誤判,但那種頁面本來就不該要 off。
 */
const MODULE_IMPORT =
  /\b(?:import|export)\b[\s\S]{0,200}?["'](?:https?:)?\/\/([^"'\s/]+)/gi;

/**
 * `<link rel=stylesheet href="//host/…">`。字型的樣式表是允許的（見
 * docs/publishing-rules.md 規則 1），其他第三方樣式表則值得講一聲：報告要單檔
 * 自足，而外部樣式表是一個看不見的相依。
 */
const THIRD_PARTY_STYLESHEET =
  /<link\b(?=[^>]*\brel\s*=\s*["']?[^"'>]*stylesheet)[^>]*\bhref\s*=\s*["']?(?:https?:)?\/\/([^"'\s/>]+)/gi;

/** 字型服務 —— 樣式表不會執行程式碼，sandbox 下也沒有東西給它讀。 */
const FONT_HOSTS = /(?:^|\.)(?:fonts\.googleapis\.com|fonts\.gstatic\.com|fonts\.bunny\.net|use\.typekit\.net)$/i;

/** 在 opaque origin（CSP sandbox）底下會丟 SecurityError 或被拒絕的 API。 */
const STORAGE_API =
  /\b(?:localStorage|sessionStorage|indexedDB|BroadcastChannel|SharedWorker)\b|document\.(?:cookie|domain)|serviceWorker|\bNotification\s*[.(]/;

const DOC = 'docs/publishing-rules.md in https://github.com/clarencechien/imitator';

function thirdPartyHosts(html) {
  const hosts = new Set();
  for (const re of [THIRD_PARTY_SCRIPT, MODULE_IMPORT]) {
    for (const m of html.matchAll(re)) hosts.add(m[1].toLowerCase());
  }
  return [...hosts];
}

/**
 * 檢查即將寫入的 body。
 *
 * @param {ArrayBuffer} body
 * @param {'on'|'off'} sandbox 這次寫入生效的 sandbox 設定
 * @returns {{error?: object, warnings: object[], html?: string}}
 *   error 有值代表要擋下來（400）；warnings 會附在 200 的回應裡。
 *   html 是解碼後的內文（超過掃描上限時沒有）—— 給後面抽指紋用，省一次解碼。
 */
export function inspectBody(body, sandbox) {
  const warnings = [];

  // 掃描上限只適用於 sandbox on。sandbox off 是唯一一條會回 400 的規則,
  // 而「檔案大於 2 MB」不該是繞過它的方法 —— 那正好是內嵌了一堆東西的頁面,
  // 也就是最需要看一眼的那一種。對 25 MB 的字串跑幾個正則是幾十毫秒的事。
  if (sandbox === 'on' && body.byteLength > SCAN_LIMIT) {
    warnings.push({
      code: 'content-checks-skipped',
      reason: `Body is ${Math.round(body.byteLength / 1048576)} MB, over the ${SCAN_LIMIT / 1048576} MB scan limit, so the third-party-script and storage-API checks did not run. (Uploads with X-Sandbox: off are always scanned — that rule is enforced, not advisory.)`,
      fix: `Review the rules yourself: ${DOC}`,
    });
    return { warnings };
  }

  const html = new TextDecoder('utf-8', { fatal: false }).decode(body);

  if (sandbox === 'off') {
    const hosts = thirdPartyHosts(html);
    if (hosts.length > 0) {
      return {
        warnings,
        error: {
          error: 'third-party scripts are not allowed when X-Sandbox is off',
          reason:
            'X-Sandbox: off drops the CSP sandbox, so this page runs with full same-origin access — its JavaScript can read every artifact the viewer is allowed to see, including group-only ones, and send them anywhere. Any third-party code it pulls in inherits that. This HTML pulls code at runtime (via <script src>, a module import, or a dynamic import) from: ' +
            hosts.join(', ') +
            '.',
          fix: `Inline those dependencies into the HTML (paste the library source into a <script> tag) and upload again — that covers <script src>, \`import … from "https://…"\` and \`import("https://…")\` alike. If the page does not actually need a storage API, drop X-Sandbox: off instead. See ${DOC}`,
        },
      };
    }
    // off 是一個要付代價的例外：這一頁從此有完整的同源權限，讀得到這個來源上
    // 每一份使用者看得到的 artifact。唯一值得付的理由是它真的需要真實來源。
    // 掃不到任何 storage API 就代表沒有那個理由 —— 這是純粹的損失，講一聲。
    if (!STORAGE_API.test(html)) {
      warnings.push({
        code: 'sandbox-off-not-needed',
        reason:
          'This upload asked for X-Sandbox: off, but the HTML does not use any API that needs a real origin (no localStorage, sessionStorage, indexedDB, document.cookie, Notification or serviceWorker). Dropping the sandbox buys nothing here and costs a lot: the page gets full same-origin access and can read every artifact the viewer is allowed to see, including group-only ones.',
        fix: `Upload it again without the X-Sandbox header, or with X-Sandbox: on. See ${DOC}`,
      });
    }
    return { warnings, html };
  }

  // 非字型的第三方樣式表。不擋 —— 它不會執行程式碼，但它會讓報告不再自足，
  // 而且最常見的那一種（直接 link 這個 repo 的 report.css）是**保證失效**的：
  // raw.githubusercontent.com 用 text/plain 加 nosniff 送檔案，瀏覽器一定拒絕
  // 把它當樣式表套用。頁面於是安靜地少了整副底盤。
  const sheetHosts = new Set();
  for (const m of html.matchAll(THIRD_PARTY_STYLESHEET)) {
    const host = m[1].toLowerCase();
    if (!FONT_HOSTS.test(host)) sheetHosts.add(host);
  }
  if (sheetHosts.size > 0) {
    const raw = [...sheetHosts].some((h) => h === 'raw.githubusercontent.com');
    warnings.push({
      code: 'third-party-stylesheet',
      reason:
        'This HTML loads a stylesheet from ' +
        [...sheetHosts].join(', ') +
        '. A report here is meant to be one self-contained file, and an external stylesheet is a dependency nobody can see.' +
        (raw
          ? ' raw.githubusercontent.com serves files as text/plain with X-Content-Type-Options: nosniff, so browsers refuse to apply it as CSS at all — linking report.css that way silently drops the entire chassis.'
          : ''),
      fix: `Paste the stylesheet's contents into a <style> block instead of linking it. Webfont stylesheets are the one exception. See ${DOC}`,
    });
  }

  if (STORAGE_API.test(html)) {
    warnings.push({
      code: 'storage-api-with-sandbox-on',
      reason:
        'This HTML uses a storage API (localStorage, sessionStorage, indexedDB, document.cookie, Notification, serviceWorker or similar), but it was uploaded with X-Sandbox on. It will be served in an opaque origin, where those calls throw SecurityError — the page may break in the browser without any error reaching you.',
      fix:
        'Preferred: drop the storage calls. Per-view state (a theme, a language, a collapsed section) can live in a variable — default it from prefers-color-scheme or navigator.language instead. State the reader should keep belongs in an explicit export/import (a download plus a file picker), not in the browser. ' +
        `Only if the page genuinely needs a real origin, re-upload it with X-Sandbox: off — and note that off is refused outright while the page loads any third-party <script src>. See ${DOC}`,
    });
  }

  return { warnings, html };
}
