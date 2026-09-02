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
| `CLAUDE.md` | 給 LLM／CLI 的一頁式使用說明 |
| `docs/claude-md-snippet.md` | 同上，但自足 —— 可以直接貼進別的專案的 `CLAUDE.md` |
| `scripts/migrate.mjs` | 把 `report/*.html` 一次推上去的遷移腳本 |
| `scripts/verify.mjs` | 遷移後逐份比對內容、sandbox 與時間戳 |

artifact 本身不在 git 裡 — **source 留 git，artifact 去 R2**。

## 現況

v2 已經上線在 <https://imitator.ai-apps.work>，272 份舊報告遷移完成並逐份驗證過
（內容 byte-for-byte、sandbox 判定、時間戳各 272/272）。

下面這些 v1 的東西還活著，等 spec §9 步驟 3 的清理：

- `index.html`、`report/`、`report_list.json`：GitHub Pages 上的舊站
- `.github/workflows/`：掃 `report/` 產 `report_list.json` 並自動 commit 回
  repo 的 Action

按 `docs/spec.md` §9，部署並跑完遷移腳本之後才輪到刪它們。
