# @meddleware/walrus-storage-ui

[![License: 0BSD](https://img.shields.io/badge/license-0BSD-blue)](LICENSE)

A Vue 3 SPA for uploading and managing blobs on [Walrus](https://walrus.xyz) decentralised
storage on Sui. Supports NFT-gated operator relays (commission-enforced on-chain via
`access_gate`) with automatic fallback to the public Mysten relay.

## Features

- Connect any Sui wallet (wallet-standard)
- Select between operator relay (supports the app) and public relay (free)
- Upload blobs through an NFT-gated or open relay
- View and extend your owned Walrus blobs
- Two-approval upload flow: register tx → upload → certify tx

## Local development

```bash
npm install
npm run dev
```

> `@meddleware/walrus-storage-kit` is resolved from the npm registry. For local development against an
> unpublished library, use `npm link @meddleware/walrus-storage-kit` or an `overrides` entry pointing at
> a local checkout.

## Environment variables

All `VITE_*` vars are baked into the static bundle at build time.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_NETWORK` | `testnet` | Network the standalone build selects (`testnet` or `mainnet`); embedded, the host's selector rules |
| `VITE_WALRUS_RELAY_TESTNET` | Public Mysten relay | Operator relay URL for testnet |
| `VITE_WALRUS_RELAY_MAINNET` | Public Mysten relay | Operator relay URL for mainnet |
| `VITE_ACCESS_GATE_ID_TESTNET` | — | Gate object ID (testnet; unset = no gate) |
| `VITE_ACCESS_GATE_SOULBOUND_TESTNET` | `false` | `true` if NFTs are soulbound |
| `VITE_ACCESS_GATE_ID_MAINNET` | — | Gate object ID (mainnet) |
| `VITE_UPLOAD_RELAY_MAX_TIP_MIST` | `5000000` | Max relay tip cap in MIST (0.005 SUI) |

The `access_gate` package and `PlatformConfig` come from the published deployment
(`relayGateConfig` in `@meddleware/walrus-storage-kit`) — operators only configure the values listed
above.

## Docker build

The Docker context is this repo root. `@meddleware/walrus-storage-kit` resolves from the npm registry,
so the library must be published before building the image.

```bash
docker build \
  --build-arg VITE_NETWORK=testnet \
  --build-arg VITE_WALRUS_RELAY_TESTNET=https://sui-walrus-storage-relay.example.com \
  --build-arg VITE_ACCESS_GATE_ID_TESTNET=0x... \
  -t walrus-storage-ui:latest .
```

## Architecture

Thin SPA — no accounting logic, no chain state derivation. The app:
1. Reads config from env vars
2. Wires `@meddleware/walrus-storage-kit` composables (`useAccessGate`, `useWalrusRelay`) to the
   connected wallet
3. Passes a `performUpload` callback to `WalrusUpload`, which holds the `@mysten/walrus` client
   and the upload flow logic
4. Displays results

All financial truth is on-chain. This UI is an orchestration shell.

## License

0BSD
