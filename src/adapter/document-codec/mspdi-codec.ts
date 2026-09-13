// DocumentCodec -- the MSPDI half.
//
// @unit      UF-36   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
//
// Converts between the exchange partner's XML and the document; the round trip
// of FR-021 is what everything below is arranged around.
//
// ---- what this file does NOT do -------------------------------------------
//
// It does not judge the content: that is ValidateImportedDocument (CP-13),
// which takes a `Document` and so runs after this. Only the FR-023 MUSTs about
// the TEXT land here (external entities, `innerHTML`, the leading BOM), because
// nothing after the parser could still honour them.
//
// It does not advance `Project.importSeq` or write a `TaskOrigin`: MG-13 of
// table T-032 ties both to one import, which a `pure` function cannot mint.
// ImportDocument (CP-10) does both.
//
// ---- the two axes (Chapter 5.4) -------------------------------------------
//
// Only the WBS crosses the wire (AT-25 / AT-26 in, DV-5 / DV-6 out); the row
// tree (ET-4 / ET-5) never appears in the XML.
//
// ---- weekday numbers (a trap) ---------------------------------------------
//
// The exchange partner numbers weekdays four ways (mspdi_pj12.xsd):
//
//   Project/WeekStartDay          xsd:595   0=Sunday .. 6=Saturday
//   .../WeekDay/DayType           xsd:1249  0=Exception, 1=Sunday .. 7=Saturday
//   .../Exception/DaysOfWeek      xsd:1401  a bitmask: 1=Sunday .. 64=Saturday
//   .../Exception/MonthItem       xsd:1406  0=Day, 1=Weekday, 2=WeekendDay,
//                                           3=Sunday .. 9=Saturday
//
// ⛔ This file converts none of them: AT-17 and AT-73 keep the first two as they
// arrive (one apart), and the other two ride in `Exception.carry`.
//
// ---- the round trip -------------------------------------------------------
//
// It rests on declared child order (`CHILD_ORDER`), unread scalars in `carry`,
// unread elements in `carryElements` (table T-053), and the values table T-059
// makes at write time. Known deviations are marked `STOP --` in the body.

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
import customFields from './mspdi-custom-fields.json'

// ---------------------------------------------------------------- surface ---

/** Why a text could not be read as an MSPDI document. */
export interface MspdiFault {
  /**
   * Where, as a path of element names with 1-based positions, e.g.
   * `/Project/Tasks/Task[3]/UID`; `''` is the text as a whole (NT-1 of table
   * T-037 wants the item named).
   */
  readonly at: string
  readonly what: string
}

/**
 * Something the caller must be told although the work went through (NT-5 of
 * table T-037).
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
 * Notices travel beside the text, unlike `jsonFromDocument`'s bare string,
 * because EX-6 of table T-033 has the person told at the moment of writing.
 * A failure is a value here, never a throw (FR-028, R7.10).
 */
export interface MspdiEncoding {
  readonly text: string
  readonly notices: readonly MspdiNotice[]
}

/**
 * The namespace written on the root: the XSD's (mspdi_pj12.xsd:21), not the
 * `.../project` of the examples in Microsoft's element reference (grep under
 * docs/reference/mspdi/learn-docs), since Chapter 6.2 names the XSD the
 * authority. Reading matches local names in any namespace, so both come in.
 */
export const MSPDI_NAMESPACE = 'http://schemas.microsoft.com/project/2007'

// ------------------------------------------------ the exchange partner's ----
// ------------------------------------------------ declared child order   ----

/**
 * The children of each element this file writes, in the order the official
 * XSD declares them: each is an `xsd:sequence`, so it is the only order EX-1 of
 * table T-033 accepts, and it also restores `carry`, whose maps keep no order.
 * Read off the schema, not typed from memory.
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
  // mspdi_pj12.xsd, element Assignment
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
  // mspdi_pj12.xsd, elements Calendar .. PredecessorLink
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
 * `f404000` .. `f4040c8`, the contiguous run the XSD declares under `Assignment`
 * between `Baseline` and `TimephasedData`: generated, because a typo among
 * hand-typed literals would silently move a carried scalar.
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
 * One element of the exchange partner's tree. No attribute field: see
 * `readStartTag`.
 *
 * ⚠️ `text` is meaningful only when `children` is empty; whitespace between
 * child elements is layout (NR-2 of table T-228).
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
 * The five named references XML predefines, and nothing else: any other
 * `&name;` needs a DOCTYPE, which `readXml` refuses.
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
  let foundAt = 0
  while (foundAt < raw.length) {
    const amp = raw.indexOf('&', foundAt)
    if (amp < 0) {
      out += raw.slice(foundAt)
      break
    }
    out += raw.slice(foundAt, amp)
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
    foundAt = end + 1
  }
  return out
}

/**
 * Read one MSPDI text into a tree. Takes the text, not a parsed value, so a
 * malformed input is refused here, as `documentFromJson` does.
 *
 * The stack is explicit, not recursive: nothing bounds how deep an untrusted
 * file nests until CP-13 applies table T-211, and a recursive reader would
 * overflow instead of refusing.
 *
 * ⛔ A DOCTYPE is refused, not skipped, so no code path here could expand an
 * external entity (FR-023).
 *
 * @purity pure
 */
