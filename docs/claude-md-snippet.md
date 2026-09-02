# 給其他專案用的 CLAUDE.md 片段

把下面 `---` 之間的內容貼進**任何一個專案**的 `CLAUDE.md`，那個專案的 Claude Code
就會用 imitator 發佈報告。

## 先把 token 放進環境變數

token 不要進 repo、不要進 `CLAUDE.md`、不要出現在對話裡。放在只有你看得到的地方，
兩個選一個：

```bash
# 1. shell 設定檔（~/.zshrc 或 ~/.bashrc）
export IMITATOR_TOKEN='imi_rd_1_xxxxxxxx'
```

```jsonc
// 2. ~/.claude/settings.json —— 所有 Claude Code session 都吃得到，不用開新 shell
{
  "env": {
    "IMITATOR_TOKEN": "imi_rd_1_xxxxxxxx"
  }
}
```

token 洩漏等於有人能在這個網域掛任意 HTML —— 一台現成的釣魚頁主機，可能導致整個
網域被停用。真的漏了就去 `config/groups.json` 把 `write.secret` 改成 `"ROTATE"`，
打開網站，新的會出現在 R2 的 `outbox/`。

---

## 發佈報告到 imitator

單檔 HTML 的 host。丟一個 HTML 上去，拿一個網址回來。

```bash
curl -X PUT https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  -H "Content-Type: text/html" \
  -H "X-Title: <標題>" \
  --data-binary @<file>.html
```

回應：

```json
{
  "slug": "...",
  "url": "https://imitator.ai-apps.work/r/...",
  "visibility": "group:rd",
  "owner": "rd",
  "sandbox": "on",
  "updatedAt": "..."
}
```

### 參數

| header | 說明 |
|---|---|
| `X-Title` | 選填，UTF-8，最長 200 字元。省略則沿用既有標題，再不然用 slug |
| `X-Visibility` | `public` 或 `group`，**預設 `group`**（只有同組的人看得到）|
| `X-Sandbox` | `on`（預設）或 `off`，見下 |
| `X-Updated-At` | 選填，ISO 8601。指定這份報告的時間，省略就是上傳當下。不接受未來的日期 |

`slug`：`[a-z0-9-]`，最長 64 字元。**同名視為更新，舊版不會保留** —— 覆寫就是
覆寫。要留舊版就換一個 slug。

Body 上限 25 MB。單檔 HTML，收什麼就吐什麼 —— 不會被 render，也不會套 template。

### 什麼時候要設 `X-Sandbox: off`

artifact 預設被丟進 opaque origin（`Content-Security-Policy: sandbox`），這樣報告
裡的 JS 就讀不到站上其他頁面。代價是這些 API 會丟 `SecurityError`：

`localStorage`、`sessionStorage`、`document.cookie`、`indexedDB`、`Notification`、
`BroadcastChannel`、`SharedWorker`、`serviceWorker`、`document.domain`

**推之前先在 HTML 裡找過這些字**，有的話加 `-H "X-Sandbox: off"`，否則報告會在
瀏覽器裡靜靜地壞掉。一般的圖表、Tailwind、外部 CDN script 都不受影響，連結導覽
也正常。省略這個 header 時沿用該 slug 既有的設定。


## 產生報告的 prompt 要交代兩件事

- **「不要在 runtime 從 CDN 載入任何 script 或 style，全部內聯進單一 HTML。」**
  舊的 273 份裡有 234 份在 runtime 抓 `cdn.tailwindcss.com`、`cdn.jsdelivr.net`
  或 `unpkg.com`。有 sandbox 的話問題不大，但那是對三個第三方的長期依賴，
  它們隨時可以改掉自己送出來的東西。
- **「不要用 `localStorage` 或任何 storage API，狀態放在變數裡就好。」**
  用了就得 `X-Sandbox: off`，而那會拿掉 sandbox、讓那一頁的 JS 有完整的同源
  權限 —— 於是它載入的任何第三方腳本都繼承了「讀走全站內容」的能力。

已經寫好的報告要補救的話，`scripts/inline-cdn.mjs`（在 imitator 的 repo 裡） 會把 runtime 抓的第三方 script
換成內聯快照（`--check` 只報告不動檔案）。它只用 Node 內建模組，沒有相依套件。

這兩件事會被 host 檢查：**`X-Sandbox: off` 又載入第三方 script 會直接回 400**，
什麼都不會寫進去；用了 storage API 卻沒關 sandbox 則回 200 加一則 warning
（那個組合會讓頁面在瀏覽器裡靜靜地壞掉）。完整規則見
<https://github.com/clarencechien/imitator/blob/main/docs/publishing-rules.md>，錯誤訊息也會指向它。

### 其他兩個端點

```bash
# 刪除
curl -X DELETE https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN"

# 列出 public ＋ 自己組別的
curl https://imitator.ai-apps.work/v1/a \
  -H "Authorization: Bearer $IMITATOR_TOKEN"
```

### 規則

- **token 只從 `$IMITATOR_TOKEN` 讀。** 不要印出來、不要寫進任何檔案、不要
  commit、不要放進截圖或說明文字。指令裡一律用 `$IMITATOR_TOKEN` 這個變數本身。
- 環境變數沒設的話**停下來請使用者設定**，不要自己編一個或改用別的方式。
- 推完之後 `curl -sI <回應裡的 url>` 確認回 200 再跟使用者說完成。
- 沒有明確要求公開就不要加 `X-Visibility: public` —— 預設的 `group` 是比較安全的
  那一邊，而且 public 的內容會進邊緣快取，撤下來沒有那麼即時。
