# imitator worker

單檔 HTML 的 dumb host。設計與取捨見 [`../docs/spec.md`](../docs/spec.md)；
給 LLM／CLI 用的一頁式說明見 [`../CLAUDE.md`](../CLAUDE.md)。

```
src/index.js      路由。順序就是 spec §8.3 的早退順序
src/config.js     groups.json 的載入、快取與哨兵值輪替
src/session.js    cookie 與 write token 的驗證
src/artifacts.js  R2 讀寫與 KV 索引
src/portal.js     首頁列表（預設只列最近三個月）
src/policy.js     上傳前的內容檢查
src/crypto.js     base64url、HMAC、定時比較
src/http.js       共用回應與安全 header
```

```bash
npm install
npm test          # 68 個測試，跑在 workerd 上（vitest-pool-workers）
npm run dev
npm run deploy
```

---

## 部署

repo 已經跟 Cloudflare Workers Builds 連動：push 到 `main` 就會跑
`npm clean-install` 加 `npx wrangler deploy`。也可以在本機 `npm run deploy`，
兩條路走的是同一份 `wrangler.toml`。

Workers → imitator → Settings → Build 底下有**兩個長得很像、但意義完全不同**的
欄位，設錯會很難發現：

| 欄位 | 值 | 意義 |
|---|---|---|
| **Root directory** | `worker/` | build 在哪個目錄裡跑。**不能有萬用字元** —— 填 `worker/*` 會找不到目錄，build 當場失敗 |
| **Build watch paths → Include paths** | `worker/*` | 只有這些路徑的改動要觸發 build。相對於 repo 根目錄 |
| **Build watch paths → Exclude paths** | **留空** | 放 `worker/*` 進來的意思是「Worker 的改動不要 build」，正好相反 |

> ⚠️ 這兩個填反或填混的失敗方式很惡劣：**站台繼續用舊版本正常服務**，從外面
> 完全看不出來，你只會覺得「改的東西怎麼沒生效」。真的懷疑的時候就打一個
> 有版本特徵的端點來驗（例如 `PUT` 的回應有沒有 `owner` 欄位），不要只看
> 站台活著就假設部署成功了。

**R2 bucket 與 KV namespace 都由 wrangler 在 deploy 時自動 provision** —
`wrangler.toml` 的 `[[kv_namespaces]]` 刻意不填 `id` 就是為了這個。第一次
deploy 建好之後，後續 deploy 會沿用同一個 binding，不需要回填 id。

（`vitest.config.js` 因此不讀 `wrangler.toml`，binding 在那裡自己宣告一份 —
vitest-pool-workers 內建的 wrangler 比較舊，看到沒有 id 的 KV 設定會報錯。
兩邊的內容要保持一致。）

deploy 成功之後還有三件事要在 dashboard 上做，做完站台才真的能用：

1. **設 SESSION_SECRET**（Workers → imitator → Settings → Variables and
   Secrets → Add，type 選 **Secret**）

   ```bash
   openssl rand -base64 32     # 產一個，貼進去
   ```

   本機的話是 `npx wrangler secret put SESSION_SECRET`。沒有它 `/join` 一律
   回 503 —— public 讀取不受影響，但沒有人進得了 group。
   輪替這一個 = 所有組別所有人一起登出（緊急剎車）。

2. **放 `config/groups.json`**（R2 dashboard 上傳）。secret 直接寫哨兵值，
   讓 Worker 自己產：

   ```json
   {
     "version": 1,
     "groups": {
       "rd": {
         "name": "研發",
         "epoch": 1,
         "read":  { "secret": "ROTATE" },
         "write": { "secret": "ROTATE" }
       }
     }
   }
   ```

   然後打開網站。第一個抵達的請求會完成輪替，把連結與 token 寫進
   `outbox/`，回 R2 dashboard 複製即可。

3. **綁 custom domain**（Workers → Settings → Domains & Routes）。R2 bucket
   本身**不要**對外公開、**不要**掛 domain — 所有讀取一律經過 Worker。

### 之後再補的（spec §10 的 P3）