function readXml(text: string): XmlReading {
  const stack: OpenElement[] = []
  let root: XmlElement | null = null
  let foundAt = 0

  const where = (): string =>
    stack.length === 0 ? '' : '/' + stack.map((frame) => frame.name).join('/')

  while (foundAt < text.length) {
    const open = text.indexOf('<', foundAt)
    if (open < 0) {
      if (text.slice(foundAt).trim() !== '') {
        return { ok: false, fault: fault(where(), 'character data outside the root element') }
      }
      break
    }
    if (open > foundAt) {
      const raw = text.slice(foundAt, open)
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
    foundAt = open

    if (text.startsWith('<!--', foundAt)) {
      const end = text.indexOf('-->', foundAt + 4)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated comment') }
      // Comments are dropped: nothing in the document can hold one.
      foundAt = end + 3
      continue
    }
    if (text.startsWith('<![CDATA[', foundAt)) {
      const end = text.indexOf(']]>', foundAt + 9)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated CDATA section') }
      const frame = stack[stack.length - 1]
      if (frame === undefined) {
        return { ok: false, fault: fault('', 'a CDATA section outside the root element') }
      }
      frame.texts.push(text.slice(foundAt + 9, end))
      foundAt = end + 3
      continue
    }
    if (text.startsWith('<!DOCTYPE', foundAt)) {
      return {
        ok: false,
        fault: fault('', 'a DOCTYPE declaration (FR-023 disables external entities, MUST)'),
      }
    }
    if (text.startsWith('<?', foundAt)) {
      const end = text.indexOf('?>', foundAt + 2)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated processing instruction') }
      foundAt = end + 2
      continue
    }
    if (text.startsWith('</', foundAt)) {
      const end = text.indexOf('>', foundAt + 2)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated end tag') }
      const name = text.slice(foundAt + 2, end).trim()
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
      foundAt = end + 1
      continue
    }

    const started = readStartTag(text, foundAt, where())
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
    foundAt = started.after
  }

  if (stack.length > 0) return { ok: false, fault: fault(where(), 'an element that was never closed') }
  if (root === null) return { ok: false, fault: fault('', 'no element at all') }
  return { ok: true, root }
}

type StartTagReading =
  | { readonly ok: true; readonly name: string; readonly isEmpty: boolean; readonly after: number }
  | { readonly ok: false; readonly fault: MspdiFault }

/**
 * One start tag. ⛔ An attribute other than a namespace declaration is refused:
 * the XSD declares no `xsd:attribute` (grep mspdi_pj12.xsd), so `carry` and
 * `carryElements` have no room for one and it would vanish on the way back.
 *
 * @purity pure
 */
function readStartTag(text: string, from: number, path: string): StartTagReading {
  let foundAt = from + 1
  const first = text[foundAt]
  if (first === undefined || !NAME_START.test(first)) {
    return { ok: false, fault: fault(path, 'a `<` that does not start an element name') }
  }
  let end = foundAt + 1
  while (end < text.length) {
    const character = text[end]
    if (character === undefined || !NAME_REST.test(character)) break
    end += 1
  }
  const name = localName(text.slice(foundAt, end))
  foundAt = end

  for (;;) {
    while (foundAt < text.length && /\s/.test(text[foundAt] ?? '')) foundAt += 1
    if (text.startsWith('/>', foundAt)) return { ok: true, name, isEmpty: true, after: foundAt + 2 }
    if (text.startsWith('>', foundAt)) return { ok: true, name, isEmpty: false, after: foundAt + 1 }
    const attributeStart = foundAt
    while (foundAt < text.length && NAME_REST.test(text[foundAt] ?? '')) foundAt += 1
    const attributeName = text.slice(attributeStart, foundAt)
    if (attributeName === '') {
      return { ok: false, fault: fault(path, `an unterminated start tag <${name}>`) }
    }
    while (foundAt < text.length && /\s/.test(text[foundAt] ?? '')) foundAt += 1
    if (text[foundAt] !== '=') {
      return { ok: false, fault: fault(path, `an attribute ${attributeName} with no value`) }
    }
    foundAt += 1
    while (foundAt < text.length && /\s/.test(text[foundAt] ?? '')) foundAt += 1
    const quote = text[foundAt]
    if (quote !== '"' && quote !== "'") {
      return { ok: false, fault: fault(path, `an unquoted attribute ${attributeName}`) }
    }
    const close = text.indexOf(quote, foundAt + 1)
    if (close < 0) {
      return { ok: false, fault: fault(path, `an unterminated attribute ${attributeName}`) }
    }
    foundAt = close + 1
    if (attributeName !== 'xmlns' && !attributeName.startsWith('xmlns:')) {
      return {
        ok: false,
        fault: fault(path, `the attribute ${attributeName}, which the official schema does not declare`),
      }
    }
  }
}

/**
 * A qualified name without its prefix, so a prefixed and a default namespace
 * read the same (FR-021).
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
 * One element and everything under it, indented; iterative for the same reason
 * as `readXml`.
 *
 * @purity pure
 */
function writtenXml(root: XmlElement, namespace: string): string {
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n']
  // No BOM (CN-5 of table T-003).
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
 * trimmed or reformatted (FR-054, EX-4 of table T-033).
 *
 * @purity pure
 */
function textColumn(element: XmlElement, name: string): string | null {
  const child = childOf(element, name)
  return child === null ? null : leafText(child)
}

/** @purity pure */
function integerColumn(element: XmlElement, name: string): number | null {
  return wholeNumberOf(textColumn(element, name))
}

/**
 * One `xsd:integer` the document can hold, or `null` when the text is not one.
 * Separate from `integerColumn` so a value inside a `CarryElement` (AT-125) is
 * read by the same rule.
 *
 * @purity pure
 */
function wholeNumberOf(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const trimmed = raw.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

/**
 * An `xsd:boolean` in any of its four spellings. ⚠️ Anything else is `null`,
 * not `false`, so it is not mistaken for a value that said false (FR-024).
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
 * The minutes an `xsd:duration` names, or null for years or months (FR-054).
 * `xsd:duration` has no weeks.
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
 * The spelling EX-9 of table T-033 fixes for a length of working time.
 *
 * @purity pure
 */
function durationOfMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  return `PT${Math.floor(whole / 60)}H${whole % 60}M0S`
}

/**
 * The minutes one working day stands for (FR-054, S-128 of table T-209).
 * Takes the number, not a `Project`: reading draws it from the file and
 * writing from the document (see `tasksFromRoot`).
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
 * One element's children that did not become columns (DF-2 of table T-053).
 */
interface CarrySplit {
  readonly carry: Readonly<Record<string, string>>
  readonly carryElements: readonly CarryElement[]
}

/**
 * Split one element's children into what was understood and what was not.
 * `ordinal` counts every child of the owner (AT-123), not only the carried
 * ones, so `splicedCarriedRows` can put a carried row back where it stood.
 *
 * @purity pure
 */
function carrySplit(element: XmlElement, consumed: readonly string[]): CarrySplit {
  const carry: Record<string, string> = {}
  const carryElements: CarryElement[] = []
  element.children.forEach((child, ordinal) => {
    if (consumed.includes(child.name)) return
    if (child.children.length === 0) {
      // ⚠️ The last spelling wins when a scalar arrives twice. The schema
      // declares each once; refusing a repeat is CP-13's call, not this file's.
      carry[child.name] = child.text
      return
    }
    carryElements.push(carriedElement(child, ordinal))
  })
  return { carry, carryElements }
}

/**
 * One element GRS does not interpret, kept in its original form (DF-2 of table
 * T-053).
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
 * ⚠️ STOP -- leaves go out before element children, which is the schema's
 * order for `ExtendedAttribute` and `TimephasedData` but not for `Baseline`,
 * `OutlineCodes/OutlineCode` or `WorkWeeks/WorkWeek` (every `xsd:sequence` in
 * mspdi_pj12.xsd checked). `CarryElement` has no column ordering `fields`
 * (AT-125) against `children` (AT-126).
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
 * The children of one element in the order the official XSD declares them,
 * ties broken by `ordinal` (AT-123).
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
 * Where the schema declares this name among its parent's children. An
 * undeclared name ranks last: misplacing it loses less than dropping it.
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
 * A column written only when it holds something -- unlike FR-024's `GRS JSON`,
 * because an empty element would tell the partner's tool the value IS empty.
 *
 * @purity pure
 */
function optionalLeaf(name: string, value: string | number | boolean | null): PlacedChild[] {
  if (value === null) return []
  if (typeof value === 'boolean') return [leaf(name, value ? '1' : '0')]
  return [leaf(name, String(value))]
}

// -------------------------------------------- the two borrowed frames -------

/**
 * AT-40 and AT-41.
 */
type FadeColumn = 'fadeInDays' | 'fadeOutDays'

/** One row of the roster EX-6 of table T-033 searches. */
interface CustomFieldFrame {
  /** The exchange partner's own name for the frame, for a notice to quote. */
  readonly name: string
  /**
   * `FieldID`, the only thing a value carries (EX-6).
   */
  readonly fieldId: number
  /** Which column asks for this frame first. */
  readonly prefers: string
  /**
   * The word written into the definition's `Alias` (EX-6). ⛔ May be empty; see
   * `isAliasUsable`.
   */
  readonly alias: string
}

/**
 * The roster, and the two numbers with it. ⛔ No frame number is written in
 * this file: `docs/spec/_source/mspdi-custom-fields.json` owns them and
 * `npm run gen` prints the copy imported above (rule 03 section 1).
 *
 * Reading `customFields` does not make a function `semi-pure-a`: it is a
 * module constant compiled into the program.
 */
const CUSTOM_FIELD_FRAMES: readonly CustomFieldFrame[] = customFields.frames

/**
 * Where a notice about the frames points: the definition collection EX-6 and
 * EX-8 are about (NT-1 of table T-037).
 */
const EXTENDED_ATTRIBUTES_AT = '/Project/ExtendedAttributes'

/**
 * The column a roster `prefers` names, or `null`. The generated roster is
 * still read as data, so a third name must not become one of these two.
 *
 * @purity pure
 */
function fadeColumnOf(prefers: string): FadeColumn | null {
  if (prefers === 'fadeInDays') return 'fadeInDays'
  if (prefers === 'fadeOutDays') return 'fadeOutDays'
  return null
}

/**
 * The word this column is known by, or `''` when the roster has none. It
 * belongs to the column, not the frame, so a column EX-6 moved to another
 * frame is still found by the reader.
 *
 * @purity pure
 */
function aliasOfColumn(column: FadeColumn): string {
  return CUSTOM_FIELD_FRAMES.find((frame) => frame.prefers === column)?.alias ?? ''
}

/**
 * Whether a frame may be claimed at all. ⛔ Not with an empty alias: without a
 * word, GRS's definition and the partner's look the same, and EX-6 turns on
 * telling them apart. Nor past mspdi_pj12.xsd:1055's length (EX-1).
 *
 * @purity pure
 */
function isAliasUsable(alias: string): boolean {
  // Code points, which is what `xsd:maxLength` counts.
  return alias !== '' && [...alias].length <= customFields.aliasMaxLength
}

/**
 * The custom-field definitions that arrived, where DF-2 of table T-053 put
 * them; only their `Alias` is read (EX-6).
 *
 * @purity pure
 */
function carriedDefinitions(carried: readonly CarryElement[]): readonly CarryElement[] {
  const collection = carried.find((one) => one.name === 'ExtendedAttributes')
  if (collection === undefined) return []
  return collection.children.filter((one) => one.name === 'ExtendedAttribute')
}

// -------------------------------------------------------------- importing ---

/**
 * Everything one pass of the reader accumulates besides the document. Made
 * inside the one entry and never escaping it, so writing into it stays `pure`.
 */
interface ImportRun {
  readonly notices: MspdiNotice[]
  /**
   * How many `Task`s had an `ActualDuration` rounded; see
   * `tellRoundedActualDurations`.
   */
  roundedActualDurationCount: number
}

/**
 * Read one MSPDI text into a document.
 *
 * `current` supplies what no MSPDI holds: DR-3's group, DR-4's stamp and
 * change log (ET-16 / ET-17 of table T-056), and DR-5's `themeHue`. ⚠️ Its
 * schedule is not merged in; merging is FR-056's, in ImportDocument (CP-10).
 *
 * @purity pure
 */
export function documentFromMspdi(text: string, current: Document): MspdiDecoding {
  const reading = readXml(withoutLeadingByteOrderMark(text))
  if (!reading.ok) return { ok: false, faults: [reading.fault] }
  const root = reading.root
  if (root.name !== 'Project') {
    return {
      ok: false,
      faults: [fault('', `the root element is <${root.name}>, not <Project> (mspdi_pj12.xsd)`)],
    }
  }

  const run: ImportRun = { notices: [], roundedActualDurationCount: 0 }
  const schedule = scheduleFromRoot(root, current, run)
  return {
    ok: true,
    notices: run.notices,
    document: {
      schemaVersion: current.schemaVersion,
      schedule,
      documentSettings: current.documentSettings,
      documentStamp: current.documentStamp,
      changeLog: current.changeLog,
    },
  }
}

/**
 * A leading byte order mark (FR-023). Written as an escape, not the character
 * itself (rule 03 section 5).
 */
export const BYTE_ORDER_MARK = '\uFEFF'

/**
 * FR-023. ⛔ Only the leading mark goes; a `U+FEFF` anywhere else is content.
 *
 * Shared with `json-codec.ts` and `document-codec.ts` (OP-12) rather than
 * copied, so two intake paths cannot part over FR-023's MUST NOT; it lives here
 * because table T-075 gives the component no unit of its own for it.
 *
 * @purity pure
 */
export function withoutLeadingByteOrderMark(text: string): string {
  return text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text
}

/** @purity pure */
function scheduleFromRoot(root: XmlElement, current: Document, run: ImportRun): Schedule {
  const calendarsRead = calendarsFromRoot(root, run)
  const tasksRead = tasksFromRoot(root, run)
  const resourcesRead = resourcesFromRoot(root, run)
  const assignmentsRead = assignmentsFromRoot(root, run)
  const rows = rowsFromTasks(tasksRead.tasks, current.documentSettings.maxGroupDepth)

  // DF-3 of table T-053: rows that did not become rows go on `Project`.
  const project = projectFromRoot(root, current, [
    ...calendarsRead.carriedRows,
    ...tasksRead.carriedRows,
    ...resourcesRead.carriedRows,
    ...assignmentsRead.carriedRows,
  ], tasksRead.outlineBase)
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
    // Empty on purpose: ET-11, ET-13, ET-14 and ET-18 have no MSPDI element, and
    // `taskOrigins` is CP-10's (see the header).
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }
}

/**
 * `Project`'s own columns. `carriedRows` are the collections' rows that did not
 * become rows (DF-3 of table T-053).
 *
 * @purity pure
 */
function projectFromRoot(
  root: XmlElement,
  current: Document,
  carriedRows: readonly CarryElement[],
  outlineBase: number,
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
    // AT-17. ⛔ Not converted; see the header.
    weekStartDay: integerColumn(root, 'WeekStartDay'),
    calendarUid: integerColumn(root, 'CalendarUID'),      // AT-18
    // AT-19 to AT-21 have no MSPDI element, so they come from `current`; see the
    // header for `importSeq`.
    themeHue: current.schedule.project.themeHue,
    uidHighWaterMark: current.schedule.project.uidHighWaterMark,
    importSeq: current.schedule.project.importSeq,
    carry: split.carry,                                   // AT-22
    carryElements: [...split.carryElements, ...carriedRows], // AT-23
    // AT-139 has no MSPDI element; `outlineBaseOf` measures it off `<Tasks>`.
    outlineBase,                                          // AT-139
  }
}

