# Native Apple TV runtime proof

This standalone XCTest UI target exercises an already compiled and installed
SFM Markets TV simulator app. It does not build or modify the application,
inject fixtures, set app launch arguments, or add a production test bypass.

The three tests open the public `sfm-tv-native://brief`, `://map`, and `://account`
links with `XCUIApplication.open`. They require visible feature content: brief
metrics and sample-price controls, four regional city clocks, and the first-party
profile address with its phone-editing explanation and QR accessibility label.
Header navigation labels or a live process do not satisfy these assertions.

If tvOS presents a confirmation, the runner accepts only an alert naming
`SFM Markets TV` with its `Open` button already focused. It uses the normal
`XCUIRemote` Select action. Any other alert or focus state fails with evidence.
No general permission-acceptance handler is registered.

Every successful screen produces a PNG plus application and system accessibility
hierarchies. Failures also attach the current screenshot and hierarchies. The
runner keeps the complete `.xcresult`, its exported attachments, and build log.
The proof step fails if tests fail/skip, expected content or captures are absent,
or the three screenshot byte hashes are identical. Visual review is still
required for clipping, text appearance, artwork, and QR readability.

## Replay an existing CI artifact

Dispatch the existing `markets-tv-native.yml` workflow on the harness branch:

- `compile_native`: `false`
- `runtime_artifact_id`: the immutable simulator artifact ID
- `runtime_run_id`: its successful Native Markets TV validation run
- `runtime_source_sha`: the complete application source head SHA

The replay job has read-only `actions` access. Before download, it verifies the
artifact name, run, digest and source SHA, then reads the successful tvOS job's
checkout log and verifies that the actual build tree equals the requested source
tree. This matters because pull-request builds normally use a synthetic merge.
The download action validates the archive digest. `prepare_app.py` checks the
bundle/platform and restores only Info.plist-declared executable file modes
lost during artifact transport; hashes prove that application bytes are unchanged.

The first replay uses source run `44826478816`, artifact `14675640633`, source
`0613890d0a4f6cc3c8d5a99e8f73dd8efc47e5c6` (tree
`732ca7328d7abc7f0b805ee7a64573e6bf017788`). The compiled checkout was
`935b1ade1b5d6c9752d9ef472c42ffd487a0f860`, with the identical tree.

## Use after a fresh native build

On a macOS runner with Xcode selected, run:

```sh
bash .github/scripts/native-tv-smoke/run.sh \
  apps/markets-tv-native/.native-build/Build/Products/Release-appletvsimulator \
  apps/markets-tv-native/.native-runtime
```

Always upload `.native-runtime/smoke`, `.native-runtime/attachments`,
`.native-runtime/NativeTVSmoke.xcresult`, and `.native-runtime/xcodebuild.log`,
including when assertions fail. Keep these generated files out of Git. This
replaces process-only `simctl openurl` capture; it does not replace native build,
typecheck, export, or other required CI gates.
