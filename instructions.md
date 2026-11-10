# rbitcoin

## What you get on StartOS

This package runs on mainnet with optional JSON-RPC, Electrum, Esplora, and Stratum v2 interfaces.
APIs, indexes, pruning, and metrics start disabled. There is no web frontend.

## Getting set up

Mainnet needs substantial disk space and an initial sync.

1. Choose your pruning policy in **Storage and pruning** before syncing.
2. Choose your **Indexes**. Wallet history in Electrum and Esplora needs the address
   history index. Enable compact block filters or the Silent Payment index if your
   client needs them. Indexes need extra disk space and time to build.
3. Enable interfaces in **Client APIs**. For RPC, run **Generate RPC credentials**
   and save the password or Bearer token for your clients.
4. Start the node. Wait for the **Readiness** health check to pass before connecting
   clients.

Leave **Disk I/O backend** on **Automatic** in **Storage and pruning** unless you need an
override. It appears below **Optimize for HDD**.

## Using rbitcoin

Use the **JSON-RPC** address with HTTP Basic authentication, username `rbitcoin`, and
the generated password. For Bearer authentication, send the separate token in the
`Authorization: Bearer` header. **View RPC credentials** shows the saved credentials.
**Replace RPC credentials** replaces both secrets and restarts a running node.
Update every RPC client afterward.

Use **Electrum** for compatible wallets. Use a `tcp://` address for plaintext or an
`ssl://` address for the StartOS TLS connection. Wallet address history needs the
address-history index. **Esplora** is a REST API for compatible clients, without a
bundled block explorer website.

The **Health** interface provides `/healthz`, `/readyz`, and `/progress`.
Enable metrics in **Client APIs** to add Prometheus `/metrics`. Esplora,
Electrum, health/metrics, and optional Core-style REST do not require RPC credentials;
choose their reachability accordingly.

Use **Mining** for template policy and an optional Stratum v2
provider. Generate or supply a valid authority key before enabling it. The provider
uses Noise encryption; miners need its matching authority public key from the node
logs.

### Peer connections

Use **Peer Settings** to choose how rbitcoin connects:

- **Standard** connects directly to IPv4 and IPv6 peers. Onion peers use the Tor
  service when it is installed and running. Direct peers can see your outbound IP.
- **Through Tor** routes IPv4, IPv6, and onion peer connections through Tor,
  including manually specified peers. If Tor is unavailable, connections wait;
  there is no direct fallback. This setting does not change incoming access.
- **I2P connections** adds outgoing I2P peers in Standard mode. Install and start
  the I2P service; rbitcoin configures the connection automatically. I2P starts
  disabled. Its preference is kept while using Through Tor. Activating or
  restoring I2P may restart rbitcoin. Incoming I2P is not supported.
- **Accept incoming peer connections** lets other nodes reach yours. Publish
  addresses through the **P2P** interface in StartOS. A published onion can be
  shared with other operators, but this version does not automatically announce
  externally managed onions to Bitcoin peers. Public IP advertisements require
  external port 8333; a task explains incompatible published addresses.

Use **Advanced Peer Settings** for automatic peer networks, connection limits,
and **Manual peers**. A local node can improve initial sync. Include its port,
for example `192.168.1.10:8333`, and use Standard routing. Leave the list empty to
discover peers automatically. A manual list disables normal automatic discovery;
previously known peers may still be used during initial sync. Automatic network
selection does not restrict manually specified peers or incoming connections.

The **Peers** health check stays visible while syncing. During initial sync it
shows outgoing sync peers; afterward it shows incoming and outgoing counts. A
positive outgoing count gets a green check. The check allows five minutes for
startup before warning about missing connections or unavailable peer counts.
IBD peer reporting needs log level **info**, **debug**, or **trace**. Other levels
disable that reporting until initial sync finishes; networking keeps running.
A clock on an API check means that API is waiting for the node to finish starting
or syncing. **Readiness** shows a spinner and progress while syncing. I2P-only
settings wait for I2P rather than switching to another network.

Use **API limits** for advanced client limits. Fees use sat/vB; the witness cache
uses MiB. Saving settings restarts a running node. API call logging includes wallet
requests and has no size limit.

If you publish P2P through a tunnel to keep your home IP private, route the node's
outbound connections through that tunnel too, or choose Through Tor. Otherwise
its direct peers can see your home IP. A tunnel used only to obtain an incoming
port does not require this privacy change.

## Recovery

Recovery actions are under **Recovery**, after the other action groups.

Use **Rebuild address history** when the address history index is damaged. Use
**Rebuild transaction lookup** when that index is damaged. The node restarts if
running; otherwise the rebuild starts the next time you start it. The **Readiness**
check shows rebuild progress when available. Address history must be enabled to
rebuild it. The node and wallet APIs may be unavailable while rebuilding.

Use **Resync from scratch** as a last resort. It stops the service and schedules
deletion of its chain data, indexes, peer list, mempool, and API log. Settings and
RPC credentials remain. Choose pruning and index settings before starting the
service again. The data is deleted and disk space reclaimed at the next start,
before the new sync begins. Check the service logs for removal progress; deleting
the old data can take time. If stopping cannot be confirmed, the reset may still
run on the next start; check the service status and logs before starting. The
initial sync can take days and requires substantial disk space.

Each enabled API has its own health check. The Stratum v2 check shows whether
its port is listening; it does not check template delivery.

During sync, **Readiness** shows the current block height against known headers
and their percentage. This is a block count, not an estimate of remaining time;
later blocks can take longer to process. It works with network JSON-RPC disabled.
While the node discovers its header target, it shows **Syncing...** without a percentage.

## Limitations

Pruning permanently deletes script and witness data older than 288 blocks. Once it
begins, it cannot be turned off for that data store. If you need Silent Payments,
enable the index before syncing with pruning, or let it catch up before enabling
pruning. On an already pruned chain, the index can only be enabled if it covers
the pruned blocks. Disabling the index while pruning can prevent you from enabling
it again later. **Witness cache** sets a size threshold for recent script and witness
data cached in RAM. Memory overhead is extra. Higher values can reduce disk reads;
0 disables the RAM cache while
keeping recent data on disk. If the node cannot start after changing these settings, check its logs.

The package does not provide a wallet, a full Bitcoin Core RPC clone, a Tor/I2P router,
or native Tor-control/inbound-I2P forwarding. Tor and I2P are separate services;
there are no custom proxy or SAM endpoint fields. Through Tor configures supported
peer connections, not an OS-level firewall against advanced administrative RPC
commands. Peer permission grants refer to the address the node
actually sees, which may be a gateway/proxy address for forwarded connections.

Backups include the entire chain and every index. Allow enough backup space for the
full node data.

## Documentation

- [Node operations](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.1/docs/operator/operations.md) — configuration options, synchronization, health, and progress.
- [Storage and indexes](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.1/docs/operator/storage.md) — disk I/O, index behavior, and pruning.
- [RPC reference](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.1/docs/rpc.md) — supported methods and authentication.
- [Client compatibility](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.1/COMPAT.md) — supported wallet and API behavior.
