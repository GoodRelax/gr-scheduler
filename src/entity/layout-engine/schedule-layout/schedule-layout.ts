// ScheduleLayout -- public entry of this folder.
//
// @unit      UF-5   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-5
//
// The time axis, the label width estimate, the placing of Rows, the level of
// detail and the fit-to-screen zoom (CP-5). Table T-068 fixes the order these
// run in: LC-1 to LC-9 here, LC-10 and LC-11 in ScheduleGeometry.
//
// ⛔ INCOMPLETE, and deliberately so: LC-7 counts OC-1, OC-2 and OC-5 of table
// T-038. The rows still missing measure things this milestone does not draw
// yet -- the days-late label (OC-8) and the deadline mark (OC-9). Table T-042
// puts those at M4. Each one widens what a Task occupies, so ST-1's overlap
// test and FR-055's fit both read low until they arrive. Add them here, not at
// the call sites: table T-038's preamble makes stacking and the fit measurement
// share this one count (MUST).
//
// ⚠️ OC-7, the plan-against-actual guide, needs no term of its own: GD-5 of
// table T-020a draws it from the actual's near end to the plan's near end, so
// it never reaches past what OC-1 and OC-5 have already counted.
//
// ⛔ Two extents ARE drawn and are still not counted, because table T-038 is a
// closed list and neither has a row: the actual figure of a milestone, which
// LF-10 centres on `actualStart` (GR-15 says a milestone has no actual BAR, so
// OC-5 is not about it), and the actual bar of an arrow or endpoint span, which
// OC-6 takes the horizontal off in as many words. Both can sit far from the
// plan, so FR-055 can fit and still leave them off screen. ⚠️ Do not invent a
// term for either -- it takes a change request against table T-038.

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  COLUMN_DEFAULTS,
  dateFromWorkingDays,
  dayOf,
  nextWorkingDay,
  planActualState,
  textOfDay,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskGroupMember,
  type TaskVisual,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import type { ScreenRegions } from '../screen-regions/screen-regions'

/** The four steps of the Time Ruler. L-1 of table T-005a. */
export type RulerTier = 'year' | 'yearMonth' | 'yearMonthWeek' | 'yearMonthDayWeekday'

/** Where a label sits relative to its shape. Table T-013. */
export type LabelPlacement = 'inside' | 'right'

/** AT-101's eight. Taken from the generated column so the spellings are CR-172's. */
export type MilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

/** The five of table T-012, spelled as AT-100 spells them. */
export type ShapeKind = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'

/** One Task, placed. */
export interface TaskPlacement {
  readonly taskUid: number
  readonly groupId: string
  /** Resolved through AT-100, so nothing downstream reads Task.milestone again. */
  readonly shapeKind: ShapeKind
  /**
   * AT-101's figure, resolved through its default so nothing downstream reads
   * `taskVisuals` again. ⚠️ Only meaningful when `shapeKind` is `'milestone'`;
   * AT-101 says in as many words that it is looked at then and not otherwise.
   *
   * ⭐ Carried here because the geometry had no way to reach it: it drew every
   * milestone as a ◇ whatever the document said, and the value never left the
   * document model.
   */
  readonly milestoneGlyph: MilestoneGlyph
  /** The lane ST-3's greedy pass put it in, counted from the shallowest. */
  readonly stack: number
  /**
   * The drawn plan shape, not the span of the dates. They differ twice: a
   * milestone is a figure centred on its day (LF-10), and a shape shorter than
   * `minShapeWidth` is drawn at that width (FR-001's RATIONALE). LC-7 measures
   * what is drawn, so this is the value the occupancy is built on.
   */
  readonly x: number
  readonly width: number
  /**
   * Whether the plan's two ends stand on ONE DAY -- the fact table T-023d's
   * closing rule turns on. ⭐⭐ CARRIED BECAUSE `width` ABOVE CANNOT BE ASKED:
   * that member is what is DRAWN. `planEndsStandOnOneDay` below says why.
   */
  readonly planEndsStandOnOneDay: boolean
  readonly y: number
  /** What the row's stacking reserved: the plan, plus the actual when SH-3 or SH-4 pushes it below. */
  readonly height: number
  /** The plan bar alone, floored once by FR-094. The actual is this times `actualOfPlan`. */
  readonly planHeight: number
  /** Table T-012's last column, resolved once so nothing downstream re-reads it. */
  readonly actualPlacement: 'inside' | 'below' | 'sideways'
  /**
   * RV-1: the actual bar, from `actualStart` to `actualStart` plus
   * `actualDuration` counted in worked days. `null` while the Task has no
   * actual at all -- FR-043 says the dummy is drawn but not held.
   *
   * ⚠️ This IS the span of the dates. A milestone's actualDuration is S-130,
   * which is zero, so its width is zero and the figure is centred on `actualX`
   * (LF-10) -- the centring belongs to the geometry, not here.
   */
  readonly actualX: number | null
  readonly actualWidth: number
  /**
   * How far right the actual FIGURE's ink reaches -- `null` while there is none.
   *
   * ⭐⭐ SETTLED HERE AND CARRIED, the bargain `labelX` and `labelFontSize`
   * already keep. ⛔ It is NOT `actualX + actualWidth`: `actualReachOf` below
   * says why, and why one function answers it rather than two spellings.
   */
  readonly actualReach: number | null
  /**
   * How far right FR-043's dummies reach on a Task NOT started -- `null` while
   * none is drawn, which is every Task that has an actual.
   *
   * ⭐⭐ THE HOLD'S RIGHT EDGE, NOT THE MARK'S -- GR-7 of table T-023d hangs
   * the marker off it, and table T-038 counts the hold and not the drawn ink.
   *
   * ⭐⭐ SETTLED HERE AND CARRIED, for the reason `actualReach` above gives in
   * the same words: LC-7 puts the name label past this and `markerAnchorX`
   * hangs the marker off it, and the heading of table T-038 forbids the two
   * counting separately (MUST NOT). ⛔ IT IS ALSO WHY NO SETTINGS ROW CROSSES
   * OUT OF THIS FOLDER -- what crosses is the answer, on a type table T-064
   * already publishes.
   */
  readonly dummyReach: number | null
  /**
   * FD-6 / FD-6b of table T-012a in pixels, already clamped -- the fade drawn
   * at each end of the plan bar.
   *
   * ⭐ ANSWERED HERE AND CARRIED, not worked out again by whoever draws. The
   * clamp used to live in `schedule-geometry.ts`, and table T-013 now asks LC-6
   * to judge NL-1 against the room the fade LEAVES, so both units need the same
   * two numbers -- written twice they part company the moment FD-6 or FD-6b is
   * re-read. This is the bargain `labelFontSize` below already keeps.
   *
   * ⚠️ The PLAN's fade. FD-6a puts none on the actual bar, so nothing here
   * describes it.
   */
  readonly fadeInPx: number
  readonly fadeOutPx: number
  /** NL-1 or NL-3 of table T-013. */
  readonly labelPlacement: LabelPlacement
  /**
   * NL-3's left edge: where the name label begins once the shape could not
   * hold it. Meaningless while `labelPlacement` is `'inside'` -- NL-1's label
   * has no part outside the shape for table T-038's order to be about.
   *
   * ⭐⭐ SETTLED HERE AND CARRIED, and this is the whole point of publishing it.
   * The x used to be spelled a second time by `labelBoxOf` in ScheduleGeometry
   * as 「shape's right edge plus `labelGap`」, which is the same rule in two
   * places (rule 03 section 4) -- and table T-038's own heading forbids the
   * stacking and the fit measuring apart. LC-7 counts the occupancy FROM this
   * number, so whoever draws the label reads it rather than rebuilding it.
   *
   * ⛔ IT ALREADY CLEARS `OC-3` AND `OC-4`'s room, drawn or not (`markRoomOf`),
   * so no caller may add the marker's width to it a second time.
   */
  readonly labelX: number
  /** The label after LC-4 cut it to truncateUnits. */
  readonly label: string
  /**
   * The type size the label is drawn at: FR-077's derivation with FR-094's two
   * floors already applied. LC-5 measured the label with THIS value, so it is
   * the single source for the drawn type size -- anything that puts the text on
   * screen reads it here rather than writing the formula a second time. Written
   * twice, the two copies part company the moment S-8 or S-9 moves, and the
   * measured width stops matching the glyphs.
   */
  readonly labelFontSize: number
  /**
   * OC-2's card -- ONE card and not two (FR-090, MUST, 利用者の裁定
   * 2026-09-08): the assignee (FR-059, with AS-2's single `-` where nobody is
   * on the Task) and the percent, joined into one string in FR-090's own order.
   * `''` while S-60 and S-61 have both hidden, which
   * is the state OC-2 (MUST NOT) keeps out of the occupied width; with one of
   * the two shown it is that one alone and no separator appears.
   *
   * ⭐ SETTLED HERE AND CARRIED, the bargain `label` and `labelFontSize`
   * already keep: LC-7 measured the occupancy with THIS text, so whoever draws
   * it reads the same string rather than resolving the roster a second time --
   * and a second resolution would part company with the measurement the moment
   * FR-059's filter or its ordering moved.
   *
   * ⛔ AND THAT IS WHY IT IS ONE FIELD AND NOT TWO. Two strings measured apart
   * are two boxes placed apart, which FR-090's own RATIONALE records the cost
   * of. One string is measured once and drawn once.
   */
  readonly outsideLabel: string
  /** FR-093's estimate of `outsideLabel` at `labelFontSize`. Zero when it is `''`. */
  readonly outsideLabelWidth: number
  /** What the row's stacking measured it as. Table T-038. */
  readonly occupiedX0: number
  readonly occupiedX1: number
}

/** One drawn row. */
export interface RowPlacement {
  readonly groupId: string
  /** Depth 1 is a root row. */
  readonly depth: number
  readonly y: number
  /** LF-2 of table T-221. */
  readonly height: number
  readonly stackCount: number
  /**
   * The top of each lane, indexed by lane -- the same number `TaskPlacement.stack`
   * carries. LF-12 walks these to place the progress line's vertices, which is
   * why they leave the layout rather than being rebuilt from the placements --
   * a lane holding no drawn Task has no placement to rebuild from.
   *
   * ⚠️ NOT sorted by y. ST-5 lets `stackDirection` (S-58) put lane 0 at the
   * bottom of the band, and then this array DESCENDS in y. FR-014 wants "上端
   * から下端まで途切れない 1 本の折れ線", so a caller that draws through the
   * lanes must visit them by increasing `y`, not by index.
   */
  readonly stackTops: readonly number[]
  /**
   * Whether this row was lifted into FR-098's pinned band -- `y` above is then
   * a place in that band and the vertical scroll does not move it.
   *
   * ⛔⛔ OPTIONAL, AND `undefined` MEANS "not pinned". It is declared optional
   * so that the `RowPlacement` literals already written go on compiling; the
   * cost is that a caller which builds a placement by hand can never say a row
   * IS pinned by forgetting, only that it is not, and no compiler will point at
   * a reader that ignores it.
   * ⚠️ Published because two questions outside this file turn on it and neither
   * can be re-derived: S-78 and S-176 point at the SCROLLING remainder (FR-098,
   * MUST) so the anchor may not be taken from a banded row, and FR-055's fit
   * names the first scrolling row.
   * ⛔ A PINNED ROW THAT DID NOT FIT IN THE BAND IS NOT IN `rows` AT ALL, so no
   * reader can find it here with the flag set to false and put it back in the
   * chain: FR-098 (MUST) 「入りきらない行を描かないこと」 (利用者の裁定
   * 2026-09-06). `pinnedBandOf` says how the boundary is read.
   */
  readonly isPinned?: boolean
}

export interface ScheduleLayout {
  /** S-1 times zoomX, which FR-017 makes the width of one day. */
  readonly pxPerDay: number
  readonly tier: RulerTier
  /** The day the left edge of the Row Area points at (S-77). */
  readonly originDay: CalendarDay | null
  /**
   * The x that day sits at, so a caller need not re-derive the axis.
   *
   * ⚠️ NOT the left edge of the Row Area. S-177 puts the edge a fraction of
   * one day's width INTO `originDay`, so the day itself begins that far to the
   * left of the edge. Every reader of the time axis goes through this member
   * (`dateAtX`, `xFromDay`, `xOnTimeAxis`), so the fraction is applied once,
   * here, and no caller adds it a second time.
   */
  readonly originX: number
  /**
   * What a rectangle's plan bar is tall at this zoom. LF-2 and LF-3 give it to
   * empty lanes and empty rows, and LF-12 measures the progress line's
   * vertices by it -- a shape-independent height, so the vertices of one row
   * line up whatever sits in its lanes.
   */
  readonly rectangleHeight: number
  readonly rows: readonly RowPlacement[]
  readonly placements: readonly TaskPlacement[]
  /** Everything drawn, measured with table T-038's occupancy. FR-055 fits to this. */
  readonly contentWidth: number
  readonly contentHeight: number
  /**
   * The left edge of that same extent, and null while nothing was placed.
   *
   * ⭐ Published because OP-10 of table T-024a wants a position out of FR-055
   * as well as a zoom, and the width alone cannot carry it: two documents of
   * equal width begin on different days. LC-7 already folds this edge to reach
   * `contentWidth`, so nothing is measured a second time to answer it.
   *
   * ⚠️ An x and not a day, because table T-038 measures what is DRAWN and a
   * label's overhang is not a whole number of days. `fitZoom` is the one place
   * it turns into S-77's day, which is what the MUST NOT on holding a scroll
   * position in px (Chapter 1.4) asks for.
   */
  readonly contentX0: number | null
  /**
   * LF-14 of table T-221: how tall FR-098's pinned band stands, gaps between
   * its rows included and no gap below it. Zero while nothing is pinned, and
   * zero again when every pin was turned away by the `Row Area`'s bottom edge.
   * ⭐ NEVER TALLER THAN THE `Row Area` (FR-098, MUST, 利用者の裁定 2026-09-06):
   * the pins that do not fit inside it are not drawn, so the remainder LF-14
   * leaves the scrolling rows can no longer come out negative for want of room.
   *
   * ⛔⛔ OPTIONAL, for the reason `RowPlacement.isPinned` gives, and `undefined`
   * reads as zero everywhere. ⚠️ FR-055's fit is the reader that cannot do
   * without it: the height it fits against is the `Row Area`'s less this and
   * less one `rowGap`.
   */
  readonly pinnedBandHeight?: number
  /**
   * The top edge of the scrolling remainder -- the `Row Area`'s own top while
   * no pin reached the band, and one `rowGap` below the band otherwise.
   *
   * ⛔ THIS IS WHAT S-78 AND S-176 POINT AT (FR-098, MUST), and the band's top
   * edge is forbidden (MUST NOT) -- a band does not flow, so an anchor on it
   * would never move. ⛔⛔ OPTIONAL, and `undefined` reads as `regions.rowArea.y`,
   * which is what every caller meant before a band existed.
   */
  readonly scrollAreaY?: number
  /**
   * ST-7's safety valve: the row that reached it, or `null` while no row did.
   *
   * ⭐⭐ THIS IS ST-7's value for "the valve was reached" (MUST), and the layout
   * that carries it is a layout that STOPPED, so the row named here is NOT in
   * `rows`, none of its `Task` is in `placements`, and
   * neither is any row after it. ⚠️ So `contentWidth`, `contentHeight` and
   * `contentX0` measure what was laid out BEFORE the valve and not the document.
   *
   * ⛔⛔ REQUIRED AND NOT OPTIONAL, unlike the two members above it. Those two
   * have a reading for `undefined` that every caller meant already; this one has
   * none -- a caller that never learns the valve was reached is a caller that
   * shows a picture with rows missing and says nothing, which is exactly the
   * 「黙って切り捨て」 ST-7 forbids (MUST NOT). A required member makes the
   * compiler put it in front of every reader.
   *
   * ⭐ WHAT THE READER OWES: the telling ST-7 (MUST) requires -- `RS-24` of
   * table T-233, in the manner that row names, `NT-3a`.
   * ⛔ NOT RAISED HERE. Table T-060's
   * LY-5 leaves a current value to the Framework and this unit is `pure`; the
   * shell is where `layoutFromSchedule` is called and where `RaisedNotice` is
   * appended, so the telling is raised there, off this member.
   */
  readonly stackSafetyCapReached: StackSafetyCapStop | null
}