/**
 * What `projectFromRoot` has accounted for; the four collections are listed so
 * their rows are not carried a second time.
 */
const PROJECT_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Title', 'Subject', 'Category', 'Company', 'Manager', 'Author',
  'CreationDate', 'Revision', 'LastSaved', 'StartDate', 'StatusDate', 'MinutesPerDay',
  'MinutesPerWeek', 'DaysPerMonth', 'WeekStartDay', 'CalendarUID',
  'Calendars', 'Tasks', 'Resources', 'Assignments',
]

/**
 * `ID`, `OutlineLevel`, `OutlineNumber` and `Summary` are consumed, not carried:
 * DV-4 to DV-7 of table T-059 rebuild them, and a carried copy too would give
 * two answers with no rule for which wins.
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
  /** AT-139. */
  readonly outlineBase: number
}

/**
 * AT-139 (FR-021), read over the whole collection.
 *
 * @purity pure
 */
function outlineBaseOf(collection: XmlElement): number {
  for (const element of collection.children) {
    if (element.name !== 'Task') continue
    if (isTrue(element, 'IsNull')) continue
    if (integerColumn(element, 'OutlineLevel') === 0) return 0
  }
  return 1
}

/**
 * Every `Task`, and the elements under `<Tasks>` that are not tasks.
 *
 * An EX-5 empty row (`Task/IsNull`) and a `Task` with no `UID` are carried whole
 * (DF-3 of table T-053). ⛔ Not dropped (FR-021), and not a refusal of the file:
 * FR-023 does not list a missing UID, and FR-012's note on EX-5 forbids losing
 * a file over one row.
 *
 * @purity pure
 */
