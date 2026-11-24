# research — 報告的原稿

每一份報告上線都走這個 repo：報告 HTML 放進 `inbox/`，同一個 commit 把原稿放進 `research/<slug>/`。PR 合併到 `main` 之後，`inbox/` 的 Action 會把報告發佈成 public，再把 HTML 搬到 `archive/report/<slug>.html`。報告和原稿從此都留在 git 歷史裡，可以追版本。

## 一份報告的資料夾

`research/<slug>/` 裡放：

| 檔案 | 內容 |
|---|---|
| `draft-vN.md` | 研究稿（上網查資料寫成的底稿，含來源和一年後的對帳點） |
| `review-vN.md`、`gaps-vN.md` | 審稿紀錄、補資料紀錄 |
| `notes-vN.md` | 改版時的補充筆記（有才放） |
| `report-vX.html` | 被新版取代之前的舊版報告（R2 覆寫就沒了，舊版只能留在這裡） |

最新版的報告不放在這裡，要看就去 `archive/report/<slug>.html`。

## 規則

- 上線前先給 Clarence 看，他同意才合併 PR。合併等於公開，`inbox/` 沒有預覽。
- 同一個 slug 再推一次，等於覆寫線上版本。所以要先把線上的舊版存成 `report-vX.html`。
- 對帳點只寫在研究稿和審稿裡，不放進報告正文。
- 原稿裡不能有 token 或任何私人資料。
- 系列報告的新篇上線時，同一個 PR 要回頭更新前面幾篇：「這個系列」補上連結，必要時調整內文觀點（改觀點要先給 Clarence 看）。`docs/series-map.md` 也一起更新。
- 自動研究的報告，`<title>` 一律寫成「自動研究｜<標題>」，在列表上一眼就看得出來。內文開頭有一行統一的 header 標籤「AUTORESEARCH · 自動研究 · <題號> · <版本> · 查詢日 <日期>」（查詢日只放這裡，eyebrow 不再寫），等寬字、淡色、沒有外框，照 Q02 的樣式；研究專案的 api_draft.py `set_ar_tag` 會自動加。
