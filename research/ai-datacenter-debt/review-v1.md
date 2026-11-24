# 審稿：Q18〈蓋 AI 機房的錢，有多少是借來的？借錢的條件撐得住嗎？〉

審稿日 2026-11-23。以下「已開」指這次重新打開過原始頁面或 PDF。

## 結論

修改後可以進入報告。Fed、IMF、BIS、三家公司財報的核心數字全部對得上。要改的有三件事：一，「借錢條件目前仍寬鬆」只對巨頭成立，第二層在 2026 年 10 月已經被重新定價（Oracle CDS 約 3 個百分點、CoreWeave CDS 約 10 個百分點、Musk 自己說債市對沒有其他營收的機房公司幾乎關門），結論要照這個修；二，幾個掛在二手來源上的數字在引用頁面裡根本找不到，要降級或拿掉；三，稿子把 Meta 的表外承諾留在「還沒查到」，其實 10-Q 寫得很清楚，而且是全篇最有力的一組數字。

## 1. 立論夠了嗎

- 「巨頭開始借錢」站得住。FactSet 的 9% → 32% 是業界整理，但用 Meta、Oracle 自己的現金流量表可以獨立算出同一個方向（Meta 前九月資本支出占營業現金流 63% → 89%，Oracle 過去四季 161%，自己算的）。報告應改用公司文件當主證據，FactSet 當旁證。
- 「最大的一塊不在帳上」原稿只有 Fed 的總數。Meta 10-Q 可以直接給單一公司的數字：未起租租約 3,557 億美元、不可取消合約承諾 4,545 億美元，合計約是長期負債的十倍（自己算的）；未起租租約一年前只有 581 億。這一段要從「還沒查到」移到正文。
- 「借錢條件目前對巨頭仍然寬鬆、但已分層」跳得太快的是時間點。稿中的利差表停在 2026-08。10 月的資料顯示第二層已經不是「貴一點」，而是接近借不到。這一句要改寫。
- 「損失多在銀行體系外」的證據是 Hepp 一篇工作論文加 Fed 一段話，等級夠，但 Fed 同段說銀行有近 1 兆美元曝險，BIS 也點名銀行借錢給持有 SPV 債的基金。要並列，不要只留一邊。
- 證據等級誇大的地方：xAI 12.5% 寫「Reuters」，實際頁面引的是 Bloomberg；JPMorgan 6,970 億／5,750 億掛在一個沒有這組數字的頁面上；Goldman 兩個數字沒有任何打得開的來源；Hyperion 債「跌到 91 美分」找不到出處。

## 2. 主軸

最強的主線是「同一批晶片，利息看的是誰付租金」。它同時回答了借多少（巨頭用自己的名字借，便宜）、怎麼借（把機房放進 SPV，用租約和保證撐評等，Meta 為此多付約 1.3 個百分點）、撐不撐得住（租客信用一弱、合約一短，利差就跳級，2026 年 10 月直接關門）。

建議砍或移走：
- Burry 的折舊估算只留一句，放在「大家怎麼說」，不展開。
- IMF 的全球 GDP 壓力情境屬於 Q08（收入追不追得上）的範圍，正文只留一句，數字進附錄。
- 「跟已做內容怎麼區隔」「鉤子」「自我檢查」是工作筆記，不進報告。
- 台灣伺服器廠只留廣達一個點。

## 3. 數字對嗎

