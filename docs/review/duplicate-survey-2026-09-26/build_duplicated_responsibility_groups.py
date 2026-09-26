"""Build duplicated-responsibility-groups-d65097b9.json, the machine-readable result of the duplicated-responsibility survey.

Run from the repository root:
    python docs/review/duplicate-survey-2026-09-26/build_duplicated_responsibility_groups.py

Tree surveyed: refactor d65097b9. Every row below is the FINAL verdict: the refuter's
verdict where a refuter overturned the judge, else the judge's. The script resolves each
member's file by its base name under src/, checks the line exists, derives the CR from the
member files (578 frame-loop.ts, 579 input-command-translator.ts, 580 mspdi-codec.ts) and
prints the counts the report quotes.
"""
import json
import os
import sys
from collections import Counter, OrderedDict

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "duplicated-responsibility-groups-d65097b9.json")
TREE = "d65097b9"

# Method letters in the order the methods were run (the first finder of a row is the
# earliest letter in this order).
METHOD_ORDER = ["a", "b", "b45", "c", "d", "e", "s", "E", "G", "H", "I"]
METHODS = OrderedDict([
    ("a", "same or similar name"),
    ("b", "token similarity (k=6 shingles)"),
    ("b45", "check 45 verbatim run (floor 10)"),
    ("c", "same specification id cited"),
    ("d", "same generated S row read"),
    ("e", "arithmetic / usual-suspect grep"),
    ("s", "seed from the CR-579 session"),
    ("E", "reading sweep for paraphrases"),
    ("G", "inline clones after local-name normalisation"),
    ("H", "hand-written literal sets vs generated ones"),
    ("I", "line-by-line read of the four split files"),
])
SPLIT_FILES = {
    "src/framework/single-html-shell/frame-loop.ts": "578",
    "src/adapter/input-command-translator/input-command-translator.ts": "579",
    "src/adapter/document-codec/mspdi-codec.ts": "580",
}


def index_src():
    found = {}
    for root, _dirs, files in os.walk("src"):
        for name in files:
            if name.endswith(".ts") or name.endswith(".json"):
                path = os.path.join(root, name).replace(os.sep, "/")
                if name in found:
                    sys.exit("ambiguous base name " + name)
                found[name] = path
    return found


SRC = index_src()
LINES = {}


def line_count(path):
    if path not in LINES:
        with open(path, encoding="utf-8") as f:
            LINES[path] = sum(1 for _ in f)
    return LINES[path]


def member(spec):
    parts = spec.split(":")
    base, line = parts[0], int(parts[1])
    symbol = parts[2] if len(parts) > 2 and parts[2] else None
    if base not in SRC:
        sys.exit("no such file under src/: " + base)
    path = SRC[base]
    if line < 1 or line > line_count(path):
        sys.exit("line out of range: " + spec)
    return {"file": path, "line": line, "symbol": symbol}


ROWS = []


def row(id_, found_by, verdict, blocked_by, members, evidence, differs, differ_input,
        reachable, ledger, proposal, extends=None):
    assert verdict in ("ACCIDENTAL", "INTENDED", "NOT-A-DUPLICATE"), id_
    assert blocked_by in ("t064", "export", None), id_
    assert reachable in ("REACHABLE", "UNREACHABLE-TODAY", None), id_
    assert all(m in METHODS for m in found_by), id_
    if differs is not True:
        assert reachable is None, id_
    ms = [member(s) for s in members]
    crs = sorted({SPLIT_FILES[m["file"]] for m in ms if m["file"] in SPLIT_FILES})
    ROWS.append(OrderedDict([
        ("id", id_),
        ("found_by", sorted(found_by, key=METHOD_ORDER.index)),
        ("members", ms),
        ("verdict", verdict),
        ("blocked_by", blocked_by),
        ("evidence", evidence),
        ("differs", differs),
        ("differ_input", differ_input),
        ("reachable", reachable),
        ("ledger", ledger),
        ("cr", "+".join(crs) if crs else "none"),
        ("proposal", proposal),
        ("extends", extends),
    ]))


ACC, INT, NAD = "ACCIDENTAL", "INTENDED", "NOT-A-DUPLICATE"
REACH, UNREACH = "REACHABLE", "UNREACHABLE-TODAY"

# ---------------------------------------------------------------- groups.md, body A
row("G01", ["a", "b", "b45", "e", "s", "G", "I"], ACC, "t064",
    ["calendar-day.ts:45:serial", "calendar-day.ts:101:dayFromSerial",
     "input-command-translator.ts:417:MS_PER_DAY", "input-command-translator.ts:419:serialOfDay",
     "input-command-translator.ts:425:dayFromSerial", "schedule-grid.ts:70:serialOf",
     "schedule-grid.ts:75:dayOfSerial", "time-axis.ts:11:serialOf", "time-axis.ts:60:dateAtX"],
    "only comment is the 0-99 TRAP calendar-day.ts:42-43; serial/dayFromSerial absent from schedule.ts:40-46",
    False, "equal on 12 days and 11 serials incl. NaN, year 50, 275760 (repro-G01.ts)", None, [],
    "Home calendar-day.ts: publish serial and dayFromSerial through schedule.ts (new PI-1 members); delete input-command-translator.ts:417-433, schedule-grid.ts:66-77, time-axis.ts:11-15 and the inline copy at :60-61.")
row("G02", ["a", "s", "I"], ACC, None,
    ["input-command-translator.ts:1293:compareDay", "input-command-translator.ts:1285:dayShift",
     "calendar-day.ts:36:compareDays", "calendar-day.ts:51:calendarDaysBetween",
     "mspdi-codec.ts:965:latestTaskFinish"],
    "input-command-translator.ts:1292-1295 no comment; compareDays and calendarDaysBetween are published (schedule.ts:40-46)",
    True, "{50,1,1} vs {1950,1,1}: compareDays -1900, compareDay 0; {1,1,1} vs {1900,1,1}: -1899 vs +365 (repro-G01.ts) | steps: open a GRS JSON whose documentSettings.importMinDate is 0001-01-01 (kept, import-document.ts:214), type a year-0050 date (checkDay edit-task.ts:180-191 accepts), drag the bar (item-grab.ts:209, :289, :426)",
    REACH, [],
    "Delete compareDay and import compareDays; dayShift's difference becomes calendarDaysBetween(from, to). In CR-580 latestTaskFinish (mspdi-codec.ts:965-977) orders by compareDays instead of its hand key year*10000+month*100+day.")
row("G03", ["a", "I"], NAD, None,
    ["input-command-translator.ts:443:dayAtX", "time-axis.ts:71:xFromDay"],
    "dayAtX delegates to time-axis.ts:56 dateAtX; xFromDay is its inverse",
    None, None, None, [], "Leave. The extra pair judge A found here is E01.")
row("G04", ["a", "b", "b45", "s", "G", "I"], ACC, "t064",
    ["input-command-translator.ts:1260:taskGroupRankById", "schedule-invariants.ts:132:taskGroupRankById",
     "task-group-order.ts:16:rowTreeRankById", "drawn-rows.ts:36:inTreeOrder",
     "view-place.ts:62:firstRow", "mspdi-codec.ts:1005:tasksInWbsOrder"],
    "TRAPs input-command-translator.ts:1257 and task-group-order.ts:14 say change all three, no reason; the invariants copy is file-private",
    True, "rank copies and inTreeOrder equal on 10 shapes incl. rings; view-place firstRow sorts every row by order: [c(parent r, order 0), r(root, 0), s(root, 1)] -> firstRow c, rank 0 r (repro-G04.ts) | steps: open a GRS JSON whose taskGroups array lists a child before its root with the same order (no invariant orders the array)",
    REACH, ["PND-420", "DFC-262"],
    "Home Schedule: move taskGroupRankById into schedule/ and publish it from schedule.ts (new PI-1 member); the translator, task-group-order.ts, drawn-rows.ts and view-place.ts (rank 0, not the order sort) import it. Not layoutEngine: documentModel may not import it (LR-4). tasksInWbsOrder is the same walk over Tasks.")
row("G05", ["b", "b45", "E", "G", "I"], ACC, "t064",
    ["input-command-translator.ts:1167:rowGrabDepthOf", "edit-task-group.ts:81:depthOf",
     "row-title-panel.ts:103:rowDepth", "drawn-rows.ts:21"],
    "input-command-translator.ts:1167-1177 == edit-task-group.ts:81-91 text-identical; row-title-panel.ts:100 TRAP is about ring termination only; E06 added the two capped climbs",
    True, "chain depth 6 (maxGroupDepth 5): rowGrabDepthOf 6, rowDepth 5, drawn-rows 6; depth 8: 8 / 5 / 7; ring a<->b: 4 / 5 / 7 (repro-G05.ts) | steps: open a GRS JSON with a row chain deeper than S-125 or a parentId ring (IV-5 / IV-18 are not judged on open, frame-loop.ts:660, DFC-922)",
    REACH, ["DFC-922"],
    "Home Schedule: publish rowDepthOf(byId, row, cap?) from schedule.ts (new PI-1 member) so drawn-rows.ts (layoutEngine) and row-title-panel.ts can import it; edit-document is too far out for drawn-rows (LR-1).")
row("G06", ["b45", "G"], ACC, None,
    ["input-command-translator.ts:1182", "row-grab.ts:71", "row-grab.ts:138"],
    "one idiom new Map(rows.map(o => [o.id, o])) (+6 idiom sites); no semantic difference named (refute overturned NOT-A-DUPLICATE)",
    False, "equal (all last-wins)", None, [],
    "Absorbed when G05 lands (rowDepthOfGroup, input-command-translator.ts:1180); otherwise leave.")
row("G07", ["a", "b45", "G"], ACC, "t064",
    ["deletion-confirmations.ts:48", "task-group-order.ts:57", "edit-task-group.ts:267",
     "item-grab.ts:542:rowOfTask", "edit-task.ts:318"],
    "item-grab.ts:538-539 TRAP explains reading the document rather than the layout, not the copy",
    True, "members [{1,A},{1,B}] -> find answers A, Map answers B (repro-G07-G11-G48.ts) | steps: open a GRS JSON that lists one Task in two rows' members (IV-6 not judged on open, DFC-922) and grab the Task",
    REACH, ["DFC-922"],
    "Publish rowOfTask(schedule, uid) from schedule.ts (new PI-1 member); the five sites import it.")
row("G08", ["a", "b45", "G"], ACC, "t064",
    ["row-tree-entrances.ts:150:isLevelZeroCollapsedIn", "row-tree-entrances.ts:155:placedRowIdsOf",
     "row-tree-entrances.ts:161", "row-title-panel.ts:200:placedRowIdsOf",
     "row-title-panel.ts:212:openArmingOf", "task-group-folding.ts:56:isLevelZeroCollapsed"],
    "TRAPs row-tree-entrances.ts:159 and row-title-panel.ts:206-207 say change both, no reason",
    True, "placed chain of depth 6, limit 5, ask g4 -> translator true, panel false (repro-G08.ts is a model, not verbatim) | steps: open a GRS JSON with a row chain deeper than S-125 (IV-5 not judged on open). The unplaced-row case is unreachable: the panel asks only placed rows",
    REACH, ["DFC-1000", "JDG-591"],
    "Home ScheduleLayout: a pure openArmingOf(schedule, settings, placedIds, depthOf) beside keptInViewByTreeState (new PI-5 member); both adapters import it; settle DFC-1000 in the same change.")
row("G09", ["a", "b45", "G", "I"], ACC, "t064",
    ["input-command-translator.ts:448:scrollingRowsOf", "input-command-translator.ts:557:rowAnchorIn",
     "zoom-and-fit.ts:333:rowPointIn", "row-scroll.ts:26:scrollOffsetOf", "row-scroll.ts:31:scrolledRows"],
    "TRAPs row-scroll.ts:22-23, zoom-and-fit.ts:322, input-command-translator.ts:556 acknowledge the copy, no reason",
    True, "rows a y100 h20 / b y124 h60 / c y190 h30: offset 1.5 on a -> rowPointIn 136, scrollOffsetOf 157; unknown id -> null vs 100 (repro-G09.ts) | steps: open a GRS JSON whose scrollGroupOffset is >= 1 (S-176 says [0,1); grs-json-schema.ts:1105 is number only)",
    REACH, [],
    "Home row-scroll.ts: publish rowSlabAt(rows, index) and a rowPointOf that carries whole rows like scrollOffsetOf (new PI-5 members); zoom-and-fit.ts and rowAnchorIn call it.")
row("G10a", ["a", "e", "G", "I"], NAD, None,
    ["input-command-translator.ts:1301:zoomYCeiling", "zoom-and-fit.ts:82:zoomXCeiling"],
    "S-36/S-38 row-title font (input-command-translator.ts:1302) vs S-229 visible-day floor (zoom-and-fit.ts:84)",
    None, None, None, [], "Leave.")
row("G10b", ["a", "e", "G", "I"], NAD, None,
    ["input-command-translator.ts:1310:rowsAtZoomY", "schedule-layout.ts:619:rowPlacesAtZoomY",
     "frame-loop.ts:2024:rowBandCeiling", "zoom-and-fit.ts:220:rowBandCeilingOf"],
    "delegates to one solver since JDG-134 (zoom-and-fit.ts:205-208 TRAP)",
    None, None, None, ["DFC-628"], "Leave; DFC-628 (second band solver) can be closed.")
row("G10c", ["a", "e", "G", "I"], ACC, "t064",
    ["zoom-and-fit.ts:351:zoomWithinBounds", "fit-zoom.ts:48:clampedZoom", "edit-document-settings.ts:151:clamp"],
    "only fit-zoom.ts:48 carries the non-finite-bound-is-no-bound rule (DFC-971)",
    True, "min NaN, value 5 -> zoomWithinBounds NaN, clampedZoom 5; min 10 max 1 value 5 -> 10 vs 1 (repro-G10.ts)",
    UNREACH, ["DFC-971"],
    "Publish clampedZoom from schedule-layout.ts (new PI-5 member); zoom-and-fit.ts:351 and edit-document-settings.ts:151 call it (EditDocument->ScheduleLayout edge exists). Guard today: bounds are the generated NOT_STORED_ZOOM_BOUNDS (edit-document.ts:298-304; frame-loop.ts:1865, :2000).")
