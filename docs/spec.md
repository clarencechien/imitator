# imitator v2 — HTML Artifact Host

**狀態**：v0.6 —— 已實作並上線於 `imitator.ai-apps.work`，272 份舊報告已遷移完成
**取代**：GitHub Pages + Action 掃 `report/` 產 `report_list.json` 的現行架構

> v0.6 依照實作與實測結果修訂。改動最大的是三處：**R2 沒有 object versioning**
> （§4.1／§4.2／§8.2 原本都建立在它之上）、**免費方案的限速規則格子已被占用**
> （§8.3 改用 WAF custom rule）、**§8.5 的子網域隔離改用 CSP sandbox 實作**。
> 逐條的實作決定見 `worker/README.md`。

---

## 1. 目標與非目標

### 目標

1. 讓 LLM／CLI 用一行 HTTP 請求就能把單檔 HTML 推上來，不經過 git commit。
2. 兩種可見度：`public` 與 `group`。
3. group 的存取以**群體**為單位，不辨識個人。
4. 提供一個 portal 列出報告。
5. 整體維持在一支 Worker 的規模，可被一個人維護。

### 非目標

- 不 render、不轉檔、不套 template。收什麼 HTML 就吐什麼 HTML（**dumb host**）。
- 不做編輯器。
- **不做個人身分**。不知道誰在看，也不打算知道。
- 不做 email 白名單、不寄任何信、不串任何 IdP。
- 不做 audit log、不做分析統計。

### 核心模型

> 拿到有效 link 的人就能看，拿到有效 token 的人就能推。
> 人員變動時，host 重發 link／token，先前發出的一律失效。

一個人可以在公司電腦、自己手機、自己電腦上各種一次 cookie，這是預期行為，不是漏洞。撤銷的單位是「整組」，不是「某個裝置」。

### 與 SnapDeck 的界線

SnapDeck 知道內容是什麼（吃 MD、要 render、要套 layout）。imitator 不知道也不需要知道。兩者不共用後端。

---

## 2. 名詞

| 名詞 | 定義 |
|---|---|
| artifact | 一個單檔 HTML，由 slug 唯一識別 |
| slug | `[a-z0-9-]{1,64}` |
| group | 一組人的集合，如 `rd`。存取的最小單位 |
| host | 擁有 admin 權限、能發 link／token 的人（Clarence） |
| readSecret | 換成 cookie 的一次性入口憑證，放在 magic link 裡 |
| writeSecret | CLI／agent 用的 bearer token |
| epoch | group 的世代編號。遞增即作廢該組所有既有憑證 |

---

## 3. 架構總覽

```
                    ┌─────────────────────────────┐
   CLI / Claude     │                             │
   Code ───PUT─────▶│                             │──▶ R2 artifacts/*.html
   (Bearer token)   │      Cloudflare Worker      │
                    │                             │──▶ R2 groups.json  (SoT)
   Browser ─/join──▶│  route → authz → fetch      │
           ─/r/────▶│                             │──▶ KV  idx:*  (portal 索引)
                    └─────────────────────────────┘
```

**R2 bucket 不對外公開，不掛 custom domain。** 所有讀取一律經過 Worker。

---

## 4. 資料模型

### 4.1 groups.json（R2，單一事實來源）

key：`config/groups.json`

```json
{
  "version": 1,
  "groups": {
    "rd": {
      "name": "研發",
      "epoch": 3,
      "read":  { "secret": "8fK2...", "expiresAt": "2026-09-08T00:00:00Z" },
      "write": { "secret": "Qm7x...", "expiresAt": "2026-11-30T00:00:00Z" }
    }
  }
}
```

**存明碼，不存雜湊。** 理由：這個檔的維護方式是在 R2 dashboard 上手動編輯（見 §7），而人打不出 SHA-256。

