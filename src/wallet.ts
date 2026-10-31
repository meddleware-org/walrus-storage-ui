// walrus-storage-ui's wallet: the shared @meddleware/wallet-adapter singleton, bound to the selected network. Walrus needs
// `sui:signTransaction` (register, certify, extend), so only wallets that can sign transactions are offered. Because the adapter is a
// module singleton, the connection is shared with any other tool view in the same window (e.g. the dashboard).
import { createToolWallet } from '@meddleware/wallet-adapter'
import type { Executor } from '@meddleware/wallet-adapter'

export type { Executor }
export const { useWallet, getSuiClient, buildExecutor } = createToolWallet({ requiredFeatures: ['sui:signTransaction'] })
