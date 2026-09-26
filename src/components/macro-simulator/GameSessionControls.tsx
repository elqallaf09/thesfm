'use client';
import { useEffect, useRef, useState } from 'react';
import { ROUND_IDS, type GameState } from '../../domain/macro-simulator/game';
import { MAX_GAME_SAVE_BYTES, gameStorageKey, restoreGame, serializeGame, type GameDraft, type RestoredGame } from '../../domain/macro-simulator/game-session';
import { sessionCopy, type SessionCopyKey, type SessionLanguage } from './session-copy';
import styles from './game.module.css';

type Props = { userKey: string; lang: SessionLanguage; game: GameState | null; draft: GameDraft; onResume: (session: RestoredGame) => void };
export function GameSessionControls({ userKey, lang, game, draft, onResume }: Props) {
  const t = (key: SessionCopyKey) => sessionCopy[key][lang];
  const [message, setMessage] = useState<SessionCopyKey | null>(null);
  const [error, setError] = useState<SessionCopyKey | null>(null);
  const [candidate, setCandidate] = useState<RestoredGame | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const operation = useRef(0);
  useEffect(() => { if (candidate || deleting) confirmRef.current?.focus(); }, [candidate, deleting]);
  useEffect(() => () => { operation.current += 1; }, []);
  function beginAction() {
    operation.current += 1;
    setMessage(null); setError(null); setCandidate(null); setDeleting(false);
    return operation.current;
  }
  function encodedGame(): string | null {
    if (!game) return null;
    try { return serializeGame(game, draft); } catch { setError('invalid'); return null; }
  }
  function save() {
    beginAction();
    const encoded = encodedGame(); if (!encoded) return;
    try { window.sessionStorage.setItem(gameStorageKey(userKey), encoded); setMessage('saved'); }
    catch { setError('storageError'); }
  }
  function load() {
    beginAction();
    let encoded: string | null;
    try { encoded = window.sessionStorage.getItem(gameStorageKey(userKey)); }
    catch { setError('storageError'); return; }
    if (!encoded) { setMessage('noSave'); return; }
    try { setCandidate(restoreGame(encoded)); } catch { setError('invalid'); }
  }
  function download() {
    beginAction();
    const encoded = encodedGame(); if (!encoded) return;
    let url: string | null = null;
    try {
      url = URL.createObjectURL(new Blob([encoded], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'sfm-macro-game-v1.json';
      document.body.appendChild(link); link.click(); link.remove();
    } catch { setError('invalid'); }
    finally { if (url) { const address = url; window.setTimeout(() => URL.revokeObjectURL(address), 1000); } }
  }
  async function importFile(file: File) {
    const token = beginAction();
    try {
      if (file.size > MAX_GAME_SAVE_BYTES) throw new Error('size');
      const encoded = await file.text();
      if (token !== operation.current) return;
      setCandidate(restoreGame(encoded));
    } catch { if (token === operation.current) setError('invalid'); }
  }
  function resume() {
    if (!candidate) return;
    onResume(candidate); beginAction(); setMessage('restored'); restoreRef.current?.focus();
  }
  function remove() {
    beginAction();
    try { window.sessionStorage.removeItem(gameStorageKey(userKey)); setMessage('deleted'); }
    catch { setError('storageError'); }
    restoreRef.current?.focus();
  }
  return <section className={styles.card} data-testid="macro-game-session" aria-label={t('title')}>
    <h2>{t('title')}</h2><p className={styles.muted}>{t('scope')}</p>
    <div className={styles.actions}>
      <button className={styles.button} type="button" disabled={!game} onClick={save}>{t('save')}</button>
      <button ref={restoreRef} className={styles.button} type="button" onClick={load}>{t('restore')}</button>
      <button className={styles.button} type="button" disabled={!game} onClick={download}>{t('export')}</button>
      <button className={styles.button} type="button" onClick={() => { beginAction(); fileRef.current?.click(); }}>{t('import')}</button>
      <button className={styles.button} type="button" onClick={() => { beginAction(); setDeleting(true); }}>{t('remove')}</button>
      <input ref={fileRef} type="file" hidden accept="application/json,.json" aria-label={t('import')} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (file) void importFile(file);
      }} />
    </div>
    {message ? <p className={styles.notice} role="status">{t(message)}</p> : null}
    {error ? <p className={styles.error} role="alert">{t(error)}</p> : null}
    {candidate || deleting ? <div className={styles.notice} role="group" aria-label={t(candidate ? 'replace' : 'deleteWarning')}>
      <p>{t(candidate ? 'replace' : 'deleteWarning')}</p>
      {candidate ? <p>{t('rounds')}: <bdi>{candidate.game.history.length} / {ROUND_IDS.length}</bdi></p> : null}
      <div className={styles.actions}>
        <button ref={confirmRef} type="button" className={styles.primary} onClick={candidate ? resume : remove}>{t(candidate ? 'confirmRestore' : 'confirmDelete')}</button>
        <button type="button" className={styles.button} onClick={() => { beginAction(); restoreRef.current?.focus(); }}>{t('cancel')}</button>
      </div>
    </div> : null}
    <details><summary>{t('privacy')}</summary><p className={styles.muted}>{t('transfer')}</p><p className={styles.muted}>{t('resetNote')}</p></details>
  </section>;
}
