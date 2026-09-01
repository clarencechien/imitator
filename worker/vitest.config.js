import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        // isolatedStorage 在這個環境下會在 pop storage stack 時撞到 miniflare 的
        // sqlite-shm 檔（vitest-pool-workers 的已知問題），所以自己在 beforeEach
        // 清空 R2 與 KV，見 test/helpers.js 的 resetStorage()。
        isolatedStorage: false,
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: { SESSION_SECRET: 'test-session-secret-not-a-real-one' },
        },
      },
    },
  },
});
