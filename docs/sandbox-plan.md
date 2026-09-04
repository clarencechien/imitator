# 收掉 sandbox 例外

站上有 8 份帶著 `X-Sandbox: off` 的 artifact。它們**完全沒有 CSP** —— 不是比較寬鬆的
sandbox，是沒有（`artifacts.js:138`）。它們的 JS 拿到 `imitator.ai-apps.work` 的完整
同源權限：讀得到 portal 列表、讀得到所有 group 報告的內容，而且彼此之間也沒有隔離
（共用同一份 localStorage）。

目前這件事的後果有界：`/v1/a` 只認 Bearer，它們沒有 token，所以**讀得到但寫不動**。
但只要發佈動線往瀏覽器移一步（PWA 存 token、或 Worker 接受 cookie 授權），這 8 份就
從唯讀變成可寫。這份計畫是那一步的前置作業。

盤點與分類的依據見 `worker/README.md` 的「read secret 會進日誌」上一節，以及
`scripts/migrate.mjs:137` 那條 `NEEDS_ORIGIN` 正則 —— 本機重掃 280 份，命中剛好這 8 份。

> **「8 份」只涵蓋從 `archive/report/` 遷移上去的那批。** 執行時做了一次全站標頭掃描，
> 找到第 9 份 `kaburi-mockup-v3` —— 它是用 curl 直接推的，本機沒有副本，所以掃檔案
> 永遠掃不到。**唯一可靠的清點方式是逐份看 `/r/<slug>` 有沒有 CSP 標頭**，因為
> `GET /v1/a` 不回傳 sandbox 欄位。這件事本身就是下面「收完之後要順手做的兩件事」
> 第 1 條的理由。

---

## 能一次改到好嗎

**本機的部分可以，推上站的部分不建議一次做完。**

| 步驟 | 能不能一次做完 | 為什麼 |
|---|---|---|
| 改 5 份 HTML | 可以 | 純本機、可 diff、可還原 |
| 重推那 5 份 | 可以，但要分兩批看結果 | 推錯 visibility 或漏掉一處 storage 呼叫，是**靜靜地壞掉** |
| 刪掉 3 個 app | **最後單獨做** | `DELETE` 不可逆，R2 沒有 object versioning |

### token 不要貼進對話

CLAUDE.md 寫死了：token 洩漏等於有人能在這個網域掛任意 HTML，不要放進截圖、對話
紀錄或 commit。這份計畫裡的每一個指令都從 `$IMITATOR_TOKEN` 讀，沒有一個需要把它
打出來。

在遠端 session 裡要讓它可用，設在**環境變數**（Claude Code on the web 的 environment
設定），不是在對話裡貼。設好之後這裡的指令原樣可跑；沒設的話第 0 步就會停下來。

---

## 兩個會靜靜出錯的地方

推之前一定要知道這兩件事，它們都不會報錯。

### 一、`X-Visibility` 沒帶就是 `group`，不是「沿用舊值」

```js
// worker/src/artifacts.js:150
const rawVisibility = (request.headers.get('X-Visibility') ?? 'group').trim().toLowerCase();
```

`X-Title` 與 `X-Sandbox` 省略時會沿用既有值，**`X-Visibility` 不會**。一份 public 的
報告重推時忘了帶，就悄悄變成 group —— 對外連結全部變 404，而回應是 200。

`migrate.mjs` 強制要求 `--visibility`，所以只要傳對就沒事。前提是**先知道原值**，
見第 0 步。

### 二、`X-Updated-At` 沒帶就是上傳當下

portal 依 `updatedAt` 由新到舊排序。5 份重推之後全部跳到最上面，順序就毀了。

`migrate.mjs` 預設從 `archive/report_list.json` 取真實時間，這 8 份都在裡面：

```
uncle-bob              2026/07/25 13:14:06
sin                    2025/05/26 13:31:34
busan_v1               2026/07/10 11:32:16
html-working-artifact  2026/08/26 17:14:15
checklist              2025/12/20 16:16:27
twqrcode               2026/05/20 17:17:27
mb_timer               2026/06/04 22:44:09
mb_timer_v2            2026/07/10 13:53:01
```

所以用 `migrate.mjs` 推就好，**不要手寫 curl** —— 手寫就是這兩個 header 一起漏掉。

---

## 第 0 步：先查清楚（不改任何東西）