row("G11", ["a", "d", "G", "I"], ACC, None,
    ["input-command-translator.ts:436:hasDraggedPastThreshold", "row-grab.ts:257:rowGrabAxisAt"],
    "input-command-translator.ts:434 TRAP gives the rule, not a reason; row-grab.ts:264 WHY covers only the diagonal; frame-loop.ts:1161 reads the settled kind (not a member)",
    True, "{x:NaN, y:0} -> hasDraggedPastThreshold false, rowGrabAxisAt 'position'; the {6,6} diagonal difference is intended (row-grab.ts:264) (repro-G07-G11-G48.ts)",
    UNREACH, ["DFC-688", "DFC-873"],
    "rowGrabAxisAt starts with if (!hasDraggedPastThreshold(press, at)) return null (same component). Guard today: browser pointer coordinates are finite (no in-repo guard; pointer from frame-loop.ts:1613).")
row("G37a", ["e", "I"], ACC, "t064",
    ["input-command-translator.ts:660:nextIssuedUid", "edit-resource.ts:35", "task-create.ts:41"],
    "input-command-translator.ts:657 TRAP explains mark+1, not the copy; edit-document.ts exports none",
    False, "equal by construction", None, [],
    "Publish nextIssuedUid from edit-document.ts (new PI-9 member); edit-resource.ts and task-create.ts use it.")
row("G37b", ["e", "I"], ACC, "t064",
    ["import-document.ts:504:highWaterOf", "mspdi-codec.ts:355"],
    "import-document.ts:502 WHY (the imported mark may be lower) applies to both copies",
    True, "200000 rows: mspdi-codec.ts Math.max(...spread) throws RangeError, the loop answers 200000 (repro-G37.ts) | steps: open an MSPDI file of about 200000 rows; decode (document-file-flow.ts:495) runs before the byte/count caps (validate-imported-document.ts:165, :181), so a throw comes instead of the refusal",
    REACH, [],
    "Publish one highWaterOf(...schedules) from schedule.ts (new PI-1 member); mspdi-codec.ts and import-document.ts import it.")
row("G37c", ["e", "I"], NAD, None,
    ["frame-loop.ts:2016", "frame-loop.ts:2080"],
    "each randomUUID mints a different entity's id (frame-loop.ts:2016-2018, copy-and-paste.ts:111, document-file-flow.ts:567)",
    None, None, None, [], "Leave.")
row("G37d", ["e", "I"], ACC, None,
    ["task-paste.ts:39", "edit-task-group.ts:288"],
    "edit-task-group.ts:290 TRAP: sorted, so the same paste mints the same uids -- task-paste.ts:40 does not sort",
    True, "schedule.tasks order [5,3], mark 10 -> task paste 5->11, 3->12; row paste 3->11, 5->12 (repro-G37.ts) | steps: open a file whose tasks array is not in uid order, copy the same Tasks as Tasks and as their row, paste both: the copies are numbered differently",
    REACH, [],
    "Fold into E34's one copyTasksUnderFreshUids with sorted minting.")
row("G43", ["b45"], ACC, None,
    ["shortcut-keys.ts:37", "wheel-input.ts:66"],
    "shortcut-keys.ts:37-41 and wheel-input.ts:66-70 decode the same five combos with the same isCombo arguments (refute overturned NOT-A-DUPLICATE)",
    False, "equal", None, [], "One comboOf(event) beside isCombo (input-command-translator.ts:362). Low value.")
row("G45", ["b45", "I"], NAD, None,
    ["frame-drags.ts:94:scrollbarFollow", "frame-loop.ts:792:heldWholeOf"],
    "frame-drags.ts:97-98 pans; frame-loop.ts:795-797 returns the press-time whole", None, None, None, [], "Leave.")
row("G46", ["d", "I"], NAD, None,
    ["frame-drags.ts:136", "frame-loop.ts:1511", "screen-frame.ts:56", "single-html-shell.ts:295"],
    "S-248: a drag clamp vs a stored width drawn at S-171; S-205: thickness floor vs thumb-length floor. Side finding: screen-frame.ts:56 reads S-205 as a thumb-length floor (spec/code mismatch)",
    None, None, None, [], "Leave; record the S-205 reading at screen-frame.ts:56 as a spec/code mismatch.")
row("G47", ["d", "I"], ACC, None,
    ["frame-loop.ts:1865", "frame-loop.ts:1999", "view-place.ts:83"],
    "three sites assemble the same generated constants (NOT_STORED_ZOOM_BOUNDS edit-document.ts:298) into three shapes (refute overturned NOT-A-DUPLICATE)",
    False, "equal", None, [], "Optional: one zoomLimits() in view-place.ts (same component).")
row("G48", ["b", "G", "I"], ACC, "t064",
    ["input-command-translator.ts:1326:escapeContextOf", "frame-loop.ts:1080:escapeLevelOf"],
    "screen-state.ts:29-30 TRAP justifies only the differing member sets; the six mappings input-command-translator.ts:1328-1335 == frame-loop.ts:1087-1092 have no reason (refute overturned INTENDED)",
    False, "6-field core equal; the member sets differ by design (selection only -> translator 'selection', frame-loop null) (repro-G07-G11-G48.ts)",
    None, ["DFC-532", "DFC-537"],
    "frame-loop builds {...escapeContextOf(context), isSelectionStanding: false, isConfirmationStanding, isTooltipStanding}; escapeContextOf is exported by the translator entry but is not a PI-18 member (check 26b).")
row("G65", ["s", "H", "I"], ACC, None,
    ["input-command-translator.ts:618:TASK_SHAPE_KINDS", "input-command-translator.ts:627:taskShapeKindOf",
     "input-command-translator.ts:633:TASK_MILESTONE_GLYPHS", "input-command-translator.ts:652:milestoneGlyphOf",
     "schedule-entities.ts:425:COLUMN_SHAPES", "field-commit.ts:71:isVisualChoice", "task-appearance.ts:108",
     "schedule-layout.ts:88:ShapeKind"],
    "no comment at input-command-translator.ts:618-655; COLUMN_SHAPES already crosses (crossing-names-baseline.txt); tsc guards the Record lists; judge B saw the same pair as G22c",
    False, "28 probes, 0 differences (repro-G65.ts)", None, [],
    "Delete the two hand lists; taskShapeKindOf / milestoneGlyphOf read COLUMN_SHAPES.TaskVisual choices; schedule-layout.ts:88 ShapeKind derives from the generated type.")
row("G66", ["a", "s", "H", "I"], ACC, "t064",
    ["input-command-translator.ts:785:ARMED_BY_ENTRY", "input-command-translator.ts:811:armedByEntry",
     "command-palette.ts:250:armedEntry"],
    "input-command-translator.ts:784 TRAP names the misspelling risk only; JF-1 bars the translator from icon-roster.json (05-07-design.md:266)",
    False, "97 roster entries, 0 differences (repro-G66.ts)", None, ["DFC-95"],
    "screen-renderer.ts publishes armedByEntry built from icon-roster.json (new PI-37 member); the translator imports it over the existing InputCommandTranslator->ScreenRenderer edge and drops its 22-row table.")

# ---------------------------------------------------------------- groups.md, body B
row("G12", ["a", "b", "b45", "e", "G", "I"], ACC, None,
    ["row-title-panel.ts:40:charUnits", "row-title-panel.ts:45:labelUnits", "row-title-panel.ts:52:labelWidthPx",
     "comment-box.ts:20:charUnits", "comment-box.ts:25:labelUnits", "label-width.ts:10:labelUnits",
     "label-width.ts:18:labelWidth", "name-label.ts:17:unitsOf"],
    "labelUnits is already PI-5 (05-07-design.md:593) and re-exported at schedule-layout.ts:58; TRAPs row-title-panel.ts:38, comment-box.ts:18 give no reason",
    False, "12 edge strings incl. astral, combining, lone surrogate: 0 differ (repro-G12.ts)", None, ["CR-554"],
    "Home label-width.ts: row-title-panel.ts and comment-box.ts import labelUnits / labelWidth from schedule-layout.ts; per-character callers call labelUnits(character). No T-064 change. CR-554 section 15.6.12 row D4 already asks for it.")
row("G13a", ["a", "b", "b45", "G"], ACC, "t064",
    ["image-exporter.ts:80:escaped", "svg-renderer.ts:59:escaped"],
    "svg-renderer.ts:59 is exported but PI-19 (05-07-design.md:607) does not list it",
    False, "9 strings equal (repro-G13-G14.ts)", None, [],
    "Add escaped to PI-19; image-exporter.ts imports it (ImageExporter->SvgRenderer edge exists).")
row("G13b", ["a", "b", "b45", "G"], NAD, None,
    ["mspdi-xml.ts:244:escapedText", "svg-renderer.ts:59:escaped"],
    "element-text escaping without the double quote (mspdi-xml.ts:245); its one attribute use is a constant namespace (:262)",
    None, None, None, [], "Leave.")
row("G14a", ["a", "b", "b45", "G"], ACC, "t064",
    ["image-exporter.ts:69:rounded", "svg-renderer.ts:69:rounded"],
    "image-exporter.ts:67 TRAP 'rounds as svg-renderer.ts does; change both together', no reason",
    False, "14 numbers equal (repro-G13-G14.ts)", None, [], "Add rounded to PI-19 with escaped.")
row("G14b", ["a", "b", "b45", "G"], NAD, None,
    ["image-exporter.ts:75:ratioText"],
    "does not round on purpose (image-exporter.ts:73); no twin", None, None, None, [], "Leave.")
row("G15", ["a", "b", "b45", "G"], ACC, "t064",
    ["tooltips.ts:98:rectHoldsPoint", "screen-regions.ts:52:rectHoldsPoint"],
    "tooltips.ts:96 TRAP names only that the original is private (judge C's N1 is this TRAP)",
    False, "equal (repro-G15.ts)", None, [],
    "Publish rectHoldsPoint from screen-regions.ts (new PI-35 member); tooltips.ts and schedule-overlays.ts import it.")
row("G15x", ["a", "b", "b45", "E", "G"], ACC, "t064",
    ["schedule-overlays.ts:169", "item-hit-area.ts:77:isInsideRect", "tooltips.ts:98:rectHoldsPoint"],
    "no reason beside schedule-overlays.ts:169-173 (closed <=) against the half-open rectHoldsPoint; regionAtPointer (screen-regions.ts:199) is half-open. E15 added isInsideRect",
    True, "rowArea {300,100,800,500}, point (1100,300): tooltips / screen-regions false, overlays / isInsideRect true (repro-G15.ts) | steps: rest the pointer on the 1-px right or bottom seam of the Row Area: the guide cursor draws (schedule-overlays.ts:167) while the dual-cursor readout answers null (tooltips.ts:214-217)",
    REACH, [],
    "Pick the half-open convention for rowArea (as regionAtPointer does); schedule-overlays.ts calls the published rectHoldsPoint. isInsideRect stays closed only where a hit test needs it, with the reason written.")
row("G16", ["a", "b", "E", "G"], ACC, "t064",
    ["display-scale-steps.ts:64:centreOf", "item-hit-area.ts:97:centreOf", "schedule-task-figures.ts:413",
     "zoom-and-fit.ts:311:zoomCentreX", "zoom-and-fit.ts:317:zoomCentreY"],
    "no comment beside any; E16 added zoomCentreX/Y",
    False, "equal (repro-G25-G42-misc.ts)", None, [],
    "Low value. If folded: centreOf beside ScreenRect in screen-regions.ts (new PI-35 member).")
row("G17", ["d"], ACC, None,
    ["svg-renderer.ts:119:selectedLineWidth", "dependency-route.ts:205"],
    "svg-renderer.ts:464 TRAP gates marks, not the width; the export builds geometry with nothingSelected (frame-loop.ts:1799-1805), so the renderer can read link.strokeWidth, which PI-6 already publishes (05-07-design.md:594) (refute overturned INTENDED)",
    False, "S-178 formula equal (repro-G17.ts); the link-set part is H04", None, ["DFC-640"],
    "The renderer (schedule-task-figures.ts:573-576) reads DependencyGeometry.strokeWidth instead of recomputing; no T-064 change (DFC-640 plan 1).")
row("G18a", ["c", "d", "G"], ACC, "t064",
    ["image-exporter.ts:117:appHeaderSvg", "dom-screen-surface.ts:137:chromeScaledPx", "app-header-drawing.ts:23"],
    "no WHY at image-exporter.ts:117-131; the adapter cannot import the framework copy (LR-1), so the rule moves inward",
    False, "ratio 1 / 0.5 / 1.37 identical (repro-G62-G18-G20.ts)", None, [],
    "Home screen-regions.ts (owns S-235): publish chromeScaledPx and the title font / inset helpers (new PI-35 members); ImageExporter->ScreenRegions and DomScreenSurface->ScreenRegions edges exist.")
row("G18b", ["c", "d", "G"], NAD, None,
    ["dom-screen-surface.ts:430:typefaceStyle", "svg-renderer.ts:396:typefaceAttribute"],
    "same constant, different output syntax (CSS vs SVG attribute)", None, None, None, [], "Leave.")
row("G18c", ["c", "d", "G"], ACC, "t064",
    ["image-exporter.ts:110", "svg-renderer.ts:396:typefaceAttribute"],
    "the font-family string at image-exporter.ts:110 re-types typefaceAttribute's text",
    False, "equal", None, [], "Add typefaceAttribute to PI-19; image-exporter.ts imports it.")
row("G19", ["d"], ACC, None,
    ["schedule-grid.ts:253", "svg-renderer.ts:641"],
    "same component (SvgRenderer), no comment", False, "null / undefined -> 1, 0 -> 0, 6 -> 6", None, [],
    "One weekStartOf(schedule) in svg-renderer.ts; both call it.")
