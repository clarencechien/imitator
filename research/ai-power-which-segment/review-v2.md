# 審稿 v2：Q41 · 說「AI 缺電」之前，先問缺的是哪一段電

查核日 2026-11-26。這一版照 `Q41-fix.txt` 主軸重來，不是小修。v1 已核對過的 PJM、Flex、Navitas、Vertiv 數字沿用 v1 審稿（2026-11-25），沒有重開。這次新開的頁面：NVIDIA DSX Ready 說明頁和部落格（重開）、NVIDIA 2025-10 的 800 VDC 部落格、Electrek／PV Tech／ESS News（Tesla Powercore）、EEPower（Eaton 訪談）、TechCrunch、IEEE Spectrum、Data Center Frontier、pv magazine USA、科技新報兩篇、旺得富兩篇、ETtoday、數位時代、StockFeel、ServeTheHome、台達 OCP 新聞稿、鉅亨號專欄。

## 新主軸

AI 機房的「缺電」是一條供電鏈上好幾種不同的缺：機房外缺的是電網容量、併網和變壓器，要用年算；機房內缺的是把高壓電一路轉到晶片的那串設備，每一段卡的東西、競爭者和速度都不一樣。說「AI 缺電」之前，要先問缺的是哪一段的電。

- 標題：說「AI 缺電」之前，先問缺的是哪一段（`<title>` 多一個「電」字；沒有 SST、DSX 等術語）
- 台達電不再是主角。頁 05 的標題和正文都寫成「六家之一」，供電鏈圖每段列 3 到 9 家。
- 3d：頁 01 用一句帶過「是另一篇 Q40〈台積電和台達電番外〉的題目，這一篇只講電」。注意 v1 審稿寫過「報告內不出現題號」，這次照 fix 檔的指示出現了 Q40，請 Clarence 確認要不要留題號。

## 逐項查核