function tasksFromRoot(root: XmlElement, run: ImportRun): TasksReading {
  const collection = childOf(root, 'Tasks')
  if (collection === null) return { tasks: [], carriedRows: [], outlineBase: 1 }
  // The file's own `Project/MinutesPerDay`, ⛔ not the standing document's:
  // dividing by one number and multiplying back by another loses the column.
  const minutesPerDay = minutesPerWorkingDay(integerColumn(root, 'MinutesPerDay'))
  // EX-6, once: the definitions are the project's, not each task's.
  const fadeColumns = fadeColumnsByFieldId(root)
  // Once for the whole collection, so every task of one file shares one base.
  const outlineBase = outlineBaseOf(collection)
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
      // No primary key (AT-24): carried whole, with a notice (NT-5 of table T-037).
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Tasks/Task[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a task',
      ))
      return
    }
    const level = integerColumn(element, 'OutlineLevel')
    // Depth counts from the file's own base (AT-139). ⚠️ A missing
    // `OutlineLevel`, or one shallower than the base, reads as a root: the only
    // reading that keeps every task in the tree (FR-058).
    const shifted = level === null ? 1 : level - outlineBase + 1
    const depth = shifted < 1 ? 1 : shifted
    const parentIndex = lastIndexShallowerThan(levels, depth)
    const parentUid = parentIndex === null ? null : uids[parentIndex] ?? null
    const wbsOrder = countOfChildrenSoFar(levels, uids, parentIndex, depth)
    levels.push(depth)
    uids.push(uid)
    tasks.push(taskFromElement(
      element, uid, parentUid, wbsOrder, minutesPerDay, fadeColumns, ordinal, run,
    ))
  })
  tellRoundedActualDurations(run)
  return { tasks, carriedRows, outlineBase }
}

/**
 * FR-054's count of rounded `Task`s, told as ONE notice once every task is
 * read: a notice per task would bury a large file and never say how many.
 * Silent when nothing was rounded.
 *
 * @purity pure
 */
