// Keep registry findings verbatim. A known finding is covered only when the
// installed local patch passes its regression tests; all other high/critical
// findings and audit transport errors fail the build.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve('artifacts/security');
mkdirSync(directory, { recursive: true });
for (const [label, workspace] of [['website', '.'], ['mobile', 'apps/expo-go']]) {
  const verify = spawnSync(process.execPath, ['scripts/test-security-patches.mjs', workspace], { stdio: 'inherit' });
  if (verify.status !== 0) process.exit(1);
  const audit = spawnSync('pnpm', ['audit', '--json'], { cwd: resolve(workspace), encoding: 'utf8', timeout: 120_000 });
  writeFileSync(resolve(directory, `${label}-registry-audit.json`), audit.stdout || '{}');
  if (audit.error || ![0, 1].includes(audit.status)) throw new Error(`${label}: audit did not complete`);
  const report = JSON.parse(audit.stdout);
  if (report.error || !report.metadata?.vulnerabilities || !report.advisories) throw new Error(`${label}: invalid audit response`);
  const covered = { 'GHSA-vfj7-8cjw-p6xm': ['braces', '3.0.3'], 'GHSA-86w9-cpqp-85rv': ['node-forge', '1.4.0'] };
  const findings = Object.values(report.advisories).filter(item => ['high', 'critical'].includes(item.severity));
  for (const finding of findings) {
    const patch = covered[finding.github_advisory_id];
    if (finding.severity !== 'high' || !patch || finding.module_name !== patch[0] || !finding.findings?.length || finding.findings.some(item => item.version !== patch[1]) || (label === 'website' && patch[0] === 'node-forge')) {
      throw new Error(`${label}: unresolved ${finding.severity} ${finding.github_advisory_id || finding.module_name}`);
    }
    console.log(`${label}: registry ${finding.github_advisory_id} remains visible; installed ${patch[0]} local backport verified`);
  }
  console.log(`${label}: raw audit reports ${report.metadata.vulnerabilities.high} high / ${report.metadata.vulnerabilities.critical} critical; ${findings.length} covered by tested local backports`);
}
