// DocumentCodec -- the MSPDI half.
//
// @unit      UF-36   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
//
// Converts between the exchange partner's XML and the document. FR-021 is the
// reason the unit exists: one MSPDI taken in, not merged, not edited, and
// written out again must come back as the same file. Everything below is
// arranged around that one sentence.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ---- what this file does NOT do -------------------------------------------
//
// ⛔ It does not judge the content. FR-023 puts the ceilings, the dates, the
// counts and the ring check in ValidateImportedDocument (CP-13), which the
// three intake paths share so that one of them cannot be laxer than another.
// This file answers one narrower question: is the text an MSPDI document at
// all. `json-codec.ts` draws the same line for its own half; a caller runs both,
// in that order, because the validator takes a `Document` and cannot be handed
// a shape that is not one. ⭐ Two of FR-023's own MUSTs land HERE rather than
// there, because they are about the parser and not about the values:
// external entities are disabled (no DOCTYPE is accepted at all) and no text
// ever reaches `innerHTML` -- this unit holds no DOM.
//
// ⛔ It does not advance `Project.importSeq` and it writes no `TaskOrigin`.
// MG-13 of table T-032 makes the sequence number a property of an import
// SESSION, and a session id is not derivable from the file; minting one is not
// something a `pure` function may do. Both belong to ImportDocument (CP-10).
//
// ---- the two axes (Chapter 5.4) -------------------------------------------
//
// ⛔ The WBS is the axis that crosses the wire and the row tree is not. On the
// way in, `Task/OutlineLevel` and document order become `Task.wbsParentUid` and
// `Task.wbsOrder` (AT-25 / AT-26); on the way out, DV-5 and DV-6 of table T-059
// are made from that same tree. `TaskGroup` / `TaskGroupMember` are GRS's own
// (ET-4 / ET-5 are marked not exported) and never appear in the XML. Getting
// this backwards would flatten the row tree into the WBS on every round trip, which
// is the failure Chapter 5.4 split the two axes to avoid.
//
// ---- the three weekday numberings (⚠️ a trap this project has already hit) --
//
// The exchange partner numbers weekdays FOUR ways, and the two this file
// touches are ONE APART. Read from the official XSD, whose local copy is
// docs/reference/mspdi/mspdi_pj12.xsd (Chapter 6.2 names it the authority):
//
//   Project/WeekStartDay          xsd:595   0=Sunday .. 6=Saturday
//   .../WeekDay/DayType           xsd:1249  0=Exception, 1=Sunday .. 7=Saturday
//   .../Exception/DaysOfWeek      xsd:1401  a BITMASK: 1=Sunday, 2=Monday,
//                                           4=Tuesday .. 64=Saturday
//   .../Exception/MonthItem       xsd:1406  0=Day, 1=Weekday, 2=WeekendDay,
//                                           3=Sunday .. 9=Saturday
//
// ⭐ This file converts NONE of them. `Project.weekStartDay` (AT-17) keeps the
// first numbering and `WeekDay.dayType` (AT-73) keeps the second, each carrying
// the exchange partner's own number, exactly as those two rows state; the third
// and fourth are never interpreted and ride along in `Exception.carry`. The one
// place a conversion could have been written is therefore the one place it must
// not be: a Monday is 1 in `weekStartDay` and 2 in `dayType`, and nothing here
// may make those agree.
//
// ---- dates (FR-054) --------------------------------------------------------
//
// ⛔ A date column takes the exchange partner's TEXT, character for character.
// No time zone is converted (MUST NOT) and the time part is kept for write-back
// (EX-2 / EX-7 of table T-033). Every date column of table T-058 is `Own` for
// this reason. The day is derived from the text by `dayOf` (PI-1) wherever a day
// is actually needed, which in this file is once: DV-9's `Stop`.
//
// ---- what makes the round trip come back byte for byte ---------------------
//
// FR-021 forbids comparing byte strings (MUST NOT) and leaves the normalization
// to Chapter 6.1, which does not yet state one. This file does not rely on that
// being settled, because it reproduces more than a normalization would need:
//
//   * order -- the children of every element this file writes go out in the
//     order the official XSD declares them (`CHILD_ORDER` below, read off the
//     schema). The schema is a xsd:sequence, so that order is also the only one
//     EX-1 (valid against the official schema, MUST) accepts. Repeated elements
//     keep their arrival order through `CarryElement.ordinal` (AT-123).
//   * scalars this software does not use -- `carry`, keyed by element name
//     (AT-22 / AT-43 / ...), written back untouched (G-13 of table T-005).
//   * elements this software does not use -- `carryElements`, in place under
//     their own owner, never gathered at the root (DF-2 / DF-3 of table T-053).
//   * values that are made at write time -- table T-059. ⭐ The four structural
//     ones (DV-4 ID, DV-5 OutlineLevel, DV-6 OutlineNumber, DV-7 Summary) are
//     deliberately NOT carried: they are rebuilt from the WBS, and for a file
//     that was not edited the rebuilt value is the arrived value. Carrying them
//     instead would have made an edit produce two answers with no rule saying
//     which wins.
//
// ⚠️ Known deviations from an exact round trip are marked `STOP --` in the body
// and repeated in the report. None of them is guessed at.

import type { Document } from '../../entity/document-model/document/document'
import type {
  Assignment,
  Calendar,
  CarryElement,
  Dependency,
  Exception,
  Project,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  WeekDay,
} from '../../entity/document-model/schedule/schedule'
import {
  DEFAULT_CALENDAR_VALUES,
  dateFromWorkingDays,
  dayOf,
  planActualState,
  textOfDay,
  workingCalendarOf,
} from '../../entity/document-model/schedule/schedule'

// ---------------------------------------------------------------- surface ---

/** Why a text could not be read as an MSPDI document. */
export interface MspdiFault {
  /**
   * Where, as a path of element names with 1-based positions, e.g.
   * `/Project/Tasks/Task[3]/UID`. `''` is the text as a whole -- NT-1 of table
   * T-037 requires a notice to say WHICH item is wrong, so a fault that cannot
   * name one says so by naming the whole.
   */
  readonly at: string
  readonly what: string
}

/**
 * Something the caller must be told although the work went through. Table
 * T-037's NT-5 is the shape: the operation is not stopped, and the person is
 * told. FR-054 owes one for recurring exception days, EX-3 for effort, and
 * EX-6 for a full extended-attribute slot.
 */
export interface MspdiNotice {
  readonly at: string
  readonly what: string
}

export type MspdiDecoding =
  | {
      readonly ok: true
      readonly document: Document
      readonly notices: readonly MspdiNotice[]
    }
  | { readonly ok: false; readonly faults: readonly MspdiFault[] }

/**
 * ⭐ Writing answers with notices beside the text rather than with the text
 * alone (which is what `jsonFromDocument` does): EX-3 and EX-6 of table T-033
 * both require the person to be TOLD something at the moment of writing, and a
 * bare string has nowhere to say it. A failure is a value here, never a throw
 * (FR-028, R7.10).
 */
export interface MspdiEncoding {
  readonly text: string
  readonly notices: readonly MspdiNotice[]
}

/**
 * The namespace written on the root.
 *
 * ⛔ The canon disagrees with itself. The official XSD declares
 * `targetNamespace="http://schemas.microsoft.com/project/2007"`
 * (mspdi_pj12.xsd:21) while Microsoft's own element reference spells every
 * example `<Project xmlns="http://schemas.microsoft.com/project">` (eleven
 * places under docs/reference/mspdi/learn-docs). Chapter 6.2 names the XSD --
 * not the prose -- as the authority, so the XSD's value is written here.
 * ⚠️ Reading does not depend on this: elements are matched by local name and
 * any namespace is accepted, so a file spelled either way comes in. It is only
 * what goes OUT that is decided here, and it is reported.
 */
export const MSPDI_NAMESPACE = 'http://schemas.microsoft.com/project/2007'

// ------------------------------------------------ the exchange partner's ----
// ------------------------------------------------ declared child order   ----

/**
 * The children of each element this file writes, in the order the official XSD
 * declares them (docs/reference/mspdi/mspdi_pj12.xsd). The schema states each
 * of these as an `xsd:sequence`, so this order is not a preference: EX-1 of
 * table T-033 requires the output to be valid against that schema (MUST), and a
 * sequence is only valid in its declared order. It is also what makes the round
 * trip come back unchanged for the scalars in `carry`, whose arrival order the
 * document does not keep (AT-22 and its siblings are maps, not lists).
 *
 * ⚠️ Read off the schema, not typed from memory. To check a name, grep it in
 * the XSD; to check the ORDER, the declarations are contiguous under each
 * parent's `xsd:sequence`.
 */
