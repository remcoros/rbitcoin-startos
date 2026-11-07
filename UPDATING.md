# Updating rbitcoin

1. Check stable releases at <https://github.com/rbitcoin-org/rbitcoin/releases>.
   Read the release's operator configuration, schema/upgrade notes, and compatibility
   notes. Use the tagged release source, not the development branch, to audit flags
   and defaults. Never automatically wipe or resync an incompatible data directory.
2. Verify the release tag exists for `ghcr.io/rbitcoin-org/rbitcoin` with
   `docker manifest inspect`, check Linux amd64 and arm64, and resolve the multi-platform
   digest with `docker buildx imagetools inspect`. Verify image revision/version labels,
   UID, working directory, entrypoint, and data layout. Run only `--help` and `--version`
   under `--network none` when chain synchronization is outside the testing scope.
3. Update the immutable upstream `FROM` reference in `Dockerfile` and the
   upstream part of `version` in `startos/versions/current.ts`. Keep one version file
   unless the current version contains a real migration. Write localized release notes.
4. Compare upstream `NodeConfig::default`, `apply_kv`, `validate`, and its environment
   inventory with `startos/fileModels/`, actions, `utils.ts`, and interface ports. Preserve
   upstream defaults; separately justify any StartOS-specific override. Audit new APIs
   and indexes for settings coverage, storage cost, and incompatibilities.
5. Check the published SDK with `npm view @start9labs/start-sdk version`; update the exact
   dependency and lockfile when appropriate. Run `make format`, then `make x86` and
   `make arm`. Inspect both artifacts with `start-cli s9pk inspect`.
6. Installation, chain synchronization, client testing, restart, and backup/restore
   require separate authorization and sufficient storage. Record the observed testing
   boundary in the handoff; package checks alone do not prove runtime compatibility.

The final Alpine base supplies GNU `find` and e2fsprogs `chattr` in the node image.
To update it, check Alpine's current stable release, resolve its official image tag
to a multi-platform digest, verify Linux amd64 and arm64, and update the Alpine
`FROM` in `Dockerfile`. Keep `apk add --no-cache` and the
`findutils` and `e2fsprogs-extra` packages: BusyBox's tools do not reliably propagate
attribute-setting errors. Check that the final image preserves upstream binary
checksums and runtime metadata, `chattr` supports `+C`, and the setup command touches
only directories and returns nonzero on traversal or attribute-setting failures.
Rebuild both package architectures.
