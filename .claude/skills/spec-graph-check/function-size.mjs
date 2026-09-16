// Check 56 helper -- parses TypeScript with rolldown/parseAst and measures
// every function's line count and branch count. Called by
// check-function-size.py, which owns the baseline, the ratchet and the
// self-test data; this file only turns source text into numbers.
//
// PROTOCOL. Reads one JSON object from stdin:
//   { "files": [ { "file": "<key, e.g. src/a/b.ts>", "text": "<source>" } ] }
// and writes one JSON object to stdout:
//   { "functions": [ { "file", "name", "lines", "branches", "startLine",
//                       "endLine" } ],
//     "duplicates": [ { "file", "name", "count" } ],
//     "errors": [ { "file", "message" } ] }
// A parse error for one file is recorded in "errors" and that file
// contributes no functions; it is not fatal to the run. Exit code is 0
// unless stdin cannot be read as the JSON shape above. "duplicates" should
// always be empty -- see NAME COLLISIONS below, which resolves every
// within-file collision before "functions" is built; a non-empty
// "duplicates" means that resolution itself has a bug.
//
// WHAT COUNTS AS A FUNCTION: FunctionDeclaration, FunctionExpression and
// ArrowFunctionExpression nodes with a body (a TSDeclareFunction -- an
// overload signature or an ambient `declare function` -- parses to its own
// node type with body: null and is never visited as one of the three above,
// so overload signatures are never counted; only the implementation is).
//
// LINES: the node's own start/end character offsets (as rolldown/oxc report
// them -- from the `function` keyword or the arrow's parameter list, to the
// closing brace or, for a concise arrow body, the end of the expression),
// mapped to 1-based source lines and counted inclusive. Blank lines and
// comment lines inside the span are counted; nothing is stripped.
//
// BRANCHES, one point each, counted for the innermost enclosing function
// only (a branch inside a nested function is never charged to the outer
// one): IfStatement, ConditionalExpression (the ternary), ForStatement,
// ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement,
// CatchClause, a SwitchCase that carries a test (the `default:` case does
// not), and a LogicalExpression whose operator is `&&`, `||` or `??`.
//
// NAME: the function's own id when it has one (a FunctionDeclaration's name,
// or a named FunctionExpression's); otherwise the name it is assigned to --
// a VariableDeclarator's identifier, an object Property or class
// PropertyDefinition/MethodDefinition's key (a computed key is not read,
// since it is not a static name), or the left side of a plain
// AssignmentExpression (an Identifier, or a non-computed MemberExpression's
// property). A private class method (`#foo`) is named `#foo`.
//
// ANONYMOUS FUNCTIONS (JDG-124, recommendation 2): none of the above gives
// a name -- a bare callback, an IIFE, a default-exported function
// expression. Named `<outer>#<n>`, where <outer> is the already-resolved
// name of the nearest enclosing function and <n> counts, in source order,
// only the anonymous functions directly inside that one enclosing function
// (a nested anonymous function two functions down does not share its
// grandparent's count). A top-level anonymous function -- nested in no
// function at all -- has no <outer> to name, so it is `#<n>` alone, <n>
// counting anonymous top-level functions in that one file (a file-level
// sequence, per the brief). Because an outer function's own name may itself
// be an anonymous `...#n` name, and that name is only settled when the
// outer function is first visited, this walk assigns every name during a
// single top-down pass: a function's name is always resolved before its
// children are visited, so a child anonymous function can always read its
// already-named parent off the enclosing-function stack.
//
// NAME COLLISIONS WITHIN ONE FILE (front-session ruling, extending JDG-124
// recommendation 2 rather than replacing it -- this note documents that
// extension). Two functions in one file can resolve to the very same name
// above -- a getter and setter of one property, same-named methods of two
// classes in one file, or (the common real case here) several sibling
// object literals that each implement the same interface and so each carry
// a same-named method, e.g. 21 "invariant" objects each with its own
// `find: ({ schedule }) => {...}`. None of those carries a class or
// container qualifier this script can read as a name.
//
// So, after every function in a file has the name given above, a SECOND,
// file-local pass walks them again in source order (by each function's own
// start offset) and, within each group of equal names, leaves the FIRST
// occurrence exactly as named and appends `~2`, `~3`, ... to the second and
// later ones. `~` rather than `#` is deliberate: `#` always means "this
// function had no name of its own, so it borrows its outer function's" (the
// anonymous rule above), while `~` always means "this function HAD a name,
// and it collided with an earlier sibling" -- the two are never the same
// question, so a reader (or another script) can tell which happened from
// the punctuation alone, even after both fire on one function (an anonymous
// function's `outer#n` name can itself collide with a sibling's, and then
// gets `~2` appended in turn, e.g. `find#1~2`).
//
// ⚠️ CAVEAT, read together with check-function-size.py's docstring and its
// printed NOTE line: because the `~n` (and `#n`) suffix is assigned by
// SOURCE ORDER, inserting a new same-named function ABOVE an existing one
// renumbers every sibling below it, even though nothing about those other
// functions changed. In the baseline this reads as one HELD line going
// stale (the old key, e.g. `find~3`, no longer exists) paired with one
// newly-banded function appearing under the shifted key (`find~4`) -- both
// red, for one edit that renamed nothing on purpose. The fix is the same as
// any other stale-plus-new pair here: update function-size-baseline.txt in
// the same commit.
//
// ⚠️ A second, smaller consequence of running this pass file-globally,
// AFTER the anonymous `#n` naming above rather than folded into it: an
// anonymous function's `outer#n` piece is built from its outer's name AS
// IT STOOD DURING THE FIRST PASS, before this second pass might rename that
// very outer to `outer~2`. The child's printed key can then show the
// outer's original, pre-collision name (`outer#1`) even though the outer
// itself now prints as `outer~2`. This is intentional, not a bug: chasing
// the rename through every descendant would need a third pass keyed on
// object identity rather than strings, for a cross-reference this script
// does not otherwise need, and the DUPLICATE-KEY check below still catches
// it if that mismatch ever produced two identical strings.
//
// Only a key that STILL repeats after this pass is reported as a
// "duplicate" (in the `duplicates` output below) -- by construction that
// should never happen (every group's members get distinct suffixes), so
// the caller treats a surviving one as a bug in this resolver, not as a
// naming choice to render.