const CHILD_ORDER: Readonly<Record<string, readonly string[]>> = {
  // mspdi_pj12.xsd, element Project
  Project: [
    'SaveVersion', 'UID', 'Name', 'Title', 'Subject', 'Category', 'Company', 'Manager',
    'Author', 'CreationDate', 'Revision', 'LastSaved', 'ScheduleFromStart', 'StartDate',
    'FinishDate', 'FYStartDate', 'CriticalSlackLimit', 'CurrencyDigits',
    'CurrencySymbol', 'CurrencyCode', 'CurrencySymbolPosition', 'CalendarUID',
    'DefaultStartTime', 'DefaultFinishTime', 'MinutesPerDay', 'MinutesPerWeek',
    'DaysPerMonth', 'DefaultTaskType', 'DefaultFixedCostAccrual', 'DefaultStandardRate',
    'DefaultOvertimeRate', 'DurationFormat', 'WorkFormat', 'EditableActualCosts',
    'HonorConstraints', 'EarnedValueMethod', 'InsertedProjectsLikeSummary',
    'MultipleCriticalPaths', 'NewTasksEffortDriven', 'NewTasksEstimated',
    'SplitsInProgressTasks', 'SpreadActualCost', 'SpreadPercentComplete',
    'TaskUpdatesResource', 'FiscalYearStart', 'WeekStartDay', 'MoveCompletedEndsBack',
    'MoveRemainingStartsBack', 'MoveRemainingStartsForward', 'MoveCompletedEndsForward',
    'BaselineForEarnedValue', 'AutoAddNewResourcesAndTasks', 'StatusDate',
    'CurrentDate', 'MicrosoftProjectServerURL', 'Autolink', 'NewTaskStartDate',
    'DefaultTaskEVMethod', 'ProjectExternallyEdited', 'ExtendedCreationDate',
    'ActualsInSync', 'RemoveFileProperties', 'AdminProject', 'OutlineCodes', 'WBSMasks',
    'ExtendedAttributes', 'Calendars', 'Tasks', 'Resources', 'Assignments',
  ],
  // mspdi_pj12.xsd, element Task
  Task: [
    'UID', 'ID', 'Name', 'Type', 'IsNull', 'CreateDate', 'Contact', 'WBS', 'WBSLevel',
    'OutlineNumber', 'OutlineLevel', 'Priority', 'Start', 'Finish', 'Duration',
    'DurationFormat', 'Work', 'Stop', 'Resume', 'ResumeValid', 'EffortDriven',
    'Recurring', 'OverAllocated', 'Estimated', 'Milestone', 'Summary', 'Critical',
    'IsSubproject', 'IsSubprojectReadOnly', 'SubprojectName', 'ExternalTask',
    'ExternalTaskProject', 'EarlyStart', 'EarlyFinish', 'LateStart', 'LateFinish',
    'StartVariance', 'FinishVariance', 'WorkVariance', 'FreeSlack', 'TotalSlack',
    'FixedCost', 'FixedCostAccrual', 'PercentComplete', 'PercentWorkComplete', 'Cost',
    'OvertimeCost', 'OvertimeWork', 'ActualStart', 'ActualFinish', 'ActualDuration',
    'ActualCost', 'ActualOvertimeCost', 'ActualWork', 'ActualOvertimeWork',
    'RegularWork', 'RemainingDuration', 'RemainingCost', 'RemainingWork',
    'RemainingOvertimeCost', 'RemainingOvertimeWork', 'ACWP', 'CV', 'ConstraintType',
    'CalendarUID', 'ConstraintDate', 'Deadline', 'LevelAssignments', 'LevelingCanSplit',
    'LevelingDelay', 'LevelingDelayFormat', 'PreLeveledStart', 'PreLeveledFinish',
    'Hyperlink', 'HyperlinkAddress', 'HyperlinkSubAddress', 'IgnoreResourceCalendar',
    'Notes', 'HideBar', 'Rollup', 'BCWS', 'BCWP', 'PhysicalPercentComplete',
    'EarnedValueMethod', 'PredecessorLink', 'ActualWorkProtected',
    'ActualOvertimeWorkProtected', 'ExtendedAttribute', 'Baseline', 'OutlineCode',
    'IsPublished', 'StatusManager', 'CommitmentStart', 'CommitmentFinish',
    'CommitmentType', 'TimephasedData',
  ],
  // mspdi_pj12.xsd, element Resource
  Resource: [
    'UID', 'ID', 'Name', 'Type', 'IsNull', 'Initials', 'Phonetics', 'NTAccount',
    'MaterialLabel', 'Code', 'Group', 'WorkGroup', 'EmailAddress', 'Hyperlink',
    'HyperlinkAddress', 'HyperlinkSubAddress', 'MaxUnits', 'PeakUnits', 'OverAllocated',
    'AvailableFrom', 'AvailableTo', 'Start', 'Finish', 'CanLevel', 'AccrueAt', 'Work',
    'RegularWork', 'OvertimeWork', 'ActualWork', 'RemainingWork', 'ActualOvertimeWork',
    'RemainingOvertimeWork', 'PercentWorkComplete', 'StandardRate',
    'StandardRateFormat', 'Cost', 'OvertimeRate', 'OvertimeRateFormat', 'OvertimeCost',
    'CostPerUse', 'ActualCost', 'ActualOvertimeCost', 'RemainingCost',
    'RemainingOvertimeCost', 'WorkVariance', 'CostVariance', 'SV', 'CV', 'ACWP',
    'CalendarUID', 'Notes', 'BCWS', 'BCWP', 'IsGeneric', 'IsInactive', 'IsEnterprise',
    'BookingType', 'ActualWorkProtected', 'ActualOvertimeWorkProtected',
    'ActiveDirectoryGUID', 'CreationDate', 'ExtendedAttribute', 'Baseline',
    'OutlineCode', 'IsCostResource', 'AssnOwner', 'AssnOwnerGuid', 'IsBudget',
    'AvailabilityPeriods', 'Rates', 'TimephasedData',
  ],
  // mspdi_pj12.xsd, element Assignment. ⚠️ The 201 `f404xxx` field codes that
  // sit between `Baseline` and `TimephasedData` are appended below rather than
  // spelled out: they are one contiguous hexadecimal run, so a loop states the
  // same fact in a form that cannot hold a typo.
  Assignment: [
    'UID', 'TaskUID', 'ResourceUID', 'PercentWorkComplete', 'ActualCost',
    'ActualFinish', 'ActualOvertimeCost', 'ActualOvertimeWork', 'ActualStart',
    'ActualWork', 'ACWP', 'Confirmed', 'Cost', 'CostRateTable', 'CostVariance', 'CV',
    'Delay', 'Finish', 'FinishVariance', 'Hyperlink', 'HyperlinkAddress',
    'HyperlinkSubAddress', 'WorkVariance', 'HasFixedRateUnits', 'FixedMaterial',
    'LevelingDelay', 'LevelingDelayFormat', 'LinkedFields', 'Milestone', 'Notes',
    'Overallocated', 'OvertimeCost', 'OvertimeWork', 'PeakUnits', 'RegularWork',
    'RemainingCost', 'RemainingOvertimeCost', 'RemainingOvertimeWork', 'RemainingWork',
    'ResponsePending', 'Start', 'Stop', 'Resume', 'StartVariance', 'Summary', 'SV',
    'Units', 'UpdateNeeded', 'VAC', 'Work', 'WorkContour', 'BCWS', 'BCWP',
    'BookingType', 'ActualWorkProtected', 'ActualOvertimeWorkProtected', 'CreationDate',
    'AssnOwner', 'AssnOwnerGuid', 'BudgetCost', 'BudgetWork', 'ExtendedAttribute',
    'Baseline',
    ...assignmentFieldCodes(),
    'TimephasedData',
  ],
  // mspdi_pj12.xsd, element Calendar and its two collections
  Calendar: ['UID', 'Name', 'IsBaseCalendar', 'BaseCalendarUID', 'WeekDays',
    'Exceptions', 'WorkWeeks'],
  WeekDay: ['DayType', 'DayWorking', 'TimePeriod', 'WorkingTimes'],
  Exception: ['EnteredByOccurrences', 'TimePeriod', 'Occurrences', 'Name', 'Type',
    'Period', 'DaysOfWeek', 'MonthItem', 'MonthPosition', 'Month', 'MonthDay',
    'DayWorking', 'WorkingTimes'],
  TimePeriod: ['FromDate', 'ToDate'],
  PredecessorLink: ['PredecessorUID', 'Type', 'CrossProject', 'CrossProjectName',
    'LinkLag', 'LagFormat'],
}

/**
 * `f404000` .. `f4040c8`, the timephased field codes the XSD declares under
 * `Assignment` between `Baseline` and `TimephasedData`. The run is contiguous,
 * which is why it is generated: 201 hand-typed literals would carry a typo that
 * nothing could see, and a typo here silently moves a carried scalar.
 *
 * @purity pure
 */
function assignmentFieldCodes(): readonly string[] {
  const codes: string[] = []
  for (let code = 0x000; code <= 0x0c8; code += 1) {
    codes.push(`f404${code.toString(16).padStart(3, '0')}`)
  }
  return codes
}

// -------------------------------------------------------------- XML tree ----

/**
 * One element of the exchange partner's tree.
 *
 * ⭐ There is no attribute field, and that is a fact about the schema rather
 * than a simplification: the official XSD declares no `xsd:attribute` anywhere
 * (zero occurrences in mspdi_pj12.xsd), so a conformant MSPDI carries none
 * beyond the root's namespace declaration. `readXml` refuses one for that
 * reason -- keeping the shape honest is what lets `carry` and `carryElements`
 * be a complete account of what arrived.
 *
 * `text` is the element's own character data. ⚠️ It is only meaningful when
 * `children` is empty: MSPDI has no mixed content, so the whitespace between
 * two child elements is layout and not a value (FR-021 lists it among the
 * things that must not be byte-compared).
 */
interface XmlElement {
  readonly name: string
  readonly text: string
  readonly children: readonly XmlElement[]
}

/** A frame of the reader's explicit stack. */
interface OpenElement {
  readonly name: string
  readonly texts: string[]
  readonly children: XmlElement[]
}

type XmlReading =
  | { readonly ok: true; readonly root: XmlElement }
  | { readonly ok: false; readonly fault: MspdiFault }

const NAME_START = /[A-Za-z_:]/
const NAME_REST = /[A-Za-z0-9._:\-]/

/** @purity pure */
function fault(at: string, what: string): MspdiFault {
  return { at, what }
}

/** @purity pure */
function notice(at: string, what: string): MspdiNotice {
  return { at, what }
}

/**
 * The five named references XML predefines, and nothing else. ⛔ Any other
 * `&name;` is a reference to a declared entity, and a declared entity needs a
 * DOCTYPE, which `readXml` refuses outright -- FR-023 requires external
 * entities to be disabled (MUST), and the cheapest way to be sure of that is a
 * reader that has no mechanism for them at all.
 */
const NAMED_REFERENCES: Readonly<Record<string, string>> = {
  lt: '<', gt: '>', amp: '&', quot: '"', apos: "'",
}

/**
 * Character data with its references resolved, or null when a reference is one
 * this reader does not have.
 *
 * @purity pure
 */
function decodedText(raw: string): string | null {
  if (!raw.includes('&')) return raw
  let out = ''
  let at = 0
  while (at < raw.length) {
    const amp = raw.indexOf('&', at)
    if (amp < 0) {
      out += raw.slice(at)
      break
    }
    out += raw.slice(at, amp)
    const end = raw.indexOf(';', amp)
    if (end < 0) return null
    const body = raw.slice(amp + 1, end)
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      if (!Number.isFinite(code) || body.length < 3) return null
      out += String.fromCodePoint(code)
    } else if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || body.length < 2) return null
      out += String.fromCodePoint(code)
    } else {
      const named = NAMED_REFERENCES[body]
      if (named === undefined) return null
      out += named
    }
    at = end + 1
  }
  return out
}

/**
 * Read one MSPDI text into a tree.
 *
 * ⭐ It takes the TEXT rather than a parsed value, for the same reason
 * `documentFromJson` does: parsing is where a malformed input announces itself,
 * and a caller that had already parsed would have swallowed that. FR-023 calls
 * every intake untrusted.
 *
 * ⚠️ The stack is explicit rather than a recursive descent. An untrusted file
 * may nest as deep as it likes -- `S-133` of table T-211 bounds what may be
 * STORED, but nothing bounds what may arrive -- and a recursive reader would
 * end the process on a stack overflow instead of returning a refusal.
 *
 * ⛔ A DOCTYPE is refused rather than skipped. That is FR-023's
 * requirement to disable external entities, in the strongest available form:
 * there is no code path here that could expand one.
 *
 * @purity pure
 */