function tellRoundedActualDurations(run: ImportRun): void {
  const rounded = run.roundedActualDurationCount
  if (rounded === 0) return
  run.notices.push(notice(
    '/Project/Tasks',
    `${rounded} Task${rounded === 1 ? '' : 's'} carried an actual duration that is not`
      + ' a whole number of working days, and each was rounded to whole working days'
      + ' -- what the file states is no longer exactly what this document holds',
  ))
}

/**
 * Which frame carries which fade column in this file, by the definitions'
 * `Alias` (EX-6): by number alone, the partner's own value in the same frame
 * would be read as a count of days. `isAliasUsable` keeps an empty word from
 * matching every definition that has no alias.
 *
 * @purity pure
 */
function fadeColumnsByFieldId(root: XmlElement): ReadonlyMap<number, FadeColumn> {
  const claimed = new Map<number, FadeColumn>()
  const collection = childOf(root, 'ExtendedAttributes')
  if (collection === null) return claimed
  const columnOfAlias = new Map<string, FadeColumn>()
  const knownFieldIds = new Set<number>()
  for (const frame of CUSTOM_FIELD_FRAMES) {
    knownFieldIds.add(frame.fieldId)
    const column = fadeColumnOf(frame.prefers)
    if (column === null || !isAliasUsable(frame.alias)) continue
    columnOfAlias.set(frame.alias, column)
  }
  if (columnOfAlias.size === 0) return claimed
  for (const definition of collection.children) {
    if (definition.name !== 'ExtendedAttribute') continue
    const fieldId = integerColumn(definition, 'FieldID')
    const column = columnOfAlias.get(textColumn(definition, 'Alias') ?? '')
    if (fieldId === null || column === undefined || !knownFieldIds.has(fieldId)) continue
    claimed.set(fieldId, column)
  }
  return claimed
}

/**
 * The nearest earlier task shallower than `depth`: this task's WBS parent
 * (AT-25).
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
  fadeColumns: ReadonlyMap<number, FadeColumn>,
  ordinal: number,
  run: ImportRun,
): Task {
  const split = carrySplit(element, TASK_CONSUMED)
  const fade = fadeOfCarried(split.carryElements, fadeColumns)
  const foundAt = `/Project/Tasks/Task[${ordinal + 1}]`
  return {
    uid,                                                    // AT-24
    wbsParentUid,                                           // AT-25
    wbsOrder,                                               // AT-26
    name: textColumn(element, 'Name'),                      // AT-27
    // AT-28, AT-29, AT-34, AT-36 and AT-37 keep their arriving text (FR-054).
    start: textColumn(element, 'Start'),
    finish: textColumn(element, 'Finish'),
    milestone: booleanColumn(element, 'Milestone'),         // AT-30
    deadline: textColumn(element, 'Deadline'),              // AT-31
    notes: textColumn(element, 'Notes'),                    // AT-32
    calendarUid: integerColumn(element, 'CalendarUID'),     // AT-33
    actualStart: textColumn(element, 'ActualStart'),
    actualDuration: workingDaysOfActualDuration(element, minutesPerDay, foundAt, run), // AT-35
    actualFinish: textColumn(element, 'ActualFinish'),
    resume: textColumn(element, 'Resume'),
    resumeValid: booleanColumn(element, 'ResumeValid'),     // AT-38
    percentComplete: integerColumn(element, 'PercentComplete'), // AT-39
    // AT-40 and AT-41, from the frames EX-6 recognised (none while the roster's
    // aliases are empty).
    fadeInDays: fade.fadeInDays,
    fadeOutDays: fade.fadeOutDays,
    dependencies: dependenciesFromTask(element),            // AT-42
    carry: split.carry,                                     // AT-43
    carryElements: fade.carryElements,                      // AT-44
  }
}

/** AT-40 and AT-41, and what is left to carry once they are taken out. */
interface FadeReading {
  readonly fadeInDays: number | null
  readonly fadeOutDays: number | null
  readonly carryElements: readonly CarryElement[]
}

/**
 * Take the fade days out of one task's extended attributes. A claimed value
 * leaves `carryElements`, or the writer would write it twice. A `Value` that
 * is not a whole number stays carried; judging it is CP-13's, not this file's.
 *
 * @purity pure
 */
function fadeOfCarried(
  carried: readonly CarryElement[],
  fadeColumns: ReadonlyMap<number, FadeColumn>,
): FadeReading {
  let fadeInDays: number | null = null
  let fadeOutDays: number | null = null
  const rest: CarryElement[] = []
  for (const one of carried) {
    const fieldId = one.name === 'ExtendedAttribute'
      ? wholeNumberOf(one.fields['FieldID'])
      : null
    const column = fieldId === null ? undefined : fadeColumns.get(fieldId)
    const days = column === undefined ? null : wholeNumberOf(one.fields['Value'])
    if (days === null) {
      rest.push(one)
      continue
    }
    if (column === 'fadeInDays') fadeInDays = days
    else fadeOutDays = days
  }
  return { fadeInDays, fadeOutDays, carryElements: rest }
}

/**
 * AT-35's conversion (FR-054). Rounded by magnitude and sign because
 * `Math.round` sends a negative half toward zero.
 *
 * ⛔ `ActualDuration` is consumed, not carried, so returning `null` deletes what
 * the partner wrote. This only counts; `tellRoundedActualDurations` tells.
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
  if (Number.isInteger(days)) return days
  run.roundedActualDurationCount += 1
  return Math.sign(days) * Math.round(Math.abs(days))
}

/**
 * The links held under this task, their successor (DF-4 of table T-053).
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
    // EX-5's empty row, marked the same way (mspdi_pj12.xsd, Resource/IsNull).
    if (isTrue(element, 'IsNull')) {
      carriedRows.push(carriedElement(element, ordinal))
      return
    }
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      // DF-3 again: no primary key (AT-85). See `tasksFromRoot`.
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
      // AT-73. ⛔ Not converted; see the header.
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
      // FR-054's notice for a repeating exception: told, not refused (NT-5 of
      // table T-037).
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
 * `Exception/Type` 9, no repetition (mspdi_pj12.xsd:1378; AT-82).
 */
