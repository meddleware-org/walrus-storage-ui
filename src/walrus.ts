// The Walrus client, loaded and created on first use. `@mysten/walrus` and its wasm are heavy, so nothing here is imported at module
// top level: the first caller pays for the dynamic import, everyone after shares it. One client per network (a client holds no
// wallet state), so the upload, the owned-blob list and the extend quotes all read through the same one.
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url'
import type { WalrusNetwork } from '@meddleware/walrus-storage-kit'

type WalrusLib = typeof import('@meddleware/walrus-storage-client')
type WalrusClient = ReturnType<WalrusLib['createWalrusClient']>

let lib: Promise<WalrusLib> | null = null
const clients = new Map<WalrusNetwork, WalrusClient>()

/** The `@meddleware/walrus-storage-client` root, imported once. */
export function walrusLib(): Promise<WalrusLib> {
  return (lib ??= import('@meddleware/walrus-storage-client'))
}

/** The shared Walrus client for `network`. */
export async function walrusClient(network: WalrusNetwork): Promise<WalrusClient> {
  const { createWalrusClient } = await walrusLib()
  let client = clients.get(network)
  if (!client) {
    client = createWalrusClient({ network, wasmUrl: walrusWasmUrl })
    clients.set(network, client)
  }
  return client
}

export { walrusWasmUrl }