function readXml(text: string): XmlReading {
  const stack: OpenElement[] = []
  let root: XmlElement | null = null
  let at = 0

  const where = (): string =>
    stack.length === 0 ? '' : '/' + stack.map((frame) => frame.name).join('/')

  while (at < text.length) {
    const open = text.indexOf('<', at)
    if (open < 0) {
      if (text.slice(at).trim() !== '') {
        return { ok: false, fault: fault(where(), 'character data outside the root element') }
      }
      break
    }
    if (open > at) {
      const raw = text.slice(at, open)
      const frame = stack[stack.length - 1]
      if (frame === undefined) {
        if (raw.trim() !== '') {
          return { ok: false, fault: fault('', 'character data outside the root element') }
        }
      } else {
        const decoded = decodedText(raw)
        if (decoded === null) {
          return { ok: false, fault: fault(where(), 'an entity reference this reader does not define') }
        }
        frame.texts.push(decoded)
      }
    }
    at = open

    if (text.startsWith('<!--', at)) {
      const end = text.indexOf('-->', at + 4)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated comment') }
      // ⚠️ Comments are dropped. Nothing in the document can hold one, and the
      // exchange partner writes none. Reported.
      at = end + 3
      continue
    }
    if (text.startsWith('<![CDATA[', at)) {
      const end = text.indexOf(']]>', at + 9)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated CDATA section') }
      const frame = stack[stack.length - 1]
      if (frame === undefined) {
        return { ok: false, fault: fault('', 'a CDATA section outside the root element') }
      }
      frame.texts.push(text.slice(at + 9, end))
      at = end + 3
      continue
    }
    if (text.startsWith('<!DOCTYPE', at)) {
      return {
        ok: false,
        fault: fault('', 'a DOCTYPE declaration (FR-023 disables external entities, MUST)'),
      }
    }
    if (text.startsWith('<?', at)) {
      const end = text.indexOf('?>', at + 2)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated processing instruction') }
      at = end + 2
      continue
    }
    if (text.startsWith('</', at)) {
      const end = text.indexOf('>', at + 2)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated end tag') }
      const name = text.slice(at + 2, end).trim()
      const frame = stack.pop()
      if (frame === undefined) {
        return { ok: false, fault: fault('', `an end tag </${name}> with no start tag`) }
      }
      if (localName(name) !== frame.name) {
        return { ok: false, fault: fault(where(), `an end tag </${name}> closing <${frame.name}>`) }
      }
      const built: XmlElement = {
        name: frame.name,
        text: frame.texts.join(''),
        children: frame.children,
      }
      const parent = stack[stack.length - 1]
      if (parent === undefined) root = built
      else parent.children.push(built)
      at = end + 1
      continue
    }

    const started = readStartTag(text, at, where())
    if (!started.ok) return { ok: false, fault: started.fault }
    if (root !== null && stack.length === 0) {
      return { ok: false, fault: fault('', 'a second root element') }
    }
    if (started.isEmpty) {
      const built: XmlElement = { name: started.name, text: '', children: [] }
      const parent = stack[stack.length - 1]
      if (parent === undefined) root = built
      else parent.children.push(built)
    } else {
      stack.push({ name: started.name, texts: [], children: [] })
    }
    at = started.after
  }

  if (stack.length > 0) return { ok: false, fault: fault(where(), 'an element that was never closed') }
  if (root === null) return { ok: false, fault: fault('', 'no element at all') }
  return { ok: true, root }
}

type StartTagReading =
  | { readonly ok: true; readonly name: string; readonly isEmpty: boolean; readonly after: number }
  | { readonly ok: false; readonly fault: MspdiFault }

/**
 * One start tag. ⛔ An attribute that is not a namespace declaration is a
 * refusal, because the official XSD declares no attribute anywhere: a file that
 * carries one is not MSPDI, and accepting it would mean carrying a value that
 * `carry` (scalars) and `carryElements` (elements) have no room for -- so it
 * would be lost on the way back and FR-021 would fail silently instead of
 * loudly.
 *
 * @purity pure
 */
function readStartTag(text: string, from: number, path: string): StartTagReading {
  let at = from + 1
  const first = text[at]
  if (first === undefined || !NAME_START.test(first)) {
    return { ok: false, fault: fault(path, 'a `<` that does not start an element name') }
  }
  let end = at + 1
  while (end < text.length) {
    const ch = text[end]
    if (ch === undefined || !NAME_REST.test(ch)) break
    end += 1
  }
  const name = localName(text.slice(at, end))
  at = end

  for (;;) {
    while (at < text.length && /\s/.test(text[at] ?? '')) at += 1
    if (text.startsWith('/>', at)) return { ok: true, name, isEmpty: true, after: at + 2 }
    if (text.startsWith('>', at)) return { ok: true, name, isEmpty: false, after: at + 1 }
    const attributeStart = at
    while (at < text.length && NAME_REST.test(text[at] ?? '')) at += 1
    const attributeName = text.slice(attributeStart, at)
    if (attributeName === '') {
      return { ok: false, fault: fault(path, `an unterminated start tag <${name}>`) }
    }
    while (at < text.length && /\s/.test(text[at] ?? '')) at += 1
    if (text[at] !== '=') {
      return { ok: false, fault: fault(path, `an attribute ${attributeName} with no value`) }
    }
    at += 1
    while (at < text.length && /\s/.test(text[at] ?? '')) at += 1
    const quote = text[at]
    if (quote !== '"' && quote !== "'") {
      return { ok: false, fault: fault(path, `an unquoted attribute ${attributeName}`) }
    }
    const close = text.indexOf(quote, at + 1)
    if (close < 0) {
      return { ok: false, fault: fault(path, `an unterminated attribute ${attributeName}`) }
    }
    at = close + 1
    if (attributeName !== 'xmlns' && !attributeName.startsWith('xmlns:')) {
      return {
        ok: false,
        fault: fault(path, `the attribute ${attributeName}, which the official schema does not declare`),
      }
    }
  }
}

/**
 * A qualified name without its prefix. Elements are matched by local name so
 * that a file written with a prefixed namespace reads the same as one written
 * with a default namespace -- FR-021 names the prefix among the things that
 * wobble with the writer and must not decide a comparison.
 *
 * @purity pure
 */
function localName(qualified: string): string {
  const colon = qualified.lastIndexOf(':')
  return colon < 0 ? qualified : qualified.slice(colon + 1)
}

// ------------------------------------------------------------ XML writing ---

/** @purity pure */
function escapedText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * One element and everything under it, indented. Written iteratively for the
 * same reason `readXml` reads iteratively: a carried tree that arrived deep
 * must not end the process on the way out.
 *
 * @purity pure
 */
function writtenXml(root: XmlElement, namespace: string): string {
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n']
  // Table T-003's CN-5 fixes UTF-8 without a BOM; nothing here writes one.
  type Step = { readonly element: XmlElement; readonly depth: number; readonly isClose: boolean }
  const steps: Step[] = [{ element: root, depth: 0, isClose: false }]
  while (steps.length > 0) {
    const step = steps.pop()
    if (step === undefined) break
    const pad = '  '.repeat(step.depth)
    if (step.isClose) {
      parts.push(`${pad}</${step.element.name}>\n`)
      continue
    }
    const attributes = step.depth === 0 ? ` xmlns="${escapedText(namespace)}"` : ''
    if (step.element.children.length === 0) {
      parts.push(`${pad}<${step.element.name}${attributes}>`)
      parts.push(escapedText(step.element.text))
      parts.push(`</${step.element.name}>\n`)
      continue
    }
    parts.push(`${pad}<${step.element.name}${attributes}>\n`)
    steps.push({ element: step.element, depth: step.depth, isClose: true })
    for (let index = step.element.children.length - 1; index >= 0; index -= 1) {
      const child = step.element.children[index]
      if (child !== undefined) steps.push({ element: child, depth: step.depth + 1, isClose: false })
    }
  }
  return parts.join('')
}

// ----------------------------------------------------------- small values ---

/** @purity pure */
function leafText(element: XmlElement): string {
  return element.children.length === 0 ? element.text : ''
}

/** @purity pure */
function childOf(element: XmlElement, name: string): XmlElement | null {
  return element.children.find((child) => child.name === name) ?? null
}

/**
 * A column that keeps the exchange partner's text as it arrived. ⛔ Never
 * trimmed and never reformatted: FR-054 takes the literal text and EX-4 keeps
 * the arriving format.
 *
 * @purity pure
 */
function textColumn(element: XmlElement, name: string): string | null {
  const child = childOf(element, name)
  return child === null ? null : leafText(child)
}

/** @purity pure */
function integerColumn(element: XmlElement, name: string): number | null {
  const raw = textColumn(element, name)
  if (raw === null) return null
  const trimmed = raw.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

/**
 * An `xsd:boolean`, which admits all four spellings. ⚠️ A value that is none of
 * them reads as `null` rather than as `false`: a column that allows null
 * distinguishes an absent element from one that said false, and FR-024 exists
 * to keep that distinction alive across the round trip.
 *
 * @purity pure
 */
function booleanColumn(element: XmlElement, name: string): boolean | null {
  const raw = textColumn(element, name)
  if (raw === null) return null
  const trimmed = raw.trim()
  if (trimmed === '1' || trimmed === 'true') return true
  if (trimmed === '0' || trimmed === 'false') return false
  return null
}

/** @purity pure */
function isTrue(element: XmlElement, name: string): boolean {
  return booleanColumn(element, name) === true
}

/**
 * The minutes an `xsd:duration` names, or null when it names a length no
 * calendar-free reading can measure.
 *
 * ⛔ A duration carrying years or months is refused rather than approximated:
 * their length depends on where they start, and AT-35 wants a count of working
 * days, not a guess. ⚠️ Weeks are absent from `xsd:duration` by design.
 *
 * @purity pure
 */
function minutesOfDuration(raw: string): number | null {
  const hit = /^(-)?P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
    .exec(raw.trim())
  if (hit === null) return null
  if (hit[2] !== undefined || hit[3] !== undefined) return null
  const days = Number(hit[4] ?? 0)
  const hours = Number(hit[5] ?? 0)
  const minutes = Number(hit[6] ?? 0)
  const seconds = Number(hit[7] ?? 0)
  const total = days * 24 * 60 + hours * 60 + minutes + seconds / 60
  return hit[1] === '-' ? -total : total
}

/**
 * The spelling the exchange partner uses for a length of working time. MS
 * Project writes the hours-minutes-seconds form, which is what EX-4 asks this
 * to keep.
 *
 * @purity pure
 */
function durationOfMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  return `PT${Math.floor(whole / 60)}H${whole % 60}M0S`
}

