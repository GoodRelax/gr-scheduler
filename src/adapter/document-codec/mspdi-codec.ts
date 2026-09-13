// DocumentCodec, MSPDI half: reads and writes the exchange partner's XML, keeping the round trip.
// @unit      UF-36   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

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

export interface MspdiFault {
  readonly at: string
  readonly what: string
}

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

export interface MspdiEncoding {
  readonly text: string
  readonly notices: readonly MspdiNotice[]
}

// WHY: the XSD's namespace, not the one in the element reference examples; reading matches local names in any namespace.
export const MSPDI_NAMESPACE = 'http://schemas.microsoft.com/project/2007'

// see EX-1
const CHILD_ORDER: Readonly<Record<string, readonly string[]>> = {
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

// WHY: generated rather than typed, since a typo among the literals would silently misplace a carried scalar.
/** @purity pure */
function assignmentFieldCodes(): readonly string[] {
  const codes: string[] = []
  for (let code = 0x000; code <= 0x0c8; code += 1) {
    codes.push(`f404${code.toString(16).padStart(3, '0')}`)
  }
  return codes
}

interface XmlElement {
  readonly name: string
  // TRAP: meaningful only when children is empty; whitespace between child elements is layout.
  readonly text: string
  readonly children: readonly XmlElement[]
}

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

const NAMED_REFERENCES: Readonly<Record<string, string>> = {
  lt: '<', gt: '>', amp: '&', quot: '"', apos: "'",
}

/** @purity pure */
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

// WHY: an explicit stack, since nothing bounds nesting before validation and recursion would overflow.
// see FR-023
/** @purity pure */
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

/** @purity pure */
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
    // WHY: refused, since the XSD declares no attribute and carry has no room for one; it would vanish on write.
    if (attributeName !== 'xmlns' && !attributeName.startsWith('xmlns:')) {
      return {
        ok: false,
        fault: fault(path, `the attribute ${attributeName}, which the official schema does not declare`),
      }
    }
  }
}

/** @purity pure */
function localName(qualified: string): string {
  const colon = qualified.lastIndexOf(':')
  return colon < 0 ? qualified : qualified.slice(colon + 1)
}

