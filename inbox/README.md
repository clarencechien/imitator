# inbox — 丟進來就會自動發佈

把單檔 HTML 放進這個資料夾並 commit 到 `main`，GitHub Action 會把它 `PUT` 到
<https://imitator.ai-apps.work>，然後把原始檔搬進 `archive/report/`。

**這裡的東西一律發佈成 `public`。** 丟進來就等於公開，沒有預覽也沒有確認步驟。

## 用手機發佈

1. 手機瀏覽器開 <https://github.com/clarencechien/imitator/tree/main/inbox>
2. **Add file → Upload files**（或 Create new file 直接貼 HTML）
3. Commit 到 `main`
4. 到 **Actions** 分頁看那次 run 的 summary —— 網址會列在表格裡

GitHub 手機 App 不支援上傳檔案，但可以「新增檔案 + 貼上內容」；要上傳既有檔案
就用瀏覽器版。

## 檔名決定網址

`我的報告.html` → slug 取 `[a-z0-9-]`，所以請用英數與連字號命名：

```
ai-roi.html  →  https://imitator.ai-apps.work/r/ai-roi
```

**同名視為更新，舊版不會保留**（R2 沒有 versioning，覆寫就是覆寫）。要留舊版就換
一個檔名。

## 自動處理的事

| | |
|---|---|
| 標題 | 取自 HTML 的 `<title>`，沒有就用 slug |
| sandbox | 自動偵測。用到 `localStorage`、`indexedDB`、`Notification` 那類 API 的會自動帶 `X-Sandbox: off`，否則報告會在 opaque origin 下丟 SecurityError |
| 失敗 | 檔案留在 `inbox/`，修好再 push 一次就重試；已成功的不會重複發 |

上限 25 MB。

## 設定（只需要做一次）

1. **repo secret**：Settings → Secrets and variables → Actions → New repository
   secret，名稱 `IMITATOR_TOKEN`。可以直接用你 CLI 在用的那個 token。
2. **Build watch paths**：Cloudflare → Workers → imitator → Settings → Build →
   Build watch paths，includes 設成 `worker/*`。這支 Action 會 commit 回 main，
   不設的話每發佈一份報告就會多觸發一次 Worker 部署。

3. **Bot Fight Mode 要關掉**：Cloudflare → Security → Bots → Bot Fight Mode。
   GitHub 的 runner 走資料中心 IP、UA 是 `node`，開著的話會被判成自動化流量、
   收到 `Just a moment...` 的挑戰頁而不是我們的 API。**它沒辦法只對特定路徑
   放行** —— 官方文件明講它跑在 Ruleset Engine 之外，WAF custom rule 的
   Skip／Bypass／Allow 對它都沒有作用，Page Rules 也一樣。
   關掉的附帶好處：那段被注入到每份報告 `</body>` 前的
   `/cdn-cgi/challenge-platform` 腳本會跟著消失（JS Detections 是 BFM 自動
   開啟且不能單獨關的），「收什麼吐什麼」在網路上才真的成立。
   擋掃描器的工作本來就是那條 WAF custom rule 在做，不是 BFM。

日後如果要給這條路一個專用的 token（外洩時可以只撤銷它、不影響你的 CLI），
在 `config/groups.json` 加一個 group 再把它的 token 換進 secret 即可 —— 但
**加第二個 group 之前**要先把既有 artifact 的 `owner` 補完，見
`worker/README.md`。

## 撤下來要手動

這條路只負責發佈。要刪掉一份報告：

```bash
curl -X DELETE https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN"
```

從 `inbox/` 或 `archive/` 刪檔案**不會**把線上的撤掉。