/**
 * The minutes one working day stands for. FR-054 states the order in as many
 * words: `Project.minutesPerDay`, and table T-209's `S-128` when that is empty.
 *
 * ⛔ It takes the number, not a `Project`, because the two directions must draw
 * it from the same place and only one of them holds a `Project`. Reading takes
 * `Project/MinutesPerDay` off the file being read (AT-14 is the column that
 * element becomes); writing takes `Project.minutesPerDay` off the document.
 * ⚠️ The reader used to take it from the document that was STANDING, so a file
 * that stated a minutesPerDay of its own was divided by one number and
 * multiplied back by another, and FR-021's round trip lost the column.
 *
 * @purity pure
 */
function minutesPerWorkingDay(minutesPerDay: number | null): number {
  return minutesPerDay !== null && minutesPerDay > 0
    ? minutesPerDay
    : DEFAULT_CALENDAR_VALUES['S-128']
}

// ----------------------------------------------------- carry (table T-053) --

/**
 * The names a given parent's reader has already turned into columns. Anything
 * else that arrives under that parent is carried: a leaf into `carry` keyed by
 * its element name, an element with children into `carryElements` in place
 * (DF-2 forbids gathering them at the root, MUST NOT).
 */
interface CarrySplit {
  readonly carry: Readonly<Record<string, string>>
  readonly carryElements: readonly CarryElement[]
}

/**
 * Split one element's children into what was understood and what was not.
 *
 * ⭐ `ordinal` counts EVERY child of the owner, not only the carried ones
 * (AT-123 counts the arrival position among the owner's children and says it is
 * what puts the element back). Counting only the carried ones would still order
 * them among themselves, but it would lose where a repeated element sat relative
 * to the columns, and `writtenChildren` puts them back by that number.
 *
 * @purity pure
 */
function carrySplit(element: XmlElement, consumed: readonly string[]): CarrySplit {
  const carry: Record<string, string> = {}
  const carryElements: CarryElement[] = []
  element.children.forEach((child, ordinal) => {
    if (consumed.includes(child.name)) return
    if (child.children.length === 0) {
      // ⚠️ The last spelling wins when the same scalar arrives twice. The
      // schema declares each scalar once, so a repeat is not MSPDI; refusing it
      // is CP-13's call to make, not this file's.
      carry[child.name] = child.text
      return
    }
    carryElements.push(carriedElement(child, ordinal))
  })
  return { carry, carryElements }
}

/**
 * One element GRS does not interpret, kept in its original form (DF-2, MUST).
 * Its leaves become `fields` and its own element children recurse.
 *
 * ⚠️ Written iteratively for depth safety, as everywhere else in this file.
 *
 * @purity pure
 */
function carriedElement(element: XmlElement, ordinal: number): CarryElement {
  const fields: Record<string, string> = {}
  const children: CarryElement[] = []
  element.children.forEach((child, childOrdinal) => {
    if (child.children.length === 0) fields[child.name] = child.text
    else children.push(carriedElement(child, childOrdinal))
  })
  return { ordinal, name: element.name, fields, children }
}

/**
 * A carried element on its way back out.
 *
 * ⚠️ STOP -- leaves come before element children here, and the arriving order
 * is only reproduced when the owner's schema declares them that way. It does
 * for every repeated element MSPDI actually carries (`ExtendedAttribute`,
 * `Baseline`, `OutlineCode`, `TimephasedData`, `WorkWeeks/WorkWeek`), which is
 * why this is written and not refused. What is missing is a place to keep the
 * interleaving: `CarryElement` has `fields` (a map, AT-125) and `children` (a
 * list, AT-126) and no third column ordering one against the other. Reported.
 *
 * @purity pure
 */
function writtenCarriedElement(carried: CarryElement): XmlElement {
  const children: XmlElement[] = []
  for (const [name, value] of Object.entries(carried.fields)) {
    children.push({ name, text: value, children: [] })
  }
  for (const child of [...carried.children].sort((a, b) => a.ordinal - b.ordinal)) {
    children.push(writtenCarriedElement(child))
  }
  return { name: carried.name, text: '', children }
}

/** One child on its way out, with the position that decides where it goes. */
interface PlacedChild {
  readonly element: XmlElement
  readonly ordinal: number
}

/**
 * The children of one element, in the order the official XSD declares them.
 *
 * ⭐ This is the whole of the round trip's ordering rule. `named` are the values
 * this file understands, `carry` the scalars it does not, and `carried` the
 * elements it does not; all three are sorted by their name's position in the
 * parent's `xsd:sequence`, ties broken by the arrival position AT-123 kept. A
 * name the schema does not declare goes last -- it cannot be placed, and
 * dropping it would lose more than misplacing it.
 *
 * @purity pure
 */
function writtenChildren(
  parentName: string,
  named: readonly PlacedChild[],
  carry: Readonly<Record<string, string>>,
  carried: readonly CarryElement[],
): readonly XmlElement[] {
  const order = CHILD_ORDER[parentName] ?? []
  const placed: PlacedChild[] = [...named]
  for (const [name, value] of Object.entries(carry)) {
    placed.push({ element: { name, text: value, children: [] }, ordinal: 0 })
  }
  for (const one of carried) {
    placed.push({ element: writtenCarriedElement(one), ordinal: one.ordinal })
  }
  return placed
    .map((child, arrival) => ({ child, arrival }))
    .sort((a, b) => {
      const byRank = declaredRank(order, a.child.element.name)
        - declaredRank(order, b.child.element.name)
      if (byRank !== 0) return byRank
      const byOrdinal = a.child.ordinal - b.child.ordinal
      return byOrdinal !== 0 ? byOrdinal : a.arrival - b.arrival
    })
    .map((one) => one.child.element)
}

/**
 * Where the schema declares this name among its parent's children. A name the
 * schema does not declare ranks last: it cannot be placed, and dropping it
 * would lose more than misplacing it does.
 *
 * @purity pure
 */
function declaredRank(order: readonly string[], name: string): number {
  const found = order.indexOf(name)
  return found < 0 ? order.length : found
}

/** @purity pure */
function leaf(name: string, text: string): PlacedChild {
  return { element: { name, text, children: [] }, ordinal: 0 }
}

/**
 * A column that is written only when it holds something. ⚠️ This is the
 * opposite of `FR-024`'s rule for `GRS JSON`, and deliberately: there a missing
 * key and a null must stay apart, here the exchange partner's schema makes
 * every one of these optional, and an empty element would tell the reading
 * tool that the value IS empty.
 *
 * @purity pure
 */
function optionalLeaf(name: string, value: string | number | boolean | null): PlacedChild[] {
  if (value === null) return []
  if (typeof value === 'boolean') return [leaf(name, value ? '1' : '0')]
  return [leaf(name, String(value))]
}

// -------------------------------------------------------------- importing ---

/** Everything one pass of the reader accumulates besides the document. */
interface ImportRun {
  readonly notices: MspdiNotice[]
}

/**
 * Read one MSPDI text into a document.
 *
 * `current` supplies what MSPDI does not carry and the document must have: the
 * presentation group (DR-3), the stamp and the change log (DR-4 -- ET-16 and
 * ET-17 of table T-056 are both marked not exported, so no MSPDI holds them),
 * the format version, and `Project.themeHue`, which DR-5 places in the schedule
 * group but no exchange element supplies. ⚠️ Nothing of `current`'s schedule is
 * merged in: the answer is the file, and merging is FR-056's business in
 * ImportDocument (CP-10).
 *
 * ⚠️ The shape is checked, not the content. See the block at the top.
 *
 * @purity pure
 */
export function documentFromMspdi(text: string, current: Document): MspdiDecoding {
  const reading = readXml(text)
  if (!reading.ok) return { ok: false, faults: [reading.fault] }
  const root = reading.root
  if (root.name !== 'Project') {
    return {
      ok: false,
      faults: [fault('', `the root element is <${root.name}>, not <Project> (mspdi_pj12.xsd)`)],
    }
  }

  const run: ImportRun = { notices: [] }
  const schedule = scheduleFromRoot(root, current, run)
  return {
    ok: true,
    notices: run.notices,
    document: {
      schemaVersion: current.schemaVersion,
      schedule,
      documentSettings: current.documentSettings,
      revisionStamp: current.revisionStamp,
      changeLog: current.changeLog,
    },
  }
}

/** @purity pure */
function scheduleFromRoot(root: XmlElement, current: Document, run: ImportRun): Schedule {
  const calendarsRead = calendarsFromRoot(root, run)
  const tasksRead = tasksFromRoot(root, run)
  const resourcesRead = resourcesFromRoot(root, run)
  const assignmentsRead = assignmentsFromRoot(root, run)
  const rows = rowsFromTasks(tasksRead.tasks, current.documentSettings.maxGroupDepth)

  // DF-3 of table T-053: everything that did not become a row goes on the
  // `carryElements` of the parent that bundles it, and `Project` is what bundles
  // all four collections.
  const project = projectFromRoot(root, current, [
    ...calendarsRead.carriedRows,
    ...tasksRead.carriedRows,
    ...resourcesRead.carriedRows,
    ...assignmentsRead.carriedRows,
  ])
  const highWaterMark = Math.max(
    project.uidHighWaterMark,
    ...tasksRead.tasks.map((task) => task.uid),
    ...resourcesRead.resources.map((resource) => resource.uid),
    ...assignmentsRead.assignments.map((assignment) => assignment.uid),
    ...calendarsRead.calendars.map((calendar) => calendar.uid),
  )

  return {
    project: { ...project, uidHighWaterMark: highWaterMark },
    calendars: calendarsRead.calendars,
    tasks: tasksRead.tasks,
    resources: resourcesRead.resources,
    assignments: assignmentsRead.assignments,
    taskGroups: rows.taskGroups,
    taskGroupMembers: rows.taskGroupMembers,
    // ⛔ Empty on purpose, all four. `TaskVisual` (ET-11), `CommentBox` (ET-13),
    // `HighlightBox` (ET-14) and `BaselineTask` (ET-18) are GRS's own and no
    // MSPDI element supplies one; `TaskOrigin` (ET-12) needs the import session
    // MG-13 defines, which CP-10 owns and a pure function cannot mint.
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }
}

/**
 * `Project`'s own columns.
 *
 * ⚠️ The rows that did not become rows arrive as an argument rather than being
 * found here: DF-3 of table T-053 puts them on `schedule.project.carryElements`
 * precisely because `Project` is what bundles `Tasks` and `Resources`, and this
 * function is the only place that key is built.
 *
 * @purity pure
 */