/** @purity pure */
function escapedText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// see CN-5
/** @purity pure */
function writtenXml(root: XmlElement, namespace: string): string {
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n']
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

/** @purity pure */
function leafText(element: XmlElement): string {
  return element.children.length === 0 ? element.text : ''
}

/** @purity pure */
function childOf(element: XmlElement, name: string): XmlElement | null {
  return element.children.find((child) => child.name === name) ?? null
}

// TRAP: never trim or reformat here; the arriving text is the column's value.
/** @purity pure */
function textColumn(element: XmlElement, name: string): string | null {
  const child = childOf(element, name)
  return child === null ? null : leafText(child)
}

/** @purity pure */
function integerColumn(element: XmlElement, name: string): number | null {
  return wholeNumberOf(textColumn(element, name))
}

/** @purity pure */
function wholeNumberOf(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const trimmed = raw.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

/** @purity pure */
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

/** @purity pure */
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

// see EX-9
/** @purity pure */
function durationOfMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  return `PT${Math.floor(whole / 60)}H${whole % 60}M0S`
}

// see FR-054, S-128
/** @purity pure */
function minutesPerWorkingDay(minutesPerDay: number | null): number {
  return minutesPerDay !== null && minutesPerDay > 0
    ? minutesPerDay
    : DEFAULT_CALENDAR_VALUES['S-128']
}

interface CarrySplit {
  readonly carry: Readonly<Record<string, string>>
  readonly carryElements: readonly CarryElement[]
}

/** @purity pure */
function carrySplit(element: XmlElement, consumed: readonly string[]): CarrySplit {
  const carry: Record<string, string> = {}
  const carryElements: CarryElement[] = []
  // TRAP: ordinal counts every child, carried or not; splicedCarriedRows puts carried rows back by it.
  element.children.forEach((child, ordinal) => {
    if (consumed.includes(child.name)) return
    if (child.children.length === 0) {
      carry[child.name] = child.text
      return
    }
    carryElements.push(carriedElement(child, ordinal))
  })
  return { carry, carryElements }
}

/** @purity pure */
function carriedElement(element: XmlElement, ordinal: number): CarryElement {
  const fields: Record<string, string> = {}
  const children: CarryElement[] = []
  element.children.forEach((child, childOrdinal) => {
    if (child.children.length === 0) fields[child.name] = child.text
    else children.push(carriedElement(child, childOrdinal))
  })
  return { ordinal, name: element.name, fields, children }
}

// STOP: spec does not decide the order of fields against children in a CarryElement; leaves go
// first, wrong for Baseline, OutlineCode and WorkWeek. Looked in AT-125, AT-126
/** @purity pure */
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

interface PlacedChild {
  readonly element: XmlElement
  readonly ordinal: number
}

/** @purity pure */
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

// WHY: an undeclared name ranks last, since misplacing it loses less than dropping it.
/** @purity pure */
function declaredRank(order: readonly string[], name: string): number {
  const found = order.indexOf(name)
  return found < 0 ? order.length : found
}

/** @purity pure */
function leaf(name: string, text: string): PlacedChild {
  return { element: { name, text, children: [] }, ordinal: 0 }
}

// WHY: an empty element would tell the partner's tool the value is empty, so nothing is written.
/** @purity pure */
function optionalLeaf(name: string, value: string | number | boolean | null): PlacedChild[] {
  if (value === null) return []
  if (typeof value === 'boolean') return [leaf(name, value ? '1' : '0')]
  return [leaf(name, String(value))]
}

type FadeColumn = 'fadeInDays' | 'fadeOutDays'

interface CustomFieldFrame {
  readonly name: string
  readonly fieldId: number
  readonly prefers: string
  readonly alias: string
}

const CUSTOM_FIELD_FRAMES: readonly CustomFieldFrame[] = customFields.frames

const EXTENDED_ATTRIBUTES_AT = '/Project/ExtendedAttributes'

/** @purity pure */
function fadeColumnOf(prefers: string): FadeColumn | null {
  if (prefers === 'fadeInDays') return 'fadeInDays'
  if (prefers === 'fadeOutDays') return 'fadeOutDays'
  return null
}

/** @purity pure */
function aliasOfColumn(column: FadeColumn): string {
  return CUSTOM_FIELD_FRAMES.find((frame) => frame.prefers === column)?.alias ?? ''
}

// see EX-6
/** @purity pure */
function isAliasUsable(alias: string): boolean {
  // TRAP: count code points, as xsd:maxLength does; alias.length counts UTF-16 units.
  return alias !== '' && [...alias].length <= customFields.aliasMaxLength
}

/** @purity pure */
function carriedDefinitions(carried: readonly CarryElement[]): readonly CarryElement[] {
  const collection = carried.find((one) => one.name === 'ExtendedAttributes')
  if (collection === undefined) return []
  return collection.children.filter((one) => one.name === 'ExtendedAttribute')
}

interface ImportRun {
  readonly notices: MspdiNotice[]
  roundedActualDurationCount: number
}

// see FR-021, FR-023
/** @purity pure */
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

export const BYTE_ORDER_MARK = '\uFEFF'

/** @purity pure */
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
    // WHY: empty; these entities have no MSPDI element, and task origins are the import use case's.
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }
}

/** @purity pure */
function projectFromRoot(
  root: XmlElement,
  current: Document,
  carriedRows: readonly CarryElement[],
  outlineBase: number,
): Project {
  const split = carrySplit(root, PROJECT_CONSUMED)
  return {
    id: textColumn(root, 'UID'),
    name: textColumn(root, 'Name'),
    title: textColumn(root, 'Title'),
    subject: textColumn(root, 'Subject'),
    category: textColumn(root, 'Category'),
    company: textColumn(root, 'Company'),
    manager: textColumn(root, 'Manager'),
    author: textColumn(root, 'Author'),
    created: textColumn(root, 'CreationDate'),
    revision: integerColumn(root, 'Revision'),
    lastSaved: textColumn(root, 'LastSaved'),
    startDate: textColumn(root, 'StartDate'),
    statusDate: textColumn(root, 'StatusDate'),
    minutesPerDay: integerColumn(root, 'MinutesPerDay'),
    minutesPerWeek: integerColumn(root, 'MinutesPerWeek'),
    daysPerMonth: integerColumn(root, 'DaysPerMonth'),
    // TRAP: kept as it arrives (0 = Sunday), one apart from DayType (1 = Sunday); never convert either.
    weekStartDay: integerColumn(root, 'WeekStartDay'),
    calendarUid: integerColumn(root, 'CalendarUID'),
    themeHue: current.schedule.project.themeHue,
    uidHighWaterMark: current.schedule.project.uidHighWaterMark,
    importSeq: current.schedule.project.importSeq,
    carry: split.carry,
    carryElements: [...split.carryElements, ...carriedRows],
    outlineBase,
  }
}

