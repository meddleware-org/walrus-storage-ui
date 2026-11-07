// Configuration. The network is wallet-adapter's shared runtime selector (the standalone build
// selects VITE_NETWORK in main.ts; embedded, the host's selector rules). Deployment settings are
// build-time VITE_* per network: relay hostnames default to the public Mysten relay (set
// VITE_WALRUS_RELAY_* to the Meddleware relay to collect the tip); the access gate is optional
// (unset ⇒ ungated), and its package + PlatformConfig come from the published deployment; the
// purchase price and payees are read from the chain, never configured.
//
// A configuration fault is shown to a person as a plain "not available" (`./availability.js`); the technical cause (which variable)
// is logged to the console for the developer (D117). Which networks are offered follows the deployment records and the configured
// relay hosts, never prose.
import { computed, watch } from 'vue'
import type { WalrusNetwork, RelayGateConfig } from '@meddleware/walrus-storage-kit'
import { PUBLIC_WALRUS_RELAY_HOSTS, relayGateConfig, requireHttpsHost } from '@meddleware/walrus-storage-kit'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'
import { isValidSuiObjectId } from '@mysten/sui/utils'
import { useNetwork } from '@meddleware/wallet-adapter'
import { withRuntimeEnv } from '@meddleware/ui'
import { errorMessage } from '@meddleware/web-utils'
import { notAvailableNow, notAvailableOn } from './availability.js'

/** Build-time env bag. Injectable on the env-reading helpers below purely so unit tests can exercise
 *  each branch without depending on Vite's (frozen) `import.meta.env` inlining. */
export type EnvSource = Record<string, string | undefined>

// Build-time values, with the runtime endpoint overrides (/runtime-config.json, ADR-0005) on top.
const env: EnvSource = withRuntimeEnv((import.meta as unknown as { env?: EnvSource }).env ?? {})

/** The active network (read-only ref). */
export const network = useNetwork().network

/** The Walrus networks this app can be built for (Walrus runs on these two; localnet has none). */
const WALRUS_NETWORKS: readonly WalrusNetwork[] = ['testnet', 'mainnet']

/** The Meddleware relay host for a network (env → public fallback). */
function relayHostFor(net: WalrusNetwork, envSource: EnvSource): string {
  return (net === 'mainnet' ? envSource.VITE_WALRUS_RELAY_MAINNET : envSource.VITE_WALRUS_RELAY_TESTNET) || PUBLIC_WALRUS_RELAY_HOSTS[net]
}

/** Meddleware relay host per network (env → public fallback). */
export const OPERATOR_RELAY_HOSTS: Record<WalrusNetwork, string> = {
  testnet: relayHostFor('testnet', env),
  mainnet: relayHostFor('mainnet', env),
}

/** The Meddleware/public host pair for `useWalrusRelay` (its `operator` key is the library's name for the Meddleware relay). */
export function relayHosts(network: WalrusNetwork): { operator: string; public: string } {
  return { operator: OPERATOR_RELAY_HOSTS[network], public: PUBLIC_WALRUS_RELAY_HOSTS[network] }
}

/** Whether Walrus storage can be used on a network, and what to tell a person when it cannot. */
export interface Availability {
  /** True when the network is offered and its settings are usable. */
  usable: boolean
  /** Plain words for a person when `usable` is false; null otherwise. */
  message: string | null
  /** The technical cause (which setting or record), for the console; null when there is none. */
  cause: string | null
}

/**
 * The state of a network, before any message is written (pure; `envSource` is injectable for tests).
 * `offered: false` is "it is not offered there" (localnet; a gate configured on a network with no recorded `access_gate`
 * deployment, which could not be honoured); `offered: true` with a `cause` is a setting this site cannot serve.
 */
