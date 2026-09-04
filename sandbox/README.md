# sandbox/ — 從 imitator 下架的應用程式

這裡放的不是報告，是**應用程式**。它們曾經住在 `imitator.ai-apps.work`，帶著
`X-Sandbox: off` 上架，也就是**完全沒有 CSP**（不是比較寬鬆的 sandbox，是沒有）。

## 為什麼要搬出來

artifact 預設會被丟進 opaque origin，那是 imitator 的核心防護：報告的 JS 讀不到
portal 的列表、讀不到別份 group 報告的內容，也發不出帶 cookie 的同源請求。

`X-Sandbox: off` 把那道牆整個拿掉。這三份因此擁有 `imitator.ai-apps.work` 的完整
同源權限 —— 而且它們**共用同一份 localStorage**，`mb_timer` 的 JS 讀得到
`twqr_fubon_v2` 存的拆帳金額。它們之間也沒有隔離。

在目前的架構下後果有界：`/v1/a` 只認 Bearer，這幾份沒有 token，所以讀得到但寫不動。
但只要發佈動線往瀏覽器移一步（PWA 存 token、或 Worker 接受 cookie 授權），它們就會從
唯讀變成可寫。詳見 [`docs/sandbox-plan.md`](../docs/sandbox-plan.md)。

## 為什麼它們收不掉

另外五份用到 storage 的報告都已經收回 `sandbox: on`（2026-09-04 完成） —— 那些用途是主題偏好、語言
偏好、勾選狀態、拖曳排序、註解草稿，改成放在變數裡或改用明確的匯出就好。這三份不行：

| 檔案 | 標題 | 為什麼需要真實來源 |
|---|---|---|
| `twqrcode.html` | 辦公室拆帳小助手 — 富邦專屬實測版 | `localStorage` 存的是拆帳資料，那是 app 的核心狀態，拿掉就沒有這個工具了 |
| `mb_timer_v2.html` | 皮克敏蘑菇計時 | 除了計時狀態還用 `Notification` ×8。**那個 API 在 opaque origin 下根本不存在**，不是換個寫法能解的 |
| `mb_timer.html` | 皮克敏蘑菇計時（v1） | `mb_timer_v2` 的舊版。v2 開啟時會讀 `pikmin_mushrooms_v1` 把資料接手過去 |

真正的問題不是「怎麼把它們改成不用 storage」，是**一個 report host 上住著三個 app**。

## 這裡的檔案是什麼狀態

**下架當時的原樣，一個字都沒改。** 沒有被拿掉 storage、沒有被套新底盤 ——
之後要在別的地方重建時，這是起點。

放在 `sandbox/` 而不是 `archive/report/`，是為了讓 `scripts/migrate.mjs --force`
迭代不到它們（那支腳本掃的是 `archive/report/`），否則下次重推會又把三個例外送回去。

原始時間戳還留在 `archive/report_list.json` 裡 —— 那份是舊 Action 逐次累積下來的
真實時間，`git log` 重建不出來，所以不動它：

```
twqrcode      2026/05/20 17:17:27
mb_timer      2026/06/04 22:44:09
mb_timer_v2   2026/07/10 13:53:01
```

## 之後

要在 GitHub Pages 或別的網域重建 —— 那裡有真實來源，`localStorage` 與
`Notification` 都正常，而且它們的 storage 會跟 imitator 的來源分開，上面說的
「`mb_timer` 讀得到拆帳金額」那件事會一起消失。

怎麼做還沒討論。在那之前，這三份只存在於這個資料夾裡。
