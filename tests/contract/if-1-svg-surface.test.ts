// Contract tests: the IF-1 SvgSurface seam puts the finished SVG string on the screen.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { domSvgSurface } from '../../src/framework/dom-svg-surface/dom-svg-surface'

// Why: IF-1 is transcribed, not parsed: seams.contract.test.ts already walks
// every row, so a failure here names IF-1 alone.
const IF_1 = {
  id: 'IF-1',
  seam: 'SvgSurface',
  declaredBy: 'SvgRenderer',
  declaredIn: join('src', 'adapter', 'svg-renderer'),
  implementedBy: 'DomSvgSurface',
  implementedIn: join('src', 'framework', 'dom-svg-surface'),
  supplies: '作った SVG 文字列を画面に載せる',
} as const

const DECLARATION = join(IF_1.declaredIn, 'svg-surface.ts')
const DECLARING_ENTRY = join(IF_1.declaredIn, 'svg-renderer.ts')
const IMPLEMENTING_ENTRY = join(IF_1.implementedIn, 'dom-svg-surface.ts')

const read = (path: string): string => {
  expect(existsSync(path), `${IF_1.id}: ${path} does not exist`).toBe(true)
  return readFileSync(path, 'utf8')
}

// Summary: code() blanks the comments of a source, so a scan reads only what it declares.
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')

const importsOf = (source: string): string[] =>
  [...code(source).matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] as string)

// Summary: bareHost() records every innerHTML write to a host that has no other member.
const bareHost = (): {
  host: Element
  writes: readonly string[]
  content: () => string
} => {
  const writes: string[] = []
  let content = ''
  const host = {
    get innerHTML(): string {
      return content
    },
    set innerHTML(value: string) {
      writes.push(value)
      content = value
    },
  }
  return { host: host as unknown as Element, writes, content: () => content }
}

const A_PICTURE = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'
const ANOTHER_PICTURE = '<svg viewBox="0 0 20 20"><rect width="20" height="20"/></svg>'

// Spec: IF-1, T-065
describe(`${IF_1.id} ${IF_1.seam} -- the seam reaches across the layer boundary`, () => {
  it(`is declared in a file of its own inside ${IF_1.declaredBy}`, () => {
    expect(code(read(DECLARATION))).toMatch(/export interface SvgSurface\b/)
  })

  it(`leaves through the public entry of ${IF_1.declaredBy} (Chapter 5.3, MUST)`, () => {
    expect(code(read(DECLARING_ENTRY))).toMatch(
      /export type \{[^}]*\bSvgSurface\b[^}]*\} from '\.\/svg-surface'/,
    )
  })

  it(`${IF_1.implementedBy} takes it from that entry and reads no other file of the folder`, () => {
    const reaching = importsOf(read(IMPLEMENTING_ENTRY)).filter((p) =>
      p.includes('adapter/svg-renderer'),
    )
    expect(reaching.length, `${IF_1.id}: nothing imports the seam`).toBeGreaterThan(0)
    for (const path of reaching) {
      expect(path, `${IF_1.id}: reaches past the public entry of ${IF_1.declaredBy}`).toMatch(
        /adapter\/svg-renderer\/svg-renderer$/,
      )
    }
  })
})

// Spec: IF-1, CP-19, CP-26
describe(`${IF_1.id} ${IF_1.seam} -- ${IF_1.supplies}`, () => {
  it('puts the string it is given on the host', () => {
    const { host, writes, content } = bareHost()
    domSvgSurface(host).showSvg(A_PICTURE)
    expect(content()).toBe(A_PICTURE)
    expect(writes).toEqual([A_PICTURE])
  })

  it('shows the whole picture, replacing the one before it', () => {
    const { host, content } = bareHost()
    const surface = domSvgSurface(host)
    surface.showSvg(A_PICTURE)
    surface.showSvg(ANOTHER_PICTURE)
    expect(content()).toBe(ANOTHER_PICTURE)
  })

  // Spec: BO-1, BO-5, NFR-011, T-078
  it('touches nothing until it is told to show something', () => {
    const { host, writes, content } = bareHost()
    domSvgSurface(host)
    expect(writes).toEqual([])
    expect(content()).toBe('')
  })

  // Spec: LY-5
  it('needs no member of the host but the one it writes into', () => {
    const { host } = bareHost()
    expect(() => domSvgSurface(host).showSvg(A_PICTURE)).not.toThrow()
  })
})

// Spec: LR-6
describe(`${IF_1.id} ${IF_1.seam} -- only a value crosses it (LR-6)`, () => {
  it('declares a string parameter and no browser type', () => {
    const declaration = code(read(DECLARATION))
    expect(declaration).toMatch(/showSvg\s*\(\s*\w+\s*:\s*string\s*\)\s*:\s*void/)
    expect(importsOf(read(DECLARATION))).toEqual([])
    // Why: Entity and UseCase see only this declaration through SvgRenderer's entry,
    // so it is the file that must name no browser type.
    const browserTypes =
      /\b(Element|Node|HTMLElement|SVGElement|SVGSVGElement|DocumentFragment|Window|window|document)\b/
    expect(declaration).not.toMatch(browserTypes)
  })

  it('hands the host the very string it was given, unwrapped', () => {
    const { host, content } = bareHost()
    domSvgSurface(host).showSvg(A_PICTURE)
    expect(typeof content()).toBe('string')
    expect(content()).toBe(A_PICTURE)
  })

  it('gives back nothing but the members the seam declares', () => {
    const { host } = bareHost()
    const surface = domSvgSurface(host)
    expect(Object.keys(surface)).toEqual(['showSvg', 'showMarqueeOverlaySvg'])
    expect(typeof surface.showSvg).toBe('function')
    expect(surface.showSvg(A_PICTURE)).toBeUndefined()
  })
})

describe(`${IF_1.id} ${IF_1.seam} -- showing the same picture twice`, () => {
  // Spec: IF-1
  it('does not write the host again: 実装は、渡された文字列が前に載せたものと同じなら画面を書き換えないこと（MUST）', () => {
    const { host, writes, content } = bareHost()
    const surface = domSvgSurface(host)
    surface.showSvg(A_PICTURE)
    surface.showSvg(A_PICTURE)
    expect(writes).toEqual([A_PICTURE])
    expect(content()).toBe(A_PICTURE)
  })

  it('writes again as soon as the picture differs', () => {
    const { host, writes } = bareHost()
    const surface = domSvgSurface(host)
    surface.showSvg(A_PICTURE)
    surface.showSvg(A_PICTURE)
    surface.showSvg(ANOTHER_PICTURE)
    expect(writes).toEqual([A_PICTURE, ANOTHER_PICTURE])
  })

  it('remembers per surface, not across surfaces', () => {
    // Why: a module-level cache would leave a second host blank, which NFR-011
    // forbids for its first picture.
    const first = bareHost()
    const second = bareHost()
    domSvgSurface(first.host).showSvg(A_PICTURE)
    domSvgSurface(second.host).showSvg(A_PICTURE)
    expect(second.writes).toEqual([A_PICTURE])
  })
})
