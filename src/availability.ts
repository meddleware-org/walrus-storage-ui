// What a person is told when Walrus storage cannot be used on a network. Nothing here names a build variable or a missing setting: a
// person can do nothing about those, so they read what they can do (wait, or use another network); the technical cause goes to the
// console (`config.ts` logs it) and to the developer docs.
//
// Which networks to suggest is not decided here: `config.ts` passes the networks that currently pass its checks, which follow the
// deployment records and the configured relay hosts, never prose.

/** " Switch to testnet." (or "testnet or mainnet"), or nothing where no other network can be used. */
function switchHint(others: readonly string[]): string {
  return others.length ? ` Switch to ${others.join(' or ')}.` : ''
}

/** The network is not one Walrus storage is offered on (no recorded deployment, or no Walrus there): not a fault. */
export function notAvailableOn(net: string, others: readonly string[]): string {
  return `Walrus storage is not available on ${net}.${switchHint(others)}`
}

/** The network is offered but this site cannot serve it right now (a setting the person cannot change). */
export function notAvailableNow(others: readonly string[]): string {
  return `Walrus storage is not available here right now. Try again later${others.length ? ` or switch to ${others.join(' or ')}` : ''}.`
}
