import { describe, expect, it } from 'vitest';
import { resolveI18nValue, uiLabel } from '../src/domain/usecase/i18n.js';

describe('i18n resolver (PROP-L1-003, ADR-008)', () => {
  it('returns the active-locale value from a locale map', () => {
    const value = { en: 'Design', ja: '設計' };
    expect(resolveI18nValue(value, 'ja')).toBe('設計');
    expect(resolveI18nValue(value, 'en')).toBe('Design');
  });

  it('falls back to the default locale when the active locale is missing', () => {
    expect(resolveI18nValue({ en: 'Only English' }, 'ja')).toBe('Only English');
  });

  it('falls back to any present locale when neither active nor default exist', () => {
    expect(resolveI18nValue({ ja: 'のみ' }, 'en')).toBe('のみ');
  });

  it('passes a plain string value through unchanged (literal, not translated)', () => {
    expect(resolveI18nValue('Vehicle A', 'ja')).toBe('Vehicle A');
  });

  it('returns an empty string for an undefined or empty value', () => {
    expect(resolveI18nValue(undefined, 'en')).toBe('');
    expect(resolveI18nValue({}, 'en')).toBe('');
  });

  it('localizes built-in UI labels and echoes unknown keys', () => {
    expect(uiLabel('undo', 'ja')).toBe('元に戻す');
    expect(uiLabel('undo', 'en')).toBe('Undo');
    expect(uiLabel('tools', 'ja')).toBe('ツール');
    expect(uiLabel('does_not_exist', 'en')).toBe('does_not_exist');
  });
});
