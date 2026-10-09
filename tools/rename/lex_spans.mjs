// Comments and string text of JS / TS source, from real tokens (CR-708 reconcile item 14).
//
//   node tools/rename/lex_spans.mjs <root>      reads a JSON array of relative paths on stdin,
//                                               writes {path: [[start, end, kind], ...] | null}
//
// The light lexer the rename tools used first (rename_common.code_segments)
// was derailed by a backtick inside a comment: it then read the following code
// as a string. This one parses with @babel/parser (found in a node_modules
// folder above this file or above <root>) and reports
//   comment   every comment, delimiters included,
//   string    every string literal (quotes included), every template literal
//             without substitutions (backticks included), and the text parts
//             of a template with substitutions (${...} is code),
//   regex     every regular expression literal (slashes and flags included).
// Offsets count Unicode code points of the text with CRLF turned into LF, the
// way rename_common.read_text reads it, so Python can use them as they are.
// A file babel cannot parse maps to null; the caller falls back and says so.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function findBabel(start) {
  let dir = start;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', '@babel', 'parser', 'package.json');
    if (fs.existsSync(candidate)) return createRequire(candidate)('@babel/parser');
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'comments', 'leadingComments',
  'trailingComments', 'innerComments', 'range', 'tokens']);

function collect(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out);
    return;
  }
  switch (node.type) {
    case 'StringLiteral':
    case 'DirectiveLiteral':
      out.push([node.start, node.end, 'string']);
      return;
    case 'RegExpLiteral':
      // a pattern can spell a DOM name (/data-figure="row-.../) that a string
      // elsewhere writes: list it with the strings so a reader decides it
      out.push([node.start, node.end, 'regex']);
      return;
    case 'TemplateLiteral':
      if (node.expressions.length === 0) {
        out.push([node.start, node.end, 'string']);
        return;
      }
      for (const q of node.quasis) out.push([q.start, q.end, 'string']);
      for (const e of node.expressions) collect(e, out);
      return;
    default:
      break;
  }
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const v = node[key];
    if (v && typeof v === 'object') collect(v, out);
  }
}

// UTF-16 offset -> code point offset
function pointMap(text) {
  if (!/[\uD800-\uDBFF]/.test(text)) return null;
  const map = new Int32Array(text.length + 1);
  let cp = 0;
  for (let i = 0; i < text.length; i += 1) {
    map[i] = cp;
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      map[i + 1] = cp;
      i += 1;
    }
    cp += 1;
  }
  map[text.length] = cp;
  return map;
}

export function lexSpans(babel, text, ext, codePoints = true) {
  const out = [];
  if (ext === '.json') {
    // a JSON module of the TypeScript program: one expression, every string is text
    collect(babel.parseExpression(text.replace(/^﻿/, ' '), { errorRecovery: true }), out);
  } else {
    const plugins = ext === '.ts' ? ['typescript'] : ext === '.tsx' ? ['typescript', 'jsx'] : [];
    const ast = babel.parse(text, {
      sourceType: 'unambiguous', plugins, errorRecovery: true,
      allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true, allowUndeclaredExports: true,
    });
    for (const c of ast.comments ?? []) out.push([c.start, c.end, 'comment']);
    collect(ast.program, out);
  }
  const map = codePoints ? pointMap(text) : null;
  const spans = map ? out.map(([s, e, k]) => [map[s], map[e], k]) : out;
  return spans.sort((a, b) => a[0] - b[0]);
}

export function loadBabel(root) {
  return findBabel(HERE) ?? (root ? findBabel(root) : null);
}

async function main() {
  const root = path.resolve(process.argv[2] ?? path.join(HERE, '..', '..'));
  const babel = loadBabel(root);
  if (!babel) throw new Error('@babel/parser not found above ' + HERE);
  const input = fs.readFileSync(0, 'utf8');
  const result = {};
  for (const rel of JSON.parse(input)) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
    try {
      result[rel] = lexSpans(babel, text, path.extname(rel));
    } catch {
      result[rel] = null;
    }
  }
  process.stdout.write(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