/**
 * ST-7's safety valve, once it has been reached -- what `ScheduleLayout`
 * carries back in place of the exception this used to be.
 *
 * ⭐⭐ A VALUE AND NOT A THROW, WHICH IS ST-7's OWN SENTENCE (MUST / MUST NOT).
 * ⛔ The row states its own reason in the same breath, so catching the throw
 * somewhere up the stack and raising the telling from the catch would do the
 * very thing that reason argues against. The return type and the side that
 * reads it are one change.
 *
 * ⭐ THE TWO MEMBERS ARE THE TWO THE EXCEPTION CARRIED, and nothing was minted
 * to replace it: ST-7 counts 「その `TaskGroup` の行に載っている `Task` が同時に
 * 重なる段数」, so the group is what reached the valve and `S-89` is the number
 * it reached. ⛔ NEITHER REACHES THE SCREEN AS A WORD. FR-038 (MUST) keeps every
 * printed string in the one dictionary and `RS-24` of table T-233 is what is
 * read out of it, so these two are for the shell to tell WHICH row and WHAT cap
 * -- never to be printed.
 *
 * ⚠️ NOT A ROW OF TABLE T-064, and PI-5 needs no word added for it -- that table
 * holds the NAMES a component publishes and leaves arguments and return values
 * to `src/`, exactly as the notes on `FitToScreen` and `NotStoredZoom` say. This
 * type exists only to give `ScheduleLayout` its member. ⛔ The exception this
 * replaces was never on PI-5 either, so nothing was struck from the roster.
 */
export interface StackSafetyCapStop {
  /** The `TaskGroup.id` of the row whose lanes reached `S-89`. */
  readonly groupId: string
  /** `S-89` as it stood in the settings this run was given. */
  readonly cap: number
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/**
 * The two calendar questions LC-2 asks per `Task`, each answered once per
 * distinct argument for the length of ONE run of `layoutFromSchedule`.
 *
 * ⭐⭐ WHY. Every road into the calendar in `schedule.ts` builds its index
 * again, and that index parses every `Exception` date with a regular
 * expression; the file says so itself and gives the reason it will not hold one
 * (R2.20 would make it a cache, and Chapter 5.6 records none). This pass asks
 * `dayOf` three times per `Task` and `dateFromWorkingDays` once per `Task` that
 * holds an actual, which at MC-7 scale is a measurable share of the frame
 * NFR-003 allows.
 *
 * ⛔ NOT A CACHE, AND MUST NOT BECOME ONE. One of these is made inside
 * `layoutFromSchedule`, filled by that call and dropped with it, so there is
 * nothing to go stale and the answers are the ones the direct calls gave.
 * ⚠️ Moving it outside one call needs Chapter 5.6 to record what invalidates
 * it (R2.20); this note is not that record.
 */
interface DayReader {
  /** `dayOf`, by the stored text -- which is what the regular expression reads. */
  day(text: string | null): CalendarDay | null
  /** `dateFromWorkingDays`, by the day counted from and the count. */
  walk(from: CalendarDay, workingDays: number): CalendarDay
  /**
   * `nextWorkingDay` -- 「予定の開始日の翌稼働日」, the day FR-043 stands GR-9's
   * dummy on. ⛔ NOT `walk(from, 1)`: that answers a half-open end bound, which
   * `nextWorkingDay`'s own declaration spells out.
   */
  after(from: CalendarDay): CalendarDay
}

/**
 * ⚠️ `null` is a REMEMBERED answer and not a miss: a column naming no day
 * answers `null` every time, and `Map.get` tells the two apart by answering
 * `undefined` for a key never seen.
 *
 * @purity pure
 */
function dayReaderFor(within: WorkingCalendar): DayReader {
  const days = new Map<string, CalendarDay | null>()
  const walks = new Map<string, CalendarDay>()
  const afters = new Map<string, CalendarDay>()
  return {
    day(text: string | null): CalendarDay | null {
      const key = text ?? ''
      const held = days.get(key)
      if (held !== undefined) return held
      const made = dayOf(text)
      days.set(key, made)
      return made
    },
    walk(from: CalendarDay, workingDays: number): CalendarDay {
      // `textOfDay` spells the day, because a `CalendarDay` is a record and two
      // equal ones are not the same key.
      const key = `${textOfDay(from)}/${String(workingDays)}`
      const held = walks.get(key)
      if (held !== undefined) return held
      const made = dateFromWorkingDays(within, from, workingDays)
      walks.set(key, made)
      return made
    },
    after(from: CalendarDay): CalendarDay {
      const key = textOfDay(from)
      const held = afters.get(key)
      if (held !== undefined) return held
      const made = nextWorkingDay(within, from)
      afters.set(key, made)
      return made
    },
  }
}

/**
 * Full-width counts two, half-width counts one. FR-093 forbids measuring the
 * glyphs and forbids keeping what a measurement returned.
 *
 * ⭐ PUBLISHED BECAUSE FR-093'S ESTIMATE IS NEEDED ON BOTH SIDES OF ONE SEAM.
 * FR-006 (MUST / MUST NOT) has the properties panel work out the room each
 * control needs and forbids the drawing side a coefficient of its own, so the
 * panel counts the same units this file does. ⛔ A second count written there
 * would be the same rule in two places (rule 03 section 4), and the two would
 * part company the first time the counting rule moved.
 *
 * @purity pure
 */
export function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += character.charCodeAt(0) < 0x100 ? 1 : 2
  return units
}

/** LC-5. FR-093's estimate: units times font size times labelCoef. @purity pure */
function labelWidth(text: string, fontSize: number, settings: DocumentSettings): number {
  return labelUnits(text) * fontSize * settings.labelCoef
}

/**
 * `Resource/Type` as AT-87 codes it: 0 = 材料, 1 = 作業, 2 = 費用.
 *
 * ⛔ WRITTEN HERE RATHER THAN IMPORTED, and neither copy is the odd one out.
 * `edit-resource.ts` holds the same number for FR-008 and is a USE CASE --
 * table T-062's layers forbid this one reaching it. Publishing it from
 * `schedule.ts` instead would mint a crossing table T-064's PI-1 does not hold.
 * Both copies name AT-87, which is the one place the code is written down.
 */
const WORK_RESOURCE = 1

/**
 * AS-2 of table T-225 (MUST / MUST NOT).
 *
 * ⛔ NOT A WORD (FR-038): it is the same mark in every language, the bargain
 * `TRUNCATION_MARK` already strikes. ⚠️ It is the SAME character AS-3 reads as
 * 「解除の合図」 and AS-4 refuses to put in the roster, which is why AS-2 spells
 * it rather than leaving the empty case to the drawing side.
 */
const NO_ASSIGNEE_MARK = '-'

/**
 * What FR-059 calls 「残りの人数」, put on the label after the first name.
 *
 * ⛔ THE COUNT IS THE REQUIREMENT'S; THE MARK IN FRONT OF IT IS NOT. FR-059
 * fixes what is shown -- 「資源名の昇順で先頭 1 名と残りの人数」 -- and no row
 * anywhere spells how the two are joined. A digit behind `+` is language
 * neutral, so FR-038 has nothing to translate.
 * @provisional PD-346
 */
const MORE_ASSIGNEES_MARK = '+'

/**
 * FR-090's 「百分率の記号」.
 *
 * ⛔ NOT A WORD (FR-038), for the reason `TRUNCATION_MARK` gives: the sign is
 * the same in every language the tool prints.
 */
const PERCENT_MARK = '%'

/**
 * FR-059's assignee label for every Task somebody is on, by Task uid.
 *
 * The requirement (MUST) keeps 作業資源 alone, and where more than one is left
 * it prints the first name in resource-name order and how many remain.
 *
 * ⚠️ A Task ABSENT from the answer is one nobody is on. AS-2 of table T-225
 * settles that case with a mark rather than with nothing, and the caller
 * applies it -- this map is about who is there, and the caller is where S-60
 * decides whether any of it is drawn at all.
 *
 * ⛔ TWO COLUMNS SPELL 「費用資源」 AND BOTH ARE READ: AT-87's code 2 and
 * AT-88's own boolean. Reading one of them would let the other say cost and be
 * drawn as a person.
 *
 * @purity pure
 */
function assigneeLabelsOf(schedule: Schedule): ReadonlyMap<number, string> {
  const resourceByUid = new Map<number, Schedule['resources'][number]>()
  for (const resource of schedule.resources) resourceByUid.set(resource.uid, resource)

  const onTask = new Map<number, { readonly name: string; readonly uid: number }[]>()
  for (const assignment of schedule.assignments) {
    const taskUid = assignment.taskUid
    if (taskUid === null || assignment.resourceUid === null) continue
    const resource = resourceByUid.get(assignment.resourceUid)
    if (resource === undefined) continue
    if (resource.resourceKind !== WORK_RESOURCE) continue
    if (resource.isCostResource === true) continue
    const name = resource.name ?? ''
    if (name === '') continue
    const held = onTask.get(taskUid) ?? []
    held.push({ name, uid: resource.uid })
    onTask.set(taskUid, held)
  }

  const labels = new Map<number, string>()
  for (const [taskUid, held] of onTask) {
    // ⛔ NOT `localeCompare`: FR-059 asks for 「資源名の昇順」 and a collation
    // that changes with the host would draw a different name on the same
    // document on another machine, which is not an ordering this file may have.
    held.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.uid - b.uid))
    const first = held[0]!
    labels.set(
      taskUid,
      held.length === 1
        ? first.name
        : `${first.name} ${MORE_ASSIGNEES_MARK}${held.length - 1}`,
    )
  }
  return labels
}

/**
 * FR-090's percent label, or `''` where the requirement draws none.
 *
 * ⛔ THE STORED VALUE, UNTOUCHED (MUST / MUST NOT) -- AT-39 keeps it an integer
 * with no upper bound, so 120 is printed as 120.
 * ⛔ AND NO LABEL ON A TASK NOT BEGUN (MUST NOT) -- a zero there
 * would read as a measurement rather than as "not begun", and FR-043's
 * entrance is what says the Task has not started.
 *
 * @purity pure
 */
function percentLabelOf(task: Task): string {
  if (planActualState(task) === 'notStarted') return ''
  const percent = task.percentComplete
  return percent === null ? '' : `${percent}${PERCENT_MARK}`
}

/**
 * FR-090's 「区切り」, whose spelling that requirement (MUST) fixes.
 *
 * ⛔ NOT A WORD (FR-038), for the reason `PERCENT_MARK` gives, and it is the
 * requirement's own spelling rather than a choice made here.
 */
const OC2_SEPARATOR = ' : '

/**
 * OC-2's ONE card (FR-090, MUST, 利用者の裁定 2026-09-08): the assignee, the
 * separator, the percent and the percent sign joined into one string.
 *
 * ⛔ ONE CARD AND NOT TWO (MUST / MUST NOT) -- so the join happens HERE, before
 * LC-7 measures, and every side downstream reads one string. ⭐ With one of
 * S-60 and S-61 shown the card is that one alone and no separator appears, and
 * with neither shown there is no card -- which is the two guards below and the
 * `''` they answer with.
 *
 * @purity pure
 */
function outsideLabelOf(assignee: string, percent: string): string {
  if (assignee === '') return percent
  if (percent === '') return assignee
  return `${assignee}${OC2_SEPARATOR}${percent}`
}

/**
 * What table T-013's preamble (MUST) puts at the end of a name it cut.
 *
 * ⭐ ONE CHARACTER, U+2026, AND NOT THREE FULL STOPS. The requirement asks
 * for a mark that reads as "there is more" and does not spell one; this is
 * the mark `tooltips.ts` already uses for the same job, and the same thing
 * written two ways is what R3.4 refuses. ⚠️ It costs 2 units, the width of a
 * full-width character, which is what it is.
 * ⛔ NOT A WORD (FR-038): it is the same mark in every language.
 */
const TRUNCATION_MARK = '…'
const TRUNCATION_MARK_UNITS = 2

/**
 * LC-4. Cuts to truncateUnits (S-35), counting the same units.
 *
 * ⛔ THE MARK IS INSIDE THE LIMIT, NOT ADDED TO IT (table T-013, MUST NOT):
 * S-35 is how much may be SHOWN, so a name that had to be cut gives up two
 * more units to say so.
 * ⚠️ A limit too small to hold the mark cuts to nothing rather than
 * overflowing -- S-35's own floor is 4, so this cannot arise from a value
 * the specification allows.
 *
 * @purity pure
 */
function truncate(text: string, limit: number): string {
  const unitsOf = (ch: string): number => (ch.charCodeAt(0) < 0x100 ? 1 : 2)
  let units = 0
  for (const character of text) units += unitsOf(character)
  if (units <= limit) return text

  const room = limit - TRUNCATION_MARK_UNITS
  let kept = ''
  let taken = 0
  for (const character of text) {
    const next = taken + unitsOf(character)
    if (next > room) break
    taken = next
    kept += character
  }
  return kept + TRUNCATION_MARK
}

/**
 * The height one Task reserves. ⚠️ Table T-012's last column decides it, and
 * FR-094 floors the plan height once, before the shape ratio.
 *
 * @purity pure
 */
function reservedHeight(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const planHeight = planHeightOf(shapeKind, settings)
  return laidBelow(shapeKind)
    ? planHeight + settings.actualGap + planHeight * settings.actualOfPlan
    : planHeight
}