雜湊在這裡本來也沒買到什麼——它防的是 groups.json 外洩，但它躺在跟 artifacts 同一個 private bucket 裡，那個 bucket 洩漏的話所有報告本來就一起沒了。它保護的東西不比它旁邊的東西值錢。

Worker 端用**定時比較**比對字串。日後要改回雜湊是加一層，不是改架構。

~~**必要的補償措施**：R2 versioning 會把每一版 groups.json 永久保留…~~
**（v0.6 更正）** R2 沒有 object versioning，所以「歷史版本永久保留」這個風險
不存在，那條補償措施也就不需要 —— 對 secret 衛生反而是好事。**不要**對
`config/` 設任何 lifecycle rule：R2 的刪除動作刪的是物件本身，設下去就是把
groups.json 刪掉。

secret 由 Worker 產生（`crypto.getRandomValues(32)` → base64url），手動建立時
用 `openssl rand -base64 32`，不要手打。

**快取**：Worker global scope 快取，TTL 60 秒。否則每個請求都打一次 R2（慢，且是 class B 計費操作）。輪替後最多一分鐘生效，這個延遲在本情境無所謂。

### 4.2 artifacts（R2）

key：`artifacts/{slug}.html`

`customMetadata`：

```json
{
  "visibility": "public",     // 或 "group:rd"
  "title": "報告標題",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**（v0.6 更正）** 原本打算開 versioning 取代 git 的歷史功能 —— R2 不支援
（`PutBucketVersioning` 未實作）。**覆寫同一個 slug，舊的 HTML 就沒了**；要留
舊版就換一個 slug。

`sandbox`：`"on"`（預設）或 `"off"`，見 §8.5。

`owner`：**（v0.6 新增）** 寫入者的 gid。覆寫與刪除的授權判準是它，不是
`visibility` —— `public` 這個值不帶任何身分，拿它當判準等於「public artifact
無主」，任何 group 的 token 都能覆寫或刪掉別組發佈的東西，而 R2 沒有
versioning，覆寫就是永久消失。現實中最可能觸發的不是惡意內鬼，是兩個自動
發佈者撞到同一個 slug。擁有權一旦確立就不轉手，正常的更新不會改動它。沒有 `owner` 的物件誰都寫不動
（包含原作者）—— 那是刻意選的失敗方向，鎖死可以從 dashboard 手動處理，被別組
永久佔走不行。

### 4.3 KV

| key | 值 | 用途 |
|---|---|---|
| `idx:{slug}` | `{visibility, title, updatedAt}` | portal 列表 |

存在的理由：R2 `list()` 要拉全部物件的 metadata，數量上來會慢。

**規模門檻**：artifact 數 < 500 時 KV 夠用。要 tag／全文搜尋時再換 D1，這個遷移只影響 index 層。

---

## 5. 三種憑證

| | magic link (readSecret) | cookie | write token (writeSecret) |
|---|---|---|---|
| 給誰 | 組員（人） | 瀏覽器 | 能 push 的人／agent |
| 形式 | `/join/{gid}/{secret}` | `__Host-imi` | `imi_{gid}_{epoch}_{rand}` |
| 預設 TTL | **7 天** | **90 天**（絕對，不續期） | **90 天** |
| 存放 | groups.json（明碼） | HMAC 簽章，Worker 不存狀態 | groups.json（明碼） |
| 失效條件 | 過期 / readSecret 輪替 / epoch++ | 過期 / epoch++ | 過期 / writeSecret 輪替 / epoch++ |

### 5.1 為什麼 link 短、cookie 長

magic link 會被貼進 Teams 或 LINE 群組，然後永遠留在對話紀錄裡。三個月後新進頻道的人往上捲就拿到了。

7 天讓它在對話紀錄裡自己死掉；90 天的 cookie 讓已經進來的人不受影響。

### 5.2 兩個層級的變動

| 情境 | 動作 | 影響 |
|---|---|---|
| 加人 / 連結過期 | 輪替 `readSecret`，發新連結 | 舊連結失效；**已種 cookie 的人不受影響** |
| 有人離職 | `epoch++` | 該組所有 cookie 與 token 立即失效，全部重發 |

這是整個設計的關鍵：**cookie 的效力綁 epoch，不綁 readSecret**。所以重發連結是輕動作，撤銷才是重動作。多數變動是加人。

### 5.3 write token 內含 epoch

token 格式 `imi_{gid}_{epoch}_{random}`，驗證時同時比對 secret（定時比較）與 epoch。這樣 `epoch++` 一個動作就同時殺掉 cookie 與 token，不需要另外輪替 writeSecret。

副作用是 token 自帶 gid：上傳者只能推到自己組別，不需要額外的授權判斷。

### 5.4 讀寫分開輪替

readSecret 給整組人，writeSecret 通常只給少數幾個。綁在一起的話，任何一個看報告的人變動就要重設所有人的 CLI——結果是你不會想輪替。

---

## 6. API

### 6.1 種 cookie

```
GET /join/{gid}/{secret}?next=/r/{slug}
```

1. 讀 groups.json，找 `gid`。
2. 比對 `secret` 與 `read.secret`（定時比較）。**（v0.6 更正）** 原文寫比對雜湊，
   與 §4.1「存明碼」及 §11「groups.json 存雜湊 → 不採用」矛盾；實作依 §4.1，
   用雙重 HMAC 的定時比較，連長度都不會從執行時間洩漏。
3. 檢查 `read.expiresAt` 未過期。
4. 發 cookie，302 到 `next`（未指定則到 `/`）。

失敗一律回同一個泛用畫面（「連結無效或已過期，請向發送者索取新連結」），不區分原因。

回應必須帶 `Referrer-Policy: no-referrer`，避免 secret 經由 Referer 洩漏給後續頁面。

### 6.2 cookie

```
Name:    __Host-imi
Value:   base64url({gid, epoch, exp}) + "." + base64url(HMAC-SHA256(payload, SESSION_SECRET))
Flags:   HttpOnly; Secure; SameSite=Lax; Path=/
```

每次讀取時驗簽 → 比對 `exp` → **比對 payload 的 epoch 與 groups.json 當前 epoch**。

epoch 比對每次都要做。少了這一步，`epoch++` 就管不到已經發出去的 cookie，撤銷機制等於沒有。

### 6.3 讀取

```
GET /r/{slug}
```

| visibility | 行為 |
|---|---|
| `public` | 直出，`Cache-Control: public, max-age=300`，走 Cache API |
| `group:{gid}` | 驗 cookie；不符則回 404（非 403） |

回 404 而非 403：不對外洩漏「這個 slug 存在但你沒權限」。

`X-Content-Type-Options: nosniff`；group 內容一律 `Cache-Control: private, no-store`。

### 6.4 寫入

```
PUT /v1/a/{slug}
Authorization: Bearer imi_rd_3_xxxxxxxx
Content-Type: text/html
X-Visibility: public | group        (預設 group)
X-Title: 報告標題                    (選填)
X-Sandbox: on | off                 (選填，預設 on，見 §8.5)
X-Updated-At: 2025-06-06T17:28:45Z  (選填，見下)

