#!/usr/bin/env python3
"""Export only distinctly named, asserted feature captures; fail on missing proof."""
import hashlib
import json
from pathlib import Path
import shutil
import sys


def collect(root: Path) -> dict:
    exported = root / "attachments"
    manifest = json.loads((exported / "manifest.json").read_text())
    summary = json.loads((root / "smoke" / "test-summary.json").read_text())
    assert summary["passedTests"] == 3 and summary["failedTests"] == 0
    assert summary["skippedTests"] == 0 and summary["totalTestCount"] == 3
    attachments = [attachment for test in manifest for attachment in test["attachments"]]
    screens = {}
    for scene, marker in [("brief", "توزيع الحركة"), ("map", "التوقيت المحلي"), ("account", "https://www.the-sfm.com/profile")]:
        stem = f"tvos-{scene}"
        for suffix, extension in [("", ".png"), ("-ax", ".txt"), ("-system-ax", ".txt")]:
            name = stem + suffix
            matches = [item for item in attachments if item["suggestedHumanReadableName"] == name
                       or item["suggestedHumanReadableName"].startswith(name + "_")
                       or item["suggestedHumanReadableName"] == name + extension]
            assert len(matches) == 1, f"Expected one asserted {name} attachment, found {len(matches)}"
            source = (exported / matches[0]["exportedFileName"]).resolve()
            assert source.is_relative_to(exported.resolve()) and source.is_file()
            target = root / "smoke" / (name + extension)
            shutil.copyfile(source, target)
        png = (root / "smoke" / (stem + ".png")).read_bytes()
        assert png.startswith(b"\x89PNG\r\n\x1a\n"), f"{scene} is not a PNG"
        hierarchy = (root / "smoke" / (stem + "-ax.txt")).read_text()
        assert marker in hierarchy, f"{scene} lacks its expected accessibility content"
        screens[scene] = hashlib.sha256(png).hexdigest()
    assert len(set(screens.values())) == 3, "Feature screenshots are identical; distinct destinations were not captured"
    return {"verified_screenshots_sha256": screens, "passed_tests": 3}


if __name__ == "__main__":
    root = Path(sys.argv[1]).resolve()
    result = collect(root)
    (root / "smoke" / "verification.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