function projectFromRoot(
  root: XmlElement,
  current: Document,
  carriedRows: readonly CarryElement[],
): Project {
  const split = carrySplit(root, PROJECT_CONSUMED)
  return {
    id: textColumn(root, 'UID'),                          // AT-1
    name: textColumn(root, 'Name'),                       // AT-2
    title: textColumn(root, 'Title'),                     // AT-3
    subject: textColumn(root, 'Subject'),                 // AT-4
    category: textColumn(root, 'Category'),               // AT-5
    company: textColumn(root, 'Company'),                 // AT-6
    manager: textColumn(root, 'Manager'),                 // AT-7
    author: textColumn(root, 'Author'),                   // AT-8
    created: textColumn(root, 'CreationDate'),            // AT-9
    revision: integerColumn(root, 'Revision'),            // AT-10
    lastSaved: textColumn(root, 'LastSaved'),             // AT-11
    startDate: textColumn(root, 'StartDate'),             // AT-12
    statusDate: textColumn(root, 'StatusDate'),           // AT-13
    minutesPerDay: integerColumn(root, 'MinutesPerDay'),  // AT-14
    minutesPerWeek: integerColumn(root, 'MinutesPerWeek'), // AT-15
    daysPerMonth: integerColumn(root, 'DaysPerMonth'),    // AT-16
    // AT-17. ⛔ 0 = Sunday here, and 1 = Sunday in `WeekDay.dayType`. Nothing
    // converts between them; see the header.
    weekStartDay: integerColumn(root, 'WeekStartDay'),
    calendarUid: integerColumn(root, 'CalendarUID'),      // AT-18
    // AT-19 to AT-21 are GRS's own. `themeHue` follows the document that was
    // standing (DR-5 makes it a property of the project, not of the reader);
    // `importSeq` is advanced by CP-10 under MG-13, never here.
    themeHue: current.schedule.project.themeHue,
    uidHighWaterMark: current.schedule.project.uidHighWaterMark,
    importSeq: current.schedule.project.importSeq,
    carry: split.carry,                                   // AT-22
    carryElements: [...split.carryElements, ...carriedRows], // AT-23
  }
}

/**
 * What `projectFromRoot` has already accounted for. ⭐ `Calendars` / `Tasks` /
 * `Resources` / `Assignments` are here because their contents become rows of
 * their own; leaving them out would carry every task twice.
 */
const PROJECT_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Title', 'Subject', 'Category', 'Company', 'Manager', 'Author',
  'CreationDate', 'Revision', 'LastSaved', 'StartDate', 'StatusDate', 'MinutesPerDay',
  'MinutesPerWeek', 'DaysPerMonth', 'WeekStartDay', 'CalendarUID',
  'Calendars', 'Tasks', 'Resources', 'Assignments',
]

/**
 * ⭐ `ID`, `OutlineLevel`, `OutlineNumber` and `Summary` are consumed and NOT
 * carried. Table T-059 makes all four at write time (DV-4 to DV-7) out of the
 * WBS this reader builds from them, so for a file that was not edited the
 * rebuilt value is the arrived value -- and keeping a copy as well would leave
 * two answers with no rule saying which wins.
 */
const TASK_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Start', 'Finish', 'Milestone', 'Deadline', 'Notes', 'CalendarUID',
  'ActualStart', 'ActualDuration', 'ActualFinish', 'Resume', 'ResumeValid',
  'PercentComplete', 'PredecessorLink',
  'ID', 'OutlineLevel', 'OutlineNumber', 'Summary',
]

const RESOURCE_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Type', 'IsCostResource', 'CalendarUID', 'ID',
]

const ASSIGNMENT_CONSUMED: readonly string[] = ['UID', 'TaskUID', 'ResourceUID']

const CALENDAR_CONSUMED: readonly string[] = [
  'UID', 'Name', 'IsBaseCalendar', 'BaseCalendarUID', 'WeekDays', 'Exceptions',
]

const WEEKDAY_CONSUMED: readonly string[] = ['DayType', 'DayWorking']

const EXCEPTION_CONSUMED: readonly string[] = ['Name', 'Type', 'DayWorking', 'TimePeriod']

const DEPENDENCY_CONSUMED: readonly string[] = [
  'PredecessorUID', 'Type', 'LinkLag', 'LagFormat',
]

interface TasksReading {
  readonly tasks: readonly Task[]
  /** What did not become a row, on its way to `project.carryElements`. */
  readonly carriedRows: readonly CarryElement[]
}

/**
 * Every `Task`, and the elements under `<Tasks>` that are not tasks.
 *
 * ⛔ EX-5 of table T-033: a row with nothing in it is not shown as a task and
 * goes back in its original place and shape. `Task/IsNull` is the exchange
 * partner's mark for one (mspdi_pj12.xsd, Task/IsNull). It is kept as a `CarryElement` whose
 * `ordinal` is its position among the children of `<Tasks>`, which is exactly
 * what puts it back where it was.
 *
 * ⭐ A `Task` with no `UID` takes the SAME road, and DF-3 of table T-053 is why:
 * what did not become a row attaches to the `carryElements` of the parent that
 * bundles it, which for `<Tasks>` is `Project`. ⛔ Dropping it is the one
 * outcome nothing allows -- FR-021 carries back even what this software does
 * not use, and FR-012 refuses to change a person's data in silence.
 * ⚠️ Refusing the file instead was the other lawful-looking answer and it is
 * wrong here: FR-023 names what an import refuses (a ring, a date the document
 * cannot use, the ceilings of table T-211) and a missing UID is not among them,
 * that judgement belongs to ValidateImportedDocument (CP-13) and not to this
 * file, and FR-012's note on EX-5 forbids losing a whole file -- and FR-021's
 * round trip with it -- over one element that cannot become a row.
 *
 * @purity pure
 */
function tasksFromRoot(root: XmlElement, run: ImportRun): TasksReading {
  const collection = childOf(root, 'Tasks')
  if (collection === null) return { tasks: [], carriedRows: [] }
  // FR-054, on the file being read: `Project/MinutesPerDay` first, `S-128` only
  // when the file states none. ⛔ Not the standing document's number.
  const minutesPerDay = minutesPerWorkingDay(integerColumn(root, 'MinutesPerDay'))
  const tasks: Task[] = []
  const carriedRows: CarryElement[] = []
  const levels: number[] = []
  const uids: number[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Task') return
    if (isTrue(element, 'IsNull')) {
      carriedRows.push(carriedElement(element, ordinal))
      return
    }
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      // Without a UID there is no primary key (AT-24) and nothing downstream
      // could name the row, so it is carried whole rather than read. NT-5 of
      // table T-037 is the shape of the answer: the import is not stopped, and
      // NT-1 has the notice name WHICH element it is about.
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Tasks/Task[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a task',
      ))
      return
    }
    const level = integerColumn(element, 'OutlineLevel')
    // ⚠️ `S-115` of table T-211 counts the root as depth 1, and AT-25 says a
    // null parent IS the root. A task the exchange partner left without an
    // OutlineLevel therefore reads as a root: it is the only reading that keeps
    // every task in the tree, which FR-058 requires. Reported.
    const depth = level === null || level < 1 ? 1 : level
    const parentIndex = lastIndexShallowerThan(levels, depth)
    const parentUid = parentIndex === null ? null : uids[parentIndex] ?? null
    const wbsOrder = countOfChildrenSoFar(levels, uids, parentIndex, depth)
    levels.push(depth)
    uids.push(uid)
    tasks.push(taskFromElement(element, uid, parentUid, wbsOrder, minutesPerDay, ordinal, run))
  })
  return { tasks, carriedRows }
}

/**
 * The nearest earlier task that sits shallower than `depth` -- the parent the
 * WBS gives this one -- AT-25 raises the parent from the depth and the order
 * of appearance, and names no exchange element of its own.
 *
 * @purity pure
 */
function lastIndexShallowerThan(levels: readonly number[], depth: number): number | null {
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const level = levels[index]
    if (level !== undefined && level < depth) return index
  }
  return null
}

/**
 * How many siblings this task already has under the same parent (AT-26).
 *
 * @purity pure
 */
function countOfChildrenSoFar(
  levels: readonly number[],
  uids: readonly number[],
  parentIndex: number | null,
  depth: number,
): number {
  let counted = 0
  const from = parentIndex === null ? 0 : parentIndex + 1
  for (let index = from; index < levels.length; index += 1) {
    const level = levels[index]
    if (level === undefined || uids[index] === undefined) continue
    if (level < depth) break
    if (level === depth) counted += 1
  }
  return counted
}

/** @purity pure */
function taskFromElement(
  element: XmlElement,
  uid: number,
  wbsParentUid: number | null,
  wbsOrder: number,
  minutesPerDay: number,
  ordinal: number,
  run: ImportRun,
): Task {
  const split = carrySplit(element, TASK_CONSUMED)
  const at = `/Project/Tasks/Task[${ordinal + 1}]`
  return {
    uid,                                                    // AT-24
    wbsParentUid,                                           // AT-25
    wbsOrder,                                               // AT-26
    name: textColumn(element, 'Name'),                      // AT-27
    // AT-28 to AT-31, AT-34, AT-36, AT-37: every date keeps its arriving text.
    start: textColumn(element, 'Start'),
    finish: textColumn(element, 'Finish'),
    milestone: booleanColumn(element, 'Milestone'),         // AT-30
    deadline: textColumn(element, 'Deadline'),              // AT-31
    notes: textColumn(element, 'Notes'),                    // AT-32
    calendarUid: integerColumn(element, 'CalendarUID'),     // AT-33
    actualStart: textColumn(element, 'ActualStart'),
    actualDuration: workingDaysOfActualDuration(element, minutesPerDay, at, run), // AT-35
    actualFinish: textColumn(element, 'ActualFinish'),
    resume: textColumn(element, 'Resume'),
    resumeValid: booleanColumn(element, 'ResumeValid'),     // AT-38
    percentComplete: integerColumn(element, 'PercentComplete'), // AT-39
    // ⚠️ STOP -- AT-40 and AT-41 name `Task/ExtendedAttribute` as the place the
    // fade days ride in, and no row anywhere names WHICH extended attribute.
    // EX-6 of table T-033 turns on that name (do not overwrite the partner's
    // value in the same slot; move to a free one; say so when there is none),
    // so choosing one here would decide a value the document exchanges. The
    // extended attributes stay in `carryElements` untouched and both columns
    // read null. Reported.
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: dependenciesFromTask(element),            // AT-42
    carry: split.carry,                                     // AT-43
    carryElements: split.carryElements,                     // AT-44
  }
}