/** SH-3 and SH-4 push the actual below; the rest do not. Table T-012. @purity pure */
function laidBelow(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

/**
 * Table T-012's last column: where the actual sits relative to the plan.
 *
 * ⭐ Resolved in one place because LC-7 and the placement below both need it,
 * and because it is what decides whether OC-5 of table T-038 applies.
 *
 * @purity pure
 */
function actualPlacementOf(shapeKind: ShapeKind): 'inside' | 'below' | 'sideways' {
  if (shapeKind === 'milestone') return 'sideways'
  return laidBelow(shapeKind) ? 'below' : 'inside'
}

/**
 * How far right the ACTUAL figure's ink actually reaches.
 *
 * ⛔ NOT PUBLISHED. Table T-064's PI-5 names what this unit hands out, and
 * this is not one of them -- so the answer LEAVES on `TaskPlacement.actualReach`
 * instead, the way `labelX` and `labelFontSize` already do.
 *
 * ⛔⛔ NOT `actualX + actualWidth`. That pair is the span of the DATES, which
 * `TaskPlacement` says in as many words, and LF-10 of table T-221 draws a
 * milestone's actual as a figure CENTRED on its day: a Task whose
 * `actualDuration` is S-130 (zero) has a zero-width span and a figure half a
 * side wide on either side of it.
 *
 * ⭐ WHY IT IS ONE FUNCTION AND NOT TWO SPELLINGS. Two rows read this: GR-7 of
 * table T-023d anchors the progress marker off the actual's right edge, and
 * table T-038's order puts the name label past the actual bar and its dummy.
 * ScheduleGeometry answers the first and this file answers the second, so
 * written twice they part company and the marker lands inside the figure.
 *
 * ⚠️ `planHeightOf` rather than a carried height, so the two callers cannot
 * disagree: `TaskPlacement.planHeight` is built from this very call, and
 * `taskGeometryOf` draws the sideways figure at `planHeight * actualOfPlan`.
 *
 * @purity pure
 */
function actualReachOf(
  shapeKind: ShapeKind,
  actual: { readonly x: number; readonly width: number },
  settings: DocumentSettings,
): number {
  if (actualPlacementOf(shapeKind) !== 'sideways') return actual.x + actual.width
  return actual.x + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
}

/**
 * FR-094's floor on the plan bar, before the shape ratio.
 *
 * ⭐ Written ONCE because `zoomYAtPlanHeightFloor` below solves this very
 * expression for the zoom, and FR-055's fit lands on that zoom. Two spellings
 * of the same floor can differ by an ulp, and then the fit measures at a zoom
 * that is a hair under the floor it meant to sit on.
 *
 * @purity pure
 */
function planHeightFloor(settings: DocumentSettings): number {
  return settings.actualMin / settings.actualOfPlan
}

/**
 * The zoomY at which the bands REACH FR-094's floor -- the zoom the first of
 * the two passes printed after table T-068 measures every depth at.
 *
 * ⭐ WHY IT IS THE RIGHT ZOOM TO MEASURE AT: at and below it the `Math.max`
 * in `planHeightOf` answers the floor whatever the zoom is, so no band, no
 * label font and no milestone figure moves. That is what lets the table's own
 * note say the heights of the depths inside the floor come out of ONE run.
 *
 * @purity pure
 */
function zoomYAtPlanHeightFloor(settings: DocumentSettings): number {
  return planHeightFloor(settings) / settings.basePlanHeight
}

/**
 * The plan bar's own height. FR-094 puts the floor on it ONCE, before the
 * shape ratio, and forbids a second floor on the actual.
 *
 * @purity pure
 */
function planHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const ratio = settings.shapeHeightOf[shapeKind]
  return Math.max(planHeightFloor(settings), settings.basePlanHeight * settings.zoomY) * ratio
}

/**
 * The font a bar's label is drawn at.
 *
 * FR-077 derives it from the bar, and FR-094 fixes how the floors are applied:
 * the text floor (S-8) is applied SEPARATELY from the height floor, because
 * `thinFontScale` (S-9) multiplies the thin shapes and would otherwise take
 * the type under what can be read.
 *
 * @purity pure
 */
function labelFontSize(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const actual = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  const scale = laidBelow(shapeKind) ? settings.thinFontScale : 1
  return Math.max(settings.fontMin, actual * settings.fontOfActual * scale)
}

/**
 * LC-3. Which of L-1's four steps the ruler shows.
 *
 * FR-017 fixes the test: pxPerDay divided by (the effective font size over
 * S-8) against each threshold. The division cancels the text scale so the three
 * stored thresholds stay fixed values -- FR-017 forbids deriving them.
 *
 * @purity pure
 */
export function rulerTierOf(pxPerDay: number, settings: DocumentSettings): RulerTier {
  const scaled = pxPerDay / (settings.rulerFont / settings.fontMin)
  if (scaled >= settings.rulerTierPxPerDayDay) return 'yearMonthDayWeekday'
  if (scaled >= settings.rulerTierPxPerDayWeek) return 'yearMonthWeek'
  if (scaled >= settings.rulerTierPxPerDayMonth) return 'yearMonth'
  return 'year'
}

/**
 * The seven days LF-1 gives the week tier. ⛔ NOT A SETTING AND NOT A ROW: a
 * week is seven days by definition, and `S-108` (`Project.weekStartDay`) holds
 * WHICH day it starts on, never how many it has.
 */
const DAYS_PER_WEEK = 7

/**
 * LF-1 of table T-221: how many days one tick of the CURRENT tier stands for.
 * FR-089 stands its grid lines at the same interval.
 *
 * ⛔ THE INTERVAL IS THE TIER'S OWN AND IS NOT COMPUTED FROM ANY WIDTH. LF-1
 * fixes one per tier -- a year, a month, seven days, a day -- and FR-017 (MUST
 * NOT) forbids thinning any of them. ⚠️ A stride of two or three days makes a
 * reader count the unit afresh at every zoom, which is the thinning it closed.
 *
 * ⭐ WHERE A WHOLE DAY'S LABEL WILL NOT FIT, THE TIER ITSELF STEPS COARSER --
 * FR-017 says so, and `rulerTierOf` above is where that happens, because the
 * threshold IS that boundary. `S-85` is derived from the widest of the two
 * languages plus `rulerLabelGap` for exactly this reason (table T-205's note).
 * ⛔ So no width is consulted here and none should be: a second width test
 * would re-open the thinning the ruling closed.
 *
 * ⚠️ THE DAY COUNT OF THE COARSE TIERS IS NOT CONSTANT, which is why they are
 * not answered with a number of days. A month is 28 to 31 days and a year 365
 * or 366; the caller walks the calendar for those and asks this only for the
 * two tiers whose interval IS a fixed number of days.
 *
 * @purity pure
 */
export function tickStrideOf(layout: ScheduleLayout, _settings: DocumentSettings): number {
  // LF-1: the week tier ticks every seven days, the day tier every day. The
  // year and month tiers do not measure in days at all -- their interval is a
  // calendar step -- and one is the answer that leaves the caller's own walk
  // over the calendar undisturbed.
  return layout.tier === 'yearMonthWeek' ? DAYS_PER_WEEK : 1
}

/**
 * The day at a point on the horizontal axis, and its inverse.
 *
 * S-77 pins the left edge of the Row Area to `scrollDate`, and FR-017 fixes the
 * width of one day, so the two together settle the axis without a rule of their
 * own. Returns null while no origin is set -- OP-10 has FR-055 choose one.
 *
 * ⚠️ Reads `layout.originX` rather than re-deriving the origin from a
 * `ScreenRegions`, which is what that member exists for. Taking the regions
 * from the caller instead lets a value arrive that the layout was NOT built
 * from, and then x -> day -> x lands on a different day without saying so.
 *
 * @purity pure
 */
export function dateAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const days = Math.floor((x - layout.originX) / layout.pxPerDay)
  const foundAt = new Date((serialOf(layout.originDay) + days) * MS_PER_DAY)
  return { year: foundAt.getUTCFullYear(), month: foundAt.getUTCMonth() + 1, day: foundAt.getUTCDate() }
}

/**
 * The x of a day on the time axis the three arguments define.
 *
 * ⚠️ Takes the axis in pieces rather than a `ScheduleLayout` because LC-1 to
 * LC-9 need it while that layout is still being built. It is the one formula:
 * `xFromDay` below is the same axis read off a finished layout.
 *
 * @purity pure
 */
function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number,
                     day: CalendarDay): number {
  return originX + (serialOf(day) - originSerial) * pxPerDay
}

/**
 * PI-5's `xFromDay`: `dateAtX` run the other way.
 *
 * Answers the origin's own x while no origin is set, which is where `dateAtX`
 * answers null -- there is no day to measure from, so nothing is offset.
 *
 * @purity pure
 */
export function xFromDay(layout: ScheduleLayout, day: CalendarDay): number {
  const origin = layout.originDay
  if (origin === null) return layout.originX
  return xOnTimeAxis(serialOf(origin), layout.pxPerDay, layout.originX, day)
}

/**
 * FD-6 and FD-6b of table T-012a in pixels: the rectangle lets `fadeIn` win and
 * cuts `fadeOut` to what is left, the chevron shrinks both by one ratio.
 *
 * ⚠️ RC-7 records that the two rules differing has no basis and asks for them
 * to be squared up against a real screen. Until that happens each stays where
 * its own row put it.
 *
 * ⛔ FD-5 IS APPLIED HERE AND NOT ASSUMED. Nothing keeps FD-6 / FD-6b off
 * SH-3 / SH-4 / SH-5: the columns belong to `Task` and not to the shape,
 * FR-023's import test (FD-7) and IV-12 speak of the days against the DURATION
 * and never of the shape, and a shape may be changed after the days are set.
 * ⇒ Without the guard below, a shape that carries no fade loses room to one,
 * and its name label moves for a mark `ScheduleGeometry` never draws.
 *
 * ⭐ The paragraph after table T-013 opens with 「フェードを持つ形状では」, and
 * FD-5 is what says which shapes those are -- so the three without one are left
 * with the room they had.
 *
 * @purity pure
 */
function clampedFade(task: Task, kind: ShapeKind, span: number, pxPerDay: number): {
  readonly fadeIn: number
  readonly fadeOut: number
} {
  if (kind !== 'rectangle' && kind !== 'chevron') return { fadeIn: 0, fadeOut: 0 }
  const asPixels = (days: number | null): number => Math.max(0, (days ?? 0) * pxPerDay)
  const rawIn = asPixels(task.fadeInDays)
  const rawOut = asPixels(task.fadeOutDays)
  if (rawIn + rawOut <= span) return { fadeIn: rawIn, fadeOut: rawOut }
  if (kind === 'chevron') {
    const ratio = span / (rawIn + rawOut)
    return { fadeIn: rawIn * ratio, fadeOut: rawOut * ratio }
  }
  const fadeIn = Math.min(rawIn, span)
  return { fadeIn, fadeOut: Math.min(rawOut, span - fadeIn) }
}

/** LC-1. A row goes when it, or anything above it, is hidden or collapsed. @purity pure */
function drawnGroups(
  schedule: Schedule,
  settings: DocumentSettings,
  isLevelZeroFolded: boolean,
): readonly (TaskGroup & { depth: number })[] {
  // ⭐⭐ LEVEL 0 IS THE PANEL'S HEAD, AND FOLDING IT TAKES EVERY ROW. HR-2 of
  // table T-015 (MUST) reaches the shallowest rows too, and says why a row's
  // own fold cannot carry them: they have no parent, so nobody hides them.
  // ⇒ the picture can hold no row at all, which is this one line.
  // ⛔ NOT A COLUMN ON `TaskGroup`. The same row (MUST NOT) forbids moving AT-56
  // or AT-57 for it; S-211 of table T-206 holds the state, the shell keeps it
  // (it is not saved), and it arrives here as an argument.
  if (isLevelZeroFolded) return []
  const byId = new Map(schedule.taskGroups.map((glyph) => [glyph.id, glyph]))
  const drawnRows: (TaskGroup & { depth: number })[] = []

  for (const group of schedule.taskGroups) {
    let depth = 1
    let dropped = group.isHidden === true
    // HR-1a hides what a collapsed row holds and HR-6 does the same for a
    // hidden one; neither re-parents what it hides, so walking up settles it.
    for (let foundAt = group.parentId, guard = 0; foundAt !== null && guard <= settings.maxGroupDepth; guard++) {
      const parent = byId.get(foundAt)
      if (parent === undefined) break
      depth += 1
      if (parent.isHidden === true || parent.isCollapsed === true) dropped = true
      foundAt = parent.parentId
    }
    if (!dropped) drawnRows.push({ ...group, depth })
  }
  return inTreeOrder(drawnRows, byId)
}

/**
 * LC-9's order: a preorder walk, so a row's own subtree sits directly under it
 * and siblings follow AT-55.
 *
 * ⛔ NOT A SORT BY DEPTH: the paragraph under table T-068 forbids that ordering
 * outright, and it puts every root first.
 *
 * A row whose parent is missing is a root here, and anything a parent cycle
 * makes unreachable is appended rather than dropped: the walk decides ORDER,
 * and LC-1 above has already decided membership.
 *
 * @purity pure
 */
function inTreeOrder<T extends TaskGroup & { depth: number }>(
  rows: readonly T[], byId: ReadonlyMap<string, TaskGroup>,
): readonly T[] {
  const childrenOf = new Map<string | null, T[]>()
  for (const row of rows) {
    const parent = row.parentId !== null && byId.has(row.parentId) ? row.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [row])
    else siblings.push(row)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)

  const ordered: T[] = []
  const seen = new Set<string>()
  const walk = (parent: string | null): void => {
    for (const row of childrenOf.get(parent) ?? []) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      ordered.push(row)
      walk(row.id)
    }
  }
  walk(null)
  for (const row of rows) if (!seen.has(row.id)) ordered.push(row)
  return ordered
}

/**
 * LC-2, the group half. FR-018 drops the deeper rows as zoomY falls, and S-88
 * being above one is what keeps that order. Depth 1 is never a candidate: the
 * domain starts at two, or the smallest zoom would empty the screen and break
 * FR-055's floor.
 *
 * @purity pure
 */
export function groupDepthLimit(settings: DocumentSettings): number {
  let limit = 1
  for (let depth = 2; depth <= settings.maxGroupDepth; depth++) {
    if (settings.zoomY >= groupDepthThresholdOf(depth, settings)) limit = depth
  }
  return limit
}

/**
 * FR-018's threshold for one depth. Values are S-87 and S-88 of table T-205.
 *
 * ⛔ THE EXPRESSION MUST NOT BE TYPED TWICE. FR-055's fit lands the vertical
 * zoom ON the threshold of the depth it chose, and `groupDepthLimit` above is
 * what then reads that zoom back as a depth. Computed by any other route the
 * two can differ by one ulp, and the fit draws a picture one depth shallower
 * than the zoom it wrote -- which is exactly the silent disagreement FR-055's
 * MUST NOT is about.
 *
 * ⚠️ The domain starts at two: FR-018 forbids depth 1 from being a candidate
 * (MUST NOT), so this is not asked about it. `landingZoomY` says what the fit
 * does there instead.
 *
 * ⭐ EXPORTED FOR HF-14's SECOND HALF (MUST, 2026-09-04): 「立てた行が、現に描かれ
 * ている詳しさの段（`FR-018`）で落ちる深さになるときは、その行が描かれるまで詳し
 * さの段を開くこと」. Opening the tier means putting `zoomY` at the smallest value
 * that draws that depth, which is exactly this -- and the MUST NOT above is why
 * the caller reads it here instead of typing the expression a second time.
 *
 * @purity pure
 */
export function groupDepthThresholdOf(depth: number, settings: DocumentSettings): number {
  return settings.groupLevelOfDetailBase * Math.pow(settings.groupLevelOfDetailRatio, depth - 2)
}

/**
 * Takes the index rather than the `Schedule`: `taskVisuals` holds up to one row
 * per Task, so scanning it for each Task is O(n^2) in the task count, which
 * NFR-013 forbids in as many words for レイアウトの算出.
 *
 * @purity pure
 */
function shapeKindOf(visualByUid: ReadonlyMap<number, TaskVisual>, task: Task): ShapeKind {
  const kind = visualByUid.get(task.uid)?.shapeKind ?? null
  // AT-100: a null resolves through Task.milestone, which AT-30 calls the truth.
  if (kind !== null) return kind
  return task.milestone === true ? 'milestone' : 'rectangle'
}

/**
 * AT-101's figure, or the default CR-177 settled.
 *
 * ⭐ The default is read from COLUMN_DEFAULTS rather than written here: it is
 * generated out of erd.json, so changing the manuscript changes what is drawn.
 *
 * @purity pure
 */
function milestoneGlyphOf(
  visualByUid: ReadonlyMap<number, TaskVisual>,
  task: Task,
): MilestoneGlyph {
  return visualByUid.get(task.uid)?.milestoneGlyph ?? COLUMN_DEFAULTS.TaskVisual.milestoneGlyph
}

