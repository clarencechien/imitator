# 發佈報告到 imitator

`$IMITATOR_TOKEN` 從環境變數讀（`~/.zshrc` 或 `~/.claude/settings.json` 的 `env`），
不要寫進 repo 或印出來。沒設的話停下來請使用者設定，不要自己編一個。

要把這段搬到別的專案，用 `docs/claude-md-snippet.md` —— 那份是自足的。

```bash
curl -X PUT https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  -H "Content-Type: text/html" \
  -H "X-Visibility: group" \
  -H "X-Title: <標題>" \
  --data-binary @<file>.html
```

- `slug`：`[a-z0-9-]`，最長 64 字元。同名視為更新，**舊版不會保留** —— R2 沒有
  object versioning，覆寫就是覆寫。要留舊版就換一個 slug。
- `X-Visibility`：`public` 或 `group`，預設 `group`。`group` 就是 token 自己的組別。
- `X-Title`：選填，UTF-8，最長 200 字元。省略則沿用既有標題，再不然用 slug。
- `X-Sandbox`：選填，`on`（預設）或 `off`。artifact 預設被丟進 opaque origin，
  它的 JS 因此讀不到站上其他頁面。**推之前先在 HTML 裡找** `localStorage`、
  `sessionStorage`、`document.cookie`、`indexedDB`、`Notification`、
  `BroadcastChannel`、`SharedWorker`、`serviceWorker`、`document.domain` ——
  有的話要設 `off`，否則報告會丟 SecurityError 靜靜地壞掉。省略則沿用舊值。
- `X-Updated-At`：選填，ISO 8601。指定這份 artifact 的時間（portal 依它由新到舊
  排序），省略就是上傳當下。不接受未來的日期。搬舊內容時才會用到。
- Body 上限 25 MB。單檔 HTML，收什麼就吐什麼 — 不會被 render 或套 template。

回應：

```json
{ "slug": "...", "url": "https://imitator.ai-apps.work/r/...", "visibility": "group:rd", "owner": "rd", "updatedAt": "..." }
```

其他兩個端點：

```bash
curl -X DELETE https://imitator.ai-apps.work/v1/a/<slug> -H "Authorization: Bearer $IMITATOR_TOKEN"
curl https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN"   # public + 自己組別
```

token 洩漏等於有人能在這個網域掛任意 HTML。不要放進截圖、對話紀錄或 commit。

不想用 curl 的時候：把 HTML 放進 `inbox/` commit 到 `main`，GitHub Action 會發佈成
public 並把原始檔搬進 `archive/report/`。手機上用瀏覽器開 GitHub 上傳就行，見
`inbox/README.md`。


## 產生報告的 prompt 要交代兩件事

- **「不要在 runtime 從 CDN 載入任何 script 或 style，全部內聯進單一 HTML。」**
  舊的 272 份裡有 234 份在 runtime 抓 `cdn.tailwindcss.com`、`cdn.jsdelivr.net`
  或 `unpkg.com`。有 sandbox 的話問題不大，但那是對三個第三方的長期依賴，
  它們隨時可以改掉自己送出來的東西。
- **「不要用 `localStorage` 或任何 storage API，狀態放在變數裡就好。」**
  用了就得 `X-Sandbox: off`，而那會拿掉 sandbox、讓那一頁的 JS 有完整的同源
  權限 —— 於是它載入的任何第三方腳本都繼承了「讀走全站內容」的能力。

已經寫好的報告要補救的話，`scripts/inline-cdn.mjs` 會把 runtime 抓的第三方 script
換成內聯快照（`--check` 只報告不動檔案）。它只用 Node 內建模組，沒有相依套件。

這兩件事會被 host 檢查：**`X-Sandbox: off` 又載入第三方 script 會直接回 400**，
什麼都不會寫進去；用了 storage API 卻沒關 sandbox 則回 200 加一則 warning
（那個組合會讓頁面在瀏覽器裡靜靜地壞掉）。完整規則見
[`docs/publishing-rules.md`](docs/publishing-rules.md)，錯誤訊息也會指向它。

---

## 開發這支 Worker 本身

原始碼在 `worker/`，設計與取捨在 `docs/spec.md`，部署與輪替流程在 `worker/README.md`。

```bash
cd worker && npm install && npm test
```
