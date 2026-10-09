// DFC-991: the drawn task group boxes of the Task Group Panel are published by ScreenRenderer (PI-37) and are the boxes the screen draws (SC-1, FR-098).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import * as screenRenderer from '../../src/adapter/screen-renderer/screen-renderer'
import { unbroken } from '../contract/spec-table'
import { taskGroupDocument, shell, type ShellBench } from './cr-541-stage'

const PUBLISHED = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8'))

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const piRow = (id: string): string => PUBLISHED.split('\n').find((line) => line.startsWith(`| ${id} |`)) ?? ''

describe('PI-37 (DFC-991) -- ScreenRenderer publishes drawnTaskGroupBoxesOf', () => {
  it('table T-064 lists drawnTaskGroupBoxesOf on the ScreenRenderer row, and the component exports it', () => {
    expect(piRow('PI-37')).toContain('ScreenRenderer')
    expect(PUBLISHED).toContain('drawnTaskGroupBoxesOf')
    expect(typeof (screenRenderer as Record<string, unknown>)['drawnTaskGroupBoxesOf']).toBe('function')
  })

  it('SC-1 / FR-098: the boxes it measures are the boxes the Task Group Panel draws for the same frame', () => {
    const built = shell(taskGroupDocument([{ id: 'g1', parentId: null }, { id: 'g2', parentId: null }, { id: 'g3', parentId: null }]))
    benches.push(built)
    const frame = built.loop.current()
    expect(frame, 'premise: a frame was drawn').not.toBeNull()
    const measured = screenRenderer.drawnTaskGroupBoxesOf(frame!.layout, frame!.regions)
    expect(measured.map((one) => one.groupId)).toEqual(['g1', 'g2', 'g3'])
    const drawn = built.last().taskGroupPanel.titles
    for (const one of measured) {
      const title = drawn.find((entry) => entry.groupId === one.groupId)
      expect(title, `the panel draws ${one.groupId}`).toBeDefined()
      expect(title?.box, `the box of ${one.groupId}`).toEqual(one.box)
    }
  })
})
