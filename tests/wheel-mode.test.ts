import { describe, expect, it } from 'vitest';
import { resolveWheelMode, type WheelModifiers } from '../src/adapters/input/wheel-mode.js';

function mods(partial: Partial<WheelModifiers>): WheelModifiers {
  return { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...partial };
}

describe('resolveWheelMode (item: wheel/zoom remap)', () => {
  it('plain wheel (no modifier) scrolls vertically', () => {
    expect(resolveWheelMode(mods({}))).toBe('scroll-vertical');
  });

  it('Ctrl + wheel zooms BOTH axes', () => {
    expect(resolveWheelMode(mods({ ctrlKey: true }))).toBe('zoom-both');
  });

  it('Meta (Cmd) is treated as Ctrl, zooming both axes', () => {
    expect(resolveWheelMode(mods({ metaKey: true }))).toBe('zoom-both');
  });

  it('Shift + wheel zooms the width / time axis only', () => {
    expect(resolveWheelMode(mods({ shiftKey: true }))).toBe('zoom-x');
  });

  it('Alt + wheel zooms the height / row axis only', () => {
    expect(resolveWheelMode(mods({ altKey: true }))).toBe('zoom-y');
  });

  it('Ctrl + Shift + wheel scrolls horizontally', () => {
    expect(resolveWheelMode(mods({ ctrlKey: true, shiftKey: true }))).toBe('scroll-horizontal');
    expect(resolveWheelMode(mods({ metaKey: true, shiftKey: true }))).toBe('scroll-horizontal');
  });

  it('gives Ctrl precedence over a lone Alt', () => {
    expect(resolveWheelMode(mods({ ctrlKey: true, altKey: true }))).toBe('zoom-both');
  });
});
