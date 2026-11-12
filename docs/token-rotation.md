# token 怎麼來、放哪、怎麼換

這份是操作手冊。設計理由在 [`spec.md`](spec.md) §5 與 §7，日常管理的摘要在
[`worker/README.md`](../worker/README.md) 的「日常管理」。推不上去時先看
[`troubleshooting.md`](troubleshooting.md)：401 `missing or malformed bearer token`
跟 token 對不對無關，那種情況輪替沒有用。

## 三種憑證，各自影響誰

| | 誰拿 | 長什麼樣 | 效期 | 輪替哪個欄位 |
|---|---|---|---|---|
| join link | 組員，點一次種 cookie | `/join/{gid}/{read.secret}` | 預設 7 天 | `read.secret` |
| cookie | 瀏覽器 | `__Host-imi` | 90 天絕對效期 | `epoch` +1 |
| write token | 要 push 的人或 agent | `imi_{gid}_{epoch}_{write.secret}` | 預設 90 天 | `write.secret` |

三者互相獨立。只換 `write.secret` 時，組員的連結與 cookie 都不受影響。`epoch` +1
則會讓這組的 cookie 與 token 同時失效。

## token 是怎麼來的

token 由 Worker 產生。在 `config/groups.json` 把 `write.secret` 填成
哨兵值 `"ROTATE"`，下一個請求進來時 Worker 會：

1. 產 32 bytes 的亂數，轉成 base64url 當新的 secret。
2. 用條件寫入（`If-Match`）寫回 `groups.json`，同時填上 `expiresAt`。兩個請求同時
   觸發時只有一個會成功，不會產生兩把。
3. 把組好的 token 寫進 R2 的 `outbox/{gid}-{時間}.txt`。

組法在 `worker/src/config.js` 的 `writeToken`：

```
imi_{gid}_{epoch}_{write.secret}
```

## token 放在哪

**你那邊。** 只放在自己看得到的地方。repo 和 `CLAUDE.md` 都不能放，也不要貼進對話：

- shell 設定檔（`~/.zshrc` 或 `~/.bashrc`）裡的 `export IMITATOR_TOKEN=…`
- `~/.claude/settings.json` 的 `env`。這裡只有 Claude Code 的 session 吃得到，
  自己開的終端機看不到。
- inbox 用的 GitHub repo secret `IMITATOR_TOKEN`。它通常是另一組的 token，見
  [`inbox/README.md`](../inbox/README.md) 的「專用的 group」。

在本機找現在放在哪，只印每行前 40 個字元：

```bash
grep -n IMITATOR_TOKEN ~/.zshrc ~/.bashrc ~/.claude/settings.json 2>/dev/null | cut -c1-40
```

**R2 那邊有兩份。**

- `outbox/{gid}-{時間}.txt`：產生當下的原始檔。若有照 `worker/README.md` 設 7 天
  lifecycle，一週後就不見了。
- `config/groups.json`：secret 是明碼存的（驗證時直接比對）。

所以**token 弄丟了不一定要輪替**。打開 `groups.json`，找 `groups.{gid}`，把 `epoch`
的數字與 `write.secret` 的字串照上面的格式拼起來，就是現在有效的那把。例如 epoch
是 3，就是 `imi_rd_3_` 加上 `write.secret`。順便看一下 `write.expiresAt` 過期了沒。

要輪替的情況只有三種：token 外洩，換了要 push 的人，或已經過期。

## 只換一組的 write token

適用於 token 外洩、換人或過期。組員的連結和 cookie 不受影響，其他組也不受影響。

1. **改設定。** R2 dashboard 打開 `config/groups.json`，只把那一組的 `write.secret`
   改成 `"ROTATE"`。`epoch` 和 `read` 都不要動。存檔前確認 JSON 沒寫壞：格式錯時
   Worker 會當成沒有任何 group，全站所有 token 都會失效。

   ```json
   "rd": {
     "name": "研發",
     "epoch": 3,
     "read":  { "secret": "…不動…", "expiresAt": "…不動…" },
     "write": { "secret": "ROTATE" }
   }
   ```

   `write.expiresAt` 可以留著，Worker 會覆寫。

2. **觸發輪替。** 打開網站任一頁。設定快取最多一分鐘，剛存檔就打開可能還沒生效，
   等一下再開一次。

3. **拿新 token。** R2 的 `outbox/` 會多一個 `{gid}-{時間}.txt`，裡面那行 `imi_…`
   就是。沒看到的話回 `groups.json` 看 `write.secret`。它已經變成一長串字的話，照上面的格式
   自己拼。

4. **換掉所有存舊 token 的地方。** shell 設定檔、`~/.claude/settings.json`、其他機器。
   如果 inbox 的 repo secret 也是這一組，一起換。

5. **驗證。** 新 token 打列表應該回 200，舊 token 應該回 `invalid token`：

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://imitator.ai-apps.work/v1/a -H "Authorization: Bearer $IMITATOR_TOKEN"
   ```

**不影響的東西。** 覆寫權綁的是 group 名稱，不是 secret（`canWrite` 比的是
`owner === gid`），所以輪替後這組原本發佈的 slug 照樣能用新 token 更新。不需要部署、
不需要 wrangler，全程只碰 R2 dashboard。

## 其他情境

| 情境 | 改哪些欄位 | 影響 |
|---|---|---|
| 加人、連結過期 | `read.secret` → `"ROTATE"` | 舊連結失效，已經有 cookie 的人不受影響 |
| 換 push 的人、token 外洩、token 過期 | `write.secret` → `"ROTATE"` | 見上一節 |
| 有人離職 | `epoch` +1，`read.secret` 與 `write.secret` 都 → `"ROTATE"` | 這組所有 cookie 與 token 立刻失效，要重發連結與 token |
| `groups.json` 壞掉或不見 | 重寫一份，secret 都填 `"ROTATE"` | 見 `worker/README.md` 的同名小節。**`epoch` 不能填回以前用過的數字**，會讓被撤銷的 cookie 復活 |
| 要給不同的效期 | 輪替完成後手改 `expiresAt` | 例外路徑，沒有哨兵值語法 |

預設效期在 `worker/wrangler.toml`：`DEFAULT_READ_DAYS = 7`、`DEFAULT_WRITE_DAYS = 90`。

## 輪替之後還是 `invalid token`

- **還沒生效。** 等一分鐘再試。
- **`write.secret` 還是 `"ROTATE"`。** 網站沒被打開過，或那個請求在輪替前就讀到了快取。再打開一次。
- **token 裡的 epoch 不對。** 輪替完才手改 `epoch`，outbox 那把 token 帶的就是舊的
  epoch。照新的 epoch 重拼。
- **手寫了 secret 卻沒填 `expiresAt`。** 沒有 `expiresAt` 一律視為過期。
- **變數還是舊的。** 新開一個終端機，或重新 `export`，再用
  [`troubleshooting.md` §1](troubleshooting.md#1-401-missing-or-malformed-bearer-token)
  那行只印開頭的指令確認。

## 把 token 放進環境變數

輸入時不顯示、不進 shell history：

```bash
read -rsp "token: " IMITATOR_TOKEN && export IMITATOR_TOKEN && echo && echo "長度 ${#IMITATOR_TOKEN}，開頭 ${IMITATOR_TOKEN:0:7}"
```

開頭應該是 `imi_` 加 gid。只對這個終端機有效；要每次開機都有，再寫進設定檔：

```bash
printf "export IMITATOR_TOKEN='%s'\n" "$IMITATOR_TOKEN" >> ~/.zshrc
```

舊的那行記得刪掉，同一個檔案裡有兩行 `export` 時以後面那行為準。
