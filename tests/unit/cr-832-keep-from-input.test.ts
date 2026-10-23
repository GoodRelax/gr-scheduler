// CR-832 / FR-069: keepFromInput keeps a press and Enter on its element from the input source, and prevents no default.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { keepFromInput } from '../../src/framework/dom-screen-surface/notices-drawing'
import { stage, type FakeElement } from '../fixtures/fake-browser'
import { unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))
const FR_069_NEW_TAB = '⭐ 著作権表示を押したら、閲覧環境の新しいタブで、同書の 表 T-206 の `S-459`（本ソフトウェアのリポジトリの所）の頁を開くこと（MUST）'
const FR_069_STRETCH =
  '⭐ 全文と帰属表示を開いたら、表 T-335 の `WB-1` のヘルプの窓の下の縁を、同表の `WB-3` の範囲の下端まで伸ばすこと（MUST）'
const MK_10_DO_NOT_STOP = '割り当てていない組合せを止めてはならない（MUST NOT）'
const T_078_NO_OTHER_FRAME = '**本表に無い契機でフレームを起こしてはならない（MUST NOT）**'

interface Fired {
  readonly stopped: boolean
  readonly prevented: boolean
}

const elementKept = (): { element: FakeElement; fire(type: string, key?: string): Fired } => {
  const staged = stage()
  const element = staged.host.createElement('summary') as unknown as FakeElement
  keepFromInput(element as unknown as HTMLElement)
  return {
    element,
    fire(type: string, key?: string): Fired {
      let stopped = false
      let prevented = false
      const event = {
        type,
        key,
        target: element,
        currentTarget: element,
        defaultPrevented: false,
        stopPropagation: (): void => {
          stopped = true
        },
        stopImmediatePropagation: (): void => {
          stopped = true
        },
        preventDefault: (): void => {
          prevented = true
        },
      }
      for (const one of staged.world.registrations.filter((r) => r.node === element && r.type === type)) one.listener(event)
      return { stopped, prevented: prevented || event.defaultPrevented }
    },
  }
}

describe('CR-832 keepFromInput -- the press and Enter stay with the element, so the browser acts on its own', () => {
  it('the manuscript still says it', () => {
    for (const clause of [FR_069_NEW_TAB, FR_069_STRETCH, MK_10_DO_NOT_STOP]) expect(REQUIREMENTS).toContain(clause)
    expect(DESIGN).toContain(T_078_NO_OTHER_FRAME)
  })

  it.each(['pointerdown', 'pointerup'])('%s stops propagating and prevents no default', (type) => {
    const kept = elementKept()
    expect(kept.fire(type)).toEqual({ stopped: true, prevented: false })
  })

  it('keydown Enter stops propagating and prevents no default', () => {
    expect(elementKept().fire('keydown', 'Enter')).toEqual({ stopped: true, prevented: false })
  })

  it.each([' ', 'Escape', 'Tab', 'a', 'ArrowDown'])(`keydown %j propagates and prevents no default (${MK_10_DO_NOT_STOP})`, (key) => {
    expect(elementKept().fire('keydown', key)).toEqual({ stopped: false, prevented: false })
  })

  it.each(['click', 'pointermove', 'keyup', 'toggle'])('%s is not touched', (type) => {
    expect(elementKept().fire(type, 'Enter')).toEqual({ stopped: false, prevented: false })
  })

  it('listens on the element it is given and on no other', () => {
    const staged = stage()
    const element = staged.host.createElement('a') as unknown as FakeElement
    keepFromInput(element as unknown as HTMLElement)
    expect(staged.world.registrations.every((r) => r.node === element)).toBe(true)
    expect(staged.world.registrations.map((r) => r.type).sort()).toEqual(['keydown', 'pointerdown', 'pointerup'])
    expect(staged.hostListeners ?? []).toEqual([])
  })
})
