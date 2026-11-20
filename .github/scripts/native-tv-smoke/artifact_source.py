#!/usr/bin/env python3
"""Prove a replay artifact's successful native build and actual checkout tree."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import unicodedata


def clean_log(value: str) -> str:
    # Strip CSI, OSC and other ANSI control strings before inspecting captured
    # logs. No raw log body is ever sent to a terminal or printed as evidence.
    value = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]|\x9b[0-?]*[ -/]*[@-~]|"
                   r"\x1b\][\s\S]*?(?:\x07|\x1b\\)|\x1b[PX^_][\s\S]*?\x1b\\|\x1b[@-_]", "", value)
    return "".join(char for char in value if char in "\n\t" or not unicodedata.category(char).startswith("C"))


def api(path: str, text: bool = False):
    # gh rejects ANSI-bearing Actions logs by default. Opt in only for this
    # captured plaintext response, then sanitize it before returning to parsing.
    flags = ["--allow-escape-sequences"] if text else []
    value = subprocess.check_output(["gh", "api", path, *flags], text=True)
    return clean_log(value) if text else json.loads(value)


def verify() -> dict:
    repository = os.environ["GITHUB_REPOSITORY"]
    run_id = os.environ["TV_SOURCE_RUN_ID"]
    artifact_id = os.environ["TV_SOURCE_ARTIFACT_ID"]
    expected_sha = os.environ["TV_SOURCE_SHA"]
    assert re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository)
    assert re.fullmatch(r"[1-9][0-9]*", run_id) and re.fullmatch(r"[1-9][0-9]*", artifact_id)
    assert re.fullmatch(r"[a-f0-9]{40}", expected_sha), "A complete expected app-source SHA is required"
    assert os.environ.get("TV_COMPILE_NATIVE", "false") == "false", "Replay and native compilation are separate modes"
    base = f"repos/{repository}"
    run = api(f"{base}/actions/runs/{run_id}")
    artifact = api(f"{base}/actions/artifacts/{artifact_id}")
    assert run["status"] == "completed" and run["conclusion"] == "success", "Source native workflow did not pass"
    assert run["path"] == ".github/workflows/markets-tv-native.yml", "Unexpected source workflow"
    assert run["head_sha"] == expected_sha, "Source run does not match the requested app commit"
    assert artifact["name"] == "sfm-native-tv-tvos-simulator-NOT-DEVICE-INSTALLABLE"
    assert not artifact["expired"] and artifact["workflow_run"]["id"] == int(run_id)
    assert artifact["workflow_run"]["head_sha"] == expected_sha
    assert re.fullmatch(r"sha256:[a-f0-9]{64}", artifact.get("digest", "")), "Artifact digest is unavailable"
    jobs = api(f"{base}/actions/runs/{run_id}/jobs?filter=latest&per_page=100")["jobs"]
    native_jobs = [job for job in jobs if job["name"] == "tvos" and job["conclusion"] == "success"]
    assert len(native_jobs) == 1, "Expected one successful native tvOS build job"
    job = native_jobs[0]
    lines = api(f"{base}/actions/jobs/{job['id']}/logs", text=True).splitlines()
    checkout_shas = []
    for index, line in enumerate(lines[:-1]):
        if "[command]" in line and "git log -1 --format=%H" in line:
            match = re.search(r"\b([a-f0-9]{40})\s*$", lines[index + 1])
            assert match, "Checkout log did not record a commit"
            checkout_shas.append(match.group(1))
    assert len(checkout_shas) == 1, "Actual native checkout is ambiguous"
    checkout = api(f"{base}/git/commits/{checkout_shas[0]}")
    source = api(f"{base}/git/commits/{expected_sha}")
    assert checkout["tree"]["sha"] == source["tree"]["sha"], "Built merge tree differs from the requested app source"
    return {
        "repository": repository, "source_run_id": int(run_id), "source_job_id": job["id"],
        "source_sha": expected_sha, "checkout_sha": checkout["sha"], "source_tree": source["tree"]["sha"],
        "artifact_id": int(artifact_id), "artifact_name": artifact["name"], "artifact_digest": artifact["digest"],
        "artifact_size": artifact["size_in_bytes"], "source_run_url": run["html_url"],
        "harness_sha": os.environ["GITHUB_SHA"],
    }


if __name__ == "__main__":
    result = verify()
    path = Path(sys.argv[1])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