/**
 * The span of the dates in pixels, before anything widens it.
 *
 * ⚠️ This definition is this file's own: the plan bar runs from `start` to
 * `finish` EXCLUDING the finish day, so start == finish measures zero. Table
 * T-221 fixes the milestone figure (LF-10) and the actual bar (RV-1) but has no
 * row for the plan bar's extent, and no requirement elsewhere fixes it either.
 * A change request has to settle whether the finish day counts -- until it
 * does, nothing here may be read as the specification's answer.
 *
 * @purity pure
 */
function spanWidthOf(task: Task, pxPerDay: number, reader: DayReader): number {
  const from = reader.day(task.start)
  const toDay = reader.day(task.finish)
  if (from === null || toDay === null) return 0
  return Math.max(0, serialOf(toDay) - serialOf(from)) * pxPerDay
}

/**
 * Whether the plan's two ends stand on ONE DAY -- the fact table T-023d's
 * closing rule turns on, the plan's two ends being one of the pairs it binds.
 *
 * ⭐⭐ A TRUTH ABOUT DAYS, AND DELIBERATELY NOT A WIDTH. `spanWidthOf` above
 * answers the same two dates in PIXELS, and `shapeWidthOf` then floors that at
 * S-49 -- so by the time a bar reaches `item-hit-area.ts` a plan whose start
 * and finish are one day is 6px wide and is indistinguishable there from a plan
 * that really spans 6px. ⛔ THE HOLE CANNOT BE CLOSED WITH A PIXEL: the same
 * table's MUST NOT -- 「倍率によってこの境目を動かしてはならない」 -- rules out
 * any figure in pixels standing in for a date, and one day's width is exactly
 * such a figure. So the DAY is decided where the days are known and carried.
 *
 * ⚠️ IT IS NOT `spanWidthOf(...) === 0`, although the two agree on every Task
 * that names both dates. A Task naming neither also measures zero there, and
 * its two ends do not stand on one day -- they stand nowhere -- so the width's
 * `0` answers a second question it was never asked.
 *
 * ⚠️ THE READER MEMOISES, so asking it for the same two dates twice costs two
 * map lookups and no arithmetic. Folding this into `spanWidthOf` would make one
 * function answer in two units, which is the confusion this fact exists to end.
 *
 * ⛔ NOTHING HERE IS SAID ABOUT THE ACTUAL BAR. RV-1 of table T-069 fixes its
 * right end at the start day plus `actualDuration` counted in working days, so
 * its two ends stand on one day exactly when that span is zero -- and
 * `actualSpanOf` puts no floor under the width, so the hit test can still read
 * that off the bar it is handed.
 *
 * @purity pure
 */
function planEndsStandOnOneDay(task: Task, reader: DayReader): boolean {
  const from = reader.day(task.start)
  const toDay = reader.day(task.finish)
  if (from === null || toDay === null) return false
  return serialOf(from) === serialOf(toDay)
}

/**
 * The width the shape is actually drawn at, which is what CR-163 makes the
 * task level of detail read (S-86: "形状の幅がこれを割る Task を描かない").
 *
 * ⚠️ A milestone is a figure, not a span: LF-10 gives it a side equal to its
 * own plan height, so its date span (zero, since start equals finish) is not
 * its width. Reading the span here would drop every real milestone at every
 * zoom.
 *
 * @purity pure
 */
function shapeWidthOf(
  spanWidth: number,
  shapeKind: ShapeKind,
  settings: DocumentSettings,
): number {
  if (shapeKind === 'milestone') return planHeightOf(shapeKind, settings)
  // FR-001's RATIONALE: a Task of zero duration is still a Task, drawn at S-49.
  return Math.max(spanWidth, settings.minShapeWidth)
}

/**
 * Whether the task level of detail leaves this Task on the screen (FR-018).
 *
 * ⚠️ The rule measures the width a DURATION produced -- 幅が期間から出ていない
 * 形状を落としてはならない（MUST NOT）(CR-174). Two shapes take their width from
 * somewhere else: a milestone from LF-10's figure, and a Task of zero duration
 * from S-49's floor. Neither shrinks as the zoom falls, so neither is evidence
 * that the Task has grown too short to read. A Task holding no dates has no
 * span either, and is exempt for the same reason.
 *
 * ⭐ The exempt set does not vary with the zoom, so what is drawn stays
 * "a fixed set plus a shrinking one" and FR-018's MUST NOT against a shrink
 * that shows MORE still holds without an argument.
 *
 * @purity pure
 */
function keptByLevelOfDetail(
  shapeKind: ShapeKind,
  spanWidth: number,
  shapeWidth: number,
  settings: DocumentSettings,
): boolean {
  if (shapeKind === 'milestone' || spanWidth <= 0) return true
  return shapeWidth >= settings.taskLevelOfDetailReadablePx
}

/**
 * RV-1 and the left edge that goes with it, in pixels, or null when the Task
 * holds no actual at all.
 *
 * FR-011 fixes both ends. Table T-069's note requires the counting itself to
 * come from `Schedule` -- writing it a second time here is a MUST NOT.
 *
 * @purity pure
 */
function actualSpanOf(
  task: Task,
  reader: DayReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
): { readonly x: number; readonly width: number } | null {
  const from = reader.day(task.actualStart)
  if (from === null) return null
  const toDay = reader.walk(from, task.actualDuration ?? 0)
  return {
    x: xOnTimeAxis(originSerial, pxPerDay, originX, from),
    width: Math.max(0, serialOf(toDay) - serialOf(from)) * pxPerDay,
  }
}

/**
 * How wide FR-043's mark is: one day's width or `S-180`, whichever is the
 * smaller -- which is the hold as well as the ink.
 *
 * ⭐⭐ THE ORDER OF TABLE T-038 COUNTS THE HOLD (MUST, 利用者の裁定 2026-09-09) --
 * and for these three rows the two are now ONE width, which the same row says
 * in as many words:
 * 「掴みシロが印そのものになった以上、2 つは同じ 1 つの幅であり、区別は消えた」.
 *
 * ⚠️ Because the ink is 「1 日ぶんと `S-180` の小さい方」, this width MOVES WITH
 * THE ZOOM: `pxPerDay` is one of the two the `Math.min` chooses between.
 *
 * ⚠️ S-180 IS ALSO GENERATED INTO `schedule-geometry.ts` AND THE RENDERER, and
 * that is not a duplicated VALUE but a second printing of the one manuscript
 * row -- the bargain `NOT_STORED_SCROLLBAR_SIZES` already stands on. ⛔ Reading
 * it out of ScheduleGeometry instead would be the cycle LR-3 forbids: that unit
 * imports this file.
 *
 * ⛔ A FUNCTION AND NOT A BINDING, and the reason is the file's own shape: the
 * generated block stands at the FOOT of this file, so a module-level `const`
 * reading it would be evaluated before the block exists (a temporal dead zone
 * on import). ⭐ `rowControlHeightFloor` below already reads its own generated
 * block from inside a function for the same reason.
 *
 * @purity pure
 */
function dummyGrabWidthPx(pxPerDay: number): number {
  return Math.min(pxPerDay, NOT_STORED_DUMMY_SIZES['S-180'])
}

/**
 * A reach that is really a reach. `dummyReachOf` answers negative infinity for
 * a Task FR-043 draws no dummy on, which `Math.max` reads correctly and a
 * reader of `TaskPlacement.dummyReach` should never see.
 *
 * @purity pure
 */
function finiteOrNull(reach: number): number | null {
  return Number.isFinite(reach) ? reach : null
}

/**
 * How far right FR-043's dummy reaches -- the RIGHT EDGE of the ink, which is
 * the right edge of the hold as well. `Number.NEGATIVE_INFINITY` where no dummy
 * is drawn, so that a `Math.max` against it is the whole of the test.
 *
 * ⭐⭐ THE INK IS THE HOLD AS OF 2026-09-10 (MUST), which is the closing rule of
 * table T-023d: `GR-9` / `GR-17` / `GR-18`'s hit test is the mark `FR-043`
 * drew, never widened past it (MUST NOT).
 * ⭐ Table T-038's order counts this same number -- the hold and not the drawn
 * mark -- and for this row the two are one width, the distinction gone.
 *
 * ⚠️ A MILESTONE'S DUMMY IS A SQUARE, NOT A DAY COLUMN (FR-043, MUST, 利用者の
 * 裁定 2026-09-10): the box is the same square as that milestone's actual
 * figure, drawn CENTRED on the day -- so half a side of it stands right of that
 * day, exactly as `actualReachOf` above already answers for the started figure.
 * way on purpose: the dummy and the actual figure it stands in for must reach
 * the same distance, or the marker moves the moment an actual is entered.
 *
 * ⚠️ Only asked while the Task has no actual at all: FR-043 draws the pair then
 * and not otherwise, which is the same test `dummiesOf` opens with.
 *
 * @purity pure
 */
function dummyReachOf(
  task: Task,
  shapeKind: ShapeKind,
  reader: DayReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
  settings: DocumentSettings,
): number {
  const start = reader.day(task.start)
  // FR-013 (MUST NOT) keeps a Task with no planned start off the screen, and
  // FR-043 draws no dummy without one either.
  if (start === null) return Number.NEGATIVE_INFINITY
  // 「ダミーを描く位置は、予定の開始日の翌稼働日とすること（MUST）」, and
  // 「日の列の左端に揃えること（MUST）」 is where the ink starts.
  const inkX = xOnTimeAxis(originSerial, pxPerDay, originX, reader.after(start))
  // GR-15: a milestone holds no actual BAR, so FR-043 shows ONE point on it --
  // and `dummiesOf` draws that point in a square of side `planHeight *
  // actualOfPlan`, centred on `inkX`.
  if (actualPlacementOf(shapeKind) === 'sideways') {
    return inkX + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
  }
  return inkX + dummyGrabWidthPx(pxPerDay)
}

/**
 * The room the progress marker (`OC-3`) and the resume icon (`OC-4`) stand in,
 * measured from whatever the marker hangs off.
 *
 * ⛔⛔ HELD CLEAR WHETHER OR NOT THE TWO ARE DRAWN, which is table T-038's own
 * MUST: the name label's left edge sits at the same place, and the room for
 * `OC-3` / `OC-4` stays reserved, whether or not either is drawn (MUST NOT
 * space it only when drawn).
 * ⭐ WHY. `OC-1` IS counted in the occupied width and `OC-3` / `OC-4` are
 * forbidden from it, so that flipping ONE switch -- S-63, which holds both --
 * cannot move a Task. Put the name label outside the marker and let it slide
 * back when the marker goes, and the very accident those two MUST NOTs exist to
 * prevent returns through `OC-1`.
 * ⇒ Nothing here reads `progressMarkerVisible`. It must not.
 *
 * ⭐ EVERY TERM IS A VALUE THE DOCUMENT ALREADY HOLDS -- the row forbids
 * minting a new one (MUST NOT). `markerGap` (S-23) is the clearance `markerOf`
 * puts before the circle and `resumeOf` puts before the icon; `markerSize`
 * (S-22) is the circle across; and the icon's reach is `resumeArmOfMarker`
 * (S-26) plus `resumeHeadOfMarker` (S-27) OF that same S-22, which is the
 * arithmetic `resumeOf` draws it by.
 *
 * ⚠️ S-25 (`resumeScaleInvalid`) is deliberately absent: it only SHRINKS the
 * icon (its range tops out at 1), so the room reserved here is the widest the
 * pair can ever be -- and a room that varied with `resumeValid` would move the
 * label per Task.
 *
 * @purity pure
 */
function markRoomOf(settings: DocumentSettings): number {
  const side = settings.markerSize
  const resumeReach = side * (settings.resumeArmOfMarker + settings.resumeHeadOfMarker)
  return settings.markerGap + side + settings.markerGap + resumeReach
}

/**
 * How many ranks of controls stand on one row -- HF-1 of table T-051 (MUST):
 * 「並びは 2 × 2 の格子とすること」.
 *
 * ⛔ NOT GENERATED, AND NOT A COPIED VALUE EITHER. Rule 03 section 1 forbids a
 * value the manuscript HOLDS to be typed again; this count is stated in HF-1's
 * own sentence and in no row of table T-206, so there is nothing to generate it
 * from. ⭐ It is named here, beside the sentence it is read from, rather than
 * left as a bare 2 inside an expression.
 */
const ROW_CONTROL_LATTICE_RANKS = 2

/**
 * LF-3 of table T-221 (MUST) and HF-19 of table T-051 (MUST NOT): the least a
 * row's band may be, because HF-1's lattice of controls stands on it.
 *
 * ⭐⭐ THIS LAYER HOLDS IT (利用者の裁定 2026-09-03, CR-342): a floor that reaches
 * this unit only as an argument is dropped in silence by a caller that passes
 * nothing. ⇒ A rule that only holds when a caller remembers is not a rule.
 * ⛔ THE NUMBER IS NOT WRITTEN HERE: `rowControlOuterHeightPx` is generated out
 * of S-138 and S-141 of table T-206, which is what FR-029 composes one
 * entrance's outer height from, and HF-1's lattice is `ROW_CONTROL_LATTICE_RANKS`
 * of them stacked.
 * ⚠️ A LOWER BOUND AND NOT THE LATTICE'S FIGURE. HF-6 of table T-051 (MUST NOT)
 * refuses to state the gap between two controls -- 「その量を持つ行はどこにも
 * 無く、まだ裁定を受けていない」 -- so a drawn lattice may be taller than this and
 * never shorter, which is why a measured height may raise the band.
 *
 * ⛔ A FUNCTION AND NOT A `const`: the generated block stands at the foot of
 * this file, and a module-level constant would read it inside its own temporal
 * dead zone.
 *
 * @purity pure
 */
function rowControlLatticeFloorPx(): number {
  return NOT_STORED_ROW_CONTROL_OUTER_SIZES.rowControlOuterHeightPx * ROW_CONTROL_LATTICE_RANKS
}

/**
 * Runs LC-1 to LC-9 of table T-068, in that order, once.
 *
 * ⛔ `groupDepthCap` EXISTS FOR FR-055 ALONE, and nothing else may pass it.
 * The first of the two passes printed after table T-068 has to measure 「その
 * 文書が持つすべての深さ」 at ONE zoom -- the one where the bands reach
 * FR-094's floor -- and at that zoom `groupDepthLimit` answers a fixed depth,
 * so the deeper ones cannot be asked for through `zoomY` at all. Every other
 * caller wants the depth FR-018 derives from the zoom in force, which is what
 * leaving it out gives.
 * ⚠️ Adding it moves no published member: table T-064's own header leaves
 * arguments and return values to `src/` and keeps only the names.
 * @provisional PD-206
 *
 * ⭐ `isLevelZeroFolded` IS S-211 OF TABLE T-206 -- 「段 0（行見出しパネルの頭）が
 * 畳まれているか」 -- and it is an argument for the reason that row gives: the
 * state is not saved, it stands beside S-99g, and the shell is the layer that
 * may hold a current value (LY-5 of table T-060). ⛔ Absent reads as NOT folded,
 * which is that row's own default, so no caller is forced to answer it.
 *
 * ⭐⭐ `rowControlsHeightPx` IS A MEASURED LATTICE AND NOT LF-3's SECOND FLOOR:
 * `rowControlLatticeFloorPx` holds that floor here (CR-342), so a caller that
 * hands in nothing still gets a band HF-19 (MUST NOT) allows.
 * ⭐ WHAT AN ARGUMENT IS STILL FOR: the drawn lattice may be TALLER than the
 * two rows compose -- HF-6 (MUST NOT) leaves the gap between two controls
 * unstated -- so a measurement taken where the lattice is drawn is passed in
 * and RAISES the band. ⛔ It may not lower it: HF-19 (MUST NOT) states 「格子の
 * 側を縮めて合わせてはならない」, so a measurement below the floor is a lattice
 * drawn wrong and not a shorter floor, and the band would take the fault with
 * it. ⚠️ Absent reads as no measurement, which is the floor above and no more.
 *
 * @purity pure
 */
