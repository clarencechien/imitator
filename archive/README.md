# archive — v1 的 GitHub Pages 站

**這裡的東西已經凍結，不會再更新，也沒有在服務任何流量。**

272 份報告已經遷移到 <https://imitator.ai-apps.work>（spec §9），並逐份驗證過內容
byte-for-byte 一致。這份留著只是因為它是原始檔與**時間戳的唯一來源**。

| | |
|---|---|
| `report/` | 272 份單檔 HTML 報告的原始檔 |
| `report_list.json` | 每一份的真實時間，由舊 Action 逐次累積 |
| `index.html` | 舊的 Materialize landing page，讀 `report_list.json` 產生清單 |

## 為什麼 report_list.json 不能刪

它是那些報告真實時間的唯一副本。**`git log` 不能拿來重建** —— 這份 repo 的歷史
被整批重傳過，272 個檔案的 committer date 全都是同一天。遷移時就是靠這份 JSON
透過 `X-Updated-At` 把時間送上去的（見 `scripts/migrate.mjs`）。

刪掉它之後，那些時間就只剩 R2 的 `customMetadata` 一份。

## 一起移除的東西

`.github/workflows/jekyll-gh-pages.yml`（名字叫 jekyll，實際上是 "Generate Report
List"）—— 掃 `report/` 產 `report_list.json` 再自動 commit 回 repo。那支 Action
是這個 repo 862 個 commit 裡的主要噪音來源，現在沒有東西需要它了。

GitHub Pages 本身是 repo 的設定（Settings → Pages → Source: None），不在 git 裡。
