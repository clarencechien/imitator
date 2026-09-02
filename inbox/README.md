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
   secret，名稱 `IMITATOR_TOKEN`。

   > 用 CLI 那個 token 可以動，但它能覆寫與刪除**所有** artifact，包含這條路
   > 用不到的 `group:` 私有內容 —— 而 R2 沒有 versioning，刪掉就沒了。凡是有
   > push 權限的人、以及 job 裡執行的任何東西（`actions/checkout` 被入侵也算）
   > 都握有它。建議發一個專用的 group，見下面。
2. **Build watch paths**：Cloudflare → Workers → imitator → Settings → Build →
   **Build watch paths → Include paths** 設成 `worker/*`。這支 Action 會 commit
   回 main，不設的話每發佈一份報告就會多觸發一次 Worker 部署。

   同一頁有三個欄位會互相混淆，正確的組合是：

   | Root directory | Include paths | Exclude paths |
   |---|---|---|
   | `worker/` | `worker/*` | 留空 |

   > ⚠️ **Root directory** 不能有萬用字元 —— 填 `worker/*` 會找不到目錄，build
   > 當場失敗。**Exclude paths** 填 `worker/*` 則是相反的意思（Worker 的改動
   > 不要 build）。這兩種錯法的症狀一樣：站台繼續用舊版本正常服務，從外面
   > 完全看不出來。

3. **Bot Fight Mode 要關掉**：Cloudflare → Security → Bots → Bot Fight Mode。
   GitHub 的 runner 走資料中心 IP、UA 是 `node`，開著的話會被判成自動化流量、
   收到 `Just a moment...` 的挑戰頁而不是我們的 API。**它沒辦法只對特定路徑
   放行** —— 官方文件明講它跑在 Ruleset Engine 之外，WAF custom rule 的
   Skip／Bypass／Allow 對它都沒有作用，Page Rules 也一樣。
   關掉的附帶好處：那段被注入到每份報告 `</body>` 前的
   `/cdn-cgi/challenge-platform` 腳本會跟著消失（JS Detections 是 BFM 自動
   開啟且不能單獨關的），「收什麼吐什麼」在網路上才真的成立。
   擋掃描器的工作本來就是那條 WAF custom rule 在做，不是 BFM。

### 專用的 group（建議，但先讀完這段）

在 `config/groups.json` 加一個只有 `write` 區塊的 group，把它的 token 換進
secret，外洩時就只需要撤銷它、不影響你的 CLI：

```json
"bot": { "name": "自動發佈", "epoch": 1, "write": { "secret": "ROTATE" } }
```

沒有 `read` 區塊代表沒有人 join 得進這個 group —— 它只能推、不會被讀。

**代價要先知道**：擁有權是綁 group 的。換成 `bot` 之後，這條路就**只能發新的
slug，不能更新既有那 272 份**（它們的 owner 是 `rd`），試了會拿到 403 並在
summary 裡說明。要更新舊報告就從 CLI 用 `rd` 的 token 推。

換 secret 之前也要先確認既有 artifact 的 `owner` 都補完了：

```bash
curl -s https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN" \
  | grep -c '"owner": null'      # 要是 0
```

## 撤下來要手動

這條路只負責發佈。要刪掉一份報告：

```bash
curl -X DELETE https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN"
```

從 `inbox/` 或 `archive/` 刪檔案**不會**把線上的撤掉。
