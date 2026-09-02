# style/ — 報告的底盤與風格指引

這裡的報告不是工業化的產出，是**要說服人的文章** —— 傳一個概念、一種技術、一個看法。
所以立場是：**每一篇本來就該長得像有人做過它**，不該是同一個模板換掉文字。

`report.css` 因此不是「統一樣式」，是一副**底盤**：只固定那些不論什麼聲音都必須做對
的事，其餘全部交給寫報告的模型自己決定。

| 固定 | 交出去 |
|---|---|
| 可讀性（內文 17px 起跳、行高 1.85、量到 34 個字的行長）| 紙色、墨色、重點色 |
| 結構與間距的節奏 | 三個字面分別派給誰 |
| RWD（不橫捲、圖表與表格各自捲、tap target）| 標題多大、哪個字上色 |
| 深淺兩套配色的**契約**（值由報告自己給）| 分節怎麼標、用哪些編輯手法 |
| 動態的衛生（只做進場、只動 transform／opacity、尊重 reduced-motion、列印時關掉）| 要不要動態 |
| 圖表的色序 | — |

## 檔案

| | 誰讀 | |
|---|---|---|
| `report.css` | 貼進報告 | 底盤。**原封不動**內聯進 `<style>`，再用第二個區塊覆寫 token |
| `STYLE.md` | 產生報告的模型 | 怎麼找到這一篇的聲音、硬規則、negative list。英文、與工具無關 |
| `mockup.html` | 人 | 範例。由 `build.mjs` 產生，不要手改 |
| `build.mjs` | — | 內聯 CSS、算圖表座標 |

丟給模型的網址：

```
https://raw.githubusercontent.com/clarencechien/imitator/main/style/STYLE.md
https://raw.githubusercontent.com/clarencechien/imitator/main/style/report.css
```

`STYLE.md` 刻意是**與工具無關的英文 markdown**，不是 Claude Code 的 `SKILL.md` ——
報告的產生者裡有 Gemini 和 GPT，它們不讀 `.claude/skills/`。要包一層 Claude skill
就讓它指向這兩個檔案，不要抄一份過去。

## 改東西的流程

```bash
node style/build.mjs      # 改完 report.css 一定要重跑，否則 mockup 會漂
```

然後在瀏覽器開 `style/mockup.html`，**375px、1440px、深色、列印各看一次**。

## 幾個不要憑感覺改的地方

**圖表配色不是品味問題。** `--c1` 到 `--c6` 是驗證過的預設 palette。手調的暖色版本
先試過，四個顏色彩度不足會讀成灰，而 `#7a4a63↔#4a5a86` 在紅色盲下 ΔE 5.9（門檻 8）、
正常視覺 9.5（硬性下限 15）—— 一般人都分不出來。現在這組對四個底色各驗過一次。
要換先跑 dataviz skill 的 `validate_palette.js`。淺色模式下有三個系列色低於 3:1 對比，
補償是每張圖都要附 `<details class="datatable">` 表格，那不是裝飾。

**圖表畫在 640 寬的 viewBox 上、文字 12px。** viewBox 會把文字一起縮放：720 寬的圖在
375px 螢幕上標籤只剩 6px。CSS 把渲染寬度夾在 34–44rem，比下限窄就在自己的框裡橫捲。
改 viewBox 寬度就要重算那兩個界線。

**`.wide` 只用實際存在的留白來加寬。** 它刻意不用 `width` ＋ `50%` margin 那種常見的
breakout —— 那個百分比會對到錯的框，在 1440px 下把頁面推出去 80px。而且 `.wide` 一定
要宣告在其他元件之後：任何用 `margin` 簡寫的元件都會把它依賴的 inline margin 歸零。

**動態不能藏內容。** `.reveal` 用 scroll-driven animation，未進場時是 `opacity: 0`。
所以列印時必須把它整個關掉，否則整篇印出來是空白 —— `@media print` 裡那條
`animation: none !important` 是這個原因，不要拿掉。`prefers-reduced-motion` 則是靠
把整段 `.reveal` 包在 `no-preference` 裡處理的。

**字型可以在 runtime 抓，script 不行。** 樣式表不會執行程式碼，sandbox 底下那一頁也
沒有東西給它讀。只有 `X-Sandbox: off` 的頁面要連字型一起內聯。

## 中文標題的一個技巧

Google Fonts 沒有壓縮體或展示用的中文字面。把**拉丁展示字放第一順位、中文字放後面**，
拉丁字取展示字面、中文落回思源黑 —— 這樣標題有質地，而不需要一個不存在的中文展示字型。

```css
--disp: "IBM Plex Sans Condensed", "Noto Sans TC", sans-serif;
```

`mockup.html` 用的是另一種：中文標題直接上思源宋，跟內文的思源黑拉開質地差。

## 已知還沒做的

`STYLE.md` 要求報告帶 `<meta name="imitator-style" content="v2">`，但
`worker/src/policy.js` 還不會檢查它，所以「這份指引有沒有被套用」目前答不出來。
要做的話是回 warning、不是擋。