<body: HTML 全文>
```

**（v0.6 新增）** `X-Updated-At`：指定這份 artifact 的時間，省略就是上傳當下。
portal 依 `updatedAt` 由新到舊排序，遷移舊內容時少了它，所有東西會擠在同一天、
排序完全失去意義。不接受未來的日期 —— 寫錯一次就會有一份報告永遠釘在最上面。

`X-Visibility: group` 解析為 token 自帶的 gid。回應：

```json
{ "slug": "...", "url": "https://.../r/...", "visibility": "group:rd", "updatedAt": "..." }
```

- 覆寫既有 slug 視為更新。**舊版不會保留**（R2 無 versioning，見 §4.2）。
- Body 上限 25 MB，超過回 413。

```
DELETE /v1/a/{slug}          Authorization: Bearer ...
GET    /v1/a                 Authorization: Bearer ...    → 列出 public + 該組
```

### 6.5 Portal

```
GET /
```

- 無有效 cookie：只列 public。
- 有有效 cookie：列 public + 該 group。

Portal 用 Workers Static Assets 或直接 inline 在 Worker，不放 R2。

---

## 7. 管理

**在 R2 dashboard 上直接編輯 `config/groups.json`。** 沒有 CLI、沒有 admin 端點、沒有 GitHub Action——輪替由 Worker 自己完成。

### 7.1 哨兵值輪替

在 dashboard 把 secret 欄位改成哨兵值後存檔：

```json
"read":  { "secret": "ROTATE" },
"write": { "secret": "ROTATE" }
```

哨兵值就是字串 `ROTATE`，不帶參數。TTL 走該欄位的預設值（`read` 7 天、`write` 90 天，定義於環境變數）。下一個抵達的請求會讓 Worker 載入 groups.json，發現哨兵值後：

1. `crypto.getRandomValues(32 bytes)` → base64url 產生新 secret（§8.2 要求至少
   32 bytes，取嚴格的那個）
2. 寫回 groups.json：填入 secret 與 `expiresAt = now + 預設天數`
3. 寫出 `outbox/{gid}-{ISO8601}.txt`，內容是組好的 link 與 token：

```
group: rd (epoch 3)

