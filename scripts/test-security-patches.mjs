// Exercise the installed backports, not just their patch text. Run in each
// workspace after a frozen install; raw audit findings remain visible.
import assert from 'node:assert/strict';
import { constants, generateKeyPairSync, privateEncrypt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const workspace = resolve(process.argv[2] || '.');
const lock = readFileSync(resolve(workspace, 'pnpm-lock.yaml'), 'utf8');
function installed(name, version) {
  const escaped = name.replaceAll('-', '\\-');
  const hash = lock.match(new RegExp(`^  ${escaped}@${version.replaceAll('.', '\\.')}:[ \\t]+([a-f0-9]{64})$`, 'm'))?.[1];
  assert.ok(hash, `Missing pinned patch for ${name}`);
  assert.ok(!lock.includes(`  ${name}@${version}: {}`), `Unpatched snapshot: ${name}`);
  assert.ok(!new RegExp(`^\\s+${escaped}: ${version.replaceAll('.', '\\.')}\\s*$`, 'm').test(lock), `Unpatched dependency edge: ${name}`);
  const path = resolve(workspace, `node_modules/.pnpm/${name}@${version}_patch_hash=${hash}/node_modules/${name}`);
  return createRequire(import.meta.url)(path);
}

const braces = installed('braces', '3.0.3');
assert.equal(braces.compile('src/{app,lib}/file-{1..3}.ts'), 'src/(app|lib)/file-([1-3]).ts');
assert.deepEqual(braces.expand('file-{a,{b,c}}'), ['file-a', 'file-b', 'file-c']);
assert.equal(braces.stringify(braces.parse('foo/{a,b}/bar')), 'foo/{a,b}/bar');
const bounded = error => error instanceof SyntaxError && /maximum depth/.test(error.message);
for (const [open, close] of [['{', '}'], ['(', ')']]) {
  for (const input of [open.repeat(4000) + 'a,b' + close.repeat(4000), open.repeat(4000)]) {
    for (const action of ['parse', 'compile', 'expand', 'stringify']) {
      assert.throws(() => braces[action](input), bounded, action);
    }
  }
}
let tree = { type: 'text', value: 'x' };
for (let i = 0; i < 10000; i++) tree = { type: 'root', nodes: [tree] };
for (const action of ['compile', 'expand', 'stringify']) {
  assert.throws(() => braces[action](tree), bounded, `AST ${action}`);
}
// Escapes and quotes do not consume parser nesting depth.
assert.doesNotThrow(() => braces.compile('\\{'.repeat(200)));
assert.doesNotThrow(() => braces.compile('"' + '{'.repeat(200) + '"'));
console.log('PASS braces: normal globs, deep braces/parentheses, malformed input and ASTs');

if (lock.includes('  node-forge@1.4.0:')) {
  const forge = installed('node-forge', '1.4.0');
  // Ephemeral test-only key. Signing malformed DigestInfo with the private key
  // isolates parser acceptance; no attack against any external key is needed.
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 3 });
  const verifier = forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }));
  const digest = forge.md.sha256.create().update('SFM dependency regression fixture').digest().getBytes();
  const { asn1 } = forge;
  const node = (type, value, constructed = false) => asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  const oid = node(asn1.Type.OID, asn1.oidToDer(forge.oids.sha256).getBytes());
  const nil = node(asn1.Type.NULL, '');
  const garbage = node(asn1.Type.OCTETSTRING, 'unconsumed');
  function signature(children, trailing = []) {
    const info = node(asn1.Type.SEQUENCE, [node(asn1.Type.SEQUENCE, children, true), node(asn1.Type.OCTETSTRING, digest), ...trailing], true);
    const der = Buffer.from(asn1.toDer(info).getBytes(), 'binary');
    return privateEncrypt({ key: privateKey, padding: constants.RSA_PKCS1_PADDING }, der).toString('binary');
  }
  assert.equal(verifier.verify(digest, signature([oid, nil])), true);
  assert.equal(verifier.verify(digest, signature([oid])), true);
  for (const children of [[oid, nil, garbage], [oid, garbage], [oid, nil, nil]]) {
    assert.throws(() => verifier.verify(digest, signature(children)), /DigestInfo/);
  }
  assert.throws(() => verifier.verify(digest, signature([oid, nil], [garbage])), /DigestInfo/);
  assert.equal(verifier.verify('wrong-digest', signature([oid, nil])), false);
  console.log('PASS node-forge: valid RSA signatures and rejection of nested/trailing DigestInfo garbage');
}
