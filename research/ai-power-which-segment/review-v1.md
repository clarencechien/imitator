# 審稿：Q41 · AI 機房最缺的不是晶片，是插頭？

查核日 2026-11-25。這次上網重開了 PJM 拍賣報告 PDF、PJM 兩則公告、NVIDIA DSX Ready 說明頁和部落格，另外讀到 Flex、Navitas、Vertiv、台達 Q3 的搜尋結果內文。查到約二十次之後工具額度用完，下面標「沒重開」的都是這個原因。同一份紀錄已寫到 `/mnt/attach/project-files/research/runs/2026-W48/api/Q41-review.md`（沙箱裡原本沒有這個路徑，是我新建的）。

## 結論
修改後可以進入精煉。電網那一段的數字全部對得上 PJM 原始文件，主軸站得住。要改的是三件事：標題的「不是晶片」沒有任何數據、台達存貨跌價和電網之間的因果是稿子自己接上去的、台達股價和 Flex 付款方式各有一個版本對不上。

## 1. 立論夠了嗎
- 「最慢的一段在電網」：撐得住。PJM 2028/29 拍賣報告逐項核對無誤。
- 「晶片不缺」：沒有證據。稿子自己也承認沒查。報告只能寫「電很慢」，標題和導言都不能暗示晶片已經不缺。
- 「台達營收新高卻提列存貨跌價，是因為電網慢」：跳太快。公司講的是長短料和客戶資料中心建置延緩，沒說延緩的原因。今周刊另寫是泰達電對存放逾 90 天的貨依規提列。報告要寫成「客戶延後，台達先堆庫存。延後有多少卡在電，沒有資料」。
- 證據等級：Flex 那一列標【原文】寫「現金 44 億」，但 Flex 自己的新聞稿只寫 "at a value of $4.4 billion"，另有一家媒體寫現金加股票。8-K 沒重開，付款方式降為未核實。台達整張表是媒體整理，報告要照寫「未對到法說簡報」。
- 稿子沒算的幾層（報告補上，標自己算的）：
  - 缺口是新增發電的 13 倍。
  - 價格頂到上限後要改看備用容量率：目標從 14.7% 調到 20%，買到的從 23.3% 掉到 14.7%。
  - 成交量乘價格的總額從一年 22 億變 164 億美元。
  - 備援採購的上限價 555 幾乎等於不設上限的模擬價 554.72。
  - 兩件併購各花 41、43 天完成，備援採購一延半年。

## 2. 主軸
最強的一條：三類新聞是同一條供電鏈上的三個位置，最慢的在機房外面，台達賣的是機房裡面。沒有分散。
- 「鉤子和標題方向」「跟已做內容怎麼區隔」是內部筆記，不進報告。
- 「一年後可以對帳的點」不進報告，留在本紀錄。
- IEA、LBNL、賓州研究和主軸只有背景關係，移到附錄並標未核實。
- R04 的物理段只留一段話，不放沒有來源的數字。ERCOT 410 GW 稿中沒有連結，數字拿掉，推論留著。

## 3. 數字對嗎

