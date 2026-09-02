# style/ — 報告的樣式資產

275 份報告出自四個不同的模型、橫跨十六個月，長得各不相同。這個資料夾是往前修的
辦法：**產生的時候就套上同一份樣式**，不回頭改舊的。

舊的不改是算過的 —— 231 份把 Tailwind 和自寫 CSS 混在一起，機械式改寫會跟既有
規則打架；用 LLM 重寫則是 275 次「內容有沒有被改壞」的驗證成本，而報告的價值在
內容不在外觀。

## 檔案

| | 誰讀 | |
|---|---|---|
| `report.css` | 貼進報告 | 唯一的真實來源。**原封不動**內聯進 `<style>` |
| `STYLE.md` | 產生報告的模型 | 指令：流程、class API、RWD 檢查表、negative list。英文 |
| `mockup.html` | 人 | 範例，單檔。由 `build.mjs` 產生，不要手改 |
| `build.mjs` | — | 把 `report.css` 內聯進 mockup，順便算好圖表座標 |

丟給模型的就這兩個網址：

```
https://raw.githubusercontent.com/clarencechien/imitator/main/style/STYLE.md
https://raw.githubusercontent.com/clarencechien/imitator/main/style/report.css
```

`STYLE.md` 刻意寫成**與工具無關的英文 markdown**，不是 Claude Code 的 `SKILL.md`
—— 報告的產生者裡有 Gemini 和 GPT，它們不讀 `.claude/skills/`。要包一層 Claude
skill 的話，讓它指向這兩個檔案就好，不要把內容抄一份過去。

## 為什麼是一份 CSS，不是一段文字

一份寫著「用克制的中性色、適當的留白」的指南，四個模型會給你四種詮釋 —— 那是
現在這個問題的比較輕微版本，不是解法。真正讓跨模型輸出一致的是**一份它們照抄的
具體檔案**：這把「生成問題」降級成「複製問題」，而複製是 LLM 少數做得穩的事。

而且它不增加成本：報告本來就必須單檔內聯、不准 runtime 抓 CDN。

## 改東西的流程

```bash
node style/build.mjs                 # 改完 report.css 一定要重跑，否則 mockup 會漂
```

然後在瀏覽器開 `style/mockup.html`，**375px 寬和深色模式各看一次**。頁面不可以
橫向捲動、圖表要跟著縮、表格在自己的框裡捲。

## 三個不要憑感覺改的地方

**配色。** `--c1` 到 `--c6` 是驗證過的預設 palette，不是挑的。手調的暖色版本先
試過，四個顏色彩度不足會讀成灰，而 `#7a4a63↔#4a5a86` 在紅色盲下 ΔE 5.9（門檻
8）、正常視覺 9.5（硬性下限 15）—— 也就是說一般人都分不出來。現在這組對本檔
自己的四個底色（`#fbfbfa`／`#ffffff`／`#191917`／`#222220`）各驗過一次，全過。
要換的話先跑 dataviz skill 的 `validate_palette.js`，不要用眼睛判斷。

淺色模式下有三個系列色低於 3:1 對比，規範的補償是「數字要另有出處」，所以
`STYLE.md` 要求每張圖都附一個 `<details class="datatable">` 表格。那不是裝飾。

**圖表的 640 寬 viewBox。** viewBox 會把文字一起縮放：720 寬的圖在 375px 螢幕上
標籤只剩 6px，技術上 responsive、實際上看不見。CSS 把渲染寬度夾在 34–44rem，
比下限窄就在自己的框裡橫捲（跟 `.table-scroll` 同一個做法），文字因此在任何裝置
上都落在 10–13px。改 viewBox 寬度就要重算這兩個界線。

**字型是偏好，不是保證。** `--sans` 把 `"Noto Sans TC"` 放第一順位，有裝的人
（Android、多數 Linux）拿到它，macOS／Windows 掉回蘋方／微軟正黑。沒有載入
webfont，因為那違反不准抓 CDN 的規則。要每個讀者都看到同一套字，只有「子集化
Noto ＋ base64 內聯」一條路，而那需要建置步驟，寫報告的 LLM 跑不了 —— 真要做
就是另一支像 `scripts/inline-cdn.mjs` 的後處理腳本。

## 已知還沒做的

`STYLE.md` 要求報告帶 `<meta name="imitator-style" content="v1">`，但
`worker/src/policy.js` **還不會檢查它**。也就是說「這份指南到底有沒有被套用」
目前答不出來（275 份裡是 0）。要做的話是回 warning、不是擋 —— dumb host 的定位
不該因為美觀而變成守門員。
