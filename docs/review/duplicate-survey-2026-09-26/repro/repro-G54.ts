// G54 (extra member): selection.ts:37-52 isSameItem vs selection-values.ts:241-246 isSameObject
function isSameItem(a: any, b: any): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'task': return a.uid === b.uid
    case 'dependency': return a.successorUid === b.successorUid && a.ordinal === b.ordinal
    case 'highlightBox':
    case 'commentBox': return a.id === b.id
    case 'statusLine': return true
  }
  return false
}
function isSameObject(a: any, b: any): boolean {
  const left = a, right = b
  const fields = Object.keys(left)
  return fields.length === Object.keys(right).length && fields.every((field) => left[field] === right[field])
}
const pairs: [any, any][] = [
  [{ kind: 'task', uid: 1 }, { kind: 'task', uid: 1 }],
  [{ kind: 'task', uid: 1 }, { kind: 'task', uid: 2 }],
  [{ kind: 'dependency', successorUid: 2, ordinal: 0 }, { kind: 'dependency', successorUid: 2, ordinal: 0 }],
  [{ kind: 'dependency', successorUid: 2, ordinal: 0 }, { kind: 'dependency', successorUid: 2, ordinal: 1 }],
  [{ kind: 'highlightBox', id: 'h' }, { kind: 'commentBox', id: 'h' }],
  [{ kind: 'statusLine' }, { kind: 'statusLine' }],
  [{ kind: 'task', uid: 1 }, { uid: 1, kind: 'task' }],
  [{ kind: 'task', uid: 1 }, { kind: 'task', uid: 1, taskUid: 1 }],
  [{ kind: 'task', uid: 1 }, { kind: 'task', uid: 1, extra: undefined }],
]
for (const [a, b] of pairs) {
  const s = isSameItem(a, b), o = isSameObject(a, b)
  console.log((s === o ? 'same ' : 'DIFF ') + JSON.stringify(a) + ' ~ ' + JSON.stringify(b) + ` -> isSameItem ${s}, isSameObject ${o}`)
}
