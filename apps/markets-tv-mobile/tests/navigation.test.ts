import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyLink, HOME_URL, readPresentation } from '../src/navigation.ts';

test('SFM pages and authentication stay in the app', () => {
  for (const path of ['/tv', '/tv/all-stocks', '/tv/strips', '/tv/pair', '/login?next=%2Ftv', '/auth/callback?code=example']) {
    assert.equal(classifyLink(`https://www.the-sfm.com${path}`), 'internal');
  }
  assert.equal(classifyLink('https://the-sfm.com/tv'), 'internal');
});

test('news HTTPS links open externally and lookalike domains cannot access the native bridge', () => {
  for (const url of ['https://example.com/news', 'https://www.the-sfm.com.evil.example/', 'https://not-the-sfm.com/tv']) assert.equal(classifyLink(url), 'external');
});

test('unsafe protocols, credentials, malformed URLs and alternate ports are blocked', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///private/test', 'http://www.the-sfm.com/tv',
    'intent://example', 'https://user:password@www.the-sfm.com/tv', 'https://www.the-sfm.com:8443/tv',
    ' https://www.the-sfm.com', 'https://www.the-sfm.com\\@evil.example', '', '/tv', 'https://example.com/\n']) {
    assert.equal(classifyLink(url), 'blocked', url);
  }
  assert.equal(classifyLink('about:blank'), 'blank');
});

test('only bounded first-party presentation messages are accepted', () => {
  const valid = JSON.stringify({ type: 'sfm-tv-presentation', theme: 'light', language: 'ar' });
  assert.deepEqual(readPresentation(valid, HOME_URL), { theme: 'light', language: 'ar' });
  for (const origin of ['https://example.com', 'about:blank', 'https://the-sfm.com.evil.example']) assert.equal(readPresentation(valid, origin), null);
  for (const message of ['{', 'null', '[]', '{}', 'x'.repeat(513),
    JSON.stringify({ type: 'navigate', theme: 'dark', language: 'ar' }),
    JSON.stringify({ type: 'sfm-tv-presentation', theme: 'invalid', language: 'ar' }),
    JSON.stringify({ type: 'sfm-tv-presentation', theme: 'dark', language: 'invalid' })]) assert.equal(readPresentation(message, HOME_URL), null);
});