import { readFileSync } from 'node:fs';
import { parseAst } from 'rolldown/parseAst';

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
]);

const LOGICAL_BRANCH_OPS = new Set(['&&', '||', '??']);

function isNode(value) {
  return value !== null && typeof value === 'object'
    && typeof value.type === 'string';
}

// 1-based line number of a character offset, from an ascending array of
// each line's start offset (line 1 starts at 0). Works for LF and CRLF
// alike: a stray \r never creates an extra line, only \n does.
function makeLineOf(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return function lineOf(offset) {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo + 1;
  };
}

function keyNameOf(keyNode, computed) {
  if (!keyNode || computed) {
    return null;
  }
  if (keyNode.type === 'Identifier') {
    return keyNode.name;
  }
  if (keyNode.type === 'PrivateIdentifier') {
    return '#' + keyNode.name;
  }
  if (keyNode.type === 'Literal' && typeof keyNode.value === 'string') {
    return keyNode.value;
  }
  return null;
}

// The name this function node carries on its own syntax (a declaration's or
// a named function expression's id), independent of where it sits.
function ownNameOf(node) {
  if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression')
      && node.id && node.id.type === 'Identifier') {
    return node.id.name;
  }
  return null;
}

// The name this function node is assigned to, read off its immediate
// parent -- the four shapes the brief names: a variable, an object/class
// member, or a plain assignment.
function assignedNameOf(parent, keyInParent) {
  if (!parent) {
    return null;
  }
  if (parent.type === 'VariableDeclarator' && keyInParent === 'init'
      && parent.id && parent.id.type === 'Identifier') {
    return parent.id.name;
  }
  if ((parent.type === 'Property' || parent.type === 'PropertyDefinition'
       || parent.type === 'MethodDefinition') && keyInParent === 'value') {
    return keyNameOf(parent.key, parent.computed);
  }
  if (parent.type === 'AssignmentExpression' && keyInParent === 'right') {
    const left = parent.left;
    if (left.type === 'Identifier') {
      return left.name;
    }
    if (left.type === 'MemberExpression' && !left.computed) {
      return keyNameOf(left.property, false);
    }
  }
  return null;
}

function isBranch(node) {
  switch (node.type) {
    case 'IfStatement':
    case 'ConditionalExpression':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'CatchClause':
      return true;
    case 'SwitchCase':
      return node.test !== null && node.test !== undefined;
    case 'LogicalExpression':
      return LOGICAL_BRANCH_OPS.has(node.operator);
    default:
      return false;
  }
}

