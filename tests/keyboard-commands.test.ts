import { describe, expect, it } from 'vitest';
import {
  resolveCanvasKeyCommand,
  type KeyChord,
} from '../src/domain/usecase/keyboard-commands.js';

function chord(key: string, extra: Partial<KeyChord> = {}): KeyChord {
  return { key, shiftKey: false, ctrlOrMeta: false, ...extra };
}

describe('resolveCanvasKeyCommand (WCAG 2.1.1 keyboard mapping)', () => {
  it('maps horizontal arrows to a +/-1 day nudge', () => {
    expect(resolveCanvasKeyCommand(chord('ArrowRight'))).toEqual({
      kind: 'nudge',
      deltaDays: 1,
      deltaRows: 0,
    });
    expect(resolveCanvasKeyCommand(chord('ArrowLeft'))).toEqual({
      kind: 'nudge',
      deltaDays: -1,
      deltaRows: 0,
    });
  });

  it('maps vertical arrows to a +/-1 row nudge', () => {
    expect(resolveCanvasKeyCommand(chord('ArrowUp'))).toEqual({
      kind: 'nudge',
      deltaDays: 0,
      deltaRows: -1,
    });
    expect(resolveCanvasKeyCommand(chord('ArrowDown'))).toEqual({
      kind: 'nudge',
      deltaDays: 0,
      deltaRows: 1,
    });
  });

  it('maps Shift + horizontal arrow to a resize', () => {
    expect(resolveCanvasKeyCommand(chord('ArrowRight', { shiftKey: true }))).toEqual({
      kind: 'resize',
      deltaDays: 1,
    });
    expect(resolveCanvasKeyCommand(chord('ArrowLeft', { shiftKey: true }))).toEqual({
      kind: 'resize',
      deltaDays: -1,
    });
  });

  it('maps Tab / Shift+Tab to item focus roving (2.1.2 boundary escape handled by adapter)', () => {
    expect(resolveCanvasKeyCommand(chord('Tab'))).toEqual({ kind: 'focus-next' });
    expect(resolveCanvasKeyCommand(chord('Tab', { shiftKey: true }))).toEqual({
      kind: 'focus-prev',
    });
  });

  it('maps Enter and Space to activate', () => {
    expect(resolveCanvasKeyCommand(chord('Enter'))).toEqual({ kind: 'activate' });
    expect(resolveCanvasKeyCommand(chord(' '))).toEqual({ kind: 'activate' });
    expect(resolveCanvasKeyCommand(chord('Spacebar'))).toEqual({ kind: 'activate' });
  });

  it('maps Escape to cancel', () => {
    expect(resolveCanvasKeyCommand(chord('Escape'))).toEqual({ kind: 'cancel' });
  });

  it('yields to the global shortcuts when Ctrl/Cmd is held', () => {
    expect(resolveCanvasKeyCommand(chord('ArrowRight', { ctrlOrMeta: true }))).toEqual({
      kind: 'none',
    });
    expect(resolveCanvasKeyCommand(chord('z', { ctrlOrMeta: true }))).toEqual({ kind: 'none' });
  });

  it('returns none for unmapped keys (no-op guard)', () => {
    expect(resolveCanvasKeyCommand(chord('a'))).toEqual({ kind: 'none' });
    expect(resolveCanvasKeyCommand(chord('F5'))).toEqual({ kind: 'none' });
    expect(resolveCanvasKeyCommand(chord('Home'))).toEqual({ kind: 'none' });
  });
});
