import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

// 測試不讀 wrangler.toml，binding 在這裡自己宣告。
//
// 原因：wrangler.toml 的 KV 刻意不填 id，讓 deploy 時自動 provision；但
// vitest-pool-workers 內建的那份 wrangler 比較舊，parse 到沒有 id 的
// kv_namespaces 會直接報錯。這裡的內容要跟 wrangler.toml 對齊。
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        main: './src/index.js',
        // isolatedStorage 在這個環境下會在 pop storage stack 時撞到 miniflare 的
        // sqlite-shm 檔（vitest-pool-workers 的已知問題），所以自己在 beforeEach
        // 清空 R2 與 KV，見 test/helpers.js 的 resetStorage()。
        isolatedStorage: false,
        miniflare: {
          compatibilityDate: '2025-04-01',
          kvNamespaces: ['KV_INDEX'],
          r2Buckets: ['R2_BUCKET'],
          bindings: {
            SESSION_SECRET: 'test-session-secret-not-a-real-one',
            DEFAULT_READ_DAYS: '7',
            DEFAULT_WRITE_DAYS: '90',
            COOKIE_DAYS: '90',
          },
        },
      },
    },
  },
});
