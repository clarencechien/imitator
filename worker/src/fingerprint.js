// 樣式指紋（style/STYLE.md 要求報告帶的 <meta name="imitator-*">）。
//
// 目的有兩個：
//   1. 知道一份報告是不是套了指引、套的是哪一版。
//   2. 累積「每一份選了什麼」—— 語域、參照物、紙色、重點色。這些會出現在
//      /v1/a 的列表裡，下一份報告寫之前先看，避開最近用過的顏色；日後也是
//      整理個人偏好的材料。
//
// 這裡只抽取、只做寬鬆的格式檢查，不擋。缺了或格式不對就當沒有 —— dumb host
// 不該因為一個 meta 標籤拒收一份報告。

/** 只認這幾個 key，其他一律忽略。 */
const KEYS = ['style', 'register', 'reference', 'paper', 'accent', 'generator'];

/** 每個欄位的上限與格式。style 是版本號；顏色只收 hsl() 或 hex。 */
const RULES = {
  style: { max: 16, re: /^v\d{1,3}$/ },
  register: { max: 120 },
  reference: { max: 160 },
  paper: { max: 40, re: /^(?:hsl\(\s*\d{1,3}(?:\.\d+)?\s+\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%\s*\)|#[0-9a-f]{6})$/i },
  accent: { max: 40, re: /^(?:hsl\(\s*\d{1,3}(?:\.\d+)?\s+\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%\s*\)|#[0-9a-f]{6})$/i },
  generator: { max: 80 },
};

/** 只掃 <head> 附近：指紋規定要放在最前面，掃整份 HTML 是白花 CPU。 */
const HEAD_LIMIT = 8 * 1024;

/** 任何一個 <meta …> 標籤；name 與 content 的先後順序不管。 */
const META_TAG_RE = /<meta\b[^>]*>/gi;
const NAME_RE = /\bname\s*=\s*["']imitator-([a-z]+)["']/i;
const CONTENT_RE = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * 從 HTML 抽出指紋。
 *
 * @param {string} html
 * @returns {Record<string,string>|null} 沒有 imitator-style 就回 null —— 其他欄位
 *   沒有版本號就沒有意義（不知道是照哪一版填的）。
 */
export function extractFingerprint(html) {
  const head = html.slice(0, HEAD_LIMIT);
  const out = {};
  for (const tag of head.matchAll(META_TAG_RE)) {
    const n = NAME_RE.exec(tag[0]);
    if (!n) continue;
    const key = n[1].toLowerCase();
    if (!KEYS.includes(key) || key in out) continue; // 第一個為準，重複的忽略
    const c = CONTENT_RE.exec(tag[0]);
    if (!c) continue;
    const raw = decodeEntities(c[1] ?? c[2] ?? '').replace(/\s+/g, ' ').trim();
    const rule = RULES[key];
    if (!raw || raw.length > rule.max) continue;
    if (rule.re && !rule.re.test(raw)) continue;
    out[key] = raw;
  }
  return out.style ? out : null;
}