row("G20", ["a", "d", "E"], ACC, "t064",
    ["screen-regions.ts:85:entranceOuterHeightPx", "screen-regions.ts:90:entranceOuterWidthPx",
     "screen-regions.ts:101:rowControlLatticeHeightPx", "dom-screen-surface.ts:159:entranceOuterWidthPx",
     "dom-screen-surface.ts:168:entranceOuterHeightPx", "row-title-panel-drawing.ts:110:rowControlLatticePx"],
    "TRAPs screen-regions.ts:83, dom-screen-surface.ts:139 explain S-243 vs S-141, not the copy; E19's width and S-140 parts are not duplicates (01-04-requirements.md:6882; S-140 = 0 on purpose, HF-6)",
    False, "width 13.334, height 12.0006 both (repro-G62-G18-G20.ts)", None, [],
    "Make entranceOuter{Width,Height}Px(gapRow) public in screen-regions.ts (new PI-35 members; S-141 must join screen-regions' generator group in tools/generate_entity_types.py); DomScreenSurface imports them.")
row("G21", ["b45", "d"], ACC, "t064",
    ["task-figures.ts:472", "schedule-layout.ts:282:dummyInkWidthOf", "task-figures.ts:499:labelTopOf",
     "shape-cross-sections.ts:27:labelLiftOf", "task-figures.ts:274:isThinShape", "shape-cross-sections.ts:51:laidBelow",
     "task-figures.ts:235:lineEndHalfHeight", "shape-cross-sections.ts:12:thinEndHalfHeightOf"],
    "task-figures.ts:471 TRAP 'change both together'; repeated-expressions-baseline.txt records isThinShape / laidBelow as waiting for a T-064 row",
    False, "values equal; the 1-ulp label-top difference (repro-G21.ts) exists only against the proposed fold -- the layout never computes a top (schedule-layout.ts:547) and SVG rounds to 0.01 (svg-renderer.ts:68-70)",
    None, ["DFC-602"],
    "Add laidBelow, dummyInkWidthOf, thinEndHalfHeightOf, labelLiftOf to PI-5 in one CR; task-figures.ts imports them and deletes isThinShape, lineEndHalfHeight and the inline width.")
row("G22a", ["a", "c", "I"], NAD, None,
    ["input-command-translator.ts:652:milestoneGlyphOf", "schedule-layout.ts:227:milestoneGlyphOf"],
    "the translator parses a name; the layout resolves a Task's stored glyph with its default",
    None, None, None, [], "In CR-579 rename the translator's to milestoneGlyphNamed (same name, different job).")
row("G22b", ["a", "c", "I"], ACC, "t064",
    ["screen-state-input.ts:112:isDrawnAsMilestone", "schedule-layout.ts:220:shapeKindOf", "edit-task.ts:170:isMilestone"],
    "AT-100 (fig-erd-detail.md:403): shapeKind null -> Task.milestone; no invariant ties TaskVisual.shapeKind to Task.milestone",
    True, "visual 'milestone' + milestone false: shapeKindOf / isMilestone true, isDrawnAsMilestone fallback false (repro-G22.ts)",
    UNREACH, [],
    "Home Schedule: drawnShapeKindOf(task, visual) (new PI-1 member); shapeKindOf, isMilestone, isDrawnAsMilestone call it. Guard today: the GA-18 press hit comes from geometry, so the fallback never runs (screen-state-input.ts:92).")
row("G22d", ["a", "c", "I"], NAD, None,
    ["name-label.ts:66", "task-plan-actual.ts:175"],
    "G-1 (01-04-requirements.md:237) makes Task.milestone the truth of 'is a milestone'; ND-1 (01-04-requirements.md:1429) may read it (refute overturned the judge's ACCIDENTAL; needs the ruling Q2). task-plan-actual.ts:175 default is dead: both callers pass around (:479, screen-state-input.ts:98-101)",
    True, "visual 'milestone' + milestone false: drawn as a milestone, the ND-1 label prints 'start - finish' beside it (repro-G22.ts) | steps: open a GRS JSON whose TaskVisual.shapeKind is 'milestone' while Task.milestone is false (CM-20 refuses the switch in the app, task-appearance.ts:89-93; the import checks only the enum, grs-json-schema.ts:489)",
    REACH, [],
    "Q2 decides. If ND-1 means the drawn shape, name-label.ts:66 calls drawnShapeKindOf (G22b) and this row turns ACCIDENTAL; if Task.milestone, write the reason at name-label.ts:66. Either way an import check tying shapeKind to milestone would close the road.")
row("G23", ["b", "b45", "c", "G"], ACC, "t064",
    ["schedule-invariants.ts:555", "task-plan-actual.ts:303", "task-appearance.ts:43:fadeSpanOf",
     "schedule-layout.ts:201:clampedFade", "item-grab.ts:500:clampedFadeDays", "task-appearance.ts:69", "task-plan-actual.ts:307"],
    "task-appearance.ts:41 TRAP justifies calendar days, not the copy; the FD-6 note (01-04-requirements.md:1326) says the two rules exist so that IV-12 does not refuse what the handle allowed; only tests/contract/fd-6-iv-12-the-fade-span.contract.test.ts guards the copies",
    True, "fadeOut 4, span 10, GA-7 pull 8 -> the handle clamps to 8 (FD-6 'fadeIn wins') and emits setTaskFadeInDays 8; setTaskFadeDays refuses (8+4 > 10, IV-12) (repro-G23.ts) | steps: on any document, a Task with fadeOutDays 4 on a 10-day plan: drag the fade-in handle past 6 days (item-grab.ts:149-153 writes fadeIn alone) -> the edit is refused",
    REACH, ["PND-253", "DFC-15"],
    "Home Schedule: fadeSpanDays(task) + fadeOverruns(task) for the invariant and both use-case checks, and one FD-6 clampedFadeDays(in, out, span) used by item-grab.ts and (x pxPerDay) schedule-layout.ts (new PI-1 members). The handle then stops at span - fadeOut, as the FD-6 note asks; extend PND-253 from the preview to the release.")
row("G24", ["c"], NAD, None,
    ["item-hit-area.ts:835:labelHitOf", "task-figures.ts:506:labelBoxOf", "item-hit-area.ts:608:fadeRegionsOf",
     "task-figures.ts:61:fadeHandlePoints", "label-placement.ts:80", "item-hit-area.ts:554"],
    "labelHitOf reads task.label (item-hit-area.ts:837); fadeRegionsOf reads task.fadeHandles (:613); S-260 is a keep-clear distance at label-placement.ts:109 and a reach at item-hit-area.ts:554",
    None, None, None, [], "Leave.")
row("G25", ["a", "b", "G"], ACC, "t064",
    ["selection-input.ts:104:marqueeRect", "held-press-preview.ts:66:marqueeRect"],
    "no comment beside either; the preview's PTD-5 / 0x0 gate (held-press-preview.ts:70-73) sits outside the formula",
    False, "forward / backward / 0x0 / NaN equal (repro-G25-G42-misc.ts)", None, [],
    "marqueeOf(from, to) in item-hit-area/marquee.ts beside itemsInMarquee (new PI-7 member); both import it.")
row("G41", ["e"], NAD, None,
    ["field-commit.ts:54:settledColour", "stored-colour.ts:54:customColourChosen",
     "svg-renderer.ts:203:hexToHsl", "stored-colour.ts:25:customColourOf"],
    "settledColour calls customColourChosen (field-commit.ts:57); hexToHsl converts, customColourOf parses a light/dark pair",
    None, None, None, [], "Leave.")
row("G42", ["b", "G", "I"], ACC, None,
    ["properties-panel.ts:239:textOfDateColumn", "tooltips.ts:77:dateText"],
    "same component (ScreenRenderer), no comment", False, "5 inputs equal (repro-G25-G42-misc.ts)", None, [],
    "Keep textOfDateColumn in one ScreenRenderer file; tooltips.ts imports it.")
row("G62", ["c"], NAD, None,
    ["schedule-task-figures.ts:133:paintOf", "svg-renderer.ts:338:chosenColourOf", "dom-screen-surface.ts:106:painted"],
    "paintOf consumes chosenColourOf's answer; painted builds a CSS var() name", None, None, None, [], "Leave.")
row("G62x", ["c", "E"], ACC, "t064",
    ["svg-renderer.ts:139:colourOf", "dom-screen-surface.ts:411:hued", "dom-screen-surface.ts:417:themeStyle"],
    "ScreenTheme has no monochrome (dom-screen-surface.ts:405-408); pageGroundStyle (:436-445) and themeStyle (:417) use hued; FR-041 (01-04-requirements.md:1996) names the ground among what follows monochrome. E26 is the same pair: its H substitution differs only on unreachable input",
    True, "hue 359, dark, themeMonochrome on: SVG / export hsl(0 0% 13%), DOM page ground hsl(359 14% 13%) (repro-G62-G18-G20.ts) | steps: turn monochrome on in the App Header (IC-100 / CM-64): the chart's S-146 marks go grey (svg-renderer.ts:642) while the page ground stays tinted; the export header greys S-150 (image-exporter.ts:52-55), the screen does not",
    REACH, ["DFC-754", "DFC-910", "JDG-524"],
    "Publish one huedColour(written, hue, monochrome) from svg-renderer.ts (new PI-19 member) and re-export it from screen-renderer.ts (ScreenRenderer->SvgRenderer edge exists; DomScreenSurface->SvgRenderer does not); ScreenTheme gains monochrome and hued calls it. S-146 follows FR-041 now; the chrome rows FR-041 does not name wait for Q1.")
row("G63", ["a", "c"], NAD, None,
    ["name-label.ts:63:planDatesOf", "task-plan-actual.ts:223:datedPlanOf"],
    "planDatesOf formats the M/D label (ND-1..3); datedPlanOf derives dates plus an MSPDI Duration (DV-8, EX-9)",
    None, None, None, [], "Leave.")

# ---------------------------------------------------------------- groups.md, body C
row("G26a", ["a", "b", "b45", "G", "I"], ACC, None,
    ["app-header-items.ts:47:entryLabel", "command-palette.ts:49:entryLabel",
     "open-modals.ts:96:entryLabel", "properties-panel.ts:81:entryLabel"],
    "no comment beside any copy; all four inside ScreenRenderer, each with its own WORDS_BY_ROW",
    False, "198 inputs, 0 differ (repro-G26.ts)", None, [],
    "One entryLabel + WORDS_BY_ROW in a shared ScreenRenderer module (e.g. display-words.ts); the other three import it. No publish.")
row("G26b", ["a", "b", "b45", "G", "I"], ACC, "export",
    ["notices.ts:126:questionText", "open-modals.ts:178:questionTextOf"],
    "no comment; same component",
    True, "row QN-99 or an empty QN-9 cell -> notices answers QN-8's text, open-modals '' (repro-G26.ts)",
    UNREACH, [],
    "Export questionText from notices.ts (open-modals.ts:20 already imports './notices'); delete questionTextOf. Guard today: open-modals.ts:325 passes only QN-9, filled in both languages.")
row("G26c", ["a", "b", "b45", "G", "I"], NAD, None,
    ["app-header-items.ts:133:commandItemFor", "command-palette.ts:164:commandItemFor",
     "open-modals.ts:193:commandItemFor", "app-header-items.ts:151:headerCommands",
     "open-modals.ts:206:commandsOnSurface", "tooltips.ts:67:iconHint"],
    "header computes enabled / pressed, the palette usable / armed, the modals fix all (DEVIATION DFC-567, open-modals.ts:191)",
    None, None, None, ["DFC-567"], "Leave.")
row("G27", ["a", "I"], NAD, None,
    ["properties-panel.ts:173:heldByOf", "row-title-panel.ts:363:heldOf"],
    "entity that holds a property vs the grabbed-row drag state", None, None, None, [], "Leave.")
row("G28", ["a", "I"], ACC, "t064",
    ["screen-renderer.ts:511:displayLanguageOf", "frame-loop.ts:845:displayLanguageIn", "screen-values.ts:23:DisplayLanguage"],
    "frame-loop.ts:843 WHY explains the fallback, not the copy; displayLanguageOf is exported but not a PI-37 member; the screen-values.ts:23 type can be published (ScreenRenderer->AdvanceScreenSession edge; refute overturned INTENDED for the type)",
    False, "null / undefined / ja / en: 0 of 4 differ (repro-G28.ts)", None, [],
    "Publish DisplayLanguage from advance-screen-session.ts and displayLanguageOf in PI-37; frame-loop imports it and deletes displayLanguageIn. single-html-shell.ts:300 and browser-stored-values.ts:23 read the browser store (not members).")
row("G29a", ["a", "I"], NAD, None,
    ["open-modals.ts:269:openSurfaceNameOf", "frame-loop.ts:831:openSurfaceNameIn"],
    "open-modals.ts:267 DEVIATION DFC-703 renames U-60 on purpose", None, None, None, ["DFC-703"], "Leave.")
row("G29b", ["a", "I"], INT, None,
    ["frame-loop.ts:889:surfaceOpenedBy", "frame-loop.ts:897:withSurfaceReplaced",
     "screen-values.ts:981:onSurfaceOpened", "screen-values.ts:1098:onWatermarkEntryPressed"],
    "frame-loop.ts:894 DEVIATION + DFC-705: T-280 has no open x surfaceEntryPressed cell, so the shell hosts the replace (JDG-57, rulings.md:134) (refute overturned ACCIDENTAL)",
    False, "24 inputs, 0 differ (repro-G29.ts)", None, ["DFC-705", "JDG-57"],
    "Leave until DFC-705 is fixed; then delete withSurfaceReplaced as DFC-705 says.")
row("G29x", ["a", "I"], ACC, "t064",
    ["open-modals.ts:41", "field-editing.ts:312", "frame-loop.ts:370", "screen-values.ts:915:WATERMARK_UNLOCK_SURFACE"],
    "the constant 'U-60' four times, no reason at any; screen-values.ts:915 not exported by advance-screen-session.ts",
    False, "equal", None, ["DFC-703"],
    "Publish WATERMARK_UNLOCK_SURFACE from advance-screen-session.ts (new PI-39 member); settle together with E43.")
row("G30", ["a"], NAD, None,
    ["command-palette.ts:290:isRecordingInteractions", "interaction-record.ts:39:isRecordingInteractionsIn"],
    "a pipe: frame-loop.ts:1622 fills the reading from the session", None, None, None, [], "Leave.")
row("G32a", ["b45", "I"], ACC, None,
    ["screen-renderer.ts:479", "frame-loop.ts:723", "row-title-panel.ts:143:HeldRow",
     "input-command-translator.ts:124:RowGrabAxis", "gesture-values.ts:12:GrabbedRowAxis",
     "row-title-panel-drawing.ts:184"],
    "frame-loop.ts:709 already uses ScreenViewReadings; GrabbedRowAxis is PI-39 (advance-screen-session.ts:75)",
    False, "type only (text identical)", None, [],
    "frame-loop.ts:723 -> ScreenViewReadings['rowGrabbedAt']; every axis literal -> GrabbedRowAxis (overlaps H19).")
