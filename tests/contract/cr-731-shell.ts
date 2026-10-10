// CR-731 spec-only shell bench: the report window opened over a document, driven by the entries of T-109 and read from the drawn tree

import type { Document } from '../../src/entity/document-model/document/document'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { byRole, descendants, selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import {
  keyOfRow,
  shellStage,
  stageWithTarget,
  surfaceOfEntrance,
  type ShellStage,
  type StandInFile,
} from './cr-610-file-flow-stage'
import { BUILT_VERSION } from './cr-731-stage'

export const WINDOW = 'Delay Diagnostics Report'
export const PROPOSALS_ROLE = 'Delay Fix Proposals'
export const LOG_ROLE = 'Delay Fix Log'
export const FOOTER_ROLE = 'Delay Fix Footer'

export async function pressEntry(built: ShellStage, entry: string): Promise<void> {
  await built.press(surfaceOfEntrance(entry), entry)
}

export interface FixBench {
  readonly built: ShellStage
  readonly target: StandInFile | null
}

export async function benchOver(document: Document, options: { readonly withTarget: boolean }): Promise<FixBench> {
  if (options.withTarget) {
    const staged = await stageWithTarget({ document, dom: true })
    return { built: staged.built, target: staged.mine }
  }
  return { built: await shellStage({ document, dom: true }), target: null }
}

export async function diagnosisStarted(bench: FixBench): Promise<void> {
  await pressEntry(bench.built, 'IC-107')
}

export async function proposalsShown(bench: FixBench): Promise<void> {
  await diagnosisStarted(bench)
  await pressEntry(bench.built, 'IC-155')
}

export const windowOf = (built: ShellStage): FakeElement | null => byRole(built.domRoot(), WINDOW)[0] ?? null

export const entryIn = (built: ShellStage, icon: string): FakeElement | null =>
  selfAndDescendants(windowOf(built) ?? built.domRoot()).find((one) => one.getAttribute('data-icon') === icon) ?? null

export const containerIn = (built: ShellStage, role: string): FakeElement | null => {
  const window = windowOf(built)
  return window === null ? null : (byRole(window, role)[0] ?? null)
}

export function needContainer(built: ShellStage, role: string): FakeElement {
  const found = containerIn(built, role)
  if (found === null) throw new Error(`the window draws nothing under data-role="${role}"`)
  return found
}

export function bodyRowsOf(container: FakeElement): FakeElement[] {
  const head = new Set(descendants(container).filter((one) => one.tagName === 'THEAD').flatMap((one) => descendants(one)))
  return descendants(container).filter((one) => one.tagName === 'TR' && !head.has(one))
}

export const isInert = (entry: FakeElement): boolean => entry.disabled || entry.getAttribute('aria-disabled') === 'true'

export function savedDocument(file: StandInFile): Document {
  const read = documentFromJson(new TextDecoder().decode(file.bytes()), BUILT_VERSION)
  if (!read.ok) throw new Error(`the saved file is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

export const undoKey = () => keyOfRow('SK-6')
