// The signing wallet for the localnet upload e2e. The page's mock wallet (registered by the e2e build) delegates signing to this Node
// process through `exposeSigner`: the funded localnet key (WALRUS_TEST_SECRET_KEY from `.env.localnet`) never enters the browser.
import type { Page } from '@playwright/test'
import { exposeSigner } from '@meddleware/frontend-config/wallet'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { fromBase64, toBase64 } from '@mysten/sui/utils'

/** Make the page's mock wallet sign as the funded localnet key; resolves the address it connects with. Call before `page.goto`. */
export async function installLocalnetWallet(page: Page): Promise<string> {
  const secret = process.env.WALRUS_TEST_SECRET_KEY
  if (!secret) throw new Error('WALRUS_TEST_SECRET_KEY is not set: source walrus-storage-client/localnet/.env.localnet first.')
  const keypair = Ed25519Keypair.fromSecretKey(secret)
  const address = keypair.toSuiAddress()
  const client = new SuiGrpcClient({ network: 'localnet', baseUrl: process.env.WALRUS_RPC_URL ?? 'http://127.0.0.1:9000' })
  await exposeSigner(
    page,
    {
      async signTransaction(transactionJson) {
        const tx = Transaction.from(transactionJson)
        tx.setSenderIfNotSet(address)
        const bytes = await tx.build({ client })
        const { signature } = await keypair.signTransaction(bytes)
        return { bytes: toBase64(bytes), signature }
      },
      async signPersonalMessage(message) {
        const { signature } = await keypair.signPersonalMessage(fromBase64(message))
        return { signature }
      },
    },
    { address },
  )
  return address
}
