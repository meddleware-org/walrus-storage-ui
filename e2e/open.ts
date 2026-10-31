import type { Page } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'
import { connectMockWallet } from '@meddleware/frontend-config/wallet'

/**
 * The built app (the e2e build: a mock wallet and a prepared list of owned blobs), every request that leaves localhost refused.
 * `connected` goes through the app's own wallet dialog as a visitor would.
 */
export const open = (options: { connected?: boolean; tab?: 'Upload' | 'My Blobs' } = {}) => async (page: Page) => {
  await offline(page)
  await page.goto('/')
  await page.getByRole('heading', { level: 2, name: 'Walrus storage' }).waitFor()
  if (options.connected) await connectMockWallet(page)
  if (options.tab === 'My Blobs') {
    await page.getByRole('tab', { name: 'My Blobs', exact: true }).click()
    await page.getByRole('heading', { level: 3, name: 'My Blobs' }).waitFor()
  }
}

/** My Blobs with the duplicated blob's copies expanded. */
export const copies = async (page: Page) => {
  await open({ connected: true, tab: 'My Blobs' })(page)
  await page.getByRole('button', { name: /2 copies/ }).click()
}
