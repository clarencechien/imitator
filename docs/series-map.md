# 系列地圖

更新：2026-11-25。目的：進 thread 讀一次就知道該開哪幾個 slug，不用在三百多個檔名裡 grep。
每筆報告一句話只是主軸，細節看原文。**標「推測」的是從標題與 debugafterdark 的
`docs/report-candidates.md` 對出來的，沒有逐篇讀過，用之前先確認。**

## 原檔在哪（先讀這段）

- 線上清單：`GET /v1/a`（要 `$IMITATOR_TOKEN`）給出 380 篇的 slug、標題、`updatedAt`；內容在 `/r/<slug>`。
- **原檔放在兩個地方，不是都在 repo：**
  - repo `archive/report/<slug>.html`：v1 遷移來的 272 份，加上經 `inbox/` 發佈的。目前 338 份在這。
  - **只在 R2（bucket `imitator`）的 42 份**：用 curl 直接 PUT 的（例如 `ai-headcount-ledger`、`jevlike-tw-script`、`gb10-typed-decisions`、`bysq-report-tw-case`）。repo 裡沒有，要讀就 `curl https://imitator.ai-apps.work/r/<slug>`。
  - R2 沒有 versioning，同 slug 覆寫就是覆寫（CLAUDE.md「營運現況」）。
- 發佈後的 slug 不改名；重製或二校用新 slug 或同 slug 覆寫，下表標明。

## 少子化（3 篇 + 番外，製作中）

**分工：本檔只記「已發佈」的報告；規劃中的順序、題目、進度以研究專案的
`research/questions.md`「少子化系列」為準**（在專案共用資料夾，不在 repo，
不要在這裡重抄一份）。順序（Clarence 11/25 改定）：1 總論 Q25 → 2 誰來付錢（年金＋健保）Q26 →
3 房子 Q27（〈熄燈的窗〉重做，原 R14）→ 番外〈工作的人少了，AI 補得了嗎〉Q28。學校（原 Q19）不單獨成篇，併進總論的時刻表第一站。

目前已發佈、將被取代的舊版與素材：

| 狀態 | slug | 主軸 |
|---|---|---|
| 1 總論（2026-11-25） | `population-timetable` | 別照偏樂觀的推估過日子：出生跌破 10 萬早了十四年，照實際出生數排，人生三站約在 2032、2041、2061 年 |
| 現行（將被 Q27 新版取代） | `birthrate-vs-housing` | 〈熄燈的窗〉：生的人變少了，房價為什麼還在漲 |
| 舊素材（Q25 可參考） | `tsunami-at-taiwan-v2`（較新）、`tsunami-at-taiwan`（2025-08） | 人口海嘯：延遲到來的危機 |
| 舊素材（Q19 可參考） | `high-school`（2025-06） | 台灣升大學多元入學導覽 |
| 相關現行（Q26 要先讀） | `three-pensions-plain` | 三筆退休金，只有一筆寫著你的名字 |

**發佈新篇後**：在上表加一行實際 slug，舊版那列改成「已被 `<新 slug>` 取代」。
Q19 第一版稿（`research/runs/2026-W47/api/Q19-report.html`）不會發佈（學校併進總論）。

## ETF（3 篇，製作中）

順序以 `research/questions.md`「ETF 系列」為準（Clarence 11/23 定）：1 被動市值型 Q13 → 2 主動式 Q29 → 3 槓桿型 Q30。

| 篇 | slug | 主軸 |
|---|---|---|
| 1 被動市值型 | `etf-passive-market-cap`（2026-11-24） | 外資在賣，本國散戶在接，新錢幾乎都進了 0050 |
| 2 主動式 | 未發佈 | |
| 3 槓桿型 | 未發佈 | |

**發佈新篇後**：在上表填 slug，並回頭更新前面幾篇的「這個系列」一節（加連結、把「尚未發布」換掉）。內文觀點要跟著調整的話，先給 Clarence 看。

## 2026 系列（已發佈）

**保險課**
- `japan-insurer-bailout-report-1`（上篇，11-21 二校 v0.2）：中國政府補錢給保險公司，等於要爆炸嗎？不是，墊子變薄先加厚
- `japan-insurer-bailout-report-2`（下篇）：保險公司倒了帳單寄給誰（保戶、同業、接手公司、納稅人四種分攤）
- `japan-insurer-bailout-report-extra`（番外）：活太久誰來保，國家開的保險不會倒、只會改數字

**Meta 詐騙**（取代 5 月版 `meta-lawsuit`，該篇已過時）
- `meta-lawsuit-1`（上，v0.4）：一筆被騙的錢經過幾隻手
- `meta-lawsuit-2`（下，v0.1）：知道這批有假算不算知道，各國蓋了四種章

**不讀之後**（取代 `uncle-bob`）
- `no-read-1`：Uncle Bob 不讀程式碼，改讀規格
- `no-read-2`：Lauren Tan 審查壓到最底，改看證據
- `no-read-3`：檢查交給機器，校正量具（Claude Code 團隊）

**分層讀法**
- `layers-of-llm`（上）：不是誰追上誰，而是哪一層（美中 AI 與半導體）
- `no-exchange-rate`（下）：AI 支出的三本帳、四種單位
- `who-is-using`（番外一）：貨到哪、票開給誰、誰在用
- `who-is-using-micro`（番外二）：月租沒變，單價在改

