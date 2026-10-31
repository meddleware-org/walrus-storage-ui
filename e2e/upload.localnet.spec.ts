// Full localnet upload e2e (connect → upload → aggregator read-back → MyBlobs lists it).
//
// This stays `fixme` for one remaining reason: the SPA has no localnet build target. config.ts accepts only testnet|mainnet, and
// targeting the localnet testbed needs it to thread `walrusPackageConfig` + `storageNodeUrlScheme:'http'` (the harvested WALRUS_* ids)
// into createWalrusClient, mirroring the extension already in @meddleware/walrus-storage-client. The signing wallet is done:
// `installLocalnetWallet` (./wallet.ts) delegates the mock wallet's signing to the funded localnet key.
//
// Once the build target lands, remove `.fixme` and run it after `source ../walrus-storage-client/localnet/.env.localnet` with the app
// built against localnet (`npm run build:e2e` with the localnet VITE_* values).
import { test, expect } from '@playwright/test'
import { connectMockWallet } from '@meddleware/frontend-config/wallet'
import { installLocalnetWallet } from './wallet.js'

const READY = process.env.WALRUS_LOCALNET === '1' && !!process.env.WALRUS_TEST_SECRET_KEY

test.describe('walrus-storage-ui localnet upload', () => {
  test.skip(!READY, 'requires a sourced .env.localnet (WALRUS_LOCALNET=1)')

  test.fixme('uploads a blob through the localnet relay and lists it in My Blobs', async ({ page }) => {
    await installLocalnetWallet(page)
    await page.goto('/')

    await connectMockWallet(page)

    // Choose a tiny file and run the upload flow.
    const bytes = Buffer.from(`e2e-${Date.now()}`)
    await page.getByLabel(/file/i).setInputFiles({ name: 'e2e.txt', mimeType: 'text/plain', buffer: bytes })
    await page.getByRole('button', { name: /upload/i }).click()

    // The result panel shows the blob id + aggregator URL.
    const link = page.getByRole('link', { name: /\/v1\/blobs\// })
    await expect(link).toBeVisible({ timeout: 120_000 })
    const url = await link.getAttribute('href')
    expect(url).toBeTruthy()

    // Aggregator serves the exact bytes back.
    const served = await page.request.get(url!)
    expect(served.ok()).toBeTruthy()
    expect(Buffer.from(await served.body())).toEqual(bytes)

    // MyBlobs lists the freshly-certified blob.
    await page.getByRole('tab', { name: 'My Blobs' }).click()
    await expect(page.getByText(/certified|epoch/i).first()).toBeVisible()
  })
})
