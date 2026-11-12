<p align="center">
  <img src="icon.png" alt="rbitcoin Logo" width="21%" />
</p>

# rbitcoin on StartOS

> Everything not listed in this document should behave the same as upstream
> rbitcoin. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section
> of `instructions.md` for links.

[rbitcoin](https://github.com/rbitcoin-org/rbitcoin) is an experimental Bitcoin full
node with optional client APIs, indexes, and mining templates. The package uses the
published upstream release image, pinned by its multi-platform SHA-256 digest.

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
installed through `apk add --no-cache`. It copies the node and CLI from the published
`ghcr.io/rbitcoin-org/rbitcoin:0.9.1` image, pinned to multi-platform digest
`sha256:07ba41581f0c8f4c98a4b35c1106c61fe1b7c6c2c36cbd8321e7919efaae5207`.
The entrypoint, working directory, and
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
| `startos/store.json` | RPC credentials, I/O selection, and managed networking preferences | Credential, storage, and Peer Settings actions |

The custom conf parser preserves repeated list keys without INI quoting. The writer
omits unset optional settings and rejects embedded line breaks. Loose schemas retain
unknown fields; most known invalid fields fall back to their declared defaults, including
unrecognized Boolean tokens and nondecimal numeric text. Invalid automatic-network selections are rejected rather than expanded to unrestricted networking. Unknown and retired fields
remain in private package configuration but are excluded from the generated runtime
configuration. Mainnet is enforced in both the runtime config and command line. Managed
listener choices are restricted to the package's fixed ports. Hand edits to modeled
settings are supported only within those types and constraints. Actions validate
cross-field conflicts and peer permission syntax before writing. The mempool budget
must be at least one million weight units. The configuration and state are reactive;
saving a change restarts a running node.

## Dependencies

The full node, consensus validation, indexes, and client APIs run in the same
application. Tor and I2P are optional, dynamically activated networking dependencies:

- `tor` supplies its bridge-only SOCKS endpoint. It becomes a running requirement
  for Through Tor routing, explicit onion-only/network selections or manual onion
  peers, and a published P2P onion. Standard mode can still use direct IP peers
  without Tor. The stable SDK bridge fallback keeps proxy routing configured while
  Tor is absent; a failed Tor connection never becomes a direct fallback.
- `i2pd` supplies its bridge-only SAM endpoint when I2P is enabled in Standard mode.
  The package waits for the router's `i2pd` health check before configuring SAM.
  The saved I2P preference is retained while Through Tor is selected.

A dependency declaration reports requirements; it is not a startup gate. When I2P
is unavailable, the generated runtime config temporarily excludes I2P from the
selected networks. It never expands a restriction: an I2P-only selection (or only
manual I2P peers) waits before launching the node. Otherwise permitted connections
can continue. A change to the effective SAM address/readiness restarts the node
once to apply or remove I2P. Status changes that leave the effective address
unchanged do not restart it. Upstream SAM setup can still stall if a ready router
stops answering its handshake; the package does not patch that behavior.

## Network Access and Interfaces

The package exports interfaces only while their corresponding listeners are enabled.
It always exports the health interface. Bind addresses and internal ports are fixed;
preferred external P2P/RPC ports are 8333 and 8332. P2P listens on `[::]:8333`
for IPv4 and IPv6 clients when incoming connections are enabled.

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

Peer advertisement is derived from public IP addresses on the `peer` host's P2P
binding, independently of the exported interface's transient presence. Only
plaintext addresses with external port 8333 can be announced; mismatched ports
raise a task. Private IPs and domains are excluded. Removing publication removes
the runtime advertisement. Onion publication is managed by StartOS, but this
upstream pin does not self-announce externally managed onions to Bitcoin peers.
They can still be shared as incoming P2P addresses.

Standard routing uses direct IP connections and the Tor service for onion peers.
Through Tor sets the general SOCKS proxy as well, preserving SOCKS credential
randomization and routing hostname resolution through the proxy. It disables I2P;
CJDNS is never enabled. Custom proxies, SAM endpoints, seeds, and peer-based
address discovery are not part of the runtime configuration. Manual local peers
are rejected in Through Tor mode. Incoming interfaces remain separately managed.
This controls the supported package configuration, not every administrative RPC:
upstream manual RPC dial paths can bypass network selection, and its CJDNS dialer
can connect directly. No OS-level traffic confinement is claimed.


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
mining**, and **Policy and logging**. Recovery actions are in the **Recovery** group after the other package action groups. Within Policy and logging, Mempool appears before Logging.
StartOS sorts actions within each group by action ID. `peers-advanced` places Advanced Peer Settings immediately after Peer Settings; numeric prefixes are not used. Configuration changes
restart a running node and are safe to repeat with the same values, except that enabling pruning can
permanently remove historical witness data and enabling indexes can require
substantial work.

| Action ID | Purpose and cost |
| --- | --- |
| `indexes` | Address history, compact block filters, then Silent Payment tweaks with a conditional output threshold. With pruning, upstream refuses to enable tweaks if the index does not cover the data already pruned. Disabling tweaks while pruning may prevent re-enabling them later. Each index uses additional storage and may backfill after synchronization. |
| `storage` | Witness pruning, a conditional cache-size threshold in MiB (encoded input-record bytes, excluding memory overhead), HDD scheduling, and the disk I/O backend. Automatic I/O leaves `RBITCOIN_IO` unset. Pruning and cache fields include help descriptions. Pruning warns before selection; its Disabled option is unavailable after a prune marker exists. With tweaks enabled, upstream refuses pruning if the index does not cover the blocks that would be removed. |
| `peers` | Peer Settings: Standard/Through Tor routing, saved I2P preference, and incoming P2P. |
| `peers-advanced` | Automatic peer networks, manual sync/follow peers, and separate incoming/outgoing connection limits. Empty network and manual-peer selections use automatic discovery over available networks. A manual list disables normal automatic discovery, but saved peers may still be used by fast IBD. |
| `mempool` | Weight budget, expiry, persistence, blocks-only mode, and minimum relay fee. The UI uses MWU, hours, and sat/vB; the relay fee defaults to 0.1 sat/vB. Configuration retains upstream units. |
| `permissions` | IP/CIDR permission grants for specific peers. An empty list means no grants. |
| `apis` | Optional RPC, Electrum, Esplora, and metrics. Core REST appears only under enabled RPC. Enabling an API adds its interface; disabling it removes it. |
| `apis-limits` | Advanced API concurrency, subscription and history limits, shown only for enabled client APIs. RPC uses a positive count; disk reads offer Automatic or Custom. |
| `mining` | Minimum template fee, optional Esplora templates, and Stratum v2. The template fee defaults to 0.001 sat/vB. Fee entry converts exactly to upstream BTC/kvB. Enabling Stratum v2 reveals its required authority key; disabling it retains that key. |
| `node-logging` | Log level and optional API call log. API logging records wallet requests and has no package-provided rotation. |
| `view-rpc-credentials` | Returns saved credentials without changing them; disabled until both exist. |
| `set-rpc-credentials` | Displays Generate or Replace according to stored credentials. Generates and returns a password and separate Bearer token. Repeated use replaces both and restarts a running node; all RPC clients must be updated. The action warns before rotation. |

All visible wrapper strings are translated into Spanish, German, Polish, and French.
Technical protocol names and selectable enum tokens retain their values.

## Tasks

A critical task points to `set-rpc-credentials` whenever TCP RPC is enabled and either
stored credential is missing. Generating credentials or disabling TCP RPC clears the
condition. Optional client APIs do not force credential setup when they are disabled.
An important task points to Peer Settings when a published P2P IP uses an external
port other than 8333 or TLS, so it cannot be advertised correctly. The task clears
when publication is compatible or incoming P2P is disabled.

## Recovery

**Resync from scratch** schedules a reset and stops the service. Settings and RPC
credentials remain; choose settings before starting again. At the next start,
the package deletes the chain, indexes, peers, mempool and API log before
launching the node. Disk space is reclaimed then. The service logs report when
removal starts, repeat while it is in progress, and report when it completes. If
the stop request fails,
the action warns that the reset was scheduled and may still run on the next
start; check service status and logs before starting. If deletion fails or is
interrupted, the request remains and the next start retries it. Restore clears
the pending request, so restoring a backup does not replay the reset. If a
restored archive is pruned but the pending settings required unpruned data,
restore re-enables pruning, preserves the Silent Payment setting, then prompts the user
to review storage settings.

**Rebuild address history** and **Rebuild transaction lookup** queue an offline
index removal and restart a running service. A stopped service processes the
request on its next start. The request is kept until removal succeeds, then the
node rebuilds the index from the retained archive. Address history must be
enabled for its rebuild. Rebuilds can take hours and extra disk space. An
interrupted rebuild resumes using rbitcoin's normal recovery behavior.

## Health Checks

Process liveness and client readiness are checked independently. Both probes
use the health listener, which upstream starts before opening the store.

- `node`: requires an HTTP success from `/healthz`. Failure means the node is not
  responding or reports unhealthy; inspect the service logs.
- `peers`: stays visible during initial sync and normal operation. During IBD it
  reads the current node's INFO progress log: a positive count reports outgoing
  sync peers, zero reports that it is connecting, and a missing or 30-second-old
  sample reports unavailable telemetry while waiting. The latest count is the IBD coordinator's
  sampled alive-slot count; a stuck coordinator can leave that count stale even
  while the status thread keeps logging. Observations reset on every node process
  start, and captured stderr is forwarded unchanged. With log level warn, error,
  or off, this reporting check is disabled during IBD with an explanation; P2P
  networking remains enabled. After IBD it uses the private RPC socket for actual
  incoming/outgoing counts. During the indexing transition and while the node
  reports initial block download, zero outgoing peers remains a waiting state.
  After startup and IBD, zero reports a connection failure. Like Bitcoin, it has a five-minute startup grace:
  positive counts pass immediately, while failures show Starting during grace.
  It polls every 30 seconds normally and every five seconds when starting or
  failing. Missing required Tor and unavailable optional I2P receive explanations.
- `peer-routing`: an internal, hidden startup gate for I2P-only configurations
  without a usable router. The visible Peers check explains the wait.
- `synchronization`: checks `/readyz` and is displayed as **Readiness**. HTTP success
  reports client readiness without a redundant success message. HTTP 503 reports
  loading with a translated reason for opening, starting, syncing, indexing, stopping,
  a stale tip, block/index lag, or busy probes. Unknown reasons use **Not ready**.
  Busy, stale-tip, or unknown readiness reasons persisting for five minutes report failure with a peer/log recovery hint. A changed reason resets that grace period. Other HTTP failures or connection errors report failure.

Enabled JSON-RPC, Core REST, Electrum, Esplora, metrics, and Stratum v2 each
have a separate check; disabled interfaces have no check. These checks run first
after 30 seconds, then every 30 seconds while starting, waiting, or failing and
every 60 seconds while healthy. The first five use
API requests. Stratum checks only that its TCP listener accepts connections;
it does not verify a Noise handshake or template delivery. The readiness check
shows upstream rebuild stages and percentages when available. A responsive API
can be available before the node is fully synchronized. An unavailable API reports
loading with a waiting clock during initial sync or while the node is otherwise
not ready. Readiness keeps its spinner while syncing or rebuilding. If the node
is ready, the check reports a failure and points to the logs. Health messages omit
a trailing full stop, while intentional progress ellipses are preserved.

During initial sync and catch-up, Readiness uses `getblockchaininfo` over the
private `/data/datadir/rpc.sock` Unix socket to show a percentage and current/known
block heights. This socket stays enabled when network JSON-RPC is disabled and
does not need client credentials. The percentage is blocks divided by known
headers, not elapsed work or time; it can change as more headers arrive. If the
local RPC is not available yet, or it has not reported a header target ahead of
the stored blocks, the check falls back to **Syncing...**.

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
  Use StartOS interface publication and managed outgoing connections instead.
  Externally published onions are not self-announced by this upstream pin; external
  P2P ports differing from 8333 cannot be represented in upstream advertisement.
  Manual peers support local IBD sources but are not persistent additive peers
  alongside normal discovery. The package does not change upstream validation.
- Arbitrary paths/listener ports, shell notification commands, host suspend inhibition,
  timed process exit, smoke/test flags, mock time, activation overrides, and destructive
  sticky rebuild environment flags are not exposed as actions. They are deployment
  plumbing or development tools rather than normal node configuration. Native RPC
  cookie permission widening is unnecessary because the package owns the credentials.
- Bitcoin network selection (mainnet is fixed), consensus overrides, unstable environment tuning, protocol
  timing, broad peer trust, and custom AS-map paths are not exposed. These use the
  pinned upstream defaults. API disk-read concurrency offers Automatic (stored as 0) or a positive custom count. Automatic uses one read on HDD, otherwise CPU count minus one, with a minimum of one. The RPC form shows the effective count: upstream’s 0 alias is displayed as 16.
- A successful package build does not establish runtime, IBD, client, restart, or backup
  compatibility on a StartOS server.

## Quick Reference for AI Consumers

This summary identifies the package's administration surface. The source models and
manifest remain the authority for defaults and image selection.

```yaml
package_id: rbitcoin
image: rbitcoin
upstream_image: ghcr.io/rbitcoin-org/rbitcoin:0.9.1@sha256:07ba41581f0c8f4c98a4b35c1106c61fe1b7c6c2c36cbd8321e7919efaae5207
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
dependencies:
  tor: conditional
  i2pd: conditional
interfaces:
  peer: { type: p2p, port: 8333 }
  rpc: { type: api, port: 8332 }
  electrum: { type: api, port: 50001 }
  esplora: { type: api, port: 3000 }
  health: { type: api, port: 9332 }
  sv2: { type: api, port: 8442 }
actions:
  - set-rpc-credentials
  - view-rpc-credentials
  - apis-limits
  - indexes
  - storage
  - peers
  - peers-advanced
  - mempool
  - permissions
  - apis
  - mining
  - node-logging
tasks:
  - { action: set-rpc-credentials, severity: critical }
  - { action: peers, severity: important }
health_checks: [node, synchronization, peers]
```
