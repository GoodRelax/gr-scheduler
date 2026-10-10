// CR-731 spec-only cases: the dictionary of the fix window (delayFixColumns, delayFixes, the hints, the choice words) and the color S-573

import { describe, expect, it } from 'vitest'

import { WORDS, cellOf, rowText } from './cr-731-stage'
import { specTable } from './spec-table'

type Words = { readonly ja: string; readonly en: string }

const ICONS = ['IC-154', 'IC-155', 'IC-156', 'IC-157', 'IC-158', 'IC-159', 'IC-160']

const HINTS: Readonly<Record<string, Words>> = {
  'IC-154': { ja: '診断の結果の表を出す', en: 'Show the diagnosis table' },
  'IC-155': { ja: '直す案の表を出す（修正前と修正後）', en: 'Show the fix proposals (before and after)' },
  'IC-156': { ja: '直した記録の表を出す', en: 'Show the log of fixes' },
  'IC-157': { ja: '今のファイルに上書きして保存してから、チェックした行を直す', en: 'Save over the current file, then fix the checked rows' },
  'IC-158': { ja: '直す前の文書を別名で保存してから、チェックした行を直す', en: 'Save a backup under another name, then fix the checked rows' },
  'IC-159': { ja: '人が直す 1 つ前の指摘へ移る', en: 'Go to the previous finding to fix by hand' },
  'IC-160': { ja: '人が直す次の指摘へ移る', en: 'Go to the next finding to fix by hand' },
}

const CHOICES: readonly (readonly [string, Words])[] = [
  ['FA-1', { ja: '{先行} → {後続} を消す', en: 'Delete {Predecessor} → {Successor}' }],
  ['FA-3', { ja: 'この依存線を残す', en: 'Keep This Dependency Line' }],
  ['FA-4', { ja: '予定日を {date} にする', en: 'Set Planned Date to {date}' }],
  ['FA-7', { ja: '中断の値を外す', en: 'Clear the Pause Values' }],
  ['FA-7', { ja: '着手したことにする', en: 'Mark as Started' }],
  ['FA-9', { ja: '親の実績終了日を外す', en: "Clear the Parent Task's Actual Finish" }],
  ['FA-9', { ja: '未完了の子をすべて親の実績終了日で完了にする', en: "Finish Every Unfinished Child on the Parent Task's Actual Finish" }],
  ['FA-14', { ja: 'マイルストーンの実績を外す', en: "Clear the Milestone's Actuals" }],
  ['FA-14', { ja: '未完了の先行をすべてマイルストーンの日で完了にする', en: "Finish Every Unfinished Predecessor on the Milestone's Date" }],
  ['FA-15', { ja: '後続の予定を依存線が求める最も早い日へ送る', en: 'Move the Successor to the Earliest Date the Dependency Line Allows' }],
  ['FA-15', { ja: 'その依存線を消す', en: 'Delete the Dependency Line' }],
  ['FA-16', { ja: 'その依存線を消す', en: 'Delete the Dependency Line' }],
  ['FA-20', { ja: '基準日をその実績の日へ進める', en: 'Move the Status Date to the Actual Date' }],
  ['FA-23', { ja: '完了にする', en: 'Mark as Finished' }],
  ['FA-23', { ja: 'まだ作業中とする', en: 'Mark as Still in Progress' }],
]

const PARTS = [
  'fixCount',
  'humanCounter',
  'automatic',
  'choose',
  'suggestedDate',
  'byHand',
  'suggested',
  'choosePlaceholder',
  'openFieldHint',
  'cascadePrefix',
  'readOnlyReason',
  'fixedNotice',
  'refusedNotice',
]

const entryOf = (rowId: string): Record<string, any> => {
  const found = (WORDS['icons'] as readonly Record<string, any>[]).find((one) => one['rowId'] === rowId)
  if (found === undefined) throw new Error(`the dictionary has no icon ${rowId}`)
  return found
}

describe('FM-1 to FM-8 and the sections delayFixColumns and delayFixes', () => {
  it('delayFixColumns holds one word for each row of T-374, in the order of the table, in both languages', () => {
    const section = WORDS['delayFixColumns'] as readonly Record<string, any>[]
    expect(section.map((one) => one['rowId'])).toEqual(specTable('T-374').rows.map((one) => one.id))
    for (const one of section) {
      expect(String(one['text']['ja']).length, one['rowId']).toBeGreaterThan(0)
      expect(String(one['text']['en']).length, one['rowId']).toBeGreaterThan(0)
    }
  })

  it('delayFixes holds every part the window draws, in both languages', () => {
    const section = WORDS['delayFixes'] as readonly Record<string, any>[]
    expect(section.map((one) => one['part'])).toEqual(expect.arrayContaining(PARTS))
    for (const one of section) {
      expect(String(one['text']['ja']).length, one['part']).toBeGreaterThan(0)
      expect(String(one['text']['en']).length, one['part']).toBeGreaterThan(0)
    }
  })

  it('the four words of a fix type are the words T-373 writes in its fix type column', () => {
    const section = WORDS['delayFixes'] as readonly Record<string, any>[]
    const ja = ['automatic', 'choose', 'suggestedDate', 'byHand'].map((part) => section.find((one) => one['part'] === part)?.['text']['ja'])
    expect(ja).toEqual(['機械', '選ぶ', '日付の候補', '手で直す'])
  })
})

describe('IC-154 to IC-160 -- the label comes from the table, the hint is the one the user chose (JDG-1929)', () => {
  it.each(ICONS)('%s: a label in both languages, and a row in T-109', (icon) => {
    expect(entryOf(icon)['label']['ja'].length).toBeGreaterThan(0)
    expect(entryOf(icon)['label']['en'].length).toBeGreaterThan(0)
    expect(rowText('T-109', icon)).toContain('Delay Diagnostics Report')
  })

  it.each(ICONS)('%s: the hint reads as the user chose it, in Japanese and in English', (icon) => {
    expect(entryOf(icon)['hint']).toEqual(HINTS[icon])
  })
})

describe('FA-1 to FA-23 -- the words of the choices are the ones the user settled (JDG-1950)', () => {
  const text = JSON.stringify(WORDS)

  it.each(CHOICES)('%s: the pair stands in the dictionary', (_row, words) => {
    expect(text).toContain(JSON.stringify(words.ja).slice(1, -1))
    expect(text).toContain(JSON.stringify(words.en).slice(1, -1))
  })

  it('the number of choices in the settled list is the number the choose rows of T-373 carry', () => {
    const wanted = new Map<string, number>()
    for (const [row] of CHOICES) wanted.set(row, (wanted.get(row) ?? 0) + 1)
    for (const [row, count] of wanted) {
      if (row === 'FA-1' || row === 'FA-3' || row === 'FA-4') continue
      expect(cellOf('T-373', row, '直し（修正後）'), row).toMatch(new RegExp(`択は\\s*${String(count)}\\s*つ`))
    }
  })
})

describe('S-573 -- the color that marks the related tasks', () => {
  it('is the pair the user left to be compared on a real screen (JDG-1952): light #07695a, dark #4fd1b5, not following the hue', () => {
    expect(cellOf('T-236', 'S-573', '明るいテーマ')).toContain('#07695a')
    expect(cellOf('T-236', 'S-573', '暗いテーマ')).toContain('#4fd1b5')
  })

  it('stands in the table of colors next to the other marks, as a color (T-236)', () => {
    expect(specTable('T-236').rows.map((one) => one.id)).toContain('S-573')
  })
})