const PROJECT_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Title', 'Subject', 'Category', 'Company', 'Manager', 'Author',
  'CreationDate', 'Revision', 'LastSaved', 'StartDate', 'StatusDate', 'MinutesPerDay',
  'MinutesPerWeek', 'DaysPerMonth', 'WeekStartDay', 'CalendarUID',
  'Calendars', 'Tasks', 'Resources', 'Assignments',
]

// WHY: ID, OutlineLevel, OutlineNumber and Summary are consumed, not carried: they are rebuilt on write.
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
  readonly carriedRows: readonly CarryElement[]
  readonly outlineBase: number
}

/** @purity pure */
function outlineBaseOf(collection: XmlElement): number {
  for (const element of collection.children) {
    if (element.name !== 'Task') continue
    if (isTrue(element, 'IsNull')) continue
    if (integerColumn(element, 'OutlineLevel') === 0) return 0
  }
  return 1
}

// see DF-3, FR-021
/** @purity pure */
function tasksFromRoot(root: XmlElement, run: ImportRun): TasksReading {
  const collection = childOf(root, 'Tasks')
  if (collection === null) return { tasks: [], carriedRows: [], outlineBase: 1 }
  // TRAP: the file's own MinutesPerDay, not the document's: dividing by one and multiplying by another loses the value.
  const minutesPerDay = minutesPerWorkingDay(integerColumn(root, 'MinutesPerDay'))
  const fadeColumns = fadeColumnsByFieldId(root)
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
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Tasks/Task[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a task',
      ))
      return
    }
    const level = integerColumn(element, 'OutlineLevel')
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

/** @purity pure */
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

// WHY: matched by Alias, not FieldID alone, or the partner's own value in the frame would read as days.
/** @purity pure */
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

/** @purity pure */
function lastIndexShallowerThan(levels: readonly number[], depth: number): number | null {
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const level = levels[index]
    if (level !== undefined && level < depth) return index
  }
  return null
}

/** @purity pure */
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
    uid,
    wbsParentUid,
    wbsOrder,
    name: textColumn(element, 'Name'),
    start: textColumn(element, 'Start'),
    finish: textColumn(element, 'Finish'),
    milestone: booleanColumn(element, 'Milestone'),
    deadline: textColumn(element, 'Deadline'),
    notes: textColumn(element, 'Notes'),
    calendarUid: integerColumn(element, 'CalendarUID'),
    actualStart: textColumn(element, 'ActualStart'),
    actualDuration: workingDaysOfActualDuration(element, minutesPerDay, foundAt, run),
    actualFinish: textColumn(element, 'ActualFinish'),
    resume: textColumn(element, 'Resume'),
    resumeValid: booleanColumn(element, 'ResumeValid'),
    percentComplete: integerColumn(element, 'PercentComplete'),
    fadeInDays: fade.fadeInDays,
    fadeOutDays: fade.fadeOutDays,
    dependencies: dependenciesFromTask(element),
    carry: split.carry,
    carryElements: fade.carryElements,
  }
}

interface FadeReading {
  readonly fadeInDays: number | null
  readonly fadeOutDays: number | null
  readonly carryElements: readonly CarryElement[]
}

/** @purity pure */
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
    // TRAP: a claimed value must leave the carried list, or the writer writes it twice.
    if (days === null) {
      rest.push(one)
      continue
    }
    if (column === 'fadeInDays') fadeInDays = days
    else fadeOutDays = days
  }
  return { fadeInDays, fadeOutDays, carryElements: rest }
}

// see AT-35, FR-054
/** @purity pure */
function workingDaysOfActualDuration(
  element: XmlElement,
  minutesPerDay: number,
  at: string,
  run: ImportRun,
): number | null {
  const raw = textColumn(element, 'ActualDuration')
  if (raw === null || raw.trim() === '') return null
  const minutes = minutesOfDuration(raw)
  // TRAP: ActualDuration is consumed, not carried, so a null here deletes what the file held.
  if (minutes === null) {
    run.notices.push(notice(`${at}/ActualDuration`, `is not a length this reader measures: ${raw}`))
    return null
  }
  const days = minutes / minutesPerDay
  if (Number.isInteger(days)) return days
  run.roundedActualDurationCount += 1
  // TRAP: Math.round sends a negative half toward zero, so the magnitude is rounded.
  return Math.sign(days) * Math.round(Math.abs(days))
}

