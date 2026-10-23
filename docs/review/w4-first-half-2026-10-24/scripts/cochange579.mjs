// usage: node cochange579.mjs <worktreeRoot> <N>
// Maps -U0 hunks of the last N non-merge commits that changed CODE in the entry to
// top-level declarations of that revision, classifies them into clusters, and counts pairs.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url';
const req = createRequire(new URL('../../../../package.json', import.meta.url));
const { parseAst } = await import(pathToFileURL(req.resolve('rolldown/parseAst')).href);
const [root, N] = [process.argv[2], Number(process.argv[3] || 80)];
const F = 'src/adapter/input-command-translator/input-command-translator.ts';
const sh = (c) => execSync(c, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
const norm = (n) => n.replace(/TaskGroups/g, 'Rows').replace(/TaskGroup/g, 'Row').replace(/taskGroups/g, 'rows').replace(/taskGroup/g, 'row').replace(/TASK_GROUP/g, 'ROW').replace(/FONT_SIZE/g, 'FONT_SCALE').replace(/fontSize/g, 'fontScale').replace(/FontSize/g, 'FontScale');
const C = {
  V: 'PressRow ScrollbarAxis RowGrabLanding RowGrabScroll PointerPress InputContext InPlaceTarget SpentEntranceSituation CreatedSubject InputAction TranslatedInput UNASSIGNED CONSUMED_ELSEWHERE GrabRow GrabArea grabRowOf acted changed changedAndCreated nothingToDo foldsOrNothing changedInOrder PlacedPlanActual ActualEndHold DOCUMENT_TITLE_PART',
  M: 'isCtrlHeld isCombo KEY isSingleCharacterKey releasedSnapOf isDateKeepingDrag FIELD_CTRL_KEYS isTypedIntoSearchWord isEnterInSearchPanel',
  D: 'MS_PER_DAY serialOfDay dayFromSerial dayShifted dayAtX pointerDaySerial dayShift compareDay',
  R: 'scrollingRowsOf scrollAreaTopOf rowAtY PlacedCommentAnchor commentAnchorAt snappedAnchorOf freeAnchorAt BAND_FRACTION_STEPS ScrollAnchor unitFraction dayAnchorAt rowAnchorAt rowAnchorIn panTo scrolledAnchor isScrollPositionInForce isOnRowArea drawnRowsOf drawnRowsCrossed boxById',
  P: 'COPY_DRAG_GRABS isCopyDragPress pressedRowOf pressRowOf commandFromInput commandFromPointer isOnTheChart browserStopped browserKept panOnRelease commandFromItemPress pointerAssignment panFollow followingTravel isAssignedPointerCombo isCtrlDragCombo gestureModifiers',
  E: 'ENTRY VisibleElement visibleElementOfEntry PressedGuideCursor guideCursorModeOfEntry FontScaleStep FONT_SCALE_STEPS nextFontScaleStep Armed ARMED_BY_ENTRY armedByEntry commandFromEntry commandFromVisibleElement resourceListChoiceCommand resourceListChoiceOfEntry rosterChoiceCommand rosterChoiceOfEntry VIEW_SCALE_ENTRIES',
  A: 'chosenDrawnTaskCount alignWrites',
  L: 'MODIFIER_ONLY_KEYS isLandingMarkKeptBy isSwallowedSecondPress',
  X: 'escapeContextOf',
  H: 'hasDraggedPastThreshold isParentPickingCtrlClick rememberedActualIn placementAt rowGrabDepthOf rowDepthOfGroup rowRankById TASK_SHAPE_KINDS taskShapeKindOf TASK_MILESTONE_GLYPHS milestoneGlyphOf nextIssuedUid',
  Z: 'TOP_ROW_DEPTH zoomYCeiling rowsAtZoomY',
  I: '__imports',
};
const clusterOf = {}; for (const [k, v] of Object.entries(C)) for (const n of v.split(' ')) clusterOf[n] = k;
const SIB = sh('git ls-files src/adapter/input-command-translator').split('\n').filter(f => f && f !== F).map(f => f.split('/').pop().replace('.ts', ''));
const commits = sh(`git log --no-merges --format=%H -- ${F}`).split('\n').filter(Boolean);
const rows = []; const unknown = {}; const swept = [];
for (const c of commits) {
  if (rows.length >= N) break;
  let text; try { text = sh(`git show ${c}:${F}`); } catch { continue; }
  let prog; try { prog = parseAst(text, { lang: 'ts', sourceType: 'module' }, F); } catch { continue; }
  const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const line = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1; } return lo + 1; };
  const genAt = (text.split('\n').findIndex(l => l.includes('<generated')) + 1) || Infinity;
  const decl = []; let prev = 0;
  for (const s of prog.body) {
    const d = s.type.startsWith('Export') && s.declaration ? s.declaration : s;
    let n = d.id ? d.id.name : d.declarations ? d.declarations.map(x => x.id.name).join(',') : (s.type === 'ImportDeclaration' || s.source) ? '__imports' : '?';
    const b = line(s.end); decl.push([prev + 1, b, n]); prev = b;
  }
  const diff = sh(`git show ${c} --format= -U0 -- ${F}`);
  const touched = new Set(); let codeHunk = false;
  const hunks = diff.split(/\n(?=@@ )/).slice(1);
  for (const h of hunks) {
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(h); if (!m) continue;
    const body = h.split('\n').slice(1).filter(l => /^[+-]/.test(l)).map(l => l.slice(1).trim());
    if (body.every(l => l === '' || l.startsWith('//') || l.startsWith('*') || l.startsWith('/*'))) continue;
    codeHunk = true;
    const a = Number(m[1]), len = m[2] === undefined ? 1 : Number(m[2]);
    const lo = a, hi = len === 0 ? a : a + len - 1;
    if (lo >= genAt) { touched.add('G'); continue; }
    for (const [s, e, n] of decl) if (e >= lo && s <= Math.max(hi, lo)) {
      const ns = n.split(',').map(norm); const k = ns.map(x => clusterOf[x]).find(Boolean);
      if (k) touched.add(k); else { unknown[n] = (unknown[n] || 0) + 1; touched.add('?'); }
    }
  }
  if (!codeHunk) continue;
  const files = sh(`git show ${c} --format= --name-only`).split('\n');
  for (const s of SIB) if (files.includes(`src/adapter/input-command-translator/${s}.ts`)) touched.add('sib:' + s);
  const own = [...touched].filter(k => !k.startsWith('sib:') && !['I','G','?'].includes(k)).length;
  if (process.env.SWEEP && own >= Number(process.env.SWEEP)) { swept.push(c.slice(0,9)); continue; }
  rows.push({ c: c.slice(0, 9), t: [...touched] });
}
const keys = ['V','M','D','R','P','E','A','L','X','H','Z','I','G'];
const cnt = {}; for (const r of rows) for (const k of r.t) cnt[k] = (cnt[k] || 0) + 1;
console.log('commits', rows.length, 'oldest', rows[rows.length - 1]?.c);
console.log('per cluster', JSON.stringify(cnt));
const pair = (x, y) => rows.filter(r => r.t.includes(x) && r.t.includes(y)).length;
const allk = [...keys, ...SIB.map(s => 'sib:' + s)];
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < allk.length; j++) {
  const x = keys[i], y = allk[j]; const n = pair(x, y); if (!n) continue;
  const small = Math.min(cnt[x] || 0, cnt[y] || 0);
  console.log(`${x}~${y}\t${n}/${small}\t${(n / small).toFixed(2)}`);
}
console.log('swept', swept.length, swept.join(' '));
console.log('unknown', JSON.stringify(unknown));