`GET /v1/a` 目前**不回傳 sandbox 欄位**，所以站上哪幾份是 off 從 API 查不到。能查到的
是 visibility，而那正是上面第一個陷阱需要的：

```bash
curl -s https://imitator.ai-apps.work/v1/a \
  -H "Authorization: Bearer $IMITATOR_TOKEN" \
  | node -e 'const s=JSON.parse(require("fs").readFileSync(0,"utf8"));
    const want=["uncle-bob","sin","busan_v1","html-working-artifact","checklist",
                "twqrcode","mb_timer","mb_timer_v2"];
    for (const a of (s.artifacts ?? s)) if (want.includes(a.slug))
      console.log(a.slug.padEnd(24), a.visibility, a.owner);'
```

把輸出記在這份文件的最後（「執行紀錄」），批次 A/B 的 `--visibility` 要照它填。
如果 8 份的 visibility 不一致，就照 visibility 分開跑，不要用同一個值蓋過去。

順帶確認 sandbox 現況（`GET /v1/a` 查不到，但回應標頭看得出來）：

```bash
for s in uncle-bob sin busan_v1 html-working-artifact checklist; do
  printf '%-24s ' "$s"
  curl -sI "https://imitator.ai-apps.work/r/$s" | grep -ci content-security-policy
done   # 現在應該都是 0（沒有 CSP＝sandbox off）
```

---

## 批次 A：三份直接刪 JS

改動只有刪幾行，不動內容、不動版面。

| slug | 現在用它做什麼 | 改法 | 代價 |
|---|---|---|---|
| `uncle-bob` | `localStorage` ×2，存主題偏好 `uncle-bob-research-theme` | 刪掉讀寫，保留切換按鈕（只在該次瀏覽有效），或連按鈕一起拿掉、純跟隨系統 | 重整後回到跟隨系統的深淺色 |
| `sin` | `localStorage` ×2，存 `preferredLang` | 預設值改從 `navigator.language` 判一次 | 換語言只在該次瀏覽有效 |
| `busan_v1` | `localStorage` ×4，深色切換 ＋ 行前清單勾選 `busan-check-0..n` | 兩者都改成變數 | 勾選重整後清空 |

`busan_v1` 的勾選狀態是這三份裡唯一稱得上「使用者資料」的東西。真的想留，正確的
做法不是 localStorage，是一顆「複製清單」按鈕（`navigator.clipboard`，opaque origin
底下可用）—— 報告的定位是給人看完帶走，不是替人記狀態。

**做法**

1. 改 `archive/report/{uncle-bob,sin,busan_v1}.html`
2. 本機自檢，確認一個都沒漏：
   ```bash
   grep -nE '\b(localStorage|sessionStorage|indexedDB|Notification|BroadcastChannel|SharedWorker)\b|document\.(cookie|domain)|serviceWorker' \
     archive/report/{uncle-bob,sin,busan_v1}.html
   ```
   要沒有輸出。`migrate.mjs` 用的是同一條正則，掃得到就會繼續送 `X-Sandbox: off`。
3. 推上去（`--visibility` 照第 0 步的結果填；`--force` 是必要的，預設會跳過站上已有的 slug）：
   ```bash
   IMITATOR_BASE=https://imitator.ai-apps.work \
   node scripts/migrate.mjs --visibility=public --force \
     --only=uncle-bob,sin,busan_v1 --dry-run
   ```
   先看 `--dry-run` 的對照，確認 slug 跟 sandbox 判定都對，再拿掉 `--dry-run`。

**驗證**

```bash
# 1. sandbox 真的開了：現在應該每份都是 1
for s in uncle-bob sin busan_v1; do
  printf '%-14s ' "$s"; curl -sI "https://imitator.ai-apps.work/r/$s" | grep -ci content-security-policy
done

# 2. 內容跟本機一致（會自動剝掉 Cloudflare 的注入）
node scripts/verify.mjs

# 3. 用瀏覽器實際打開三份，確認沒有 SecurityError、切換按鈕還能動
```

還有一個自動的保險：如果漏了一處 storage 呼叫而 sandbox 已經開成 on，`PUT` 會回
**200 加一則 `storage-api-with-sandbox-on` warning**（`policy.js:106`）。看到它就是漏了，
回頭補完再推一次。

**可逆性**：完全可逆。本機檔案在 git 裡，站上重推一次就回去了。

---

## 批次 B：兩份改成匯出

