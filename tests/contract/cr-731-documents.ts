// CR-731 spec-only documents: one small document per viewpoint of T-310 to T-312 that the cases of section 9 need

import type { Document } from '../../src/entity/document-model/document/document'
import { BEFORE_ALL, FINISH_OF, FS, START_OF, documentOf, type TaskSpec } from './cr-731-stage'

export const AFTER_MAY = '2027-06-01T00:00:00'

const span = (uid: number, from: string, to: string, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  start: START_OF(`2027-${from}`),
  finish: FINISH_OF(`2027-${to}`),
  ...extra,
})

export const ONE_PARENT = (): Document =>
  documentOf([span(1, '05-10', '05-21'), span(2, '05-10', '05-14', { parent: 1 }), span(3, '05-17', '05-26', { parent: 1 })], {
    statusDate: BEFORE_ALL,
  })

export const CHAIN = (): Document =>
  documentOf(
    [
      span(10, '05-10', '05-21'),
      span(1, '05-10', '05-21', { parent: 10 }),
      span(2, '05-10', '05-14', { parent: 1 }),
      span(3, '05-17', '05-26', { parent: 1 }),
      span(4, '05-10', '05-12', { parent: 10 }),
    ],
    { statusDate: BEFORE_ALL },
  )

export const CHAIN_ROOT_READ_ONLY = (): Document =>
  documentOf(
    [
      span(10, '05-10', '05-21', { readOnly: true }),
      span(1, '05-10', '05-21', { parent: 10 }),
      span(2, '05-10', '05-14', { parent: 1 }),
      span(3, '05-17', '05-26', { parent: 1 }),
      span(4, '05-10', '05-12', { parent: 10 }),
    ],
    { statusDate: BEFORE_ALL },
  )

export const CYCLE = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-11', { after: [[3, FS]] }),
      span(2, '05-12', '05-13', { after: [[1, FS]] }),
      span(3, '05-14', '05-17', { after: [[2, FS]] }),
    ],
    { statusDate: BEFORE_ALL },
  )

export const SELF_DEPENDENT = (): Document =>
  documentOf([span(1, '05-10', '05-11', { after: [[1, FS]] }), span(2, '05-12', '05-13')], { statusDate: BEFORE_ALL })

export const RESUME_AFTER_FINISH = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-14', {
        actualStart: START_OF('2027-05-10'),
        actualFinish: FINISH_OF('2027-05-14'),
        percentComplete: 100,
        resumeValid: true,
      }),
    ],
    { statusDate: AFTER_MAY },
  )

export const FINISHED_CHILDREN = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-21'),
      span(2, '05-10', '05-14', {
        parent: 1,
        actualStart: START_OF('2027-05-11'),
        actualFinish: FINISH_OF('2027-05-14'),
        percentComplete: 100,
      }),
      span(3, '05-17', '05-21', {
        parent: 1,
        actualStart: START_OF('2027-05-17'),
        actualFinish: FINISH_OF('2027-05-20'),
        percentComplete: 100,
      }),
    ],
    { statusDate: AFTER_MAY },
  )

export const FS_SUCCESSOR_STARTED = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-14', { actualStart: START_OF('2027-05-10'), percentComplete: 50 }),
      span(2, '05-17', '05-21', { actualStart: START_OF('2027-05-28'), percentComplete: 30, after: [[1, FS]] }),
    ],
    { statusDate: '2027-05-31T17:00:00' },
  )

export const MILESTONE_DUE = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-14', {
        actualStart: START_OF('2027-05-10'),
        actualFinish: FINISH_OF('2027-05-14'),
        percentComplete: 100,
      }),
      span(2, '05-17', '05-17', { milestone: true }),
    ],
    { statusDate: AFTER_MAY },
  )

export const READ_ONLY_PARENT = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-21', { readOnly: true }),
      span(2, '05-10', '05-14', { parent: 1 }),
      span(3, '05-17', '05-26', { parent: 1 }),
    ],
    { statusDate: BEFORE_ALL },
  )

export const DERIVED_PARENT = (): Document =>
  documentOf([span(1, '05-10', '05-28'), span(2, '05-12', '05-14', { derivedUnder: 1 })], { statusDate: BEFORE_ALL })

export const NOT_STARTED_AFTER_START = (): Document =>
  documentOf([span(1, '05-10', '05-14')], { statusDate: AFTER_MAY })

export const MIXED = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-21'),
      span(2, '05-10', '05-14', { parent: 1 }),
      span(3, '05-17', '05-26', { parent: 1 }),
      span(5, '04-05', '04-09', { actualStart: START_OF('2027-04-05'), percentComplete: 50 }),
      span(6, '04-12', '04-16', { actualStart: START_OF('2027-04-14'), percentComplete: 30, after: [[5, FS]] }),
    ],
    { statusDate: '2027-05-01T00:00:00' },
  )

export const ACTUAL_AGAINST_LINK = (): Document =>
  documentOf(
    [
      span(1, '05-03', '05-07', {
        actualStart: START_OF('2027-05-03'),
        actualFinish: FINISH_OF('2027-05-20'),
        percentComplete: 100,
      }),
      span(2, '05-10', '05-14', {
        actualStart: START_OF('2027-05-12'),
        actualFinish: FINISH_OF('2027-05-14'),
        percentComplete: 100,
        after: [[1, FS]],
      }),
    ],
    { statusDate: AFTER_MAY },
  )

export const DOUBLE_LINE_SAME = (): Document =>
  documentOf([span(1, '05-10', '05-11'), span(2, '05-12', '05-13', { after: [[1, FS], [1, FS]] })], { statusDate: BEFORE_ALL })

export const DOUBLE_LINE_DIFFERENT = (): Document =>
  documentOf([span(1, '05-10', '05-11'), span(2, '05-12', '05-13', { after: [[1, FS], [1, 3]] })], { statusDate: BEFORE_ALL })

export const MILESTONE_WITH_SPAN = (): Document =>
  documentOf([span(1, '05-10', '05-14', { milestone: true })], { statusDate: BEFORE_ALL })

export const PARENT_DONE_CHILD_OPEN = (): Document =>
  documentOf(
    [
      span(1, '05-10', '05-21', {
        actualStart: START_OF('2027-05-10'),
        actualFinish: FINISH_OF('2027-05-21'),
        percentComplete: 100,
      }),
      span(2, '05-10', '05-14', { parent: 1, actualStart: START_OF('2027-05-10'), percentComplete: 40 }),
    ],
    { statusDate: AFTER_MAY },
  )

export const ACTUAL_AFTER_STATUS_DATE = (): Document =>
  documentOf([span(1, '05-10', '05-14', { actualStart: START_OF('2027-06-05'), percentComplete: 10 })], {
    statusDate: '2027-05-31T17:00:00',
  })
