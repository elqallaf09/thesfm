# Lighthouse CI governance: advisory on PRs, strict on a scheduled baseline

## Summary

`CI/Lighthouse CI` was a required per-PR merge gate that failed on two
completely unrelated branches — PR #58 (a lockfile-only dependency integrity
fix) and PR #53 (a backend-only scanner rewrite), neither of which could
plausibly cause a real performance regression. PR #68 investigated the root
cause and implemented a deterministic server-warmup wrapper as a fix. That
wrapper measurably reduced the worst-case outlier, but across 3 consecutive
real GitHub Actions CI executions on byte-identical code, every execution
still failed: the first Lighthouse run in each execution showed a severe
outlier (TBT ~1530-1583ms, Performance ~0.50), and even later runs
frequently exceeded threshold (TBT up to 637ms). The same fix produced
clean, passing results locally, which points to Chrome/Lighthouse-side
first-launch cost under the shared runner's CPU contention — not
server cold-start, and not something a per-PR job can control.

## Decision

Lighthouse stays strict and fully visible, but it no longer gates individual
pull requests on that shared runner's noise:

- **`CI/Lighthouse advisory`** (`.github/workflows/ci.yml`) still runs on
  every pull request with the exact same thresholds as before. It uploads
  every report and publishes a job summary with every run's Performance,
  TBT, LCP, FCP, and CLS. It is `continue-on-error: true`, so a threshold
  violation stays fully visible in the job's own status and summary but no
  longer fails the pull request's overall required checks.
- **`Lighthouse baseline`** (`.github/workflows/lighthouse-baseline.yml`) is
  a new, separate workflow that runs the identical, unmodified thresholds
  against the exact current `main` commit once daily (and on-demand via
  `workflow_dispatch`). This run is strict — a threshold violation fails the
  job normally. A `concurrency` group ensures only one baseline run executes
  at a time. It does not modify application code or open automated repair
  PRs; a failing baseline is a signal for a human to investigate.

No Lighthouse assertion, threshold, or run count changed anywhere in this
change. `CI/Lighthouse CI` was removed from the "Protect main" ruleset's
required status checks as a manual repository-owner action — this repo does
not automate ruleset changes.

## Why not just retry harder or lower the threshold

Retrying, adding more warmup requests, or increasing `numberOfRuns` was
already tried (PR #68) and did not converge — the outlier reproduced
identically across three separate, byte-identical CI executions. Lowering
or removing an assertion would stop measuring the thing that actually
matters. Moving the strict, blocking signal to a dedicated scheduled run
against `main` keeps the real threshold meaningful without making it a
lottery on every unrelated pull request.
