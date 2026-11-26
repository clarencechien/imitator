# Q41 · AI 機房最缺的不是晶片，是插頭？

- 題庫編號：Q41　類別：AI／能源、產業（台達電）
- 研究日期：2026-11-25（下文「查詢日」都是這天）
- 驗證標記：**【原文】** 表示已開原始頁面核對；**【轉述】** 表示只看到二手整理，精煉成報告前要再開原文
- 結論：**建議做成報告**。主軸需要的電網數字已經從 PJM 原始文件核對過（【原文】）。台達電的財務數字還是媒體整理的版本，精煉前要對法說簡報和公開資訊觀測站。
- 本稿附圖：`q41_fig1_pjm_capacity_price.png`（圖 1）、`q41_fig2_grid_to_chip.png`（圖 2）
- 執行說明：研究做到一半，查詢工具的額度用完了。台達財務、台灣電網、IEA／LBNL 這幾塊，沿用 R04 在 2026-11-22 的查核結果，本稿沒有重開。每一列都標了出處，缺口集中寫在「還沒查到的」。

---

## 要回答的一個問題

**AI 機房現在卡住的，到底是晶片還是電？台達電站在哪一段？**

**主軸（一句話）**：2026 年秋天這三件事（NVIDIA 認證、電網排隊、電源廠併購）指的是同一個瓶頸，也就是從電網接點到晶片的那條供電鏈。這條鏈裡最慢的一段在機房外面的電網，要用「年」來算。台達電賣的是機房裡面那一段，所以機櫃越來越耗電，它能賺到錢；但電網要等多久，它管不到。

副問題（報告可以分節回答）：
1. 三件新聞各自發生了什麼？分別落在供電鏈的哪一段？（圖 2）
2. 電網那一段有多慢、多貴？（PJM 拍賣價、短缺量、備援採購延期）
3. 台達電站在哪一段？賺到什麼、又被什麼拖累？（併入 R04：AI 營收占比、股價為什麼先漲後跌）
4. 台灣的「插頭」在哪裡？為什麼台灣卡的是地點，不是總量？
5. 這批新聞原本怎麼寫，我們怎麼寫？（報告最後一小節）

## 一段話答案

一般人的直覺是「AI 缺的是晶片」。2026 年秋天的數字指向另一邊：美國最大的電網 PJM 容量拍賣連三次撞到價格上限，2028/29 年度還差約 6.8 GW，新增的發電卻只有約 0.5 GW。同一時間，NVIDIA 開始認證的東西是電池和冷卻機，不是 GPU。所以標題問的「插頭」大致成立：最慢的一段是電網接點，設備廠能做的是把機房裡那一段做得更快、更省；台達電屬於這一邊。這也說明了為什麼台達第三季營收創新高，公司卻把存貨跌價歸因於客戶機房延後。目前不確定兩件事：晶片端是不是已經不缺，本稿沒查；PJM 只是美國的一個電網，台灣的瓶頸是電要接在哪裡，不是電夠不夠。

## 數據

> 查詢日都是 2026-11-25，除非另外註明。正文只放三張表，原始數字序列放「附錄：完整數據」。

**圖 1**：PJM 容量拍賣結清價，2018/19 到 2028/29 交付年度（`q41_fig1_pjm_capacity_price.png`）。
2024/25 年度每 MW 每天 29 美元，兩年後是 329 美元，大約 11 倍。之後連三次撞上限。如果不設上限，PJM 自己模擬的價格是 555 美元。

**圖 2**：從電網到晶片的五段（`q41_fig2_grid_to_chip.png`），以及這批新聞各落在哪一段：
① 電網容量（PJM）→ ② 場址電力（DSX Ready 的電池、Flex 收購的 EPC Power）→ ③ 機房配電（台達 800VDC 電源櫃、Vertiv 和 Infineon 的功率元件協議）→ ④ 機櫃與散熱（DSX Ready 的 CDU、台達 2.5 MW CDU）→ ⑤ 晶片端（Navitas 收購的 Claros）。
台達的主場在 ③④。

### 表 1　三件事的原始事實

