import { describe, expect, it } from 'vitest';
import { buildChatTranscript, buildWelcomeMessage, type ChatMessage } from '@/components/ai-analyst/chatTranscript';

const COPY = {
  welcomeGeneric: 'Hi, ask me anything.',
  welcomeWithAsset: 'Hi, I see {name} ({symbol}), classified as {assetType}.',
};

describe('buildWelcomeMessage', () => {
  it('uses the generic welcome when no asset context is available', () => {
    expect(buildWelcomeMessage(COPY, null)).toEqual({ role: 'assistant', content: 'Hi, ask me anything.' });
  });

  it('interpolates the verified asset into the personalized welcome', () => {
    const message = buildWelcomeMessage(COPY, { name: 'Apple Inc.', displaySymbol: 'AAPL', assetTypeLabel: 'Stocks' });
    expect(message).toEqual({ role: 'assistant', content: 'Hi, I see Apple Inc. (AAPL), classified as Stocks.' });
  });
});

describe('buildChatTranscript — exactly one welcome bubble', () => {
  const welcome: ChatMessage = { role: 'assistant', content: 'welcome' };

  it('shows exactly the welcome bubble, and nothing else, before any real message exists', () => {
    const transcript = buildChatTranscript([], welcome);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]).toBe(welcome);
    expect(transcript.filter(message => message === welcome)).toHaveLength(1);
  });

  it('replaces the welcome bubble entirely once a real message exists — it is never appended alongside it', () => {
    const real: ChatMessage[] = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }];
    const transcript = buildChatTranscript(real, welcome);
    expect(transcript).toEqual(real);
    expect(transcript).not.toContain(welcome);
  });

  it('stays stable (still exactly one welcome bubble) across repeated calls simulating hydration/locale changes/navigation', () => {
    for (let i = 0; i < 5; i += 1) {
      const transcript = buildChatTranscript([], welcome);
      expect(transcript.filter(message => message.role === 'assistant')).toHaveLength(1);
    }
  });

  it('never mutates the underlying messages array (defensive copy)', () => {
    const real: ChatMessage[] = [{ role: 'user', content: 'hi' }];
    const transcript = buildChatTranscript(real, welcome);
    transcript.push({ role: 'assistant', content: 'mutated' });
    expect(real).toHaveLength(1);
  });
});