export function layoutFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  groupDepthCap?: number,
  isLevelZeroFolded?: boolean,
  rowControlsHeightPx?: number,
): ScheduleLayout {
  // ---- LC-3 first, because LC-2's task half needs the width of one day -----
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const originSerial = originDay === null ? 0 : serialOf(originDay)
  // ---- S-177: the left edge stands this far INTO `scrollDate`'s own day ----
  // ⭐ A fraction of that day's own width and never a px count -- FR-080
  // forbids holding a scroll position in px (MUST NOT) because a zoom or a
  // window width then makes the same number point somewhere else, and a
  // fraction of the anchor's own extent survives both.
  // ⚠️ OP-10a of table T-024a asks for a fraction outside [0, 1) to send the
  // anchor along and come back into range (MUST) and forbids refusing it
  // (MUST NOT) -- and on THIS axis the two spellings are the same place, so
  // the value is applied as it stands rather than walked: every day is
  // `pxPerDay` wide, so 1.3 days past `originDay` IS the next day plus 0.3.
  // ⛔ The vertical axis is not like this and does walk; `scrollOffsetOf`
  // says why.
  // ⛔ Left where it was when no day is named: the fraction is a part of
  // `scrollDate`'s day, and there is no day to take a part of. OP-10 sends
  // that case to FR-055's fit before this ever runs.
  const dayOffset = Number.isFinite(settings.scrollDayOffset) ? settings.scrollDayOffset : 0
  const originX = regions.rowArea.x - (originDay === null ? 0 : dayOffset * pxPerDay)

  // ---- LC-1, then LC-2's group half ---------------------------------------
  // ⛔ THE CAP REPLACES THE ZOOM-DERIVED LIMIT; it does not bound it. Pass 1
  // of the two-run table printed after table T-068 has to run LC-1 to LC-9
  // through EVERY depth the document has at ONE zoom, and FR-055's vertical
  // paragraph settles the axis by CHOOSING a depth rather than by shrinking
  // the zoom. A cap that could only take depth away cannot reach a depth
  // whose FR-018 rung (S-87 / S-88) stands above that one zoom: pass 1 then
  // measured the same rows for every deeper candidate, and pass 2 -- the arm
  // that exists for exactly those depths -- was unreachable.
  // ⚠️ FR-018 is untouched. Its zoom-to-depth direction still holds for every
  // caller that leaves the argument out, and for the state the fit lands in:
  // `landingZoomY` puts zoomY on the chosen depth's own rung, and
  // `groupDepthLimit` reads that zoom back as that same depth.
  // ⭐ S-125 stays on whichever arm answered. FR-018 lets the level-of-detail
  // judgement cap the depth there (MAY), and it is what stops a caller asking
  // for a depth no zoom could draw.
  const depthLimit = Math.min(groupDepthCap ?? groupDepthLimit(settings), settings.maxGroupDepth)
  // ⭐⭐ A PINNED ROW IS OUTSIDE THE DISPLAY AMOUNT (FR-018 と FR-098, both
  // MUST NOT), 利用者の裁定 2026-08-30 「拡大、縮小しても表示を続けるのがピン止め
  // だ」. ⛔ It is NOT outside HR-1a or HR-6: `drawnGroups` above has already
  // dropped a row under a folded or hidden one, and FR-098 (MUST) names those
  // two as the only reasons a pinned row is not drawn.
  // ⭐ The monotone direction survives the exemption, which FR-018 argues: the
  // exempt set does not follow the zoom and `S-127` caps it, so what is drawn
  // stays 「一定の集合と、縮む集合の和」.
  const pinnedIds = new Set(settings.pinnedGroupIds)
  const rows = drawnGroups(schedule, settings, isLevelZeroFolded === true).filter(
    (glyph) => glyph.depth <= depthLimit || pinnedIds.has(glyph.id),
  )

  // Four indexes, built once, before the row loop opens. Scanning
  // taskGroupMembers per row and taskVisuals per Task made the whole layout
  // O(n^2) in the task count -- NFR-013 forbids that outright ("`O(n²)` の算法を
  // 用いてはならない（MUST NOT）", naming レイアウトの算出 first), and MN-6 of
  // Chapter 5.6 runs the whole of table T-068 once at the head of every frame.
  const taskByUid = new Map(schedule.tasks.map((text) => [text.uid, text]))
  const visualByUid = new Map(schedule.taskVisuals.map((value) => [value.taskUid, value]))
  const membersByGroup = new Map<string, TaskGroupMember[]>()
  for (const member of schedule.taskGroupMembers) {
    // Insertion order is kept, so the order inside a group is what the source
    // array had -- LC-8/ST-2's sort below still decides what the order means.
    const groupMembers = membersByGroup.get(member.groupId)
    if (groupMembers === undefined) membersByGroup.set(member.groupId, [member])
    else groupMembers.push(member)
  }
  // The fourth: FR-059's roster walk, done once for the whole schedule rather
  // than once per Task. Asking each Task for its own assignments would scan
  // `assignments` per Task, which is the O(n²) NFR-013 forbids and which the
  // three indexes above exist to avoid.
  const assigneeLabels = assigneeLabelsOf(schedule)

  // FR-054: one calendar for the whole document, resolved once.
  const within = workingCalendarOf(schedule)
  // ⛔ MADE HERE AND NOWHERE ELSE, so that it lives and dies with this one call.
  // Its own declaration carries the measurement and the limit.
  const reader = dayReaderFor(within)
  const placements: TaskPlacement[] = []
  const rowPlacements: RowPlacement[] = []

  // The bands are measured from the top of the Row Area and the whole stack is
  // slid at the end, because a band's height is only known once its lanes are:
  // the row S-78 names cannot be put at the top before the rows above it have
  // been measured.
  let y = regions.rowArea.y
  // Both sentinels are replaced together by the first placement, so the one
  // test at the end settles "nothing was placed at all". Seeding `widest` at 0
  // instead measured from the leftmost occupied edge all the way to x = 0
  // whenever every drawn Task sat left of the origin -- which S-77 reaches as
  // soon as scrollDate is later than the content -- and FR-055 then fitted to
  // a width several times the real one.
  let widest = Number.NEGATIVE_INFINITY
  let leftmost = Number.POSITIVE_INFINITY
  const emptyLane = reservedHeight('rectangle', settings)
  // ST-7's valve. Stays null for every run that never reaches it, which is what
  // `ScheduleLayout.stackSafetyCapReached` publishes as "no row did".
  let capStop: StackSafetyCapStop | null = null

  for (const row of rows) {
    // ---- LC-2, the task half: CR-163 measures the shape, not the depth -----
    // The kind, the span and the drawn width are resolved ONCE per Task here.
    // S-86's filter and the measuring below both want all three, and asking
    // twice doubles the work NFR-013 caps.
    const drawnTasks = (membersByGroup.get(row.id) ?? [])
      .map((match) => taskByUid.get(match.taskUid))
      .filter((text): text is Task => text !== undefined)
      .map((task) => {
        const kind = shapeKindOf(visualByUid, task)
        const span = spanWidthOf(task, pxPerDay, reader)
        const glyph = milestoneGlyphOf(visualByUid, task)
        // ⭐ ASKED HERE FOR THE REASON THE THREE ABOVE ARE: this is the one
        // place per Task that holds the dates and the reader together, and the
        // fact leaves with the placement so the hit test never re-reads a date.
        const oneDay = planEndsStandOnOneDay(task, reader)
        return { task, kind, glyph, span, oneDay, width: shapeWidthOf(span, kind, settings) }
      })
      .filter(({ kind, span, width }) => keptByLevelOfDetail(kind, span, width, settings))
      // ---- LC-8, ST-2: start ascending, finish descending, uid ascending ---
      .sort(
        (a, b) =>
          (a.task.start ?? '').localeCompare(b.task.start ?? '') ||
          (b.task.finish ?? '').localeCompare(a.task.finish ?? '') ||
          a.task.uid - b.task.uid,
      )

    const lanes: { x0: number; x1: number }[][] = []
    // Two running summaries per lane, so ST-3's search does not have to walk
    // every interval already placed. A row of m Tasks that do not overlap --
    // the ordinary case, every one of them landing on lane 0 -- cost
    // 1 + 2 + ... + (m-1) comparisons without them, which is the O(n^2)
    // NFR-013 forbids, and stacking is what PG-8 measures.
    const laneMaxX1: number[] = []
    const laneMinX0: number[] = []
    const laneOf: number[] = []
    const measured = drawnTasks.map(({ task, kind, glyph, oneDay, width }) => {
      const from = reader.day(task.start)
      const foundAt = from === null ? originX : xOnTimeAxis(originSerial, pxPerDay, originX, from)
      // LF-10 centres a milestone's figure on its day; every other shape
      // starts at it.
      const x = kind === 'milestone' ? foundAt - width / 2 : foundAt
      // ---- LC-4, LC-5, LC-6: cut, estimate, then table T-013 -------------
      const label = truncate(task.name ?? '', settings.truncateUnits)
      const font = labelFontSize(kind, settings)
      const text = labelWidth(label, font, settings)
      // ---- LC-6, table T-013: the fade is not room the label may take -----
      // ⛔ THE WIDTH IS THE SHAPE'S LESS BOTH FADES, which that table now says
      // in as many words: a fade is the one mark that says the dates are not
      // settled (table T-012a), and a name written over it makes the mark
      // unreadable. ⚠️ Clamped first (FD-6 / FD-6b) -- the raw days can exceed
      // the span, and subtracting those would make the room negative.
      const fade = clampedFade(task, kind, width, pxPerDay)
      const roomInside = Math.max(0, width - fade.fadeIn - fade.fadeOut)
      const placement: LabelPlacement = text <= roomInside ? 'inside' : 'right'
      const actual = actualSpanOf(task, reader, originSerial, pxPerDay, originX)
      // ---- table T-038's order: what the name label has to clear ----------
      // The order is OC-2, then FR-043's bar and dummy, then OC-3, then OC-1
      // (MUST), and the four may not overlap (MUST NOT).
      // ⛔ THE RESUME ICON IS NOT ONE OF THE FOUR (FR-043, MUST NOT): its place
      // is fixed by table T-221's LF-11, the resume day (MUST), not by this
      // order. ⭐ Its room is still held
      // clear in the order below (`markRoomOf`) -- the paragraph after the
      // order requires that even though nothing is drawn in it.
      // ⭐ The marker does not hang off the plan bar: `markerAnchorX` in
      // ScheduleGeometry reads the ACTUAL bar's far end, or -- while nothing is
      // started -- GR-17's dummy. So the label has to clear whichever of the
      // three reaches furthest, or the two MUST NOTs are broken exactly in the
      // state a fresh Task is in.
      // ⚠️ THE MAXIMUM IS TAKEN UNCONDITIONALLY, so this stays at or right of
      // the anchor the geometry picks under any `planActualDisplay`: that side
      // narrows the anchor (the plan alone, a milestone's figure), never widens
      // it, and a label further out than it needs to be still overlaps nothing.
      const actualReach = actual === null ? null : actualReachOf(kind, actual, settings)
      // FR-043 draws its pair only where there is no actual at all, which is
      // the same test `dummiesOf` opens with -- so the two reaches are never
      // both a number, and `null` here reads as "no dummy was drawn".
      const dummyReach =
        actualReach !== null
          ? null
          : finiteOrNull(
              dummyReachOf(task, kind, reader, originSerial, pxPerDay, originX, settings),
            )
      const outwardX = Math.max(x + width, actualReach ?? dummyReach ?? Number.NEGATIVE_INFINITY)
      // ---- LC-7: OC-1 is the label the shape could not hold --------------
      // ⛔ MEASURED FROM `outwardX`, NOT FROM THE SHAPE, and the room for the
      // two marks is held clear whether or not they are drawn (`markRoomOf`).
      // `labelGap` (S-32) is 「形状の外へ出すラベル用」 and separates the label
      // from the room, the way it used to separate it from the shape.
      const labelX = outwardX + markRoomOf(settings) + settings.labelGap
      // ⭐ 「算入するのは、形状の右端から名称ラベルの右端までとすること（MUST）」
      // -- the held-clear room falls INSIDE that reach, and its width is a
      // constant, so S-63 still moves nothing.
      const labelledX1 = placement === 'right' ? labelX + text : x + width
      // ---- LC-7: OC-5 is the actual bar reaching outside the plan --------
      // ⛔ Not conditioned on `planActualDisplay`: OC-2 is the row that spells
      // out "count it only while it is shown", and OC-3 / OC-4 give the reason
      // for the silence on the other rows -- a Task must not move when a
      // display toggle is flipped.
      const spread = actual !== null && actualPlacementOf(kind) === 'inside' ? actual : null
      // ---- LC-7: OC-2 is the pair of labels that jut out to the LEFT -------
      // ⭐ THIS ROW IS THE ONE THAT COUNTS THEM ONLY WHILE SHOWN (MUST / MUST
      // NOT), so S-60 and
      // S-61 are read HERE and the width is nothing at all while they are off.
      // ⚠️ AS-2 makes the empty Task a label too -- a `-` is drawn and is
      // therefore counted, which FR-059's RATIONALE states in as many words.
      const assigneeLabel = settings.assigneeVisible
        ? (assigneeLabels.get(task.uid) ?? NO_ASSIGNEE_MARK)
        : ''
      const percentLabel = settings.percentCompleteVisible ? percentLabelOf(task) : ''
      // ⭐⭐ ONE CARD, SO ONE WIDTH (FR-090, MUST): one card is counted as one
      // card's width, which is why one gap is added below and not two.
      const outsideLabel = outsideLabelOf(assigneeLabel, percentLabel)
      const outsideLabelWidth = labelWidth(outsideLabel, font, settings)
      // ⚠️ THE GAP IS S-32 AND NOT A NEW VALUE: that row is the gap for a label
      // put outside the shape, and FR-090 (MUST) sets the card off the plan
      // bar's left edge by it -- one gap, because there is one card.
      const outsideWidth = outsideLabel === '' ? 0 : settings.labelGap + outsideLabelWidth
      const labelledX0 = x - outsideWidth
      const occupiedX0 = spread === null ? labelledX0 : Math.min(labelledX0, spread.x)
      const occupiedX1 =
        spread === null ? labelledX1 : Math.max(labelledX1, spread.x + spread.width)
      return { task, kind, glyph, oneDay, x, width, label, font, placement, actual, labelX,
               actualReach, dummyReach, fade, outsideLabel, outsideLabelWidth,
               occupiedX0, occupiedX1 }
    })

    for (const item of measured) {
      // ---- LC-8, ST-3: the shallowest lane it does not overlap ------------
      // ST-10 keeps the interval half-open, so touching ends do not collide.
      let lane = -1
      for (let step = 0; step < lanes.length; step++) {
        // The two summaries answer without a scan whenever the item clears the
        // whole lane on one side. ST-2 sorts by start ascending, so occupiedX0
        // is non-decreasing for every shape but a milestone (LF-10 shifts its x
        // left by half the figure) and the first test settles nearly every
        // item. Neither is a new rule -- the exact scan below still decides
        // when they do not hold, so the answer is what it always was.
        if (item.occupiedX0 >= laneMaxX1[step]! || item.occupiedX1 <= laneMinX0[step]!) {
          lane = step
          break
        }
        if (lanes[step]!.every((quoted) => item.occupiedX1 <= quoted.x0 || item.occupiedX0 >= quoted.x1)) {
          lane = step
          break
        }
      }
      if (lane < 0) {
        // ---- ST-7: the safety valve, and it STOPS rather than throwing ------
        // ⭐⭐ ST-7 (MUST) has this stop with a value the caller can tell apart
        // from success, and (MUST NOT) forbids throwing one. ⛔ THE STOP IS
        // TAKEN BEFORE THIS ROW IS PLACED, which is what 「そこで」 asks for: the
        // row's `placements` and its `RowPlacement` are pushed further down, so
        // breaking here leaves the offending row -- and every row after it --
        // out of the picture rather than half in it. ⛔ A partial row would
        // leave `laneOf` short of `measured`, and the lane heights below index
        // it position by position.
        // ⚠️ THIS IS NOT 「黙って切り捨て」 (MUST NOT): the truncation is what
        // 「処理を止め」 means, and `stackSafetyCapReached` is the value that
        // keeps it from being silent -- the shell raises `RS-24` off it.
        // ⛔ AND NOTHING IS 「重ねて押し込」まれた (MUST NOT): the item that found
        // no lane is not pushed into one that is already taken. It is simply
        // not drawn, along with the rest of its row.
        // @provisional PD-430 -- `S-89` is the LARGEST NUMBER OF STACKS ALLOWED,
        // so the test is made before a further lane is opened: `stackSafetyCap`
        // lanes stand and the one that would exceed it is refused.
        if (lanes.length >= settings.stackSafetyCap) {
          capStop = { groupId: row.id, cap: settings.stackSafetyCap }
          break
        }
        lane = lanes.length
        lanes.push([])
        laneMaxX1.push(Number.NEGATIVE_INFINITY)
        laneMinX0.push(Number.POSITIVE_INFINITY)
      }
      lanes[lane]!.push({ x0: item.occupiedX0, x1: item.occupiedX1 })
      laneMaxX1[lane] = Math.max(laneMaxX1[lane]!, item.occupiedX1)
      laneMinX0[lane] = Math.min(laneMinX0[lane]!, item.occupiedX0)
      laneOf.push(lane)
    }
    // ST-7 again: the inner loop can only leave early for the valve, and the
    // whole pass stops with it. ⛔ Two breaks and not a labelled one -- nothing
    // else in this file uses a label, and the flag is the value that leaves the
    // function anyway.
    if (capStop !== null) break

    // ---- LC-9, LF-2: each lane is its tallest, gaps go between them -------
    // One pass over `measured`. Re-filtering it per lane cost O(lanes x m), and
    // lanes == m exactly when the Tasks overlap -- which is when stacking
    // matters at all -- so it was the O(n^2) NFR-013 forbids. The spread of
    // Math.max went with it: a lane holding tens of thousands of Tasks passed
    // that many arguments and threw RangeError rather than answering.
    const laneHeights = lanes.map(() => 0)
    measured.forEach((item, index) => {
      const reserved = reservedHeight(item.kind, settings)
      const lane = laneOf[index]!
      if (reserved > laneHeights[lane]!) laneHeights[lane] = reserved
    })
    // LF-2's empty-lane arm. ⚠️ A lane is only ever created because a Task
    // needed one, so this cannot fire today -- it is kept because LF-2 states
    // the rule, not because the loop above can leave a lane at zero.
    for (let step = 0; step < laneHeights.length; step++) {
      if (laneHeights[step] === 0) laneHeights[step] = emptyLane
    }
    const stacked = laneHeights.reduce((sum, h) => sum + h + settings.stackGap, 0)
    const packed = Math.max(0, stacked - settings.stackGap)
    // FR-042 reads a stated height as a floor, never as a cap.
    // ⭐⭐ AND LF-3 CARRIES A SECOND FLOOR (MUST): the band is never shorter
    // than a rectangle, and never shorter than HF-1's lattice of row controls.
    // ⛔ Without it the lattice's lower rank stands on the NEXT row's band and
    // takes that row's presses -- HF-19 (MUST NOT) states the consequence.
    // ⛔ THE BAND GIVES WAY AND NEVER THE LATTICE (HF-19, MUST NOT), because
    // HF-5 (MUST) draws every control the same size whatever the row name is.
    // ⭐ The floor is this unit's own (CR-342); a measured lattice only RAISES it.
    const latticeFloor = Math.max(rowControlLatticeFloorPx(), rowControlsHeightPx ?? 0)
    const height = Math.max(packed, emptyLane, row.height ?? 0, latticeFloor)

    // ---- LC-9, ST-5: stackDirection (S-58) picks which end lane 0 sits at --
    // ⚠️ ST-5 settles that the direction is one choice for the whole document
    // and that S-58 defaults it to 'up'; it does NOT spell out which end of the
    // band the shallowest lane lands on. The reading taken here is the one the
    // previous project settled and the specification has not contradicted:
    // 'down' puts lane 0 at the TOP of the band and stacks downward, 'up' puts
    // it at the BOTTOM and stacks upward. ST-2 and ST-3 are untouched -- the
    // lane a Task is given is the same either way, and only the y it is drawn
    // at is reversed, which is why no rule of table T-014 has to be re-read.
    // ⚠️ The block stays anchored to the top of the band. When FR-042's stated
    // height makes the band taller than the lanes need, nothing in docs/spec
    // says whether the slack belongs above or below the stack.
    const upward = settings.stackDirection === 'up'
    const tops = new Array<number>(laneHeights.length)
    let laneTop = y
    for (let slot = 0; slot < laneHeights.length; slot++) {
      const lane = upward ? laneHeights.length - 1 - slot : slot
      tops[lane] = laneTop
      laneTop += laneHeights[lane]! + settings.stackGap
    }

    measured.forEach((item, index) => {
      const lane = laneOf[index]!
      placements.push({
        taskUid: item.task.uid,
        groupId: row.id,
        shapeKind: item.kind,
        milestoneGlyph: item.glyph,
        stack: lane,
        x: item.x,
        width: item.width,
        planEndsStandOnOneDay: item.oneDay,
        fadeInPx: item.fade.fadeIn,
        fadeOutPx: item.fade.fadeOut,
        y: tops[lane]!,
        height: reservedHeight(item.kind, settings),
        planHeight: planHeightOf(item.kind, settings),
        actualPlacement: actualPlacementOf(item.kind),
        actualX: item.actual === null ? null : item.actual.x,
        actualWidth: item.actual === null ? 0 : item.actual.width,
        actualReach: item.actualReach,
        dummyReach: item.dummyReach,
        labelPlacement: item.placement,
        labelX: item.labelX,
        label: item.label,
        // LC-5 measured the label with this size; it leaves with the placement
        // so nothing downstream writes FR-077's formula a second time.
        labelFontSize: item.font,
        // OC-2's pair, settled with the width LC-7 counted them by.
        outsideLabel: item.outsideLabel,
        outsideLabelWidth: item.outsideLabelWidth,
        occupiedX0: item.occupiedX0,
        occupiedX1: item.occupiedX1,
      })
      widest = Math.max(widest, item.occupiedX1)
      leftmost = Math.min(leftmost, item.occupiedX0)
    })

    rowPlacements.push({
      groupId: row.id,
      depth: row.depth,
      y,
      height,
      stackCount: lanes.length,
      // LF-2 gives a row with no lane one rectangle's band, so LF-12 still has
      // one height to pass the progress line through.
      stackTops: tops.length === 0 ? [y] : tops,
    })
    // ---- LC-9, LF-3 ------------------------------------------------------
    y += height + settings.rowGap
  }

  // ---- FR-098 with LF-14: lift the pinned rows out of the chain ------------
  const band = pinnedBandOf(rowPlacements, settings, regions)
  const lifted = liftedRows(rowPlacements, band)
  const shifted = shiftedPlacements(placements, band.shiftByGroupId, band.droppedPinnedIds)

  // ---- S-78 with S-176: put the place the display points at at the top -----
  // ⛔ OVER THE SCROLLING ROWS AND FROM THE REMAINDER'S TOP EDGE. FR-098 (MUST)
  // makes S-78 and S-176 point at 「スクロールする残りの領域の上端」 and (MUST
  // NOT) forbids the band's own top -- 「帯は流れないので、そこを指すと表示位置
  // が二度と動かない」.
  const scrollingRows = lifted.filter((row) => row.isPinned !== true)
  const scrollOffsetY = scrollOffsetOf(scrollingRows, settings, band.scrollAreaY)
  // ⚠️ Measured before the slide: FR-055 fits to the extent of the content,
  // which does not change when the content is scrolled.
  // ⛔ THE SCROLLING ROWS ALONE, because LF-14 gives them 「`Row Area` の高さから
  // 帯の高さと `rowGap` 1 つぶんを引いた残り」 and FR-055 fits to that remainder
  // -- fitting the band in as well would measure a height against a box the
  // band is not in.
  const contentHeight = Math.max(0, band.scrollingContentHeight)
  const nothingPlaced = leftmost === Number.POSITIVE_INFINITY
  const contentWidth = nothingPlaced ? 0 : Math.max(0, widest - leftmost)
  const contentX0 = nothingPlaced ? null : leftmost

  return {
    pxPerDay,
    tier: rulerTierOf(pxPerDay, settings),
    originDay,
    originX,
    rectangleHeight: planHeightOf('rectangle', settings),
    rows: scrolledRows(lifted, scrollOffsetY),
    placements: scrolledPlacements(shifted, scrollOffsetY, band.pinnedIdsPlaced),
    contentWidth,
    contentHeight,
    contentX0,
    pinnedBandHeight: band.height,
    scrollAreaY: band.scrollAreaY,
    // ST-7 (MUST): 「達したことを判別できる値で返して」. ⚠️ The rest of this
    // object measures what was laid out BEFORE the valve whenever this is not
    // null -- see the member's own note.
    stackSafetyCapReached: capStop,
  }
}