這兩份要動內容，不只是刪幾行。等批次 A 驗完再做。

### `html-working-artifact`

存的是**閱讀註解**，但它**已經內建註解的匯入匯出**。所以改動很小：拿掉自動存檔
（`save()` / `localStorage.getItem(KEY)` / `removeItem`），保留匯出按鈕，並在介面上
講清楚「註解不會自動保存，離開前請匯出」。

### `checklist`

存的是**拖曳後的排序** `travel-list-drag`。**決定：留在 imitator，加匯出。**

header 加了「⤓ 匯出」與「⤒ 載入」：匯出是一顆 blob 下載（artifact 的 sandbox CSP
帶著 `allow-downloads`，所以這條路可用），檔名 `travel-checklist-<日期>.json`，
ASCII —— 中文的 `download` 屬性在部分瀏覽器會被忽略，檔案會變成沒有副檔名的
`download`（實測過）。載入走 `FileReader`，會檢查每一項的 `text` 欄位、重建
缺漏的 `id`，並在取代現有清單前問一次。

> **這個匯入路徑第一版有 DOM XSS，安全掃描抓到的。** `render()` 是字串拼 HTML 再
> `innerHTML`，而在加匯入之前 `items` 只可能來自預設清單、這一頁自己寫的
> `localStorage`、或使用者自己打的字 —— 都不是第三方輸入。**加了「載入」之後，
> 別人給的 `.json` 就成了可達的來源**，那個既有的未跳脫插值於是變成真的漏洞。
>
> 修法分兩層，因為兩個脈絡的性質不同：
> - `item.text` 進的是 HTML 文字脈絡 → 加 `esc()` 跳脫。
> - `item.id` 進的是 `onclick="toggle('…')"`，那是**HTML 屬性裡包 JS 字串**的雙重
>   脈絡，光做 HTML 跳脫擋不住 —— `&#39;` 會被 HTML parser 還原成 `'` 再進 JS。
>   所以 id 在載入時就用 `/^[A-Za-z0-9_-]{1,64}$/` 限制，不符合就重產一個，
>   不試著清洗它。
>
> 用三種脈絡各一發 payload 實測：`window.__pwned` 維持 0、注入的 `img`/`script`
> 沒有變成元素、文字原樣顯示、`toggle` 仍正常。順帶修好一個既有的顯示 bug ——
> 使用者自己打「衣物 &lt;3」以前會把版面弄壞。

清單是拿來帶走的東西，存成檔案比綁在某一台裝置的某一個瀏覽器裡好帶。

**驗證**與批次 A 相同（三個步驟一樣跑）。

**可逆性**：可逆，但因為動了內容，回退要看 git diff 而不是重推。

---

## 批次 C：三個 app 下架

`twqrcode`、`mb_timer`、`mb_timer_v2`。**這一步不可逆，最後做，而且要單獨做。**

### 為什麼收不了

它們不是報告，是應用程式：

- `twqrcode`（辦公室拆帳小助手）—— `localStorage` 存的是拆帳資料，那是 app 的核心
  狀態，拿掉就沒有這個工具了。
- `mb_timer_v2`（皮克敏蘑菇計時）—— 除了狀態還用 `Notification` ×8。**那個 API 在
  opaque origin 下根本不存在**，不是換個寫法能解的。
- `mb_timer`（v1）—— 是 v2 的舊版，v2 開啟時會讀 `pikmin_mushrooms_v1` 把資料接手
  過去。這一份直接刪，成本是零。

真正的問題不是「怎麼把它們改成不用 storage」，是**一個 report host 上住著三個 app**。

### 順序

1. **先確認本機副本在**（刪掉之後站上就沒有了）：
   ```bash
   ls -l sandbox/{twqrcode,mb_timer,mb_timer_v2}.html
   ```
2. **把檔案移出 `archive/report/`**，避免日後 `migrate.mjs --force` 又把它們推回去：
   ```bash
   mkdir -p sandbox
   git mv archive/report/{twqrcode,mb_timer,mb_timer_v2}.html sandbox/
   ```
   `sandbox/` 放的是**下架當時的原樣**，一個字都沒改 —— 之後重建時那是起點。
   資料夾裡的 README 寫清楚為什麼它們在這裡、為什麼收不掉、時間戳在哪。
   `archive/` 裡從此沒有它們。
