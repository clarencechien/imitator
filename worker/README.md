# imitator worker

單檔 HTML 的 dumb host。設計與取捨見 [`../docs/spec.md`](../docs/spec.md)；
給 LLM／CLI 用的一頁式說明見 [`../CLAUDE.md`](../CLAUDE.md)。

```
src/index.js      路由。順序就是 spec §8.3 的早退順序
src/config.js     groups.json 的載入、快取與哨兵值輪替
src/session.js    cookie 與 write token 的驗證
src/artifacts.js  R2 讀寫與 KV 索引
src/portal.js     首頁列表
src/crypto.js     base64url、HMAC、定時比較
src/http.js       共用回應與安全 header
```

```bash
npm install
npm test          # 49 個測試，跑在 workerd 上（vitest-pool-workers）
npm run dev
npm run deploy
```

---

## 部署

repo 已經跟 Cloudflare Workers Builds 連動：push 到分支就會跑
`npm clean-install` 加 `npx wrangler deploy`（build 的 root directory 指到
`worker/`）。也可以在本機 `npm run deploy`，兩條路走的是同一份
`wrangler.toml`。

**R2 bucket 與 KV namespace 都由 wrangler 在 deploy 時自動 provision** —
`wrangler.toml` 的 `[[kv_namespaces]]` 刻意不填 `id` 就是為了這個。第一次
deploy 建好之後，後續 deploy 會沿用同一個 binding，不需要回填 id。

（`vitest.config.js` 因此不讀 `wrangler.toml`，binding 在那裡自己宣告一份 —
vitest-pool-workers 內建的 wrangler 比較舊，看到沒有 id 的 KV 設定會報錯。
兩邊的內容要保持一致。）

deploy 成功之後還有四件事要在 dashboard 上做，做完站台才真的能用：

1. **設 SESSION_SECRET**（Workers → imitator → Settings → Variables and
   Secrets → Add，type 選 **Secret**）

   ```bash
   openssl rand -base64 32     # 產一個，貼進去
   ```

   本機的話是 `npx wrangler secret put SESSION_SECRET`。沒有它 `/join` 一律
   回 503 —— public 讀取不受影響，但沒有人進得了 group。
   輪替這一個 = 所有組別所有人一起登出（緊急剎車）。

2. **開 R2 versioning**（R2 → imitator → Settings）。這是 artifact 的歷史
   功能，也是 `config/` 寫壞時的還原手段。

3. **放 `config/groups.json`**（R2 dashboard 上傳）。secret 直接寫哨兵值，
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

4. **綁 custom domain**（Workers → Settings → Domains & Routes）。R2 bucket
   本身**不要**對外公開、**不要**掛 domain — 所有讀取一律經過 Worker。

### 之後再補的（spec §10 的 P3）

**Lifecycle rules**（R2 → Settings → Object lifecycle）

| 前綴 | 規則 | 為什麼 |
|---|---|---|
| `config/` | 非當前版本 30 天後刪除 | versioning 會永久保留每一版 groups.json，等於所有歷史 secret 都還在 |
| `outbox/` | 7 天後刪除 | 對齊 magic link 的預設 TTL，不讓明碼在 bucket 裡累積 |

**全站限速規則**（Security → WAF → Rate limiting rules）。這是配額保護，
不是安全機制 — 免費方案只有 1 條規則，別把它花在特定端點上：

```
Expression:      (http.host eq "r.example.com")
Characteristics: IP
Requests:        50
Period:          10 秒
Action:          Managed Challenge（沒有的話用 Block + 1 分鐘）
```

Worker 裡另外有一個 isolate 內的減速帶（200 次／10 秒／IP）。per-colo、
per-isolate、會被回收，當它是減速帶不是門鎖。

> 大量上傳（例如遷移舊報告）會撞到這兩層限速。先跑遷移再加規則，或者讓
> `scripts/migrate.mjs` 的退避重試處理 — 它認得 429。

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
IMITATOR_BASE=https://r.example.com \
IMITATOR_TOKEN=imi_rd_1_xxx \
node ../scripts/migrate.mjs --visibility=public --dry-run
```

`--dry-run` 只印 `檔名 → slug` 的對照，slug 衝突會在上傳前就報錯。確認後拿掉
`--dry-run` 即可。跑完之後才輪到刪 `.github/workflows/`、`report_list.json`
與 `report/` — 在那之前舊的 GitHub Pages 還活著。