const NO_RECURRENCE = 9

// ------------------------------------------------- rows for the tasks -------

interface ImportedRows {
  readonly taskGroups: readonly TaskGroup[]
  readonly taskGroupMembers: readonly TaskGroupMember[]
}

/**
 * FR-058's rows. The row tree mirrors the WBS down to `S-125` of table T-211;
 * a deeper task joins its deepest ancestor's row, making that row a stack.
 * Rows are named from their task (IV-8 of table T-220), every task gets one
 * member (IV-6), and `stackOrder` stays null (AT-62).
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
 * The row of the nearest ancestor that has one. ⚠️ Bounded by the task count:
 * CP-13, which refuses a `wbsParentUid` ring, has not run yet.
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
 * The row identifier a task's row gets. AT-51 fixes only the form, and a
 * `pure` function may not mint a random UUID (R7.1), so it is derived from the
 * task's UID (unique by IV-1 of table T-220) in the version-4 layout.
 * Deterministic so that importing one file twice gives the same row ids.
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
 * Write one document as MSPDI. ⚠️ See the STOP note on `Task/ID` in
 * `writtenTask`.
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
  // EX-6 first: the frames decide both the tasks' values and the definitions
  // (EX-8).
  const frames = claimedFrames(schedule, run)
  const definitions = writtenFadeDefinitions(frames, project.carryElements, project.carry)
  const named: PlacedChild[] = [
    // The two `Project` children mspdi_pj12.xsd requires (no `minOccurs`, :232,
    // :390; EX-1). An imported file has them in `carry` (DV-3, EX-2), so only a
    // document GRS made itself reaches these constants.
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
    // DV-1 of table T-059, ⚠️ only when the file brought none: a carried
    // `FinishDate` is the partner's own (EX-2).
    ...(project.carry['FinishDate'] === undefined
      ? optionalLeaf('FinishDate', latestTaskFinish(schedule))
      : []),
    // EX-8, only when the file did not bring them.
    ...definitions.named,
  ]
  // ⚠️ Spliced before the length test: a file whose only `Calendar` had no UID
  // would otherwise lose its `<Calendars>`.
  const calendars = splicedCarriedRows(
    schedule.calendars.map(writtenCalendar), project.carryElements, 'Calendar',
  )
  if (calendars.length > 0) named.push(collection('Calendars', calendars))
  const tasks = writtenTasks(schedule, frames, run)
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
    definitions.carry,
    // ⛔ Collection rows are written inside their collection above; the schema
    // declares no `Project/Task`, so the name tells them apart.
    definitions.carried.filter((one) => !isCarriedRow(one)),
  )
}

/**
 * Whether this carried element is a collection's row, which DF-3 of table T-053
 * also puts on `Project`.
 *
 * @purity pure
 */
function isCarriedRow(carried: CarryElement): boolean {
  return CARRIED_ROW_NAMES.includes(carried.name)
}

const CARRIED_ROW_NAMES: readonly string[] = ['Calendar', 'Task', 'Resource', 'Assignment']

/** One fade column and the frame EX-6's search gave it. */
interface ClaimedFrame {
  readonly column: FadeColumn
  /** The frame actually used, which is not always the preferred one. */
  readonly fieldId: number
  /**
   * The column's word, not the frame's; see `aliasOfColumn`.
   */
  readonly alias: string
}

/**
 * EX-6's search: which frame each fade column is written to. Notices are
 * raised only for a column that has a value to write; anything else is noise.
 *
 * @purity pure
 */
function claimedFrames(schedule: Schedule, run: ExportRun): readonly ClaimedFrame[] {
  const inUse = new Set<FadeColumn>()
  for (const task of schedule.tasks) {
    if (task.fadeInDays !== null) inUse.add('fadeInDays')
    if (task.fadeOutDays !== null) inUse.add('fadeOutDays')
  }
  if (inUse.size === 0) return []

  const spokenFor = aliasesOfDefinitions(schedule.project.carryElements)
  const claimed: ClaimedFrame[] = []
  for (const preferred of CUSTOM_FIELD_FRAMES) {
    const column = fadeColumnOf(preferred.prefers)
    if (column === null || !inUse.has(column)) continue
    const alias = aliasOfColumn(column)
    if (!isAliasUsable(alias)) {
      run.notices.push(notice(EXTENDED_ATTRIBUTES_AT, `${column} was not written: `
        + 'the roster mspdi-custom-fields.json states no usable Alias for it, and '
        + 'without one a frame GRS wrote cannot be told from one the import '
        + 'source wrote (EX-6)'))
      continue
    }
    const free = [preferred, ...CUSTOM_FIELD_FRAMES].find((frame) => {
      const standing = spokenFor.get(frame.fieldId)
      return (standing === undefined || standing === alias)
        && !claimed.some((one) => one.fieldId === frame.fieldId)
    })
    if (free === undefined) {
      run.notices.push(notice(EXTENDED_ATTRIBUTES_AT, `${column} was not written: `
        + 'every frame of the roster is spoken for (EX-6)'))
      continue
    }
    if (free !== preferred) {
      run.notices.push(notice(EXTENDED_ATTRIBUTES_AT,
        `${column} was written to ${free.name} because ${preferred.name} is already spoken for`))
    }
    claimed.push({ column, fieldId: free.fieldId, alias })
  }
  return claimed
}

/**
 * The `Alias` standing against each roster frame in the file that arrived. A
 * frame is free for a column only with no definition or one carrying that
 * column's alias; "any roster word" would let one fade column evict the other.
 * A person renaming the alias makes GRS skip its own frame, which is safe.
 *
 * @purity pure
 */
function aliasesOfDefinitions(carried: readonly CarryElement[]): ReadonlyMap<number, string> {
  const knownFieldIds = new Set(CUSTOM_FIELD_FRAMES.map((frame) => frame.fieldId))
  const aliases = new Map<number, string>()
  for (const definition of carriedDefinitions(carried)) {
    const fieldId = wholeNumberOf(definition.fields['FieldID'])
    if (fieldId === null || !knownFieldIds.has(fieldId)) continue
    aliases.set(fieldId, definition.fields['Alias'] ?? '')
  }
  return aliases
}