| 事實／數字 | 資料期間 | 來源 | 驗證 |
|---|---|---|---|
| **電網｜** PJM 2028/29 容量拍賣全區結清價 325 美元／MW-日，就是價格上限，連續第三次撞上限；上一次 2027/28 是 333.44 美元 | 2026-07-14 公布；交付年 2028/6–2029/5 | [PJM 2028/2029 BRA Report](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2028-2029/2028-2029-bra-results-report.pdf) | 【原文】 |
| **電網｜** 總共買到 149,181.6 MW，比可靠度需求少 **6,831.3 MW**（上一次少 6,516 MW）。備用容量率 14.4%，目標是 20% | 同上 | 同上 | 【原文】 |
| **電網｜** 新增和升級的發電只有 **524.7 MW**，不到缺口的十分之一。預測負載增加 1,374.5 MW，原文寫「largely due to additional Large Loads」（主要來自新增的大型負載） | 同上 | 同上 | 【原文】 |
| **電網｜** 如果不設上限，模擬結清價是 554.72 美元（ComEd 區 776.69 美元），總金額會多 133 億美元 | 同上（附錄模擬） | 同上 | 【原文】 |
| **電網｜** 可靠度備援採購（Reliability Backstop Procurement，PJM 用來補缺口的一次性長約採購）：FERC 9/29「largely accepted」但暫緩五個月執行。PJM 10/29 提出修正案，2027-03-01 開標、3/28 截標、5/10 公布結果；合約最長 15 年，加權平均價上限 555 美元／MW-日，目標約 6,800 MW，成本分攤給大型負載的成長 | 2026-09-29 至 2026-10-29 | [PJM Inside Lines 2026-10-29](https://insidelines.pjm.com/pjm-files-amended-reliability-backstop-proposal/) | 【原文】（FERC 命令本文沒開） |
| **電網｜** 備援採購原本預定 2026 年 9 月開標 | 2026-07 | [Utility Dive 2026-07-02](https://www.utilitydive.com/news/pjm-backstop-procurement-connect-manage-data-centers/824317/)、[Utility Dive 2026-09](https://www.utilitydive.com/news/pjm-delays-backstop-procurement-ferc-data-center/831751/) | 【轉述】（只看到搜尋摘要） |
| **電網｜** 2026-07-22，約 **3.9 GW** 的資料中心因為一次例行輸電擾動，同時從電網切到自備發電，是 PJM 史上最大的一次。PJM 11/16 向 FERC 提案，要求 50 MW 以上的「大型運算負載」符合電壓、頻率穿越規範（電網短暫擾動時不能自己跳開），擬 2027-01-16 生效。PJM 現有這類負載約 10 GW，預估 2030 年前最多再增加 30 GW | 2026-07-22 至 2026-11-16 | [PJM Inside Lines 2026-11-16](https://insidelines.pjm.com/pjm-proposes-new-rules-to-protect-grid-reliability-as-data-center-demand-grows/) | 【原文】 |
| **電網｜** 賓州公用事業委員會委託的研究：參考情境下，PJM 在 2027–2030 年都達不到自己的可靠度標準；嚴重情境下，2030 年起每年超過 13 次缺電事件 | 2026-09-14 發布 | [PA PUC 新聞稿](https://www.puc.pa.gov/press-release/2026/puc-study-warns-rapid-data-center-growth-could-pose-serious-risks-to-electric-reliability-09142026) | 【轉述】（原頁沒開成功，只看到搜尋摘要） |
| **電網｜** LBNL〈Queued Up〉：美國排隊等併網的發電加儲能約 2,060 GW；2025 年完工的案子，從申請到運轉的中位數超過 5 年 | 資料到 2025 年底 | [LBNL](https://emp.lbl.gov/queues) | 【轉述】（R04 查詢時 403） |
| **電網｜** IEA：全球資料中心用電 2025 年 485 TWh，2030 年 950 TWh | 2026-04 報告 | [IEA Energy and AI](https://www.iea.org/reports/energy-and-ai) | 【轉述】（R04 查詢時 403） |
| **認證｜** NVIDIA DSX Ready 2026-09-21 上線，最初兩類是 CDU（冷卻液分配單元，液冷系統裡負責調節冷卻液流量和溫度的機器）和 BESS（電池儲能系統），之後加了第三類 Coolant（PG25 冷卻液）。頁面列出的 BESS 廠商是 Hitachi Energy、LGES Vertech、Tesla；CDU 是 LG Electronics、LiquidStack、Vertiv。**頁面上沒有台達** | 頁面建立 2026-09-21，更新 2026-10-23 | [NVIDIA DSX Ready](https://www.nvidia.com/en-us/data-center/products/dsx/dsx-ready/) | 【原文】（marketplace 完整清單沒開） |
| **認證｜** BESS 的認證說明寫「resilient, grid-aware operations」（能撐住、懂電網的運轉）。NVIDIA 同時有一個軟體產品 DSX Flex，描述是「Coordinate AI workloads with grid conditions and site power」（依電網狀況和場址電力調度 AI 運算） | 同上 | 同上 | 【原文】 |
| **認證｜** Vertiv 9/21：2.3 MW CoolChip CDU 是「the first CDU to qualify specifically as NVIDIA DSX Ready」（第一款取得 DSX Ready 的 CDU）。CDU 的認證用 NVIDIA 的自我驗證套件。新聞稿自己寫明：「Qualification does not replace the engineering required for a particular site or configuration」（認證不能取代個別場址、個別配置需要的工程） | 2026-09-21 | [Vertiv 新聞稿](https://www.vertiv.com/en-us/about/news-and-events/corporate-news/2026/vertiv-coolant-distribution-unit-qualified-as-nvidia-dsx-ready-for-ai-factory-infrastructure/) | 【原文】 |
| **供應｜** Vertiv 與 Infineon 簽三年策略協議，內容是矽和碳化矽功率半導體的供應，涵蓋 800 VDC 電源系統 | 2026-11-04 | [PR Newswire（Morningstar 轉載）](https://www.morningstar.com/news/pr-newswire/20261104cl88290/vertiv-and-infineon-deepen-strategic-partnership-for-critical-power-infrastructure) | 【轉述】（原文頁抓取失敗，只看到搜尋摘要） |
| **併購｜** Flex 以 **現金 44 億美元** 收購 EPC Power，企業價值鎖定在 2026-06-30 | 8-K 2026-09-03 | [Flex 8-K](https://www.sec.gov/Archives/edgar/data/0000866374/000119312526382496/d108491ddefa14a.htm) | 【原文】 |
| **併購｜** Flex 10/14 完成收購。EPC Power「more than 15 GW deployed」（已部署超過 15 GW），技術用在電網穩定和備援電力，平台支援 800V。Flex 計畫 2027 年第一季把雲端與電力基礎設施部門分拆，成為獨立上市的 Axiom Solutions International | 2026-10-14 | [Flex 8-K 附件 99.1](https://www.sec.gov/Archives/edgar/data/0000866374/000119312526421058/d147467dex991.htm) | 【原文】 |
| **併購｜** Navitas 8/24 宣布收購 Claros，交易價值最高約 **2.33 億美元**。Claros 做垂直供電和整合式電壓調節（把電源轉換直接放在晶片正下方，電流只走幾公釐）。Navitas 宣稱 2030 年可服務市場因此翻倍，到 80 億美元以上。原文：「Compute itself is not the bottleneck; it is the power delivery.」（運算本身不是瓶頸，供電才是。）這是廠商說法 | 2026-08-24 | [Navitas 8-K 附件 99.1](https://www.sec.gov/Archives/edgar/data/0001821769/000110465926100478/tm2623854d1_ex99-1.htm) | 【原文】 |
| **併購｜** 2026-10-06 完成收購；成交時支付約 2.16 億美元，其中現金約 1.25 億 | 2026-10 | [Navitas 10-Q](https://www.sec.gov/Archives/edgar/data/0001821769/000162828026069551/nvts-20260930.htm)、[Power Electronics News](https://www.powerelectronicsnews.com/navitas-breaking-the-power-wall-with-ivr-vpd-claros-planned-acquisition/) | 【轉述】（10-Q 有開，但抓到的內容沒有這一段；日期來自搜尋摘要） |
| **台達｜** 9 月發表 800VDC 供電加液冷的整合方案，對應 NVIDIA DSX AI 工廠；OCP 峰會（10 月中）展出 800 VDC 2.5 MW 液對液 CDU，以及給 Vera Rubin NVL72 用的冷板；SC26（11 月中）再展出由 800 VDC 供電的 2.5 MW 列間液對液 CDU | 2026-09 至 2026-11 | [Power Electronics News 2026-09-25](https://www.powerelectronicsnews.com/delta-integrates-800-vdc-power-and-cooling-for-ai-factories/)、[PR Newswire OCP](https://www.prnewswire.com/news-releases/delta-highlights-collaboration-with-nvidia-in-advancing-energy-efficient-800-vdc-power-and-cooling-solutions-for-ai-data-centers-at-ocp-global-summit-2026-302909912.html)、[HPCwire SC26](https://www.hpcwire.com/off-the-wire/delta-electronics-showcases-ai-data-center-cooling-solutions-at-sc26/) | 【轉述】（只看到搜尋摘要；都是發表，沒有出貨數字） |
| **800V 時程｜** NVIDIA 2025-05 寫 800 VDC「starting in 2027」（2027 年開始）；2025-10 改成「will occur in phases」（分階段進行），不再寫年份 | 2025-05、2025-10 | [NVIDIA 2025-05](https://developer.nvidia.com/blog/nvidia-800-v-hvdc-architecture-will-power-the-next-generation-of-ai-factories/)、[NVIDIA 2025-10](https://developer.nvidia.com/blog/building-the-800-vdc-ecosystem-for-efficient-scalable-ai-factories/) | 【原文】（R04 於 11/22 開過，本稿沒重開） |

### 表 2　台達電：AI 占比、800V 進度、股價（併入 R04，全部【轉述】）

| 事實／數字 | 資料期間 | 來源 | 驗證 |
|---|---|---|---|
| 營收：2024 年 4,211 億元，2025 年 5,548.85 億元（年增約三成），2026 前三季 5,396.68 億元，已經接近 2025 全年 | 2024–2026 Q3 | [自由財經](https://ec.ltn.com.tw/article/breakingnews/5351492)、[科技新報](https://finance.technews.tw/2026/10/12/delta-electronics-q3-revenue-nears-200-billion-record-high-q4-double-digit-growth) | 【轉述】 |
| AI 占比：2025 年 AI 電源約兩成多、液冷約 9%，合計約三成（科技新報另寫 18%，口徑不同）；2026 Q3「AI 相關資料中心營收接近 50%」，液冷約 250 億元、約 13% | 2025、2026 Q3 | [數位時代](https://www.bnext.com.tw/article/90178/2026-delta-earnings-call)、[StockFeel](https://www.stockfeel.com.tw/%E5%8F%B0%E9%81%94%E9%9B%BB-2308-2026q3-%E6%B3%95%E8%AA%AA%E6%9C%83/)、[工商時報](https://www.ctee.com.tw/news/20261030700682-430201) | 【轉述】，口徑要對法說簡報 |
| 2026 Q3：營收 1,970.59 億元（單季新高），毛利率 34.1%（比上季少 1.5 個百分點），存貨跌價約 39 億元。公司歸因於料件錯配，以及客戶拉貨時程（資料中心建置延後） | 2026 Q3 | StockFeel、工商時報 | 【轉述】（原因是公司說法，不當成因果） |
| 800V 進度：±400V 產品第三季開始部分出貨；800V「主要由 NVIDIA 推動而非資料中心營運商，速度看起來較慢」（整理者的文字）；800V 大量出貨要到 2027 年 | 2026-07 至 2026-10 | StockFeel、[科技新報 2026-07-09](https://finance.technews.tw/2026/07/09/delta-june-ai-power-hvdc/) | 【轉述】 |
| 股價：2026 年高點 2,585 元，10/30 跌停到 1,335 元，從高點回檔約 48% | 2026-10-30 | 工商時報 | 【轉述】，11 月股價沒查 |

**圖 3（等正式數字再畫）**：台達「AI 相關營收占比」的時間線（2025 年約三成，2026 Q3 接近五成），上面疊一條股價線。重點是讓人看到占比和股價分岔的時間點。占比口徑沒對到法說簡報之前不出圖。

### 台灣這一格

（以下沿用 R04 在 2026-11-22 的查核，本稿沒重開）

- **北部 5 MW 限制**：台電 2023 年 9 月起，暫緩桃園以北 5 MW 以上資料中心的用電申請（[工商時報 2026-07-15](https://www.ctee.com.tw/news/20260715701293-430503)，R04 標【原文】）。
- **2026 年有條件鬆綁**：資料中心要設在大潭或協和電廠附近「約2公里左右」，台電「先以個案申請來看」；目前申請設置的 AI 資料中心多在 30–50 MW。台電董事長曾文生的說法是「AIDC設置是location問題」（[經濟日報 2026-07-26](https://money.udn.com/money/story/7307/9652285)，R04 標【原文】；2 公里是部長口頭說法，不是法規條文）。
- **總量**：能源署〈114年度全國電力資源供需報告〉已經估入約 1.2 GW 的 AI 資料中心，「還有餘裕，可以再準備2G到3G」；2026 年夜尖峰預估 38,840 MW（[自由時報](https://ec.ltn.com.tw/article/paper/1759427)，【轉述】）。
- **跟美國不同的地方（推論）**：台灣沒有 PJM 那種容量拍賣，電由台電單一窗口供應。所以台灣的「插頭」不會表現成拍賣價格暴漲，而是表現成「哪裡准接、等多久核准」。
- **尺度換算**：PJM 7/22 那次一口氣跳開的 3.9 GW，約等於台灣 2026 年夜尖峰預估的一成。這個比例用的夜尖峰是【轉述】數字，精煉前要再核。
- **沒找到**：北部鬆綁後第一個核准案；台達在台灣 AI 機房的接單金額。查過的範圍是 R04 引用的媒體報導，台電專題頁 R04 查詢時 403。

## 大家怎麼說（溫度計）

> 這次查詢額度用完，沒能搜 PTT、Threads、X 的原貼文。下面三則是本次實際讀到的說法。精煉前要補一到兩則有日期的社群原貼文。

1. **「設備準時到貨也不代表場址已經有電可用」**
   出處：Clarence 公司電子報 FEATURE 01（2026-11，AI 撰寫）。
   - 對的地方：這句其實就是主軸，PJM 的數字完全支持。
   - 不對的地方：它被埋在第二段後半，沒有變成整篇的結論。
   - 事實要修三處：PJM 修正案是 10/29 提出的，不是「11 月上旬」；「首款 DSX Ready CDU」是 Vertiv 自己的措辭，NVIDIA 上線時同時列了三家 CDU；Vertiv 和 Infineon 的「長期」協議是三年。

2. **「Compute itself is not the bottleneck; it is the power delivery.」**（運算本身不是瓶頸，供電才是）
   出處：Navitas 收購 Claros 新聞稿，2026-08-24。這是廠商的宣傳句，不是中立判斷。
   - 對的地方：方向和 PJM 數字一致。
   - 不對的地方：說這句話的是賣供電晶片的公司，它當然會這樣說。晶片端現在是不是真的不缺，本稿沒有數據，不能替它背書。

3. **「AI 的盡頭是電力」**
   台灣財經媒體和社群常見的說法，原始出處和日期這次沒查到。
   - 對的地方：電確實是目前最慢的一段。
   - 不對的地方：「盡頭」暗示電會用完，數字講的是「慢」和「貴」。PJM 自己說短缺不等於停電；台灣能源署說總量還有 2–3 GW 餘裕，卡的是地點。

## 反方

1. **短缺不等於停電（PJM 自己）**。PJM 拍賣報告寫：「Such a shortage does not necessarily mean that the PJM system will be unable to serve load reliably」（這樣的短缺不代表系統一定無法可靠供電），意思是備轉變薄、風險變高（【原文】）。PJM 2026/27 冬季評估也說沒有可靠度問題（[RTO Insider](https://www.rtoinsider.com/151347-pjm-winter-2026-27-study-foresees-no-reliability-issues/)，【轉述】）。
   對結論的影響：主軸只能說「慢、貴、要排隊」，不能說「缺電會停電」。

2. **瓶頸有一部分是規則，不全是物理**。價格上限把訊號壓在 325 美元，不設上限的模擬價是 555 美元（【原文】）。備援採購也因為 FERC 要求釐清成本分攤，從 9 月延到明年 3 月（【原文】加【轉述】）。
   對結論的影響：電網那一段的速度，有一部分取決於監管和市場設計，不只取決於蓋電廠的速度。改規則有可能比蓋電廠快，這是「插頭」說法要保留的空間。

3. **負載預測可能偏高（推論，未查到 2026 年的數據）**。R04 引用 ERCOT（德州電網）大型負載排隊約 410 GW、約七成是資料中心（【轉述】），這個量級遠大於實際能蓋的量。如果很多是重複或投機的申請，短缺就可能被高估。這是推論，需要獨立研究（例如針對重複併網申請的分析）來支撐，列在「還沒查到的」。

4. **台達不一定是「NVIDIA 電力生態的首選」**。DSX Ready 頁面列出的廠商裡沒有台達（【原文】）。台達自己也說 800V 是 NVIDIA 在推，機房業者沒那麼急（【轉述】）。
   對結論的影響：「台達＝AI 電力股」要加一個條件。它在機櫃電源最強；在新的「認證層」和 800V 時程上，不是先行者。

## 一年後可以對帳的點

| 要對的東西 | 現在的值／說法 | 來源 | 對帳日 |
|---|---|---|---|
| PJM 可靠度備援採購有沒有如期開標？實際買到幾 MW？ | 2027-03-01 開標、5/10 公布結果；目標約 6,800 MW；FERC 暫緩中 | [PJM 2026-10-29](https://insidelines.pjm.com/pjm-files-amended-reliability-backstop-proposal/) | 2027-05-15 |
| 大型運算負載穿越規範有沒有核准、生效 | 擬 2027-01-16 生效；現有約 10 GW，2030 年前最多再加 30 GW | [PJM 2026-11-16](https://insidelines.pjm.com/pjm-proposes-new-rules-to-protect-grid-reliability-as-data-center-demand-grows/) | 2027-02-15 |
| PJM 下一次容量拍賣（2029/30）：還會撞上限嗎？缺多少？ | 2028/29 是 325 美元（上限），缺 6,831 MW，新增發電 525 MW | [PJM BRA 報告](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2028-2029/2028-2029-bra-results-report.pdf) | 2027-11-25（拍賣日期沒查，到時依 PJM 時程調整） |
| DSX Ready 名單：幾類、幾家？台達有沒有進去？ | 3 類；BESS 3 家、CDU 3 家；沒有台達 | [NVIDIA DSX Ready](https://www.nvidia.com/en-us/data-center/products/dsx/dsx-ready/) | 2027-11-25 |
| 台達 AI 相關資料中心營收占比 | 2026 Q3「接近 50%」，液冷約 13%（【轉述】） | 台達 Q3 法說整理 | 2027-11-05（2027 Q3 法說之後） |
| 800V 有沒有在 2027 年開始大量出貨 | ±400V 部分出貨；800V「2027 年才會大量出貨」（【轉述】） | 台達法說、NVIDIA 2025-05 | 2027-11-25 |
| Flex 分拆 Axiom 有沒有在 2027 Q1 完成 | 計畫 2027 年第一季 | [Flex 8-K](https://www.sec.gov/Archives/edgar/data/0000866374/000119312526421058/d147467dex991.htm) | 2027-04-30 |
| 台灣北部「電廠 2 公里內」AI 資料中心的第一個核准案 | 個案審查，沒看到核准消息 | 經濟日報 2026-07-26 | 2027-11-25 |

（這一節的每一列，跑完會寫回 `questions.md` 的對帳簿。）

## 鉤子和標題方向

1. **流行說法對上資料**：「大家說 AI 缺晶片。今年 9 月，NVIDIA 開始認證的卻是電池和冷卻機。」
   為什麼成立：NVIDIA 的 DSX Ready 頁面就是一手證據，聽眾不用相信任何人的解讀。

2. **一個具體畫面**：「2026 年 7 月 22 日，維吉尼亞一帶的資料中心在一瞬間一起切到自己的發電機，合計 3.9 GW，大約是台灣夜尖峰用電的一成。」
   為什麼成立：這是真實事件（PJM 原文），而且直接解釋了為什麼 NVIDIA 要認證「懂電網」的電池、PJM 要訂穿越規範。台灣夜尖峰的比例精煉前要再核。

3. **一年後對帳**：「PJM 原本說 9 月幫資料中心買電，現在延到明年 3 月。我們明年 5 月回來看買到幾 MW。」
   為什麼成立：日期和目標量都是 PJM 自己寫的，可以檢驗。

4. **聽眾自己的處境**：「台達電營收創新高、AI 快占一半，股價卻從高點掉了快一半。你手上的台股，賭的是機房裡那一段，還是機房外那一段？」
   為什麼成立：這把主軸接到台灣聽眾最熟的公司。要避免講成選股建議，只講「瓶頸在哪一段，就影響誰的出貨時程」。

標題方向：
- 「晶片買得到，電要排隊：AI 機房最慢的一段在牆外」
- 「NVIDIA 為什麼開始認證電池？三則新聞，一個瓶頸，台達站在哪」

## 跟已做內容怎麼區隔

> 下面集數的查核結果沿用 R04 在 2026-11-22 對 episodes/ 的搜尋，本稿沒能重新查。

- **R04〈AI 機房缺的是電，台達電為什麼變成 AI 股〉**：已在 11/25 併入本題。
  - 重疊：物理（200 公斤銅、800V）、台達營收、台灣電網。
  - 怎麼分開：本篇以「2026 秋季三件事指向哪個瓶頸」為主軸。R04 的物理段縮成一段背景，P=I²R 和 200 公斤銅留作 podcast 的口播素材。台達的營收占比和股價放在副問題 3。R04 的儲能（Megapack）段不納入本篇。
- **Q40（台積電和台達電番外）**：
  - 重疊：台達的公司轉型。
  - 怎麼分開：本篇只講台達在供電鏈的位置，以及受電網時程的影響；公司歷史和轉型只引用，不重寫。
- **EP29〈same-start〉**：
  - 重疊：提過台達股價漲幅。
  - 怎麼分開：本篇一句帶過「EP29 講過它漲多少」，不比較投資報酬。
- **EP13〈cb-autopsy〉**：
  - 重疊：台達發債當案例。
  - 怎麼分開：本篇不提可轉債、發債。
- **EP38〈who-is-using〉**：
  - 重疊：用電推算晶片數。
  - 怎麼分開：本篇不碰出口管制。

### 附：這批新聞原本怎麼寫、我們怎麼寫（報告最後一小節的素材，只比結構）

- **原電子報的結構**：分三個主題（平台與技術、電網與建置、產業布局），每段都是「A 做了 X、B 做了 Y、仍須注意 Z」。事實大致正確，但三段平行排列，沒有回答「這些事加起來代表什麼」。
- **我們的結構**：
  - 先講一句主軸：最慢的一段在電網。
  - 再用一張圖（圖 2）把五則新聞放到同一條供電鏈上，讀者自己看得出哪一段最慢。
  - 每段第一句都扣回主軸，例如：「NVIDIA 認證電池，是因為電網接點不穩」；「Flex 買的是電網側的換流器」；「台達強在機房內，所以吃得到密度升級，也吃得到延工」。
- **原文最好的一句**：「設備準時到貨也不代表場址已經有電可用」。我們把它從第二段後半移到開頭，當成整篇的結論。
- **原文缺的三樣東西**：一個能核對的數字（PJM 缺口 6.8 GW、新增發電 0.5 GW）、台達在名單上缺席這個事實、一個明年可以對帳的日期。

## 還沒查到的

1. **晶片端是不是還缺貨**：本稿沒查 NVIDIA 財報裡的供給說法，也沒查 CoWoS 和 HBM 的產能。這對標題「不是晶片」很重要。建議查 NVIDIA FY27 Q3 的 10-Q 和法說逐字稿，以及台積電法說。
2. **台達正式數字**：AI 占比的口徑（含不含液冷、含不含整個資料中心業務）、存貨跌價金額、800V 和 ±400V 各自的營收都要確認。這是副問題 3 的根據。要查公開資訊觀測站的 Q3 財報和法說簡報；本稿沒有【原文】。
3. **台達有沒有申請 DSX Ready**：只開了 NVIDIA 的說明頁，沒開 marketplace 的完整清單。如果台達已經在審，第 4 條反方要改寫。建議查 marketplace 的篩選頁，以及台達新聞稿。
4. **Vertiv 和 Infineon 協議原文**：只看到搜尋摘要，金額和數量都不知道。建議查 Vertiv 投資人關係頁或 Infineon 新聞室。
5. **賓州研究原文**：只看到摘要，「13 次以上」的情境定義要開原文。建議查 PA PUC 新聞稿和 Synapse 報告。
6. **負載預測灌水的程度**：這是第 3 條反方的根據，目前只是推論。建議查 PJM 2026 年負載預測報告裡對大型負載的調整，以及 LBNL 或獨立顧問對重複申請的分析。
7. **PJM 容量價格怎麼進到一般家庭電費**：這可以變成「聽眾處境」那一類鉤子，但對台灣聽眾比較遠。建議查 PJM 獨立市場監察（Monitoring Analytics）的報告，或各州公用事業委員會的電價公告。
8. **台灣這一格要重開原文**：台電專題頁（R04 查詢時 403）、能源署供需報告全文、北部鬆綁後的核准案。
9. **IEA 和 LBNL 原始數字**：兩次查詢都被擋。如果還是打不開，報告改用 PJM 和能源署當主要數字。
10. **社群原貼文**：「大家怎麼說」需要一到兩則有日期的 PTT 或 Threads 原貼文，這次因為額度沒搜到。
11. **台達 11 月股價和本益比**：「股價重估」要有本益比序列才講得清楚，交易所資料這次沒查。

## 自我檢查

- [x] **一個 A 級可核對數字**：PJM 2028/29 拍賣短缺 6,831.3 MW、新增發電 524.7 MW（PJM 原始報告）。
- [x] **一個有份量的反方**：PJM 自己說短缺不等於停電；價格上限和 FERC 程序顯示瓶頸有一部分是規則。
- [x] **台灣／聽眾連結**：台電北部 5 MW 限制和「電廠 2 公里」（沿用 R04 的查核，本稿沒重開）；台達電是台股權值股。
- [x] **一年後對帳點**：8 項，最近的一項是 2027-02-15。
- [x] **三個數字核對過**：PJM 6,831.3 MW 和 325 美元（拍賣報告 PDF 本文）、Flex 44 億美元現金（8-K 本文）、Navitas 最高約 2.328 億美元（8-K 附件本文）。三個都是本次直接從一手文件讀出來的；查詢額度用完，沒能第二次重開。
- [x] **禁用詞檢查過**：沒有用到第 3 節列的禁用詞、驚嘆號或表情符號。
- [x] **C 級來源只在「大家怎麼說」**：正文沒有引用社群內容。「大家怎麼說」本身因為額度用完，暫時沒有 C 級原貼文（見還沒查到的第 10 條）。

---

## 附錄：完整數據

**PJM 容量拍賣全區結清價**（美元／MW-日，交付年度；來源：PJM 2028/2029 BRA Report 表 1、附錄表 2，【原文】）

| 交付年度 | 結清價 | 備註 |
|---|---|---|
| 2018/19 | 164.77 | |
| 2019/20 | 100.00 | |
| 2020/21 | 76.53 | |
| 2021/22 | 140.00 | |
| 2022/23 | 50.00 | |
| 2023/24 | 34.13 | |
| 2024/25 | 28.92 | |
| 2025/26 | 269.92 | |
| 2026/27 | 329.17 | 上限 |
| 2027/28 | 333.44 | 上限；不設上限的模擬價 529.80 |
| 2028/29 | 325.00 | 上限；不設上限的模擬價 554.72；短缺 6,831.3 MW |

**這批新聞的時間軸**（2026 年）

- 07-14　PJM 2028/29 拍賣結果
- 07-22　PJM 區域 3.9 GW 資料中心負載轉移
- 08-24　Navitas 宣布收購 Claros
- 09-03　Flex 宣布收購 EPC Power
- 09-14　賓州研究發布
- 09-21　NVIDIA DSX Ready 上線、Vertiv CDU 入列
- 09-25　台達 800VDC 加液冷整合方案發表
- 09-29　FERC 暫緩備援採購
- 10-06　Navitas 完成收購 Claros
- 10-14　Flex 完成收購 EPC Power
- 10 月中　台達在 OCP 展出 2.5 MW CDU
- 10-23　DSX Ready 頁面更新（新增 Coolant 類別）
- 10-29　PJM 提出備援採購修正案；同一天台達 Q3 法說
- 11-04　Vertiv 與 Infineon 簽約
- 11-16　PJM 提出大型運算負載規範
- 11 月中　台達在 SC26 展出 800 VDC 供電的 CDU