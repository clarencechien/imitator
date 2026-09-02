import { SELF, env } from 'cloudflare:test';
import { beforeEach, expect, it } from 'vitest';
import { ORIGIN, resetStorage, seed } from './helpers.js';

beforeEach(async () => { await resetStorage(); });

it('只有 write 區塊的 group，outbox 裡有什麼', async () => {
  await seed({
    rd:  { name: '研發', epoch: 1, read: { secret: 'ROTATE' }, write: { secret: 'ROTATE' } },
    bot: { name: '自動發佈', epoch: 1, write: { secret: 'ROTATE' } },
  });
  await SELF.fetch(`${ORIGIN}/`);

  const listed = await env.R2_BUCKET.list({ prefix: 'outbox/' });
  console.log('outbox 檔案:', listed.objects.map((o) => o.key));
  for (const obj of listed.objects) {
    const text = await (await env.R2_BUCKET.get(obj.key)).text();
    console.log('\n===== ' + obj.key + ' =====\n' + text);
  }
});