3. **確認 commit 了**，再刪站上的：
   ```bash
   for s in twqrcode mb_timer mb_timer_v2; do
     curl -X DELETE "https://imitator.ai-apps.work/v1/a/$s" \
       -H "Authorization: Bearer $IMITATOR_TOKEN"
   done
   ```

如果這三個網址有給過別人，下架前先確認沒人還在用 —— 尤其 `twqrcode` 名字裡寫著
「辦公室」。

**可逆性**：站上不可逆（R2 沒有 versioning）；內容可逆（檔案在 `sandbox/` 裡，重推就回來）。
但重推等於又多一個 sandbox 例外，所以那不是回退，是重來。

---

## 之後：在 GitHub Pages 重建

三個 app 要有一個能給它們真實來源的地方。GitHub Pages 的另一個網域最省事 ——
它們本來就是單檔 HTML，放上去就能跑，`localStorage` 與 `Notification` 都正常。

換到另一個網域之後，那三個 app 的 storage 也就跟 imitator 的來源分開了 ——
現在 `mb_timer` 讀得到 `twqr_fubon_v2` 的拆帳金額，那件事會一起消失。

這一段還沒排時程，也不阻擋批次 A/B/C。

---

## 收完之後要順手做的兩件事（已完成，待部署）

不做的話，例外會再長回來。

1. **讓 sandbox 旗標可稽核。** ✅ `GET /v1/a` 的每一筆現在都帶 `sandbox`。它同時寫進
   KV 索引的 metadata（`artifacts.js` 的 `entry`），所以列表不必逐筆 `get()`。
   這個欄位存在之前寫進去的紀錄會回報 `on` —— 那是安全的預設：2026-09-04 逐份掃過
   全站 279 份的回應標頭，沒有 CSP 的是 0 份。
2. **把「不再新增 `X-Sandbox: off`」寫成規則。** ✅ 新增 warning
   `sandbox-off-not-needed`：帶了 `off`、但整份 HTML 掃不到任何需要真實來源的 API，
   就是付了代價卻沒買到東西。**不擋**，只講一聲 —— 擋下去會讓誤判變成無法發佈。
   於是 `off` 現在只有兩種結局：真的需要（安靜通過），或不需要（收到警告）。

順帶修掉一則誤導的文案：`storage-api-with-sandbox-on` 的 `fix` 原本寫「移掉第三方
script，然後改用 `X-Sandbox: off` 重推」—— 那是**反過來的建議**，而且漏掉了正確的
第一選項。現在它先講「把 storage 呼叫拿掉」（偏好用 `prefers-color-scheme` /
`navigator.language` 取代、真狀態用匯出匯入），把 `off` 放在最後、並註明它跟第三方
script 互斥。`docs/publishing-rules.md` §2 整節照同樣的順序重寫。

> **這三項都要部署 Worker 才生效。** 這個 session 沒有 Cloudflare 憑證，
> `cd worker && npx wrangler deploy` 要你自己跑。93 個測試通過（新增 5 個）。

做完這兩件，「imitator.ai-apps.work 上沒有你不信任的同源頁面」這句話才會**持續**
成立 —— 而那正是把發佈動線移進瀏覽器（PWA ＋ cookie 授權）的前提。

---

## 執行紀錄

> 每一步做完回來補一行：日期、實際跑的指令、驗證結果。第 0 步查到的 visibility
> 記在這裡，批次 A/B 才有依據。

**2026-09-04 · 全部執行完畢（除了一份不屬於 `rd` 的）。**

第 0 步 · `GET /v1/a`：8 份全部 `public`、全部 `owner=rd`，時間戳與 `report_list.json`
一致，所以 `--visibility=public` 一次跑完，不需要分開。

> **這一步抓到一個會出事的假設。** slug 是從檔名推導的，底線會變成破折號：
> `busan_v1` → `busan-v1`、`mb_timer` → `mb-timer`、`mb_timer_v2` → `mb-timer-v2`。
> 先前用檔名當 slug 查，這三份會顯示「不在站上」；批次 C 如果照著檔名去 `DELETE`，
> 刪到的是不存在的 slug，而回應仍然是成功的樣子。

批次 A/B · `migrate.mjs --visibility=public --force --only=uncle-bob,sin,busan-v1,html-working-artifact,checklist`
—— 5/5 成功。驗證：五份的 `/r/` 都回 `content-security-policy: sandbox …`（原本是沒有），
visibility 仍是 `public`，`updatedAt` 沒有跳到今天。`verify.mjs`：內容一致 277/277、
sandbox 判定正確 277/277、`updatedAt` 正確 272/272。