/** @purity pure */
function dependenciesFromTask(element: XmlElement): readonly Dependency[] {
  const links: Dependency[] = []
  element.children.forEach((child) => {
    if (child.name !== 'PredecessorLink') return
    const split = carrySplit(child, DEPENDENCY_CONSUMED)
    const predecessorUid = integerColumn(child, 'PredecessorUID')
    const linkType = integerColumn(child, 'Type')
    if (predecessorUid === null || linkType === null) return
    links.push({
      predecessorUid,
      linkType,
      lag: integerColumn(child, 'LinkLag'),
      lagFormat: integerColumn(child, 'LagFormat'),
      carry: split.carry,
      carryElements: split.carryElements,
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
    if (isTrue(element, 'IsNull')) {
      carriedRows.push(carriedElement(element, ordinal))
      return
    }
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Resources/Resource[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a resource',
      ))
      return
    }
    const split = carrySplit(element, RESOURCE_CONSUMED)
    resources.push({
      uid,
      name: textColumn(element, 'Name'),
      resourceKind: integerColumn(element, 'Type'),
      isCostResource: booleanColumn(element, 'IsCostResource'),
      calendarUid: integerColumn(element, 'CalendarUID'),
      carry: split.carry,
      carryElements: split.carryElements,
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
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Assignments/Assignment[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming an assignment',
      ))
      return
    }
    const split = carrySplit(element, ASSIGNMENT_CONSUMED)
    assignments.push({
      uid,
      taskUid: integerColumn(element, 'TaskUID'),
      resourceUid: integerColumn(element, 'ResourceUID'),
      carry: split.carry,
      carryElements: split.carryElements,
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
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Calendars/Calendar[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a calendar',
      ))
      return
    }
    const split = carrySplit(element, CALENDAR_CONSUMED)
    calendars.push({
      uid,
      name: textColumn(element, 'Name'),
      isBaseCalendar: booleanColumn(element, 'IsBaseCalendar'),
      baseCalendarUid: integerColumn(element, 'BaseCalendarUID'),
      ordinal,
      carry: split.carry,
      carryElements: split.carryElements,
      weekDays: weekDaysOfCalendar(element),
      exceptions: exceptionsOfCalendar(element, uid, run),
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
      ordinal,
      // TRAP: kept as it arrives (1 = Sunday), one apart from WeekStartDay (0 = Sunday); never convert either.
      dayType: integerColumn(element, 'DayType'),
      dayWorking: booleanColumn(element, 'DayWorking'),
      carry: split.carry,
      carryElements: split.carryElements,
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
      run.notices.push(notice(
        `/Project/Calendars/Calendar[uid=${calendarUid}]/Exceptions/Exception[${ordinal + 1}]`,
        'repeats, and repeating exception days are not spread over real dates',
      ))
    }
    exceptions.push({
      ordinal,
      name: textColumn(element, 'Name'),
      fromDate: period === null ? null : textColumn(period, 'FromDate'),
      toDate: period === null ? null : textColumn(period, 'ToDate'),
      dayWorking: booleanColumn(element, 'DayWorking'),
      recurrenceKind,
      carry: split.carry,
      carryElements: split.carryElements,
    })
  })
  return exceptions
}

const NO_RECURRENCE = 9

interface ImportedRows {
  readonly taskGroups: readonly TaskGroup[]
  readonly taskGroupMembers: readonly TaskGroupMember[]
}

// see FR-058
/** @purity pure */
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
      id,
      parentId: parentRow,
      label: null,
      derivedFromTaskUid: task.uid,
      order: task.wbsOrder ?? 0,
      isCollapsed: null,
      isHidden: null,
      color: null,
      height: null,
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

/** @purity pure */
function deepestAncestorRow(
  task: Task,
  tasks: readonly Task[],
  rowOfTask: ReadonlyMap<number, string>,
): string | null {
  let at: number | null = task.wbsParentUid
  // TRAP: bounded by the task count, since a wbsParentUid ring is refused only after this runs.
  for (let steps = 0; steps < tasks.length && at !== null; steps += 1) {
    const row = rowOfTask.get(at)
    if (row !== undefined) return row
    const parent: Task | undefined = tasks.find((one) => one.uid === at)
    at = parent === undefined ? null : parent.wbsParentUid
  }
  return null
}

// WHY: derived from the task UID, since a pure function may not mint a random UUID; importing twice gives the same ids.
// see AT-51
/** @purity pure */
function rowIdOfTask(uid: number): string {
  const scalar = Math.trunc(uid)
  const sign = scalar < 0 ? 'f' : '0'
  const digits = Math.abs(scalar).toString(16).padStart(11, '0').slice(-11)
  return `00000000-0000-4000-8000-${sign}${digits}`
}

interface ExportRun {
  readonly notices: MspdiNotice[]
}

// see FR-021
/** @purity pure */
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
  const frames = claimedFrames(schedule, run)
  const definitions = writtenFadeDefinitions(frames, project.carryElements, project.carry)
  const named: PlacedChild[] = [
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
    ...(project.carry['FinishDate'] === undefined
      ? optionalLeaf('FinishDate', latestTaskFinish(schedule))
      : []),
    ...definitions.named,
  ]
  // TRAP: splice before the length test, or a file whose only Calendar had no UID loses its Calendars.
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
    // TRAP: collection rows are written inside their collection; writing them here too duplicates them.
    definitions.carried.filter((one) => !isCarriedRow(one)),
  )
}

