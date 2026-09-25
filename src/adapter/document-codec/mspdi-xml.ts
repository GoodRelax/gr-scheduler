// DocumentCodec, MSPDI half -- converts between XML text and the element tree.
// @unit      UF-153  (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

export interface MspdiFault {
  readonly at: string
  readonly what: string
}

export interface XmlElement {
  readonly name: string
  // TRAP: meaningful only when children is empty; whitespace between child elements is layout.
  readonly text: string
  readonly children: readonly XmlElement[]
}

interface OpenElement {
  readonly name: string
  readonly texts: string[]
  readonly children: XmlElement[]
}

type XmlReading =
  | { readonly ok: true; readonly root: XmlElement }
  | { readonly ok: false; readonly fault: MspdiFault }

const NAME_START = /[A-Za-z_:]/
const NAME_REST = /[A-Za-z0-9._:\-]/

/** @purity pure */
export function fault(at: string, what: string): MspdiFault {
  return { at, what }
}

const NAMED_REFERENCES: Readonly<Record<string, string>> = {
  lt: '<', gt: '>', amp: '&', quot: '"', apos: "'",
}

/** @purity pure */
function decodedText(raw: string): string | null {
  if (!raw.includes('&')) return raw
  let out = ''
  let foundAt = 0
  while (foundAt < raw.length) {
    const amp = raw.indexOf('&', foundAt)
    if (amp < 0) {
      out += raw.slice(foundAt)
      break
    }
    out += raw.slice(foundAt, amp)
    const end = raw.indexOf(';', amp)
    if (end < 0) return null
    const body = raw.slice(amp + 1, end)
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      if (!Number.isFinite(code) || body.length < 3) return null
      out += String.fromCodePoint(code)
    } else if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      if (!Number.isFinite(code) || body.length < 2) return null
      out += String.fromCodePoint(code)
    } else {
      const named = NAMED_REFERENCES[body]
      if (named === undefined) return null
      out += named
    }
    foundAt = end + 1
  }
  return out
}

// WHY: an explicit stack, since nothing bounds nesting before validation and recursion would overflow.
// see FR-023
/** @purity pure */
export function readXml(text: string): XmlReading {
  const stack: OpenElement[] = []
  let root: XmlElement | null = null
  let foundAt = 0

  const where = (): string =>
    stack.length === 0 ? '' : '/' + stack.map((frame) => frame.name).join('/')

  while (foundAt < text.length) {
    const open = text.indexOf('<', foundAt)
    if (open < 0) {
      if (text.slice(foundAt).trim() !== '') {
        return { ok: false, fault: fault(where(), 'character data outside the root element') }
      }
      break
    }
    if (open > foundAt) {
      const raw = text.slice(foundAt, open)
      const frame = stack[stack.length - 1]
      if (frame === undefined) {
        if (raw.trim() !== '') {
          return { ok: false, fault: fault('', 'character data outside the root element') }
        }
      } else {
        const decoded = decodedText(raw)
        if (decoded === null) {
          return { ok: false, fault: fault(where(), 'an entity reference this reader does not define') }
        }
        frame.texts.push(decoded)
      }
    }
    foundAt = open

    if (text.startsWith('<!--', foundAt)) {
      const end = text.indexOf('-->', foundAt + 4)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated comment') }
      foundAt = end + 3
      continue
    }
    if (text.startsWith('<![CDATA[', foundAt)) {
      const end = text.indexOf(']]>', foundAt + 9)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated CDATA section') }
      const frame = stack[stack.length - 1]
      if (frame === undefined) {
        return { ok: false, fault: fault('', 'a CDATA section outside the root element') }
      }
      frame.texts.push(text.slice(foundAt + 9, end))
      foundAt = end + 3
      continue
    }
    if (text.startsWith('<!DOCTYPE', foundAt)) {
      return {
        ok: false,
        fault: fault('', 'a DOCTYPE declaration (FR-023 disables external entities, MUST)'),
      }
    }
    if (text.startsWith('<?', foundAt)) {
      const end = text.indexOf('?>', foundAt + 2)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated processing instruction') }
      foundAt = end + 2
      continue
    }
    if (text.startsWith('</', foundAt)) {
      const end = text.indexOf('>', foundAt + 2)
      if (end < 0) return { ok: false, fault: fault(where(), 'an unterminated end tag') }
      const name = text.slice(foundAt + 2, end).trim()
      const frame = stack.pop()
      if (frame === undefined) {
        return { ok: false, fault: fault('', `an end tag </${name}> with no start tag`) }
      }
      if (localName(name) !== frame.name) {
        return { ok: false, fault: fault(where(), `an end tag </${name}> closing <${frame.name}>`) }
      }
      const built: XmlElement = {
        name: frame.name,
        text: frame.texts.join(''),
        children: frame.children,
      }
      const parent = stack[stack.length - 1]
      if (parent === undefined) root = built
      else parent.children.push(built)
      foundAt = end + 1
      continue
    }

    const started = readStartTag(text, foundAt, where())
    if (!started.ok) return { ok: false, fault: started.fault }
    if (root !== null && stack.length === 0) {
      return { ok: false, fault: fault('', 'a second root element') }
    }
    if (started.isEmpty) {
      const built: XmlElement = { name: started.name, text: '', children: [] }
      const parent = stack[stack.length - 1]
      if (parent === undefined) root = built
      else parent.children.push(built)
    } else {
      stack.push({ name: started.name, texts: [], children: [] })
    }
    foundAt = started.after
  }

  if (stack.length > 0) return { ok: false, fault: fault(where(), 'an element that was never closed') }
  if (root === null) return { ok: false, fault: fault('', 'no element at all') }
  return { ok: true, root }
}

