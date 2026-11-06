#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [file, expectedPackage, ...flags] = process.argv.slice(2);
if (!file || !expectedPackage) throw new Error('Usage: node scripts/verify-markets-tv-apk.mjs FILE EXPECTED_PACKAGE [--allow-debug]');
const bin = process.env.ANDROID_BUILD_TOOLS;
if (!bin) throw new Error('Set ANDROID_BUILD_TOOLS to the installed Android SDK build-tools directory.');
const output = (name, args) => execFileSync(path.join(bin, name), args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const signature = output('apksigner', ['verify', '--verbose', '--print-certs', file]);
const badging = output('aapt', ['dump', 'badging', file]);
output('zipalign', ['-c', '-p', '4', file]);
const applicationId = /package: name='([^']+)'/.exec(badging)?.[1];
if (applicationId !== expectedPackage) throw new Error('APK application ID does not match the intended distribution.');
if (!badging.includes('leanback-launchable-activity:')) throw new Error('APK does not expose the Android TV launcher.');
const fingerprint = /certificate SHA-256 digest: ([a-f0-9]+)/i.exec(signature)?.[1]?.toLowerCase();
if (!fingerprint) throw new Error('APK signer certificate is missing.');
const debug = badging.includes('application-debuggable') || /CN=Android Debug/i.test(signature);
if (!flags.includes('--allow-debug')) {
  if (debug) throw new Error('Debug APKs and Android Debug certificates cannot be approved for official distribution.');
  const expected = process.env.SFM_TV_RELEASE_CERT_SHA256?.replace(/:/g, '').toLowerCase();
  if (!expected || expected !== fingerprint) throw new Error('Set the expected permanent signing certificate fingerprint; the APK must match it.');
}
console.log(JSON.stringify({ file: path.basename(file), applicationId,
  versionName: /versionName='([^']+)'/.exec(badging)?.[1], versionCode: Number(/versionCode='(\d+)'/.exec(badging)?.[1]),
  signing: debug ? 'debug-test-only' : 'verified-release', signerCertificateSha256: fingerprint,
  apkSha256: createHash('sha256').update(readFileSync(file)).digest('hex'), alignment: 'verified' }, null, 2));