/** @purity pure */
function isCarriedRow(carried: CarryElement): boolean {
  return CARRIED_ROW_NAMES.includes(carried.name)
}

const CARRIED_ROW_NAMES: readonly string[] = ['Calendar', 'Task', 'Resource', 'Assignment']

interface ClaimedFrame {
  readonly column: FadeColumn
  readonly fieldId: number
  readonly alias: string
}

// see EX-6
/** @purity pure */
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

// WHY: free only with no definition or this column's alias; any roster word would let one fade column evict the other.
/** @purity pure */
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

interface FadeDefinitions {
  readonly carry: Readonly<Record<string, string>>
  readonly carried: readonly CarryElement[]
  readonly named: readonly PlacedChild[]
}

// see EX-8
/** @purity pure */
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
    // TRAP: an empty ExtendedAttributes that arrived sits in carry as a scalar; it is dropped here
    // once a frame is claimed, and written back otherwise.
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

/** @purity pure */
function definitionOfFrame(claimed: ClaimedFrame, ordinal: number): CarryElement {
  return {
    ordinal,
    name: 'ExtendedAttribute',
    // TRAP: keys in the order the XSD declares; writtenCarriedElement writes fields in insertion order.
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

// STOP: spec does not decide where claimed fade values go among carried ones; they go last,
// which reorders siblings. Looked in T-058, NR-1
/** @purity pure */
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

// STOP: spec does not decide which writer version SaveVersion carries; the major version is used. Looked in DV-2
const GRS_SAVE_VERSION = '0'

// WHY: ISO 4217's no-currency code, since no column of the document holds money.
const UNSTATED_CURRENCY_CODE = 'XXX'

/** @purity pure */
function collection(name: string, rows: readonly XmlElement[]): PlacedChild {
  return { element: { name, text: '', children: rows }, ordinal: 0 }
}

// see DV-1
/** @purity pure */
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

/** @purity pure */
function writtenTasks(
  schedule: Schedule,
  frames: readonly ClaimedFrame[],
  run: ExportRun,
): readonly XmlElement[] {
  // TRAP: not schedule.tasks as held: the row-tree ranking rewrites wbsOrder without moving the collection.
  const ordered = tasksInWbsOrder(schedule.tasks)
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

// WHY: a walk, not a flat sort, so a child follows its parent; a task on a ring is appended, not dropped.
/** @purity pure */
function tasksInWbsOrder(tasks: readonly Task[]): readonly Task[] {
  if (tasks.length < 2) return tasks
  const known = new Set(tasks.map((task) => task.uid))
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

/** @purity pure */
function taskDepths(tasks: readonly Task[]): ReadonlyMap<number, number> {
  const parents = new Map<number, number | null>()
  for (const task of tasks) parents.set(task.uid, task.wbsParentUid)
  const depths = new Map<number, number>()
  for (const task of tasks) {
    let depth = 1
    let foundAt = task.wbsParentUid
    // TRAP: bounded by the task count, since a document in hand may hold a ring.
    for (let steps = 0; steps < tasks.length && foundAt !== null; steps += 1) {
      depth += 1
      foundAt = parents.get(foundAt) ?? null
    }
    depths.set(task.uid, depth)
  }
  return depths
}

// see DV-6
/** @purity pure */
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
    // STOP: spec does not decide which tasks a person touched, so ID and the outline columns are
    // rebuilt for every task. Looked in FR-021, EX-2
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

/** @purity pure */
function writtenActualDuration(task: Task, minutesPerDay: number): PlacedChild[] {
  if (task.actualDuration === null) return []
  return [leaf('ActualDuration', durationOfMinutes(task.actualDuration * minutesPerDay))]
}

// see DV-9
/** @purity pure */
function writtenStop(task: Task, schedule: Schedule, run: ExportRun): PlacedChild[] {
  if (task.carry['Stop'] !== undefined) return []
  const state = planActualState(task)
  if (state !== 'suspendedResumeUnknown' && state !== 'suspendedResumePlanned') return []
  const from = dayOf(task.actualStart)
  if (from === null || task.actualDuration === null) return []
  try {
    const stop = dateFromWorkingDays(workingCalendarOf(schedule), from, task.actualDuration)
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
