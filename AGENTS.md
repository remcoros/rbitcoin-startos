# rbitcoin packaging

This repository wraps the official rbitcoin image for StartOS. Use the packaging
workspace guide one directory above for SDK conventions.

- Compare settings against the pinned release's config parser and defaults; the
  upstream development branch can describe options absent from the shipped image.
- Local verification is build-only unless runtime testing is explicitly authorized
  on a host with sufficient storage. Do not install on `simple-strip` or start a
  mainnet sync as part of package validation.