row("G32b", ["b45", "I"], NAD, None,
    ["selection.ts:17:ItemRef", "item-hit-area.ts:29:Item"],
    "ItemRef keys a link by successorUid+ordinal, Item by predecessorUid+successorUid", None, None, None, [], "Leave.")
row("G44", ["b45", "G", "I"], ACC, "t064",
    ["frame-loop.ts:1246:entrySettledOnRelease", "frame-loop.ts:1254:answerSettledOnRelease",
     "frame-loop.ts:1262:surfaceSettledOnRelease", "frame-loop.ts:1270:formatSettledOnRelease",
     "screen-state-input.ts:140", "selection-input.ts:142"],
    "four guards at frame-loop.ts:1245-1275, no comment",
    False, "25 inputs, 0 differ (repro-G44.ts)", None, [],
    "Publish pressedPartOnRelease(input, context) from input-command-translator.ts (home screen-state-input.ts; new PI-18 member); frame-loop reads .entry / .part / .format / .confirmationAnswer off one call.")
row("G52", ["b"], ACC, None,
    ["field-entry-values.ts:240:combined", "file-flow-values.ts:714:combined", "gesture-values.ts:297:combined",
     "screen-values.ts:926:moved", "screen-values.ts:935:stayed", "notice-values.ts:176:withStanding",
     "notice-values.ts:181:withDelivery", "selection-values.ts:272:selected"],
    "the WHYs at field-entry-values.ts:238, file-flow-values.ts:712, gesture-values.ts:295 state SD-3 / SF-3, not a copy reason; session-step.ts:14 already holds unchanged",
    True, "patch equal to the current value (language 'ja' + displayLanguageChosen 'ja'): moved returns a new object, combined keeps the reference (repro-G52.ts)",
    UNREACH, [],
    "One generic combined<S,E>(values, moves, effects) in session-step.ts; the regions call it. Guard today: the only sender of displayLanguageChosen flips the language (frame-loop.ts:2139-2140).")
row("G53a", ["a", "G", "I"], ACC, "t064",
    ["frame-loop.ts:1208:isQuestionAskedIn", "file-flow-values.ts:681:isQuestionAsked"],
    "file-flow-values.ts:681 is private; advance-screen-session.ts does not export it",
    False, "3 states equal (repro-G53.ts)", None, [],
    "Publish isQuestionAsked(session) from advance-screen-session.ts (new PI-39 member).")
row("G53b", ["a", "G", "I"], ACC, None,
    ["frame-loop.ts:865:isDeliveringNoticesIn", "notice-values.ts:221",
     "notify-change-watchers.ts:65:isDeliveringNotices", "agent-api-members.ts:382", "agent-api-members.ts:404"],
    "two stores of one fact (AG-11 / WS-2); agent-api-members.ts:382 reads the session copy, :404 the watchers flag (judge C's N3)",
    True, "right after sendToSession(DOCUMENT_REPLACED) (frame-loop.ts:1382) and before notifyChangeWatchers sets the flag: session true, watchers false (repro-G53.ts, a model)",
    UNREACH, ["DFC-537"],
    "Keep one store: agent-api-members.ts:404 reads snapshot.isDeliveringNotices like :382. Guard today: no synchronous reader between frame-loop.ts:1382 and the flag set.")
row("G53c", ["a", "G", "I"], NAD, None,
    ["frame-loop.ts:1656:ask", "file-flow-values.ts:727:asked"],
    "ask requests a frame (frame-loop.ts:1657-1662); asked builds a ConfirmationState", None, None, None, [], "Leave.")
row("G53d", ["a", "G", "I"], NAD, None,
    ["field-entry.ts:62:isEditingFieldIn", "field-entry.ts:161:isEditingField", "field-entry-values.ts:265:isEditedField"],
    "any field vs this row (WHY CR-500 decision 5, field-entry-values.ts:263)", None, None, None, ["DFC-977"], "Leave.")
row("G53e", ["a", "G", "I"], NAD, None,
    ["frame-loop.ts:2719:fullScreenChanged", "screen-values.ts:973:onFullScreenChanged"],
    "forwarder (frame-loop.ts:2720-2722)", None, None, None, [], "Leave.")
row("G53x", ["a", "G", "I"], ACC, "t064",
    ["frame-loop.ts:831", "frame-loop.ts:837", "frame-loop.ts:850:panelShowingIn", "frame-loop.ts:858:standingNoticesIn",
     "frame-loop.ts:1135", "frame-loop.ts:1140", "frame-loop.ts:1148", "frame-loop.ts:1161", "frame-loop.ts:1208",
     "frame-loop.ts:1213", "frame-loop.ts:1219", "frame-loop.ts:1224", "field-entry.ts:51", "field-entry.ts:56",
     "field-entry.ts:62", "interaction-record.ts:39", "command-palette.ts:157", "tooltips.ts:158",
     "app-header-items.ts:64", "screen-frame.ts:78", "notice-values.ts:194"],
    "advance-screen-session.ts exports no readers (exports :65-245); the framework and ScreenRenderer each project the session themselves",
    False, "one-line projections, equal", None, [],
    "One readers module published from advance-screen-session.ts (new PI-39 members); frame-loop, field-entry, interaction-record and the ScreenRenderer inline twins import it. This is CR-578's home question for the session readers (also I03, I05).")
row("G54", ["a"], NAD, None,
    ["selection.ts:55:isSelected", "selection-values.ts:272:selected"],
    "membership test vs a reducer that stores a Selection", None, None, None, [], "Leave.")
row("G54x", ["a", "E", "I"], ACC, "t064",
    ["selection.ts:37:isSameItem", "selection-values.ts:241:isSameObject", "edit-task.ts:135:sameRow"],
    "selection.ts is Selection's public entry but isSameItem is not a PI-32 member; E31 is the same pair; the frame-loop pair isSameGrabbedItem / itemKeyOf (frame-loop.ts:1114, :1168) keys Item, not ItemRef (not a member)",
    True, "{kind:'task',uid:1} vs {kind:'task',uid:1,taskUid:1}: isSameItem true, isSameObject false (repro-G54.ts); equal on every well-formed ItemRef. Reachability not shown: no producer of an extra-field ItemRef was found",
    None, [],
    "isSameSelection uses isSameItem (add it to PI-32); delete isSameObject.")
row("G56", ["b45", "G"], ACC, "t064",
    ["schedule-geometry.ts:196", "copy-and-paste.ts:29", "drawn-selection.ts:78", "svg-renderer.ts:470", "item-grab.ts:532"],
    "no comment at any site; all may import document-model (inward)",
    False, "equal (Set vs array only)", None, ["DFC-281"],
    "Publish selectedTaskUids(selection) from selection.ts (new PI-32 member); the five sites import it.")
row("G57a", ["b", "b45", "G"], ACC, None,
    ["notices-drawing.ts:76", "open-modals-drawing.ts:524", "notices-drawing.ts:48:nextStepElement",
     "open-modals-drawing.ts:510", "notices-drawing.ts:127", "open-modals-drawing.ts:491"],
    "open-modals-drawing.ts:510-514 hand-rolls nextStepElement though :435 already imports it",
    False, "equal today; would differ if RS-50's nextStep gains the download slot", None, [],
    "importReportElements calls nextStepElement; one dismissButton(host, attr, value, text) helper.")
row("G57b", ["b", "b45", "G"], ACC, None,
    ["dom-screen-surface.ts:582:commandEntry", "open-modals-drawing.ts:82:rosterSelectionEntry",
     "row-title-panel-drawing.ts:410:panelCornerEntryElement", "row-title-panel-drawing.ts:241:rowControlElement"],
    "same component (DomScreenSurface), no comment",
    True, "icon IC-5 labelled 'Undo': commandEntry aria-label 'Undo' + data-enabled / pressed / armed; the other three aria-label 'IC-5' and no state (repro-G57.ts) | steps: any Resource Roster or panel-corner button; not user-visible (no screen-reader support, user ruling 2026-09-17)",
    REACH, [],
    "One iconButton(host, icon, label, style) in dom-screen-surface.ts; the four call it.")
row("G57c", ["b", "b45", "G"], ACC, None,
    ["tooltips.ts:57", "open-modals-drawing.ts:134", "open-modals.ts:152:helpPress", "tooltips.ts:59"],
    "the adapter already hands keys / press (screen-renderer.ts:283-284); the drawing joins them again",
    False, "6 inputs equal", None, [],
    "The adapter puts one joined assignment on HelpEntry; the drawing drops its join and separator.")
row("G64a", ["a", "I"], NAD, None,
    ["frame-loop.ts:997", "frame-loop.ts:1005", "frame-loop.ts:1013", "frame-loop.ts:1017", "frame-loop.ts:1022",
     "frame-loop.ts:1023", "frame-loop.ts:1452:matchWatermarkUnlock"],
    "forwarders (frame-loop.ts:990-1026)", None, None, None, [], "Leave.")
row("G64b", ["a", "I"], NAD, None,
    ["single-html-shell.ts:460:showScreenView", "single-html-shell.ts:484:focusPropertyField",
     "single-html-shell.ts:486:readWatermarkUnlockAnswer"],
    "wraps and forwards", None, None, None, [], "Leave.")
row("G64c", ["a", "I"], NAD, None,
    ["agent-api-members.ts:492:importDocument", "agent-api-members.ts:548:undoEdit", "agent-api-members.ts:560:redoEdit",
     "agent-api-members.ts:582:exportSvg", "agent-api-members.ts:625:exportPng", "agent-api-members.ts:689:exportEmbeddedHtml",
     "agent-api-members.ts:753:watchChanges", "agent-api-members.ts:774:postDialogueMessage"],
    "each gates then calls the named function (e.g. :608, :698, :755)", None, None, None, [], "Leave.")
row("G64d", ["a", "I"], ACC, None,
    ["watermark-unlock.ts:47:answerWatermarkUnlock", "screen-values.ts:1106:isWatermarkUnlockSurface",
     "screen-values.ts:1111:onWatermarkUnlockAnswered"],
    "the guard watermark-unlock.ts:48 re-derives screen-values.ts:1106, no comment; matchWatermarkUnlock (:56) only hashes and sends (not a member)",
    False, "equal", None, [],
    "Compare the session before / after the send (the pattern of frame-loop.ts:2719-2722), or publish isWatermarkUnlockSurface.")
row("G64f", ["a"], ACC, None,
    ["agent-api-members.ts:585", "agent-api-members.ts:628", "agent-api-members.ts:600", "agent-api-members.ts:643"],
    "the picture gate is written twice in one file (judge C's N2): :585-598 vs :628-641 and :600-605 vs :643-648",
    False, "equal", None, [], "Fold into one pictureRefusal(member, snapshot).")

# ---------------------------------------------------------------- groups.md, body D
row("G33", ["b", "b45", "c", "d", "G", "I"], ACC, "t064",
    ["mspdi-codec.ts:163:durationOfMinutes", "mspdi-codec.ts:170:minutesPerWorkingDay",
     "task-plan-actual.ts:277:durationText", "task-plan-actual.ts:270:minutesPerDayOf"],
    "bodies character-identical (mspdi-codec.ts:163-174 vs task-plan-actual.ts:270-280); only 'see EX-9 / FR-054, S-128' beside them",
    False, "0 differences (repro-G33.ts); both share one latent flaw: Infinity -> 'PTInfinityHNaNM0S'", None, ["PND-163", "DFC-666"],
    "Home Schedule: durationTextOfMinutes(minutes) + minutesPerWorkingDay(project) beside working-calendar.ts, published by schedule.ts (new PI-1 members). Not EditDocument: DocumentCodec->EditDocument is not an edge.")
row("G34", ["c", "G", "I"], ACC, "t064",
    ["mspdi-codec.ts:1157:writtenConstraintOfGrs", "mspdi-codec.ts:1152:MUST_START_ON",
     "task-plan-actual.ts:223:datedPlanOf", "task-plan-actual.ts:235:pinnedToStart", "task-plan-actual.ts:214:MUST_START_ON"],
    "the export-vs-edit split is intended (WHY mspdi-codec.ts:1155, task-plan-actual.ts:232-233); the kernel (MUST_START_ON '2', the Duration formula) has no reason",
    True, "start 1900-01-01, finish 2200-01-01: export writes ConstraintType + ConstraintDate, no Duration, and a notice (try/catch :1166-1177); edit throws DaySpanTooWide (datedPlanOf :227 has no catch) (repro-G34.ts) | steps: open a GRS JSON with importMinDate 1900-01-01 (a free string, kept), then edit a Task to span more than 231 years",
    REACH, ["DFC-666", "DFC-665", "DFC-553"],
    "Publish one startPinOf(task, schedule, within) -> {constraintType, constraintDate, duration} | null and MUST_START_ON from Schedule (new PI-1 members); writtenConstraintOfGrs keeps its sourceFormat gate, DV-8 check and try/catch; pinnedToStart keeps its gate.")
row("G34x", ["c", "G", "I"], NAD, None,
    ["json-codec.ts:226:withSourceFormatOfAnOlderDocument", "mspdi-codec.ts:342:scheduleFromRoot"],
    "both call the one mspdiVersionOfCarried (mspdi-codec.ts:242); json-codec.ts:233 only adds the grs branch",
    None, None, None, [], "Leave.")
row("G35a", ["a"], ACC, None,
    ["grs-json-schema.ts:1193:fault", "mspdi-xml.ts:32:fault"],
    "JsonFault (grs-json-schema.ts:8) and MspdiFault (mspdi-xml.ts:6) are the same {at, what} with identical builders in one component (refute overturned NOT-A-DUPLICATE in part)",
    False, "equal", None, [], "One CodecFault type and fault() inside DocumentCodec.")
row("G35b", ["a"], NAD, None,
    ["embedded-html-codec.ts:34:fault", "file-gateway.ts:120:fault", "file-system-access-file-store.ts:113:fault",
     "json-codec.ts:69:refusal", "validate-imported-document.ts:46:refusal"],
    "one-line literal constructors of different types", None, None, None, ["DFC-727"], "Leave (DFC-727 holds the two ImportRefusal types).")
