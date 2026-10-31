// Screenshots for LOOKING at the app (see @meddleware/frontend-config/shots). Run: npm run shots. The connected states go through the e2e
// build's mock wallet.
import { defineShots } from '@meddleware/frontend-config/shots'
import { copies, open } from './open.js'

defineShots({
  disconnected: open(),
  upload: open({ connected: true }),
  blobs: open({ connected: true, tab: 'My Blobs' }),
  copies,
})
