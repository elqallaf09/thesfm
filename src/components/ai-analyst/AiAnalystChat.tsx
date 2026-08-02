'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import type { IntelligenceAssetType } from '@/domain/intelligence/contracts';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import { buildChatTranscript, buildWelcomeMessage, type ChatMessage, type WelcomeAssetSummary } from './chatTranscript';
import { AI_ANALYST_COPY, ASSET_TYPE_LABELS, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

type LatestAssetResponse = { ok?: boolean; result?: { asset?: { name: string; displaySymbol: string; assetType: IntelligenceAssetType } } };

export function AiAnalystChat({ symbol, assetType }: { symbol?: string; assetType?: IntelligenceAssetType }) {
  const { lang, dir } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale].chat;
  const { user, isGuest } = useAuth();
  const canChat = Boolean(user) && !isGuest;

  const [resolvedAsset, setResolvedAsset] = useState<WelcomeAssetSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Best-effort, read-only lookup of the already-verified asset (if any
  // analysis exists for it) purely to personalize the welcome bubble and to
  // pass a verified type label through the handoff. Never used to fabricate
  // a classification on its own -- the chat request itself always sends the
  // raw symbol/assetType and lets /api/intelligence/chat re-verify it
  // server-side before ever answering.
  useEffect(() => {
    if (!symbol || !assetType) {
      setResolvedAsset(null);
      return;
    }
    let active = true;
    const params = new URLSearchParams({ symbol, assetType, horizon: 'SWING', locale });
    fetch(`/api/intelligence/latest?${params.toString()}`, { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then(response => (response.ok ? response.json() as Promise<LatestAssetResponse> : null))
      .then(payload => {
        if (!active || !payload?.ok || !payload.result?.asset) return;
        const asset = payload.result.asset;
        setResolvedAsset({ name: asset.name, displaySymbol: asset.displaySymbol, assetTypeLabel: ASSET_TYPE_LABELS[locale][asset.assetType] });
      })
      .catch(() => { /* welcome falls back to the generic form; nothing is guessed */ });
    return () => { active = false; };
  }, [assetType, locale, symbol]);

  const welcome = useMemo(() => buildWelcomeMessage(copy, resolvedAsset), [copy, resolvedAsset]);
  const transcript = useMemo(() => buildChatTranscript(messages, welcome), [messages, welcome]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || loading || !canChat) return;
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/intelligence/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          domain: symbol ? 'market' : 'finance',
          messages: nextMessages,
          asset: symbol && assetType ? { symbol, assetType } : null,
          locale,
          sourceRoute: '/ai-analyst/assistant',
        }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; text?: string };
      setMessages([...nextMessages, { role: 'assistant', content: payload.ok && payload.text ? payload.text : copy.fallback }]);
    } catch {
      setMessages([...nextMessages, { role: 'assistant', content: copy.unavailable }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const signInHref = useMemo(() => loginHrefForCurrentLocation('/ai-analyst/assistant'), []);

  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-chat-title">
        <header className={styles.cardHeader}>
          <div>
            <h2 id="ai-analyst-chat-title">{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </header>
        <div className={styles.statusRail}>{copy.disclaimer}</div>

        <div className={styles.chatTranscript} ref={transcriptRef} role="log" aria-live="polite" data-testid="ai-analyst-chat-transcript">
          {transcript.map((message, index) => (
            <div key={`${message.role}-${index}`} className={styles.chatBubble} data-role={message.role}>
              {message.content}
            </div>
          ))}
          {loading ? <div className={styles.chatBubble} data-role="assistant" role="status">{copy.loading}</div> : null}
        </div>

        {canChat ? (
          <div className={styles.chatInputRow}>
            <input
              ref={inputRef}
              id="ai-analyst-chat-input"
              dir={dir}
              value={input}
              disabled={loading}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') void sendMessage();
              }}
              placeholder={copy.placeholder}
            />
            <button type="button" className={styles.disclosureButton} aria-label={copy.send} disabled={loading || !input.trim()} onClick={() => void sendMessage()}>
              <Send size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className={styles.statusRail} role="status">
            {/* loginHrefForCurrentLocation() deliberately returns a fixed
                fallback during SSR (no window) and the exact current
                URL (incl. query) once mounted client-side, the same
                intentional SSR/client difference the root layout already
                suppresses for `dir`/`lang` — this link corrects itself the
                moment React hydrates, before it is ever clickable. */}
            {copy.signInRequired} <Link className={styles.linkAction} href={signInHref} suppressHydrationWarning>{copy.signIn}</Link>
          </div>
        )}
      </section>
    </div>
  );
}
