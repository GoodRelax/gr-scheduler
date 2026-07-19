import { describe, expect, it } from 'vitest';
import { isSafePaintValue, isValidColorValue } from '../src/domain/usecase/color-validator.js';

describe('color-validator (security-design C-02, M5a review M-3)', () => {
  it('accepts hex colors of every length', () => {
    for (const value of ['#fff', '#ffff', '#ffffff', '#ffffffff', '#0072B2']) {
      expect(isValidColorValue(value)).toBe(true);
    }
  });

  it('accepts functional rgb/rgba/hsl/hsla colors', () => {
    for (const value of ['rgb(1,2,3)', 'rgba(1, 2, 3, 0.5)', 'hsl(120, 50%, 40%)', 'hsla(0,0%,0%,1)']) {
      expect(isValidColorValue(value)).toBe(true);
    }
  });

  it('accepts CUD palette key names and hex values', () => {
    expect(isValidColorValue('red')).toBe(true);
    expect(isValidColorValue('dark_gray')).toBe(true);
    expect(isValidColorValue('#d55e00')).toBe(true);
  });

  it('accepts safe non-paint keywords', () => {
    for (const value of ['none', 'transparent', 'currentColor', 'inherit']) {
      expect(isValidColorValue(value)).toBe(true);
    }
  });

  it('REJECTS external paint references and script tokens (exfiltration guard)', () => {
    for (const value of [
      'url(http://evil/beacon)',
      'url(#internalGradient)',
      'expression(alert(1))',
      'javascript:alert(1)',
      'image(http://evil)',
      'redd',
      '',
      '   ',
    ]) {
      expect(isValidColorValue(value)).toBe(false);
    }
  });

  it('isSafePaintValue allows INTERNAL url(#id) refs but not external url()', () => {
    expect(isSafePaintValue('url(#grad)')).toBe(true);
    expect(isSafePaintValue("url('#grad')")).toBe(true);
    expect(isSafePaintValue('#ff0000')).toBe(true);
    expect(isSafePaintValue('none')).toBe(true);
    expect(isSafePaintValue('url(http://evil/beacon.png)')).toBe(false);
    expect(isSafePaintValue('url(data:image/svg+xml,...)')).toBe(false);
  });
});
