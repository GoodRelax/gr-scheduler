// G53: frame-loop predicates vs use-case predicates
// frame-loop.ts:1207-1210
function isQuestionAskedIn(session: any) { return session.fileFlow.confirmationState.kind === 'questionAsked' }
// file-flow-values.ts:680-683
function isQuestionAsked(values: any) { return values.confirmationState.kind === 'questionAsked' }
for (const kind of ['noQuestion', 'questionAsked', 'answered']) {
  const values = { confirmationState: { kind } }
  console.log('confirmationState', kind, '->', isQuestionAskedIn({ fileFlow: values }), isQuestionAsked(values))
}

// field-entry.ts:61-64
function isEditingFieldIn(session: any) { return session.fieldEntry.fieldEditState.kind === 'editingField' }
// field-entry-values.ts:264-267
function isEditedField(edit: any, fieldRow: string) { return edit.kind === 'editingField' && edit.fieldRow === fieldRow }
const edit = { kind: 'editingField', fieldRow: 'PR-1' }
console.log('fieldEditState editingField PR-1, asked about PR-2 -> isEditingFieldIn:', isEditingFieldIn({ fieldEntry: { fieldEditState: edit } }), '| isEditedField:', isEditedField(edit, 'PR-2'))

// isDeliveringNoticesIn (frame-loop.ts:864-867) vs isDeliveringNotices (notify-change-watchers.ts:64-67)
// Model the only caller, frame-loop.ts:1381-1389 audience.deliver, with notice-values.ts:221-233 and notify-change-watchers.ts:71-102.
function isDeliveringNoticesIn(session: any) { return session.notices.changeDeliveryState.kind === 'delivering' }
function isDeliveringNotices(watchers: any) { return watchers.isDelivering }
let session: any = { notices: { changeDeliveryState: { kind: 'idle' } } }
const watchers: any = { byWatcher: new Map(), isDelivering: false }
const seen: string[] = []
function probe(at: string) { seen.push(`${at}: session=${isDeliveringNoticesIn(session)} watchers=${isDeliveringNotices(watchers)}`) }
function send(ev: any) {
  const st = session.notices.changeDeliveryState.kind
  if (ev.type === 'documentReplaced' && st !== 'delivering') session = { notices: { changeDeliveryState: { kind: 'delivering' } } }
  if (ev.type === 'changeDelivered' && st !== 'idle') session = { notices: { changeDeliveryState: { kind: 'idle' } } }
  probe('after ' + ev.type)
}
function notify(throwIn: boolean) {
  watchers.isDelivering = true
  try {
    for (const w of [...watchers.byWatcher.values()]) {
      if (throwIn) throw new Error('changeNoticeFor threw')
      try { w() } catch { /* failure */ }
    }
    return { failures: [] }
  } finally { watchers.isDelivering = false }
}
function deliver(throwIn = false) {
  send({ type: 'documentReplaced' })
  try { const o = notify(throwIn); send({ type: 'changeDelivered', silentWatchers: o.failures.length }) }
  catch (f) { send({ type: 'changeDelivered', silentWatchers: 0 }); throw f }
}
watchers.byWatcher.set('w1', () => probe('inside a watcher'))
deliver()
try { deliver(true) } catch { probe('after a thrown round') }
for (const line of seen) console.log(line)
console.log('constructed: session delivering, watchers idle ->', isDeliveringNoticesIn({ notices: { changeDeliveryState: { kind: 'delivering' } } }), isDeliveringNotices({ isDelivering: false }))
