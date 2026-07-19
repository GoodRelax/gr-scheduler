/**
 * Unit coverage for the [AI] helper's pure payload builders (SHELL batch item 5).
 *
 * The modal's copyable payload is `prompt + schema`, where the schema MUST be the
 * exact SSOT re-exported by document-schema.ts (inlined at build). These assertions
 * pin that contract so the schema can never silently drift from the codec, and that
 * the English prompt instructs the AI to emit ONLY valid conforming JSON. The
 * opened-dialog DOM behavior (role=dialog, Esc closes, Copy writes) is asserted in
 * tests/e2e.
 */

import { describe, expect, it } from 'vitest';
import {
  buildAiClipboardPayload,
  buildAiPromptText,
  schemaJsonText,
} from '../src/adapters/ui/ai-export-modal.js';
import {
  GR_SCHEDULER_DOCUMENT_SCHEMA,
  GR_SCHEDULER_DOCUMENT_SCHEMA_ID,
} from '../src/domain/usecase/document-schema.js';

describe('schemaJsonText', () => {
  it('is exactly the SSOT schema, pretty-printed (no divergence)', () => {
    expect(schemaJsonText()).toBe(JSON.stringify(GR_SCHEDULER_DOCUMENT_SCHEMA, null, 2));
  });
});

describe('buildAiPromptText', () => {
  it('instructs the AI to output ONLY valid conforming JSON and references the schema id', () => {
    const prompt = buildAiPromptText();
    expect(prompt).toContain('Output ONLY valid JSON');
    expect(prompt).toContain('conform to the JSON Schema');
    expect(prompt).toContain(GR_SCHEDULER_DOCUMENT_SCHEMA_ID);
    // Mentions the key mappings the AI must perform.
    expect(prompt).toContain('milestone');
    expect(prompt).toContain('task');
    expect(prompt).toContain('planActualKind');
  });

  it('is ASCII only (no NUL / control characters; live-CSP hazard guard)', () => {
    const asciiClean = [...buildAiPromptText()].every((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    });
    expect(asciiClean).toBe(true);
  });
});

describe('buildAiClipboardPayload', () => {
  it('is the prompt followed by the exact schema JSON', () => {
    const payload = buildAiClipboardPayload();
    expect(payload.startsWith(buildAiPromptText())).toBe(true);
    expect(payload).toContain(schemaJsonText());
  });
});