link  (expires 2026-09-08，給組員)
https://r.example.com/join/rd/8fK2mQ...

token (expires 2026-11-30，給要 push 的人／agent)
imi_rd_3_Qm7xVn...
```

`expiresAt` 由 Worker 填寫，手動輪替時不需要（也不應該）自己填。若要一次性給不同的效期，輪替完成後直接手改 `expiresAt` 即可——這是例外路徑，不值得為它設計哨兵值語法。

你回 dashboard 開 outbox 複製即可。**觸發方式就是自己打開網站**——反正你本來就要回來拿連結。

epoch 不用哨兵值，手改數字即可。

### 7.2 併發保護（不可省）

兩個請求同時看到哨兵值會各產一組、最後寫入者勝出，outbox 出現兩份而其中一份是死的。

因此輪替必須用 R2 條件寫入：讀 groups.json 時保留 etag，寫回時帶 `If-Match`；收到 412 表示已有人完成輪替，直接放棄本次並重讀。

### 7.3 outbox 的 lifecycle

`outbox/` 前綴設 lifecycle rule，**7 天後刪除**，對齊 link 的預設 TTL。過期的連結本來也沒用，不讓明碼在 bucket 裡累積。

動作要選 **Delete uploaded objects after**。不要選 *Abort incomplete multipart
uploads* —— 那條管的是沒傳完的分段上傳，outbox 的檔案是一次寫完的完整物件，
勾了等於沒設。

### 7.4 各情境的動作

| 情境 | 動作 |
|---|---|
| 加人 / 連結過期 | `read.secret` → `ROTATE`，重新發連結 |
| 有人離職 | `epoch` +1，且 read 與 write 都改成 `ROTATE` |
| 換 push 的人 | 只有 `write.secret` → `ROTATE` |

離職流程就是改三個欄位存檔、打開網站、複製新連結。一分鐘內全網生效（config 快取 TTL）。

這條路不依賴 GitHub、本機環境或任何外部服務，因此同時也是 break-glass：任何時候只要能開 Cloudflare dashboard，就能撤銷。

### 7.5 為什麼沒有 CLI

寫入介面就是一個 `PUT`，`curl` 一行即滿足；包成 CLI 只是多一層要維護的東西。

給 LLM／agent 使用時，提供一份薄的 `CLAUDE.md` 而非本 spec——本 spec 有相當篇幅在講不採用的方案與安全考量，對「執行 push」而言是雜訊：

```md
## 發佈報告到 imitator
curl -X PUT https://r.example.com/v1/a/<slug> \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  -H "Content-Type: text/html" \
  -H "X-Visibility: group" \
  -H "X-Title: <標題>" \
  --data-binary @<file>.html

