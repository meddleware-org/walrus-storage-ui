# Changelog

All notable changes to `@meddleware/walrus-storage-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.

## [0.1.69] - 2026-11-07

### Changed

- Words for a person: the page title is "Walrus Assets · Meddleware" (it was "Walrus Uploader · MeddleWare") and the description says what the app does for its reader. The licence holder is spelled Meddleware.
- Where Walrus storage cannot be used the page says so in plain words and shows no tool: "not available on localnet" (and the networks to switch to), or "not available here right now" for a relay address that is not https or a gate id that is not an object id. A gate id set for a network with no recorded `access_gate` deployment makes that network unavailable instead of silently serving it without the pass. Which networks to suggest comes from the same checks, not from prose. The variable names go to the browser console only.
- A failed owned-blob load says "Your blobs could not be loaded. Check your connection and press Refresh."; the cause goes to the console.
- `@meddleware/walrus-storage-kit` ^0.1.38 (the access-pass prompt reads "This upload relay" and "Gate owner receives"; the estimated relay fee is exact), `@meddleware/ui` ^0.1.40, `@meddleware/web-utils` ^0.0.3, `@meddleware/wallet-adapter` ^0.0.22 (peer range now `>=0.0.22 <0.2.0`).

### Internal

- The standalone shell is the shared `AppToolShell` (the relay badge stays in its `actions` slot); the network comes from `selectBuiltNetwork`.
- `@meddleware/frontend-config` ^0.0.7: `vite.config.ts` is `meddlewareApp`, `vitest.config.ts` is `vueTestConfig`, `tsconfig.json` extends the shared base; the local audit gate and licence scripts are replaced by `mw-audit-gate` and `mw-third-party-licenses`; `mw-sync --check` and a CSP inline-script check (`npm run check:csp`, also in the image build) run in CI. The `"meddleware"` section of package.json declares the CSP profile (`chain-wasm`) and Lighthouse use.
- Removed the unused `public/CNAME`, `public/_headers` and `public/_redirects` (the image is served by static-server, which sets the headers and the SPA fallback). `AGENTS.md` points to `CLAUDE.md`.
- New tests: `availability`, the availability cases of `config`, the unavailable view, the shell, the plain load failure and a wording test over `index.html` and every template.

## [0.1.68] - 2026-11-06

### Changed

- Takes `@meddleware/ui` ^0.1.39 (the tab list items use `role="none"`) and the Dependabot merges of 2026-11-06: image bases `static-server` 0.1.12 and a refreshed `node` build image, and newer dev tools.

## [0.1.67] - 2026-11-05

### Security

- CI and the image build scan the production bundle for the e2e harness (`check-prod-bundle` from `@meddleware/frontend-config`), CI proves a production build with `VITE_E2E=1` is refused, and `src/e2e*.ts` is no longer in the published package.

### Changed

- Dependency alignment: `@meddleware/ui` ^0.1.38 (form-field edge contrast, sticky-offset and focus-not-obscured fixes), `@meddleware/design-tokens` ^0.1.13, `@meddleware/web-utils` ^0.0.2 and `@meddleware/frontend-config` ^0.0.2 (the shared sweep now also checks that focus is not hidden behind fixed content).

## [0.1.66] - 2026-10-31

- Gated upload composable, blob table split, accessibility gates

## [0.1.65] - 2026-10-30

- Dependency updates (minor and patch groups) and workflow action bumps. No source change.

## [0.1.64] - 2026-10-30

- Point the developer-docs and indexer links at the machine zone (ADR-0005); current @meddleware packages.

## [0.1.63] - 2026-10-24

### Changed

- Machine-zone endpoints (the indexer and the Walrus relays) can be overridden at deploy time by a same-origin `/runtime-config.json` (`@meddleware/ui` 0.1.34 `loadRuntimeConfig`), so the image is built once and moved between Cloudflare zones by configuration (workspace ADR-0005). Without the file the build-time values apply, as before.
- Ships its own `robots.txt` (Content Signals `search=yes, ai-input=yes`) and `llms.txt` instead of static-server's defaults.

## [0.1.62] - 2026-10-24

### Changed

- Renamed from `walrus-ui` to `walrus-storage-ui` (workspace naming convention, `docs/architecture/ADR-0003-naming.md`). No code change beyond names, paths, hostnames and dependency names; the history below keeps the old names.

## [0.1.61] - 2026-10-22

### Changed

- Dependencies: walrus-client ^0.0.30 (flow passes the real challenge expiry; nft-gate-client 0.0.18 rules), walrus-relay ^0.1.33, access-gate-client ^0.0.10 (stale indexer fallback); image base static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943)

## [0.1.60] - 2026-10-19

### Changed

- Image rebuilt without the `VITE_UPLOAD_RELAY_MAX_TIP_MIST` repository variable (deleted; it still held the old 0.05 SUI ceiling and overrode the 0.005 SUI default introduced in the previous release)

## [0.1.59] - 2026-10-19

### Changed

- The default relay tip ceiling (`VITE_UPLOAD_RELAY_MAX_TIP_MIST` unset) is now `5_000_000` MIST (0.005 SUI), down
  from 0.05 SUI: about 8× the worst-case tip of the re-priced operator relay (`100_000` MIST + 1 MIST per encoded
  KiB; workspace cost model, decision D57). The repository variable `VITE_UPLOAD_RELAY_MAX_TIP_MIST`, when set,
  still wins.

## [0.1.58] - 2026-10-18

### Changed (breaking, pre-v0.2)

- **Adopts `@meddleware/walrus-relay` 0.1.31.** `useAccessGate` is given the network and a client getter
  that serves the active network only; the access gate is still built by `relayGateConfig`, so it names the
  published `access_gate` deployment. The purchase prompt (`AccessGateCta`) now shows the price, payees,
  network and pass kind read from the chain, with a "Read the price again" button when they cannot be read.
- **`VITE_ACCESS_GATE_PRICE_MIST_TESTNET` is removed** (code, `.env.example`, Dockerfile build argument,
  release workflow and README). The price is read from the gate on the chain; a build that still sets the
  variable ignores it.
- `WalrusUpload` gets `sessionKey` (`<network>:<address>`), so a change of account or network discards the
  chosen file and any held retry; the upload approvals hint follows the held pass (`singleUse`).
- Dependencies: `@meddleware/walrus-client` ^0.0.28, `@meddleware/walrus-relay` ^0.1.31,
  `@meddleware/design-tokens` ^0.1.10, `@meddleware/access-gate-client` ^0.0.9. The unused
  `@mysten/wallet-standard` dependency is dropped.
- Image base: `static-server` 0.1.8 (`sha256:e32cf42b…4000`).

### Fixed

- **A slower owned-blob load no longer overwrites a newer one** after a wallet-account or network switch,
  a disconnect, or a switch back to a list that is already held (a stale result, error or `loading` flag is
  dropped); a cleared list no longer reads as loaded for the previous account.
- **Extend shows its cost before the wallet opens.** The seeded +10 epochs is priced on the first press
  (the button reads "Show cost"), the amount and `≈ WAL` cost are shown, and the wallet opens on the next
  press (`Extend`). An amount that cannot be priced says "price unavailable".
- **My Blobs text meets AA contrast in both themes.** It read `--mw-color-*` custom properties that
  design-tokens does not define, so literal fallbacks (`#888`, `#c00`, `#ddd`, `#f90`) ignored theme and
  season; it now uses `--muted`, `--danger`, `--border`, `--warning` (tint only) and `--accent`.
  A test fails if a component reads a custom property design-tokens does not define.

### Security

- `.env*` is git-ignored (except `.env.example`).
- `SECURITY.md` invariant 1 names the real wiring of the tip ceiling (`maxTipMist` to `runBlobUpload`).

### Added

- `CHANGELOG.md` (it was listed in the package `files` without existing).
- Tests: stale-load guard (`useOwnedBlobs.stale`), extend quotes, the custom-property check, and the
  gate-config/`useAccessGate` pairing.
