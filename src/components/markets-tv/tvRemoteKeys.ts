export type TvPlaybackCommand = 'toggle' | 'play' | 'pause';
export type TvRemoteCommand = { kind: 'back' } | { kind: 'activate' } | { kind: 'tab' }
  | { kind: 'arrow'; direction: string } | { kind: 'playback'; action: TvPlaybackCommand };
type Key = Pick<KeyboardEvent, 'key' | 'keyCode' | 'ctrlKey' | 'altKey' | 'metaKey' | 'isComposing'>;
type Target = { tagName?: string; type?: string; isContentEditable?: boolean; expanded?: boolean };

/** Keep native editing intact while mapping Samsung, LG and Android remote keys. */
export function tvRemoteCommand(event: Key, target: Target = {}): TvRemoteCommand | null {
  if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return null;
  const legacyKey = ({ 4: 'BrowserBack', 8: 'Backspace', 13: 'Enter', 19: 'MediaPause', 23: 'Enter', 27: 'Escape',
    37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 66: 'Enter', 166: 'BrowserBack',
    415: 'MediaPlay', 461: 'BrowserBack', 10009: 'BrowserBack', 10252: 'MediaPlayPause',
  } as Record<number, string>)[event.keyCode];
  const key = event.key && event.key !== 'Unidentified' ? event.key : legacyKey;
  const tag = target.tagName?.toUpperCase();
  const editing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag || '');
  if (['Escape', 'BrowserBack', 'GoBack', 'Back'].includes(key) || key === 'Backspace' && !editing) return { kind: 'back' };
  if (key === 'Tab') return { kind: 'tab' };
  if (key === 'MediaPlayPause' || key === 'MediaPlay' || key === 'MediaPause' || key === 'Pause') {
    return { kind: 'playback', action: key === 'MediaPlayPause' ? 'toggle' : key === 'MediaPlay' ? 'play' : 'pause' };
  }
  if (key === 'Enter' && tag === 'INPUT' && ['checkbox', 'radio', 'button', 'submit', 'reset'].includes(target.type || '')) return { kind: 'activate' };
  if (editing && (tag !== 'INPUT' || target.expanded || ['range', 'number', 'radio'].includes(target.type || '')
    || !['ArrowUp', 'ArrowDown'].includes(key))) return null;
  if (key === 'Enter') return { kind: 'activate' };
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return { kind: 'arrow', direction: key };
  return null;
}
