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

/** 在 opaque origin（CSP sandbox）底下會丟 SecurityError 或被拒絕的 API。 */
const STORAGE_API =
  /\b(?:localStorage|sessionStorage|indexedDB|BroadcastChannel|SharedWorker)\b|document\.(?:cookie|domain)|serviceWorker|\bNotification\s*[.(]/;

const DOC = 'docs/publishing-rules.md in https://github.com/clarencechien/imitator';

function thirdPartyHosts(html) {
  const hosts = new Set();
  for (const m of html.matchAll(THIRD_PARTY_SCRIPT)) hosts.add(m[1].toLowerCase());
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

  if (body.byteLength > SCAN_LIMIT) {
    warnings.push({
      code: 'content-checks-skipped',
      reason: `Body is ${Math.round(body.byteLength / 1048576)} MB, over the ${SCAN_LIMIT / 1048576} MB scan limit, so the third-party-script and storage-API checks did not run.`,
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
            'X-Sandbox: off drops the CSP sandbox, so this page runs with full same-origin access — its JavaScript can read every artifact the viewer is allowed to see, including group-only ones, and send them anywhere. Any third-party script it loads inherits that. This HTML loads scripts from: ' +
            hosts.join(', ') +
            '.',
          fix: `Inline those dependencies into the HTML (paste the library source into a <script> tag) and upload again. If the page does not actually need a storage API, drop X-Sandbox: off instead. See ${DOC}`,
        },
      };
    }
    return { warnings, html };
  }

  if (STORAGE_API.test(html)) {
    warnings.push({
      code: 'storage-api-with-sandbox-on',
      reason:
        'This HTML uses a storage API (localStorage, sessionStorage, indexedDB, document.cookie, Notification, serviceWorker or similar), but it was uploaded with X-Sandbox on. It will be served in an opaque origin, where those calls throw SecurityError — the page may break in the browser without any error reaching you.',
      fix: `Remove every third-party <script src>, then re-upload with X-Sandbox: off. See ${DOC}`,
    });
  }

  return { warnings, html };
}
