// Smoke tests of the built app (the e2e build): the shell mounts without an uncaught error, the wallet connects through the app's own
// dialog, and the owned-blob list shows what the chain would, with the actions each blob is offered.
import { expect, test } from '@playwright/test'
import { E2E_BLOBS } from '../src/e2e-data.js'
import { copies, open } from './open.js'

test('mounts, shows the tabs, and asks for a wallet before anything else', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open()(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Walrus Assets' })).toBeAttached()
  await expect(page.getByRole('tab', { name: 'Upload' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'My Blobs' })).toHaveAttribute('aria-selected', 'false')
  await expect(page.getByText('Connect a Sui wallet to upload and manage your blobs.')).toBeVisible()
  // The My Blobs tab asks for the same wallet rather than showing any network content.
  await page.getByRole('tab', { name: 'My Blobs' }).click()
  await expect(page.getByRole('tab', { name: 'My Blobs' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Connect a Sui wallet to upload and manage your blobs.')).toBeVisible()
  expect(errors).toEqual([])
})

test('connected, the upload form takes the place of the wallet prompt', async ({ page }) => {
  await open({ connected: true })(page)
  await expect(page.getByText('Connect a Sui wallet to upload and manage your blobs.')).toHaveCount(0)
  await expect(page.getByLabel(/file/i).first()).toBeAttached()
})

test('My Blobs lists one row per blob with the action it is offered', async ({ page }) => {
  await open({ connected: true, tab: 'My Blobs' })(page)
  const table = page.getByRole('table', { name: 'Your Walrus blobs' })
  await expect(table.getByRole('row')).toHaveCount(5) // the header and four blobs (two uploads of one blob are one row)
  const duplicated = table.getByRole('row', { name: new RegExp(E2E_BLOBS.duplicated.slice(0, 8)) })
  await expect(duplicated.getByText('Expiring soon')).toBeVisible()
  const pending = table.getByRole('row', { name: new RegExp(E2E_BLOBS.pending.slice(0, 8)) })
  await expect(pending.getByRole('button', { name: 'Certify' })).toBeVisible()
  await expect(pending.getByText('Uploaded, not certified')).toBeVisible()
  const maxed = table.getByRole('row', { name: new RegExp(E2E_BLOBS.maxed.slice(0, 8)) })
  await expect(maxed.getByText('At max lifetime')).toBeVisible()
  await expect(maxed.getByRole('button', { name: 'Show cost' })).toHaveCount(0)
})

test('the copies of a duplicated blob open and close', async ({ page }) => {
  await copies(page)
  const table = page.getByRole('table', { name: 'Your Walrus blobs' })
  await expect(table.getByRole('row')).toHaveCount(7) // + two copy rows
  const toggle = page.getByRole('button', { name: /2 copies/ })
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(table.getByRole('row')).toHaveCount(5)
})

test('the first press on Extend shows the cost; the wallet is not asked for an unpriced amount', async ({ page }) => {
  await open({ connected: true, tab: 'My Blobs' })(page)
  const row = page.getByRole('row', { name: new RegExp(E2E_BLOBS.steady.slice(0, 8)) })
  await row.getByRole('button', { name: 'Show cost' }).click()
  // Offline there is no price to read: the row says so, and still holds the same button (no transaction was started).
  await expect(row.getByText('price unavailable')).toBeVisible({ timeout: 20_000 })
  await expect(row.getByRole('button', { name: 'Extend' })).toBeVisible()
  await expect(row.getByText('Approve in wallet…')).toHaveCount(0)
})