| 數字 | 稿中寫法 | 查到的 | 來源 | 判定 |
|---|---|---|---|---|
| Fed：AI 相關發債 | 超過 6,800 億美元，2023 年 1,300 億，約五倍；占投資級 6% → 31%；公開餘額 1.1 兆 | 完全相同（Box 2.2 原文） | [Fed FSR 2026-11](https://www.federalreserve.gov/publications/files/financial-stability-report-20261113.pdf) | 對 |
| Fed：未起租租約、其他承諾、銀行曝險 | 超過 1 兆、超過 2 兆（未折現，七家）；近 1 兆 | 完全相同 | 同上 | 對 |
| Fed 調查 87% | 二手讀圖，PDF 無數字 | PDF 確實只有圖。樣本 23 人，20 ÷ 23 = 86.96%，與 87% 相符（自己算的）。春季「約五成」仍只有二手 | 同上 Box 5.1；Axios 頁面 403 | 對（秋季）；春季未核實 |
| Meta Q3 | 資本支出 349.1 億、營業現金流 327.9 億、自由現金流 −21.2 億；長期負債 809.2 億；發債淨額 249.1 億；庫藏股 0 對 262.5 億 | 完全相同。另從 10-Q 補到：未起租租約 3,557.3 億、不可取消承諾 4,545.2 億、兩個合資機房最大損失曝險 684.0 億（其中殘值保證上限 414.9 億） | [新聞稿](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Third-Quarter-2026-Results/default.aspx)、[10-Q](https://www.sec.gov/Archives/edgar/data/1326801/000162828026066773/meta-20260930.htm) | 對，且補到原稿第 4 項缺口 |
| Oracle Q1 FY27 | 借款 1,253 億；資本支出 285 億；自由現金流 −54 億；四季 −287 億；ATM 200 億；RPO 6,640 億 | 76.25 + 1,177.12 = 1,253.4 億；四季 −99.67 −114.84 −18.73 −53.96 = −287.2 億；ATM 淨額 199.1 億。10-Q 另揭露 2,880 億美元未入帳租約承諾 | [新聞稿](https://investor.oracle.com/investor-news/news-details/2026/Oracle-Announces-Q1-Results-Driven-by-Triple-Digit-Growth-in-Cloud-Infrastructure-Revenues/default.aspx)、[10-Q](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm) | 對 |
| CoreWeave Q3 | 營收 36.61 億、營業利益 2.07 億、淨利息 8.46 億、淨損 7.09 億；債務 468.7 億 | 完全相同（416.00 + 52.73 = 468.73 億） | [新聞稿](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Reports-Strong-Third-Quarter-2026-Results/default.aspx) | 對 |
| GPU 擔保貸款利差 | DDTL 4.0 SOFR+2.25%（A3）、5.0 +4.5%（Ba2）、5.5 +5.5%（無評等），來源 Wing VC | 三筆都在 CoreWeave 自己的新聞稿：4.0 SOFR+2.25%、A3／A(low)；5.0 SOFR+4.50%、Ba2／BB+、收窄 50 基點；5.5 SOFR+5.50%、**Ba2／BB+**、合約平均約三年 | [4.0](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Closes-Landmark-8-5-Billion-Financing-Facility-Achieving-First-Investment-Grade-Rated-GPU-backed-Financing/default.aspx)、[5.0](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Closes-3-1-Billion-Loan-Facility-Expanding-Access-to-Public-Markets-for-GPU-Backed-Financing/default.aspx)、[5.5](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Closes-2-6-Billion-Loan-Facility-Expanding-Financing-Flexibility-for-AI-Infrastructure/default.aspx) | 對，升級為一手；5.5 補上評等 |
| xAI 12.5% | Reuters；訂單約 1.5 倍；高收益指數 7.6% | 頁面引的是 Bloomberg。債券 30 億與固定利率貸款 10 億都是 12.5%，另有 10 億 B 類貸款是基準利率加 7.25 個百分點、96 折發行。訂單倍數和 7.6% 不在頁面裡 | [Investing.com](https://ng.investing.com/news/company-news/elon-musks-xai-raises-debt-offering-yield-to-close-5b-deal-93CH-1974856) | 有出入（來源名、兩個數字未核實） |
| JPMorgan 6,970 億／5,750 億 | 經 broadbandbreakfast 引用 | 該頁沒有 JPMorgan，也沒有這兩個數字。頁面可見的是 Arete 的估計：四大巨頭到 2028 年資本支出 1.8 兆，比本業產生的現金多約 6,000 億 | [Broadband Breakfast](https://broadbandbreakfast.com/capex-to-consume-nearly-all-hyperscaler-operating-cash-flow-in-2026.md) | 查不到 |
| Oracle CDS | 7 月約 2 個百分點 | 7 月約 203 基點成立（二手多家一致）。10 月 CNBC 報 295–315 基點 | [Wealth Professional 2026-10-20](https://www.wealthprofessional.ca/investments/equity-markets/oracles-default-insurance-hits-high-yield-levels-as-ai-debt-mounts/393817) | 對，但已過時 |

其他核對結果：
- IMF（10% 對不到 1%、14 筆循環交易 3,000 億＋6,500 億換 1.4 兆、其中 3,200 億在被投資方、GDP −0.4%、亞洲先進市場）全部對。
- BIS Bulletin 140 已開。五大巨頭到 9 月發債 2,220 億、Moody's 租約承諾 1.2 兆（8,200 億未起租）都在原文，可從「經二手引用」升為一手。同一份另有 Hyperion 債定價：公債加 225 基點，兩週後 Meta 自己的 20、30 年債是加 88、98 基點。
- 「BIS：2025 年私募信貸新貸給 AI 超過 400 億」在 Bulletin 140 和 Bulletin 120 網頁都找不到，未核實。
- Goldman「年初至今 1,940 億」「AI 相關近 5,000 億、巨頭占四成」：Fortune 那頁沒有 Goldman，未核實。
- Hyperion 債「跌到約 91 美分、殖利率 7.55%」：找不到出處，未核實。Fortune 2025-10-31 那頁只有 6.58% 殖利率、A+、Blue Owl 80%／Meta 20%、BlackRock 買超過 30 億；Pimco 180 億來自 Wing VC。
- 金管會風險係數：工商時報只給創投的舊係數（33.75% → 17.25%）；私募股權基金只寫調整後 17.25%，沒寫調整前。
- Musk 貼文找到了。2026-10-25 前後在 X 發文，Fox Business 2026-10-26 引原文。金額是 400 億美元債務，不是「資金缺口」。

## 4. 反方與台灣連結

反方夠份量（FactSet 槓桿、Hepp 壓力測試、Fed 說巨頭可能吸收損失）。要補一個原稿沒寫的反方細節：Meta 10-Q 寫殘值保證「不太可能支付，所以沒有認列負債」，上限不等於預期損失。

台灣這一格仍是全篇最弱。這次再查：金管會保險局統計、壽險公會、聯合／經濟／工商的報導，都沒有壽險或銀行持有 AI 相關公司債的金額。補到一個間接數字：國銀對美國曝險 9 月底 5.12 兆元，前九月增加 8,803 億元，報導引銀行圈說法是在買美國 AI 公司發的債（經濟日報 2026-11-10，金管會統計）。這不是 AI 債的金額，報告裡要講清楚。廣達應收帳款可以多算一層：期末應收帳款對當季營收，Q2 約 67 天、Q3 約 77 天（自己算的，Q2 為反推值）。

## 5. AI 味與 FOMO 檢查

- 「誰借得最兇」改成「誰借得最多、利息最高」。
- 「這不是 2008」是口號式對比，改成直接講 Hepp 的數字和 BIS 的說法（多數是長期債，不容易發生短期資金擠兌）。
- 「市場還在搶著借錢給它們」：10 月之後只對巨頭成立，要加上時間和對象。
- 「Enron 式」一段可以留，但結尾「不是詐欺」是替讀者下結論，改成列出差別（有揭露、有評等、10-Q 寫明上限）。
- 全篇沒有倒數計時或恐嚇句，這點可以。

## 6. 修改清單

1. 把 Meta 10-Q 的表外數字（3,557 億、4,545 億、684 億、414.9 億）放進正文，當第二節的主證據。
2. 借錢條件一節加上 2026 年 10 月的資料，結論改成「巨頭仍寬鬆，第二層已關門」。
3. GPU 擔保貸款利差改引 CoreWeave 新聞稿，補 DDTL 5.5 的評等，點出 5.0 與 5.5 同評等、差 1 個百分點。
4. JPMorgan、Goldman、BIS 400 億、Hyperion 91 美分、xAI 訂單倍數標「未核實」或拿掉。
5. xAI 2025 年借款來源改成 Bloomberg，補上三個分券。
6. Oracle CDS 補 10 月數字。
7. Musk 貼文換成 2026-10 那一則，附原文。
8. 台灣一節先講「沒有公開數字」，再給國銀對美曝險和廣達應收帳款天數，推論標明是推論。