**Lifecycle rule：`outbox/` 7 天後刪除**，對齊 magic link 的預設 TTL，不讓
明碼連結在 bucket 裡累積。

```bash
npx wrangler r2 bucket lifecycle add imitator expire-outbox outbox/ --expire-days 7
```

> **不要對 `config/` 設任何刪除規則。** R2 的 lifecycle 只會刪物件本身 ——
> 設下去就是把 `groups.json` 刪掉，整站的 group 存取一起沒。spec §4.1 那條
> 針對「非當前版本」的規則在 R2 上不存在，見下面。

**配額保護：一條 WAF custom rule**（Security → WAF → Custom rules）

先講清楚要防的是什麼：免費方案 100,000 requests/天，而 **Worker 跑在快取之
前**，所以每個請求都會叫起 Worker，包括會被回 404 的、以及 public artifact 那
些本來會命中邊緣快取的。Worker 裡那個 isolate 減速帶（200 次／10 秒／IP）跑在
Worker *裡面*，invocation 早就計費了 —— 它省的只有 R2 與 KV 的呼叫，**保護不了
請求配額**。要省 invocation，只能擋在 Worker 前面。

spec §8.3 的方案是全站限速規則，但**免費方案整個 zone 只有 1 條**，而這個 zone
的那條已經給別的服務用掉了。改用 WAF custom rule —— 那是另一個額度（免費 5
條），phase 也排在 rate limiting 之前。掃描器打的路徑是靜態可判定的，本來就不
需要限速：

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
```

Action 用 **Block**：這些路徑本來就全是 404，沒有真人需要被放行。`/cdn-cgi/`
一定要留，Cloudflare 自己注入的腳本要去那裡拿東西。

**實測確認它擋在 Worker 前面**：`curl /wp-admin` 回的是 Cloudflare 的 403 而不
是 Worker 那個中文的「找不到頁面」，代表 invocation 真的省下來了。之後改動這條
規則都值得再測一次。

> ⚠️ **Worker 加新路由時要回來改這條規則。** 否則新路由會被邊緣直接擋掉，而且
> Worker 的 log 裡什麼都看不到 —— 請求根本沒到。

剩下的殘餘風險是對著**合法** slug 跑迴圈（`/r/0050` 打十萬次），custom rule 擋
不掉，限速的格子又沒了。對症的解法是 spec §11 自己的結論：Workers Paid $5/月，
換到每月 1000 萬請求 —— **這個方案已經開了**，所以這條風險現在是關的。上面那條
custom rule 仍然留著：它省下來的 invocation 現在是省錢而不是保命，而且它同時也
把掃描器擋在 log 之外。

> 大量上傳（例如遷移舊報告）會撞到 Worker 的減速帶。先跑遷移再加規則，或者讓
> `scripts/migrate.mjs` 的退避重試處理 — 它認得 429。

**Bot 防護：SBFM 開、BFM 關**（需要 Pro）

這兩個東西名字很像，行為的差別卻是決定性的：

| | Bot Fight Mode | Super Bot Fight Mode |
|---|---|---|
| 方案 | 免費 | Pro 以上 |
| 能不能被 custom rule 的 Skip 跳過 | **不能** | 能（Skip → All Super Bot Fight Mode rules） |
| 粒度 | 全站一律挑戰 | 分「已驗證的 bot／可能自動化／確定自動化」三檔 |

**BFM 必須關掉。** 它沒有任何例外機制，所以它會挑戰 GitHub Action 的發佈請求。
日誌裡長這樣：

```
01:40:11  botFight  managed_challenge  PUT /v1/a/<slug>  UA="node"  Microsoft Corporation
```

`UA="node"` ＋ Microsoft ASN 就是 Actions runner。被挑戰的請求拿到的是
Cloudflare 的 HTML 挑戰頁而不是 Worker 的 JSON，所以 `scripts/publish-inbox.mjs`
會看到一個沒有 `error` 欄位的 403 —— 那支腳本現在會據此判定「不是 Worker 回的」
並留在 `inbox/` 等重試，而不是誤判成 slug 屬於別組。同一條規則也會打到聊天軟體的
連結預覽（`SkypeUriPreview`、空 UA 的 HEAD）。

**SBFM ＋ 一條 Skip custom rule** 才是可用的組合。規則放在 WAF custom rules，
action 選 **Skip → All Super Bot Fight Mode rules**：

```
http.host eq "imitator.ai-apps.work"
and (
  starts_with(http.request.uri.path, "/v1/a")
  or starts_with(http.request.uri.path, "/join/")
  or starts_with(http.request.uri.path, "/r/")
)
```

`http_request_firewall_custom` 這個 phase 排在 `http_request_sbfm` 之前，所以
Skip 來得及生效。驗證方式是看 Firewall Events 有沒有這一列：

```
firewallCustom  skip  imitator — skip SBFM for API and join  PUT /v1/a/<slug>
```

**多條 custom rule 可以並存**，按順序求值。目前這個 zone 上有三條：擋掃描器路徑的
Block、上面這條 Skip、以及一條針對 `http.user_agent contains "bot"/"crawl" and not
cf.client.bot` 的 Managed Challenge。

> `cf.client.bot`（Known Bots）認的是 **Web Bot Auth 簽章、公布的 IP 段＋穩定 UA、
> 或反解 DNS**，不是 UA 字串。所以從無關的 IP 送一個假造的 `Slackbot` UA 會被擋 ——
> 那是正確行為，測試時很容易誤判成規則寫壞了。同理，從資料中心 IP 測首頁會拿到
> 過場動畫，一般使用者不會。**測 bot 規則不要從雲端主機測。**

**Smart Shield 不用開。** 名字有 Shield 但它是 origin 防護與加速套組（Smart Tiered
Cache、connection reuse、health check、Argo）。這個 zone 是 `custom_domain = true`
的 Worker，沒有 origin，那些項目沒有作用對象。唯一會生效的 Cache Reserve 是負面的:
`artifacts.js` 覆寫時會自己 `caches.default.delete()` 那一筆，多一層 reserve 等於多
一份它打不到的副本，而 R2 沒有 versioning，「推了新版但舊版還在某層快取裡」是最難查的
那種故障。

**Cloudflare Fonts：這個站不要開**（2026-09-03 實測，已關閉）

它把 `<link href="fonts.googleapis.com...">` 換成指向 `/cf-fonts/` 的內聯
`@font-face`，字型檔改從本網域出，並順手刪掉 Google 的 `preconnect`。

先講它為什麼存在，因為那不是效能。2022 年 1 月慕尼黑地方法院判過（3 O 17493/20）：
網站直接嵌入 Google Fonts、把訪客的動態 IP 送給 Google 而未取得同意，違反 GDPR
第 82 條，判賠 €100，判決書明講「自行代管字型就可以避免」。之後德國出現大量索賠信。
**Cloudflare Fonts 就是「自行代管」的一鍵版本** —— 不用下載 woff2、不用寫
`@font-face`、不用管版本。對歐洲的一般商業網站，這個開關便宜又對症。

順帶確認了一件原本沒把握的事：**它對 Worker 產生的回應有效**，不需要 origin。

### 為什麼這個站還是不能開

三條，每一條都對應這個站特有的性質，不是功能本身的缺陷：

**一、sandbox 底下字型載不到。** `@font-face` 的抓取一律是 CORS 模式。artifact 帶著
`Content-Security-Policy: sandbox`（沒有 `allow-same-origin`），所以它在 opaque origin
裡、送出的是 `Origin: null`；而 `/cf-fonts/` 的回應**沒有** `Access-Control-Allow-Origin`。
本機用同樣的 CSP 開兩組對照重現：

```
無 ACAO（＝現在的 cf-fonts）  @font-face status = error
  console: Access to font ... from origin 'null' has been blocked by CORS policy
