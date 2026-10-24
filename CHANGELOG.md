# Changelog

All notable changes to `@meddleware/walrus-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.

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
