/**
 * Unit coverage for the CR-006 Part 4 / DEC-005 modal language toggle at the DATA
 * level: the AI-export prompt and the Help catalogue localize between en / jp, while
 * the AI JSON SCHEMA block stays English so the copied schema never drifts from the
 * codec. The in-DOM toggle button (inserted to the LEFT of the modal's `x` close) is
 * exercised in tests/e2e; here we pin the pure builders it switches between.
 */

import { describe, expect, it } from 'vitest';
import {
  buildAiClipboardPayload,
  buildAiPromptText,
  schemaJsonText,
} from '../src/adapters/ui/ai-export-modal.js';
import {
  buildHelpModel,
  helpTitle,
  helpUsageHint,
  HELP_USAGE_HINT,
} from '../src/adapters/ui/help-modal.js';
import { GR_SCHEDULER_DOCUMENT_SCHEMA_ID } from '../src/domain/usecase/document-schema.js';

const CJK_PATTERN = /[぀-ヿ一-鿿]/;

describe('CR-006 Part 4: AI prompt localizes but the schema stays English', () => {
  it('returns a different prompt for ja than en', () => {
    const en = buildAiPromptText('en');
    const ja = buildAiPromptText('ja');
    expect(ja).not.toBe(en);
    expect(CJK_PATTERN.test(ja)).toBe(true);
    expect(CJK_PATTERN.test(en)).toBe(false);
  });

  it('keeps the field / schema identifiers English in the ja prompt', () => {
    const ja = buildAiPromptText('ja');
    for (const token of ['startDate', 'endDate', 'actualStart', 'majorCategory', 'abbrev']) {
      expect(ja).toContain(token);
    }
    expect(ja).toContain(GR_SCHEDULER_DOCUMENT_SCHEMA_ID);
  });

  it('defaults to English when no locale is given (back-compat)', () => {
    expect(buildAiPromptText()).toBe(buildAiPromptText('en'));
    expect(buildAiClipboardPayload()).toBe(buildAiClipboardPayload('en'));
  });

  it('appends the EXACT English schema JSON regardless of the prompt language', () => {
    const schema = schemaJsonText();
    expect(CJK_PATTERN.test(schema)).toBe(false);
    const jaPayload = buildAiClipboardPayload('ja');
    const enPayload = buildAiClipboardPayload('en');
    expect(jaPayload).toContain(schema);
    expect(enPayload).toContain(schema);
    // The prompt differs by language; the trailing schema block is byte-identical.
    expect(jaPayload.startsWith(buildAiPromptText('ja'))).toBe(true);
    expect(jaPayload.endsWith(`${schema}\n`)).toBe(true);
    expect(enPayload.endsWith(`${schema}\n`)).toBe(true);
  });
});

describe('CR-006 Part 4: Help catalogue localizes between en / jp', () => {
  it('returns Japanese section titles for ja and English for en', () => {
    const en = buildHelpModel('en');
    const ja = buildHelpModel('ja');
    expect(ja.length).toBe(en.length);
    expect(en[0]?.title).toBe('Create & draw');
    expect(ja[0]?.title).toBe('作成・描画');
    const jaText = ja.flatMap((s) => s.entries.map((e) => e.feature)).join(' ');
    expect(CJK_PATTERN.test(jaText)).toBe(true);
  });

  it('defaults to the English catalogue (back-compat)', () => {
    expect(buildHelpModel()).toEqual(buildHelpModel('en'));
  });

  it('keeps every keyboard shortcut ASCII in both languages', () => {
    for (const locale of ['en', 'ja'] as const) {
      const shortcuts = buildHelpModel(locale).flatMap((section) =>
        section.entries.flatMap((entry) => (entry.shortcut === undefined ? [] : [entry.shortcut])),
      );
      for (const shortcut of shortcuts) {
        const asciiClean = [...shortcut].every((character) => {
          const code = character.charCodeAt(0);
          return code >= 32 && code <= 126;
        });
        expect(asciiClean, `non-ASCII shortcut (${locale}): ${shortcut}`).toBe(true);
      }
    }
  });

  it('localizes the dialog title and usage hint', () => {
    expect(helpTitle('en')).toBe('gr-scheduler help');
    expect(CJK_PATTERN.test(helpTitle('ja'))).toBe(true);
    expect(helpUsageHint('en')).toBe(HELP_USAGE_HINT);
    expect(CJK_PATTERN.test(helpUsageHint('ja'))).toBe(true);
  });
});
