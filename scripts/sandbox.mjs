// 一次上傳要送什麼 `X-Sandbox` —— 三支腳本共用的唯一判準。
//
// 以前這裡是一條啟發式正則(NEEDS_ORIGIN):HTML 裡出現 localStorage 之類的字樣
// 就送 off。那條規則有兩個方向都會錯:
//
//   誤判成 off  只是在內文裡「談到」localStorage 的技術文章,會被當成需要真實來源,
//               於是整頁拿到 imitator.ai-apps.work 的完整同源權限 —— 它的 JS 讀得到
//               這個來源上每一份讀者看得到的 artifact,包括 group-only 的。
//   悄悄復活    已經在站上收成 on、但本機檔案還是舊內容的報告,只要再跑一次
//               `migrate --force` 或再丟一次 inbox,就會以 off 重新上架。
//               kaburi-mockup-v3 就是這一種。
//
// off 是整站防護的破口,不該由一條字串比對來決定。所以改成**明確 opt-in**:
// 只有 HTML 開頭帶著
//
//     <meta name="imitator-sandbox" content="off">
//
// 才送 off,其餘一律 on。要例外的人必須在檔案裡寫下來,而那一行會出現在 diff 裡。
//
// 判定只看開頭 8 KB:meta 本來就該在 <head> 裡,而限制範圍才不會被內文裡剛好
// 出現同一串字的段落影響 —— 那正是舊規則犯的錯。

/** 只掃開頭這麼多個字元。字元不是位元組,但 meta 在 <head> 裡,差距無關緊要。 */
export const SANDBOX_META_WINDOW = 8 * 1024;

/** 需要真實來源時要寫進 HTML 的那一行。錯誤訊息與文件都引用這個常數。 */
export const SANDBOX_META_TAG = '<meta name="imitator-sandbox" content="off">';

const META_TAG = /<meta\b[^>]*>/gi;
const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim().toLowerCase() : null;
};

/**
 * @param {string} html 整份 HTML(只會看開頭 SANDBOX_META_WINDOW 個字元)
 * @returns {'on'|'off'} 要送出去的 X-Sandbox 值
 */
export function sandboxFor(html) {
  const head = html.slice(0, SANDBOX_META_WINDOW);
  for (const [tag] of head.matchAll(META_TAG)) {
    if (attr(tag, 'name') !== 'imitator-sandbox') continue;
    if (attr(tag, 'content') === 'off') return 'off';
  }
  return 'on';
}