/**
 * LF-14 of table T-221 and FR-098's first paragraph: where each row stands once
 * the pinned ones have been lifted out of LF-3's chain.
 *
 * ⭐⭐ WHY THE WHOLE OF FR-098 IS ANSWERED HERE AND NOT IN THE RENDERERS. The
 * requirement asks for 「行見出しの側と日程の側の両方を、同時に同じ高さへ上げる
 * こと（MUST）」 and forbids raising one alone (MUST NOT). Both sides read this
 * one layout -- `svg-renderer.ts` draws a band per `RowPlacement` and the shell
 * cuts the `Row Title Panel`'s boxes from the same array -- so a row moved HERE
 * is moved on both sides by construction, and neither side needs to know that
 * pinning exists. ⛔ A rule written in each renderer instead would be the same
 * rule in two places, and either could move without the other.
 *
 * ⭐ THE ORDER IS `pinnedGroupIds`' (S-126), which is the order the rows were
 * fixed in: FR-098 (MUST NOT) forbids ranking one pinned row above another and
 * lines them up from the top in that order. ⛔ NOT THE DOCUMENT'S ORDER, which
 * is what `rowPlacements` arrives in.
 *
 * ⚠️ 「帯へ上げた行は `LF-3` の連なりから除き、抜けた場所は詰める」 -- so the
 * scrolling rows are re-chained over the gap a lifted row leaves, and the whole
 * remainder then begins one `rowGap` below the band.
 *
 * ⭐⭐ WHAT HAPPENS WHEN THE PINS DO NOT FIT (利用者の裁定 2026-09-06, CR-363).
 * FR-098 (MUST) refuses to draw a pinned row that does not fit, and (MUST
 * NOT) forbids scrolling the band vertically to make room -- so the
 * band stops at the `Row Area`'s bottom edge and a pin that does not fit inside
 * it is dropped from the picture. ⛔ THE PERSON RECOVERS BY UNPINNING and is
 * told nothing: 「通知は出さない（同裁定）—— 表 T-233 に行を足さない」.
 *
 * ⭐ 「入りきらない」 IS READ AS "does not fit ENTIRELY". -きる is the completive,
 * so a row whose band would fall PARTLY below the area's bottom edge has not
 * 「入りきった」 and is not drawn. ⚠️ No other sentence of FR-098 settles the
 * boundary; this reading is the sentence's own verb and nothing was invented
 * around it. ⭐ THE GAP BELOW A ROW IS NOT PART OF THAT ROW: the test is on the
 * row's own band, because 「行」 is what the sentence drops and `rowGap` stands
 * BETWEEN two rows.
 *
 * ⭐ THE FIRST PIN THAT DOES NOT FIT ENDS THE BAND, and every pin after it is
 * dropped with it -- including a short one that would have fitted in the space
 * the tall one could not use. ⛔ Fitting that one instead would rank it above
 * the row it stepped over, and FR-098 (MUST NOT) forbids exactly that: 「ピン止め
 * した行どうしに優劣を設けてはならない（MUST NOT）—— 固定した順に上から並べる」.
 *
 * ⚠️ A DROPPED PIN DOES NOT FALL BACK INTO THE SCROLLING CHAIN. FR-098 (MUST)
 * takes a pinned row 「スクロールする領域から抜いて」 and the new sentence says the
 * one that does not fit is not drawn -- putting it back at its natural place
 * would be drawing it, and would draw it where the band already stands.
 *
 * ⛔ STOP -- ONE OF FR-098's RULES IS STILL NOT ANSWERED HERE. The band may not
 * fill the `Row Area` and leave no scrolling row drawable (MUST NOT), and that
 * has no remedy anywhere in docs/spec: `S-127` caps the COUNT at five and no row
 * says how much of the area a band has to leave behind. Cutting at the bottom
 * edge narrows the breach but does not close it -- a band whose last row ends
 * within one `rowGap` of that edge still leaves a remainder of zero or less.
 * ⛔ A height to reserve is NOT invented here; it would be a number the
 * specification does not hold.
 *
 * ⛔ ONE MORE SENTENCE OF FR-098 NOW CONTRADICTS THE RULING AND IS NOT OBEYED
 * HERE. That sentence (MUST) limits a pinned row's absence to two causes --
 * folded under `HR-1a` or hidden under `HR-6` -- and (MUST NOT) forbids any
 * other reason; 「入りきらない」 is a
 * third reason. ⭐ The 2026-09-06 ruling is the later and the more specific of
 * the two, and CR-363 exists to overturn a MUST, so it is what is built. ⚠️ The
 * older sentence is a manuscript defect to be reported, not one to be settled
 * by whichever rule the code happens to reach first.
 *
 * @purity pure
 */
