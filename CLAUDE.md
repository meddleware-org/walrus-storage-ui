# CLAUDE.md — @meddleware/walrus-storage-ui

## What this app is

A standalone Vue 3 SPA for uploading blobs to Walrus decentralised storage and managing
owned blobs. Designed as an extensible shell for all Walrus-on-Sui user-facing functionality.

**Package name history:** Previously `@meddleware/walrus-relay-app` in the `walrus-relay-ui`
monorepo; extracted to its own repo `walrus-storage-ui` v0.1.0. Consumes `@meddleware/walrus-storage-kit`
(formerly `@meddleware/walrus-relay-ui`, then `@meddleware/walrus-relay`).

## Architectural invariants

- **No on-chain logic here — extend the domain client.** `suiBoundary()` from
  `@meddleware/eslint-config` (the last entry in `eslint.config.ts`) forbids, in `src/` outside
  `src/wallet.ts`: value imports of `@mysten/sui/{grpc,client,transactions}` (type-only imports are
  fine; `@mysten/sui/jsonRpc` is banned outright), building transactions and chain reads. URL
  bindings on native elements must go through `safeHref`, `safeIcon`, `suiExplorerUrl` or
  `walruscanBlobUrl`. Do not disable it — move the logic into the domain client instead.
- **One wallet-adapter in a host.** Declare `@meddleware/wallet-adapter` as a peerDependency (`>=0.0.12 <0.2.0`, plus a devDependency):
  the host's single copy must satisfy every embedded tool, or each gets its own connection.
- **Thin app.** No accounting logic, no chain state derivation, no financial calculations.
  The app is an orchestration shell. All pricing and economic truth lives on-chain.
- **Upload flow comes from `@meddleware/walrus-storage-client/flow`.** `useStorageUpload` (`src/composables/`)
  wires `runBlobUpload` (fresh register every attempt, certify retry, duplicate precheck) and, for a
  gated relay, the kit's `useGatedUpload` (the consume digest is persisted before the upload, reused after
  an interruption, re-consumed only on `409 redeemed`; an upload through the public relay never spends a use). The flow loads `@mysten/walrus` (wasm)
  lazily, so it stays out of the eager bundle; every other `@meddleware/walrus-storage-client` use here goes
  through `src/walrus.ts` (one dynamic import, one client per network).
- **One network source.** The network is wallet-adapter's shared `useNetwork()` selector (the
  standalone `main.ts` selects `VITE_NETWORK`). The relay hosts, the gate (one access-gate state per
  Walrus network), the owned-blobs cache (keyed `<network>|<address>`) and the resume keys all follow
  it. On a network without Walrus (localnet) the view shows a notice.
- **Wallet-agnostic + shared.** Wallet connections go through `src/wallet.ts`, a thin shim over
  the shared `@meddleware/wallet-adapter` singleton — not any specific wallet extension. The
  singleton means that when `WalrusStorageView` is embedded in the dashboard alongside other tool views,
  they all share one connection. Do not hardcode a wallet; do not reintroduce a local
  wallet-standard implementation.
- **Commission enforcement is in the library.** `accessGate()` in `src/config.ts` builds the gate
  with `relayGateConfig` from `@meddleware/walrus-storage-kit`, which takes the package and
  `PlatformConfig` from the published deployment. Operators set only the gate id and soulbound flag; the price and payees are
  read from the chain and shown by `AccessGateCta` before the wallet opens (there is no price variable).
  Do not override the package or PlatformConfig here. `useAccessGate` throws for any other gate.

## Env var: uploadRelayMaxTipMist

`src/config.ts` reads `VITE_UPLOAD_RELAY_MAX_TIP_MIST` (baked in at build time) with a 5,000,000
MIST (0.005 SUI) fallback — the workspace-wide ceiling, ~8× the operator relay's worst-case tip. This is a cap on the relay tip payment, not a fixed charge — the
relay asks for the minimum; this prevents overpayment. Set it via the Docker `--build-arg` to
give operators control over their tip ceiling.

## Key source files