| 數字 | 稿中寫法 | 查到的 | 來源 | 判定 |
|---|---|---|---|---|
| PJM 2028/29 結清價 | 325 美元，上限，連三次 | 325.00，上次 333.44，再上次 329.17 | [PJM BRA Report](https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2028-2029/2028-2029-bra-results-report.pdf) | 對。短缺是連兩次，不是三次，報告要分開寫 |
| 缺口 | 6,831.3 MW，上次 6,516 | 一致 | 同上 | 對 |
| 新增發電、負載增加 | 524.7 MW、1,374.5 MW | 一致 | 同上 | 對 |
| 備用容量率 | 14.4%，目標 20% | 只算拍賣 14.4%。含自供的全區 14.7%，差 5.3 個百分點、8,716.1 MW | 同上 | 有出入：兩個口徑都要列 |
| 不設上限模擬價 | 554.72、ComEd 776.69、多 133 億 | 一致 | 同上 | 對 |
| 備援採購時程 | 3/1 開標、3/28 截標、5/10 公布，15 年，555，約 6,800 MW | 一致。另有 4/28 定量，目標會扣掉已簽的雙邊合約 | [PJM 2026-10-29](https://insidelines.pjm.com/pjm-files-amended-reliability-backstop-proposal/) | 對 |
| 7/22 事件 | 約 3.9 GW，50 MW，2027-01-16，10 GW，30 GW | 一致，原文是「將近 3.9 GW」 | [PJM 2026-11-16](https://insidelines.pjm.com/pjm-proposes-new-rules-to-protect-grid-reliability-as-data-center-demand-grows/) | 對 |
| DSX Ready 名單 | BESS 3 家、CDU 3 家，後加 Coolant，沒有台達 | 一致。Coolant 列了 4 家（Arteco、Castrol、Dow、Dynalene），共 10 家，沒有台達 | [NVIDIA DSX Ready](https://www.nvidia.com/en-us/data-center/products/dsx/dsx-ready/)、[NVIDIA 部落格](https://blogs.nvidia.com/blog/dsx-ready-ai-factories-power-cooling/) | 對，補 4 家 |
| Flex 買 EPC Power | 現金 44 億美元 | 金額 44 億對。付款方式有兩種寫法 | [Flex 新聞稿](https://investors.flex.com/news/news-details/2026/Flex-to-Acquire-EPC-Power-Adding-Leading-Power-Conversion-Capabilities-for-AI-Data-Centers-and-Grid-Applications/default.aspx) | 金額對，「現金」未核實 |
| Navitas 買 Claros | 最高 2.33 億，成交付 2.16 億、現金 1.25 億，10/6 完成 | 一致 | [TheStreet](https://www.thestreet.com/technology/nvts-stock-claros-deal-ai-chips)、[Power Electronics News](https://www.powerelectronicsnews.com/navitas-breaking-the-power-wall-with-ivr-vpd-claros-planned-acquisition/) | 對（媒體層級） |
| 台達 Q3 | 營收 1,970.59 億、毛利率 34.1%、季減 1.5 個百分點 | 一致。另有淨利 234.95 億季減 6.53%、EPS 9.04 | [今周刊](https://www.businesstoday.com.tw/article/category/183015/post/202610290015/)、[聯合報](https://udn.com/news/story/7252/9885659) | 對 |
| 台達存貨跌價 | 約 39 億元 | 沒找到同口徑。個人法說筆記有「約占營收 1.7%」的寫法，換算約 33.5 億 | — | 查不到，報告標未核實 |
| 台達股價 | 高點 2,585，10/30 跌停 1,335，回檔約 48% | 1,335 對。今周刊寫的是 10/6 高點 2,115，跌約 37%。2,585 沒查到 | 今周刊（同上） | 有出入：兩個基期並列，2,585 標未核實 |
| Vertiv 與 Infineon | 三年 | 一致 | [PR Newswire 經 Yahoo](https://uk.finance.yahoo.com/news/vertiv-infineon-deepen-strategic-partnership-133000174.html) | 對 |
| 台灣夜尖峰、5 MW、2 公里、IEA、LBNL、賓州研究、Flex 兩份 8-K、Navitas 8-K、台達 800V 發表 | — | 沒重開 | — | 未核，報告逐項標示 |

## 4. 反方與台灣連結
- 反方夠份量。最重的一條來自 PJM 自己：短缺不代表供不了電。
- 第二條（瓶頸有一部分是規則）可以再加一個佐證：PJM 11/16 同一天另提一案，要把電廠和大型負載合在一起做併網研究（[Environment+Energy Leader](https://www.environmentenergyleader.com/articles/45582-pjm-wants-power-plants-and-large-loads-studied-together)，只看到摘錄，報告標未核實）。
- 第三條（負載預測灌水）仍是推論，沒有 2026 年的獨立數據。
- 第四條（台達不在名單）要加一句限制：DSX Ready 認的是個別產品，不是公司。不在說明頁不等於產品不能用。
- 台灣那一格站得住，但全是媒體轉述，這次沒重開。3.9 GW 約等於台灣夜尖峰一成的換算可以用，要標來源等級。比較有力的換算是 3.9 GW 對台灣已估入的 AI 資料中心 1.2 GW，約三倍多。

## 5. AI 味與 FOMO 檢查
- 「所以標題問的『插頭』大致成立」：成立的只有一半，改成「電很慢成立，晶片不缺沒有證據」。
- 「這也說明了為什麼台達第三季營收創新高，公司卻……」：把相關寫成解釋，改成兩句並列，不用「說明了」。
- 「你手上的台股，賭的是機房裡那一段，還是機房外那一段？」：有選股暗示，報告不用。
- Navitas 那句引言要註明是賣供電晶片的公司說的。

## 6. 修改清單
1. 標題和導言不寫「晶片不缺」，另開一格交代沒查到。
2. 台達存貨和電網的關係改寫成「客戶延後，原因未說明」。
3. 備用容量率列兩個口徑，補目標和實際的歷年序列。
4. Flex 付款方式拿掉「現金」，標未核實。補 EPC Power 2026 年預期營收約 8 億美元。
5. 台達股價兩個基期並列，2,585 標未核實。存貨跌價 39 億標未核實。
6. DSX Ready 補冷卻液 4 家，加「認的是產品」這句限制。
7. 分號過多，改成句號拆句。
8. 對帳表、鉤子、區隔筆記不進報告。

## 對帳點（進題庫對帳簿，不進報告）

| 要對的 | 現在的值 | 對帳日 |
|---|---|---|
| PJM 備援採購是否如期開標、買到幾 MW | 2027-03-01 開標、5/10 公布，目標約 6,800 MW | 2027-05-15 |
| 大型運算負載穿越規範是否生效 | 擬 2027-01-16，案號 ER27-522 | 2027-02-15 |
| PJM 2029/30 拍賣是否再頂上限、缺口多少 | 325 美元、缺 6,831 MW。有顧問文章寫下一次在 2026 年 12 月（[Simcore](https://www.simcorepartners.com/insights-/pjm-s-2028-29-bra-325-mw-day-price-cap)，未核實） | 2027-01-31，依 PJM 時程調整 |
| DSX Ready 名單家數、台達是否入列 | 3 類 10 家，沒有台達 | 2027-11-25 |
| 台達 AI 相關營收占比 | 2026 Q3「接近 50%」（媒體整理） | 2027-11-05 |
| 800V 是否在 2027 年大量出貨 | ±400V 部分出貨 | 2027-11-25 |
| Flex 分拆 Axiom 是否在 2027 Q1 完成 | 計畫中 | 2027-04-30 |
| 台灣北部電廠周邊第一個核准案 | 沒看到 | 2027-11-25 |

## 系列檢查
這題不是系列後篇，不適用。跟 R04、Q40 的重疊照題庫備註處理：長期論點只留台達營收和股價一節，公司轉型不重寫，報告內不出現題號。

## 規格 §5 自查
- 主軸註解、`p.lede`、頁 00 的 tiles 和 pull：都有。
- SVG 圖 9 張，每張都有 `details.datatable`。
- 正文看得到的表格 2 張（查不到、寫法對照）。
- `p.mark` 6 句。每節都有 eyebrow 和 h2。
- 「完整數據」附錄和「查不到」一節：都有。
- 沒進報告的研究稿數字只有 ERCOT 410 GW 和「約七成」，理由是稿中沒有來源連結。
- HTML 沒有在瀏覽器實際載入過，375px、深色模式和列印都還沒看。
