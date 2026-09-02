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

// ── 樣式稽核 ────────────────────────────────────────────────────────────────
//
// 靜態可判定的幾件事：底盤在不在、深色有沒有定義、有沒有踩到已知的 RWD 陷阱、
// 內聯圖有多重。**一律只回 warning，永遠不擋。**
//
// 為什麼要存下來而不只是回給上傳者：上傳者多半是 agent，它讀完就消失了。
// 要回答「這份指引到底有沒有被照做、哪一條最常被漏掉」，資料必須留在站上。
// 結果會進 customMetadata 與 /v1/a 的列表，`scripts/style-census.mjs --audit`
// 就是拿它算的。
//
// 每一條都必須是**低誤判**的正規式判斷 —— 誤判會讓這份資料變成雜訊，那比沒有
// 資料更糟。判斷不了的（內文級距、對比、實際版面）需要把頁面渲染出來，那不是
// Worker 該做的事，所以這裡不碰。

const DOC = 'style/STYLE.md in https://github.com/clarencechien/imitator';

/** 底盤的第一行註解 —— 原封不動貼進去的話一定會有這串。 */
const CHASSIS_MARKER = /imitator report chassis/i;

/** 深色的兩種宣告方式，任一即可。 */
const DARK_SCHEME = /prefers-color-scheme\s*:\s*dark|\[data-theme\s*=\s*["']?dark/i;

/** grid track 的預設下限是 min-content，裸的 1fr 會被格子裡不能斷的字串撐開。 */
const GRID_DECL_RE = /grid-template-columns\s*:([^;}]*)/gi;

/** 內聯圖：單一 data: URI 超過這個大小就值得知道。 */
const HEAVY_IMAGE = 400 * 1024;
const DATA_URI_RE = /data:image\/[a-z.+-]+;base64,([A-Za-z0-9+/=]+)/gi;

/**
 * 把 minmax(...) 整段拿掉之後還剩裸的 fr，才算踩到。
 *
 * 用括號深度掃描而不是正規式：minmax() 裡面常常巢狀 min()／clamp()
 * （底盤自己的 .cols 就是 `repeat(auto-fit, minmax(min(100%, 19rem), 1fr))`），
 * 用正規式剝括號會剝不乾淨，然後把每一份貼了底盤的報告都誤判成踩到。
 */
function stripMinmax(decl) {
  let out = '';
  for (let i = 0; i < decl.length; i++) {
    const rest = decl.slice(i);
    const m = /^minmax\s*\(/i.exec(rest);
    if (!m) { out += decl[i]; continue; }
    let depth = 0;
    let j = i + m[0].length - 1; // 指在 '(' 上
    for (; j < decl.length; j++) {
      if (decl[j] === '(') depth++;
      else if (decl[j] === ')' && --depth === 0) break;
    }
    out += ' ';
    i = j; // 跳過整組 minmax(...)；沒有閉括號就跳到結尾
  }
  return out;
}

function hasBareFrTrack(css) {
  for (const m of css.matchAll(GRID_DECL_RE)) {
    if (/(^|[\s,(])\d*\.?\d*fr\b/.test(stripMinmax(m[1]))) return true;
  }
  return false;
}

/**
 * 稽核一份 HTML 對 STYLE.md 的遵守程度。
 *
 * @param {string} html 解碼後的內文
 * @param {Record<string,string>|null} fingerprint extractFingerprint() 的結果
 * @returns {{codes: string[], warnings: object[]}}
 *   codes 存進 metadata 供統計；warnings 回給上傳者，每一條都寫得出怎麼修。
 */
export function auditStyle(html, fingerprint) {
  const codes = [];
  const warnings = [];
  const add = (code, reason, fix) => {
    codes.push(code);
    warnings.push({ code, reason, fix });
  };

  // 沒有指紋就完全不稽核。一份沒宣稱要照指引做的 HTML（275 份舊報告、
  // 隨手推上來的東西）不該被念 —— 而「有沒有套用」本來就從列表的 style: null
  // 數得出來，不需要靠警告。稽核只針對宣稱照做的那些：它們的失敗才有意義。
  if (!fingerprint) return { codes, warnings };

  if (!CHASSIS_MARKER.test(html)) {
    add(
      'no-chassis',
      `The fingerprint says ${fingerprint.style}, but style/report.css does not appear in the page. Readability, responsiveness, dark mode and print all come from that file.`,
      `Paste report.css verbatim into a <style> block, then override its tokens after it. See ${DOC}`,
    );
  }

  if (!DARK_SCHEME.test(html)) {
    add(
      'single-colour-scheme',
      'No dark-mode values are declared. Readers whose system is dark get the light palette, or an unstyled inversion.',
      'Redefine the tokens under both @media (prefers-color-scheme: dark) and :root[data-theme="dark"], with values chosen for a dark surface rather than inverted.',
    );
  }

  if (hasBareFrTrack(html)) {
    add(
      'bare-fr-grid-track',
      'A grid-template-columns declaration uses a bare fr track. A grid track\'s default minimum is min-content, so one unbreakable string in a cell — a URL, an OAuth scope, a long identifier — can widen the track past the viewport and scroll the whole page sideways. The page may look fine today and break when its content changes.',
      'Use minmax(0, 1fr) instead of 1fr and give the grid children min-width: 0, or use the chassis .cols / .tiles which already do both.',
    );
  }

  for (const m of html.matchAll(DATA_URI_RE)) {
    // base64 的 4 字元對應 3 bytes
    const bytes = Math.floor((m[1].length * 3) / 4);
    if (bytes > HEAVY_IMAGE) {
      add(
        'heavy-inline-image',
        `An inlined image is about ${Math.round(bytes / 1024)} KB. It breaks no rule, but every reader downloads it before the page settles.`,
        'Crop it, scale it to the width it is actually displayed at, or re-encode it — a screenshot of text rarely needs more than 200 KB.',
      );
      break; // 一份報告講一次就夠了
    }
  }

  return { codes, warnings };
}
