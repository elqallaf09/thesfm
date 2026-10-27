import { describe, expect, it } from 'vitest';
import { tvRemoteCommand } from '@/components/markets-tv/tvRemoteKeys';

const key = (value: string, keyCode = 0, extra = {}) => ({ key: value, keyCode, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, ...extra });

describe('TV keyboard and remote navigation contracts', () => {
  it('uses one back action for Samsung, LG, browser and keyboard controls', () => {
    for (const event of [key('Unidentified', 10009), key('Unidentified', 461), key('BrowserBack'), key('Escape'), key('Backspace')]) {
      expect(tvRemoteCommand(event, { tagName: 'BUTTON' })).toEqual({ kind: 'back' });
    }
  });

  it('keeps text deletion, caret motion, composition and browser shortcuts native', () => {
    const input = { tagName: 'INPUT', type: 'search' };
    for (const event of [key('Backspace'), key('ArrowLeft'), key('ArrowRight'), key('Enter'), key(' ')]) expect(tvRemoteCommand(event, input)).toBeNull();
    expect(tvRemoteCommand(key('Enter', 13, { isComposing: true }), { tagName: 'BUTTON' })).toBeNull();
    expect(tvRemoteCommand(key('ArrowLeft', 37, { altKey: true }))).toBeNull();
    expect(tvRemoteCommand(key('b', 66), { tagName: 'BUTTON' })).toBeNull();
    expect(tvRemoteCommand(key('ArrowDown'), input)).toEqual({ kind: 'arrow', direction: 'ArrowDown' });
  });

  it('lets native selects, sliders, number fields and expanded suggestions keep their arrow keys', () => {
    for (const target of [{ tagName: 'SELECT' }, { tagName: 'TEXTAREA' }, { tagName: 'INPUT', type: 'range' },
      { tagName: 'INPUT', type: 'number' }, { tagName: 'INPUT', expanded: true }, { tagName: 'DIV', isContentEditable: true }]) {
      expect(tvRemoteCommand(key('ArrowDown'), target)).toBeNull();
    }
    expect(tvRemoteCommand(key('Enter'), { tagName: 'SUMMARY' })).toEqual({ kind: 'activate' });
    expect(tvRemoteCommand(key('Enter'), { tagName: 'INPUT', type: 'checkbox' })).toEqual({ kind: 'activate' });
  });

  it('distinguishes an explicit pause from a toggle to keep playback state predictable', () => {
    expect(tvRemoteCommand(key('Unidentified', 10252))).toEqual({ kind: 'playback', action: 'toggle' });
    expect(tvRemoteCommand(key('Unidentified', 415))).toEqual({ kind: 'playback', action: 'play' });
    expect(tvRemoteCommand(key('Unidentified', 19))).toEqual({ kind: 'playback', action: 'pause' });
    expect(tvRemoteCommand(key('MediaPause'))).toEqual({ kind: 'playback', action: 'pause' });
  });
});
