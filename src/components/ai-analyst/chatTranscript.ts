export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type WelcomeAssetSummary = {
  name: string;
  displaySymbol: string;
  assetTypeLabel: string;
};

// Pure and deliberately trivial: the welcome bubble is never stored in the
// real message state, so there is exactly one construction site for it and
// no code path that can accidentally push a second copy into history —
// covered directly by aiAnalystChatWelcome.test.ts.
export function buildWelcomeMessage(
  copy: { welcomeGeneric: string; welcomeWithAsset: string },
  asset: WelcomeAssetSummary | null,
): ChatMessage {
  if (!asset) return { role: 'assistant', content: copy.welcomeGeneric };
  const content = copy.welcomeWithAsset
    .replace('{name}', asset.name)
    .replace('{symbol}', asset.displaySymbol)
    .replace('{assetType}', asset.assetTypeLabel);
  return { role: 'assistant', content };
}

// The synthetic welcome bubble is shown only in the empty state, and is
// never part of `messages` itself — so it can never be persisted, sent to
// the model as prior context, or duplicated alongside a real assistant
// reply.
export function buildChatTranscript(messages: readonly ChatMessage[], welcome: ChatMessage): ChatMessage[] {
  return messages.length > 0 ? [...messages] : [welcome];
}
