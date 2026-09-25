// DocumentCodec, MSPDI half -- maps the fade days to and from the frames of the extended-attribute area.
// @unit      UF-155  (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

import type { CarryElement, Schedule, Task } from '../../entity/document-model/schedule/schedule'
import { writtenCarriedElement, writtenChildren, type PlacedChild } from './mspdi-child-placement'
import {
  PATHS,
  childOf,
  integerColumn,
  leaf,
  notice,
  textColumn,
  wholeNumberOf,
  type ExportRun,
} from './mspdi-codec'
import customFields from './mspdi-custom-fields.json'
import type { XmlElement } from './mspdi-xml'

export type FadeColumn = 'fadeInDays' | 'fadeOutDays'

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

// WHY: matched by Alias, not FieldID alone, or the partner's own value in the frame would read as days.
/** @purity pure */
export function fadeColumnsByFieldId(root: XmlElement): ReadonlyMap<number, FadeColumn> {
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

interface FadeReading {
  readonly fadeInDays: number | null
  readonly fadeOutDays: number | null
  readonly carryElements: readonly CarryElement[]
}

/** @purity pure */
export function fadeOfCarried(
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

export interface ClaimedFrame {
  readonly column: FadeColumn
  readonly fieldId: number
  readonly alias: string
}

// see EX-6
/** @purity pure */
export function claimedFrames(schedule: Schedule, run: ExportRun): readonly ClaimedFrame[] {
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
export function writtenFadeDefinitions(
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
      definitionOfFrame(claimed, index), PATHS.definition,
    ))
    // TRAP: an empty ExtendedAttributes that arrived sits in carry as a scalar; it is dropped here
    // once a frame is claimed, and written back otherwise.
    const { ExtendedAttributes: _takenOver, ...rest } = carry
    return {
      carry: rest,
      carried,
      named: [{ element: { name: 'ExtendedAttributes', text: '', children } }],
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

// DEVIATION: spec says an unedited file writes back equal (FR-021); here fade values go after carried ones (DFC-563)
/** @purity pure */
export function writtenFadeValues(task: Task, frames: readonly ClaimedFrame[]): PlacedChild[] {
  const placed: PlacedChild[] = []
  for (const claimed of frames) {
    const days = task[claimed.column]
    if (days === null) continue
    const named = [leaf('FieldID', String(claimed.fieldId)), leaf('Value', String(days))]
    placed.push({
      element: {
        name: 'ExtendedAttribute',
        text: '',
        children: writtenChildren(PATHS.taskValue, named, {}, []),
      },
    })
  }
  return placed
}
