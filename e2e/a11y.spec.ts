// The shared accessibility sweep (WCAG 2.2 AA and AAA in every colour mode × season, reflow, text size, forced colours, reduced motion,
// keyboard) over the screens a visitor meets: disconnected, the wallet dialog, the upload form, the blob list and a blob's copies. The
// e2e build's mock wallet and prepared blob list make the connected ones reachable.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { copies, open } from './open.js'

defineA11ySuite(
  {
    disconnected: open(),
    'wallet dialog': async (page) => {
      await open()(page)
      await page.getByRole('button', { name: 'Connect wallet' }).first().click()
      await page.getByRole('dialog', { name: 'Select wallet' }).waitFor()
    },
    upload: open({ connected: true }),
    'my blobs': open({ connected: true, tab: 'My Blobs' }),
    'blob copies': copies,
  },
  { aaa: 'gate' },
)