/** What EX-8 adds to `Project`, and the carried values it had to take over. */
interface FadeDefinitions {
  readonly carry: Readonly<Record<string, string>>
  readonly carried: readonly CarryElement[]
  readonly named: readonly PlacedChild[]
}

/**
 * EX-8: the definition of every frame this write uses, once. A definition the
 * file brought stays where it arrived (EX-2); a missing one is appended to the
 * arrived collection, since `Project` holds a single `<ExtendedAttributes>`.
 *
 * ⚠️ An empty `<ExtendedAttributes>` that arrived was filed as a scalar by
 * `carrySplit`; it is written back while no frame is claimed and dropped when
 * one is.
 *
 * @purity pure
 */
function writtenFadeDefinitions(
  frames: readonly ClaimedFrame[],
  carried: readonly CarryElement[],
  carry: Readonly<Record<string, string>>,
): FadeDefinitions {
  const unchanged: FadeDefinitions = { carry, carried, named: [] }
  if (frames.length === 0) return unchanged
  const present = carriedDefinitions(carried)
  const missing = frames.filter((claimed) => !present.some(
    (one) => wholeNumberOf(one.fields['FieldID']) === claimed.fieldId
      && one.fields['Alias'] === claimed.alias,
  ))
  if (missing.length === 0) return unchanged

  const foundAt = carried.findIndex((one) => one.name === 'ExtendedAttributes')
  const collection = foundAt < 0 ? undefined : carried[foundAt]
  if (collection === undefined) {
    const children = missing.map((claimed, index) => writtenCarriedElement(
      definitionOfFrame(claimed, index),
    ))
    const { ExtendedAttributes: _takenOver, ...rest } = carry
    return {
      carry: rest,
      carried,
      named: [{ element: { name: 'ExtendedAttributes', text: '', children }, ordinal: 0 }],
    }
  }
  const nextOrdinal = collection.children.reduce((top, one) => Math.max(top, one.ordinal + 1), 0)
  const grown: CarryElement = {
    ...collection,
    children: [
      ...collection.children,
      ...missing.map((claimed, index) => definitionOfFrame(claimed, nextOrdinal + index)),
    ],
  }
  return {
    carry,
    carried: carried.map((one, index) => (index === foundAt ? grown : one)),
    named: [],
  }
}

/**
 * One custom-field definition. ⚠️ The keys below are in the order
 * mspdi_pj12.xsd:991 declares (EX-8): `writtenCarriedElement` writes `fields`
 * in insertion order. `UserDef` is written from here because it states that
 * GRS made the definition; `CFType` and `ElemType` are the roster's. Built as
 * a `CarryElement` so arrived and built definitions share one writer.
 *
 * @purity pure
 */
function definitionOfFrame(claimed: ClaimedFrame, ordinal: number): CarryElement {
  return {
    ordinal,
    name: 'ExtendedAttribute',
    fields: {
      FieldID: String(claimed.fieldId),
      CFType: String(customFields.cfType),
      ElemType: String(customFields.elemType),
      UserDef: '1',
      Alias: claimed.alias,
    },
    children: [],
  }
}

/**
 * AT-40 and AT-41 as `Task/ExtendedAttribute` values, in the frames EX-6 chose.
 *
 * ⚠️ STOP -- they go after everything the task carried, so a file that put a
 * claimed value ahead of an uninterpreted one comes back reordered, and NR-1
 * of table T-228 keeps sibling order. Closing it needs a column on `Task`
 * (table T-058), not a choice this file may make.
 *
 * @purity pure
 */
function writtenFadeValues(task: Task, frames: readonly ClaimedFrame[]): PlacedChild[] {
  const afterCarried = task.carryElements.reduce((top, one) => Math.max(top, one.ordinal + 1), 0)
  const placed: PlacedChild[] = []
  for (const claimed of frames) {
    const days = task[claimed.column]
    if (days === null) continue
    placed.push({
      element: {
        name: 'ExtendedAttribute',
        text: '',
        children: [
          { name: 'FieldID', text: String(claimed.fieldId), children: [] },
          { name: 'Value', text: String(days), children: [] },
        ],
      },
      ordinal: afterCarried + placed.length,
    })
  }
  return placed
}

/**
 * `Project/SaveVersion` for a document GRS made itself: this software's major
 * version (package.json `version`), since DV-2 of table T-059 wants the
 * writer's version and no row states it. ⛔ Not 12, which mspdi_pj12.xsd:234
 * documents as Project 2007.
 */
const GRS_SAVE_VERSION = '0'

/**
 * `Project/CurrencyCode` for a document GRS made itself (DV-3 has no `carry`
 * to take it from): ISO 4217's "no currency", the code set mspdi_pj12.xsd:392
 * names. ⛔ Not a real currency: no column of table T-058 holds money.
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
 * The `<Tasks>` rows, with the EX-5 empty rows and the UID-less rows DF-3 of
 * table T-053 carried spliced back in by `ordinal`.
 *
 * @purity pure
 */
function writtenTasks(
  schedule: Schedule,
  frames: readonly ClaimedFrame[],
  run: ExportRun,
): readonly XmlElement[] {
  // HM-9 of table T-015a leaves here. ⛔ Not `schedule.tasks` as held:
  // `tasksRankedByTheRowTree` rewrites `wbsOrder` without moving the collection.
  const ordered = tasksInWbsOrder(schedule.tasks)
  // `ID`, `OutlineLevel` and `OutlineNumber` are all written on the file's own
  // base (AT-139).
  const base = schedule.project.outlineBase
  const outlineLevels = new Map<number, number>()
  for (const [uid, depth] of taskDepths(ordered)) outlineLevels.set(uid, depth - 1 + base)
  const numbers = outlineNumbers(ordered, base)
  const hasChildren = new Set(
    ordered.map((task) => task.wbsParentUid).filter((uid): uid is number => uid !== null),
  )
  const minutesPerDay = minutesPerWorkingDay(schedule.project.minutesPerDay)
  const written = ordered.map((task, index) => writtenTask(
    task, schedule, index, base, outlineLevels, numbers, hasChildren, minutesPerDay,
    frames, run,
  ))
  return splicedCarriedRows(written, schedule.project.carryElements, 'Task')
}

