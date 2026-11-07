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

Leave **Disk I/O backend** on **Automatic** in **Performance** unless you need an
override.

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

Settings show saved values. Proxies start **Disabled** and peer
networks use **All available**. Enter an endpoint only when enabling a proxy.
Use **API limits** for advanced client limits. Fees use sat/vB; the witness cache uses MiB.
Saving settings restarts a running node. API call logging includes wallet requests
and has no size limit.

If you publish P2P through a tunnel to keep your home IP private, route the node's
outbound connections through that tunnel too, or configure a suitable outbound proxy.
Otherwise the peers it contacts can see your home IP. A tunnel used only to obtain
an incoming port does not require this privacy change.

## Limitations

Pruning permanently deletes script and witness data older than 288 blocks. Once it
begins, it cannot be turned off for that data store. It cannot be combined with the
Silent Payment index. Choose your pruning policy before a large sync.

The package does not provide a wallet, a full Bitcoin Core RPC clone, a Tor/I2P router,
or native Tor-control/inbound-I2P forwarding. Outbound proxies and SAM endpoints must
already exist and be reachable. Peer permission grants refer to the address the node
actually sees, which may be a gateway/proxy address for forwarded connections.

Backups include the entire chain and every index. Allow enough backup space for the
full node data.

## Documentation

- [Node operations](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.x/docs/operator/operations.md) — configuration options, synchronization, health, and progress.
- [Storage and indexes](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.x/docs/operator/storage.md) — disk I/O, index behavior, and pruning.
- [RPC reference](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.x/docs/rpc.md) — supported methods and authentication.
- [Client compatibility](https://github.com/rbitcoin-org/rbitcoin/blob/v0.9.x/COMPAT.md) — supported wallet and API behavior.