| File | Purpose |
| --- | --- |
| `src/App.vue` | Standalone shell only: `UiAppShell` with `AppHeader` (+ `TipConfigBadge`, `ColorModeControl`), `<WalrusStorageView>` and `AppFooter` |
| `src/components/WalrusStorageView.vue` | Core tool UI (tabs, wallet section, one lazily created gate state per network, the upload form, `MyBlobs`). Exported for inline embedding. |
| `src/index.ts` | Library entry — exports `WalrusStorageView` for the dashboard to render inline |
| `src/config.ts` | `network` / `walrusNetwork` (wallet-adapter selector), relay hosts, access gate config (`relayGateConfig`) |
| `src/wallet.ts` | `createToolWallet({ requiredFeatures: ['sui:signTransaction'] })` from `@meddleware/wallet-adapter`: `useWallet` / `getSuiClient` / `buildExecutor` / `Executor` |
| `src/walrus.ts` | The Walrus client and library, loaded on first use and shared (the wasm URL lives here) |
| `src/composables/useStorageUpload.ts` | Upload orchestration for the `WalrusUpload` widget: the duplicate precheck, `runBlobUpload`, the gated access, the cost estimate |
| `src/composables/useOwnedBlobs.ts`, `useExtendQuotes.ts`, `src/blob-groups.ts` | The session cache of owned blobs, the Extend price quotes (shown before the wallet opens), grouping by blob id |
| `src/components/MyBlobs.vue` | Owned blob listing; runs Extend and Certify. Rows are `BlobGroupRows` (a blob and its copies), the amount control is `ExtendControl`; `UploadResultCard` shows an upload's result |
| `src/e2e.ts`, `src/e2e-data.ts` | End-to-end build only (`--mode e2e`): the mock wallet and a prepared owned-blob list (what the rows cover is in the data file), loaded from `main.ts` behind two static conditions so no other build contains it |

## End-to-end build

`npm run build:e2e` (`VITE_E2E=1 vite build --mode e2e`) is what `npm run test:e2e` serves: the mock wallet shows up in the wallet dialog like an
extension and My Blobs shows a prepared list (a duplicated blob that is about to expire, a settled one, one waiting to be certified, one at its
maximum lifetime), so the connected screens are checked and photographed offline. An upload needs a relay and storage nodes, so it is covered by
`e2e/upload.localnet.spec.ts` (signing through `e2e/wallet.ts`; `fixme` until the SPA has a localnet build target). `vite.config.ts` refuses
`VITE_E2E` in any other mode.

## Dual app + library

This package is **both** a standalone SPA (`App.vue` + `main.ts`, built with `vite build`) and a
library (`src/index.ts` exports `WalrusStorageView`, resolved via `"exports"`). The dashboard imports
`WalrusStorageView` and wraps it in its own shell + shared wallet. Keep the core UI in `WalrusStorageView.vue`
(shell-free) so both consumers stay in sync; `App.vue` must remain a thin shell.

## Extension roadmap

`walrus-storage-ui` is intended to grow into the full UI for all Walrus-on-Sui functionality:

- Blob listing and search across multiple owners
- Blob lifetime extension UI
- Token image upload (redirected from `token-deployer-sui`)
- Collection/gallery management

Keep each feature as a tab or route so the shell remains composable.

## What NOT to do

- Do not import `@mysten/walrus` or the `@meddleware/walrus-storage-client` root at module top-level — only
  the `./flow` subpath statically, everything else through dynamic imports.
- Do not derive exchange rates, fees, or NAV in this app.
- Do not add wallet-library-specific code outside `src/wallet.ts`.
- Do not hardcode `VITE_UPLOAD_RELAY_MAX_TIP_MIST` — read it from `import.meta.env`.

---

## Deferred documentation — NOT for the `docs.` website (planned here per Part 0.4)

> Captured for the future **`meddleware.dev`** subdomain and white-label offering; excluded
> from the user-facing `docs.` site (which covers *what/how/when* for end users only).

### `dev.` — developer integration (to write later)

- **Embed `WalrusStorageView`** in a host app (`import { WalrusStorageView } from '@meddleware/walrus-storage-ui'`) with the
  shared `@meddleware/wallet-adapter` context; the dual app+library contract and why the core UI stays
  shell-free. The SDK-level integration story lives in `@meddleware/walrus-storage-client`.

### White-label operator path (to write later)

- Deploying walrus-storage-ui against an operator's **own relay + tip ceiling**: the `VITE_*` build args
  (`VITE_UPLOAD_RELAY_MAX_TIP_MIST`, relay hosts, network) and the Docker `--build-arg` seams;
  branding via `@meddleware/design-tokens` + the `AppHeader` slot. Note that commission routing is
  fixed by `relayGateConfig` in `@meddleware/walrus-storage-kit` (the published access-gate deployment) and is not an operator
  knob here.