slug: [a-z0-9-]，同名視為更新。
X-Visibility: public 或 group（預設 group）。
```

**spec.md 是給 Claude Code 蓋這個東西用的；CLAUDE.md 是給它用這個東西用的。** 兩份用途不同，不要混。

## 8. 安全要求

### 8.1 授權在 R2 讀取之前

`get()` 必須發生在授權判斷**之後**。任何「先送 HTML、由頁面自己跳密碼框」的做法無效——內容在 View Source 就露了。

### 8.2 憑證強度與比較

- secret 至少 32 bytes 隨機（`crypto.getRandomValues`），base64url 編碼。
- secret 比較用定時比較，避免 timing side channel。
- **絕不記錄 secret 或完整 token**，包含錯誤處理路徑。groups.json 存明碼，因此任何把它整份 dump 進 log 的除錯程式碼都是洩漏。
- 輪替路徑讓 Worker 具備寫入 `config/` 的能力。這不是新增的權限（它本來就能寫 `artifacts/`），但錯誤的輪替邏輯可能寫壞 groups.json。**（v0.6 更正）** 原文說 `config/` 的 versioning 是還原手段 —— R2 沒有 versioning，沒有還原手段。但也不需要備份機制：重寫一份 groups.json 當成一次重新發放即可，artifact 完全不受影響。**唯一不能隨便填的是 `epoch`**：cookie 裡的 epoch 必須跟 groups.json 當下的值完全相等，填回一個用過的數字會讓當初被 `epoch++` 撤銷的 cookie 復活（cookie 是 90 天絕對效期）。填一個比以前都大的數字，或同時輪替 `SESSION_SECRET`。

### 8.3 限速：這是配額保護，不是安全機制

本設計的兩個憑證都是 32 bytes 隨機，爆破在物理上不可能。**沒有任何端點需要靠限速來防猜測**（這一點與早期含 OTP／PIN 的設計不同）。

真正的失敗模式是可用性：Workers 免費方案 100,000 requests/天，而 Worker route 攔在快取前面，**每個請求都會叫起 Worker，包括會被回 404 的**。有人跑迴圈就能在一天內燒穿配額，整站掛到隔天。

**Cloudflare 免費方案只有 1 條限速規則、10 秒計數視窗、只能用 IP 辨識。**

**（v0.6 更正）** 這個 zone 的那一條已經被別的服務（`/auth/`）用掉了，而保護登入
端點比保護配額重要。改用 **WAF custom rule** —— 那是另一個額度（免費 5 條），
phase 排在 rate limiting 之前。掃描器打的路徑是靜態可判定的，本來就不需要限速：

```
(http.host eq "imitator.ai-apps.work"
 and not (
   http.request.uri.path eq "/"
   or http.request.uri.path eq "/favicon.ico"
   or starts_with(http.request.uri.path, "/r/")
   or starts_with(http.request.uri.path, "/join/")
   or starts_with(http.request.uri.path, "/v1/a")
   or starts_with(http.request.uri.path, "/cdn-cgi/")
 ))
