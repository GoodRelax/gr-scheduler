// DFC-1723: WB-10 -- the save face (U-54) and the open face (U-56) look like a window but stay faces: Esc closes them (IN-4), and IC-52 is the one close in the title row.

import { afterEach, describe, expect, it } from 'vitest'

import { byRole, selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import {
  EXPORT_CHOOSER,
  OPEN_CHOOSER,
  here,
  jsonBytes,

  shellStage,
  surfaceOfEntrance,
  there,
  type ShellStage,
} from './cr-610-file-flow-stage'
import type { KeyInput } from '../../src/adapter/input-command-translator/input-command-translator'
import { specTable } from './spec-table'

afterEach(() => {
  delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
})

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: each clause is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const WB_10_CLOSE_ONLY = '右端に `IC-52` だけを置く —— `IC-129` 〜 `IC-131` を置かない'
const WB_10_CLOSES_BY_IC_52 = '`IC-52` で閉じる'
const IN_4_FACE_RUNG = '開いている面'

describe('DFC-1723 the manuscript these cases are driven by', () => {
  it('WB-10 still gives the face a title row with IC-52 alone, closed by IC-52', () => {
    const text = rowIn('T-335', 'WB-10').cells.join(' ')
    expect(text).toContain(WB_10_CLOSE_ONLY)
    expect(text).toContain(WB_10_CLOSES_BY_IC_52)
  })

  it('IN-4 still lists the open face as a rung of Esc', () => {
    expect(rowIn('T-028', 'IN-4').cells.join(' ')).toContain(IN_4_FACE_RUNG)
  })
})

const ESC: KeyInput = { kind: 'key', key: 'Esc', modifiers: { ctrl: false, shift: false, alt: false, meta: false } }

interface Face {
  readonly name: string
  readonly role: () => string
  readonly open: (built: ShellStage) => Promise<void>
}

const FACES: readonly Face[] = [
  {
    name: 'the save face (U-54)',
    role: EXPORT_CHOOSER,
    open: async (built) => {
      await built.press(surfaceOfEntrance('IC-2'), 'IC-2')
    },
  },
  {
    name: 'the open face (U-56)',
    role: OPEN_CHOOSER,
    open: async (built) => {
      await built.open(built.file('theirs.json', jsonBytes(there())))
    },
  },
]

const iconsOf = (root: FakeElement): string[] =>
  selfAndDescendants(root)
    .map((one) => one.getAttribute('data-icon'))
    .filter((one): one is string => one !== null)

describe('WB-10 / IN-4 (MUST): the faces that look like windows still close on Esc (DFC-1723)', () => {
  for (const face of FACES) {
    it(`${face.name}: it stands once opened`, async () => {
      const built = await shellStage({ dom: true, document: here() })
      await face.open(built)
      expect(built.last().openModal).not.toBeNull()
      expect(byRole(built.domRoot(), face.role())).toHaveLength(1)
    })

    it(`${face.name}: Esc closes it, and nothing is left on the screen`, async () => {
      const built = await shellStage({ dom: true, document: here() })
      await face.open(built)
      await built.key(ESC)
      expect(built.last().openModal, 'IN-4: the open face is the rung Esc spends').toBeNull()
      expect(byRole(built.domRoot(), face.role())).toHaveLength(0)
    })

    it(`${face.name}: its title row holds IC-52 and none of IC-129 to IC-131 (WB-10)`, async () => {
      const built = await shellStage({ dom: true, document: here() })
      await face.open(built)
      const icons = iconsOf(byRole(built.domRoot(), face.role())[0] as FakeElement)
      expect(icons).toContain('IC-52')
      for (const one of ['IC-129', 'IC-130', 'IC-131']) expect(icons).not.toContain(one)
    })

    it(`${face.name}: pressing IC-52 closes it`, async () => {
      const built = await shellStage({ dom: true, document: here() })
      await face.open(built)
      await built.press(face.role(), 'IC-52')
      expect(built.last().openModal).toBeNull()
    })
  }
})