/**
 * AT-35: the exchange partner states a quantity of time and the column holds
 * working days, so FR-054's conversion runs here.
 *
 * ⚠️ STOP -- only an exact multiple of `minutesPerDay` is stored. A length that
 * is not one would have to be rounded, and no row says in which direction; the
 * result is a column of the document and a value the round trip writes back
 * (`D` of rule 06), so it is not invented. Such a task keeps `actualDuration`
 * null and the person is told. Reported.
 *
 * @purity pure
 */
function workingDaysOfActualDuration(
  element: XmlElement,
  minutesPerDay: number,
  at: string,
  run: ImportRun,
): number | null {
  const raw = textColumn(element, 'ActualDuration')
  if (raw === null || raw.trim() === '') return null
  const minutes = minutesOfDuration(raw)
  if (minutes === null) {
    run.notices.push(notice(`${at}/ActualDuration`, `is not a length this reader measures: ${raw}`))
    return null
  }
  const days = minutes / minutesPerDay
  if (!Number.isInteger(days)) {
    run.notices.push(notice(
      `${at}/ActualDuration`,
      'is not a whole number of working days and was not read (the rounding is undecided)',
    ))
    return null
  }
  return days
}

/**
 * The dependencies of which this task is the SUCCESSOR (DF-4 of table T-053).
 * ⛔ There is no column pointing the other way and no column for the order:
 * the exchange partner holds the link under the successor, and the array's
 * order is the arriving order.
 *
 * @purity pure
 */
function dependenciesFromTask(element: XmlElement): readonly Dependency[] {
  const links: Dependency[] = []
  element.children.forEach((child) => {
    if (child.name !== 'PredecessorLink') return
    const split = carrySplit(child, DEPENDENCY_CONSUMED)
    const predecessorUid = integerColumn(child, 'PredecessorUID')
    const linkType = integerColumn(child, 'Type')
    if (predecessorUid === null || linkType === null) return
    links.push({
      predecessorUid,                                  // AT-45
      linkType,                                        // AT-46
      lag: integerColumn(child, 'LinkLag'),             // AT-47
      lagFormat: integerColumn(child, 'LagFormat'),     // AT-48
      carry: split.carry,                              // AT-49
      carryElements: split.carryElements,              // AT-50
    })
  })
  return links
}

interface ResourcesReading {
  readonly resources: readonly Resource[]
  readonly carriedRows: readonly CarryElement[]
}

/** @purity pure */
function resourcesFromRoot(root: XmlElement, run: ImportRun): ResourcesReading {
  const collection = childOf(root, 'Resources')
  if (collection === null) return { resources: [], carriedRows: [] }
  const resources: Resource[] = []
  const carriedRows: CarryElement[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Resource') return
    // The same empty-row rule EX-5 states for tasks; the exchange partner marks
    // a blank resource the same way (mspdi_pj12.xsd, Resource/IsNull).
    if (isTrue(element, 'IsNull')) {
      carriedRows.push(carriedElement(element, ordinal))
      return
    }
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      // DF-3 again: no primary key (AT-85), so it is carried whole under the
      // parent that bundles `<Resources>`. See `tasksFromRoot` for why this is
      // carried rather than refused.
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Resources/Resource[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a resource',
      ))
      return
    }
    const split = carrySplit(element, RESOURCE_CONSUMED)
    resources.push({
      uid,                                                 // AT-85
      name: textColumn(element, 'Name'),                   // AT-86
      resourceKind: integerColumn(element, 'Type'),        // AT-87
      isCostResource: booleanColumn(element, 'IsCostResource'), // AT-88
      calendarUid: integerColumn(element, 'CalendarUID'),  // AT-89
      carry: split.carry,                                  // AT-90
      carryElements: split.carryElements,                  // AT-91
    })
  })
  return { resources, carriedRows }
}

interface AssignmentsReading {
  readonly assignments: readonly Assignment[]
  readonly carriedRows: readonly CarryElement[]
}

/** @purity pure */
function assignmentsFromRoot(root: XmlElement, run: ImportRun): AssignmentsReading {
  const collection = childOf(root, 'Assignments')
  if (collection === null) return { assignments: [], carriedRows: [] }
  const assignments: Assignment[] = []
  const carriedRows: CarryElement[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Assignment') return
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      // DF-3 again: no primary key (AT-92). See `tasksFromRoot`.
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Assignments/Assignment[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming an assignment',
      ))
      return
    }
    const split = carrySplit(element, ASSIGNMENT_CONSUMED)
    assignments.push({
      uid,                                                 // AT-92
      taskUid: integerColumn(element, 'TaskUID'),          // AT-93
      resourceUid: integerColumn(element, 'ResourceUID'),  // AT-94
      carry: split.carry,                                  // AT-95
      carryElements: split.carryElements,                  // AT-96
    })
  })
  return { assignments, carriedRows }
}

interface CalendarsReading {
  readonly calendars: readonly Calendar[]
  readonly carriedRows: readonly CarryElement[]
}

/** @purity pure */
function calendarsFromRoot(root: XmlElement, run: ImportRun): CalendarsReading {
  const collection = childOf(root, 'Calendars')
  if (collection === null) return { calendars: [], carriedRows: [] }
  const calendars: Calendar[] = []
  const carriedRows: CarryElement[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Calendar') return
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      // DF-3 again: no primary key (AT-63). See `tasksFromRoot`.
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Calendars/Calendar[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a calendar',
      ))
      return
    }
    const split = carrySplit(element, CALENDAR_CONSUMED)
    calendars.push({
      uid,                                                     // AT-63
      name: textColumn(element, 'Name'),                       // AT-64
      isBaseCalendar: booleanColumn(element, 'IsBaseCalendar'), // AT-65
      baseCalendarUid: integerColumn(element, 'BaseCalendarUID'), // AT-66
      ordinal,                                                 // AT-67
      carry: split.carry,                                      // AT-68
      carryElements: split.carryElements,                      // AT-69
      weekDays: weekDaysOfCalendar(element),                   // AT-70
      exceptions: exceptionsOfCalendar(element, uid, run),     // AT-71
    })
  })
  return { calendars, carriedRows }
}

/** @purity pure */
function weekDaysOfCalendar(calendar: XmlElement): readonly WeekDay[] {
  const collection = childOf(calendar, 'WeekDays')
  if (collection === null) return []
  const weekDays: WeekDay[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'WeekDay') return
    const split = carrySplit(element, WEEKDAY_CONSUMED)
    weekDays.push({
      ordinal,                                            // AT-72
      // AT-73. ⛔ 1 = Sunday .. 7 = Saturday, and 0 marks an exception day, not
      // a weekday. The number is kept as it arrived; see the header.
      dayType: integerColumn(element, 'DayType'),
      dayWorking: booleanColumn(element, 'DayWorking'),   // AT-74
      carry: split.carry,                                 // AT-75
      carryElements: split.carryElements,                 // AT-76
    })
  })
  return weekDays
}

/** @purity pure */
function exceptionsOfCalendar(
  calendar: XmlElement,
  calendarUid: number,
  run: ImportRun,
): readonly Exception[] {
  const collection = childOf(calendar, 'Exceptions')
  if (collection === null) return []
  const exceptions: Exception[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Exception') return
    const split = carrySplit(element, EXCEPTION_CONSUMED)
    const period = childOf(element, 'TimePeriod')
    const recurrenceKind = integerColumn(element, 'Type')
    if (recurrenceKind !== null && recurrenceKind !== NO_RECURRENCE) {
      // FR-054: recurring exception days are not spread over real dates, and
      // the person must be told they are not handled. NT-5 of table T-037 makes
      // that a notice beside an accepted input, not a refusal.
      run.notices.push(notice(
        `/Project/Calendars/Calendar[uid=${calendarUid}]/Exceptions/Exception[${ordinal + 1}]`,
        'repeats, and repeating exception days are not spread over real dates',
      ))
    }
    exceptions.push({
      ordinal,                                             // AT-77
      name: textColumn(element, 'Name'),                   // AT-78
      // AT-79 / AT-80. The two ends keep their arriving text (FR-054).
      fromDate: period === null ? null : textColumn(period, 'FromDate'),
      toDate: period === null ? null : textColumn(period, 'ToDate'),
      dayWorking: booleanColumn(element, 'DayWorking'),    // AT-81
      recurrenceKind,                                      // AT-82
      carry: split.carry,                                  // AT-83
      carryElements: split.carryElements,                  // AT-84
    })
  })
  return exceptions
}

/**
 * AT-82's ninth value, the one that means no repetition. Read from the XSD
 * (mspdi_pj12.xsd:1378, "9=No exception type"), which Chapter 6.2 names the
 * authority for the exchange partner's codes.
 */
const NO_RECURRENCE = 9

// ------------------------------------------------- rows for the tasks -------

interface ImportedRows {
  readonly taskGroups: readonly TaskGroup[]
  readonly taskGroupMembers: readonly TaskGroupMember[]
}

/**
 * FR-058: after an import every `Task` is on a row and visible.
 *
 * ⭐ How the rows are shaped follows from three sentences of that requirement
 * read together, and from nothing else. Each is a MUST or a MUST NOT there:
 *   * no `Task` may stay in the document without a row -- so every task gets a
 *     `TaskGroupMember`, and IV-6 of table T-220 makes it exactly one.
 *   * a row with no name of its own shows the name of the task it was derived
 *     from, and a row with neither may not be made -- so a generated row
 *     carries `derivedFromTaskUid` and a null `label`, which is what IV-8 also
 *     requires.
 *   * levels past the cap get no container, and the tasks under them go on the
 *     deepest row -- so the row tree mirrors the WBS down to `S-125` of table
 *     T-211 and stops, and what lies below shares the deepest ancestor's row.
 * ⛔ The cap never refuses the import (MUST NOT); it only stops making rows.
 *
 * ⚠️ Below the cap several tasks share one row, which is what makes that row a
 * stack. `stackOrder` is left null -- AT-62 spells null as automatic, and ST-6
 * of table T-014 decides when a person may set it.
 *
 * @purity pure
 */
