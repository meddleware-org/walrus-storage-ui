# Security Audit — `walrus-storage-ui`

**Classification:** Internal security review
**Project:** `repos/walrus-storage-ui` — `@meddleware/walrus-storage-ui`, Vue 3 SPA and library for uploading and managing Walrus blobs (`sui-walrus-storage.meddleware.co.uk`; embedded in the dashboard)
**Project type:** Vue app + UI library
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_SUI_CLIENT.md (2026-10-08) + AUDIT_TEMPLATE_WALRUS.md (2026-09-30) + AUDIT_TEMPLATE_IMG.md (2026-10-08)
Not triggered: AUTH (the app holds no credential; the access proof is built and signed by walrus-storage-client and access-gate-gateway-client, and the persisted consume digest is a public transaction digest), SEAL, OPS (the integration workflow runs a browser smoke suite only and signs nothing on a real chain), PROXY, WORKERS, GO, RUST, SITE, PLATFORM (the cluster is audited with the workspace).
**Sui SDK:** `@mysten/sui ^2.33.2` (installed 2.35.0, one copy; `npm ls` single version)   **Transport:** gRPC through wallet-adapter; HTTPS to relays and aggregators
**Walrus SDK:** `@mysten/walrus ~1.2.32` (installed 1.2.34), `@mysten/walrus-wasm ~0.3.1`; uploads through `@meddleware/walrus-storage-client/flow` 0.0.28 (lazy wasm); relay selection and the gate from `@meddleware/walrus-storage-kit` 0.1.31
**Package config source:** SDK-bundled per network (`createWalrusClient({ network })`); no caller-supplied package ids; localnet shows a notice
**Upload relays:** operator `https://sui-walrus-storage-relay-testnet.meddleware.co.uk` (build argument `VITE_WALRUS_RELAY_TESTNET`; mainnet unset) · public fallback `https://upload-relay.{testnet,mainnet}.walrus.space`
**Aggregator / publisher hosts:** none of the app's own; the result URL comes from walrus-storage-client and is bound through `safeHref`; no publisher is used
**Tip ceiling:** `VITE_UPLOAD_RELAY_MAX_TIP_MIST`, default 5 000 000 MIST (0.005 SUI, D2 re-derived under D57; 0.05 SUI until 0.1.58), passed as `maxTipMist` to the flow   **Epoch default / maximum:** the widget defaults to the single-reservation maximum (53, `max_epochs_ahead`); longer lifetimes through Extend
**Deletable default:** permanent (D6): an explained, visible tick-box; a permanent blob cannot be removed by anyone before it expires. **Blob ownership:** the connected wallet owns the Blob on the relay path (it registers and certifies)
**Networks:** testnet (live); mainnet when Walrus and the gate are configured; localnet shows a notice
**On-chain packages consumed:** Walrus system objects (SDK); `access_gate` through `relayGateConfig` (access-gate-client 0.0.9 `deployments`: testnet `0xd7ddaa94…88c9`, PlatformConfig `0x3f81489d…e7b5`) with `VITE_ACCESS_GATE_ID_TESTNET` = relay gate `0x316f1bf9…faddc` (soulbound, 10 uses, 0.01 SUI; the old gate `0xfd6c3b…` is on the superseded, immutable package `0xa55789…`)
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format / publish model:** ESM; ships source (library) + SPA image
**Runtime targets:** browser   **Peer dependencies:** `@meddleware/wallet-adapter >=0.0.12 <0.2.0`
**Build tool:** vite 8.3, `@vitejs/plugin-vue` 6.0.9, vue 3.5.43, vue-tsc 3.3.x, TypeScript 6.0.3, vitest 5.0.3
**Hosting:** container image on static-server (CSP and HSTS from the server); no static-host `_headers` file
**Embedding hosts:** the dashboard (`WalrusStorageView`, no shell chrome; dashboard requires `^0.1.56`)
**VITE_\* inventory:** `VITE_NETWORK` (testnet|mainnet, baked, selects the network only), `VITE_WALRUS_RELAY_{TESTNET,MAINNET}` (operator relay host, baked, per network), `VITE_UPLOAD_RELAY_MAX_TIP_MIST` (tip ceiling), `VITE_ACCESS_GATE_{ID,SOULBOUND}_{TESTNET,MAINNET}` (the operator's gate object and soulbound flag; the package and PlatformConfig are never configurable, and the price is read from the chain since 0.1.58, so the former `…_PRICE_MIST_*` variable is gone), `VITE_DOCS_URL` / `VITE_DEV_URL` (footer links); all public, none secret; all listed in `.env.example` (per-network names by template)
**Images:** `quay.io/meddleware-org/walrus-storage-ui:0.1.58@sha256:0e02f43112ec67dc10f7e892af2f95a9be71998325df3946bca030a1ebb2e110` (Docker Hub mirror, same digest; cosign keyless signature verified 2026-10-18 against the workflow-anchored identity, `verify-digests.sh` 16/16; SPDX SBOM attestation, build provenance). Superseded 0.1.57 was `sha256:631abc3a…3708`
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.8@sha256:e32cf42b…4000` in 0.1.58 (the 0.1.57 image deployed 2026-10-09 carried 0.1.7, `sha256:2e227311…2379`, Go 1.26.9)
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root, no writable mounts
**Deployed by:** `post-bootstrap/walrus-storage/overlays/testnet` (base `post-bootstrap/walrus-storage/base/ui`); digest from `config/images.yaml`
**Build args:** `CSP`, `VITE_NETWORK`, `VITE_WALRUS_RELAY_{TESTNET,MAINNET}`, `VITE_ACCESS_GATE_ID_{TESTNET,MAINNET}`, `VITE_ACCESS_GATE_SOULBOUND_TESTNET`, `VITE_UPLOAD_RELAY_MAX_TIP_MIST` — none secret, none a test switch
**Deployment status:** npm v0.1.58 (2026-10-18); image `quay.io/meddleware-org/walrus-storage-ui` serving `sui-walrus-storage.meddleware.co.uk` at 0.1.58 (`sha256:0e02f431…e110`; release tag `v0.1.58` = `97c3247`; released, signature verified and deployed 2026-10-18, rollout succeeded; 0.1.57 `sha256:631abc3a…` was deployed 2026-10-09; the live bundle carries `access_gate` `0xd7ddaa94…`, PlatformConfig `0x3f81489d…` and gate `0x316f1bf9…` only, none of the superseded `0xa55789…` / `0xfd6c3b…`, checked 2026-10-18; live headers re-checked 2026-10-18); embedded in dashboard 0.1.85 (requires `^0.1.56`)
**Review date:** 2026-09-18 (first pass) · re-verified 2026-10-02 · re-verified 2026-10-09 · fixes 2026-10-18 (0.1.58, released and deployed)
**Reviewer:** Internal review
**Severity ceiling:** Medium — the app drives paid uploads and pass purchases with the user's wallet; it holds no keys and decides nothing on its own.
**Status:** fixes for F11–F14, F16 and F18 in 0.1.58 (2026-10-18; commit `54df3d6`; released and deployed 2026-10-18, signature verified, rollout succeeded); re-verified 2026-10-09 at 0.1.57

---

## Executive summary

A thin shell over the shared libraries: `WalrusStorageView` (upload tab and **My Blobs**) wires the
wallet-adapter connection, walrus-relay's relay selection and gate, and walrus-storage-client's upload flow
(fresh register per attempt, same-registration retry, certify retry, persisted consume). It holds no
keys and no on-chain logic of its own (the `suiBoundary` lint is clean). It has no `v-html`, no
`fetch` and no `eval`, and its only storage is walrus-storage-client's `browserStorage()`.

All first-pass findings are resolved, accepted or adjudicated. Earlier passes found:

- **F8 (Low, RESOLVED 0.1.50)** — upload and My Blobs read `window.localStorage` directly; where
  storage is blocked that access throws and the flow failed. They now use walrus-storage-client's
  `browserStorage()`, which falls back to memory for the page.

Re-verified 2026-10-09 (0.1.57; 17 unit tests, type-check and all three linters green, audit gate
1 allowlisted / 0 open; the live site `sui-walrus-storage.meddleware.co.uk` and its bundle read the same day):

- **F9 (Low, RESOLVED 0.1.56)** — from walrus-storage-client 0.0.23 the owned-blob listing dropped every real
  blob (a blob id is a u256, the strict parser capped it at 20 digits), so My Blobs, the duplicate-upload
  precheck and the pending-certify recovery saw nothing in 0.1.50–0.1.55. walrus-storage-client 0.0.27 fixes it;
  this app's tests mock the listing, so they could not catch it (see C.1).
- **F10 (Low, RESOLVED 0.1.54–0.1.57)** — the image release now runs the full CI workflow, scans the
  published image before cosign signs it, ships the lockfile for SBOM tools, serves
  `/THIRD_PARTY_LICENSES` (HTTP 200 live), runs as an explicit `USER 65534:65534` on static-server 0.1.7,
  and the pod sets `automountServiceAccountToken: false`.
- The known CI gap found in the sibling web apps (the reusable `node-ci.yml` has no `npm test` step, so
  the release gate stops running the unit tests) is **not present here**: `node-ci.yml` runs `npm test`,
  the release `verify` job calls it, and the npm job runs the tests too (F6).
- The newly applicable lens checks found defects, **fixed in 0.1.58 (2026-10-18; commit `54df3d6`)**:
  **F11 (Low, RESOLVED)** a slower owned-blob load could overwrite a newer one after an account or
  network switch; **F12 (Low, RESOLVED)** Extend signed the seeded default without showing its cost;
  **F13 (Low, RESOLVED)** My Blobs styled text with `--mw-color-*` custom properties that design-tokens
  does not define, so literal fallbacks that fail contrast in one theme each were used; **F14 (Info,
  RESOLVED)** `.gitignore` did not ignore `.env.local`; **F18 (Info, RESOLVED)** documentation drift
  (no `CHANGELOG.md`, a stale `SECURITY.md` sentence, an unused dependency, a stray word in a workflow
  message). **F16 (Low, RESOLVED)** the npm job now calls the full CI workflow.
- 0.1.58 also adopts walrus-relay 0.1.31 (the gate is pinned to the published deployment by
  `useAccessGate`, the price and payees are read from the chain and shown before the purchase prompt,
  `sessionKey` resets the upload widget on an account or network change) and removes the
  `VITE_ACCESS_GATE_PRICE_MIST_TESTNET` build argument.
- The design-tokens F10 check (`color: var(--warning)` as text) is clean here: no `--warning` colour is
  used as text in `src/`; the tint on an expiring row is a background (F13).
- Accepted: **F15** blanket `connect-src https:`. **F17** the cosign identity pinned the repository, not
  the workflow (RESOLVED 2026-10-18: the workspace `verify-digests.sh` default is now workflow-anchored). **F7** (registry credential inventory) is a
  maintainer item.

Fixes in the libraries reach the app: the pending-purchase guard (walrus-relay F10), the bounded and
strict owned-blob listing (walrus-storage-client F9), the read cap and validated storage (walrus-storage-client F10, F11),
the challenge timeout (access-gate-gateway-client F9), audience-bound `nft-gate:access:v2` proofs and the
same-registration upload retry (walrus-storage-client 0.0.26, 0.1.52), and the republished `access_gate` with its
new relay gate (0.1.53). The paywall e2e passed 2026-10-09 against the live dashboard (pass bought on gate
`0x316f1bf9…`, consumed, upload through the Worker).

The severity ceiling stays Medium.

## Threat model / trust boundaries

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| User | wallet, passes, files | upload, extend, buy a pass | wallet confirmation; permanence choice visible (D6); on-chain checks |
| Relay (operator / public) | uploads, tip config; sees the plaintext blob | ask a tip; refuse; read the content | tip ceiling; selection rules (walrus-relay); content is public by design (nothing is encrypted here) |
| Aggregator | blob bytes | serve or not | strict consistency check; read cap |
| Full node | owned blobs, passes | lie or omit | display only; gateway re-verifies |
| Browser storage | consume digest, pending certifications | be tampered with or blocked | validated (walrus-storage-client F11, 0.0.26); never throws (F8) |
| Static host / CDN | headers and served bytes | modify or strip them | digest-pinned image, CSP and HSTS from static-server (B.VUE-1) |
| Whoever controls the build environment | every `VITE_*` value (relay host, gate id, price, tip ceiling) | point the build at another relay or gate, raise the tip ceiling | public values; package and PlatformConfig are not configurable (I1); the gateway and the chain re-check |
| Embedding host (dashboard) | the page around `WalrusStorageView`, the shared wallet | switch account or network under the view | account/network watchers (I3); `WalrusStorageView` injects no chrome |
| Base-image publisher, registry, CI publish job | image layers, what is signed | ship altered bytes | digest pinning, Trivy before cosign, keyless signature, SBOM and provenance (F10) |

### On-chain dependency matrix

| Object / package | ID (original-id · published-at) | Sourced from | Used as | If stale, wrong or attacker-supplied | Fails open / closed |
| --- | --- | --- | --- | --- | --- |
| `access_gate` package, testnet | `0xd7ddaa94…88c9` · same (fresh publication 2026-10-09) | `deployments` of access-gate-client 0.0.8, via `relayGateConfig` | pass purchase and consume call target; `AccessNFT` type filter | calls old code or routes commission wrongly | closed: `relayGateConfig` throws; the UI then shows an ungated form and the gateway refuses unproven uploads (F4) |
| `PlatformConfig`, testnet | `0x3f81489d…e7b5` | same | argument of the purchase | wrong commission terms | closed (as above) |
| relay `Gate`, testnet | `0x316f1bf9…faddc` | `VITE_ACCESS_GATE_ID_TESTNET` (operator build argument) | purchase and ownership checks | a gate of another operator or a superseded package | the chain and gateway re-check; an unknown gate buys nothing the relay honours |
| Walrus system and staking objects | per network | `@mysten/walrus` (SDK-bundled) | register, certify, extend | SDK-owned | closed: no Walrus network on localnet |
| mainnet gate | none recorded | — | — | — | closed: no deployment ⇒ ungated notice path, no gate (F4) |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.1.57):** `src/**` (`App.vue`, `components/WalrusStorageView.vue`, `components/MyBlobs.vue`,
  `config.ts`, `wallet.ts`, `blob-groups.ts`, `composables/useOwnedBlobs.ts`, `composables/useExtendQuotes.ts`), `index.html`, `public/`,
  `Dockerfile`, `.dockerignore`, workflows, `.github/audit-gate.mjs`, `.github/dependabot.yml`,
  `scripts/third-party-licenses.mjs`, `SECURITY.md`; the manifests in `post-bootstrap/walrus-storage/base/ui`
  and the testnet overlay (read-only).
- **Out of scope:** the libraries (own audits).
- **Environment (2026-10-18, 0.1.58; live checks 2026-10-09):** `npm test` 39/39 (6 files, vitest 5.0.3); `vue-tsc`; stylelint, eslint
  (+ vuejs-a11y), html-validate; production build; audit gate (1 allowlisted advisory, 0 open);
  `npm pack --dry-run` (18 files, source only); Playwright smoke 3/3; live headers and bundle of `sui-walrus-storage.meddleware.co.uk`.
  The repository had no `CHANGELOG.md` at 0.1.57 (the `files` list named one); 0.1.58 adds it.

## Findings

### F1 — Tip ceiling client-side only

**Severity:** Low   **Disposition:** RESOLVED — the ceiling is wired into the client
(`VITE_UPLOAD_RELAY_MAX_TIP_MIST`, D2); the relay's own enforcement is documented as the residual.
**Remediation / evidence (2026-10-09):** `config.ts` `uploadRelayMaxTipMist()` (non-positive or
unparseable values fall back to 50 000 000 MIST) is passed as `maxTipMist` to `runBlobUpload`
(`WalrusStorageView.vue`); walrus-storage-client 0.0.26 checks it is a positive safe integer before any wallet prompt.
Tested (`tests/config.test.ts`: default, override, fallback). `SECURITY.md` invariant 1 now names `runBlobUpload`
(F18, 0.1.58).

### F2 — Result URL bound without a scheme check

**Severity:** Low   **Disposition:** RESOLVED — `safeHref`.
**Remediation / evidence (2026-10-09):** the only dynamic `:href` on a native element is the result URL,
bound through `safeHref` (`WalrusStorageView.vue`); the explorer links go through `ExplorerLink` with a
Walruscan URL built from the network and a blob id that walrus-storage-client derives with `blobIdFromInt`
(base64url), and the `suiBoundary` lint enforces the helpers. No `v-html`, `innerHTML` or `eval` in `src/`.

### F3 — No dependency scan in CI

**Severity:** Low   **Disposition:** RESOLVED — `npm audit --audit-level=high`.
**Remediation / evidence (2026-10-09):** `.github/audit-gate.mjs` (one allowlisted advisory,
GHSA-vfj7-8cjw-p6xm, expiring 2027-01-01; 0 open) runs in `node-ci.yml` (and so in the image release,
F10) and in `npm-publish.yml`.

### F4 — Empty package id guarded

**Severity:** Positive — now through `relayGateConfig` (deployments). Corrected 2026-10-09: an unknown
network does not "throw" to the user. `relayGateConfig` throws; `accessGate()` in `config.ts` catches it,
logs a warning and returns `null`, so the UI shows an ungated form. That is safe because the control is
server-side: the operator relay sits behind the nft-gate gateway, which refuses an upload without a valid
proof. Pinned by `tests/config.test.ts` ("is ungated on a network without a recorded deployment"; the
package and PlatformConfig equal the recorded deployment). The live bundle carries only the new
`access_gate` and gate ids (no `0xa55789…`, no `0xfd6c3b…`).

### F5 — Stored tokens are non-secret and lifecycle-managed

**Severity:** Positive — the consume digest and pending certifications are not secrets; the gateway
and the chain re-verify them. Re-verified 2026-10-09: walrus-storage-client 0.0.26 validates the stored consume
(`{ digest, nftId, savedAt }`; malformed, another pass's, over 4 days old or from the future is dropped)
and the keys are scoped by network, gate and address.

### F6 — Publish gated on tests

**Severity:** Low   **Disposition:** RESOLVED
**Remediation / evidence (2026-10-09):** `node-ci.yml` runs the audit gate, type-check, the three
linters, `npm test`, the build and the licence check; the image release `verify` job calls it
(`workflow_call`) and both build jobs `need` it; `npm-publish.yml` `verify` runs the audit gate,
type-check and tests. Read in full 2026-10-09: the sibling-app gap (no `npm test` in the reusable
workflow) does not exist here.

### F7 — Registry publish uses long-lived tokens

**Severity:** Info   **Disposition:** ACCEPTED-RISK — quay.io and Docker Hub robot tokens as GitHub
secrets (no OIDC on those registries); inventoried in B.2. The scope and rotation inventory is a
maintainer item (DEFERRED: `OPERATOR_TASKS.md` "Image registry credentials — record scope and
rotation").
**Remediation / evidence (2026-10-09):** the public publish path has no `continue-on-error`; only the
self-hosted `mirror-private` job does (best-effort; it copies the published, signed image by digest and fails without registry credentials). The
cluster pins digests and verifies signatures, so an unsigned tag would not run.

### F8 — Blocked browser storage broke uploads

**Severity:** Low   **Disposition:** RESOLVED (0.1.50, `0f74cc8`)
**Where:** `src/components/WalrusStorageView.vue`, `src/components/MyBlobs.vue`
**Issue / impact:** `window.localStorage` was read directly; with site data blocked, the access
throws, so a gated upload and the pending-certify list failed.
**Remediation / evidence:** one `browserStorage()` instance per component (walrus-storage-client 0.0.24,
tested there); values fall back to memory for the page. Re-verified 2026-10-09: no `localStorage`
reference remains in `src/`.

### F9 — The owned-blob listing dropped every real blob (walrus-storage-client 0.0.23–0.0.26)

**Severity:** Low   **Disposition:** RESOLVED (0.1.56, `b6a8986`; walrus-storage-client 0.0.27, `83521fc`)
**Where:** `src/composables/useOwnedBlobs.ts`, `WalrusStorageView.vue` (`findExistingCopy`), `MyBlobs.vue`;
the parser is `fetchOwnedWalrusBlobs` in walrus-storage-client
**Issue / impact:** walrus-storage-client 0.0.23 made the listing's parsing strict and capped every integer at
u64's 20 digits, but a blob id is a u256 (up to 78 digits), so on a live network every blob was skipped.
In walrus-storage-ui 0.1.50–0.1.55 My Blobs showed "No Walrus blobs found", the duplicate-upload precheck found
no existing copy (the user could pay to register a second copy), and a pending certification could not
be offered. Funds and access were not at risk; the failure was silent. It was caught by walrus-storage-client's
daily localnet suite (red since 2026-10-02), not by a test here.
**Remediation / evidence:** 0.1.56 depends on walrus-storage-client `^0.0.27` (the id accepts up to 78 digits and
nothing above u256::MAX; tested there, and the localnet suite passes again). Here the listing is
mocked (`tests/useOwnedBlobs.test.ts`), so no test in this repository pins a real-length id.

### F10 — Image release gate, scan, notices and runtime user

**Severity:** Low   **Disposition:** RESOLVED (0.1.54 `143aec3`, 0.1.56 `b6a8986`, 0.1.57 `ba75d9e`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`, `post-bootstrap/walrus-storage/base/ui/deployment.yaml`
**Issue:** the image release was gated by a subset of CI, the published image was not scanned before
signing, the lockfile was not in the image (the SBOM saw only the base), no third-party licence texts were
served with the bundled npm code, the runtime user was only inherited from the base, and the base carried
Go 1.26.7 stdlib advisories.
**Impact:** a tag could ship what CI would have refused; an SBOM that misses the bundled dependencies;
redistributed MIT/Apache code without its notices.
**Remediation / evidence:** `verify` calls `node-ci.yml` and the build jobs `need` it; the public job
runs Trivy on the pushed digest (CRITICAL/HIGH, fixable only, `exit-code: 1`) before `cosign sign`, then
an SPDX SBOM attestation and build provenance for quay.io and Docker Hub, with no `continue-on-error`;
the Dockerfile runs `npm run licenses` and copies `package-lock.json` to
`/usr/share/doc/walrus-storage-ui/`; `/THIRD_PARTY_LICENSES` returns HTTP 200 on the live site and CI runs
`check:licenses`; the runtime base is static-server 0.1.7 (Go 1.26.9) with an explicit
`USER 65534:65534`; the pod sets `automountServiceAccountToken: false`, `runAsNonRoot` uid 65534,
read-only root, no privilege escalation, all capabilities dropped, `RuntimeDefault` seccomp, probes and
limits, and a NetworkPolicy exists; the digest is identical in `config/images.yaml` and the overlay; all
images cosign-verified 2026-10-09 (`verify-digests.sh`, 16/16). Not run: a Trivy *config* scan of the
Dockerfile and manifests (the image scan runs at release).

### F11 — A slower owned-blob load can overwrite a newer one after a switch

**Severity:** Low   **Disposition:** RESOLVED (0.1.58, commit `54df3d6`)
**Where:** `src/composables/useOwnedBlobs.ts` (`load`), `MyBlobs.vue` (watchers on address and network)
**Issue:** `load` captures its key (`<network>|<address>`) when it starts but, after the awaits,
assigns `blobs`, `currentEpoch` and `loadedFor` without checking that the key is still the wanted one,
and clears `loading` for whichever load finishes first. If the wallet account or the network changes
while a load is in flight, the earlier request can finish last and its list is shown, labelled as
loaded for the earlier key, for the new address. VUE lens *Shared-wallet state*: results that arrive
after a switch are discarded.
**Impact:** a stale list is displayed under the wrong account or network until the next refresh.
Display only: Extend and Certify build transactions for objects the connected wallet must own, so the
chain refuses a wrong one. The upload path is unaffected (the widget's own state is walrus-relay F16).
**Remediation / evidence (0.1.58):** `useOwnedBlobs.load` keeps a request counter: every call that
decides what the list shows (a load, a disconnect or an unsupported network, a cache hit that leaves a
slower load for another key behind) supersedes the one in flight, and a superseded load discards its
list, its error and its `loading` flag. A list cleared for another key no longer reads as loaded for the
previous one. Pinned by `tests/useOwnedBlobs.stale.test.ts` (7 tests: later account first, `loading`
not cleared by the earlier load, earlier failure dropped, disconnect, network switch, switch back,
same-key cache hit during a refresh); six of them fail on the 0.1.57 code.

### F12 — Extend signs the seeded default without showing its cost

**Severity:** Low   **Disposition:** RESOLVED (0.1.58, commit `54df3d6`; failure text unchanged, see note)
**Where:** `src/components/MyBlobs.vue` (`setExtendAmount`, `extendBlob`)
**Issue:** each row's amount is seeded to +10 epochs (clamped) without pricing it; the WAL estimate is
fetched only when the user edits the amount or presses a preset. Pressing **Extend** straight away
opens the wallet with no cost shown in the app. VUE lens *Signing UX*: the amount is shown before every
wallet prompt. The Walrus system package's abort codes are not mapped either: a failed extension shows
the executor's generic "failed on-chain" text.
**Impact:** the user may approve a WAL payment they have not seen priced; the wallet still shows the
transaction and the chain enforces it, and the amount is small (storage only, no write cost).
**Remediation / evidence (0.1.58):** `composables/useExtendQuotes.ts`: Extend opens the wallet only for
an amount whose quote the row has shown. The seeded default has no quote, so the button reads "Show
cost"; pressing it prices the amount, shows `≈<WAL> for +N epochs` in a polite live region and turns the
button into "Extend", and the next press opens the wallet. An edited amount or preset is priced as before
(a late answer for an older amount is dropped); a quote is cleared after a successful extension; an amount
that cannot be priced says "price unavailable" and may then be sent (the wallet still shows the
transaction). Pinned by `tests/useExtendQuotes.test.ts` (7 tests). Not done: mapping the Walrus system
package's abort codes in the failure text (the executor's generic message stays; no single wording is
defined upstream).

### F13 — My Blobs styles text with custom properties design-tokens does not define

**Severity:** Low   **Disposition:** RESOLVED (0.1.58, commit `54df3d6`)
**Where:** `src/components/MyBlobs.vue` (`.hint`, `.err`, `.blob-table th`, `.est`, `.at-max`, `.act-status`, borders, the `.warn` tint)
**Issue:** the component uses `--mw-color-text-muted`, `--mw-color-danger`, `--mw-color-border` and
`--mw-color-warning`. design-tokens 0.1.9 defines none of them (its roles are `--muted`, `--danger`,
`--border`, `--warning` / `--warning-text`), so the literal fallbacks `#888`, `#c00`, `#ddd` and `#f90`
are always used and the table ignores theme and season. Computed against the tokens' canvases: `#888`
is 3.24:1 on the light canvas (`#f7f4f1`) and `#c00` is 3.25:1 on the dark canvas (`#120e10`, the
standalone default), both below the 4.5:1 AA text minimum; `#ddd` borders are bright lines in the dark
theme. `WalrusStorageView.vue` uses the real tokens (`--muted`, `--border`, `--surface`).
**Impact:** hint, helper and error text in My Blobs is hard to read for low-vision users in one theme
each. Information is also in the text; nothing is hidden. Not browser-checked per theme and season: the
`@meddleware/ui` gallery axe gate covers the shared components only.
**Remediation / evidence (0.1.58):** `MyBlobs.vue` reads `--muted`, `--danger`, `--border` and
`--warning` (tint only) with no literal fallbacks (and `--accent` without its `#6366f1` fallback); the
expiring-row tint stays a background. `tests/design-tokens-used.test.ts` fails if any `.vue` file reads a
custom property that design-tokens (tokens.css, seasons.css) or the file itself does not define, or uses
`--warning` as `color:`. The roles' contrast per theme and season is design-tokens' own gate; this repo
has no browser contrast test of its own (C.2), and My Blobs needs a connected wallet to render.

### F14 — `.env.local` is not git-ignored

**Severity:** Info   **Disposition:** RESOLVED (0.1.58, commit `54df3d6`)
**Where:** `.gitignore` (no `.env` pattern); `.env.example` says "Copy to .env.local … never commit"
**Issue:** only `.env.example` is tracked, but nothing prevents `git add` of a local `.env.local`.
`.dockerignore` excludes `.env*.local`, so the image build is safe.
**Impact:** every `VITE_*` value is public, so a committed file would leak nothing secret; it could
still pin a developer's local relay or gate into history.
**Remediation / evidence (0.1.58):** `.gitignore` ignores `.env*` except `.env.example`, as access-gate-ui does.

### F15 — `connect-src` allows any https origin

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `Dockerfile` (`CSP` argument); live header read 2026-10-09
**Issue:** `connect-src 'self' https:` and `img-src 'self' data: blob: https:` are blanket allowances.
**Impact:** an injected script could send data to any https host. Script injection is the prerequisite,
and `script-src 'self' 'wasm-unsafe-eval' 'nonce-…'` with no inline script and no XSS sink (I4) is the
control on that.
**Remediation / evidence:** accepted: the RPC node, relays, aggregators and the operator relay are
operator- or user-configured per network, so the hosts cannot be enumerated in a white-label build.
`'wasm-unsafe-eval'` is needed by the Walrus wasm. Revisit when the hosts are fixed for mainnet.

### F16 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** RESOLVED (0.1.58, commit `54df3d6`)
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the npm job's `verify` runs `npm ci`, the audit gate, type-check and the unit tests, not the
full CI workflow (linters, licence check). The image release (F10) does run the full workflow on the
same tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source only (`npm pack --dry-run` 2026-10-09: `src`, `index.html`, `vite.config.ts`,
`tsconfig.json`, README, LICENSE; no tests, fixtures or `.env*`).
**Remediation / evidence (0.1.58):** `npm-publish.yml`'s `verify` job is now `uses: ./.github/workflows/node-ci.yml`,
the same call `docker-publish.yml` makes, so a tag publishes the package only if the commit passes the
whole CI workflow (type-check, all linters, tests, build, licences). Unchanged: OIDC publishing with
provenance, tag == version check, idempotent, opt-in through `NPM_PUBLISH`. Workflow file only, not
exercised locally (parsed as YAML); it ran green on the `v0.1.58` tag (Publish (npm) run 39119582060 and Publish (Docker) run 39119582082, 2026-10-18).

### F17 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** RESOLVED (2026-10-18, workspace `verify-digests.sh` default; was ACCEPTED-RISK)
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepted any workflow identity of `github.com/meddleware-org/walrus-storage-ui`.
**Impact:** a workflow added by someone with write access could have signed an image the check would accept.
**Remediation / evidence:** fixed in the workspace script on 2026-10-18: the default identity in
`bootstrap/images/verify-digests.sh` is now `^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`
(`COSIGN_IDENTITY_REGEXP` still overrides it), so a signature from any other workflow or ref of the repository is
rejected. All 16 deployed and contingency images verified valid against it on 2026-10-18
(`STRICT=0 bash bootstrap/images/verify-digests.sh`, 0.1.58 included); 2026-10-09 (0.1.57) was
checked with the earlier repository-wide identity. This repository publishes no verify command, so the script
default was the only remaining problem.

### F18 — Documentation drift

**Severity:** Info   **Disposition:** RESOLVED (0.1.58, commit `54df3d6`)
**Where:** `package.json` `files`, `SECURITY.md`, `.github/workflows/npm-publish.yml`
**Issue:** `files` lists `CHANGELOG.md`, which does not exist (the tarball is clean, the entry matches
nothing); `SECURITY.md` invariant 1 says the tip cap is passed to `createWalrusClient`, but the app passes
`maxTipMist` to the flow's `runBlobUpload`; the npm workflow's skip message contains a stray word
("`--provenanceing`"); `@mysten/wallet-standard` is a dependency that nothing in `src/` or `tests/`
imports (comments only).
**Impact:** none on behaviour; reviewers are misled and every host installing the package gets the
unused dependency.
**Remediation / evidence (0.1.58):** `CHANGELOG.md` added (in the tarball: `npm pack --dry-run`, 18
files); `SECURITY.md` invariant 1 now says `maxTipMist` goes to `runBlobUpload`; the npm workflow message
reads "npm publish with provenance is not configured"; `@mysten/wallet-standard` is dropped from
`dependencies` (wallet-adapter brings its own copy). `AGENTS.md` no longer states a stale version and
`CLAUDE.md` no longer lists the price as an operator setting.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | No on-chain logic in the app; ids only from the recorded deployment and the operator's gate | components use the libraries; `relayGateConfig` fixes package and PlatformConfig | `suiBoundary` lint (eslint-config 0.0.2, clean 2026-10-09); `config.test.ts`; live bundle read 2026-10-09 | HOLDS |
| I2 | One wallet connection when embedded | wallet-adapter peer | dashboard | HOLDS |
| I3 | Gate and relay follow the network and account | per-network gate state; the gate watcher resets on address or network change; `sessionKey` resets the upload widget; the owned-blob list drops a stale load (F11) | `useOwnedBlobs.stale.test.ts`; component logic for the gate (code-only) | HOLDS |
| I4 | Dynamic URLs through helpers | `safeHref`, `ExplorerLink` | lint trial; source | HOLDS |
| I5 | Permanence is a visible choice | upload form (D6, walrus-relay) | UI | HOLDS |
| I6 | Storage failures never break a flow | `browserStorage()` | walrus-storage-client tests | HOLDS (F8) |
| I7 | The unit tests run on every change and every release | `node-ci.yml` `npm test`; release `verify` calls it | workflows read 2026-10-09 | HOLDS (F6) |
| I8 | A slower owned-blob load never overwrites a newer one | request counter in `useOwnedBlobs.load` | `tests/useOwnedBlobs.stale.test.ts` | HOLDS (F11) |
| I9 | The amount of every paid action is shown before the wallet opens | upload: cost line (walrus-relay); purchase: terms from the chain (walrus-relay); Extend: `useExtendQuotes` | `tests/useExtendQuotes.test.ts`; walrus-relay tests | HOLDS (F12) |
| I10 | The owned-blob listing works on real blob ids | walrus-storage-client 0.0.27 | walrus-storage-client tests and localnet suite; not pinned here (mocked) | HOLDS (F9) |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| VUE | Untrusted rendering | HOLDS (I4); chain data (blob ids, object ids) renders as text; no on-chain image URL is rendered |
| VUE | Colour & links | HOLDS — My Blobs reads defined tokens only (F13, `design-tokens-used.test.ts`); no `--warning` text; the result URL is a stand-alone link; no browser contrast test of this app's own components (C.2) |
| VUE | Build-time configuration | HOLDS — public values only; every variable in `.env.example`; defaults match the Dockerfile and README; ids that route commission come from `deployments` (VUE-M2) |
| VUE | Test hooks | N/A — none; no test mode exists (`e2e/wallet.ts` is a documented stub, not in `src/`) |
| VUE | Signing UX | HOLDS for upload and purchase (cost and tip estimates, permanence chosen, credit notice; network named in the intro; the wallet shows each transaction; double submission blocked while busy); Extend's cost is shown before the wallet opens (F12); failure text is the executor's generic message |
| VUE | Shared-wallet state | HOLDS for the gate and the owned-blob list (I3, F11); the chain-id check and account-change events are wallet-adapter 0.0.17's (own audit) |
| VUE | Browser storage | HOLDS (I6) — keys scoped by network, gate and address; values validated by walrus-storage-client |
| VUE | Lazy boundaries | HOLDS — `@mysten/walrus` loads through the flow; only the `./flow` subpath is imported statically |
| VUE | Dual app / library | HOLDS — `WalrusStorageView` has no shell chrome |
| VUE | Estimates | HOLDS — storage cost is `≈` and labelled; the tip is a ceiling, not a charge |
| SUI_CLIENT | ABI mirroring, Funds in the PTB, Value encoding, Read parsing, Events, Signature verification, Dry-run, Client-side publish | N/A / through the libraries — the app builds no `moveCall`, splits no coin and parses no chain object; walrus-storage-client, walrus-relay and access-gate-client own these (their audits) |
| SUI_CLIENT | Package-ID split, Network / chain binding | HOLDS — ids come from `deployments` (call target `publishedAt`, types `originalId`); the wallet-adapter selector selects ids, client and wallet chain together (the standalone build sets `VITE_NETWORK` once); empty or missing ids are ungated, never an invalid target |
| SUI_CLIENT | Capabilities & irreversible ops | HOLDS — no capability is held; a permanent blob is a visible choice |
| SUI_CLIENT | Execution result | HOLDS — wallet-adapter's executor throws on `FailedTransaction`; Extend and Certify await `waitForTransaction` before refreshing |
| SUI_CLIENT | Chain-access layering | HOLDS — `suiBoundary` forbids PTB and read logic outside `src/wallet.ts` |
| TS | Compiler strictness | HOLDS — `strict: true`, `vue-tsc --noEmit` in CI; `noUncheckedIndexedAccess` is not enabled (the app parses no untrusted data itself); `skipLibCheck: true` hides nothing in `src/` |
| TS | Assertions, validation, money, promises, network I/O, encoding, dynamic code | HOLDS — no `any`, `!` on untrusted data, `eval` or `fetch` in `src/`; the only casts are the build-time `import.meta.env` reads (`config.ts`, `main.ts`); the three `catch {}` blocks return a best-effort `null` on display and precheck paths, never before a dependent payment; dynamic imports have literal specifiers |
| TS | Caller-keyed lookups | HOLDS — the per-network records are keyed by the closed `WalrusNetwork` union; `accessGateDeployment` uses `Object.hasOwn` (client) |
| TS | Packaging, supply chain | HOLDS — `files` whitelist (`npm pack --dry-run` clean); `npm ci`; audit gate (F3); every test project that exists runs in CI (the Playwright suite is nightly, see C.1) |
| WALRUS | Payment bounds | HOLDS — client ceiling wired (F1); tip parsing and clamp are walrus-relay's (F1, F2 there) |
| WALRUS | Relay authentication | through walrus-storage-client and access-gate-gateway-client — audience-bound `nft-gate:access:v2` proof signed with the relay origin, gate and network; origin-only attachment is the library's; paywall e2e PASS 2026-10-09 |
| WALRUS | Relay selection | HOLDS with a stated limit — operator vs public host from `relayHosts`; selection is client-side only, and the gateway in front of the operator relay is the control (walrus-relay) |
| WALRUS | Epochs & lifetime | HOLDS — epochs clamped by the flow (integer 1..`max_epochs_ahead`); Extend clamps to `maxExtendableEpochs`; permanence is an explained default (D6) |
| WALRUS | Blob ownership | HOLDS — the connected wallet owns the Blob on the relay path |
| WALRUS | Content integrity on read | N/A — the app reads no blob bytes; it links to the result URL and to Walruscan |
| WALRUS | Confidentiality | HOLDS — all blobs are public; the notice says the relay sees the content; nothing sensitive is promised (encryption is sealed-storage-ui) |
| WALRUS | Flow resumability | through walrus-storage-client — consume digest persisted before the upload and reused; same-registration retry (0.0.26); pending certification finished from My Blobs; listing fixed (F9) |
| WALRUS | Size limits, Pagination, Lazy loading, Network configuration | client limits are UX; the edge limit is the gateway's; listing pages through all results (walrus-storage-client, bounded); wasm loads lazily; package config is SDK-bundled |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F10) — digest-pinned `node:24-slim` and static-server 0.1.8 (as deployed in 0.1.58; 0.1.57 carried 0.1.7); `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.github`, `.env*.local`; `npm ci`; no secret in any `ARG`/`ENV`; Trivy before cosign; lockfile in the image; `/THIRD_PARTY_LICENSES` served |
| IMG | Verification command | HOLDS — this repository publishes no command; the cluster check pins `docker-publish.yml@refs/tags/v` (F17, RESOLVED 2026-10-18) |
| IMG | Deployment pinning | HOLDS — digest in `config/images.yaml` and the overlay; the base manifest's tag label (`0.1.0`) is overridden by the overlay digest and is cosmetic |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `@meddleware/walrus-storage-client` | `^0.0.28` (installed 0.0.28) | uploads, listing | `npm audit` gate clean 2026-10-18 | latest; 0.0.27 fixed F9 |
| `@meddleware/walrus-storage-kit` | `^0.1.31` | selection, gate | clean | latest; 0.1.31 breaking (adopted 0.1.58) |
| `@meddleware/access-gate-client` | dev `^0.0.9` (type and deployments; installed 0.0.9) | gate reads | clean | latest |
| `@meddleware/wallet-adapter` | peer `>=0.0.12 <0.2.0`; dev `^0.0.17` | wallet | own audit | host's copy |
| `@meddleware/ui` / `design-tokens` / `eslint-config` | `^0.1.31` / `^0.1.10` / `^0.0.2` | UI | own audits | latest published |
| `@mysten/walrus` / `@mysten/walrus-wasm` / `@mysten/sui` | `~1.2.32` (1.2.34) / `~0.3.1` / `^2.33.2` (2.35.0) | uploads / reads | gate clean | one copy (`npm ls`); ADR-0001 baseline `^2.33.1` |
| `@mysten/wallet-standard` | not declared (was `^0.21.0`) | none | clean | dropped in 0.1.58 (F18); wallet-adapter brings its own copy |
| Vue / Vite / TypeScript / vitest | 3.5.43 / 8.3 / 6.0.3 / 5.0.3 (plugin-vue 6.0.9, vue-tsc 3.3.x) | build | clean | TypeScript 7 and vitest 5-major follow-ups declined (decision); Node 24 LTS |
| Sui full node; operator and public relays | public gRPC (wallet-adapter); relay hosts | listing; uploads | Mysten / operator | fail closed (no upload without a relay); operator relay down falls back to public |
| `static-server` / `node:24-slim` | 0.1.8 (deployed in 0.1.58 since 2026-10-18) / digest-pinned | runtime / build | Trivy at release (F10); Go 1.26.9 | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | `.github/audit-allowlist.json` |

Shared-dependency matrix (TS lens): `@mysten/sui` dep `^2.33.2` (baseline `^2.33.1`, within range);
`@mysten/walrus` dep `~1.2.32` and `@mysten/walrus-wasm` dep `~0.3.1` (the SDK's own tilde pins, as in the
baseline); `vue` dep `^3.5.43`; `typescript` dev `~6.0.0`; `vitest` dev `~5.0.2`; `@mysten/wallet-standard`
not declared; `@mysten/seal` and `@mysten/bcs`: not used. First-party ranges are `^0.0.x` (exact) or
`^0.1.x`; no `~0.0.x`; the peer range for wallet-adapter is `>=0.0.12 <0.2.0`, no `legacy-peer-deps`.

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` (dev, optional, macOS
only); no `allowScripts`, no `overrides`; no `prepare`/`postinstall` in `package.json`.

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions | OIDC + provenance; opt-in `NPM_PUBLISH` | library | n/a |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN` | GitHub secrets | long-lived robot accounts (inventory: `OPERATOR_TASKS.md`) | image push | rotate on suspicion (F7) |
| image signing | GitHub Actions | cosign keyless | images | n/a |

CI & release integrity: actions pinned by SHA (workflows read 2026-10-09); explicit `permissions:` per
workflow and job (`id-token`/`attestations` only on the signing job, `id-token` only on the npm publish
job); OIDC publish with a tag == version check and an idempotent registry check; npm client pinned
(`npm@11.20.0`); image release = full CI via `workflow_call` + Trivy + cosign + SPDX SBOM attestation +
provenance, no `continue-on-error` on the public path (F10; the npm job calls the same CI workflow, F16); `npm ci`
everywhere; audit gate in CI and the npm job (F3); Dependabot weekly and grouped for npm, Docker and
Actions; no test-only build mode exists, so there is nothing to scan for; no job spends real funds (the
nightly `integration.yml` runs a browser smoke suite only).

### B.VUE-1 Hosting headers

Live headers on `sui-walrus-storage.meddleware.co.uk`, read 2026-10-09: `Content-Security-Policy`
(`default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval' 'nonce-…'`, `style-src 'self' 'unsafe-inline'`,
`connect-src 'self' https:`, `img-src 'self' data: blob: https:`, `worker-src 'self' blob:`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`,
`upgrade-insecure-requests`), `Strict-Transport-Security` (1 year, includeSubDomains),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`. The CSP is static-server's
(`CONTENT_SECURITY_POLICY` from the `CSP` build argument); there is no static host and no `_headers`
file. `'unsafe-inline'` is for styles only; the build emits no inline script. The blanket `https:` is F15.
Framing is `'self'` only; the dashboard embeds the view as a component, not a frame.

### B.VUE-2 Build inputs and artifacts / IMG

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.8@sha256:e32cf42b…` runtime (as deployed in 0.1.58; the 0.1.57 image carried 0.1.7), both
digest-pinned (Dependabot Docker group); `npm ci`; `.dockerignore` excludes local installs, build output,
VCS data and every `.env*.local`; `npm run build && npm run licenses` run in the build stage; the runtime
stage copies `dist` and the lockfile only; `USER 65534:65534`; no secret in any `ARG`/`ENV` (the build
args are the public `VITE_*` values and the CSP); production sourcemaps are not emitted (Vite default);
the deployment is read-only root, `runAsNonRoot` uid 65534, no privilege escalation, all capabilities
dropped, `RuntimeDefault` seccomp, `automountServiceAccountToken: false`, readiness and liveness probes on
`/`, requests 5m/16Mi and limits 100m/48Mi; digest `sha256:0e02f431…e110` (0.1.58; 0.1.57 was `sha256:631abc3a…`) in both `config/images.yaml` and the
overlay; cosign signature verified 2026-10-09 (0.1.57) and 2026-10-18 (0.1.58; the latter against the workflow-anchored identity) (F17). Not run: a Trivy *config* scan of the Dockerfile and
manifests (F10).

### B.SC-1 ID-constant trace

| Location | Network | Value | original-id or published-at | Matches the latest on-chain version |
| --- | --- | --- | --- | --- |
| access-gate-client 0.0.8 `deployments` (resolved from npm at build; the only source of the package and PlatformConfig) | testnet | `access_gate` `0xd7ddaa94…88c9`, PlatformConfig `0x3f81489d…e7b5` | both (fresh publication 2026-10-09) | Y — access-gate-sui commit `7906954`; live bundle read 2026-10-09 |
| `VITE_ACCESS_GATE_ID_TESTNET` (operator build variable) | testnet | relay `Gate` `0x316f1bf9…faddc` | n/a (shared object) | Y — on the new package; present in the live bundle; the old gate `0xfd6c3b…` is not present |
| any `src/` literal, `.env.example` | any | none | — | Y — grep finds no 0x id in `src/` |
| mainnet, localnet | — | none recorded | — | n/a — no gate; the UI is ungated or shows the notice |

### B.SC-2 Coupling table

| Move function | Builder | Test asserting target + arguments |
| --- | --- | --- |
| gate purchase and consume | `useAccessGate` (`buildPurchase`, `buildConsume`) in walrus-relay over access-gate-client | their tests; the config here is pinned to the deployment (`config.test.ts`) |
| Walrus register / certify / extend | walrus-storage-client over `@mysten/walrus` | walrus-storage-client tests and localnet suite; the app only calls `extendBlobLifetimeTransaction` and `certifyBlobTransaction` |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B (39/39, 2026-10-18)

Vitest 5.0.3, 6 files: `blob-groups.test.ts`, `config.test.ts` (tip ceiling, relay hosts, gate config
fixed to the deployment and accepted or refused by `useAccessGate`), `useOwnedBlobs.test.ts` (epoch source,
network keying), `useOwnedBlobs.stale.test.ts` (F11), `useExtendQuotes.test.ts` (F12),
`design-tokens-used.test.ts` (F13). The flows themselves are
tested in walrus-storage-client and walrus-relay. The listing is mocked here, so a parser regression such as F9
passes this suite; the Vue components themselves (`MyBlobs`, `WalrusStorageView`) have no mounted tests (no test-utils harness here); their logic is in tested composables. The
Playwright smoke suite (`e2e/app.smoke.spec.ts`) runs nightly in `integration.yml`, not on the PR path; the
localnet upload spec is `fixme` pending a signing wallet (`e2e/wallet.ts` is a stub). The unit suite runs
in `node-ci.yml` and so in the image release (F6). Gating variables: none.

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Config, grouping, composables | yes | — | `npm test` |
| Real upload, extend, gated relay | no | testnet | token-issuance-ui / dashboard `e2e:walrus` (shared flow); paywall e2e PASS 2026-10-09; walrus-storage-client localnet suite PASS after 0.0.27 |
| Browser contrast (axe) of this app's own components | no | `@meddleware/ui` gallery covers shared components only; My Blobs needs a connected wallet (the e2e wallet is a stub) | F13 (tokens pinned by unit test) |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] builds; type-check, three linters, unit tests green (2026-10-09); no secrets

### pre-testnet

- [x] deployed with digest pinning; CSP and HSTS verified live 2026-10-09 and again on 0.1.58 on 2026-10-18 (`curl -I`: CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`); gated relay live (paywall e2e PASS 2026-10-09)
- [x] `SECURITY.md` present
- [x] image: digest-pinned bases, non-root, restricted pod, probes and limits, deployed by digest, signed with SBOM and provenance, scanned before signing (F10)
- [x] consumed IDs are the latest on-chain version — live bundle carries `0xd7ddaa94…`, `0x3f81489d…` and gate `0x316f1bf9…` only (B.SC-1)
- [x] every test project that exists runs in CI (F6)
- [x] state invalidated on switch in every view — owned-blob list (F11, 0.1.58, `useOwnedBlobs.stale.test.ts`; commit `54df3d6`)
- [x] signing UX shows the amount of every paid action — Extend (F12, 0.1.58, `useExtendQuotes.test.ts`; commit `54df3d6`)
- [x] colour: text meets AA in both themes — My Blobs tokens (F13, 0.1.58, `design-tokens-used.test.ts`; commit `54df3d6`)

### pre-mainnet

- [ ] mainnet gate arguments in the Dockerfile (`VITE_ACCESS_GATE_SOULBOUND_MAINNET`; the price variable is gone, the price is read from the chain) — mainnet-blocked (no `access_gate` mainnet deployment)
- [ ] mainnet relay and gate configured; gated e2e on mainnet — mainnet-blocked
- [x] CSP and HSTS on the one hosting path (B.VUE-1)
- [ ] registry credential inventory and rotation (F7) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party libraries at
  their latest versions; signed images with SBOM and provenance, Trivy before signing, SHA-pinned
  actions, grouped Dependabot; expiring audit allowlist; publish authority in B.2.
- **On-chain-truth boundary** — costs are estimates; payments are user-signed.
- **Wire-format coupling** — none here: proofs and the consume record are walrus-storage-client's and
  access-gate-gateway-client's.
- **Deployment readiness** — Section D.
- **Chain-access layering** — all chain logic in walrus-storage-client, walrus-relay and access-gate-client; the
  `suiBoundary` lint enforces it. IDs consumed: B.SC-1.

## Normative requirements (MUST / MUST NOT)

- **VUE-M1–VUE-M9** — hold (VUE-M3 N/A: no test hooks); VUE-M4 holds for upload and purchase, with one
  gap for Extend's cost closed in 0.1.58 (F12); VUE-M6 holds for the gate and, since 0.1.58, the
  owned-blob list (F11); the *Colour & links* defect (F13) is closed.
- **SC-M1–SC-M10** — hold through the libraries (SC-M6 to SC-M9 are N/A: this app verifies no signature,
  binds no event, signs no dry-run PTB and extracts no created object). SC-M5: network, ids, client and
  wallet chain follow one selector.
- **TS-M1–TS-M9** — hold. TS-M9: `@mysten/sui` is a single copy; wallet-adapter is a peer.
- **WAL-M1–WAL-M9** — hold through the libraries (WAL-M6 N/A: no blob bytes are read here).
- **IMG-M1–IMG-M8** — hold; IMG-M8 holds: no command is published here and the cluster check pins the publish workflow and tag refs (F17, RESOLVED 2026-10-18).

## Implementation suggestions (SHOULD / MAY)

- SHOULD add the mainnet gate build arguments now, so the mainnet image is a configuration change.
- SHOULD add a test that runs a realistic 78-digit blob id through the real listing parser, or a
  contract test against walrus-storage-client's exported fixture, so a parser regression like F9 fails here.
- SHOULD add a mounted-component test harness (test-utils, jsdom) so `MyBlobs` and `WalrusStorageView` are tested
  as rendered, and a Playwright + axe contrast gate over a wallet-connected My Blobs once the e2e wallet exists.
- MAY run a Trivy configuration scan of the Dockerfile and manifests in CI.

## Open questions (`OQ#`)

None.

## Risks

- **Relay liveness** — when the operator relay is down, uploads fall back to the public relay.
- **Registry tokens** — long-lived robot tokens for image pushes (F7).
- **Silent library regressions** — a parser change in a dependency can empty a view without any test
  here failing (F9); the daily walrus-storage-client localnet suite is the control.

## Re-verification log

- 2026-09-18 — first-pass baseline (F1–F7).
- 2026-09-30 — B5: upload flow from walrus-storage-client; relay gate via `relayGateConfig`; D6 permanence.
- 2026-10-02 — re-verified under AUDIT_TEMPLATE.md + VUE + TS + SUI_CLIENT + WALRUS + IMG (Phase 7):
  front matter, lens sections and four-part closing added. F8 RESOLVED in 0.1.50 (walrus-storage-client
  0.0.24, walrus-relay 0.1.25). Counts: 17/17.
- 2026-10-03 — consumer wave: 0.1.51 (walrus-storage-client 0.0.25, walrus-relay 0.1.26, access-gate-client 0.0.4, ui 0.1.30, design-tokens 0.1.8); deployed; live sweep clean.
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified at 0.1.57 (`ba75d9e`) against the code, the workflows, the manifests and the live site/bundle. Template dates now VUE/TS/IMG 2026-10-08 (the lens changes since the first citation are covered by the sections added below); front matter gains the Walrus, VUE, TS and IMG fields. F1–F8 re-checked (F1, F2, F3, F6, F8 RESOLVED with evidence; F4 corrected: `accessGate()` catches the throw and falls back to an ungated UI, the gateway is the control; F7 ACCEPTED-RISK, inventory a maintainer item). New: F9 RESOLVED (owned-blob regression fixed by walrus-storage-client 0.0.27 / walrus-storage-ui 0.1.56), F10 RESOLVED (image release gate, Trivy, notices, lockfile, `USER 65534`, static-server 0.1.7), F11–F14 and F18 DEFERRED (owned-blob race, Extend cost, undefined colour tokens, `.env.local`, documentation drift), F15–F17 ACCEPTED-RISK. The known `node-ci.yml` gap (no `npm test`) was checked and is absent here. Relay gate updated to `0x316f1bf9…` (live bundle confirms; `0xfd6c3b…` gone). Counts: 17/17, audit gate 1 allowlisted / 0 open. Section D gates ticked with evidence; unticked: three next-patch items (F11–F13) and the mainnet/maintainer items.
- 2026-10-18 — fix wave at 0.1.58 (commit `54df3d6`): F11, F12, F13, F14, F16 and F18 RESOLVED with tests (`useOwnedBlobs.stale`, `useExtendQuotes`, `design-tokens-used`, gate pairing in `config.test.ts`; 39 tests in 6 files); Section D gates F11/F12/F13 ticked. Adopted walrus-relay 0.1.31 (pinned gate, terms from the chain, `sessionKey`), walrus-storage-client 0.0.28, access-gate-client 0.0.9, design-tokens 0.1.10; removed `VITE_ACCESS_GATE_PRICE_MIST_TESTNET` (code, `.env.example`, Dockerfile, workflow, README); `@mysten/wallet-standard` dropped; Dockerfile base static-server 0.1.8 (`sha256:e32cf42b…4000`, digest checked against the quay.io tag API). F15 and F17 stay ACCEPTED-RISK (no single fix: hosts cannot be enumerated in a white-label build; the identity override lives in the workspace script). F7 and the mainnet/external-review gates are untouched. Local checks: type-check, lint:css/js/html, 39 unit tests, build, `check:licenses`, audit gate (1 allowlisted / 0 open) and the Playwright smoke suite (3/3) all pass. The npm-publish workflow change and the image build run on the next tag.
- 2026-10-18 — released and deployed (`v0.1.58` = `97c3247`, `0.1.58@sha256:0e02f43112ec67dc10f7e892af2f95a9be71998325df3946bca030a1ebb2e110`), verified live. Cosign keyless signature verified against the workflow-anchored identity (`verify-digests.sh` 16/16); published to npm and as an image; rollout (`apply.sh walrus`) succeeded; the page loads in headless Chromium with no console errors or CSP violations, the live headers are present (re-read with `curl -I`) and the live bundle carries only the current ids (`0xd7ddaa94…`, `0x3f81489d…`, gate `0x316f1bf9…`). Mainnet-blocked, credential and external-review gates unchanged.
- 2026-10-18 — F17 (cosign identity) RESOLVED: the default identity in `bootstrap/images/verify-digests.sh` is now workflow-anchored (`^https://github\.com/meddleware-org/${name}/\.github/workflows/docker-publish\.yml@refs/tags/v`); all 16 deployed and contingency images verified valid against it (`STRICT=0 bash bootstrap/images/verify-digests.sh`). This repository publishes no verify command, so nothing else remained.
- 2026-10-19 — dependency-bot status checked (read-only): `.github/dependabot.yml` carries the `ignore` rules and the repository has no open Dependabot pull requests (`gh pr list`, 2026-10-19). Versions, findings and gates were not re-examined in this pass.
  - `Dockerfile` on GitHub `main` now pins the `static-server` base at `0.1.9@sha256:af6cc284…edc72` (merged Dependabot docker PR); this repo was not re-released or redeployed for it, so the deployed image is still built on the 0.1.8 base (the stock default CSP added in 0.1.9 is replaced by this repo's own `CONTENT_SECURITY_POLICY`).
  - Dependabot policy encoded in .github/dependabot.yml (majors declined); open PRs merged 2026-10-19
  - `docker-publish.yml`: the private rebuild jobs are replaced by one `mirror-private` job that copies the published quay.io image (and its cosign artifacts) to the self-hosted registry by digest and fails unless the digest and the signature match (build once, promote by digest; committed locally, not yet released; the `PRIVATE_REGISTRY_*` credentials are still unset).
- 2026-10-19 — tip ceiling re-derived from the workspace cost model (`docs/economics/COST_MODEL.md`, D57):
  `DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST` 50_000_000 → 5_000_000 (README, `.env.example`, CLAUDE.md and the front-matter
  line updated; a new config test pins the value). Version 0.1.59, commit pending. The CI variable
  `VITE_UPLOAD_RELAY_MAX_TIP_MIST`, if set, overrides the default and is changed by the maintainer. Measured with
  Node 26.12.0: type-check, lint (css, js, html), 40/40 unit tests, build, licence check and the audit gate pass. No
  disposition changes.
- 2026-10-22 (audit close-out) — release 0.1.61 (`v0.1.61` = `43c446b`; `Publish (Docker)` succeeded). Dependencies: `@meddleware/walrus-storage-client` `^0.0.30` (the gated flow passes the gateway's real challenge expiry; access-gate-gateway-client 0.0.18 rules; walrus-storage-client F26), `@meddleware/walrus-storage-kit` `^0.1.33`, `@meddleware/access-gate-client` `^0.0.10` (a stale indexer head page, `polledAt` older than 60 s, now falls back to the node; sui-indexer F19). Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes; static-server F13). No disposition change. Not re-run in this pass: the unit tests, the build and the audit gate (the tag's own CI and publish runs succeeded).
- 2026-10-24 — repository renamed from `walrus-ui` to `walrus-storage-ui` (workspace naming convention, `docs/architecture/ADR-0003-naming.md`): package, image, host and path names updated throughout. No finding, disposition or evidence changed.
