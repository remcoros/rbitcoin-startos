FROM ghcr.io/rbitcoin-org/rbitcoin:0.9.1@sha256:07ba41581f0c8f4c98a4b35c1106c61fe1b7c6c2c36cbd8321e7919efaae5207 AS upstream

FROM alpine:3.24.4@sha256:93b41ef40b1677fce8fcc64ff4af09daddfacf5040afde618bc46c1e2d1cc7d4

RUN apk add --no-cache e2fsprogs-extra findutils util-linux

COPY --from=upstream /usr/local/bin/rbitcoin-node /usr/local/bin/rbitcoin-cli /usr/local/bin/

USER 10001:10001
WORKDIR /data
VOLUME ["/data"]
EXPOSE 8333
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/rbitcoin-node"]