type StartTagReading =
  | { readonly ok: true; readonly name: string; readonly isEmpty: boolean; readonly after: number }
  | { readonly ok: false; readonly fault: MspdiFault }

/** @purity pure */
function readStartTag(text: string, from: number, path: string): StartTagReading {
  let foundAt = from + 1
  const first = text[foundAt]
  if (first === undefined || !NAME_START.test(first)) {
    return { ok: false, fault: fault(path, 'a `<` that does not start an element name') }
  }
  let end = foundAt + 1
  while (end < text.length) {
    const character = text[end]
    if (character === undefined || !NAME_REST.test(character)) break
    end += 1
  }
  const name = localName(text.slice(foundAt, end))
  foundAt = end

  for (;;) {
    while (foundAt < text.length && /\s/.test(text[foundAt] ?? '')) foundAt += 1
    if (text.startsWith('/>', foundAt)) return { ok: true, name, isEmpty: true, after: foundAt + 2 }
    if (text.startsWith('>', foundAt)) return { ok: true, name, isEmpty: false, after: foundAt + 1 }
    const attributeStart = foundAt
    while (foundAt < text.length && NAME_REST.test(text[foundAt] ?? '')) foundAt += 1
    const attributeName = text.slice(attributeStart, foundAt)
    if (attributeName === '') {
      return { ok: false, fault: fault(path, `an unterminated start tag <${name}>`) }
    }
    while (foundAt < text.length && /\s/.test(text[foundAt] ?? '')) foundAt += 1
    if (text[foundAt] !== '=') {
      return { ok: false, fault: fault(path, `an attribute ${attributeName} with no value`) }
    }
    foundAt += 1
    while (foundAt < text.length && /\s/.test(text[foundAt] ?? '')) foundAt += 1
    const quote = text[foundAt]
    if (quote !== '"' && quote !== "'") {
      return { ok: false, fault: fault(path, `an unquoted attribute ${attributeName}`) }
    }
    const close = text.indexOf(quote, foundAt + 1)
    if (close < 0) {
      return { ok: false, fault: fault(path, `an unterminated attribute ${attributeName}`) }
    }
    foundAt = close + 1
    // WHY: refused, since the XSD declares no attribute and carry has no room for one; it would vanish on write.
    if (attributeName !== 'xmlns' && !attributeName.startsWith('xmlns:')) {
      return {
        ok: false,
        fault: fault(path, `the attribute ${attributeName}, which the official schema does not declare`),
      }
    }
  }
}

/** @purity pure */
function localName(qualified: string): string {
  const colon = qualified.lastIndexOf(':')
  return colon < 0 ? qualified : qualified.slice(colon + 1)
}

/** @purity pure */
function escapedText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// see CN-5
/** @purity pure */
export function writtenXml(root: XmlElement, namespace: string): string {
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n']
  type Step = { readonly element: XmlElement; readonly depth: number; readonly isClose: boolean }
  const steps: Step[] = [{ element: root, depth: 0, isClose: false }]
  while (steps.length > 0) {
    const step = steps.pop()
    if (step === undefined) break
    const pad = '  '.repeat(step.depth)
    if (step.isClose) {
      parts.push(`${pad}</${step.element.name}>\n`)
      continue
    }
    const attributes = step.depth === 0 ? ` xmlns="${escapedText(namespace)}"` : ''
    if (step.element.children.length === 0) {
      parts.push(`${pad}<${step.element.name}${attributes}>`)
      parts.push(escapedText(step.element.text))
      parts.push(`</${step.element.name}>\n`)
      continue
    }
    parts.push(`${pad}<${step.element.name}${attributes}>\n`)
    steps.push({ element: step.element, depth: step.depth, isClose: true })
    for (let index = step.element.children.length - 1; index >= 0; index -= 1) {
      const child = step.element.children[index]
      if (child !== undefined) steps.push({ element: child, depth: step.depth + 1, isClose: false })
    }
  }
  return parts.join('')
}