function pinnedBandOf(
  rowPlacements: readonly RowPlacement[],
  settings: DocumentSettings,
  regions: ScreenRegions,
): {
  readonly height: number
  readonly scrollAreaY: number
  readonly scrollingContentHeight: number
  readonly pinnedIdsPlaced: ReadonlySet<string>
  /**
   * The pins that named a placed row and STILL are not drawn, because the band
   * would have carried them past the `Row Area`'s bottom edge (FR-098, MUST).
   * ⛔ Disjoint from `pinnedIdsPlaced`: a row is in the band or it is gone.
   */
  readonly droppedPinnedIds: ReadonlySet<string>
  readonly shiftByGroupId: ReadonlyMap<string, number>
} {
  const placedById = new Map(rowPlacements.map((row) => [row.groupId, row] as const))
  // S-126's order, and only the rows this pass actually placed: a pin on a row
  // HR-1a or HR-6 keeps out of the picture lifts nothing, which is the one
  // exception FR-098 (MUST) allows.
  const banded: RowPlacement[] = []
  const seen = new Set<string>()
  for (const groupId of settings.pinnedGroupIds) {
    if (seen.has(groupId)) continue
    const row = placedById.get(groupId)
    if (row === undefined) continue
    seen.add(groupId)
    banded.push(row)
  }

  const shiftByGroupId = new Map<string, number>()
  const inBand = new Set<string>()
  const dropped = new Set<string>()
  // The band, stacked from the very top of the `Row Area` -- FR-098 (MUST)
  // names U-50's top edge and (MUST NOT) forbids reaching above the Time Ruler.
  // ⭐ AND BOUNDED BY THAT SAME AREA'S BOTTOM EDGE, 利用者の裁定 2026-09-06:
  // 「入りきらない行を描かないこと（MUST）」. The doc comment above says what
  // 「入りきらない」 is read to mean and why the whole tail goes with the first
  // row that fails.
  const rowAreaBottom = regions.rowArea.y + regions.rowArea.height
  let bandY = regions.rowArea.y
  for (const row of banded) {
    // ⛔ ONCE ONE ROW IS OUT, EVERY LATER PIN IS OUT. Reading the test as a
    // filter -- skipping the tall row and admitting the next short one --
    // would put that short one above a row fixed before it, which FR-098
    // (MUST NOT) forbids -- pinned rows line up in the order they were fixed.
    if (dropped.size > 0 || bandY + row.height > rowAreaBottom) {
      dropped.add(row.groupId)
      continue
    }
    shiftByGroupId.set(row.groupId, bandY - row.y)
    inBand.add(row.groupId)
    bandY += row.height + settings.rowGap
  }
  const height = Math.max(0, bandY - regions.rowArea.y - settings.rowGap)
  // One `rowGap` between the band and the remainder, which is the length LF-14
  // subtracts alongside the band's own height.
  // ⚠️ `inBand` AND NOT `banded`: when every pin was dropped there is no band,
  // so the remainder starts at the area's own top edge and takes no gap -- the
  // same picture as a document with no pin at all, which the screen shows.
  const scrollAreaY = regions.rowArea.y + (inBand.size === 0 ? 0 : height + settings.rowGap)

  let scrollY = scrollAreaY
  for (const row of rowPlacements) {
    // ⛔ `seen` AND NOT `inBand`: a dropped pin does not come back as a
    // scrolling row. FR-098 (MUST) has already taken it 「スクロールする領域から
    // 抜いて」, and the 2026-09-06 ruling says it is not drawn at all.
    if (seen.has(row.groupId)) continue
    shiftByGroupId.set(row.groupId, scrollY - row.y)
    scrollY += row.height + settings.rowGap
  }
  const scrollingContentHeight = Math.max(0, scrollY - scrollAreaY - settings.rowGap)

  // ⚠️ `seen` AND NOT THE SETTING'S OWN SET is what the two sets below are cut
  // from: a pin naming a row this pass did not place lifts nothing, so the rows
  // that actually reached the band are the ones every reader below is told
  // about -- and the ones the bottom edge turned away are named separately, so
  // that a reader can stop drawing them without re-deriving the arithmetic.
  return {
    height,
    scrollAreaY,
    scrollingContentHeight,
    pinnedIdsPlaced: inBand,
    droppedPinnedIds: dropped,
    shiftByGroupId,
  }
}

/**
 * The rows at the heights `pinnedBandOf` settled, each saying which side of the
 * boundary it ended on -- and WITHOUT the pins the band's bottom edge turned
 * away, which FR-098 (MUST) does not draw: 「入りきらない行を描かないこと」
 * (利用者の裁定 2026-09-06).
 *
 * ⛔ DROPPED AND NOT MERELY MARKED. Every reader of `ScheduleLayout.rows` draws
 * what it is handed -- `svg-renderer.ts` a band per row, the shell a box per
 * row in the `Row Title Panel` -- so a row left in the array with a flag on it
 * would have to be re-judged in each of them, and either could forget. ⭐ It is
 * the same construction the requirement's 「両方を、同時に同じ高さへ上げること
 * （MUST）」 already rests on: one array, both sides.
 *
 * @purity pure
 */
function liftedRows(
  rowPlacements: readonly RowPlacement[],
  band: {
    readonly pinnedIdsPlaced: ReadonlySet<string>
    readonly droppedPinnedIds: ReadonlySet<string>
    readonly shiftByGroupId: ReadonlyMap<string, number>
  },
): readonly RowPlacement[] {
  const kept = rowPlacements.filter((row) => !band.droppedPinnedIds.has(row.groupId))
  return kept.map((row) => {
    const shift = band.shiftByGroupId.get(row.groupId) ?? 0
    const isPinned = band.pinnedIdsPlaced.has(row.groupId)
    if (shift === 0 && !isPinned) return row
    return {
      ...row,
      y: row.y + shift,
      stackTops: row.stackTops.map((top) => top + shift),
      isPinned,
    }
  })
}

/**
 * The `Task` figures moved with the rows they sit in -- FR-098's 「行見出しの側
 * と日程の側の両方を、同時に同じ高さへ上げること（MUST）」 read for the figures
 * a lifted row carries.
 *
 * ⛔ AND THE FIGURES OF A DROPPED PIN LEFT OUT ALTOGETHER. 「入りきらない行を
 * 描かないこと（MUST）」 is about the row, and FR-098 spells elsewhere how wide
 * 「その行のために描くもの」 reaches: 「行の地だけでなく、その行のバー・ラベル・
 * 進捗マーカー・依存線を含めて」. ⚠️ Cutting the row's ground alone and
 * leaving its bars puts another row's bars inside the pinned one, and here they
 * would float over the scrolling rows with no row of their own on screen.
 *
 * @purity pure
 */
function shiftedPlacements(
  placements: readonly TaskPlacement[],
  shiftByGroupId: ReadonlyMap<string, number>,
  droppedPinnedIds: ReadonlySet<string>,
): readonly TaskPlacement[] {
  const kept = placements.filter((one) => !droppedPinnedIds.has(one.groupId))
  return kept.map((one) => {
    const shift = shiftByGroupId.get(one.groupId) ?? 0
    return shift === 0 ? one : { ...one, y: one.y + shift }
  })
}

/**
 * How far the whole stack has to slide so that the top edge of the Row Area
 * stands where S-78 and S-176 put it.
 *
 * ⭐ The vertical counterpart of S-77 and S-177, which `originX` above already
 * applies to the horizontal. Without it the wheel writes a new `scrollGroupId`
 * every turn and every turn draws the same rows.
 * ⭐ S-176 IS WHAT LETS THE PICTURE REST BETWEEN TWO ROWS. The anchor alone
 * can only name a band's top edge, so a movement shorter than the row standing
 * at the top edge had nowhere to be written and 表 T-023d's 「パンは等倍とす
 * ること（MUST）」 was out of reach. The fraction is of that row's OWN height
 * and never a px count -- FR-080 forbids px (MUST NOT) because a zoom or a
 * window width makes the same number point somewhere else.
 *
 * ⚠️ OP-10a of table T-024a: a fraction outside [0, 1) sends the anchor that
 * many rows along and comes back into range (MUST), and refusing it is
 * forbidden (MUST NOT) -- two spellings of one position would make NS-4's
 * round-trip comparison false. ⛔ The walk is NOT distance-preserving and is
 * not meant to be: rows differ in height, so 「その分だけ隣へ送る」 can only
 * mean the whole part of the fraction counted in rows. It is idempotent, so a
 * reader that normalised the value first and one that did not draw the same
 * picture.
 * ⚠️ 「送った先に行が無いとき」 falls to OP-10, which the shell answers by
 * handing FR-055's fit down in the settings; there is nothing left to do here,
 * so the walk simply stops at the end of the stack.
 *
 * ⚠️ FR-051 sends the READING side to OP-10 as well, and the shell answers its
 * two cases -- a null, and an id naming no `TaskGroup` -- the same way, so
 * neither is decided a second time here.
 * ⛔ An id naming a row this pass did NOT draw (FR-018 dropped it, or HR-1a
 * collapsed something above it) is neither of OP-10's cases and no rule covers
 * it. The stack then stays where it was measured rather than being slid to a
 * row that is not on screen.
 *
 * @purity pure
 */