row("G36", ["b", "b45", "G"], ACC, "t064",
    ["schedule-invariants.ts:67:nestingOf", "schedule-invariants.ts:158:dateBreaches", "schedule-invariants.ts:394",
     "schedule-invariants.ts:595", "schedule-invariants.ts:736", "validate-imported-document.ts:92:wbsShapeOf",
     "validate-imported-document.ts:58:sweepDateColumns", "validate-imported-document.ts:197",
     "validate-imported-document.ts:203", "validate-imported-document.ts:221", "validate-imported-document.ts:252",
     "validate-imported-document.ts:260"],
    "no reason beside either copy; validate-imported-document.ts:224 explains the S-119 refusal, not the copy; the bounds source differs on purpose (document-file-flow.ts:468-469 TRAP)",
    True, "importMinDate 'garbage' + task.start 'nope': the entity reports 'names no day', the use case nothing for the column (it skips the sweep on an unreadable bound, validate-imported-document.ts:234, :242, :279) (repro-G36.ts) | steps: keep a hand-edited GRS JSON whose importMinDate is not a day (a free string, grs-json-schema.ts:939) as the current document, then open a file with an unreadable date: the refusal carries no IV-14 row, so document-file-flow.ts:270 / :291 seeds no IV-14 drop",
    REACH, ["DFC-548", "DFC-553"],
    "Home schedule-invariants.ts: publish a nesting walk and dateBreaches(row, columns, at, accepted | null) from schedule.ts (new PI-1 members); validate maps Breach to ImportRefusal. Decide first whether an unreadable bound suppresses the per-column 'names no day'.")
row("G38", ["a", "I"], NAD, None,
    ["mspdi-child-placement.ts:141:isLeaf", "mspdi-child-placement.ts:108:rankOf", "mspdi-codec.ts:288:leaf",
     "task-group-order.ts:58:rankOf", "mspdi-codec.ts:267:rowsOf", "schedule-invariants.ts:207:rowOf"],
    "predicate vs constructor; XML schema rank vs row rank; MSPDI carry holders vs ENTITY_ROWS rows",
    None, None, None, [], "Leave.")
row("G39", ["b", "G"], ACC, "t064",
    ["document-settings.ts:467:expressionValueOf", "schedule-invariants.ts:272:boundValueOf",
     "schedule-invariants.ts:260:settingNumberOf"],
    "document-settings.ts:465 TRAP names the copy, no reason",
    True, "expression [{key:'pinnedGroupIds'}] with ['a','b'] -> expressionValueOf null, boundValueOf 2; [{key:'sizes.1'}] -> 20 vs null (repro-G39.ts)",
    UNREACH, [],
    "Publish one boundValueOf(expression, settings) from document-settings.ts (new PI-2 member) with settingNumberOf's list-as-length reading (schedule-invariants.ts:258 TRAP). Guard today: no generated SETTINGS_BOUNDS expression names a list key (document-settings.ts:288-400).")
row("G40a", ["a", "b", "b45", "G"], ACC, None,
    ["edit-annotation.ts:64:withSchedule", "edit-resource.ts:26:withSchedule", "edit-task-group.ts:69:withSchedule"],
    "bodies identical inside EditDocument; the exported one exists (edit-task-group.ts:69)",
    False, "equal", None, [], "edit-annotation.ts and edit-resource.ts import withSchedule from edit-task-group.ts.")
row("G40b", ["a", "b", "b45", "G"], NAD, None,
    ["edit-task.ts:129:withSchedule", "edit-task-group.ts:69:withSchedule"],
    "whole-Schedule replace vs Partial merge: a name clash, not a copy", None, None, None, [],
    "Rename edit-task.ts:129 (e.g. withWholeSchedule).")
row("G40c", ["a", "b", "b45", "G"], ACC, None,
    ["edit-dependency.ts:50:withTask", "edit-task.ts:143:withTask"],
    "same component, no reason; edit-task.ts:145 TRAP (document-change-plan.ts compares references) is not honoured by the copy",
    True, "a no-op task: edit-task.ts:143 returns the same document, edit-dependency.ts:50 a new one (repro-G40-G51-G60.ts)",
    UNREACH, [],
    "edit-dependency.ts imports withTask from edit-task.ts. Guard today: every editDependency arm passes a fresh dependencies array (edit-dependency.ts:108-111, :122, :145).")
row("G40d", ["a", "b", "b45", "G"], NAD, None,
    ["redo-edit.ts:39", "undo-edit.ts:46:withDocumentLeftBehind"],
    "mirror images: undone[0] vs done[last] (redo-edit.ts:37 TRAP)", None, None, None, ["DFC-543"], "Leave.")
row("G40e", ["a", "b", "b45", "G"], NAD, None,
    ["task-group-folding.ts:162", "task-group-look.ts:15", "task-group-look.ts:48"],
    "shared shape only; different fields and rules (CM-85 vs CM-30/31/32)", None, None, None, [], "Leave.")
row("G49", ["c"], NAD, None,
    ["file-gateway.ts:168:destinationIdentity", "document-file-flow.ts:304:projectIdentityFromText"],
    "file-gateway.ts:170 takes the function as a parameter (caller and callee)", None, None, None, [], "Leave.")
row("G50a", ["c", "H"], NAD, None,
    ["document-codec.ts:78:extensionOf", "document-file-flow.ts:134:extensionOfForm",
     "file-system-access-file-store.ts:106:saveFileTypesFor"],
    "extensionOfForm delegates to the published extensionOfFormat (document-file-flow.ts:135)", None, None, None, [], "Leave.")
row("G50b", ["c", "E", "H"], ACC, "t064",
    ["document-codec.ts:40:ROW_OF_FORMAT", "document-codec.ts:50:READABLE_FORMATS",
     "document-file-flow.ts:124:TABLE_ROW_OF_SAVE_FORM", "file-gateway.ts:94:ROUND_TRIP_FORMS"],
    "document-file-flow.ts:122-123 TRAP names the copy, no reason; ROW_OF_FORMAT private; E35 added ROUND_TRIP_FORMS",
    False, "{grsJson, mspdi} in all three", None, ["DFC-536", "DFC-720"],
    "document-codec.ts publishes the round-trip formats and the row binding (new PI-20 members); file-gateway.ts and the shell import them.")
row("G51", ["b"], ACC, None,
    ["edit-task-group.ts:120:wbsSubtreesOf", "edit-task.ts:197:wbsSubtreeOf"],
    "recorded, undecided (DFC-990); JDG-567 fixed the merged name wbsSubtreesOf; edit-task.ts:196 WHY is sweep vs recursion only",
    False, "equal on 7 shapes incl. rings (repro-G40-G51-G60.ts)", None, ["DFC-990", "JDG-567"],
    "edit-task.ts uses wbsSubtreesOf(schedule.tasks, [uid]); task-paste.ts:19 passes all sources at once (closes DFC-990 option 1).")
row("G58", ["c", "I"], NAD, None,
    ["properties-panel.ts:274:compareAssignees", "field-commit.ts:297:resourceUidOfName"],
    "a comparator vs name -> uid resolution (AS-8); they agree by construction", None, None, None, ["DFC-54"], "Leave.")
row("G59", ["c"], NAD, None,
    ["calendar-day.ts:78:monthsAfter", "tooltips.ts:168:readoutDate", "tooltips.ts:175:readoutSpan"],
    "readoutSpan calls the published calendarSpanOf (tooltips.ts:177)", None, None, None, [], "Leave.")
row("G60a", ["c"], ACC, "t064",
    ["document-file-flow.ts:149:defaultDocumentSettings", "json-codec.ts:88:settingDefaultOf"],
    "both unflatten SETTINGS_DEFAULTS, no comment",
    True, "key 'a.b.c' = 1 -> defaultDocumentSettings {b:{c:1}}, settingDefaultOf {'b.c':1}; keys a=5 and 'a.b'=1 -> {b:1} vs 5 (repro-G40-G51-G60.ts)",
    UNREACH, ["DFC-981"],
    "Publish one nested-defaults builder from document-settings.ts (new PI-2 member); settingDefaultOf(key) = built[key]. Guard today: generated SETTINGS_DEFAULTS keys have at most 2 segments (document-settings.ts:150-280).")
row("G60b", ["c"], NAD, None,
    ["import-document.ts:214:restoredSettings", "json-codec.ts:115:readSettingsFaults"],
    "merge of a file's keys (OP-6) vs sorting schema faults", None, None, None, [], "Leave.")
row("G61", ["a", "I"], NAD, None,
    ["edit-task.ts:164:visualOf", "task-appearance.ts:30:withVisual"],
    "reader vs writer (withVisual reuses blankVisual / sameRow); method G noted properties-panel.ts:451, :494 and field-commit.ts:204 find the visual without the blank default",
    None, None, None, [], "Leave.")

# ---------------------------------------------------------------- method E (reading sweep)
row("E01", ["E", "G", "I"], ACC, "t064",
    ["input-command-translator.ts:517:dayAnchorAt", "input-command-translator.ts:500:unitFraction",
     "fit-zoom.ts:146:fittedLeftEdge"],
    "no comment beside either; judge A had seen the pair as G03's extra",
    True, "pxPerDay 1e-7, originX -1e6, x -999999.999986 -> translator 7.6e-6, fit 0; equal on 72017 other x (repro-G03.ts)",
    UNREACH, [],
    "Publish one dayAnchorAtX(axis, x) from time-axis.ts (new PI-5 member); both call it. Guard today: pxPerDay >= 0.5 x 0.02 x 0.3125 = 0.003125 (document-settings.ts:364, edit-document.ts:302).")
row("E02", ["E"], ACC, None,
    ["working-calendar.ts:117:IMPORT_MIN_DAY", "working-calendar.ts:118:IMPORT_MAX_DAY",
     "document-settings.ts:196", "document-settings.ts:199"],
    "working-calendar.ts:117-120 restate the generated defaults as literals and size ACCEPTED_DAY_SPAN from them, while checkDay (edit-task.ts:180-190) reads the document's own S-120",
    True, "equal today (literal == default). A document with importMaxDate 2400-12-31: PA-5 1970-01-02..2300-12-31 is accepted by checkDay, then editDocument throws DaySpanTooWide (rf/e02.ts, real code) | steps: open a hand-edited GRS JSON whose importMaxDate is 2400-12-31 (grs-json-schema.ts:930 string only) and set a plan / actual across 330 years",
    REACH, ["DFC-553"],
    "Build ACCEPTED_DAY_SPAN from the bounds in force, not the defaults: DFC-553 fix 1 (build it from SETTINGS_DEFAULTS) does not close the throw, since a document's S-120 can exceed any default.")
row("E03", ["E", "I"], ACC, "t064",
    ["frame-loop.ts:1295:readInstantOfWrite", "dialogue-field-drawing.ts:16:stampOf"],
    "01-04-requirements.md:5777 wants AT-127 / AT-129 spelled alike; no comment on the copy",
    True, "ms 253402300800000 -> '+010000-01-01T00:00:00Z' vs '+010000-01-01T00:00Z'; 200000 in-range ms equal (repro-E03.ts)",
    UNREACH, [],
    "One pure instantTextOf(ms) in calendar-day.ts, published by schedule.ts (new PI-1 member). Guard today: both read the wall clock (dialogue-field-drawing.ts:73).")
row("E04", ["E", "G", "I"], ACC, "t064",
    ["percent-complete.ts:36:heldActualLength", "properties-panel.ts:259:textOfActualLength",
     "mspdi-codec.ts:1190:writtenActualDuration", "schedule-invariants.ts:741", "validate-imported-document.ts:262"],
    "no comment; only mspdi-codec.ts:1197-1206 catches DaySpanTooWide",
    True, "with E02's widened bounds, percent-complete.ts:30-40 and the Properties Panel throw where mspdi-codec.ts catches (rf/e02.ts, real code) | steps: as E02",
    REACH, ["DFC-682"],
    "Publish heldActualLengthOf(within, task): number | null from working-calendar.ts via schedule.ts (new PI-1 member); callers keep their own null fallback.")
row("E05", ["E"], ACC, "t064",
    ["row-tree-entrances.ts:276:isRowUnder", "task-group-folding.ts:78:isBelowRow"],
    "isBelowRow private; task-group-folding.ts:71 WHY explains the step cap, not the copy",
    False, "6,301,434 random cases incl. rings: 0 differ (repro-E05.ts)", None, [],
    "isRowBelow(byId, row, ancestorId) in Schedule beside G05's rowDepthOf (new PI-1 member); both import it.")
row("E07", ["E", "I"], ACC, "t064",
    ["mspdi-codec.ts:1060:taskDepths", "mspdi-imported-rows.ts:24", "mspdi-imported-rows.ts:60"],
    "no comment; sibling of G36 (wbsShapeOf / nestingOf)",
    True, "repeated Task UID [1, 2<-1, 1<-2] -> {1:4, 2:4} vs {1:3, 2:2}; a level-3 Task given its level-1 ancestor's UID exports OutlineLevel [1,2] for imported [1,3] (rf/e07.ts, rf/e07b.ts, real code) | steps: open an MSPDI whose Task UIDs repeat: documentFromMspdi and validateImportedDocument accept it; only scheduleViolations sees IV-1, and the open path never reads it (DFC-922)",
    REACH, ["DFC-922"],
    "One wbsDepthOf from schedule-invariants' nestingOf, published by schedule.ts (new PI-1 member); taskDepths and rowsFromTasks read it. The child-before-parent case is unreachable (stack-built import, mspdi-codec.ts:526-532).")
row("E08", ["E", "G"], ACC, "t064",
    ["row-title-panel.ts:73:rowTitleFontPxOf", "schedule-layout.ts:317:bandFloorOf"],
    "bandFloorOf private; schedule-layout.ts:321-323 TRAPs explain drawn settings, not the copy",
    False, "same expression over the same drawn settings", None, ["DFC-608"],
    "schedule-layout.ts publishes rowTitleFontPxOf(depth, stored) = bandFloorOf(depth, drawnSettingsOf(stored)) (new PI-5 member); screen-renderer.ts re-exports it.")
