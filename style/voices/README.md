# voices/ — 六個答案，不是六個選項

`STYLE.md` 要求每篇報告在寫 CSS 之前先說出自己的**語域**（register），再從語域推導
聲音。這個資料夾是那條規則的證據和範例：六種聲音，每一種都對應 `archive/` 裡真的
存在的一類報告，內容也直接節錄自那些報告 —— 聲音是從題材長出來的，不是套上去的。

## 樣本從哪裡來

把 275 份舊報告全部渲染一次、量出每一份的視覺簽名（紙色、h1 級距與字面、標題裡有沒有
彩色字、眉標數、字族數、文字色數、深色模式、gradient、emoji 標題），再按這些特徵評分。
結果非常清楚：

| | 份數 |
|---|---|
| 「預設樣子」：h1 在 28–40px、內文 16px、白紙或深灰底 | **~250** |
| 有作者感（分數 ≥ 8）：大標題、彩字、眉標、有色的紙、三個字族 | **24** |

那 24 份**全部落在 2026-06 之後** —— 也就是模型換代之後。它們自己已經長出了幾個
可辨認的家族，六份樣張就是從那裡挑出來再往上做一層：

| 樣張 | 語域 | 對應的舊報告（可以直接開來看） | 聲音 |
|---|---|---|---|
| `epic.html` | **史詩** · 歷史、人物、訪談 | `actor` `uncle-bob` `frontier_vs_ecosystem` `layers-of-llm` | 暖紙、宋體、幕布紅、幕數眉標、公理卡 |
| `argument.html` | **論證** · 架構、方法論、選型 | `agent-arch` `agent-arch-2` `test-agent-arch` `loop-engineering` | 冷灰綠紙、壓縮體標題、紅色裁決、編號章節、詞彙表 |
| `digest.html` | **綜述** · 研究整理、傳說體檢 | `ai-amp-or-mir` `ai-amp-or-mirror-2` `llm-testing-essence` | 方格紙、宋體、綠＝證據／橘＝體感、核心結論框、TL;DR |
| `autopsy.html` | **驗屍** · 用資料檢驗流行說法 | `tw-stock-winner` `cb_story` `AI_premium` | 奶油紙、驗屍紅、檔案欄、一枚「判決」章、註解曲線 |
| `night.html` | **深夜** · 大數字、人口、房價 | `birthrate-vs-housing` `ai-economics` | 深藍底（天生深色）、金色的燈、waffle 圖、頁碼 |
| `fieldguide.html` | **手帖** · 旅遊、生活、購物決策 | `busan_v2` `busan_v1` `forties` | 海報色條、Archivo 的大字、速查磚、編號行前卡 |

還有兩個語域在舊報告裡存在、但這裡沒做樣張：**手冊**（`session-connectivity`
`kasanemu` `html-working-artifact`：目錄側欄、雙欄對照、等寬體）和**壓力測試**
（`bysq_report_tw_case` `forties` `four-percent-rule`：參數籤、四句話 TL;DR、編號卡）。
它們在 `STYLE.md` 的語域表裡有方向描述，沒有樣張。

## 這六份為什麼「不是範本」

每一份底部都寫著「這是六個答案之一，不是範本」。理由在 `STYLE.md` 的 reject list：
六份的紙色、accent、字面組合**都列進了禁止清單**。模型看它們是為了學「一個語域怎麼
推導出一種聲音」，不是為了挑一個來套。要不然一份範例就會變成一個範本，六份範例就會
變成一個六格選單 —— 那跟現在 250 份長一樣的問題只差在數字。

## 六份共用的東西（也就是底盤負責的）

內文 17–19px、行高 1.85；`.display` 加一個 `<em>`；`.eyebrow` 路標；表格包在
`.table-scroll`；圖表畫在 640 寬的 viewBox；深淺兩套都定義；`.progress` 閱讀進度；
`.reveal`／`.stagger` 只用在進場；列印時動畫全關。六份在 375／1440、淺／深各驗過，
沒有一份會橫向捲動。

## 重新產生

```bash
node style/voices/build.mjs
```

改了 `report.css` 要重跑，六份都會跟著更新。