有 ACAO: *（＝gstatic）        @font-face status = loaded
```

`fonts.gstatic.com` 回 `access-control-allow-origin: *`，這就是它在 sandbox 底下一直
能用的原因。而且失敗是**安靜的**：字照樣顯示，只是掉到 `font-family` 的下一個
（PingFang／微軟正黑），沒有任何錯誤浮上來。

一般網站沒有這個問題 —— 同源網頁請求同源的 `/cf-fonts/`，CORS 根本不適用。

**二、傳輸量 15 倍，而這是中文的問題不是它的問題。** 它做的事是把 Google 那份 CSS
內聯進 HTML。直接量 Google 送出來的內容：

| 家族 | `@font-face` 段數 | CSS 大小 |
|---|---|---|
| **Noto Sans TC** | **315** | **362,129** |
| Inter | 21 | 7,520 |
| Roboto | 18 | 11,275 |

CJK 為了漸進載入被切成三百多個 unicode 子集。**拉丁字型內聯 7–11KB，省掉一次
round trip，是淨賺；中文內聯 362KB，而且原本那個共用的 stylesheet URL 可以跨頁快取，
內聯之後每一頁重送一次。** 同一個功能，拉丁是優點，中文是災難。

實際影響（同樣用 gzip 比，三份報告都要了 Noto Sans TC）：

| slug | 本機 | 站上 |
|---|---|---|
| `0050` | 7,058 | 105,850（15.0×）|
| `7-fruits` | 6,231 | 105,245（16.9×）|
| `12-factor-agents` | 14,926 | 113,738（7.6×）|

**三、`verify.mjs` 全部掛掉。** 它改寫的是 body，而 verify 的用途就是證明「站上那份
跟本機那份一模一樣」。既有的 `__CF$cv$params` 注入是**附加**，`verify.mjs` 剝掉就好；
字型改寫是**取代**，normalise 不回來。這也直接撞到 CLAUDE.md 的「單檔 HTML，收什麼
就吐什麼」。

### 判斷表（給下一個專案用）

| 失效 | 根因（imitator 特有） | 一般網站 |
|---|---|---|
| 字型 CORS 被擋 | artifact 在 opaque origin，送 `Origin: null` | 同源，CORS 不適用 |
| 傳輸量 15× | 用 CJK 字型（315 段 `@font-face`） | 拉丁 18–21 段，內聯反而少一次往返 |
| `verify.mjs` 全掛 | 有「收什麼吐什麼」的契約與逐份比對 | 沒人在乎 HTML 被改寫 |

四條都不中才適合開：歐洲或在意 GDPR、用拉丁字型、同源沒有 CSP sandbox、沒有把 HTML
當成不可變成品。imitator 是四條全不中。

第一項理論上可以用 Response Header Transform Rule 給 `/cf-fonts/*` 補一個
`Access-Control-Allow-Origin: *` 修掉，但第二、三項還在，而剩下的好處只有「讀者不再
連 Google」。CLAUDE.md 對字型的立場本來就是想清楚才留的例外（樣式表不執行程式碼、
opaque origin 裡沒東西給它讀），不是需要補起來的傷口。

### WAF 那一行

`/cf-fonts/` **已經留在**擋掃描器那條 custom rule 的允許清單裡，即使功能關著：

```
or starts_with(http.request.uri.path, "/cf-fonts/")
```

留著沒有副作用（沒開就不會有人請求那個路徑，真有人亂打由 Worker 回自己的 404），
而少了它就是這個功能最惡劣的失敗模式：Cloudflare 已經把 `<link>` 改寫掉，字型檔卻被
自己的規則回 403，全站掉回系統字型且沒有任何提示。驗證方式跟 `/wp-admin` 同一招 ——
**403 是被 Cloudflare 擋，404 是穿過去由 Worker 回的**：

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://imitator.ai-apps.work/cf-fonts/v1/x.woff2  # 404
curl -s -o /dev/null -w "%{http_code}\n" https://imitator.ai-apps.work/wp-admin             # 403
```

**Artifact 的 origin 隔離**（已實作，不需要設定）

artifact 是任意 HTML 且會執行 JS，跟 portal 同一個 origin。cookie 是
HttpOnly 沒錯，但 HttpOnly 只擋 `document.cookie`，不擋瀏覽器自動附帶 ——
所以沒有防護的話，artifact 裡的 JS 可以 `fetch('/r/{slug}')` 把整個 group
的內容讀出來外送。真正的風險不是惡意上傳（能上傳的人本來就握有 token），
而是供應鏈：272 份舊報告裡有 234 份在 runtime 載入外部 script。

所以 artifact 的回應預設帶：

```
Content-Security-Policy: sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads
```

opaque origin 讓那些 fetch 變成跨源、`Origin: null`，而 Worker 不送 CORS
header，於是讀不到 response body。刻意不給 `allow-same-origin`（等於沒
sandbox），也不給 `allow-popups-to-escape-sandbox`（popup 會拿回正常 origin）。

代價是 storage API 在 opaque origin 下會丟 SecurityError。`PUT` 時帶
`X-Sandbox: off` 可以個別關掉，省略則沿用既有設定 —— 重推一份報告不會悄悄
把先前明確設定的例外關掉。`scripts/migrate.mjs` 會自己偵測 `localStorage`／
`sessionStorage`／`document.cookie` 並在那幾份帶上 `off`（舊報告裡是 8 份），
結尾會列出來。

spec §8.5 原本的方案是把 artifact 搬到子網域。實際上那只擋得住 portal 的
列表：group artifact 要能驗證，cookie 就必須跨子網域（`__Host-` 得降成
`__Secure-` 加 `Domain=`），而所有 artifact 又同在 `r.*` 這一個 origin，
artifact 之間依然同源。要真的隔離得走 per-artifact origin，超出本專案規模。

---

## 日常管理

**在 R2 dashboard 上直接編輯 `config/groups.json`。** 沒有 CLI，沒有 admin 端點。

| 情境 | 動作 | 影響 |
|---|---|---|
| 加人／連結過期 | `read.secret` 改成 `"ROTATE"` | 舊連結失效，已經種了 cookie 的人不受影響 |
| 有人離職 | `epoch` +1，`read` 與 `write` 都改成 `"ROTATE"` | 該組所有 cookie 與 token 立刻失效 |
| 換 push 的人 | 只有 `write.secret` 改成 `"ROTATE"` | 舊 token 失效 |

存檔後打開網站，Worker 會在下一個請求裡完成輪替：產新 secret、填好
`expiresAt`（read 7 天、write 90 天，改 `wrangler.toml` 的 vars 可調），
並把組好的連結與 token 寫進 `outbox/{gid}-{時間}.txt`。

要一次性給不同效期的話，輪替完成後直接手改 `expiresAt` 即可。

生效時間最多一分鐘（config 的 isolate 快取 TTL）。這條路不依賴 GitHub、
本機環境或任何外部服務，所以同時也是 break-glass：只要能開 Cloudflare
dashboard 就能撤銷。

`epoch` 不用哨兵值，手改數字即可。

### read secret 會進日誌，這是設計上如此

magic link 把 secret 放在路徑裡（`config.js` 組出 `/join/{gid}/{secret}`），
所以只要請求發生，secret 就會被記下來，有三個地方：

1. **Cloudflare Firewall Events** 的 `clientRequestPath`（規則觸發時才記，但
   BFM 開著的時候它會觸發）。
2. **Workers Logs** —— `wrangler.toml` 的 `[observability]` 開著，請求 URL 是
   平台自動記的，Worker 的程式碼管不到。
3. **會展開連結預覽的聊天軟體** —— 貼進 Slack／Teams／Skype／LINE，對方的爬蟲
   就跟著去抓了。日誌裡那些 `SkypeUriPreview` 與空 UA 的 HEAD 就是這樣來的。

第三項是實務上最大的管道。程式碼守住了它能守的部分：spec §400「絕不記錄 secret」
在 Worker 內部成立，`handleJoin` 也帶了 `Referrer-Policy: no-referrer`，secret
不會經由 Referer 流到下一頁。缺口在平台層。

**所以 join 連結要當成口頭傳遞的東西**：給出去、對方點一次拿到 cookie，就不要
留在任何聊天視窗的歷史裡。cookie 本身是乾淨的（`__Host-` 前綴、綁死網域、
HttpOnly），漏的只有那把可以重複使用到下次輪替為止的 read secret。

輪替不是修好它，只是把已經漏掉的那把作廢；下一把貼到同樣的地方，同樣的事會再
發生一次。要從結構上拿掉，最便宜的做法是改放 URL fragment（`/join/rd#<secret>`）
—— `#` 後面瀏覽器不會送給伺服器，日誌與爬蟲都拿不到。代價是要一段 JS 把它換成
POST，`/join` 就不再是純 HTML。目前沒做。

### R2 沒有 object versioning

spec 有三個地方假設 R2 有 versioning（§4.2 拿它取代 git 的歷史功能、§4.1 拿
lifecycle 限制歷史 secret 的留存、§8.2 拿它當 `config/` 寫壞時的還原手段）。
實際上 R2 的 S3 API 把 `PutBucketVersioning`／`GetBucketVersioning` 標為未實作，
lifecycle 也只有三個動作：刪除物件、轉 Infrequent Access、中止未完成的
multipart。後果：

- **覆寫一個 slug，舊的 HTML 就沒了。** 要留舊版就換 slug。CLAUDE.md 已更正。
- §4.1 擔心的「所有歷史 secret 都還躺在 bucket 裡」不存在，那條補償措施也就
  不需要 —— 對 secret 衛生反而是好事。
- **`groups.json` 沒有還原手段** —— 但也不需要，重發一份就是了，見下。

### groups.json 壞掉或不見了

不用備份，重寫一份當成一次重新發放就好：上傳新的 `groups.json`，兩個 secret
都填 `"ROTATE"`，打開網站，去 `outbox/` 拿新的連結與 token。artifact 是獨立的
物件，完全不受影響。

**唯一不能隨便填的是 `epoch`。** cookie 裡帶的 epoch 必須跟 groups.json 當下的
值完全相等，所以填回一個以前用過的數字，會讓當初被 `epoch++` 撤銷掉的 cookie
復活 —— cookie 是 90 天絕對效期，最長可以再活這麼久。兩個做法擇一：

- `epoch` 填一個比以前都大的數字（懶得回想就給 `100`）。單調遞增是唯一要維持
  的性質。
- 或者同時輪替 `SESSION_SECRET`，簽章金鑰一換所有 cookie 一起失效，epoch 填
  什麼都無所謂。

### 擁有權是 owner，不是 visibility

覆寫與刪除的授權判準是 `customMetadata.owner`（寫入者的 gid），不是
`visibility`。理由：`public` 不帶任何身分，拿它當判準等於 public artifact 無主，
任何 group 的 token 都能覆寫或刪掉別組發佈的東西 —— 而 R2 沒有 versioning，
覆寫就是永久消失。最可能觸發的不是惡意內鬼，是兩個自動發佈者撞到同一個 slug。

`owner` 一旦確立就不轉手，正常的更新不會改動它。

**沒有 `owner` 的物件是誰都寫不動、刪不掉的**（包含它原本的作者）。相容分支已經
拿掉了 —— 那條對「無主的 public」是對所有 group 放行的，留著等於讓新加的 group
可以永久佔走任何一個沒補到的 slug。鎖死可以從 R2 dashboard 手動刪，被佔走不行。

查證的方法是 `GET /v1/a`，`owner` 會出現在每一筆裡：

```bash
curl -s https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN" \
  | grep -c '"owner": null'      # 要是 0
```

每一筆還有 `style`：報告最前面那五個 `<meta name="imitator-*">` 抽出來的樣式指紋
（版本、紙色、重點色、語域與參照物各截 24 字），沒帶就是 `null`。只存不驗 —— 它的用途
是讓下一份報告避開最近用過的顏色、讓人看得出檔案照的是哪一版指引、以及累積偏好的材料，
見 `style/README.md`。`node scripts/style-census.mjs` 會把整張表印出來。

用 curl 從別的地方推上去、`archive/report/` 裡沒有副本的 slug，`migrate.mjs
--force` 迭代不到它們 —— 那種孤兒要嘛重推一次讓它拿到 owner，要嘛刪掉。

### 上傳前的內容檢查（對「dumb host」的刻意偏離）

`src/policy.js` 會在寫入前掃過 body：

- **`X-Sandbox: off` ＋ 第三方 `<script src>` → 400，什麼都不寫。** 這個組合等於
  把「讀走全站內容」的能力交給一個第三方 CDN。回應是英文的 `error`／`reason`／
  `fix` 三段，指向 `docs/publishing-rules.md` —— 推東西上來的多半是 agent，它要
  能自己讀懂並修好。
- **storage API ＋ sandbox on → 200 加 warning。** 那個組合會讓頁面在瀏覽器裡
  丟 SecurityError 而沒有任何錯誤回到上傳者手上，是靜靜地壞掉。不擋是因為誤判
  有可能（例如報告內容本身在談 localStorage）。
- Body 超過 2 MB 就跳過檢查（掃描要花 CPU），並在 warning 裡說明跳過了。

這確實偏離了 spec 的「收什麼吐什麼」。偏離的範圍很窄：**body 一個 byte 都不會被
改動**，只是拒絕一個已知危險的組合。理由是那個組合的失敗方式太糟 —— 它不會當場
壞掉，而是安靜地把整站曝露在某個第三方之下，直到那個第三方哪天出事。

### 幾個實作上的決定

- **`expiresAt` 缺漏或無法解析一律當成過期。** 正常路徑（哨兵值輪替）一定會
  填好它；手動編輯漏填就進不去，這比預設永不過期安全。
- **哨兵值 `ROTATE` 本身永遠無法通過驗證**，即使輪替的寫入失敗、它還留在
  檔案裡。
- **secret 是 32 bytes 隨機**（spec §7.1 寫 24、§8.2 寫「至少 32」，取嚴格的）。
- **`groups.json` 壞掉時 fail closed**：public 內容照常，group 全部關門。
- **讀取的授權先看 KV 索引，再用 R2 的 `customMetadata` 覆核一次。** KV 是
  最終一致的，改過 visibility 的物件可能有最多一分鐘的舊值；覆核不花額外的
  I/O，因為物件已經在手上，而且 body 在覆核之後才送出。

---

## 遷移舊站（spec §9）

```bash
IMITATOR_BASE=https://imitator.ai-apps.work \
IMITATOR_TOKEN=imi_rd_1_xxx \
node ../scripts/migrate.mjs --visibility=public --dry-run
```

`--dry-run` 只印 `檔名 → slug` 的對照，slug 衝突會在上傳前就報錯。確認後拿掉
`--dry-run` 即可。跑完用 `node ../scripts/verify.mjs` 逐份比對內容與 sandbox
判定（不需要 token；帶 `IMITATOR_TOKEN` 的話順便對 updatedAt）。

時間戳取自 `archive/report_list.json` —— 那是舊 Action 逐次累積下來的真實時間，透過
`X-Updated-At` 送上去。**不要改用 `git log`**：這份 repo 的歷史被整批重傳過，
每個檔案的 committer date 都是同一天。

> **Cloudflare 會在邊緣改寫 HTML。** Bot Management 的 JavaScript Detections
> 會在每個 HTML 回應的 `</body>` 前塞一段 938 bytes 的
> `/cdn-cgi/challenge-platform/...` 腳本。R2 裡存的內容沒被動到，但
> 「收什麼吐什麼」在網路上就不完全成立了 —— 而且**這個 zone 關不掉**：
> Bot Fight Mode 已經是關的（空 UA 的 curl 拿得到 200，未授權的 `/v1/a` 回
> 我們自己的 401 JSON，都沒有挑戰頁），JS Detections 仍顯示 `On` 且沒有獨立
> 開關。所以那 938 bytes 是常態，不是設定錯誤：**artifact 的 HTML 一定要有
> `</body>`**（注入點在它前面，缺了會插到別的地方），`verify.mjs` 比對前會先
> 剝掉它。舊站已經搬進 `archive/` 凍結，Action 也移除了 —— 見 `archive/README.md`。