// Walks the whole program once. `stack` holds, innermost last, one record
// per function currently open: { name, anonSeq: Map }. `topAnon` is the
// file-level anonymous-sequence counter used when there is no enclosing
// function at all.
function walk(node, parent, keyInParent, stack, topAnon, lineOf, out) {
  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, parent, keyInParent, stack, topAnon, lineOf, out);
    }
    return;
  }
  if (!isNode(node)) {
    return;
  }

  if (isBranch(node) && stack.length > 0) {
    stack[stack.length - 1].branches += 1;
  }

  let pushed = null;
  if (FUNCTION_TYPES.has(node.type) && node.body != null) {
    const outer = stack.length > 0 ? stack[stack.length - 1] : null;
    let name = ownNameOf(node) || assignedNameOf(parent, keyInParent);
    if (name === null) {
      const group = outer || topAnon;
      const seq = (group.anonSeq || 0) + 1;
      group.anonSeq = seq;
      name = outer ? outer.name + '#' + seq : '#' + seq;
    }
    pushed = { name, branches: 0, anonSeq: 0 };
    stack.push(pushed);
    out.push({
      record: pushed,
      start: node.start,
      startLine: lineOf(node.start),
      endLine: lineOf(node.end - 1),
    });
  }

  for (const prop in node) {
    if (prop === 'type' || prop === 'start' || prop === 'end') {
      continue;
    }
    walk(node[prop], node, prop, stack, topAnon, lineOf, out);
  }

  if (pushed !== null) {
    stack.pop();
  }
}

// Second pass (see the NAME COLLISIONS note above): `entries`, already in
// source order, keeps the first of each repeated name as it is and appends
// `~2`, `~3`, ... to the rest -- mutating each entry's `record.name` in
// place, which is safe because nothing downstream still reads the
// pre-collision name (an anonymous function's own `outer#n` string was
// already built and frozen during the walk, per the caveat above).
function resolveNameCollisions(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const base = entry.record.name;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    if (count > 1) {
      entry.record.name = base + '~' + count;
    }
  }
}

function measureFile(file, text) {
  const program = parseAst(text, { lang: 'ts', sourceType: 'module' }, file);
  const lineOf = makeLineOf(text);
  const collected = [];
  walk(program, null, null, [], { anonSeq: 0 }, lineOf, collected);
  collected.sort((a, b) => a.start - b.start);
  resolveNameCollisions(collected);
  return collected.map((entry) => ({
    file,
    name: entry.record.name,
    lines: entry.endLine - entry.startLine + 1,
    branches: entry.record.branches,
    startLine: entry.startLine,
    endLine: entry.endLine,
  }));
}

function main() {
  let input;
  try {
    input = readFileSync(0, 'utf8');
  } catch (readError) {
    process.stderr.write('PROBLEM  could not read stdin: ' + readError.message + '\n');
    process.exit(1);
    return;
  }

  let request;
  try {
    request = JSON.parse(input);
  } catch (parseError) {
    process.stderr.write('PROBLEM  stdin is not valid JSON: ' + parseError.message + '\n');
    process.exit(1);
    return;
  }

  const files = Array.isArray(request.files) ? request.files : null;
  if (files === null) {
    process.stderr.write('PROBLEM  stdin JSON has no "files" array\n');
    process.exit(1);
    return;
  }

  const functions = [];
  const errors = [];
  for (const entry of files) {
    const file = entry.file;
    const text = entry.text;
    try {
      functions.push(...measureFile(file, text));
    } catch (err) {
      errors.push({ file, message: String(err && err.message ? err.message : err) });
    }
  }

  // Every within-file collision was already resolved by
  // resolveNameCollisions() above (each file's own functions get distinct
  // `~n` suffixes), so a key repeating here is that resolver failing to do
  // its job -- a bug in this script, not a naming choice for the caller to
  // render or baseline.
  const counts = new Map();
  for (const f of functions) {
    const key = f.file + '::' + f.name;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicates = [];
  for (const [key, count] of counts) {
    if (count > 1) {
      const sep = key.indexOf('::');
      duplicates.push({ file: key.slice(0, sep), name: key.slice(sep + 2), count });
    }
  }

  process.stdout.write(JSON.stringify({ functions, duplicates, errors }));
}

main();
