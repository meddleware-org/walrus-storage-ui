# AGENTS.md — @meddleware/walrus-storage-ui

## Package

`@meddleware/walrus-storage-ui` — standalone Vue 3 SPA for Walrus decentralised storage.

## Key files

| File | Purpose |
| --- | --- |
| `src/App.vue` | Root component: wallet, gate state, upload flow, tab nav |
| `src/config.ts` | Build-time env var config (relay hosts, access gate) |
| `src/wallet.ts` | Wallet-standard integration (connect, sign, execute) |
| `src/components/MyBlobs.vue` | Owned blob listing + extend lifetime |
| `Dockerfile` | Multi-stage build (node:22-slim builder → static-server runtime) |
| `vite.config.ts` | Vite build config |

## Build and development commands

```bash
npm install
npm run dev           # local dev server
npm run build         # production build to dist/
npm run type-check    # vue-tsc type check
```

## Docker build (context = repo root)

```bash
docker build \
  --build-arg VITE_NETWORK=testnet \
  --build-arg VITE_WALRUS_RELAY_TESTNET=https://relay.example.com \
  -t walrus-storage-ui:latest .
```

## Version

The version is `package.json`'s; release notes are in `CHANGELOG.md`.

## Relation to walrus-storage-kit

Depends on `@meddleware/walrus-storage-kit` (the component library). The library provides
`WalrusUpload`, `TipConfigBadge`, `AccessGateCta`, `useAccessGate`, `useWalrusRelay`.
This app wires them to the connected wallet and the Walrus client.
