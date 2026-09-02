# imitator

單檔 HTML 報告的 host。丟一個 HTML 上去，拿一個網址回來。

```bash
curl -X PUT https://imitator.ai-apps.work/v1/a/my-report \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  -H "Content-Type: text/html" \
  --data-binary @report.html
```

兩種可見度：`public` 與 `group`。group 的存取以**群體**為單位，不辨識個人 —
拿到有效 link 的人就能看，拿到有效 token 的人就能推；人員變動時 host 重發
link／token，先前發出的一律失效。

## 這個 repo 裡有什麼

| | |
|---|---|
| `worker/` | Cloudflare Worker 原始碼與部署設定。[部署與管理流程](worker/README.md) |
| `docs/spec.md` | v2 的設計、取捨，以及明確不採用的方案 |
| `docs/publishing-rules.md` | 上傳時會被檢查的規則（英文，錯誤訊息指向它） |
| `CLAUDE.md` | 給 LLM／CLI 的一頁式使用說明 |
| `docs/claude-md-snippet.md` | 同上，但自足 —— 可以直接貼進別的專案的 `CLAUDE.md` |
| `scripts/migrate.mjs` | 把 `archive/report/*.html` 一次推上去的遷移腳本 |
| `scripts/verify.mjs` | 遷移後逐份比對內容、sandbox 與時間戳 |
| `scripts/inline-cdn.mjs` | 把 runtime 抓的第三方 script 換成內聯快照（無相依套件）|
| `inbox/` | 丟一個 HTML 進來 commit 到 main 就會自動發佈成 public，手機也能用。[怎麼用](inbox/README.md) |
| `scripts/publish-inbox.mjs` | 上面那條路的實作，由 `.github/workflows/publish-inbox.yml` 觸發 |
| `archive/` | v1 的 GitHub Pages 站，已凍結。[為什麼留著](archive/README.md) |

artifact 本身不在 git 裡 — **source 留 git，artifact 去 R2**。

## 現況

v2 上線在 <https://imitator.ai-apps.work>。272 份 v1 的舊報告遷移完成並逐份驗證過
（內容 byte-for-byte、sandbox 判定、時間戳各 272/272），之後陸續發佈的加起來目前
共 275 份。

兩條發佈路徑：`curl` 一行（見 [`CLAUDE.md`](CLAUDE.md)），或把 HTML 丟進
[`inbox/`](inbox/) commit 到 `main`（GitHub Action 會發佈，手機用瀏覽器就能操作）。
Portal 預設只列最近三個月，`?all=1` 看全部 —— 每一筆大約 271 bytes，全部塞進一個
回應會隨份數線性長大。

v1 已下線：`report/`、`report_list.json`、`index.html` 搬進 [`archive/`](archive/)
凍結保存，掃 `report/` 自動 commit 回 repo 的 GitHub Action 已移除。GitHub Pages
本身是 repo 設定（Settings → Pages → Source: None），不在 git 裡。

`archive/report_list.json` **不要刪** —— 那是那 272 份報告真實時間的唯一副本，
`git log` 重建不出來（這份 repo 的歷史被整批重傳過，所有檔案的 committer date
都是同一天）。