function rowsFromTasks(tasks: readonly Task[], maxGroupDepth: number): ImportedRows {
  const depths = new Map<number, number>()
  const taskGroups: TaskGroup[] = []
  const taskGroupMembers: TaskGroupMember[] = []
  const rowOfTask = new Map<number, string>()

  for (const task of tasks) {
    const parentDepth = task.wbsParentUid === null ? 0 : depths.get(task.wbsParentUid) ?? 0
    const depth = parentDepth + 1
    depths.set(task.uid, depth)
    if (depth > maxGroupDepth) continue
    const parentRow = task.wbsParentUid === null ? null : rowOfTask.get(task.wbsParentUid) ?? null
    const id = rowIdOfTask(task.uid)
    rowOfTask.set(task.uid, id)
    taskGroups.push({
      id,                                       // AT-51
      parentId: parentRow,                      // AT-52
      label: null,                              // AT-53 -- shown from AT-54
      derivedFromTaskUid: task.uid,             // AT-54
      order: task.wbsOrder ?? 0,                // AT-55
      isCollapsed: null,                        // AT-56
      isHidden: null,                           // AT-57
      color: null,                              // AT-58 -- null = from the theme
      height: null,                             // AT-59 -- null = automatic
    })
  }

  for (const task of tasks) {
    const own = rowOfTask.get(task.uid)
    const groupId = own ?? deepestAncestorRow(task, tasks, rowOfTask)
    if (groupId === null) continue
    taskGroupMembers.push({ taskUid: task.uid, groupId, stackOrder: null })
  }
  return { taskGroups, taskGroupMembers }
}

/**
 * The row of the nearest ancestor that has one -- FR-058's deepest row.
 *
 * ⚠️ The walk is bounded by the number of tasks. A ring in `wbsParentUid` is
 * what FR-023 refuses in ValidateImportedDocument (CP-13), which has not run
 * yet when this is called, and a walk that trusted the tree would not end.
 *
 * @purity pure
 */
function deepestAncestorRow(
  task: Task,
  tasks: readonly Task[],
  rowOfTask: ReadonlyMap<number, string>,
): string | null {
  let at: number | null = task.wbsParentUid
  for (let steps = 0; steps < tasks.length && at !== null; steps += 1) {
    const row = rowOfTask.get(at)
    if (row !== undefined) return row
    const parent: Task | undefined = tasks.find((one) => one.uid === at)
    at = parent === undefined ? null : parent.wbsParentUid
  }
  return null
}

/**
 * The row identifier a task's row gets.
 *
 * @provisional PD-80
 * ⚠️ AT-51 says the identifier is a UUID and IV-1 says it is unique; NOTHING
 * says which UUID, and a `pure` function may not mint a random one (PI-20 fixes
 * the purity, and R7.1 puts randomness in `semi-pure-b`). So it is derived from
 * the task's own UID, which IV-1 already makes unique, in the variant-1
 * version-4 layout. ⭐ Reversing this costs one function and the tests that
 * read a row id.
 *
 * @purity pure
 */
function rowIdOfTask(uid: number): string {
  const scalar = Math.trunc(uid)
  const sign = scalar < 0 ? 'f' : '0'
  const digits = Math.abs(scalar).toString(16).padStart(11, '0').slice(-11)
  return `00000000-0000-4000-8000-${sign}${digits}`
}

// -------------------------------------------------------------- exporting ---

/** Everything one pass of the writer accumulates besides the tree. */
interface ExportRun {
  readonly notices: MspdiNotice[]
}

/**
 * Write one document as MSPDI.
 *
 * ⭐ What makes this the inverse of the reader is stated once, in the header:
 * declared child order, `carry`, `carryElements`, and table T-059 rebuilt from
 * the WBS. EX-2 is honoured by construction -- nothing here looks at whether a
 * task was edited, because nothing here recomputes a value a task already
 * holds. ⚠️ That is also the limit: see the STOP note on `Task/ID` below.
 *
 * @purity pure
 */
export function mspdiFromDocument(document: Document): MspdiEncoding {
  const run: ExportRun = { notices: [] }
  const schedule = document.schedule
  const root: XmlElement = {
    name: 'Project',
    text: '',
    children: writtenProjectChildren(schedule, run),
  }
  return { text: writtenXml(root, MSPDI_NAMESPACE), notices: run.notices }
}

/** @purity pure */
function writtenProjectChildren(schedule: Schedule, run: ExportRun): readonly XmlElement[] {
  const project = schedule.project
  const named: PlacedChild[] = [
    // EX-1 of table T-033 makes the output valid against the official schema a
    // MUST, and these two are the only children mspdi_pj12.xsd declares with no
    // `minOccurs` (:232, :390). ⭐ A file that was imported brought both, so
    // `carry` holds them and `writtenChildren` puts them back -- DV-3 names
    // `carry` as the source and EX-2 forbids rewriting what nobody edited. Only
    // a document GRS made itself reaches the two constants.
    ...(project.carry['SaveVersion'] === undefined
      ? [leaf('SaveVersion', GRS_SAVE_VERSION)]
      : []),
    ...(project.carry['CurrencyCode'] === undefined
      ? [leaf('CurrencyCode', UNSTATED_CURRENCY_CODE)]
      : []),
    ...optionalLeaf('UID', project.id),
    ...optionalLeaf('Name', project.name),
    ...optionalLeaf('Title', project.title),
    ...optionalLeaf('Subject', project.subject),
    ...optionalLeaf('Category', project.category),
    ...optionalLeaf('Company', project.company),
    ...optionalLeaf('Manager', project.manager),
    ...optionalLeaf('Author', project.author),
    ...optionalLeaf('CreationDate', project.created),
    ...optionalLeaf('Revision', project.revision),
    ...optionalLeaf('LastSaved', project.lastSaved),
    ...optionalLeaf('StartDate', project.startDate),
    ...optionalLeaf('StatusDate', project.statusDate),
    ...optionalLeaf('MinutesPerDay', project.minutesPerDay),
    ...optionalLeaf('MinutesPerWeek', project.minutesPerWeek),
    ...optionalLeaf('DaysPerMonth', project.daysPerMonth),
    ...optionalLeaf('WeekStartDay', project.weekStartDay),
    ...optionalLeaf('CalendarUID', project.calendarUid),
    // DV-1 of table T-059: the latest `Task.finish`. ⚠️ Only when the file did
    // not bring one -- a carried `FinishDate` is the exchange partner's own and
    // EX-2 forbids rewriting what nobody edited.
    ...(project.carry['FinishDate'] === undefined
      ? optionalLeaf('FinishDate', latestTaskFinish(schedule))
      : []),
  ]
  // ⚠️ Each of the four is spliced BEFORE its length is looked at: a file whose
  // only `Calendar` had no UID has none in `schedule.calendars` and one on
  // `project.carryElements`, and testing the collection alone would drop the
  // `<Calendars>` element the file arrived with.
  const calendars = splicedCarriedRows(
    schedule.calendars.map(writtenCalendar), project.carryElements, 'Calendar',
  )
  if (calendars.length > 0) named.push(collection('Calendars', calendars))
  const tasks = writtenTasks(schedule, run)
  if (tasks.length > 0) named.push(collection('Tasks', tasks))
  const resources = writtenResources(schedule)
  if (resources.length > 0) named.push(collection('Resources', resources))
  const assignments = splicedCarriedRows(
    schedule.assignments.map(writtenAssignment), project.carryElements, 'Assignment',
  )
  if (assignments.length > 0) named.push(collection('Assignments', assignments))

  return writtenChildren(
    'Project',
    named,
    project.carry,
    // ⛔ The rows that did not become rows are written INSIDE their collection
    // above, so they must not also be written as children of `Project`. The
    // schema declares no `Project/Task` and no `Project/Calendar` (only the
    // four collections), so the name alone tells them apart.
    project.carryElements.filter((one) => !isCarriedRow(one)),
  )
}

/**
 * Whether this carried element is a row of one of the four collections rather
 * than a child of `Project` itself (DF-3 of table T-053 puts both on the same
 * key, and only the name separates them).
 *
 * @purity pure
 */
function isCarriedRow(carried: CarryElement): boolean {
  return CARRIED_ROW_NAMES.includes(carried.name)
}

const CARRIED_ROW_NAMES: readonly string[] = ['Calendar', 'Task', 'Resource', 'Assignment']

/**
 * `Project/SaveVersion` for a document GRS made itself.
 *
 * DV-2 of table T-059 names the source -- the version of the writing software
 * -- and EX-1 of table T-033 makes the element mandatory, so the SHAPE is
 * decided and only the number is not: no row of the specification states GRS's
 * own version. This software's own major version is written.
 *
 * ⛔ 12 is deliberately not written: mspdi_pj12.xsd:234 documents that value as
 * "Project 2007", and claiming it would say the file came out of the partner's
 * tool. The type is `xsd:integer` with no further restriction (:232), so a
 * major version is valid there.
 *
 * @provisional PD-81
 */
const GRS_SAVE_VERSION = '0'

/**
 * `Project/CurrencyCode` for a document GRS made itself.
 *
 * DV-3 of table T-059 takes this value from `carry`, and a document that was
 * never imported has none, while EX-1 still requires the element. ⭐ `XXX` is
 * ISO 4217's code for "no currency involved", and ISO 4217 is the code set the
 * schema's own documentation names for this element (mspdi_pj12.xsd:391); the
 * declaration restricts it only by `maxLength` 3 (:390), so it is valid.
 * ⛔ A real currency is not written: no column of table T-058 holds an amount
 * of money, so naming one would state a fact the document does not have.
 *
 * @provisional PD-82
 */
const UNSTATED_CURRENCY_CODE = 'XXX'

/** @purity pure */
function collection(name: string, rows: readonly XmlElement[]): PlacedChild {
  return { element: { name, text: '', children: rows }, ordinal: 0 }
}

/**
 * DV-1: the latest `Task.finish`. The text is the one the task holds, never a
 * re-formatting of it (EX-4).
 *
 * @purity pure
 */
function latestTaskFinish(schedule: Schedule): string | null {
  let latest: string | null = null
  let latestDay: number | null = null
  for (const task of schedule.tasks) {
    const day = dayOf(task.finish)
    if (day === null || task.finish === null) continue
    const serial = day.year * 10000 + day.month * 100 + day.day
    if (latestDay === null || serial > latestDay) {
      latestDay = serial
      latest = task.finish
    }
  }
  return latest
}

/**
 * The `<Tasks>` rows, with the ones that never became tasks back in their
 * places -- EX-5's empty rows, and the ones DF-3 carried for want of a UID.
 *
 * ⚠️ Such a row lives on `project.carryElements` because DF-3 of table T-053
 * says so -- `Project` is what bundles `Tasks` -- and its `ordinal` is where it
 * sat among the children of `<Tasks>`. Splicing by that number is what EX-5's
 * original place and shape means.
 *
 * @purity pure
 */
function writtenTasks(schedule: Schedule, run: ExportRun): readonly XmlElement[] {
  const depths = taskDepths(schedule.tasks)
  const numbers = outlineNumbers(schedule.tasks)
  const hasChildren = new Set(
    schedule.tasks.map((task) => task.wbsParentUid).filter((uid): uid is number => uid !== null),
  )
  const minutesPerDay = minutesPerWorkingDay(schedule.project.minutesPerDay)
  const written = schedule.tasks.map((task, index) => writtenTask(
    task, schedule, index, depths, numbers, hasChildren, minutesPerDay, run,
  ))
  return splicedCarriedRows(written, schedule.project.carryElements, 'Task')
}

