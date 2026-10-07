// DFC-725: a resume icon that is not valid is drawn faint by S-308, in the colour of S-310 (= S-161) (LF-13, FR-044).

import { describe, expect, it } from 'vitest'

import { specTable } from './spec-table'
import { day, sceneOf, stored, taskOf } from '../unit/cr-430-cross-section-scene'

const S_308 = stored('S-308')

const S_161_LIGHT = /#[0-9a-f]{6}/i.exec((specTable('T-236').rows.find((one) => one.id === 'S-161')?.cells ?? []).join(' '))?.[0] ?? ''

const iconOf = (resume: string | null, resumeValid: boolean): string => {
  const scene = sceneOf({
    tasks: [
      taskOf({
        uid: 1,
        name: 'stopped',
        start: day(2),
        finish: day(8),
        actualStart: day(3),
        stop: day(5),
        resume,
        resumeValid,
        percentComplete: 30,
      }),
    ],
    settings: { progressMarkerVisible: true },
  })
  return scene.svg()
}

const resumeParts = (svg: string): string => {
  const tags = svg.match(/<[^>]*data-figure="task-1-resume"[^>]*>/g)
  if (tags === null) throw new Error('the picture holds no resume icon')
  return tags.join('')
}

describe('DFC-725: the resume icon follows S-308 and S-310 (LF-13, FR-044)', () => {
  it('LF-13 a valid resume icon is drawn at full strength', () => {
    expect(resumeParts(iconOf(day(7), true))).not.toContain('opacity=')
  })

  it('S-308 an undated resume icon is drawn at the S-308 opacity (DFC-725)', () => {
    const parts = resumeParts(iconOf(null, false))
    expect(parts).toContain(`opacity="${S_308}"`)
  })

  it('S-308 a dated but not valid resume icon is drawn at the S-308 opacity (DFC-725)', () => {
    expect(resumeParts(iconOf(day(7), false))).toContain(`opacity="${S_308}"`)
  })

  it('S-310 the resume icon is inked in the colour of S-161 (DFC-725)', () => {
    expect(S_161_LIGHT).not.toBe('')
    const parts = resumeParts(iconOf(day(7), true))
    expect(parts).toContain(`stroke="${S_161_LIGHT}"`)
    expect(parts).toContain(`fill="${S_161_LIGHT}"`)
  })
})
