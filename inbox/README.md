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

## 撤下來要手動

這條路只負責發佈。要刪掉一份報告：

```bash
curl -X DELETE https://imitator.ai-apps.work/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN"
```

從 `inbox/` 或 `archive/` 刪檔案**不會**把線上的撤掉。