**知行筆記**：`dankoe-one-day`（有效成分三樣）→ `knowing-is-dear`（行變便宜、知還貴）→ `practice-on-purpose`（實作篇：順便學會的要另外練）

**Slotbound 案卷**：`slotbound-case`（玩法好改也好抄）→ `slotbound-case-2`（一句話的遊戲，八小時帳單）

**韓劇中間層**：`credit-line-changed`（製作著作換了名字）→ `nameless-made-famous`（手藝帶得走，版權帶不走）

**分散筆記**：`winners-win-themselves`（贏家會自己贏）→ `not-extra-money`（股息不是多出來的錢）。後續 `winners-on-the-list`（11-22 v0.2）：贏家是名單上的台積電

**AI 平台地形**：`ai-platform-2026-10`（上，Zeabur 之後每一層都要能說不）→ `ai-platform-2026-11`（下，帳單印著誰的名字）；`ai-platform-2026-11-cf`、`workers-ai-appendix` 是選 Cloudflare 的實戰帳與番外

**驗收筆記**：`unlimited-token-report`（無限的是 token、有限的是驗收）→ `million-cores-report`（下篇：百萬 CPU 是用來驗的）→ `fomo-flyer`（番外，推測）

**LLM 使用者差異／鏡子**：`ai-mirror-1`（上篇，同一個工具為什麼結果差這麼多）→ `ai-mirror-2`（下篇，鑑別力寫成 repo 裡可執行的工件）→ `ai-mirror-3`（第三篇，測試在測什麼）；延伸一 `agent-survival-2026h2`（2026H2 Agent 生存指南）→ 延伸二 `everyone-an-architect`（人人都是建築師，原本自標第三篇，11-24 改標）；相關 `no-read-1`。2026-11-24 改 v3 後換新 slug 發佈，`ai-amp-or-mir`、`ai-amp-or-mirror-2`、`llm-testing-essence` 是 v1 舊版（owner 是別組，inbox 改不了），已被 `ai-mirror-1`／`-2`／`-3` 取代

**退休**（推測）：`retire-floor-basics`（地板有多硬）→ `retire-floor-playbook`（實戰篇，用法用量）→ `rent-ratio-or-scale`（番外：租與買，差的是盤子）；相關 `three-pensions-plain`、`bysq-report-tw-case`（只在 R2）、`bysq-report-twvt`、`four-percent-rule`

**架構系列**（工程師向）：`agent-arch` → `agent-arch-2` → `agent-arch-3` → `agent-arch-4` → `agent-arch-5` → `agent-arch-6`；平行：`test-agent-arch`、`actor-to-durable-objects-v2`（最新版，同題舊版 `actor-to-durable-objects*`）

**jevlike**：`jevlike-tw-script`（繁簡字形，只在 R2）、`jevlike-primer`、`jevlike-audio`（這條線收了）

**91APP**：`91app-breach-findings` → `91app-inner-doors`（續報）

**外送專法**：`delivery-pay-floor`；`second-read`（二校，更正說明欄）

## 自動研究（bot 發佈）

- `ai-headcount-ledger`（2026-11-23，Q02；v0.3 起走 inbox，原稿在 `research/ai-headcount-ledger/`）：AI 省了人，年報裡對得到哪一格（七家公司對帳）。是 W47 第一批公開的自動研究。
- `ai-datacenter-debt`（2026-11-24，Q18；原稿在 `research/ai-datacenter-debt/`）：借得到的，替借不到的作保（AI 機房的錢有多少是借的，含 Nvidia 的循環融資）。
- 其餘自動研究依 `research/questions.md` 排隊，發佈後在這裡補一行。

## 2025 冷飯重製（新取代舊）

重製後新報告用新 slug，舊報告留在站上但視為已過時。完整清單與鉤子見 debugafterdark 的 `docs/remake-candidates.md`，尚未重製的列在這裡讓你別當成現行版本：

| 主題 | 舊 slug（2025，待重製） | 狀態 |
|---|---|---|
| 軟體知識失傳 | `jonathan-blow`、`kent-back` | 研究完成，待寫 |
| 致命三要素 | `fowler-vs-willison` | 同上 |
| AI 電力 | `ai-power`、`ai-power-revolution`、`megapack-vs-bess`、`delta` | 同上 |
| 石英危機 | `quartz-crisis`、`paradigm-shifts` | 同上 |
| Apple 中國 | `apple-in-china`、`apple-at-cn` | 同上 |
| Altman 對帳 | `gentle-singularity`、`openai-next`、`ai-generation-with-openai` | 同上 |
| Robotaxi 對帳 | `elonmusk`、`tesla-vs-waymo`、`ray-on-robotaxi` | 同上 |
| 以房養老／海外傳承／失能險 | `reverse-mortgage`、`inheritance`、`disability-ins` | 同上 |
| 穩定幣／黃金／一次投入 vs 定期 | `stable`、`stable-coin`、`tether`、`bloomberg-324` | 同上 |

重製完成後：新 slug 填進此表，舊列改成「已被 `<新 slug>` 取代」。

## 維護規則

- 本檔是**已發佈**報告的唯一來源；排隊中的題目在 `research/questions.md`，兩邊互相指向，不重抄。

- 每次發佈系列的新篇，順手改這份（一行就好），也回頭更新同系列前面幾篇的「這個系列」連結，同一個 PR 一起推。
- 不確定的標「推測」，確認後再拿掉。
