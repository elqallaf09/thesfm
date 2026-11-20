#!/usr/bin/env bash
set -Eeuo pipefail

TV_HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
TV_APP_ROOT="$1"
TV_EVIDENCE_ROOT="$(mkdir -p "$2" && cd "$2" && pwd)"
TV_SIMULATOR_UDID=''
mkdir -p "$TV_EVIDENCE_ROOT/smoke"

cleanup() {
  if [ -n "$TV_SIMULATOR_UDID" ]; then
    xcrun simctl io "$TV_SIMULATOR_UDID" screenshot "$TV_EVIDENCE_ROOT/smoke/final-simulator.png" || true
    xcrun simctl spawn "$TV_SIMULATOR_UDID" launchctl list > "$TV_EVIDENCE_ROOT/smoke/final-processes.txt" || true
    xcrun simctl shutdown "$TV_SIMULATOR_UDID" || true
  fi
}
trap cleanup EXIT

TV_APP_PATH="$(python3 "$TV_HARNESS_DIR/prepare_app.py" "$TV_APP_ROOT" "$TV_EVIDENCE_ROOT/smoke/app-manifest.json")"
xcrun simctl list devices available -j > "$TV_EVIDENCE_ROOT/smoke/simulators.json"
TV_SIMULATOR_UDID="$(python3 - "$TV_EVIDENCE_ROOT/smoke/simulators.json" <<'PY'
import json,sys
devices=json.load(open(sys.argv[1]))['devices']
print(next(v['udid'] for runtime,values in devices.items() if 'tvOS' in runtime
           for v in values if v.get('isAvailable') and 'Apple TV' in v['name'] and v['state'] == 'Shutdown'))
PY
)"
xcodebuild -version > "$TV_EVIDENCE_ROOT/smoke/xcode-version.txt"
xcrun simctl boot "$TV_SIMULATOR_UDID"
xcrun simctl bootstatus "$TV_SIMULATOR_UDID" -b
xcrun simctl install "$TV_SIMULATOR_UDID" "$TV_APP_PATH"

# No application source target is included: this builds the XCTest runner only.
set +e
xcodebuild test \
  -project "$TV_HARNESS_DIR/NativeTVSmoke.xcodeproj" -scheme NativeTVSmoke \
  -sdk appletvsimulator -configuration Debug \
  -destination "platform=tvOS Simulator,id=$TV_SIMULATOR_UDID" \
  -derivedDataPath "$TV_EVIDENCE_ROOT/runner-build" \
  -resultBundlePath "$TV_EVIDENCE_ROOT/NativeTVSmoke.xcresult" \
  -parallel-testing-enabled NO -maximum-concurrent-test-simulator-destinations 1 \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 90 \
  -maximum-test-execution-time-allowance 120 \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$TV_EVIDENCE_ROOT/xcodebuild.log"
TV_TEST_STATUS=${PIPESTATUS[0]}
set -e

# Preserve result/attachments even when the renderer assertion failed.
TV_EXPORT_STATUS=0
xcrun xcresulttool get test-results summary --path "$TV_EVIDENCE_ROOT/NativeTVSmoke.xcresult" \
  > "$TV_EVIDENCE_ROOT/smoke/test-summary.json" || TV_EXPORT_STATUS=$?
xcrun xcresulttool export attachments --path "$TV_EVIDENCE_ROOT/NativeTVSmoke.xcresult" \
  --output-path "$TV_EVIDENCE_ROOT/attachments" || TV_EXPORT_STATUS=$?
python3 "$TV_HARNESS_DIR/export_evidence.py" "$TV_EVIDENCE_ROOT" || TV_EXPORT_STATUS=$?
test "$TV_TEST_STATUS" -eq 0
test "$TV_EXPORT_STATUS" -eq 0
