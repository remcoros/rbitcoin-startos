<p align="center">
  <img src="icon.png" alt="rbitcoin Logo" width="21%" />
</p>

# rbitcoin on StartOS

> Everything not listed in this document should behave the same as upstream
> rbitcoin. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section
> of `instructions.md` for links.

[rbitcoin](https://github.com/rbitcoin-org/rbitcoin) is an experimental Bitcoin full
node with optional client APIs, indexes, and mining templates. This package uses its official
binaries in an Alpine image without patching or rebuilding the application.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

## Image and Container Runtime

The Dockerfile uses a pinned Alpine base with GNU `find` and e2fsprogs `chattr`
installed through `apk add --no-cache`. It copies only the node and CLI binaries
from the official `ghcr.io/rbitcoin-org/rbitcoin` image, also pinned by tag and
multi-platform digest. The upstream binaries, entrypoint, working directory, and
non-root UID/GID `10001:10001` are preserved on x86_64 and aarch64.

The single subcontainer is named `rbitcoin`; its daemon is `node`. Before every node
start, the `nocow` oneshot runs as root and applies `chattr +C` to directories on the
main data volume. It leaves regular files, symlinks, and special files alone. The node
waits for this step to succeed, then runs as the upstream image user. The package
prepares writable volume roots and owner-only RPC credential files before launch.
The generated runtime configuration is copied to `/etc/rbitcoin.conf` with mode
`0600` and ownership assigned to the image user. Shutdown sends SIGTERM and permits
five minutes for archive flushing.

## Volume and Data Layout

Two persistent volumes separate node data from private package configuration.

| Volume | Container mount | Contents |
| --- | --- | --- |
| `main` | `/data` | `datadir/`: archive, indexes, mempool, peer records, RPC secrets, optional API log and AS map |
| `startos` | Unmounted | `rbitcoin.conf` and `store.json`, protected by a mode `0700` volume root |

The node always uses mainnet and `/data/datadir`, with all node data in the main
volume.

Directories on the main data volume receive the Btrfs no-copy-on-write attribute so
new files inherit it. This does not rewrite existing CoW extents or convert an
already populated data store.

## File Models

The upstream configuration is modeled directly, while StartOS-only state has a
separate JSON model. Init merges missing defaults on install, update, and restore.

| Model | Purpose | Writers |
| --- | --- | --- |
| `startos/rbitcoin.conf` | Upstream snake_case settings, including repeatable peer and permission keys | Configuration actions |
| `startos/store.json` | RPC credentials and I/O selection | Credential and performance actions |

The custom conf parser preserves repeated list keys without INI quoting. The writer
omits unset optional settings and rejects embedded line breaks. Loose schemas retain
unknown fields; known invalid fields fall back to their declared defaults, including
unrecognized Boolean tokens and nondecimal numeric text. Unknown and retired fields
remain in private package configuration but are excluded from the generated runtime
configuration. Mainnet is enforced in both the runtime config and command line. Managed
listener choices are restricted to the package's fixed ports. Hand edits to modeled
settings are supported only within those types and constraints. Actions validate
cross-field conflicts and peer permission syntax before writing. The mempool budget
must be at least one million weight units. The configuration and state are reactive;
saving a change restarts a running node.

## Dependencies

None. The full node, consensus validation, indexes, and client APIs run in the same
application. External SOCKS5 proxies, I2P SAM routers, or CJDNS routing are optional
operator-provided network resources.

## Network Access and Interfaces

The package exports interfaces only while their corresponding listeners are enabled.
It always exports the health interface. Bind addresses and internal ports are fixed;
preferred external P2P/RPC ports are 8333 and 8332.

| Interface ID | Type | Internal port | Transport and availability |
| --- | --- | --- | --- |
| `peer` | p2p | 8333 | Raw Bitcoin P2P; enabled when listening is on and inbound slots are nonzero |
| `rpc` | api | 8332 | HTTP JSON-RPC with Basic/Bearer authentication and a StartOS TLS binding; initially disabled |
| `electrum` | api | 50001 | Raw TCP plus StartOS TLS, preferring external 50002 for TLS; initially disabled |
| `esplora` | api | 3000 | Unauthenticated HTTP REST plus StartOS TLS; initially disabled |
| `health` | api | 9332 | Unauthenticated `/healthz`, `/readyz`, `/progress`, and optional `/metrics`; HTTP plus StartOS TLS |
| `sv2` | api | 8442 | Stratum v2 Noise protocol; initially disabled |

Peer permission grants use IP addresses or CIDR ranges. Supported names are
`bloomfilter`/`bloom`, `noban`, `forcerelay`, `mempool`, `download`, `all`, `relay`,
and `addr`, with optional `in`/`out` directions. Bare IP/CIDR grants retain upstream's
implicit permissions. Global trust switches and whole-listener grants are not exposed.

Core-style REST is an optional unauthenticated path on the RPC listener. Electrum and
Esplora do not gain authentication from their StartOS interface type. Reachability,
domains, and onion addresses are selected by the operator per interface.

## Installation and First-Run Flow

Init seeds upstream defaults and private package state. This package supports
mainnet only; optional APIs, indexes, pruning, and metrics start disabled.

Before the first start, configure pruning and indexes. Enabling
TCP RPC without credentials raises a critical credential task. Its action generates
and stores a random password and separate Bearer token. On the next node start,
the package writes the exact upstream token and `username:password` cookie formats
with owner-only permissions. The fixed Basic username is `rbitcoin`.

## Actions

Actions are grouped into **Chain and storage**, **Peers and privacy**, **Clients and
mining**, and **Policy and performance**. Logging is listed separately. StartOS
determines their display order; numeric prefixes are not used. Configuration changes
restart a running node and are safe to repeat with the same values, except that enabling pruning can
permanently remove historical witness data and enabling indexes can require
substantial work.

| Action ID | Purpose and cost |
| --- | --- |
| `indexes` | Address history, compact block filters, then Silent Payment tweaks and output threshold. Each index uses additional storage and may backfill after synchronization. |
| `storage` | Witness pruning, pruned-window RAM cache, and HDD scheduling. Disabling pruning is rejected after a prune marker exists; pruning and Silent Payment tweaks are mutually exclusive. |
| `peers` | Listening, connection counts, pinned peers, seeds, and address advertisement. |
| `privacy` | SOCKS proxies, peer network selection, external I2P SAM, and CJDNS reachability. Proxies default to Disabled; peer networks default to All available. Endpoints must already be reachable from the service. |
| `mempool` | Weight budget, expiry, persistence, blocks-only mode, and minimum relay fee. Defaults include 336 hours and 0.00000100 BTC/kvB. |
| `permissions` | IP/CIDR permission grants for specific peers. An empty list means no grants. |
| `apis` | Optional RPC, Electrum, Esplora, Core REST, metrics, concurrency, subscription and address-history limits. Enabling an API adds its interface; disabling it removes it. |
| `mining` | Minimum template fee, optional Esplora templates, and Stratum v2. The template fee defaults to 0.00000001 BTC/kvB. Enabling Stratum v2 reveals its required authority key; disabling it retains that key. |
| `performance` | I/O backend. Automatic I/O leaves `RBITCOIN_IO` unset. Worker counts, head sizing, queue budgets, and stall handling use upstream defaults. |
| `logging` | Log level and optional API call log. API logging records wallet requests and has no package-provided rotation. |
| `set-rpc-credentials` | Generates and returns a password and separate Bearer token. Repeated use replaces both and restarts a running node; all RPC clients must be updated. The action warns before rotation. |

All visible wrapper strings are translated into Spanish, German, Polish, and French.
Technical protocol names and selectable enum tokens retain their values.

## Tasks

A critical task points to `set-rpc-credentials` whenever TCP RPC is enabled and either
stored credential is missing. Generating credentials or disabling TCP RPC clears the
condition. Optional client APIs do not force credential setup when they are disabled.

## Health Checks

Process liveness and client readiness are checked independently. Both probes
use the health listener, which upstream starts before opening the store.

- `node`: requires an HTTP success from `/healthz`. Failure means the node is not
  responding or reports unhealthy; inspect the service logs.
- `synchronization`: checks `/readyz` and is displayed as **Readiness**. HTTP success
  reports client readiness without a redundant success message. HTTP 503 reports
  loading with a translated reason for opening, starting, syncing, indexing, stopping,
  a stale tip, block/index lag, or busy probes. Unknown reasons use **Not ready**.
  Other HTTP failures or connection errors report failure.

The checks inspect HTTP status codes; a generic any-response probe is insufficient.

## Backups and Restore

Backups include configuration, credentials, and the complete node data. The main
volume uses incremental sync; StartOS stops the service during backup and restores
both volumes before init merges defaults. No archive is intentionally omitted.

Expect a chain-sized backup and sufficient space on the backup target. The runtime
conf copy is recreated on startup from the persistent model.

## Limitations and Differences

The wrapper preserves upstream defaults except for fixed StartOS data paths, bind
addresses, mainnet-only operation, an always-on health listener, a no-copy-on-write
data volume, and the shutdown allowance. Changing an optional setting is an explicit
operator choice.

- Optional APIs and indexes are initially disabled. There is no graphical wallet or
  block explorer frontend, no wallet/private-key RPC, and no complete Bitcoin Core RPC
  compatibility claim.
- Native Tor control/publication and inbound I2P forwarding are not offered: upstream
  forwards to the router's loopback, which does not reach this separate container.
  Use StartOS interface publication and optional outbound proxies instead.
- Arbitrary paths/listener ports, shell notification commands, host suspend inhibition,
  timed process exit, smoke/test flags, mock time, activation overrides, and destructive
  sticky rebuild environment flags are not exposed as actions. They are deployment
  plumbing or development tools rather than normal node configuration. Native RPC
  cookie permission widening is unnecessary because the package owns the credentials.
- Network selection, consensus overrides, unstable environment tuning, protocol
  timing, broad peer trust, and custom AS-map paths are not exposed. These use the
  pinned upstream defaults. API disk-read concurrency uses 0 for automatic sizing.
- A successful package build does not establish runtime, IBD, client, restart, or backup
  compatibility on a StartOS server.

## Quick Reference for AI Consumers

This summary identifies the package's administration surface. The source models and
manifest remain the authority for defaults and image selection.

```yaml
package_id: rbitcoin
image: rbitcoin
upstream_image: ghcr.io/rbitcoin-org/rbitcoin
architectures: [x86_64, aarch64]
subcontainers: [rbitcoin]
volumes:
  main: /data
  startos: unmounted
file_models:
  - startos/rbitcoin.conf
  - startos/store.json
startos_managed_env_vars:
  - RBITCOIN_IO
dependencies: none
interfaces:
  peer: { type: p2p, port: 8333 }
  rpc: { type: api, port: 8332 }
  electrum: { type: api, port: 50001 }
  esplora: { type: api, port: 3000 }
  health: { type: api, port: 9332 }
  sv2: { type: api, port: 8442 }
actions:
  - set-rpc-credentials
  - indexes
  - storage
  - peers
  - privacy
  - mempool
  - permissions
  - apis
  - mining
  - performance
  - logging
tasks:
  - { action: set-rpc-credentials, severity: critical }
health_checks: [node, synchronization]
```
