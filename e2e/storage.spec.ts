// Nothing is stored in the visitor's browser, and no other host is asked for anything, before the visitor acts (PECR Sch. A1; the
// workspace's docs/legal/STORAGE_LEDGER.md and decision D134). `?first-visit` skips the test build's mock wallet and seeded upload
// (src/e2e.ts): a real first visit has neither.
//
// One read is expected on load: the tip badge asks the upload relay for its published tip. In production that relay is ours
// (runtime-config.json: sui-walrus-storage-relay-testnet.meddleware.dev), a first-party read that stores nothing. The test build has no
// relay configured and falls back to the public Walrus relay, so that host is allowed here only for that reason.
import { test } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'
import { expectNothingStored, watchOtherHosts } from '@meddleware/frontend-config/storage'

const RELAY_READS = ['sui-walrus-storage-relay-testnet.meddleware.dev', 'upload-relay.testnet.walrus.space']

test.describe('stores nothing before the visitor acts (PECR Sch. A1)', () => {
  test('first visit', async ({ page }) => {
    await offline(page)
    const otherHosts = watchOtherHosts(page)
    await page.goto('/?first-visit', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    for (const host of RELAY_READS) otherHosts.delete(host)
    await expectNothingStored(page, { otherHosts })
  })
})
