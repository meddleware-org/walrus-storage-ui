// What the end-to-end build's prepared blob list is made of, apart from the code that installs it (`e2e.ts` pulls in the mock wallet, which
// a Playwright spec, running in Node, cannot load): the specs import these to look for the right rows.
export const E2E_EPOCH = 560

/** Blob ids as the aggregator spells them (URL-safe base64, 43 characters). */
export const E2E_BLOBS = {
  duplicated: 'Qm9yZWRPZkR1cGxpY2F0ZXNfQm9yZWRPZkR1cGxpY2F0ZXM',
  steady: 'U3RlYWR5U3RhdGVTdG9yYWdlX1N0ZWFkeVN0YXRlU3RvcmE',
  pending: 'UGVuZGluZ0NlcnRpZmljYXRpb25fUGVuZGluZ0NlcnRpZmk',
  maxed: 'TWF4aW11bUxpZmV0aW1lX01heGltdW1MaWZldGltZV9NYXg',
} as const