row("E09", ["E"], ACC, None,
    ["row-grab.ts:241:drawnRowIndentOf", "row-title-panel.ts:171", "screen-regions.ts:108"],
    "row-grab.ts:238 TRAP explains drawn vs stored, not the copy; drawnSettingsOf is PI-35",
    True, "all 10 displayScale steps equal; displayScale 0 -> 0 vs 16 (repro-E09-E12-E13.ts)",
    UNREACH, [],
    "row-grab.ts reads drawnSettingsOf(settings).rowTitleIndent. Guard today: displayScale is a schema enum, all > 0 (grs-json-schema.ts:847).")
row("E10", ["E", "G"], ACC, None,
    ["edit-task-group.ts:171", "edit-task.ts:237"],
    "01-04-requirements.md:5431 forbids two removal chains (CD-1); both WHYs give the settle reason, not the copy",
    False, "equal by reading", None, ["DFC-990", "DFC-999"],
    "One withTasksRemoved(schedule, doomed, defaultRowName) in EditDocument; deleteTaskGroup adds its row / annotation / pin pruning on top.")
row("E11", ["E", "G"], ACC, None,
    ["task-create.ts:76", "task-group-naming.ts:58", "document-change-plan.ts:176:documentHoldingOneRow",
     "mspdi-imported-rows.ts:33"],
    "four TaskGroup literals; mspdi-imported-rows.ts:33-43 writes treeState 'auto' literally instead of COLUMN_DEFAULTS.TaskGroup.treeState (schedule-entities.ts:658)",
    False, "equal today", None, [],
    "A newTaskGroup({id, parentId, label, derivedFromTaskUid, order}) factory in Schedule; at minimum mspdi-imported-rows.ts reads COLUMN_DEFAULTS.")
row("E12", ["E"], ACC, "t064",
    ["row-tree-entrances.ts:205:orderPastLastChild", "task-create.ts:73"],
    "row-tree-entrances.ts:206 TRAP explains max+1 vs count, not the copy",
    True, "root orders [-5, -3] -> entrance -2, task-create 0 (repro-E09-E12-E13.ts); both land past the last root, so only the stored number differs | steps: open a GRS JSON with negative root orders (AT-55 integer, no minimum) and add a root row",
    REACH, [],
    "Publish orderPastLastChild(schedule, parentId) from Schedule (new PI-1 member); task-create.ts calls it with null.")
row("E13", ["E"], ACC, "t064",
    ["schedule-layout.ts:399", "task-group-order.ts:42:compareByStackOrder"],
    "localeCompare vs code units, no comment (assignee-label.ts:29 WHY argues against localeCompare)",
    True, "start '' vs null: task-group-order answers 1 both ways, the layout falls to uid; equal on 10000 reachable pairs (repro-E09-E12-E13.ts)",
    UNREACH, [],
    "Publish compareByStackOrder (ST-2) from schedule-layout.ts (new PI-5 member); the lane sort uses it. Guard today: '' is refused (validate-imported-document.ts:71, edit-task.ts:182).")
row("E14", ["E", "G", "I"], ACC, "t064",
    ["frame-loop.ts:1031:drawnRowBoxesOf", "schedule-grid.ts:227"],
    "identical top / bottom clip, no reason; judge A found it as N2",
    False, "equal", None, ["DFC-991", "DFC-539"],
    "Per DFC-991: drawnRowBoxesOf moves to ScreenRenderer (new PI-37 member); schedule-grid.ts computes the band from it.")
row("E17", ["E", "G", "I"], ACC, None,
    ["frame-loop.ts:1930:collectPress", "frame-loop.ts:1963:grabAtPointer", "pointer-shape.ts:331:pointerShapeUnder"],
    "no reason; PTD-2 (01-04-requirements.md:3310) says no hit test while the Dual Cursor follows",
    True, "Dual Cursor following + press on a bar: collectPress hit {GA-1 item}, grabAtPointer null (repro-E17-E18.ts) | steps: any document, Dual Cursor following, press a bar; every command reader neutralises it (pressRowOf answers PTD-2 first, input-command-translator.ts:609); frame-loop.ts:1710 still sends pressedOn {kind:'grab'} (unmeasured)",
    REACH, ["DFC-872", "PND-391"],
    "One itemUnderPointer(frame, x, y, on, resolving) in frame-loop applying all three guards; collectPress uses it; pointerShapeUnder takes the guarded hit.")
row("E18", ["E", "G", "I"], ACC, None,
    ["input-command-translator.ts:884:isOnTheChart", "frame-loop.ts:1953:startsNoTextSelection"],
    "PE-0 split across two layers; JDG-277 (rulings.md:391) sets the range, JDG-278 exempts only the right button",
    True, "left down on the canvas margin -> false vs true; middle down on rowArea -> true vs false (repro-E17-E18.ts)",
    UNREACH, [],
    "One PE-0 predicate in the translator (press-point rule + scheduleCanvas); delete startsNoTextSelection. Guard today: the only reader takes the OR of both (frame-loop.ts:2672-2673; dom-input-source.ts:205, :255).")
row("E20", ["E"], ACC, "t064",
    ["zoom-and-fit.ts:282:namesAPlace", "view-place.ts:28:storedNamesAPlace"],
    "TRAPs zoom-and-fit.ts:278-279 and view-place.ts:24-25 say change both, no reason",
    False, "equal", None, ["CR-577"],
    "Publish storedPlaceIsNamed(schedule, settings) from Schedule or ScheduleLayout (new member). Collides with drafted CR-577, which reserves zoom-and-fit.ts for its wave.")
row("E21", ["E"], ACC, "t064",
    ["zoom-and-fit.ts:107:rowAxisReadingOf", "zoom-and-fit.ts:169:deepestFloorZoomYOf",
     "shape-cross-sections.ts:73:planHeightFloor", "shape-cross-sections.ts:78:zoomYAtPlanHeightFloor",
     "shape-cross-sections.ts:84:planHeightOf", "schedule-layout.ts:307"],
    "shape-cross-sections.ts:71 'TRAP: the one spelling of this floor' is violated; schedule-layout.ts:60-64 does not re-export zoomYAtPlanHeightFloor / planHeightOf",
    False, "bit-identical (same IEEE operations in the same order)", None, ["CR-577", "JDG-608", "DFC-1010", "DFC-336"],
    "Re-export zoomYAtPlanHeightFloor and an unratioed planHeightAt(settings) from schedule-layout.ts (new PI-5 members). Collides with drafted CR-577 (it rewrites rowAxisReadingOf and deepestFloorZoomYOf).")
row("E22", ["E"], ACC, None,
    ["display-scale-steps.ts:70:rowAreaWidthAt", "screen-regions.ts:180:regionsAtDisplayScale"],
    "both used inside displayScaleWrites (display-scale-steps.ts:79, :94); regionsAtDisplayScale is already imported",
    True, "W 800, H 600, scrollbar 16.8, title 333, displayScale 50->67 -> 313.75625 vs 313.75624999999997 (1007 of 10080 cases, max 4.5e-13 px) (repro-E22.ts) | steps: any fractional viewport or scrollbar; the effect is sub-pixel, no user step shows it",
    REACH, ["DFC-697"],
    "Compute afterRegions first and use afterRegions.rowArea.width; delete rowAreaWidthAt.")
row("E23", ["E", "G"], ACC, "t064",
    ["frame-drags.ts:70:travelInsideHeldWidth", "frame-drags.ts:80:travelInsideHeldHeight",
     "screen-frame.ts:178:visibleHeightOf", "screen-frame.ts:184:scrollExtentOf"],
    "frame-drags.ts:67-68 WHY justifies the held whole, not the copy; visibleHeightOf private",
    False, "equal", None, [],
    "Publish visibleHeightOf (or scrollOffsetsOf) from screen-renderer.ts (new PI-37 member); frame-drags reads it.")
row("E24", ["E"], ACC, None,
    ["zoom-and-fit.ts:456:treeStatesReset", "zoom-and-fit.ts:469", "task-group-folding.ts:181:resetTaskGroupTreeStates"],
    "zoom-and-fit.ts:453 TRAP only says change both; treeStateWritesFor is PI-9 and already imported (zoom-and-fit.ts:17-18)",
    False, "equal (generated T-328 rows == the hand rule)", None, ["CR-577"],
    "treeStatesReset applies treeStateWritesFor(schedule, {type:'fitPressed'}); drop the hand predicate and the 'auto' literal. Collides with drafted CR-577 (same file).")
row("E25", ["E"], ACC, "t064",
    ["dom-input-source.ts:139:pixelsPerUnit", "open-modals-drawing.ts:241:wheelUnitPx"],
    "no WHY on either; PND-91 / JDG-300 rule 1 line = 40 px, so the roster (font size) is the wrong side",
    True, "deltaMode 1 (line), delta 3, font 16px -> chart 120 px, roster 48 px (repro-E25.ts) | steps: on a host that reports line-mode wheel, Ctrl+Shift+wheel over the Resource Roster (open-modals-drawing.ts:231-238). Caveat: both handlers read deltaX / deltaY before deltaMode, which in current Firefox makes it report pixels (not measured)",
    REACH, ["PND-91", "JDG-300"],
    "One wheelPixels(deltaMode, delta, lineHeight, pageSize) in an inner pure home (new member) with 1 line = 40 px (JDG-300); both call it.")
row("E27", ["E", "G"], ACC, "t064",
    ["row-title-panel.ts:79:labelCutToFit", "name-label.ts:16:truncate"],
    "truncate private; the only caller passes an integer unit count (name-label.ts:83)",
    False, "no live difference: the 94 / 24400 boundary cases appear only under the proposed merge (a hazard of the fix; refute refuted the judge's reachable differ) (repro-E27.ts)",
    None, ["DFC-612"],
    "Export truncate(text, limitUnits) from schedule-layout.ts (new PI-5 member); labelCutToFit = truncate(text, available / (font x labelCoef)); test the exact-boundary cases when merging.")
row("E28", ["E", "I"], ACC, "t064",
    ["assignee-label.ts:31:compareLabelled", "properties-panel.ts:274:compareAssignees",
     "properties-panel.ts:282:assigneesOf", "assignee-label.ts:38", "field-commit.ts:326"],
    "both WHYs (assignee-label.ts:29, properties-panel.ts:272) justify code-unit order, not the copy; method I added assigneesOf x3",
    False, "same total order", None, [],
    "Export compareLabelled (as compareAssigneeNames) and the assignees-of-a-Task reader from schedule-layout.ts (new PI-5 members); properties-panel.ts and field-commit.ts import them.")
row("E29", ["E"], ACC, None,
    ["grs-json-schema.ts:1250:stringFaults", "mspdi-fade-frames.ts:48:isAliasUsable"],
    "mspdi-fade-frames.ts:47 TRAP says why code points; stringFaults has no reason for UTF-16 units; the manuscript schema is draft 2020-12, whose maxLength counts code points (grs-document.schema.json:875; AT-1 '16 characters')",
    True, "Project UID of 9 emoji (9 code points, 18 units): MSPDI import ok, save as GRS JSON, reopen -> refused RS-25 'longer than the 16 characters allowed' (rf/e29.ts, real code) | steps: open an MSPDI whose Project UID holds astral characters, save it as GRS JSON, open that file: the app refuses its own file. 20 ASCII characters do the same (import never bounds AT-1)",
    REACH, [],
    "One lengthInCharacters(text) = [...text].length inside DocumentCodec; stringFaults uses it. Separately, bound AT-1 on MSPDI import.")
row("E30", ["E"], ACC, "t064",
    ["document-change-plan.ts:143:utf8Length", "document-file-flow.ts:653"],
    "LR-6 (tsconfig.entity.json:12-13) forbids TextEncoder only inside use-case; document-file-flow.ts:653 needs only the length (refute overturned INTENDED). file-gateway.ts:103 needs the bytes (not a member)",
    False, "equal incl. lone surrogates (repro-E30.ts)", None, [],
    "Publish utf8Length from apply-document-change.ts (new PI-8 member); document-file-flow.ts uses it (SingleHtmlShell already imports ApplyDocumentChange).")
row("E32", ["E", "G", "I"], ACC, "t064",
    ["command-palette.ts:81:drawnTaskUids", "input-command-translator.ts:1210:chosenDrawnTaskCount"],
    "same join body, both cite FR-029 / FR-034; both inputs come from drawnRowBoxesOf (frame-loop.ts:761, :1991, :2011); judge A found it as N1",
    False, "equal", None, ["DFC-281"],
    "Publish tasksOnRows(schedule, groupIds) from Schedule (new PI-1 member); both call it.")
row("E33", ["E", "I"], ACC, "t064",
    ["open-modals.ts:219:tasksReachedByEachResource", "input-command-translator.ts:1156:rosterChoiceOfEntry",
     "deletion-confirmations.ts:64:confirmationOwedByResourceDeletion"],
    "the CD-5 predicate 'some assignment names the resource' three times, no reason",
    False, "equal", None, ["DFC-539", "DFC-540"],
    "Publish referencedResourceUids(schedule) from Schedule (new PI-1 member); the three read it.")
row("E34", ["E", "G"], ACC, None,
    ["task-paste.ts:43:pasteTaskSubtree", "edit-task-group.ts:313"],
    "EX-12 (01-04-requirements.md:5290): pasted copies are date-edited (MUST), slack MUST NOT be written; task-paste.ts:43-52 calls planDatesEdited, edit-task-group.ts:313-330 does not; mspdi-codec.ts:1139-1144 writes task.carry. G37d is the uid-minting part of the same copy",
    True, "row paste keeps carry FreeSlack 0 / TotalSlack -33600 on the copy (uid 1967) and the MSPDI export writes them; task paste drops them (rf/e34.ts, real code) | steps: open sample-schedule/sample-small-website-renewal.en.xml, choose the first row, Ctrl+C, Ctrl+V (copy-and-paste.ts:115), export MSPDI",
    REACH, ["JDG-264", "DFC-685"],
    "One copyTasksUnderFreshUids(schedule, uids, within) in EditDocument: sorted minting and planDatesEdited on each copy; both pastes call it, the row paste then remaps members to the new rows.")
