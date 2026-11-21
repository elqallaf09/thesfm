#!/usr/bin/env python3
"""Validate a simulator app and restore archive-lost executable bits only."""
import hashlib
import json
from pathlib import Path
import plistlib
import stat
import sys


def prepare(root: Path, manifest: Path) -> Path:
    candidates = [root] if root.suffix == ".app" else list(root.rglob("*.app"))
    assert len(candidates) == 1, f"Expected exactly one simulator app, found {len(candidates)}"
    app = candidates[0].resolve()
    info = plistlib.loads((app / "Info.plist").read_bytes())
    assert info["CFBundleIdentifier"] == "com.thesfm.marketstv.native", "Unexpected app bundle"
    assert info["CFBundleSupportedPlatforms"] == ["AppleTVSimulator"], "Device binaries cannot be used for simulator proof"
    assert info.get("UIDeviceFamily") == [3], "Expected the native Apple TV application"
    hashes = {}
    for path in sorted(app.rglob("*")):
        assert path.resolve().is_relative_to(app), f"App path leaves its bundle: {path}"
        if path.is_file():
            hashes[str(path.relative_to(app))] = hashlib.sha256(path.read_bytes()).hexdigest()
    restored = []
    for path in sorted(app.rglob("Info.plist")):
        bundle = plistlib.loads(path.read_bytes())
        name = bundle.get("CFBundleExecutable")
        if name is None:
            continue
        assert isinstance(name, str) and Path(name).name == name and name not in (".", "..")
        executable = path.parent / name
        assert executable.is_file() and executable.resolve().is_relative_to(app)
        executable.chmod(executable.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        restored.append(str(executable.relative_to(app)))
    assert info["CFBundleExecutable"] in restored, "The app executable was not found"
    assert all(hashlib.sha256((app / path).read_bytes()).hexdigest() == value for path, value in hashes.items()), "App bytes changed"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({
        "bundle_identifier": info["CFBundleIdentifier"], "version": info["CFBundleShortVersionString"],
        "build": info["CFBundleVersion"], "platforms": info["CFBundleSupportedPlatforms"],
        "restored_executable_modes": restored, "sha256_by_path": hashes,
    }, indent=2) + "\n")
    return app


if __name__ == "__main__":
    print(prepare(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()))