| 要查的 | 查到的 | 來源 | 判定 |
|---|---|---|---|
| 3a DSX Ready 認的是產品還是機房 | FAQ 原句："applies to a specific qualified product or solution—not to the partner organization or their entire portfolio"。不認公司、不認整座機房。部落格："does not replace site-level engineering or imply site-level stability" | [NVIDIA DSX Ready](https://www.nvidia.com/en-us/data-center/products/dsx/dsx-ready/)、[NVIDIA 部落格](https://blogs.nvidia.com/blog/dsx-ready-ai-factories-power-cooling/) | 一手，核實 |
| 3a 範圍 | FAQ："Currently available qualifications are for BESS, CDU, and Coolant only." 沒有變壓器、UPS、電源、SST 類別。BESS 邊界在交流端子（後者是 DCF 轉述） | 同上、[Data Center Frontier](https://www.datacenterfrontier.com/design/article/55410513/nvidias-dsx-ready-brings-power-and-cooling-into-the-ai-factory-blueprint) | 一手，核實 |
| 3a 是相容性標章還是採購門檻 | NVIDIA 兩頁都沒寫必須購買。DCF："Nor is there evidence that DSX Ready has become a mandatory procurement requirement" | 同上 | NVIDIA 沒寫是一手；「不是門檻」是媒體判斷加我們的推論 |
| 3a 過去業者是否只買名單上的 | 沒有採購資料。旁證：2025-10 名單是夥伴名單不是認證；AVL／RVL 只有媒體和專欄提過，NVIDIA 沒公開；台達液冷是雲端業者找上門共同開發；Meta、微軟另推 400V | [NVIDIA 2025-10](https://developer.nvidia.com/blog/building-the-800-vdc-ecosystem-for-efficient-scalable-ai-factories/)、[數位時代](https://www.bnext.com.tw/article/91660/delta-ai-cooling)、[IEEE Spectrum](https://spectrum.ieee.org/data-center-dc-2676581047) | 查不到直接證據。報告寫「證據指向不是」，標明是推論 |
| 3a DSX Ready 名單家數 | 11/26 讀到 BESS 3、CDU 3、Coolant 8（多 Ecolab、PFX Group、Shell、Valvoline），共 14 家。v1 寫 10 家（Coolant 4） | NVIDIA DSX Ready | 和 v1 有出入。以 11/26 為準，報告寫明分不出是更新還是上次沒讀全 |
| 3b 台達 AALC 還在出貨嗎 | 台達用詞是 Sidecar／液對氣 CDU，沒有用 AALC。鄭平：2024-11 開始出貨，頭兩個月 4,000 萬美元，2025 年 16 億美元，「今年仍繼續成長，但增幅不會這麼大」。2026-08 報導有 GoCool-150 液對氣機型展出 | [旺得富 2026-05-04](https://wantrich.chinatimes.com/news/20260504900179-420101)、[ServeTheHome](https://www.servethehome.com/?p=101528) | 媒體轉述法說。到 2026 年中還在賣；2026 下半年的量和液對氣占比查不到 |
| 3b 台達 AALC 有沒有 NVIDIA 認證 | DSX Ready CDU 類沒有台達。台達 OCP 新聞稿沒有 qualified／certified 字樣，只寫 compatible，也沒提液對氣。一篇 2025-07 個人專欄說台達 1.5 MW 液對液 CDU 有 RVL、AVL（不是液對氣） | NVIDIA DSX Ready、[台達新聞稿](https://www.prnewswire.com/news-releases/delta-highlights-collaboration-with-nvidia-in-advancing-energy-efficient-800-vdc-power-and-cooling-solutions-for-ai-data-centers-at-ocp-global-summit-2026-302909912.html)、[鉅亨號專欄](https://hao.cnyes.com/post/180445) | 沒有查到。專欄那條標未核實 |
| 3c Tesla 進場 | 2026-11-17 在 RE+ 期間由 Tesla Megapack X 帳號發表 Powercore：7.4 MW（9 MVA）@34.5 kV，DC 800–2,000 V，尖峰效率 98.86%，2027 年首批運轉，價格、客戶、工廠未公布 | [Electrek](https://electrek.co/2026/11/17/tesla-powercore-solid-state-transformer-heron-link/)、[PV Tech](https://www.pv-tech.org/tesla-solid-state-transformer-market-powercore-launch-re-plus-2026/)、[ESS News](https://www.ess-news.com/2026/11/19/tesla-unveils-powercore-medium-voltage-power-electronics-platform/) | 二手，三家一致。一手 X 貼文回 402 打不開，DCD 回 403 |
| 3c Tesla 資料中心 Megapack 量 | Electrek 寫 10 GWh，PV Tech 寫 1 GWh | 同上 | 有出入，兩個都列 |
| 3c 其他業者與階段 | Heron：2027-04 RWE 試點、2027 年底量產。Eaton："in development"、"deployed and certified in 2027"。台達：「已有SST產品及銷售」，個案。陽光電源：2027 量產。光寶：Q4 小量。DG Matrix：A 輪 6,000 萬美元。Envision 自稱商轉 | Electrek、[EEPower](https://eepower.com/tech-insights/exclusive-interview-aerospace-quality-at-automotive-volumes-to-power-ai-racks/)、[旺得富 2026-02-26](https://wantrich.chinatimes.com/news/20260226900728-420101)、[科技新報 07-10](https://technews.tw/2026/07/10/sst-ai-power-china-us-taiwan/)、[TechCrunch](https://techcrunch.com/2026/02/20/why-investors-are-going-gaga-over-solid-state-transformers/) | 全部是公司說法。結論：展示和試點，沒有查到量產。Eaton 新加坡試驗、DG Matrix 交付、Envision 商轉只讀到摘要或二手，標未核實 |
| 3c 為什麼 800VDC 讓 SST 變重要 | NVIDIA：未來由大容量轉換系統把中壓交流直接轉 800 VDC。IEEE Spectrum：13.8 kV 在圍牆邊直接轉 800 V。「傳統變壓器只能出交流」是我們補的電機常識 | NVIDIA 2025-10、IEEE Spectrum | 方向有一手支持；因果句標明是我們的說明。「SST 可繞過四年交期」明寫是推論 |
| 變壓器交期 | PwC：最長 4 年。WoodMac：需求 +274%／+116%。160 週、18–36 個月只讀到搜尋摘要 | [pv magazine USA](https://pv-magazine-usa.com/2026/05/11/u-s-transformer-market-faces-severe-supply-constraints-as-lead-times-extend-to-four-years/) | 二手。頁 00 的 tile 標「媒體轉述」。WoodMac 週數標未核實 |
| 800V 出貨時程 | 台達：Q3 量產、Q4 少量出貨、2027 擴大。光寶：8 月送樣、11 月少量、2027 Q1 後放量 | [科技新報 10-27](https://technews.tw/2026/10/27/800-vdc-outlook-optimistic-next-year-delta-electronics-liteon-technology-investor-conferences-key-progress/) | 媒體轉述。注意搜尋摘要曾把光寶邱森彬的話誤植給台達，報告已分開 |
| 同線徑多送的電 | NVIDIA 寫 157%，IEEE Spectrum 寫 85% | 同上兩頁 | 有出入，兩個都列在圖的數字 |
| 台達 Q3 延後原因 | 缺料、18.5 kW 新平台客戶量產慢、改設計、資料中心建置延遲；整理者另記缺電是嚴重問題 | [StockFeel](https://www.stockfeel.com.tw/%E5%8F%B0%E9%81%94%E9%9B%BB-2308-2026q3-%E6%B3%95%E8%AA%AA%E6%9C%83/) | 媒體整理。比 v1 多了細項，但仍沒對到公司簡報 |
| 自己算的 | 41 天對 48 個月約三十幾倍；29 家；14 家；16 億美元約 500 億元；六項月數 | — | 都標「自己算的」。六項月數定義不同，圖說寫只能看量級 |

## 立論的弱點（讀者該知道的）

- 七段是我們自己切的。頁 00 和供電鏈圖說都寫了。
- 第 ②④⑤⑥⑦ 段的「慢多久」是依已公布時程的粗分，「用季算」沒有單一來源。
- 圍牆邊和機房內幾乎全是廠商說法，2027 這個年份沒有第三方驗證。
- 供電鏈圖的競爭者只列名字，沒有市占。Motivair 屬施耐德、Siemens Energy／GE Vernova 做大型變壓器是常識層級，沒有逐一附來源。
- 最強的反方是「只有最慢的一段重要」，放在頁 11 第一條並回應。

## 搬到附錄的

- 台達電營收、毛利率（含回推和加回存貨跌價的粗估）、股價兩個基期、本益比粗算、AI 占比：正文只留 Q3 營收、存貨跌價和延後原因，其餘在附錄。v1 的毛利率圖拿掉，數字保留。
- v1 的 17 件事時間軸圖拿掉，17 列改放附錄，並加第 18 件（Tesla 11/17）。
- v1 正文裡自己算的幾個比例（多八成、將近四成、32 天、38%）放附錄專區。
- 賓州研究、LBNL、IEA、PJM 冬季評估：維持在附錄，未核實。
- v1 附錄整張表原樣保留，後面接這一版新查的五組。

## 沒做到的

- Tesla 一手貼文和 Data Center Dynamics 報導打不開。
- NVIDIA 產品市集完整清單、CDU 自我驗證指引 PDF 沒開，所以 DSX Ready 收不收液對氣機型不知道。
- 台達法說簡報和公開資訊觀測站仍然沒開，台達數字全是媒體整理。
- Wood Mackenzie 原始調查沒開到。
- 各段市占沒查。
- HTML 用 v1 成品的 chassis 樣式在本機 Chrome 截圖看過 390px 和 1200px，淺色模式。深色模式和列印沒看。640 寬的圖在手機上是橫向捲動（chassis 的 `min-width: 34rem`，v1 相同）；供電鏈圖和供電路徑圖另外加了 `.chart.fit` 讓它在手機寬度內完整顯示，字約 9 到 10px。

## 規格 §5 自查

- 主軸註解：有（檔頭一份，`<article>` 開頭一份）。`p.lede`：有。頁 00 的 tiles 和 pull：都有。
- SVG 圖 12 張，12 個 figure 都有 `details.datatable`。
- 正文看得到的表格 3 張（逐句對帳、查不到、寫法對照），另有附錄 1 張。
- `p.mark` 14 句，頁 00 到頁 13 每節都有。每節都有 eyebrow 和 h2。
- 「完整數據」附錄、「查不到」一節：都有。沒有「一年後對帳」。
- 沒有 runtime 第三方 script，沒有 storage API。字型沿用 v1 的 Google Fonts `<link>`。
- 研究稿數字沒進報告的：ERCOT 410 GW 和「約七成」，理由同 v1（稿中沒有來源連結）。

## 系列檢查

不是系列後篇，不適用。配色沿用 v1（paper 350°、accent 160°）。和 Q40 的分工見上。

## 對帳點（進題庫對帳簿，不進報告）

| 要對的東西 | 現在的值 | 對帳日 |
|---|---|---|
| PJM 備援採購是否如期開標、買到幾 MW | 2027-03-01 開標、5/10 公布，目標約 6,800 MW | 2027-05-15 |
| 大型運算負載穿越規範是否生效 | 擬 2027-01-16，適用 50 MW 以上 | 2027-02-15 |
| PJM 2029/30 拍賣是否再頂上限、缺口多少 | 325 美元、缺 6,831 MW | 2027-01-31，依 PJM 時程調整 |
| Tesla Powercore 有沒有第一台運轉、有沒有公布客戶 | 2026-11-17 發表，說 2027 年首批運轉，客戶和工廠未公布 | 2027-11-26 |
| Heron Power 是否如期試點和量產 | RWE 德州試點 2027-04，商業量產 2027 年底 | 2027-12-31 |
| Eaton 固態變壓器是否「部署並認證」 | 2026-11 說開發中，預期 2027 年 | 2027-11-26 |
| DSX Ready 類別數、家數、有沒有變壓器或電源類、台達是否入列 | 3 類 14 家，沒有台達，沒有電源和變壓器類 | 2027-11-26 |
| 台達和光寶 800 伏特直流是否放量 | 台達 2026 Q4 少量出貨，光寶 11 月少量出貨，都說 2027 放量 | 2027-11-05（2027 Q3 法說後） |
| 台達液冷占營收、液對氣是否還在出貨 | 2026 Q3 約 13%、約 250 億元，沒有拆分 | 2027-11-05 |
| 大型變壓器交期是否縮短 | 最長 4 年（PwC，2026-05） | 2027-11-26 |
| 巴克萊對 800 伏特直流的估計 | 2029 年約占新增容量 30%（未核實） | 2029-12-31 |
| Flex 分拆 Axiom 是否在 2027 Q1 完成 | 計畫中 | 2027-04-30 |
| 台灣北部電廠周邊第一個核准案 | 沒看到 | 2027-11-26 |