function inspect(net: string, envSource: EnvSource): { offered: boolean; cause: string | null } {
  if (net !== 'testnet' && net !== 'mainnet') return { offered: false, cause: null }
  const NET = net.toUpperCase()
  const gateId = envSource[`VITE_ACCESS_GATE_ID_${NET}`]
  if (gateId) {
    try {
      accessGateDeployment(net)
    } catch {
      // A gate cannot be honoured without the published package: serving the network ungated would silently skip the pass.
      return { offered: false, cause: `VITE_ACCESS_GATE_ID_${NET} is set but no access_gate deployment is recorded for ${net}` }
    }
    if (!isValidSuiObjectId(gateId)) {
      return { offered: true, cause: `VITE_ACCESS_GATE_ID_${NET} is not a Sui object id: "${gateId}"` }
    }
  }
  try {
    requireHttpsHost(relayHostFor(net, envSource), `VITE_WALRUS_RELAY_${NET}`)
  } catch (e) {
    return { offered: true, cause: errorMessage(e) }
  }
  return { offered: true, cause: null }
}

/** Availability of Walrus storage on `net` (pure; the networks suggested to switch to are the ones that pass the same checks). */
export function availabilityOf(net: string, envSource: EnvSource = env): Availability {
  const own = inspect(net, envSource)
  if (own.offered && own.cause === null) return { usable: true, message: null, cause: null }
  const others = WALRUS_NETWORKS.filter((n) => {
    if (n === net) return false
    const o = inspect(n, envSource)
    return o.offered && o.cause === null
  })
  return { usable: false, message: own.offered ? notAvailableNow(others) : notAvailableOn(net, others), cause: own.cause }
}

/** Availability on the active network. */
export const availability = computed(() => availabilityOf(network.value))

/** The active network as a Walrus network, or null where Walrus storage cannot be used (localnet, or a network this site cannot serve). */
export const walrusNetwork = computed<WalrusNetwork | null>(() => (availability.value.usable ? (network.value as WalrusNetwork) : null))

// A configuration fault is told to the developer once per cause (a person sees only "not available").
const reported = new Set<string>()
watch(
  availability,
  (a) => {
    if (!a.cause || reported.has(a.cause)) return
    reported.add(a.cause)
    console.error(`walrus-storage-ui: Walrus storage is unavailable on ${network.value} (${a.cause})`)
  },
  { immediate: true },
)

/**
 * Default relay tip ceiling (MIST) when `VITE_UPLOAD_RELAY_MAX_TIP_MIST` is unset: 0.005 SUI, the
 * workspace-wide ceiling (~8× the Meddleware relay's worst-case tip at the 100 MiB edge cap).
 */
export const DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST = 5_000_000

/**
 * Cap on the relay tip payment in MIST, from `VITE_UPLOAD_RELAY_MAX_TIP_MIST`. This is a ceiling to
 * prevent overpayment (the relay asks for the minimum), NOT a fixed charge. A non-positive or
 * unparseable value falls back to {@link DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST}.
 */
export function uploadRelayMaxTipMist(envSource: EnvSource = env): number {
  const parsed = Number(envSource.VITE_UPLOAD_RELAY_MAX_TIP_MIST)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST
}

/**
 * The optional NFT access gate for a network: the deployment supplies only the Gate id and soulbound
 * flag (`VITE_ACCESS_GATE_*_{NET}`); `relayGateConfig` fixes the package and `PlatformConfig` to the
 * published deployment (commission enforcement), and the price is read from the gate on the chain.
 * `null` — an ungated
 * relay — when no gate id is set, or when no access_gate deployment is recorded for the network.
 */
export function accessGate(network: WalrusNetwork, envSource: EnvSource = env): RelayGateConfig | null {
  const NET = network.toUpperCase()
  const gateId = envSource[`VITE_ACCESS_GATE_ID_${NET}`]
  if (!gateId) return null
  try {
    return relayGateConfig(network, {
      gateId,
      soulbound: envSource[`VITE_ACCESS_GATE_SOULBOUND_${NET}`] === 'true',
    })
  } catch (e) {
    console.warn(`[walrus-storage-ui] access gate for ${network} disabled: ${errorMessage(e)}`)
    return null
  }
}
