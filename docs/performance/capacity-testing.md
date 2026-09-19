# Local capacity testing — Phase 5.0

`scripts/performance/load-profile.mjs` adds the missing repeatable 100 / 500 / 1000
virtual-user HTTP profiles. It uses Node 22 built-ins, adds no package, and never
runs automatically in deployment or CI. Engine tests exercise the harness with
a tiny local HTTP fixture only; they do not establish application capacity.

## Run

Start a local production build with isolated test services. Never point its
database, external messaging, AI or provider keys at billable/live services for
a load exercise. The three public page paths are `/`, `/login`, `/privacy`.
This tests HTTP page serving, not authenticated finance or provider workflows.

```sh
# Prints the bounded plan only; sends no network requests.
node scripts/performance/load-profile.mjs

# Explicitly run against an already-started local server.
node scripts/performance/load-profile.mjs --execute --base-url http://127.0.0.1:3000 --users 100,500,1000 --duration-seconds 30 --output /tmp/sfm-capacity.json

# Test the tool, not THE SFM capacity.
node --test tests/engine/load-profile.test.mjs
```

Only literal loopback HTTP origins are accepted. Redirects are not followed.
The tool sends no auth/cookies, reads bounded response bodies without storing
them, caps requests per stage, bounds timeouts, and pauses between requests.
Its default is a closed-loop workload: each user sends one request at a time
then waits one second. User count is not requests/second or observed concurrent
browser sessions. Peak in-flight HTTP requests is reported independently.

Each stage reports sample count, status counts, failure rate, throughput,
p50/p95/p99 completion latency and actual duration. A stage needs the configured
duration and at least one request per virtual user, error rate <= 1%, and p95 <=
2000ms. These are initial HTTP acceptance limits, not Lighthouse/CWV targets.
Hitting the request cap early makes the stage incomplete. Failed/incomplete
stages stop escalation and exit nonzero. Reports never overwrite an existing
file. Keep output in QA artifacts, not Git.

## Evidence required to close the roadmap item

Record exact application SHA, Node version, CPU/RAM, server region and topology,
isolated database size/indexes, cache warm/cold state, workload and profile.
Run cold and warm cases separately. Correlate server CPU/memory, event-loop lag,
connection pools, query latency, provider attempts/cache outcomes and failures.
Monitor the load generator separately to detect its own saturation.

Then add authorized isolated-user journeys with independent credentials,
read/write ownership assertions, rate-limit expectations, cleanup and a rollback
plan. Add browser rendering, React profiler, long-task and heap measurements;
this HTTP script cannot measure LCP/CLS/INP, React renders or server memory leaks.
Do not extrapolate localhost or fixture results to 1000 Production users.