row("E36", ["E", "H"], ACC, None,
    ["file-system-access-file-store.ts:99", "canvas-rasterizer.ts:14", "browser-clipboard.ts:13"],
    "'image/png' spelled three times: the same IANA fact (refute overturned NOT-A-DUPLICATE; trivial)",
    False, "equal", None, [], "Optional: a media-type column in T-024, or leave.")
row("E37", ["E", "G", "H"], ACC, "export",
    ["single-html-shell.ts:212:newerFormatReasonOf", "document-file-flow.ts:259:tellNewerFormat"],
    "same component; the DFC-855 DEVIATION (document-file-flow.ts:265-266) covers isUnreadAsked only",
    False, "equal on the startup inputs", None, ["DFC-855"],
    "Export one newerFormatReasonOf(unread, isUnreadAsked) from document-file-flow.ts; single-html-shell.ts imports it with false.")
row("E38", ["E", "G", "H", "I"], ACC, "t064",
    ["input-command-translator.ts:735:VISIBLE_ELEMENT_BY_ENTRY", "input-command-translator.ts:760:GUIDE_CURSOR_MODE_BY_ENTRY",
     "command-palette.ts:97:SETTINGS_KEY_BY_ROW", "command-palette.ts:115:GUIDE_CURSOR_MODE_BY_ROW",
     "app-header-items.ts:85", "edit-document-settings.ts:27:VisibleElement"],
    "command-palette.ts:94-95 TRAP 'nothing checks that they agree'; columnsOutsideHistory (document-change-plan.ts:100) is T-027's undo scope (not a member)",
    False, "the 8 palette, 3 header and 2 cursor rows match the translator's 11 + 2", None, ["DFC-128", "DFC-147", "DFC-100"],
    "ScreenRenderer (owner of icon-roster.json) exports one IC -> setting-key map and the cursor map (new PI-37 members); the translator reads them.")
row("E39", ["E", "H", "I"], ACC, "t064",
    ["input-command-translator.ts:386:KEY", "input-command-translator.ts:665:ENTRY", "frame-loop.ts:329",
     "frame-loop.ts:343", "frame-loop.ts:337", "dom-input-source.ts:44:ESCAPE_KEY", "app-header-items.ts:29"],
    "KEY / ENTRY are exported by the translator entry but are not PI-18 members; ScreenRenderer cannot import the translator (the reverse edge exists, LR-3); IconId is a plain string (screen-renderer.ts:44)",
    False, "equal ('N' is not in KEY)", None, [],
    "Home ENTRY in ScreenRenderer (icon-roster owner) and re-export it from the translator; frame-loop and dom-input-source import KEY / ENTRY (new PI-18 / PI-37 members); add KEY.n.")
row("E40", ["E", "G"], ACC, "t064",
    ["edit-task.ts:180:checkDay", "edit-annotation.ts:97:anchorRefusals", "edit-annotation.ts:109:rangeRefusals",
     "edit-dependency.ts:42:planlessEndRefusals", "schedule-invariants.ts:158:dateBreaches", "dependency-route.ts:216:hasPlanDates"],
    "no reason for annotations skipping the T-214 range (edit-annotation.ts:97-126 check dayOf only); after an edit nothing re-runs the invariants (frame-loop.ts:660 reads IV-17 only)",
    True, "createHighlightBox / createCommentBox dated 2300-01-01 accepted; setTaskDeadline 2300-01-01 refused (IV-14); saved and reopened, validateImportedDocument refuses S-120 on /schedule/highlightBoxes/0 and document-file-flow.ts:546-548 returns false with no notice (rf/e40.ts, real code) | steps: enable the Agent API (IC-20), applyCommands createHighlightBox 2300-01-01 (agent-api-members.ts:462), save, reopen: the file silently will not open",
    REACH, ["DFC-182", "DFC-760", "DFC-582"],
    "Annotation refusals call checkDay: move it to Schedule beside dateBreaches and publish both (new PI-1 members); hasPlanDates moves there too.")
row("E41", ["E"], ACC, None,
    ["edit-dependency.ts:93:milestoneEnd", "edit-task.ts:170:isMilestone"],
    "edit-dependency.ts:93 types a new link from Task.milestone while isMilestone reads the drawn shape first; refute-B would group :93 with G22d (Task.milestone is the truth, G-1), refute-E upheld ACCIDENTAL -- Q2 decides both",
    True, "visual 'milestone' + milestone false: drawn as a milestone, a new link takes the pressed edges' type; visual 'rectangle' + milestone true: drawn as a bar, the link is forced to type 1 | steps: as G22d (only an imported document can hold the mismatch, task-appearance.ts:89-92)",
    REACH, [],
    "After Q2: call drawnShapeKindOf (G22b) if the link rule means the drawn shape, else write the reason at edit-dependency.ts:93.", extends="G22")
row("E42", ["E", "G", "H", "I"], ACC, None,
    ["document-settings.ts:435:DISPLAY_SCALE_STEPS", "input-command-translator.ts:774:FONT_SCALE_STEPS",
     "edit-calendar.ts:27:DAY_TYPES", "working-calendar.ts:80", "edit-document-settings.ts:79:LEVEL_ZERO_TREE_STATES",
     "edit-document-settings.ts:45", "edit-document-settings.ts:49"],
    "a generator gap: tools/generate_entity_types.py emits only the unions (document-settings.ts:42, :57); the only runtime lists are schema enums the inner layers may not read (LR-1)",
    False, "equal ([50..200], [S, M, L], day types 1..7)", None, ["JDG-152"],
    "Have tools/generate_entity_types.py emit ordered value lists (DISPLAY_SCALE_STEPS, FONT_SCALES, DAY_TYPES) beside the unions; callers import them.")
row("E43", ["E", "I"], ACC, "t064",
    ["frame-loop.ts:668", "open-modals.ts:34", "screen-state-input.ts:27", "dom-screen-surface.ts:71"],
    "JF-1 bars reading icon-roster.json outside ScreenRenderer, but edges to ScreenRenderer exist, so an exported constant is legal; TRAPs frame-loop.ts:666, :670, :680 only say spell it the same; screen-state-input.ts:26 DEVIATION (DFC-703)",
    False, "every spelling matches", None, ["DFC-703"],
    "screen-renderer.ts exports the SURFACE names (new PI-37 member); the three others import them. Settle DFC-703's U-row question first.")

# ---------------------------------------------------------------- method G (inline clones) and H (literal sets)
row("H01", ["G"], ACC, None,
    ["task-create.ts:29:createTask", "task-plan-actual.ts:292:setTaskPlanDates"],
    "token-identical but the CM id; the IV-12 check (task-plan-actual.ts:303-309) is outside the copy",
    False, "equal", None, [], "planDatesRefusal(cm, settings, start, finish) in task-plan-actual.ts; both call it.")
row("H02", ["G"], ACC, None,
    ["edit-task-group.ts:241", "task-group-order.ts:149"],
    "same arithmetic and message (FR-033 paste vs HM-3a move); only the ids differ",
    False, "equal", None, [], "depthPastCeiling(byId, target, height, settings) beside depthOf (G05); callers keep their own CM / row ids.")
row("H03", ["G"], ACC, None,
    ["display-scale-steps.ts:91:displayScaleWrites", "zoom-and-fit.ts:371:rowHeldStill"],
    "same component; the differing inputs are parameters (zoom-and-fit.ts:383 TRAP)",
    False, "equal kernel; the judge's zoomX hypothesis is unproven", None, ["DFC-697"],
    "rowHeldAcross(context, afterSettings, afterRegions, zoomY, centreBefore, centreAfter) in zoom-and-fit.ts; both call it.")
row("H04", ["G"], ACC, "t064",
    ["svg-renderer.ts:478", "dependency-route.ts:135:selectedLinksOf"],
    "selectedLinksOf is not re-exported by schedule-geometry.ts (:31-32); judge B saw the pair as G17's extra",
    True, "two Tasks sharing uid 2: renderer '3>2', geometry '1>2 3>2' (repro-G17.ts); equal on valid documents | steps: inferred, not run -- an MSPDI with a repeated Task UID opens (rf/e07.ts, DFC-922), so IV-1 (schedule-invariants.ts:303-304) does not guard this road",
    REACH, ["DFC-640", "DFC-922"],
    "Put the selected links on ScheduleGeometry (geometry already computes them at schedule-geometry.ts:198) or add selectedLinksOf to PI-6; svg-renderer.ts passes the gated selection.")
row("H05", ["G", "I"], ACC, "t064",
    ["field-commit.ts:382", "properties-panel.ts:582", "shortcut-keys.ts:126", "selection.ts:90",
     "svg-renderer.ts:483", "dependency-route.ts:143"],
    "no helper exists; selection.ts is the inner home every caller already imports",
    True, "selection.ts:91 tests ordinal < length, the others read undefined: ordinal -1 or 1.5 differ",
    UNREACH, [],
    "linkOf(schedule, ref): Dependency | null from selection.ts (new PI-32 member); refOfLink beside it. Guard today: ordinals come only from findIndex (selection-input.ts:53-56).")
row("H06", ["G"], ACC, "t064",
    ["armed-placement.ts:143", "item-grab.ts:421", "highlight-box.ts:26"],
    "item-grab.ts:421 TRAP demands identity with highlightGeometry (a reason to be equal, not to copy); the IV-19 block (schedule-invariants.ts:699-711) is a check, not a member",
    False, "equal (item-grab's rows are drawn-y order, input-command-translator.ts:1196)", None, [],
    "Export highlightRowsOf(box, layout) from schedule-geometry.ts (new PI-6 member); item-grab uses it; one orderedByRank in the translator for the two writes.")
row("H07", ["G", "I"], ACC, None,
    ["json-codec.ts:284:withStopsFromOlderLengths", "mspdi-codec.ts:621:withStopsFromActualDurations", "field-commit.ts:92"],
    "no WHY for refusing a whole GRS JSON where MSPDI tells a notice; FR-011 (01-04-requirements.md:2759) wants an older GRS JSON read 'with the same reading' as MSPDI; method I added field-commit.ts:92-97",
    True, "calendar with no working weekday, task 1 actual length 3 + task 2 length 1: JSON refuses the whole file, MSPDI opens it with task 1 stop null + a notice and task 2 stop 2026-01-05; same with Mon-Fri and length 100000 (repro-H07.ts) | steps: open an older-version GRS JSON whose Task has actualStart + actualDuration (100000, or any under a calendar with no working weekday) and no stop: the whole file is refused (json-codec.ts:198 records the length; :273-279 checks only integrality)",
    REACH, ["PND-499"],
    "One stopFromActualLength(within, task, days): {stop} | {fault} in DocumentCodec; both codecs call it and tell a notice and keep the rest (the MSPDI behaviour, which FR-011 asks for).")
row("H08", ["G", "I"], ACC, "export",
    ["document-file-flow.ts:771:rasteredContent", "frame-loop.ts:2258"],
    "same component (SingleHtmlShell); frame-loop.ts:2256 TRAP explains the PNG road, not the copy; agent-api-members.ts:660-675 answers AM-14 refusals (not a member)",
    False, "equal (three outcomes)", None, [],
    "Export pngOrNotice(rasterizer, scene, raiseNotice) from document-file-flow.ts; the clipboard arm calls it.")
row("H09", ["G"], ACC, "t064",
    ["image-exporter.ts:169", "svg-renderer.ts:535"],
    "no written reason; both already import ScreenRegions",
    False, "equal", None, [], "pictureSizeOf(regions) from screen-regions.ts (new PI-35 member); both call it.")
row("H10", ["G"], ACC, "t064",
    ["svg-renderer.ts:85:boxOfPoints", "item-hit-area.ts:123:boxOfPath", "schedule-task-figures.ts:110:cornersOfBar",
     "item-hit-area.ts:208"],
    "neither bar-extent copy writes why it counts or omits the stroke (item-hit-area.ts:206 WHY is about the end mark)",
    True, "boxOfPoints == boxOfPath (20000 paths); bar extent: line bar 10..100 at y 50, stroke 4 -> mask box h 0, hit band h 4 (repro-H10.ts) | steps: a Task drawn as arrow / endpointSpan with a dependency line across it: its halo-mask rect has zero height (schedule-task-figures.ts:384-386, :548-553), so the halo is not masked there (pixel effect not observed)",
    REACH, [],
    "One boxOfPath and one barExtentOf(bar, withStroke) in ScheduleGeometry (new PI-6 members); decide in the spec whether the mask includes the stroke.")
row("H11", ["G", "I"], ACC, None,
    ["input-command-translator.ts:1017", "shortcut-keys.ts:93"],
    "same component; the row side already has rowZoomAnswer",
    False, "equal", None, [], "timeZoomAnswer(context, factor, x, y) beside rowZoomAnswer; the three sites call it.")
row("H12", ["G"], ACC, "t064",
    ["schedule-task-figures.ts:349", "task-figures.ts:524"],
    "no reason on the cull for ignoring actualVisible; the layout keeps actualX whatever the toggle (schedule-layout.ts:551)",
    True, "plan 300..400, actual 100..200, actual hidden: cull left 100, drawn left 300 (repro-H12.ts) | steps: turn actualVisible off on a Task whose actual began before its plan and scroll so only the hidden actual's days are in view: the Task stays in the SVG though nothing is drawn (superset, no pixel change)",
    REACH, [],
    "drawnExtentOf(placed, showPlan, showActual) in task-figures.ts (new PI-6 member); the cull uses it.")
row("H13", ["G", "I"], ACC, None,
    ["input-command-translator.ts:994", "row-grab.ts:335"],
    "same component; the strip path has no editInPlace branch on purpose (row-grab.ts:271-275)",
    False, "equal", None, [], "chooseRowOf(press, groupId) in row-grab.ts; input-command-translator.ts calls it.")
row("H14", ["G"], ACC, "t064",
    ["view-place.ts:89:viewSettings", "zoom-and-fit.ts:534:fitCommand"],
    "no reason for two stores of one fit; SingleHtmlShell->ScheduleLayout edge exists",
    False, "equal on the startup domain (view-place.ts:59)", None, [],
    "placeOfFit(fitted): ViewPlace from fit-zoom.ts (new PI-5 member); both build from it.")
row("H15", ["G"], ACC, "t064",
    ["agent-api-members.ts:271", "single-html-shell.ts:186"],
    "trivial; both import DocumentCodec", False, "equal", None, [], "faultsText(faults) from document-codec.ts (new PI-20 member).")
