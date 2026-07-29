#!/usr/bin/env bash
# Starts the production server for Lighthouse CI and issues throwaway
# warm-up requests before signaling readiness.
#
# Root cause this addresses: Next.js compiles/caches a route on its first
# request. lighthouse-ci-action runs N Lighthouse passes sequentially
# against ONE persistent server process, so without a warm-up the first
# pass always absorbs the full cold-start cost (observed: ~1800-2100ms
# Total Blocking Time on run 1 vs. ~320-680ms on runs 2-3 of the same
# server instance) while later passes benefit from an already-warm server.
# With only 3-5 samples, that single cold outlier is a large share of the
# data set and can dominate whichever run gets selected as "representative"
# by the assertion's aggregation method. Warming the server here means every
# counted Lighthouse pass measures steady-state performance instead.
set -euo pipefail

pnpm exec next start --hostname 127.0.0.1 --port 3100 &
SERVER_PID=$!

echo "Waiting for the server to accept connections..."
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:3100/"; then
    break
  fi
  sleep 1
done

echo "Issuing warm-up requests (not measured by Lighthouse)..."
curl -sf -o /dev/null "http://127.0.0.1:3100/" || true
curl -sf -o /dev/null "http://127.0.0.1:3100/" || true

echo "Ready for Lighthouse (server pre-warmed)"

wait "$SERVER_PID"
