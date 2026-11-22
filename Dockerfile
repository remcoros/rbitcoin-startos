FROM rust:1.95-alpine@sha256:606fd313a0f49743ee2a7bd49a0914bab7deedb12791f3a846a34a4711db7ed2 AS upstream

RUN apk add --no-cache build-base
WORKDIR /src
# Temporary master snapshot containing the external P2P endpoint and onion listener support.
ADD --checksum=sha256:16fbad7c990f54bd1ff9d8091aa801c12ec8a5973febbd9c1bdbce9b96fef288 \
    https://codeload.github.com/rbitcoin-org/rbitcoin/tar.gz/2bafeefed8f4441ef8e8841b84aec7b6cc2fb797 /tmp/rbitcoin.tar.gz
RUN tar -xzf /tmp/rbitcoin.tar.gz --strip-components=1 \
    && cargo build --locked --release -p rbitcoin-node -p rbitcoin-cli \
    && install -m 0755 target/release/rbitcoin-node target/release/rbitcoin-cli /usr/local/bin/

FROM alpine:3.24.4@sha256:93b41ef40b1677fce8fcc64ff4af09daddfacf5040afde618bc46c1e2d1cc7d4

RUN apk add --no-cache e2fsprogs-extra findutils nftables socat util-linux

COPY --from=upstream /usr/local/bin/rbitcoin-node /usr/local/bin/rbitcoin-cli /usr/local/bin/

USER 10001:10001
WORKDIR /data
VOLUME ["/data"]
EXPOSE 8333
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/rbitcoin-node"]