/** @purity pure */
function splicedCarriedRows(
  rows: readonly XmlElement[],
  carried: readonly CarryElement[],
  name: string,
): readonly XmlElement[] {
  const rowsBack = carried.filter((one) => one.name === name).sort((a, b) => a.ordinal - b.ordinal)
  if (rowsBack.length === 0) return rows
  const out = [...rows]
  for (const row of rowsBack) {
    const at = Math.min(Math.max(row.ordinal, 0), out.length)
    out.splice(at, 0, writtenCarriedElement(row))
  }
  return out
}

/**
 * How deep each task sits in the WBS, counting the root as 1 (`S-115` of table
 * T-211 states that counting). DV-5 writes this number.
 *
 * ⚠️ The walk is bounded: FR-023 refuses a ring, but a document already in hand
 * may hold one and a loop here would not end.
 *
 * @purity pure
 */
function taskDepths(tasks: readonly Task[]): ReadonlyMap<number, number> {
  const parents = new Map<number, number | null>()
  for (const task of tasks) parents.set(task.uid, task.wbsParentUid)
  const depths = new Map<number, number>()
  for (const task of tasks) {
    let depth = 1
    let at = task.wbsParentUid
    for (let steps = 0; steps < tasks.length && at !== null; steps += 1) {
      depth += 1
      at = parents.get(at) ?? null
    }
    depths.set(task.uid, depth)
  }
  return depths
}

/**
 * DV-6: the path through the tree, `1.2.3`. ⛔ DV-6 forbids matching on it: it is
 * written and never read back as an identity.
 *
 * @purity pure
 */
function outlineNumbers(tasks: readonly Task[]): ReadonlyMap<number, string> {
  const numbers = new Map<number, string>()
  const counters = new Map<string, number>()
  for (const task of tasks) {
    const parentKey = task.wbsParentUid === null ? '' : String(task.wbsParentUid)
    const next = (counters.get(parentKey) ?? 0) + 1
    counters.set(parentKey, next)
    const parentNumber = task.wbsParentUid === null ? null : numbers.get(task.wbsParentUid)
    numbers.set(task.uid, parentNumber === undefined || parentNumber === null
      ? String(next)
      : `${parentNumber}.${next}`)
  }
  return numbers
}

/** @purity pure */
function writtenTask(
  task: Task,
  schedule: Schedule,
  index: number,
  depths: ReadonlyMap<number, number>,
  numbers: ReadonlyMap<number, string>,
  hasChildren: ReadonlySet<number>,
  minutesPerDay: number,
  run: ExportRun,
): XmlElement {
  const named: PlacedChild[] = [
    leaf('UID', String(task.uid)),
    // ⚠️ STOP -- DV-4 renumbers `Task/ID` in the order of writing, which is what
    // this does, and DV-5 to DV-7 are rebuilt from the WBS the same way. For a file
    // that was neither merged nor edited these reproduce what arrived, which is
    // FR-021's exact scope. What is NOT covered is a file that WAS edited: EX-2
    // asks for the untouched tasks to keep their values, and no column tells
    // this unit which tasks a person touched. Reported.
    leaf('ID', String(index + 1)),
    ...optionalLeaf('Name', task.name),
    ...optionalLeaf('OutlineNumber', numbers.get(task.uid) ?? null),
    ...optionalLeaf('OutlineLevel', depths.get(task.uid) ?? null),
    ...optionalLeaf('Start', task.start),
    ...optionalLeaf('Finish', task.finish),
    ...optionalLeaf('Resume', task.resume),
    ...optionalLeaf('ResumeValid', task.resumeValid),
    ...optionalLeaf('Milestone', task.milestone),
    leaf('Summary', hasChildren.has(task.uid) ? '1' : '0'),
    ...optionalLeaf('PercentComplete', task.percentComplete),
    ...optionalLeaf('ActualStart', task.actualStart),
    ...optionalLeaf('ActualFinish', task.actualFinish),
    ...optionalLeaf('CalendarUID', task.calendarUid),
    ...optionalLeaf('Deadline', task.deadline),
    ...optionalLeaf('Notes', task.notes),
    ...writtenActualDuration(task, minutesPerDay),
    ...writtenStop(task, schedule, run),
    ...task.dependencies.map(writtenDependency),
  ]
  return {
    name: 'Task',
    text: '',
    children: writtenChildren('Task', named, task.carry, task.carryElements),
  }
}

/**
 * AT-35 the other way round: FR-054's conversion, with `Project.minutesPerDay`
 * and table T-209's `S-128` behind it.
 *
 * @purity pure
 */
function writtenActualDuration(task: Task, minutesPerDay: number): PlacedChild[] {
  if (task.actualDuration === null) return []
  return [leaf('ActualDuration', durationOfMinutes(task.actualDuration * minutesPerDay))]
}

/**
 * DV-9: `Stop`, written only for a suspended task.
 *
 * ⭐ A carried original wins. G-13 of table T-005 names `Stop` as THE value that
 * may be recomputed but keeps its original, and EX-2 forbids moving an untouched
 * task's dates -- so when the file brought one, `carry` already holds it and
 * `writtenChildren` writes it back; this function then adds nothing.
 *
 * ⚠️ The day walk can refuse to end (a calendar that works no day) and raises
 * for it. FR-028 requires a failure to be a VALUE, so it is caught here and
 * becomes a notice: no `Stop` is written and the person is told.
 *
 * @purity pure
 */
function writtenStop(task: Task, schedule: Schedule, run: ExportRun): PlacedChild[] {
  if (task.carry['Stop'] !== undefined) return []
  const state = planActualState(task)
  if (state !== 'suspendedResumeUnknown' && state !== 'suspendedResumePlanned') return []
  const from = dayOf(task.actualStart)
  if (from === null || task.actualDuration === null) return []
  try {
    const stop = dateFromWorkingDays(workingCalendarOf(schedule), from, task.actualDuration)
    // EX-7: a date GRS decided itself is written at midnight, in the exchange
    // partner's own type. `textOfDay` is the one place that spelling lives.
    return [leaf('Stop', textOfDay(stop))]
  } catch (why) {
    run.notices.push(notice(
      `/Project/Tasks/Task[uid=${task.uid}]/Stop`,
      `could not be counted: ${why instanceof Error ? why.message : String(why)}`,
    ))
    return []
  }
}

/** @purity pure */
function writtenDependency(dependency: Dependency): PlacedChild {
  const named: PlacedChild[] = [
    leaf('PredecessorUID', String(dependency.predecessorUid)),
    leaf('Type', String(dependency.linkType)),
    ...optionalLeaf('LinkLag', dependency.lag),
    ...optionalLeaf('LagFormat', dependency.lagFormat),
  ]
  return {
    element: {
      name: 'PredecessorLink',
      text: '',
      children: writtenChildren(
        'PredecessorLink', named, dependency.carry, dependency.carryElements,
      ),
    },
    ordinal: 0,
  }
}

/** @purity pure */
function writtenResources(schedule: Schedule): readonly XmlElement[] {
  const written = schedule.resources.map((resource, index) => {
    const named: PlacedChild[] = [
      leaf('UID', String(resource.uid)),
      // DV-10, the same renumbering DV-4 states for tasks.
      leaf('ID', String(index + 1)),
      ...optionalLeaf('Name', resource.name),
      ...optionalLeaf('Type', resource.resourceKind),
      ...optionalLeaf('IsCostResource', resource.isCostResource),
      ...optionalLeaf('CalendarUID', resource.calendarUid),
    ]
    return {
      name: 'Resource',
      text: '',
      children: writtenChildren('Resource', named, resource.carry, resource.carryElements),
    }
  })
  return splicedCarriedRows(written, schedule.project.carryElements, 'Resource')
}

/** @purity pure */
function writtenAssignment(assignment: Assignment): XmlElement {
  const named: PlacedChild[] = [
    leaf('UID', String(assignment.uid)),
    ...optionalLeaf('TaskUID', assignment.taskUid),
    ...optionalLeaf('ResourceUID', assignment.resourceUid),
  ]
  return {
    name: 'Assignment',
    text: '',
    children: writtenChildren('Assignment', named, assignment.carry, assignment.carryElements),
  }
}

/** @purity pure */
function writtenCalendar(calendar: Calendar): XmlElement {
  const named: PlacedChild[] = [
    leaf('UID', String(calendar.uid)),
    ...optionalLeaf('Name', calendar.name),
    ...optionalLeaf('IsBaseCalendar', calendar.isBaseCalendar),
    ...optionalLeaf('BaseCalendarUID', calendar.baseCalendarUid),
  ]
  if (calendar.weekDays.length > 0) {
    named.push(collection('WeekDays', calendar.weekDays.map(writtenWeekDay)))
  }
  if (calendar.exceptions.length > 0) {
    named.push(collection('Exceptions', calendar.exceptions.map(writtenException)))
  }
  return {
    name: 'Calendar',
    text: '',
    children: writtenChildren('Calendar', named, calendar.carry, calendar.carryElements),
  }
}

/** @purity pure */
function writtenWeekDay(weekDay: WeekDay): XmlElement {
  const named: PlacedChild[] = [
    // AT-73's numbering, untouched. ⛔ Not `Project.weekStartDay`'s.
    ...optionalLeaf('DayType', weekDay.dayType),
    ...optionalLeaf('DayWorking', weekDay.dayWorking),
  ]
  return {
    name: 'WeekDay',
    text: '',
    children: writtenChildren('WeekDay', named, weekDay.carry, weekDay.carryElements),
  }
}

/** @purity pure */
function writtenException(exception: Exception): XmlElement {
  const named: PlacedChild[] = [
    ...optionalLeaf('Name', exception.name),
    ...optionalLeaf('Type', exception.recurrenceKind),
    ...optionalLeaf('DayWorking', exception.dayWorking),
  ]
  // AT-79 / AT-80 name the two ends under `TimePeriod`, so the container is
  // rebuilt around them rather than carried (DF-1: the same position as the
  // exchange partner's, MUST).
  const period: PlacedChild[] = [
    ...optionalLeaf('FromDate', exception.fromDate),
    ...optionalLeaf('ToDate', exception.toDate),
  ]
  if (period.length > 0) {
    named.push({
      element: {
        name: 'TimePeriod',
        text: '',
        children: writtenChildren('TimePeriod', period, {}, []),
      },
      ordinal: 0,
    })
  }
  return {
    name: 'Exception',
    text: '',
    children: writtenChildren('Exception', named, exception.carry, exception.carryElements),
  }
}