row("H16", ["G"], NAD, None,
    ["held-press-preview.ts:122:tentativeDependencyOf", "armed-placement.ts:61:commandFromDependencyDrag"],
    "the preview must draw to the bare pointer and over its own Task (01-04-requirements.md:2568, WHY held-press-preview.ts:141)",
    None, None, None, ["DFC-975"], "Leave.")
row("H17", ["H"], INT, None,
    ["document.ts:19:ROOT_KEYS", "grs-json-schema.ts:684"],
    "LR-1 (tools/check_layer_rules.py:9, :200-203) bars document.ts from adapter/document-codec; caveat: the generator could emit ROOT_KEYS into entity",
    False, "same five keys", None, [],
    "Type it: as const satisfies readonly (keyof Document)[] with an exhaustiveness check, or let the generator emit ROOT_KEYS into entity. documentViolations has no src caller.")
row("H18", ["H"], ACC, "t064",
    ["schedule-geometry.ts:82:DummyGeometry", "edit-task.ts:67:ActualGrabHold"],
    "blocked by a missing EditDocument->ScheduleGeometry edge (components.json), not by a layer rule",
    False, "identical five GA rows", None, [],
    "One generated T-266 union in an inner home both reach (Schedule or ScheduleLayout; new member); both alias it.")
row("H19", ["H", "I"], ACC, "t064",
    ["input-command-translator.ts:120:PressRow", "gesture-values.ts:10:GesturePressRow"],
    "gesture-values.ts:9 WHY justifies the use-case copy (UseCase may not read Adapter); the adapter copy is the accidental one; advance-screen-session.ts:75 exports GrabbedRowAxis but not GesturePressRow",
    False, "six PTD rows equal", None, [],
    "Export GesturePressRow from advance-screen-session.ts (new PI-39 member); PressRow = GesturePressRow, RowGrabAxis = GrabbedRowAxis.")
row("H20", ["H", "I"], ACC, "t064",
    ["import-document.ts:26:OpenChoice", "file-flow-values.ts:14:FileFlowOpenChoice", "frame-loop.ts:674"],
    "file-flow-values.ts:12 WHY cites only the undeclared AdvanceScreenSession->ImportDocument edge; OpenRoute (file-store.ts:7) is not a member (no 'handed' route)",
    False, "equal", None, [],
    "Declare AdvanceScreenSession->ImportDocument and alias FileFlowOpenChoice = OpenChoice (or the reverse).")
row("H21", ["H", "I"], NAD, None,
    ["input-command-translator.ts:835:placementAt", "task-plan-actual.ts:327"],
    "inverse directions of T-019; the row union is already one type (edit-task.ts:51-61)",
    None, None, None, [], "Optional: move placementAt next to setTaskPlanActualState.")
row("H22", ["H", "I"], ACC, "t064",
    ["frame-loop.ts:440:NoticeReason", "display-words.json:2701"],
    "JF-1 keeps display-words.json inside ScreenRenderer, but the SingleHtmlShell->ScreenRenderer edge exists; nothing checks NoticeReason is a subset of the roster",
    False, "54 of 59, subset holds", None, [],
    "screen-renderer.ts exports a generated ReasonRow union (new PI-37 member); NoticeReason = Extract<ReasonRow, ...>.")

# ---------------------------------------------------------------- method I (line-by-line read)
row("I01", ["I"], ACC, "t064",
    ["frame-loop.ts:1629", "frame-loop.ts:2222", "frame-loop.ts:2229", "edit-history.ts:31:stepCount",
     "document-change-plan.ts:361"],
    "frame-loop reads history.done / undone.length itself; edit-history.ts:31 stepCount has 0 src callers and is not a PI-4 member",
    False, "equal", None, [],
    "Publish canUndo / canRedo (or stepCount) from edit-history.ts (new PI-4 members); frame-loop and document-change-plan.ts read them.")
row("I02", ["I"], ACC, None,
    ["frame-loop.ts:1523:runFrame", "frame-loop.ts:1777:exportScene", "copy-and-paste.ts:74"],
    "TRAPs frame-loop.ts:1531, :1789 explain the differing inputs, nothing the copied pipeline",
    None, "may differ: copy-and-paste.ts:74-80 lays out at the stored zoom while the frame is fitted, and the ST-7 lane cap depends on zoomX (schedule-layout.ts:470-497); unproven",
    None, ["PND-254"],
    "One layoutFrom(document, environment, settings) in SingleHtmlShell; the three call it.")
row("I03", ["I"], ACC, "t064",
    ["frame-loop.ts:837:dualCursorFollowingIn", "tooltips.ts:194"],
    "the adapter tests placingDate2 where the shell tests placingDate1; overlaps G53x",
    False, "equal while the child union has two kinds (screen-values.ts:134-135)", None, [],
    "A published session reader (G53x); both import it.")
row("I04", ["I"], NAD, None,
    ["frame-loop.ts:850:panelShowingIn", "properties-panel.ts:854", "app-header-items.ts:63", "screen-frame.ts:78"],
    "one-tag reads; frame-loop.ts:850-854 maps the tag to the PanelShowing type", None, None, None, [], "Leave.")
row("I05", ["I"], ACC, "t064",
    ["frame-loop.ts:949:subjectOfChoice", "properties-panel.ts:867:isNothingPicked"],
    "same predicate; outcomes converge because the panel's fallback is the subject the shell stored",
    False, "equal", None, [], "A published session reader (G53x); both import it.")
row("I06", ["I"], ACC, None,
    ["screen-regions.ts:165", "frame-loop.ts:1867:settingsLimitsOf", "edit-document-settings.ts:109"],
    "edit-document-settings.ts:101 WHY ('the floor would own a second copy') is refuted: EditDocument->ScreenRegions is declared and drawnSettingsOf is PI-35",
    True, "canvas 1920, stored title 100 (floor 200), props 1750: CM-67 accepts, drawn Row Area -48 (repro-I.ts) | steps: make the S-79 floor exceed the stored title width (raise rowTitleIndent or maxGroupDepth), then drag the Properties Panel divider left (frame-drags.ts:136 has no upper bound): the pair is stored and the Row Area drawn at <= 0 width (pixels not observed)",
    REACH, ["PND-254"],
    "edit-document-settings.ts:109-115 subtracts drawnSettingsOf's floored title width (screen-regions.ts:107-112), not stored x ratio.")
row("I07", ["I"], ACC, None,
    ["frame-loop.ts:2532", "frame-loop.ts:2662", "frame-loop.ts:2544", "frame-loop.ts:2654"],
    "frame-loop.ts:2652 TRAP 'keep in step' acknowledges, does not justify",
    False, "equal", None, [], "Compute the pre-translator facts once per input in frame-loop; receiveInput and isBrowserDefaultStopped read them.")
row("I08", ["I"], ACC, "t064",
    ["shortcut-keys.ts:44", "dom-input-source.ts:116:isTypedIntoDialogueEntry", "screen-state-input.ts:126",
     "input-command-translator.ts:412:isSingleCharacterKey"],
    "the two routes are required by IN-5a (01-04-requirements.md:6916); the key set is not: shortcut-keys.ts:47-52 wants a plain combo, dom-input-source.ts:130-135 rejects only Alt / Meta",
    True, "Shift+A, Shift+Delete, Ctrl+Shift+V: the dialogue field takes them, the text entry does not; Shift+Minus / Shift+Equal fall through to SK-16 (shortcut-keys.ts:93) (repro-I.ts) | steps (code path, not live-verified): focus a Properties Panel text field and type '_' or '+' on a US keyboard ('=' on JIS): the time axis zooms and isBrowserDefaultStopped (frame-loop.ts:2673) likely swallows the character",
    REACH, [],
    "One text-entry key test published by the translator (isTextEntryKey; new PI-18 member) that follows dom-input-source's reading; shortcut-keys and screen-state-input call it.")
row("I09", ["I"], ACC, None,
    ["input-command-translator.ts:1236:alignWrites", "item-grab.ts:309:bodyMoveWrites"],
    "token-identical block, same component, no reason",
    False, "equal", None, ["DFC-664"], "planShiftWrites(task, days) in item-grab.ts; alignWrites calls it.")
row("I10", ["I"], NAD, None,
    ["properties-panel.ts:355:parentCandidates", "edit-task.ts:300"],
    "the panel offers every Task but itself; CM-18 then refuses descendants (HM-4). PR-15 (tbl-property-items.md:44) sets no candidate rule: a spec gap, not a copy",
    None, None, None, [], "Ask the spec for a candidate rule in PR-15; ScreenRenderer->EditDocument is not an edge.")
row("I11", ["I"], ACC, "t064",
    ["properties-panel.ts:725:valueAt", "document-settings.ts:451:reach"],
    "properties-panel.ts:723 TRAP 'repeats the private reach() walk' acknowledges, no reason",
    False, "equal", None, [], "Publish reach from document-settings.ts (new PI-2 member); valueAt calls it.")
row("I12", ["I"], ACC, "t064",
    ["properties-panel.ts:759:LEFT_OUT_NAME_OF_HOLDER", "edit-annotation.ts:51", "task-appearance.ts:27",
     "task-group-look.ts:24", "svg-renderer.ts:801", "stored-colour.ts:8:TRANSPARENT", "properties-panel-drawing.ts:325"],
    "TRANSPARENT re-typed though stored-colour.ts:8 exports it; the box-outline 'no transparent' rule hand-coded at edit-annotation.ts:55-57 though the generated shape (schedule-entities.ts:464) omits it; S-315 (tbl-settings.md:504) 'not offered for rows'",
    True, "TaskGroup colour 'black': CM-30 accepts (task-group-look.ts:24), the panel never offers it, the renderer has no band paint (svg-renderer.ts:802-803) so the theme band draws (repro-I.ts) | steps: Agent API setTaskGroupColor 'black', or open a GRS JSON with a TaskGroup color 'black' (schedule-entities.ts:439 lists it): the stored black draws as the theme band and no swatch shows chosen",
    REACH, [],
    "Publish TRANSPARENT and one allowedColourNames(holder) from Schedule (new PI-1 members); the panel, CM-30 and the renderer read it. Whether CM-30 must refuse 'black' is Q3.")
row("I13", ["I"], ACC, "t064",
    ["properties-panel.ts:253:ACTUAL_LENGTH_ITEM", "field-commit.ts:74:ACTUAL_LENGTH_ITEM", "property-items.json:53"],
    "the WHY comment is copied word for word; JF-1 bars reading property-items.json, not an exported constant",
    False, "equal", None, [], "screen-renderer.ts exports ACTUAL_LENGTH_ITEM (new PI-37 member); field-commit.ts imports it.")
row("I14", ["I"], NAD, None,
    ["selection.ts:79:lastPicked", "input-command-translator.ts:1226", "properties-panel.ts:564:subjectOf"],
    "align anchors on the last Task as SL-7b says (01-04-requirements.md:2246); lastPicked is the last item of any kind, used only by the panel subject; selection.ts:77 cites FR-034 though no FR-034 caller uses it",
    None, None, None, [], "Leave; fix the FR-034 citation at selection.ts:77.")


# ---------------------------------------------------------------- output and counts
def first_finder(r):
    return min(r["found_by"], key=METHOD_ORDER.index)


def parent_of(id_):
    # G10a -> G10, G15x -> G15, E07 -> E07, H04 -> H04
    if id_[0] == "G":
        return id_[:3]
    return id_


def main():
    ids = [r["id"] for r in ROWS]
    assert len(ids) == len(set(ids)), "duplicate row id"
    doc = OrderedDict([
        ("tree", TREE),
        ("survey", "duplicated-responsibility survey, 2026-09-26"),
        ("methods", METHODS),
        ("method_order", METHOD_ORDER),
        ("note", "cr is derived from the member files: 578 frame-loop.ts, 579 input-command-translator.ts, 580 mspdi-codec.ts. blocked_by t064 = the home must publish a name across a component boundary that no T-064 row lists (check 26b goes red otherwise); export = an export keyword inside one component. extends names the known group a row only adds to."),
        ("groups", ROWS),
    ])
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")
    with open(OUT, encoding="utf-8") as f:
        json.load(f)

    print("rows", len(ROWS))
    print("verdict", dict(Counter(r["verdict"] for r in ROWS)))
    print("blocked", dict(Counter(r["blocked_by"] for r in ROWS)))
    for cr in ("578", "579", "580", "none"):
        sel = [r for r in ROWS if (cr in r["cr"].split("+") if cr != "none" else r["cr"] == "none")]
        print("cr", cr, len(sel), dict(Counter(r["verdict"] for r in sel)))
    dif = [r for r in ROWS if r["differs"] is True]
    print("differs", len(dif), dict(Counter(r["reachable"] for r in dif)))
    for r in dif:
        print("  ", r["id"], r["verdict"], r["reachable"], r["cr"])
    # per-method yield at the parent-group level (a parent's finders = union of its rows)
    parents = OrderedDict()
    for r in ROWS:
        parents.setdefault(parent_of(r["id"]), []).append(r)
    found = {p: {m for x in rs for m in x["found_by"]} for p, rs in parents.items()}
    first = {p: min(ms, key=METHOD_ORDER.index) for p, ms in found.items()}
    print("parents", len(parents))
    for m in METHOD_ORDER:
        new = [p for p, rs in parents.items() if first[p] == m and all(x["extends"] is None for x in rs)]
        acc = [p for p in new if any(x["verdict"] == ACC for x in parents[p])]
        reach = [p for p in new if any(x["verdict"] == ACC and x["reachable"] == REACH for x in parents[p])]
        refound = [p for p in parents if m in found[p] and first[p] != m]
        print("method", m, "new", len(new), "accidental", len(acc), "accidental+reachable-differ", len(reach), "refound", len(refound))
    split = set(SPLIT_FILES) | {"src/adapter/screen-renderer/properties-panel.ts"}
    before_i = [p for p, rs in parents.items() if first[p] != "I" and any(mm["file"] in split for x in rs for mm in x["members"])]
    i_known = [p for p in parents if "I" in found[p] and first[p] != "I"]
    print("I capture: earlier parents with a member in the four files", len(before_i), "re-found by I", len(i_known), "of which in before_i", len(set(i_known) & set(before_i)))

if __name__ == "__main__":
    main()
