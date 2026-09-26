// G26: icon labels and question text, copied verbatim from src/adapter/screen-renderer/*
import { readFileSync } from 'node:fs'
const ROOT = 'src/adapter/screen-renderer/' // run from the repository root
const displayWords = JSON.parse(readFileSync(ROOT + 'display-words.json', 'utf8'))
type DisplayLanguage = 'ja' | 'en'
type IconId = string

// app-header-items.ts:42-50 / command-palette.ts:38-53 / open-modals.ts:90-99 (identical)
const NO_WORDS = ''
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry: any) => [entry.rowId, entry]))
function entryLabelA(icon: IconId, language: DisplayLanguage): string {
  const word = (WORDS_BY_ROW.get(icon) as any)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}
// properties-panel.ts:65,77,81-85
const ENTRY_WORDS_BY_ROW = new Map(displayWords.icons.map((entry: any) => [entry.rowId, entry]))
const NO_ENTRY_WORDS = ''
function entryLabelP(icon: IconId, language: DisplayLanguage): string {
  const word = (ENTRY_WORDS_BY_ROW.get(icon) as any)?.label[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}
// tooltips.ts:32,67-72
const HINTS_BY_ROW = new Map(displayWords.icons.map((entry: any) => [entry.rowId, entry]))
function iconHint(icon: IconId, language: DisplayLanguage): string {
  const held: any = HINTS_BY_ROW.get(icon)
  if (held === undefined) return icon
  if (held.hint[language] !== '') return held.hint[language]
  return held.label[language] === '' ? icon : held.label[language]
}

// notices.ts:29,119-133
function makeNotices(words: any) {
  const QUESTIONS_BY_ROW = new Map(words.questions.map((entry: any) => [entry.rowId, entry]))
  const UNLISTED_QUESTION_ROW = 'QN-8'
  function questionCell(row: string, language: DisplayLanguage): string | undefined {
    const word = (QUESTIONS_BY_ROW.get(row) as any)?.text[language]
    if (word === undefined) return undefined
    return word === '' ? undefined : word
  }
  function questionText(question: string, language: DisplayLanguage): string {
    const word = questionCell(question, language)
    if (word !== undefined) return word
    const unlisted = questionCell(UNLISTED_QUESTION_ROW, language)
    if (unlisted !== undefined) return unlisted
    return NO_WORDS
  }
  // open-modals.ts:72,178-182
  function questionTextOf(row: string, language: DisplayLanguage): string {
    const word = (QUESTIONS_BY_ROW.get(row) as any)?.text[language]
    if (word === undefined) return NO_WORDS
    return word === '' ? NO_WORDS : word
  }
  return { questionText, questionTextOf }
}

let diffs = 0
const icons = [...displayWords.icons.map((e: any) => e.rowId), 'IC-999', '']
for (const lang of ['ja', 'en'] as const) {
  for (const icon of icons) {
    const a = entryLabelA(icon, lang), p = entryLabelP(icon, lang)
    if (a !== p) { diffs++; console.log('entryLabel DIFF', icon, lang, a, p) }
  }
}
console.log(`entryLabel: ${icons.length * 2} inputs, ${diffs} differ between the 4 copies`)
let hintDiff = 0
for (const icon of icons) if (iconHint(icon, 'en') !== entryLabelA(icon, 'en')) hintDiff++
console.log(`iconHint vs entryLabel differ on ${hintDiff}/${icons.length} icons (en), e.g. IC-5:`, JSON.stringify(iconHint('IC-5', 'en')), 'vs', JSON.stringify(entryLabelA('IC-5', 'en')), '; IC-999:', JSON.stringify(iconHint('IC-999', 'en')), 'vs', JSON.stringify(entryLabelA('IC-999', 'en')))

const today = makeNotices(displayWords)
for (const lang of ['ja', 'en'] as const) {
  console.log(`QN-9/${lang} equal today:`, today.questionText('QN-9', lang) === today.questionTextOf('QN-9', lang))
}
console.log('unlisted row QN-99/en -> notices.questionText:', JSON.stringify(today.questionText('QN-99', 'en')), '| open-modals.questionTextOf:', JSON.stringify(today.questionTextOf('QN-99', 'en')))
const blanked = structuredClone(displayWords)
blanked.questions.find((q: any) => q.rowId === 'QN-9').text.en = ''
const b = makeNotices(blanked)
console.log('QN-9 with empty en cell -> notices.questionText:', JSON.stringify(b.questionText('QN-9', 'en')), '| open-modals.questionTextOf:', JSON.stringify(b.questionTextOf('QN-9', 'en')))