Action: Block
```

`/cdn-cgi/` 一定要留 —— Cloudflare 自己注入的腳本要去那裡拿東西。

**實測確認它擋在 Worker 之前**：`curl /wp-admin` 回的是 Cloudflare 的 403 而不是
Worker 的 404 頁，代表 invocation 真的省下來了。

代價是**加新路由時要回來改這條規則**，否則新路由會被邊緣直接擋掉，而且 Worker
的 log 裡什麼都看不到 —— 請求根本沒到。

殘餘風險：對著**合法** slug 跑迴圈（`/r/0050` 打十萬次）擋不掉。對症的解法是
§11 的結論：Workers Paid $5/月。

#### 早退順序（比限速規則更有效）

原則：**沒有請求能在通過一個「攻擊者要付出成本才滿足」的檢查之前碰到 R2。**

| 順序 | 檢查 | 失敗成本 |
|---|---|---|
| 1 | path 認不認得 | 純字串比對，不碰任何 binding |
| 2 | method 是否允許 | 同上 |
| 3 | `Content-Length` > 25MB | 在讀 body 之前就 413 |
| 4 | cookie 簽章 / bearer 格式 | 純運算，零 I/O |
| 5 | groups.json | isolate 快取命中則零 I/O |
| 6 | KV idx | 僅 portal 需要 |
| 7 | R2 `get()` | 最後 |

第 1 步價值最高：掃描器整天在打 `/wp-admin`、`/.env`、`/.git/config`，這些請求的 404 必須在第一行產生。

額外放一個 isolate 內的 `Map<ip, {count, ts}>` 當減速帶（上限 1000 筆）。per-colo、per-isolate、會被回收，統計上不可靠——擋笨迴圈夠用，成本為零。**當它是減速帶，不是門鎖。**

**（v0.6 補充）** 這個減速帶跑在 Worker *裡面*，invocation 早就計費了 —— 它省的
只有 R2 與 KV 的呼叫，**保護不了請求配額**。而且 Workers 跑在快取之前，所以
public artifact 那 300 秒的邊緣快取也不省 invocation。要省 invocation 只能靠上面
那條 WAF 規則。

不要用 KV 做計數器：寫入有延遲、擋不住併發，卻要付 KV 寫入。

### 8.4 write token 的爆炸半徑

洩漏後果是任何人能在你的網域掛任意 HTML，等於一台現成的釣魚頁主機，可能導致整個網域被停用、連公開報告一起陪葬。這條路徑不接受任何「好記」的憑證，也不該出現在任何截圖或對話紀錄裡。

### 8.5 origin 隔離（已實作，方案與原文不同）

artifact 是任意 HTML 且會執行 JS，而它跟 portal 同一個 origin。cookie 是
`HttpOnly` 沒錯，但 HttpOnly 只擋 `document.cookie`，不擋瀏覽器自動附帶 ——
artifact 裡的 JS 可以 `fetch('/')` 拿到 group 報告的清單、`fetch('/r/{slug}')`
拿到內容，再送出去。`SameSite=Lax` 管的是跨站，這是同源，管不到。**實測確認：
無 CSP 時 artifact 的 JS 真的讀得到同源內容。**

真正的風險不是惡意上傳（能上傳的人本來就握有 token），而是供應鏈：272 份舊報告
裡有 234 份在 runtime 載入外部 script（231 份 tailwind CDN、183 份 jsdelivr、
34 份 unpkg）。

**原文的子網域方案只擋得住一半。** group artifact 要能驗證，cookie 就必須跨子
網域（`__Host-` 得降成 `__Secure-` 加 `Domain=`），而所有 artifact 又同在 `r.*`
這一個 origin，artifact 之間依然同源。要真正隔離得走 per-artifact origin
（`{slug}.r.example.com`），超出本專案規模。

**改用 CSP sandbox。** artifact 的回應預設帶：

```
Content-Security-Policy: sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads
```

opaque origin 讓那些 fetch 變成跨源、`Origin: null`，而 Worker 不送 CORS header，
於是讀不到 response body。刻意不給 `allow-same-origin`（等於沒 sandbox），也不給
`allow-popups-to-escape-sandbox`（popup 會拿回正常 origin）。cookie 設計完全不動。

代價是 storage API 在 opaque origin 下會丟 SecurityError。`PUT` 帶
`X-Sandbox: off` 可個別關掉，省略則沿用既有設定 —— 重推一份報告不會悄悄把先前
明確設定的例外關掉。舊報告裡命中的是 8/272 份（`localStorage` 那類）；掃過
`indexedDB`／`serviceWorker`／`document.domain`／`BroadcastChannel`／
`geolocation` 都是 0 份。Chromium 實測：連結導覽仍然可以點，不需要
`allow-top-navigation`。

#### 例外的代價（這一段先前缺漏）

上面只說了「為什麼需要例外」。例外本身的代價要一起寫清楚：

1. **一份 sandbox-off 的頁面讀得到全部內容，包含那些有 sandbox 的。** CSP 管的
   是「用這份回應建出來的 document」，不是「被 `fetch` 當資料讀走」—— 決定權在
   讀的那一方，而那一方沒有 CSP。所以爆炸半徑是整個 corpus，不是那一頁。
2. **sandbox 從來就不擋外送。** 就算被 sandbox，頁面照樣可以 `fetch` 到外部
   網域。它買到的只有一件事：擋掉「讀取同源的已驗證回應」。
3. **那 8 份例外裡有 5 份在 runtime 載入第三方 JS**，全部沒有 SRI：
   `cdn.tailwindcss.com`（5 份）、`cdnjs.cloudflare.com`（2 份）、
   `cdn.jsdelivr.net`（1 份）。tailwind 那個是 play CDN，設計上就是在 runtime
   編譯並執行 —— 這組裡最糟的一個。

也就是說：任何一個那三個來源被投毒（polyfill.io 那種劇本），一個已經 join 過的
組員只要打開那 5 份裡的任何一份，整個 group corpus 就會被讀走且沒有紀錄
（§8.6 明確放棄了存取紀錄）。這不需要任何憑證，也不需要內鬼。

**最划算的處置是把那 5 份的 CDN 依賴內聯進 HTML** —— 沒有第三方腳本可以觸發，
就沒有機制風險，而且 `localStorage` 照常運作、不用改 Worker。改程式的版本
（給 opt-out 頁面一組 `connect-src 'none'` 的替代 CSP）會直接弄壞那 5 份。

### 8.6 這個設計明確放棄的東西

- 不知道誰在看。
- 沒辦法只踢掉一個人，撤銷的單位是整組。
- 沒有存取紀錄。

以「一個 team、變動不頻繁、多數內容其實是 public」的使用情境，這些都不值得買。

但要有意識的是：**group secret 洩漏的爆炸半徑是整組的所有報告，而你不會知道它洩漏了。** 真正敏感的內容不要進這個站。

---

## 9. 從現行架構遷移

1. ~~把 `report/*.html` 全部 `PUT` 上去~~ **已完成**：272 份，visibility 全部
   `public`（本來就在公開的 GitHub Pages 上），時間戳取自 `report_list.json`
   透過 `X-Updated-At` 送上去。逐份驗證：內容 byte-for-byte 一致 272/272、
   sandbox 判定 272/272、`updatedAt` 272/272。腳本見 `scripts/migrate.mjs`
   與 `scripts/verify.mjs`。
2. 舊 GitHub Pages 網址 301 到新網址，或直接放生。**選了放生** —— 站已關閉。
3. ~~刪掉 `.github/workflows/` 與 `report_list.json`~~ **已完成（部分調整）**：Action 已移除；`report/`、`report_list.json`、`index.html` 沒有刪掉，而是搬進 `archive/` 凍結 —— `report_list.json` 是那 272 份報告真實時間的唯一副本，`git log` 重建不出來（這份 repo 的歷史被整批重傳過，所有 committer date 都是同一天）。GitHub Pages 本身是 repo 設定，不在 git 裡。
4. Repo 保留，內容改為：Worker 原始碼、spec、prompt、部署設定。

**source 留 git，artifact 去 R2。** 不是用 R2 取代 GitHub，是把兩種本來就不同的東西分開放。

---

## 10. 分階段

| 階段 | 內容 | 完成的定義 |
|---|---|---|
| P0 | R2 + Worker + `PUT`/`GET` + write token，只有 public | Claude Code 能一行 curl 推上來並開得起來 |
| P1 | groups.json + `/join` + cookie + epoch + group 可見度 + 哨兵值輪替 | 沒拿到 link 的人開不起來；epoch+1 後舊 cookie 立刻失效 |
| P2 | Portal + KV index + `DELETE` + 列表 API | 舊 report 全部遷移完成 |
| P3 | 配額保護、`outbox/` lifecycle、origin 隔離 | — |

**現況**：P0–P2 完成並上線。P3 的 origin 隔離改用 CSP sandbox 完成（§8.5）、
配額保護改用 WAF custom rule 完成（§8.3）；`outbox/` 的 lifecycle rule 待設，
`config/` 的那條已確認不需要也不該設（§4.1）。

P0 沒有任何存取控制，這期間不要放非公開內容。

---

## 11. 明確不採用（勿重複評估）

| 方案 | 不採用的理由 |
|---|---|
| Integrated Windows Auth / Kerberos | **技術上不可行**。驗證票證需要 AD 註冊 SPN、keytab、機器在網域內，Cloudflare Worker 三者皆無，且 TLS 在 edge 終止 |
| 讀取瀏覽器 SSO header | **不存在**。Chrome／Edge 不對任意網站送身分資訊；`X-Chrome-Connected` 之類只送自家網域 |
| Entra / Google OIDC | 技術可行且體驗最好，但需要在公司 tenant 註冊 app，多數企業要 admin consent = 要走 IT 申請。且本設計不需要個人身分 |
| Email OTP（自建 + Resend） | 新網域寄驗證碼到企業信箱有送達率風險；且需要維護 email 白名單，與 group 模型重複 |
| Cloudflare Access | 零程式碼，但可見度綁路徑，`public↔group` 要搬物件換網址；且 portal 無法依身分決定列多少 |
| PIN 碼 | 熵太低或需自建限速／暴力破解防護，複雜度不低於現行設計而保護更弱 |
| per-artifact ACL | v2 明確不做。需要時的訊號是「這篇只想給 A 不想給 B」實際發生，屆時 index 換 D1 |
| CLI / GitHub Action 管理工具 | 輪替由 Worker 惰性完成（§7.1），寫入介面是單一 `PUT`。兩者都沒有剩餘職責 |
| Cloudflare Pro（$20–25/月） | 只換到 2 條限速規則與 1 分鐘視窗，對本專案幾乎無價值。**若要花錢，花 Workers Paid（$5/月）**——換到每月 1000 萬請求與 Durable Objects，解決的才是本專案的問題（配額）|
| groups.json 存雜湊 | 與「在 dashboard 手動編輯」互斥，且保護的東西不比同 bucket 內的 artifacts 值錢 |
| `config/` 的備份機制 | R2 沒有 versioning，寫壞就沒了 —— 但重發一份當成一次重新發放即可（§8.2），不值得為它多一個會出錯的移動零件 |
| artifact 搬到子網域 | 只擋得住 portal 列表，擋不住 artifact 之間，卻要降低 cookie 強度。改用 CSP sandbox（§8.5） |

---

## 12. 環境變數

```
SESSION_SECRET       # cookie HMAC key。輪替 = 所有組別所有人一起登出（緊急剎車）
DEFAULT_READ_DAYS    # 預設 7   —— magic link 效期
DEFAULT_WRITE_DAYS   # 預設 90  —— write token 效期
COOKIE_DAYS          # 預設 90  —— cookie 絕對效期
R2_BUCKET            # binding
KV_INDEX             # binding
```

寫入與讀取的憑證都在 groups.json，不在環境變數——這是為了讓輪替不需要重新部署。
