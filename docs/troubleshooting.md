# 發佈出錯的時候

先看回應本身。同樣是「推不上去」，被擋在哪一層差很多：有的還沒碰到
`groups.json`，有的是 token 對了但 slug 不是你的，有的根本沒進到 Worker。
下面依錯誤訊息查。token 的發放與輪替另見 [`token-rotation.md`](token-rotation.md)。

## 錯誤訊息對照表

API 的檢查順序在 `worker/src/index.js`：先看標頭格式，再查 `groups.json`，
最後才看 slug 的擁有權。所以訊息本身就告訴你卡在第幾關。

| 狀態 | 訊息 | 卡在哪一關 | 意思 |
|---|---|---|---|
| 401 | `missing or malformed bearer token` | 第一關：只看格式，還沒讀 `groups.json` | `Authorization` 標頭沒送到，或內容不是 `Bearer imi_{gid}_{epoch}_{random}`。**跟 token 對不對無關。** 見 [§1](#1-401-missing-or-malformed-bearer-token) |
| 401 | `invalid token` | 第二關：格式對了，比對 `groups.json` 失敗 | gid 不存在、epoch 不符、`write.secret` 還是 `"ROTATE"`、`write.expiresAt` 過期或沒填、secret 不符。見 [§2](#2-401-invalid-token) |
| 403 | `slug belongs to another group`（JSON） | 第三關：token 有效，但這個 slug 的 owner 是別組 | 見 [§3](#3-403-slug-belongs-to-another-group) |
| 403 | 一整頁 HTML（`Just a moment...`） | 沒進到 Worker，Cloudflare 擋在前面 | Bot Fight Mode 或 WAF。GitHub runner 最常遇到，見 [`inbox/README.md`](../inbox/README.md) 的設定第 3 點 |
| 400 | `slug must match [a-z0-9-]{1,64}` | — | slug 只能用小寫英數與連字號 |
| 400 | `empty body` | — | `--data-binary @檔名` 的路徑錯了，curl 送了空的 body |
| 400 | `X-Visibility …`／`X-Sandbox …`／`X-Updated-At …` | — | 標頭值不合法，`X-Updated-At` 不能是未來的時間 |
| 400 | JSON 帶 `error`／`reason`／`fix` | 內容檢查 | sandbox 與第三方 script 的規則，見 [`publishing-rules.md`](publishing-rules.md) |
| 413 | `body exceeds 25 MB` | — | 檔案太大 |
| 429 | `slow down` | Worker 內的減速帶 | 同一個 IP 10 秒內超過 200 次，等 10 秒 |

兩個 401 要分開看。第一個代表 token 根本沒送到，這時去輪替 token 沒有用。

---

## 1. 401 `missing or malformed bearer token`

`worker/src/session.js` 的 `parseBearer` 只做格式檢查：標頭要是
`Bearer ` 加 20 到 600 個 `[A-Za-z0-9_.-]`，而且要拆得出
`imi_{gid}_{epoch}_{random}`。常見的原因有三個。

**多行指令的接續斷掉。** 行尾的 `\` 後面不能有任何字元。從聊天介面或 Markdown
複製時常會變成 `\\`，或在 `\` 後面多一個空白。shell 會在那裡把指令結束，下一行的
`-H "Authorization: …"` 變成另一條獨立指令，curl 送出去的請求沒有這個標頭。最穩的
做法是寫成一行：

```bash
curl https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN"
```

**變數在這個 shell 裡是空的。** 新開的終端機沒有 `export`。另外要注意，寫在
`~/.claude/settings.json` 的 `env` 只有 Claude Code 的 session 吃得到，自己開的
終端機看不到。

**變數裡不是完整的 token。** 只放了 `groups.json` 裡的 `write.secret` 那一段，或
複製時帶進了引號、全形字元。

下面這行只印長度和開頭，不會把 secret 印出來，可以一次分辨後兩種：

```bash
echo "長度 ${#IMITATOR_TOKEN}，開頭 ${IMITATOR_TOKEN:0:7}"
```

長度是 0 就是沒設；開頭不是 `imi_rd_`（或你那組的 gid）就是內容不對；兩者都正常，
就回頭檢查指令有沒有被拆成兩行。設定變數的安全做法見
[`token-rotation.md` 的最後一節](token-rotation.md#把-token-放進環境變數)。

## 2. 401 `invalid token`

格式對了，token 也送到了，是 `groups.json` 對不上。`verifyWriteToken` 依序檢查：

1. gid 在 `groups` 裡存在。
2. token 裡的 epoch 等於 `groups.{gid}.epoch`。手動把 epoch +1 之後，舊 token 全部失效。
3. `write.secret` 不是 `"ROTATE"`。是的話代表輪替還沒完成，打開網站一次。
4. `write.expiresAt` 存在而且還沒到。**沒填也算過期**（`notExpired` 對缺值回 false），
   手動寫 secret 時要記得一起填。預設效期 90 天。
5. secret 相符。

另一種情況是 `groups.json` 存檔時 JSON 格式壞了。Worker 讀不懂時會當成沒有任何
group，所有 token 都會變成 `invalid token`，哨兵值也不會被處理。

設定快取最多一分鐘，剛改完 `groups.json` 就測，看到的可能還是舊的。

## 3. 403 `slug belongs to another group`

覆寫與刪除的判準在 `worker/src/artifacts.js` 的 `canWrite`，只有一行：

```js
return meta.owner === gid;
```

`owner` 是第一次寫入這個 slug 的那組 gid，之後不會轉手。比的是 group 名稱，不是
secret，所以**輪替 token 不影響你能不能覆寫自己的 slug**。

### 最常見的情境：inbox 改不了舊報告

inbox 的 Action 用的是 repo secret 裡那把 token。它跟你 CLI 的 token 常常不是同一組
（[`inbox/README.md`](../inbox/README.md) 建議 inbox 用專用的 group）。v1 遷移過來的
舊報告與用 curl 推的報告，owner 多半是 `rd`，所以 inbox 改不了它們，檔案會被移進
`inbox/rejected/`。

擋下它的是 Worker，不是 GitHub。用網頁上傳、`git push`、GitHub API 或任何 agent 工具
commit 進 `inbox/`，最後都是同一把 token 去 PUT，結果都一樣。能走的路只有三條：

1. 用 owner 那組的 token 從 CLI 推（見下方指令）。
2. 把 repo secret 換成 owner 那組的 token。代價是那把 token 放在 Action 裡，爆炸半徑變大，見 `inbox/README.md` 的「專用的 group」。
3. 換一個 slug 發成新的一份。舊網址的內容不會變。

被移進 `inbox/rejected/` 的檔案還在 repo 裡，可以直接從 GitHub 抓回來推，不用先 clone：

```bash
curl -sL https://raw.githubusercontent.com/clarencechien/imitator/main/inbox/rejected/<檔名>.html | curl -s -X PUT https://imitator.ai-apps.work/v1/a/<slug> -H "Authorization: Bearer $IMITATOR_TOKEN" -H "Content-Type: text/html" -H "X-Visibility: public" --data-binary @- ; echo
```

`X-Visibility` 沒帶時預設是 `group`，原本是 public 的報告要明確帶上，否則一更新就
變成只有組員看得到。推成功後把 `inbox/rejected/` 裡那份刪掉。

### `GET /v1/a` 列出的 owner 不是判準

這一點文件以前沒有寫清楚。owner 存在兩個地方：

| | 存在哪 | 誰讀它 |
|---|---|---|
| 判準 | R2 物件的 `customMetadata.owner` | `canWrite`（PUT、DELETE） |
| 索引 | KV 的 `idx:{slug}` | `GET /v1/a` 的列表 |

兩者通常一致，因為每一次 PUT 都會同時寫兩邊。但只要曾經有東西只寫了其中一邊
（例如當初補 owner 的方式、或某次 KV 寫入失敗），兩邊就會不同步，而列表看不出來。
所以列表上的 `null` 只代表索引缺了這個欄位，不一定代表這份誰都改不了。

查某一份在列表上的 owner。API 回的是多行縮排的 JSON，`owner` 在 `slug` 往下第三行，
所以要用 `-A`，不能在同一行裡比對：

```bash
curl -s https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN" | grep -A4 '"slug": "<slug>"' | grep '"owner"'
```

要確定，就拿你認為的 owner 那組 token 直接 PUT：

- 回 200，回應裡有 `"owner": "rd"`：R2 那邊一直是 rd。這次 PUT 也順手把索引補好了。
- 回 403：R2 那邊真的不是這組，或真的沒有 owner。

### R2 那邊真的沒有 owner 時

沒有 owner 的物件誰都寫不動、刪不掉，這是刻意的（見 `worker/README.md` 的
「擁有權是 owner，不是 visibility」）。處理方式：

1. 確認手上有這份的 HTML。`archive/report/` 裡有 v1 遷移過來的那些；用 curl 推的
   不一定有副本。從 `/r/<slug>` 抓回來的版本會多一段 Cloudflare 注入的 script，
   推回去前要剝掉，`scripts/verify.mjs` 第 42 行是剝除用的正規式。
2. 在 R2 dashboard 刪掉 `artifacts/<slug>.html`。
3. 用你那組的 token 重新 PUT。這時它是全新的 slug，owner 會變成你這組。

刪掉到推上去之間頁面會 404。重推會把 `createdAt` 重設成當下，想保留原本在 portal
的排序位置，就帶 `-H "X-Updated-At: <原本的時間>"`，v1 報告的原始時間在
`archive/report_list.json`。

如果刪掉之後決定不推了，記得對同一個 slug 打一次 `DELETE /v1/a/<slug>`。物件已經
不在時它會回 404，但會順手清掉殘留的索引，否則 portal 上會留一筆點了會 404 的項目。

### 檢查還有沒有索引缺 owner

```bash
curl -s https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN" | grep -B4 '"owner": null' | grep -o '"slug": "[^"]*"'
```

列出來的每一筆，用 owner 那組的 token 重推一次就會補好索引。目前沒有只重建索引、
不動內容的端點。

---

## 案例：2026-11-12 `bysq-report-tw-case` 的更正

要在 v1 遷移過來的 `bysq-report-tw-case` 最前面加更正註解。

1. **inbox 被退。** 加好註解的檔案 commit 進 `inbox/`，Action 回
   `slug "bysq-report-tw-case" 屬於別的 group`，檔案被移進 `inbox/rejected/`。之後從
   GitHub 網頁再上傳一次，結果相同。inbox 的 token 不是 rd，而這篇的 owner 是 rd。
2. **CLI 回 `missing or malformed bearer token`。** 第一次用 rd 的 token 打 `GET /v1/a`
   就被擋在第一關。當時貼上的多行指令行尾是 `\\`；改用 `read -rsp` 設定變數、指令
   寫成一行之後就通了。這個錯誤跟 token 對不對無關，當時沒有必要輪替。
3. **查 owner 的指令寫錯了。** 用來確認這篇 owner 的指令，是在同一行裡找 `slug`
   和 `owner`。API 回的是多行 JSON，那種寫法什麼都抓不到，看不出 owner 是什麼。
   上面 §3 的指令已經改成 `grep -A4`。
4. **直接 PUT 成功。** 用 rd 的 token PUT，回 200、`"owner": "rd"`。這篇的 owner 本來
   就是 rd，不需要去 R2 刪任何東西。判斷能不能覆寫，直接 PUT 比查列表可靠。

學到的三件事：

- 兩個 401 要分開看。`missing or malformed` 先查指令與變數，不要先輪替。
- 列表上的 owner 是索引，不是判準。要知道能不能覆寫，直接用 owner 那組的 token PUT。
  要從列表查欄位，記得回應是多行的。
- inbox 改不了 rd 擁有的舊報告，要用 CLI。這跟用哪個 GitHub 工具 commit 無關。
