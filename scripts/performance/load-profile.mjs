import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const PUBLIC_PATHS = ['/', '/login', '/privacy'];
const LEVELS = [100, 500, 1000];

export function parseOptions(args) {
  const options = { execute: false, baseUrl: 'http://127.0.0.1:3000', users: LEVELS,
    durationSeconds: 30, timeoutMs: 5000, thinkMs: 1000, maxRequests: 50000,
    maxErrorRate: 0.01, maxP95Ms: 2000, output: null };
  const names = { '--base-url': 'baseUrl', '--users': 'users', '--duration-seconds': 'durationSeconds',
    '--timeout-ms': 'timeoutMs', '--think-ms': 'thinkMs', '--max-requests': 'maxRequests',
    '--output': 'output' };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--execute') { options.execute = true; continue; }
    const key = names[arg];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid option: ${arg}`);
    const value = args[++i];
    options[key] = key === 'users' ? value.split(',').map(Number)
      : ['baseUrl', 'output'].includes(key) ? value : Number(value);
  }
  const url = new URL(options.baseUrl);
  // Literal loopback only: no DNS rebinding, remote targets, credentials or redirects.
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Only an HTTP literal-loopback origin is allowed. Production is not a load-test target.');
  }
  options.baseUrl = url.origin;
  if (!options.users.length || new Set(options.users).size !== options.users.length
    || options.users.some(n => !LEVELS.includes(n))) throw new Error('Users must be unique levels from 100,500,1000.');
  for (const [key, min, max] of [['durationSeconds', 1, 300], ['timeoutMs', 100, 30000],
    ['thinkMs', 100, 10000], ['maxRequests', 1000, 100000]]) {
    if (!Number.isInteger(options[key]) || options[key] < min || options[key] > max) {
      throw new Error(`${key} must be an integer from ${min} to ${max}.`);
    }
  }
  return options;
}

export function summarize(samples, elapsedMs, statuses, errors) {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = p => sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;
  return { requests: sorted.length, elapsedMs: Math.round(elapsedMs),
    requestsPerSecond: elapsedMs > 0 ? sorted.length * 1000 / elapsedMs : 0,
    latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) },
    failures: errors, errorRate: sorted.length ? errors / sorted.length : null, statuses };
}

export async function runStage(options, users) {
  const started = performance.now();
  const deadline = started + options.durationSeconds * 1000;
  const samples = [];
  const statuses = {};
  const bodyLimit = 2 * 1024 * 1024;
  let issued = 0;
  let errors = 0;
  let active = 0;
  let peakInFlight = 0;
  const worker = async () => {
    while (performance.now() < deadline && issued < options.maxRequests) {
      const index = issued++;
      const start = performance.now();
      active += 1;
      peakInFlight = Math.max(peakInFlight, active);
      let status = 'transport_error';
      try {
        const response = await fetch(options.baseUrl + PUBLIC_PATHS[index % PUBLIC_PATHS.length], {
          redirect: 'manual', signal: AbortSignal.timeout(options.timeoutMs),
          headers: { 'user-agent': 'SFM-Local-Capacity-Probe/1.0' },
        });
        status = String(response.status);
        // Drain the body without retaining HTML or following third-party links.
        let bytes = 0;
        if (response.body) {
          for await (const chunk of response.body) {
            bytes += chunk.byteLength;
            if (bytes > bodyLimit) throw new Error('response_too_large');
          }
        }
        if (!response.ok) errors += 1;
      } catch {
        errors += 1;
        status = 'transport_or_body_error';
      } finally {
        active -= 1;
        samples.push(performance.now() - start);
        statuses[status] = (statuses[status] ?? 0) + 1;
      }
      const remaining = deadline - performance.now();
      if (remaining > 0 && issued < options.maxRequests) {
        await new Promise(resolve => setTimeout(resolve, Math.min(options.thinkMs, remaining)));
      }
    }
  };
  await Promise.all(Array.from({ length: users }, worker));
  const summary = summarize(samples, performance.now() - started, statuses, errors);
  const durationCovered = performance.now() >= deadline;
  const passed = durationCovered && issued >= users && summary.errorRate !== null
    && summary.errorRate <= options.maxErrorRate && summary.latencyMs.p95 <= options.maxP95Ms;
  return { users, peakInFlight, durationCovered, requestCapReached: issued >= options.maxRequests,
    ...summary, passed };
}

export async function main(args) {
  const options = parseOptions(args);
  const plan = { schemaVersion: 1, kind: 'http_closed_loop_probe', options, paths: PUBLIC_PATHS,
    limits: 'HTTP only; no browser rendering, signed-in journeys, database isolation, provider capacity or Production capacity certification.' };
  if (!options.execute) { console.log(JSON.stringify({ ...plan, dryRun: true }, null, 2)); return; }
  const stages = [];
  for (const users of options.users) {
    const stage = await runStage(options, users);
    stages.push(stage);
    if (!stage.passed) break; // Never escalate after overload or incomplete measurement.
  }
  const report = { ...plan, observedAt: new Date().toISOString(), stages,
    completedAllStages: stages.length === options.users.length,
    passed: stages.length === options.users.length && stages.every(stage => stage.passed) };
  const json = JSON.stringify(report, null, 2) + '\n';
  if (options.output) await writeFile(options.output, json, { flag: 'wx', mode: 0o600 });
  console.log(json);
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