/**
 * The tasks in the order they leave: a walk of the WBS tree, siblings by
 * `wbsOrder` (AT-26), which `tasksRankedByTheRowTree` already ranked for HM-9
 * of table T-015a; ranking again here would give one rule two homes.
 *
 * A walk, not a flat sort, so a child follows its parent and DV-5 / DV-6 do
 * not jump. Iterative, for the reason `readXml` gives (S-115 of table T-211).
 * A task the walk never reaches (a ring) is appended, not dropped (FR-021). A
 * null `wbsOrder` sorts last, where `tasksRankedByTheRowTree` puts a task no
 * row draws.
 *
 * @purity pure
 */
function tasksInWbsOrder(tasks: readonly Task[]): readonly Task[] {
  if (tasks.length < 2) return tasks
  const known = new Set(tasks.map((task) => task.uid))
  // A parent no task in this document has is not a parent: the task is walked
  // as a root.
  const family = new Map<number | null, Task[]>()
  for (const task of tasks) {
    const parent =
      task.wbsParentUid !== null && known.has(task.wbsParentUid) ? task.wbsParentUid : null
    const kin = family.get(parent)
    if (kin === undefined) family.set(parent, [task])
    else kin.push(task)
  }
  for (const kin of family.values()) kin.sort((a, b) => rankOfSibling(a) - rankOfSibling(b))

  const out: Task[] = []
  const seen = new Set<number>()
  const stack: Task[] = [...(family.get(null) ?? [])].reverse()
  while (stack.length > 0) {
    const task = stack.pop()
    if (task === undefined) break
    if (seen.has(task.uid)) continue
    seen.add(task.uid)
    out.push(task)
    const kin = family.get(task.uid) ?? []
    for (let index = kin.length - 1; index >= 0; index -= 1) {
      const child = kin[index]
      if (child !== undefined && !seen.has(child.uid)) stack.push(child)
    }
  }
  for (const task of tasks) if (!seen.has(task.uid)) out.push(task)
  return out
}

/** @purity pure */
function rankOfSibling(task: Task): number {
  return task.wbsOrder ?? Number.MAX_SAFE_INTEGER
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
    const foundAt = Math.min(Math.max(row.ordinal, 0), out.length)
    out.splice(foundAt, 0, writtenCarriedElement(row))
  }
  return out
}

/**
 * How deep each task sits in the WBS, the root at 1 (S-115 of table T-211);
 * DV-5 writes it. ⚠️ Bounded: a document in hand may hold a ring.
 *
 * @purity pure
 */
function taskDepths(tasks: readonly Task[]): ReadonlyMap<number, number> {
  const parents = new Map<number, number | null>()
  for (const task of tasks) parents.set(task.uid, task.wbsParentUid)
  const depths = new Map<number, number>()
  for (const task of tasks) {
    let depth = 1
    let foundAt = task.wbsParentUid
    for (let steps = 0; steps < tasks.length && foundAt !== null; steps += 1) {
      depth += 1
      foundAt = parents.get(foundAt) ?? null
    }
    depths.set(task.uid, depth)
  }
  return depths
}

/**
 * DV-6 of table T-059: the path through the tree, `1.2.3`.
 *
 * @purity pure
 */
function outlineNumbers(
  tasks: readonly Task[],
  base: number,
): ReadonlyMap<number, string> {
  const paths = new Map<number, readonly number[]>()
  const numbers = new Map<number, string>()
  const counters = new Map<string, number>()
  for (const task of tasks) {
    const parentKey = task.wbsParentUid === null ? '' : String(task.wbsParentUid)
    const next = (counters.get(parentKey) ?? 0) + 1
    counters.set(parentKey, next)
    const parentPath = task.wbsParentUid === null ? [] : paths.get(task.wbsParentUid) ?? []
    const path = [...parentPath, next]
    paths.set(task.uid, path)
    // A base of 0 means the partner leaves the level-0 row out of the numbering
    // (written `0`, children from `1`); dropping the path's first step says so.
    const shown = path.slice(1 - base)
    numbers.set(task.uid, shown.length === 0 ? '0' : shown.join('.'))
  }
  return numbers
}

/** @purity pure */
function writtenTask(
  task: Task,
  schedule: Schedule,
  index: number,
  base: number,
  outlineLevels: ReadonlyMap<number, number>,
  numbers: ReadonlyMap<number, string>,
  hasChildren: ReadonlySet<number>,
  minutesPerDay: number,
  frames: readonly ClaimedFrame[],
  run: ExportRun,
): XmlElement {
  const named: PlacedChild[] = [
    leaf('UID', String(task.uid)),
    // ⚠️ STOP -- `ID` and DV-5 to DV-7 are rebuilt for every task: exact for an
    // unedited file (FR-021), but EX-2's untouched tasks in an edited file are
    // not covered, since no column says which tasks a person touched.
    leaf('ID', String(index + base)),
    ...optionalLeaf('Name', task.name),
    ...optionalLeaf('OutlineNumber', numbers.get(task.uid) ?? null),
    ...optionalLeaf('OutlineLevel', outlineLevels.get(task.uid) ?? null),
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
    ...writtenFadeValues(task, frames),
  ]
  return {
    name: 'Task',
    text: '',
    children: writtenChildren('Task', named, task.carry, task.carryElements),
  }
}

/**
 * AT-35 written back (FR-054).
 *
 * @purity pure
 */
function writtenActualDuration(task: Task, minutesPerDay: number): PlacedChild[] {
  if (task.actualDuration === null) return []
  return [leaf('ActualDuration', durationOfMinutes(task.actualDuration * minutesPerDay))]
}

/**
 * DV-9: `Stop`, written only for a suspended task. A carried `Stop` wins (G-13
 * of table T-005) and `writtenChildren` writes it back from `carry`.
 *
 * ⚠️ `dateFromWorkingDays` throws for a calendar that works no day; the throw
 * becomes a notice (FR-028, R7.10).
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
    // EX-7 of table T-033; `textOfDay` owns the spelling.
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
      // DV-10.
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
    // AT-73's numbering; see the header.
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
  // Rebuilt around AT-79 / AT-80 rather than carried, in the partner's position
  // (DF-1 of table T-053).
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