批次 C · 刪除前逐份比對站上與 `sandbox/` 的內容，用 `verify.mjs` 那條剝除 Cloudflare
注入的正則，三份都完全相同；也確認三份原檔已經在 origin 上。然後
`DELETE /v1/a/{twqrcode,mb-timer,mb-timer-v2}` → 三份都 `deleted: true`，`/r/` 回 404。

**全站掃描 279 份** —— 只剩 `kaburi-mockup-v3` 沒有 CSP。它 `owner=bot`，而
`canWrite` 要求 `meta.owner === gid`，所以 `rd` 的 token 改不動它。

**`kaburi-mockup-v3`（用 bot 的 token 收掉）。** 它的四處 `localStorage` 存三樣東西：
`kaburi.lang`（語言）、`kaburi.theme`（深淺色）、`kaburi.stowed`（收起來的項目 →
時間戳，項目更新時會自動放回來）。四處**全部包在 `try/catch` 裡**，所以只改 header、
內容一個 byte 都不動就夠了。

在本機用同一份 sandbox CSP 起一個 server 實測過，確認不是「假設它會優雅降級」：

```
document.origin = http://127.0.0.1:8803
localStorage    = SecurityError（＝真的在 opaque origin）
頁面渲染        = 123 個元素 / 296 字內文
JS 錯誤         = 0 個
```

代價是那三樣東西不再跨次保留 —— 語言回到預設 `en`、深淺色回到 `dark`、收起來的項目
每次重開全部回來。前兩項跟 `uncle-bob`／`sin` 完全同一類，要補的話用
`navigator.language` 與 `prefers-color-scheme` 就有等效（甚至更好）的行為；第三項是
真的狀態，沒有替代品。**這是 Kaburi 那邊的決定，所以先只改 header，內容不動。**

> **持久的修法在上游。** 只要 Kaburi 再產一次 mockup 推上來，這個例外就會回來 ——
> 除非它的產生器本身不再輸出 storage API。artifact 這一側的修補都是暫時的。

> **順帶一個小問題：** 這次 `PUT` 回的 `storage-api-with-sandbox-on` warning，`fix`
> 欄位寫的是「移掉第三方 script，然後改用 `X-Sandbox: off` 重推」—— 那是**反過來的
> 建議**。這一頁沒有第三方 script，而且我們要的正是 sandbox on。另一條合法的解法
> 「把 storage 呼叫拿掉」沒有被寫進去。`policy.js:106` 的那段文案值得改。

- [x] 第 0 步 · visibility 盤點 —— 8 份全 public / owner=rd
- [x] 批次 A · uncle-bob / sin / busan-v1 —— 已推，CSP 已回來
- [x] 批次 B · html-working-artifact / checklist —— 已推，CSP 已回來
- [x] 批次 C · 三個 app 移進 `sandbox/` 並從站上刪除，`/r/` 回 404
- [x] **`kaburi-mockup-v3`** —— 先只改 `X-Sandbox: on`（內容不動），之後把四處
      `localStorage` 也拿掉：`PREF` 改成記憶體、`saveStowed()` 變空函式。**預設值
      維持原本的 `dark` + `en`**，切換鈕照常運作，只是不會被記到下一次瀏覽。
      中間試過改成跟隨 `prefers-color-scheme` / `navigator.language`，但那是替別人的
      專案改設計，不是修安全問題 —— 收回來了，介面行為與原本完全一致。
      重推後**零 warning**（前一次是 `storage-api-with-sandbox-on`）。在真的
      opaque origin 下實測：初始 `dark` 不隨系統、主題與語言切換鈕都還能動、
      `localStorage` 確實丟 SecurityError、JS 錯誤 0 個。
      **持久的修法仍在上游** —— Kaburi 的產生器再產一次就會把 storage 帶回來。
      而且 R2 沒有 versioning，這份修好的內容目前只存在站上那一份。
- [x] **全站掃描 279 份：沒有 CSP 的 0 份。**
- [x] 收尾 · sandbox 進 `GET /v1/a`（待部署）
- [x] 收尾 · `X-Sandbox: off` 的規則化 ＋ 文案更正（待部署）
- [ ] **部署 Worker** —— `cd worker && npx wrangler deploy`
