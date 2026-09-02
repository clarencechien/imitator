# 發佈報告到 imitator

```bash
curl -X PUT https://r.example.com/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  -H "Content-Type: text/html" \
  -H "X-Visibility: group" \
  -H "X-Title: <標題>" \
  --data-binary @<file>.html
```

- `slug`：`[a-z0-9-]`，最長 64 字元。同名視為更新（舊版由 R2 versioning 保留）。
- `X-Visibility`：`public` 或 `group`，預設 `group`。`group` 就是 token 自己的組別。
- `X-Title`：選填，UTF-8，最長 200 字元。省略則沿用既有標題，再不然用 slug。
- `X-Sandbox`：選填，`on`（預設）或 `off`。artifact 預設被丟進 opaque origin，
  它的 JS 因此讀不到站上其他頁面。用到 `localStorage`／`sessionStorage`／
  `document.cookie` 的報告要設 `off`，否則會丟 SecurityError。省略則沿用舊值。
- `X-Updated-At`：選填，ISO 8601。指定這份 artifact 的時間（portal 依它由新到舊
  排序），省略就是上傳當下。不接受未來的日期。搬舊內容時才會用到。
- Body 上限 25 MB。單檔 HTML，收什麼就吐什麼 — 不會被 render 或套 template。

回應：

```json
{ "slug": "...", "url": "https://r.example.com/r/...", "visibility": "group:rd", "updatedAt": "..." }
```

其他兩個端點：

```bash
curl -X DELETE https://r.example.com/v1/a/<slug> -H "Authorization: Bearer $IMITATOR_TOKEN"
curl https://r.example.com/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN"   # public + 自己組別
```

token 洩漏等於有人能在這個網域掛任意 HTML。不要放進截圖、對話紀錄或 commit。

---

## 開發這支 Worker 本身

原始碼在 `worker/`，設計與取捨在 `docs/spec.md`，部署與輪替流程在 `worker/README.md`。

```bash
cd worker && npm install && npm test
```