function scrollOffsetOf(
  rows: readonly RowPlacement[],
  settings: DocumentSettings,
  rowAreaY: number,
): number {
  const anchoredAt = rows.findIndex((row) => row.groupId === settings.scrollGroupId)
  if (anchoredAt < 0) return 0
  const held = Number.isFinite(settings.scrollGroupOffset) ? settings.scrollGroupOffset : 0
  const carriedRows = Math.floor(held)
  const landedAt = Math.min(rows.length - 1, Math.max(0, anchoredAt + carriedRows))
  const row = rows[landedAt]
  if (row === undefined) return 0
  // ⭐⭐ THE SLAB AND NOT THE BAND. S-176 is a fraction of the length the row
  // OCCUPIES -- its band plus the gap below it -- because table T-023d forbids
  // a pan that can land only on rows (MUST NOT), and two bands do not touch.
  // ⛔ THE WRITING SIDE USES THE SAME LENGTH: `rowAnchorAt` in
  // `input-command-translator.ts` makes this pair out of a pixel, and the two
  // are one bijection. A denominator written differently in one of them would
  // draw the picture somewhere the other never named.
  // ⚠️ The last row's slab is its own band -- there is nothing below it to
  // reach to.
  const below = rows[landedAt + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  return row.y + (held - carriedRows) * slab - rowAreaY
}

/**
 * The rows, slid up by S-78's offset. One pass, and none at all when the
 * display sits at the top.
 *
 * @purity pure
 */
function scrolledRows(rows: readonly RowPlacement[], offsetY: number): readonly RowPlacement[] {
  if (offsetY === 0) return rows
  return rows.map((row) => {
    // ⛔ A PINNED ROW DOES NOT SLIDE (FR-098, MUST NOT): 「縦にスクロールしたこと
    // は理由にならない」, and the first paragraph pins it to the top outright.
    if (row.isPinned === true) return row
    return {
      ...row,
      y: row.y - offsetY,
      stackTops: row.stackTops.map((top) => top - offsetY),
    }
  })
}

/**
 * The placements, slid by the same offset as their rows -- and the figures of a
 * pinned row left where the band put them, for the reason `scrolledRows` gives.
 *
 * @purity pure
 */
function scrolledPlacements(
  placements: readonly TaskPlacement[],
  offsetY: number,
  pinnedIdsPlaced: ReadonlySet<string>,
): readonly TaskPlacement[] {
  if (offsetY === 0) return placements
  return placements.map((one) =>
    pinnedIdsPlaced.has(one.groupId) ? one : { ...one, y: one.y - offsetY },
  )
}

/** Where one Task ended up, or null when this zoom does not draw it. @purity pure */
export function taskPlacement(layout: ScheduleLayout, taskUid: number): TaskPlacement | null {
  return layout.placements.find((part) => part.taskUid === taskUid) ?? null
}

/**
 * What FR-055 chooses: two zooms and the two halves of a display position.
 *
 * ⭐ FOUR values and not two. OP-10 of table T-024a sends BOTH the zoom and the
 * position to FR-055 (MUST), so a caller that took only the zoom had to invent
 * the other half, and the harm FR-055's RATIONALE names -- the left overhang
 * disappearing behind the Row Title panel -- came straight back.
 *
 * ⚠️ The position is a day and a `TaskGroup.id` (S-77, S-78) because Chapter
 * 1.4 forbids holding a scroll position in px (MUST NOT): the same px means a
 * different place once the zoom or the screen width moves.
 *
 * ⭐ THE TWO FRACTIONS ARE NOT MEMBERS HERE BECAUSE THE FIT'S ANSWER FOR BOTH
 * IS ZERO. S-176 and S-177 say how far INTO the anchor row and the anchor day
 * the top left corner of the view stands, and this fit puts that corner on the
 * content's own corner: `scrollDate` below is the day the leftmost drawn px
 * falls in (`dateAtX` floors, so the content begins at that day's start or
 * later) and `scrollGroupId` is the top row itself. A constant is not worth a
 * member, so both CALLERS write the zero -- `fitCommand` for the press and
 * `viewSettings` for OP-10 of table T-024a -- and a fraction left standing
 * from the pan before cannot slide the fitted picture by up to one row and one
 * day.
 */
export interface FitToScreen {
  readonly zoomX: number
  readonly zoomY: number
  /** S-77. */
  readonly scrollDate: string | null
  /** S-78. A `TaskGroup.id`, never a row number. */
  readonly scrollGroupId: string | null
  /**
   * The zoom at which LF-3's floor is reached, handed out with the answer.
   *
   * ⭐ WHY THE FIT CARRIES IT. `zoomY` may land BELOW this number, and at or
   * below it nothing on the row axis moves -- `zoomYAtPlanHeightFloor` says
   * so. A caller that wants the zoom the picture is DRAWN at therefore wants
   * `Math.max(zoomY, floorZoomY)`, and only this unit knows the second term.
   * ⛔ Not a row of table T-064, for the reason this interface gives above.
   */
  readonly floorZoomY: number
}

/**
 * The three zoom values table T-206 keeps OUT of the document -- S-96, S-97 and
 * S-98, each of which states its value by naming a row of table T-201.
 *
 * ⭐ They arrive as an argument rather than being typed here, which is the
 * precedent `InputContext.zoomStep` already set: LY-5 of table T-060 leaves the
 * Framework as the only layer that may hold a current value, and a number
 * written in this file would be a second copy of the manuscript (rule 03).
 *
 * ⚠️ Not a row of table T-064. That table holds the NAMES a component
 * publishes and leaves arguments and return values to `src/`; this type exists
 * only to give `fitZoom` its signature, exactly as `FitToScreen` does.
 */
export interface NotStoredZoom {
  /** S-96, stated at S-53. One notch of the zoom controls. */
  readonly step: number
  /** S-97, stated at S-54. */
  readonly min: number
  /** S-98, stated at S-55. */
  readonly max: number
}

/**
 * The smallest zoomY that draws a given group depth and nothing deeper -- the
 * zoom FR-055 lands on once it has chosen the depth.
 *
 * ⛔ FR-055's MUST NOT is 「採った段を描ける最小の倍率より下へ下げてはならない」,
 * and `groupDepthThresholdOf` is that smallest zoom for every depth FR-018's
 * domain covers. Reading it back through `groupDepthLimit` answers the same
 * depth, because both sides go through the one expression.
 *
 * ⛔ DEPTH 1 IS OUTSIDE FR-018's DOMAIN, so it has no smallest zoom and the
 * MUST NOT is vacuous there. One S-53 notch below the depth-2 threshold is
 * taken instead: it is the largest zoom that draws depth 1 and nothing more,
 * which is what FR-055's 「無用に縦幅を増やすな」 reading asks, and it puts ONE
 * press of the vertical zoom-in control exactly on depth 2 rather than a hair
 * under it. ⛔ FR-055's RATIONALE does not say this; it is a choice.
 * @provisional PD-204
 *
 * @purity pure
 */
function landingZoomY(depth: number, settings: DocumentSettings, step: number): number {
  if (depth <= 1) return groupDepthThresholdOf(2, settings) / step
  return groupDepthThresholdOf(depth, settings)
}

/**
 * How deep the sweep below has to go: the deepest row this schedule draws at
 * all, never deeper than S-125.
 *
 * ⚠️ Capped because `groupDepthLimit` will never answer more than
 * `maxGroupDepth`, so a row below that is not drawable at any zoom and asking
 * for it would only make the sweep longer.
 *
 * @purity pure
 */
function deepestDrawnDepth(schedule: Schedule, settings: DocumentSettings): number {
  let deepest = 0
  // ⚠️ LEVEL 0's FOLD IS NOT ASKED ABOUT HERE. This member serves FR-055's
  // fit, and HF-8 of table T-051 (MUST) has the fit throw the person's folds
  // away -- so the depths it sweeps are the document's, not the picture's.
  for (const row of drawnGroups(schedule, settings, false)) {
    if (row.depth > deepest) deepest = row.depth
  }
  return Math.min(deepest, settings.maxGroupDepth)
}

/** FR-016's range, applied to one measured zoom. @purity pure */
function clampedZoom(value: number, zoom: NotStoredZoom): number {
  return Math.min(zoom.max, Math.max(zoom.min, value))
}

/**
 * FR-055's fit: the two zooms and the two halves of a display position.
 *
 * ⭐ IT TAKES THE `Schedule` AND RUNS ITS OWN LAYOUTS. While it was handed one
 * finished `ScheduleLayout` it could only answer the zoom that layout was laid
 * out at times a ratio -- and below FR-094's floor the drawn height does not
 * depend on zoomY at all, so that ratio was a constant and pressing fit walked
 * the zoom down by the same factor every time while the picture never lost a
 * pixel of height. What it DID lose was rows, because `groupDepthLimit` reads
 * the same collapsing zoom. That is the mechanism FR-055's MUST NOT forbids.
 *
 * ⭐ NOTHING BELOW READS THE ZOOM IN FORCE. Every input is the schedule, the
 * regions, or a setting this function does not itself write, so the answer is a
 * constant function of the state it does not touch: asking twice returns the
 * same four values exactly, which is the idempotence FR-018 leans on when it
 * excludes IC-10 from the press-and-hold repeat.
 *
 * ⭐ The vertical CHOOSES A DEPTH, following FR-055's 「表示量（グループ LOD の
 * 深さ）を選んで合わせること（MUST）」 and the two passes printed after table
 * T-068:
 *   (a) one run at unity settles the horizontal;
 *   (b) pass 1 runs every depth the document has at the floor zoom and takes
 *       the deepest whose drawn height fits the Row Area, or depth 1;
 *   (c) the vertical lands on the smallest zoom that draws that depth;
 *   (d) pass 2 runs only when that zoom is above the floor -- which is the only
 *       case where the picture can still grow -- and retreats one depth if it
 *       does not fit. ⛔ No third pass (MUST NOT).
 *
 * ⚠️ THE HORIZONTAL IS MEASURED AT UNITY AND NOT AT THE STORED zoomX. The
 * vertical answer rides on the horizontal -- S-86 thins the picture at a low
 * zoomX and wide spans stop overlapping at a high one, so the lane count, and
 * with it the drawn height, moves with zoomX at a FIXED depth. Measuring at a
 * zoom the fit itself writes would make the answer a recurrence again. Unity is
 * also the conservative base: nothing is dropped by S-86 there, so the extent
 * fitted to is the fullest one. ⛔ No row names the base.
 * @provisional PD-203
 *
 * ⚠️ IT CLAMPS THE HORIZONTAL. FR-016 puts the range on the zoom operation and
 * CM-71 applies it, but a fit that measured the vertical at a zoomX the write
 * then clamped would draw a picture it never measured. ⛔ The vertical is not
 * clamped and must not be: every landing zoom lies strictly inside S-97 and
 * S-98, and moving one off its threshold would answer a different depth.
 * @provisional PD-205
 *
 * ⛔ Its MAY for a held position of null (fall back on the day this runs) is
 * NOT taken: reading a clock here would break `@purity pure`, and FR-055 warns
 * in the same breath that the run day must not reach the drawing.
 *
 * ⛔ A held `scrollGroupId` that names a row no pass DREW -- FR-018's level of
 * detail dropped it, or HR-1a collapsed it, or HR-6 hid it -- is NEITHER of
 * OP-10's two conditions (a null, and an id naming no `TaskGroup`) and no rule
 * anywhere covers it. Nothing is invented for it here: the id answered below is
 * one the chosen run drew, and the empty-document arm hands back what it was
 * given rather than deciding what such an id ought to become.
 *
 * @purity pure
 */
export function fitZoom(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoom: NotStoredZoom,
  rowControlsHeightPx?: number,
): FitToScreen {
  const floorZoomY = zoomYAtPlanHeightFloor(settings)
  const deepest = deepestDrawnDepth(schedule, settings)
  // ⛔ THE SAME FLOOR THE PICTURE WILL BE DRAWN WITH, and it is carried rather
  // than left out: the fit measures whether the picture fits against
  // these very runs, so a run without LF-3's row-control floor would measure
  // bands shorter than the ones the frame then draws and seat a depth that does
  // not fit.
  const runAt = (zoomX: number, zoomY: number, cap: number): ScheduleLayout =>
    layoutFromSchedule(
      schedule, { ...settings, zoomX, zoomY }, regions, cap, undefined, rowControlsHeightPx,
    )

  // ---- (a) the horizontal, measured once at unity --------------------------
  const atUnity = runAt(1, floorZoomY, deepest)
  // FR-055's empty-document arm (MUST). ⚠️ 「描くものが 1 つも無い」 is no ROW
  // at all: LF-2 gives a row holding no Task one rectangle's band, so an empty
  // row still has an extent and is fitted like any other.
  // ⛔⛔ AND A RUN THAT STOPPED IS NOT AN EMPTY DOCUMENT. ST-7's valve stops the
  // pass 「そこで」, so a document whose FIRST row reaches it comes back with no
  // row at all -- and answering that with the empty-document arm would tell the
  // person their document is empty. The run below carries on instead: nothing
  // was placed, so `contentWidth` is 0, `zoomX` is 1 by the arm just after this
  // one, no depth fits, and the fit lands on depth 1 with the held position
  // kept. ⭐ The picture the frame then draws carries the valve itself, and
  // `RS-24` is raised off THAT.
  if (atUnity.rows.length === 0 && atUnity.stackSafetyCapReached === null) {
    return {
      zoomX: 1,
      zoomY: 1,
      scrollDate: settings.scrollDate,
      scrollGroupId: settings.scrollGroupId,
      floorZoomY,
    }
  }
  // Rows but no drawn Task leaves nothing to divide by on this axis alone.
  const zoomX =
    atUnity.contentWidth <= 0
      ? 1
      : clampedZoom(regions.rowArea.width / atUnity.contentWidth, zoom)

  // ---- (b) pass 1: every depth the document has, at the floor zoom ---------
  // ⚠️ EVERY depth, not just down to the first that fits, because the retreat
  // in (d) needs the shallower one already measured and a run for it then
  // would be the third pass the rule after table T-068 forbids. The sweep is
  // capped at S-125, so it is at most that many runs of a table the frame
  // takes once -- NFR-013's growth is unchanged and this happens per press.
  const atFloor: ScheduleLayout[] = []
  for (let cap = 1; cap <= deepest; cap++) atFloor.push(runAt(zoomX, floorZoomY, cap))
  // ⭐ THE REMAINDER AND NOT THE WHOLE `Row Area` (FR-055, MUST): the deepest
  // tier is chosen against the area less the pinned band (`FR-098`),
  // and LF-14 makes that remainder the area's height less the band and
  // less one `rowGap`. ⚠️ Each run measures its OWN band, because a deeper cap
  // can put a taller row in it.
  const fits = (run: ScheduleLayout): boolean => {
    // ⛔⛔ A RUN THAT REACHED ST-7's VALVE DOES NOT FIT, WHATEVER IT MEASURED.
    // FR-055 takes the deepest tier whose picture fits the remainder,
    // and a run that stopped never laid that picture out: the row
    // that reached the valve and every row after it are missing, so its
    // `contentHeight` is short of the picture by an unknown amount and seating a
    // depth on it would fit the screen to a document nobody has measured.
    // ⚠️ DECIDED HERE BECAUSE THE THROW USED TO DECIDE IT. While the valve threw,
    // the exception left `fitZoom` altogether and the fit produced no answer at
    // all; something has to be answered now, and refusing the run is the
    // conservative half -- FR-055 falls back to depth 1, which is the shallowest
    // picture and the least likely to reach the valve again.
    // ⛔ NO ROW SAYS THIS, and no `PD-` number holds it yet -- the reading is
    // written out here so the next reader can refute it rather than guess it.
    if (run.stackSafetyCapReached !== null) return false
    const remainderTop = run.scrollAreaY ?? regions.rowArea.y
    return run.contentHeight <= regions.rowArea.y + regions.rowArea.height - remainderTop
  }
  // Deepest first, taking the first tier whose picture fits the `Row Area`.
  // Depth 1 when none of them does -- FR-055 leaves the vertical
  // scroll standing rather than shrinking further.
  let depth = 1
  for (let candidate = deepest; candidate >= 1; candidate--) {
    if (fits(atFloor[candidate - 1]!)) {
      depth = candidate
      break
    }
  }
  let chosen = atFloor[depth - 1]!

  // ---- (c) and (d) --------------------------------------------------------
  let zoomY = landingZoomY(depth, settings, zoom.step)
  if (zoomY > floorZoomY) {
    // Only the depths whose threshold sits above FR-094's floor reach here, and
    // only there can the picture still grow with the zoom -- which is why the
    // rule after table T-068 makes this pass conditional.
    const atLanding = runAt(zoomX, zoomY, depth)
    if (fits(atLanding) || depth === 1) {
      chosen = atLanding
    } else {
      depth -= 1
      zoomY = landingZoomY(depth, settings, zoom.step)
      // ⚠️ The position then comes off the retreated depth's FLOOR run, which
      // is the only measurement of that depth in hand -- the run that would
      // settle it exactly is the third pass the rule after table T-068 forbids.
      // ⭐ `scrollGroupId` is exact either way: the same depth cap draws the
      // same rows in the same order. ⛔ `scrollDate` can be a hair late, and
      // only ever by half a milestone figure: LC-6 never puts a label on the
      // LEFT, so the leftmost edge moves with zoomY solely through LF-10's
      // figure, which is half a plan height wide. ⛔ No row says which run
      // answers it.
      // @provisional PD-207
      chosen = atFloor[depth - 1]!
    }
  }

  // ---- (e) the position, off the run that was chosen -----------------------
  // The px that LC-7 folded, turned into S-77's day by PI-5's own converter so
  // the axis is read exactly once and x -> day cannot drift from day -> x.
  const leftDay = chosen.contentX0 === null ? null : dateAtX(chosen, chosen.contentX0)
  return {
    zoomX,
    zoomY,
    scrollDate: leftDay === null ? settings.scrollDate : textOfDay(leftDay),
    // LC-1 to LC-9 push the rows in the order they are drawn and the S-78 slide
    // moves them all together, so the first is the top one however far the stack
    // has been slid.
    // ⛔ THE FIRST SCROLLING ROW, NEVER A BANDED ONE. FR-098 (MUST) has S-78
    // point at the remainder's top edge and (MUST NOT) forbids the band's, and
    // a pinned row is not on the remainder at all.
    scrollGroupId:
      chosen.rows.find((row) => row.isPinned !== true)?.groupId ?? settings.scrollGroupId,
    floorZoomY,
  }
}

/**
 * Where the rows stand at a zoom nobody is drawing yet -- the member FR-016
 * (MUST) asks table T-064's `PI-5` for, and this is that member.
 *
 * ⭐⭐ WHY IT CANNOT BE ARITHMETIC IN THE CALLER, which is the whole reason the
 * name exists. The same requirement (MUST NOT): 「行の軸は `zoomY` に対して線形
 * ではない」 -- and forbids deriving the position from the ratio by arithmetic.
 * Four things move under a zoom and none of them is a scale factor -- FR-094's
 * floor holds the bands still below it, LF-3 puts a second floor under them,
 * table T-014's lanes decide how many bands are stacked, and FR-018 changes
 * WHICH rows are drawn at all. ⛔ An Adapter that multiplied a y by a ratio
 * would be inventing the answer, and 表 T-070の `MN-6` forbids it laying out
 * for itself besides.
 *
 * ⭐⭐ THE SECOND RUN IS WHAT TABLE T-068 NOW ALLOWS, and only here. The rule
 * printed after that table (MUST): 「どちらも `layoutEngine`（`CP-5`）の中でのみ
 * 走らせること（MUST）」 -- because LC-9, which settles a row's height and
 * vertical position, lives inside this same table, so a candidate zoom's row
 * positions can only be had by running it a second time. So the
 * run happens inside this unit, exactly as `fitZoom` above does its own, and
 * what leaves is places rather than a layout.
 *
 * ⛔ THE ROW AXIS ALONE MOVES. `zoomX` is carried through untouched, because
 * MK-4 and its two entrances move one axis and FR-016 leaves the other where it
 * stands -- and because the lane count a row is given is settled by the
 * HORIZONTAL overlap, so a zoomX changed here would answer a stack the frame
 * will not draw.
 *
 * ⭐ THE CALLER'S OWN ANCHOR IS LEFT IN THE SETTINGS on purpose: the rows come
 * back at the screen y they would be drawn at under the display position now in
 * force, so the row S-78 names still stands at the remainder's top edge and a
 * caller can read that edge back off the answer rather than being handed it.
 *
 * ⛔ NO `groupDepthCap`. That argument is FR-055's alone (see
 * `layoutFromSchedule`), and this run wants exactly what FR-018 derives from
 * the zoom it is asked about -- which is the point of asking.
 *
 * @purity pure
 */
export function rowPlacesAtZoomY(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoomY: number,
  isLevelZeroFolded?: boolean,
  rowControlsHeightPx?: number,
): readonly RowPlacement[] {
  return layoutFromSchedule(
    schedule,
    { ...settings, zoomY },
    regions,
    undefined,
    isLevelZeroFolded,
    rowControlsHeightPx,
  ).rows
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * A value table T-206 states across more than one row, summed once
 * here so that no unit adds it up for itself.
 *
 * ⭐ The member is NAMED rather than keyed by a row ID, which every
 * other generated block of table T-206 is: no single row holds this
 * number, so no row ID would be an honest name for it.
 *
 * ⚠️ This unit holds the sum rather than being handed it because the
 * rule is its own to keep: LF-3 of table T-221 (MUST) makes the
 * lattice's height a floor under the band this unit decides, and
 * HF-19 of table T-051 (MUST NOT) lets no band fall below it. A rule
 * that only holds when a caller remembers to pass something is not a
 * rule. ⭐ A measured lattice is still taken where one arrives -- it
 * is what shows the drawn lattice leaving the two rows below -- and
 * it can only ever RAISE the band, never lower it past this floor.
 * ⛔ Neither term is a document setting and neither may become one:
 * table T-206 is where the specification records that the document
 * does not keep them, and the note on S-138 keeps the size off the
 * reader's own text size (FR-039) as well.
 */
export const NOT_STORED_ROW_CONTROL_OUTER_SIZES: {
  /** S-138 + S-141 x 2, in px */
  readonly rowControlOuterHeightPx: number
} = {
  rowControlOuterHeightPx: 24,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ Reading this is NOT the same as taking it: the value still
 * arrives as an argument, because table T-206 keeps these out of the
 * document on purpose (the environment may hold a larger one). This
 * is what a caller passes when it has nothing better.
 */
export const NOT_STORED_SIZES: {
  /** S-90, in px */
  readonly 'S-90': number
  /** S-91, in px */
  readonly 'S-91': number
  /** S-92, in px */
  readonly 'S-92': readonly [number, number]
  /** S-137, in px */
  readonly 'S-137': number
} = {
  'S-90': 12,
  'S-91': 12,
  'S-92': [15, 15],
  'S-137': 6,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it, and EP-14
 * of table T-076 keeps the dummy out of the exported picture without
 * reserving its place -- so a reader handed this document sees the
 * same picture whatever this value is.
 */
export const NOT_STORED_DUMMY_SIZES: {
  /** S-180, in px */
  readonly 'S-180': number
} = {
  'S-180': 30,
}
// </generated>
