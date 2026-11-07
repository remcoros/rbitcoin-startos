FROM ghcr.io/rbitcoin-org/rbitcoin:0.9.0@sha256:e8349beec53714cd05f4a46d17e7e0d0956296c497de4a44c0fee807c6ed1339 AS upstream

FROM alpine:3.24.4@sha256:93b41ef40b1677fce8fcc64ff4af09daddfacf5040afde618bc46c1e2d1cc7d4

RUN apk add --no-cache e2fsprogs-extra findutils

COPY --from=upstream /usr/local/bin/rbitcoin-node /usr/local/bin/rbitcoin-cli /usr/local/bin/

USER 10001:10001
WORKDIR /data
VOLUME ["/data"]
EXPOSE 8333
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/rbitcoin-node"]
