// Contract test: IF-1 `SvgSurface` -- the seam between SvgRenderer (Adapter,
// CP-19) and DomSvgSurface (Framework, CP-26).
//
// Table T-218 row TS-5: a contract test belongs to neither side of a seam. The
// side that declares `SvgSurface` is `pure` and cannot be run against a screen;
// the side that implements it holds no picture of its own. Only the seam
// between them can be asked whether the string one built is the string the
// other showed, so that question is asked here, once, from the table.
//
// Driven by a fixed copy of table T-065 row IF-1 (Chapter 1.9 :275). The copy
// is transcribed rather than parsed: `seams.contract.test.ts` already walks all
// nine rows structurally, and this file is about the one row's behaviour, so a
// failure here names IF-1 and nothing else.
//
// The specification this file is held to:
//   T-065 IF-1   `SvgSurface`, declared by SvgRenderer, implemented by
//                DomSvgSurface, supplying "put the finished SVG string on the
//                screen"
//   Chapter 5.3  the declaration sits in its own file; the public entry
//                re-exports it (MUST); nothing outside a folder reads any file
//                in it but the public entry (MUST NOT)
//   T-061 LR-6   `Entity` and `UseCase` must not touch a type the browser
//                supplies -- which is why what crosses this seam is a value
//   T-060 LY-5   only `Framework` holds a current value
//   T-077 BO-1 / BO-5, NFR-011  nothing is drawn before the first frame is due
//   T-078        the whole of what makes a frame run (MUST NOT run on anything
//                else)
//
// ⚠️ The environment is `node` (vitest.config.ts). The host is a bare object
// carrying the one member this seam touches, so the test never needs a DOM.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { domSvgSurface } from '../../src/framework/dom-svg-surface/dom-svg-surface'

/**
 * Fixed data copied from table T-065, row IF-1, plus the two folders Chapter
 * 5.3 draws for the components it names.
 */
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

/** Drops comments, so a scan reads what the file declares and not what it says. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** Every module specifier the file imports from. */
const importsOf = (source: string): string[] =>
  [...code(source).matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] as string)

/**
 * A host with the one member IF-1 needs, and a record of every write to it.
 * ⚠️ Not a DOM node: the seam is supposed to need nothing more than this.
 */
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

describe(`${IF_1.id} ${IF_1.seam} -- the seam reaches across the layer boundary`, () => {
  it(`is declared in a file of its own inside ${IF_1.declaredBy}`, () => {
    // Chapter 5.3 (MUST): the declaration lives in the declaring component's
    // folder under the stem of the interface name.
    expect(code(read(DECLARATION))).toMatch(/export interface SvgSurface\b/)
  })

  it(`leaves through the public entry of ${IF_1.declaredBy} (Chapter 5.3, MUST)`, () => {
    // "公開エントリは、そのインターフェースを再び公開すること（MUST）" --
    // otherwise the implementing layer would have to read a file that is not
    // the public entry, which the same section forbids.
    expect(code(read(DECLARING_ENTRY))).toMatch(
      /export type \{[^}]*\bSvgSurface\b[^}]*\} from '\.\/svg-surface'/,
    )
  })

  it(`${IF_1.implementedBy} takes it from that entry and reads no other file of the folder`, () => {
    // The half of the MUST that the re-export exists to serve: Chapter 5.3's
    // MUST NOT is broken by the reader, not by the writer, so it is the
    // implementing unit that has to be looked at.
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

describe(`${IF_1.id} ${IF_1.seam} -- ${IF_1.supplies}`, () => {
  it('puts the string it is given on the host', () => {
    const { host, writes, content } = bareHost()
    domSvgSurface(host).showSvg(A_PICTURE)
    expect(content()).toBe(A_PICTURE)
    expect(writes).toEqual([A_PICTURE])
  })

  it('shows the whole picture, replacing the one before it', () => {
    // The declaration takes a whole picture rather than a patch, so the second
    // one is what the host carries afterwards -- not the two joined.
    const { host, content } = bareHost()
    const surface = domSvgSurface(host)
    surface.showSvg(A_PICTURE)
    surface.showSvg(ANOTHER_PICTURE)
    expect(content()).toBe(ANOTHER_PICTURE)
  })

  it('touches nothing until it is told to show something', () => {
    // T-077 BO-1: nothing is drawn until the sizes are settled, and BO-5 is
    // what puts the first picture out (NFR-011). Wiring the surface up is not
    // a trigger of table T-078, so wiring it must not paint.
    const { host, writes, content } = bareHost()
    domSvgSurface(host)
    expect(writes).toEqual([])
    expect(content()).toBe('')
  })

  it('needs no member of the host but the one it writes into', () => {
    // LY-5 puts the current value in `Framework`, so the surface may remember
    // what it showed -- but it may not need the host to be a real DOM node for
    // that. The bare host above is the whole of what this seam requires.
    const { host } = bareHost()
    expect(() => domSvgSurface(host).showSvg(A_PICTURE)).not.toThrow()
  })
})

describe(`${IF_1.id} ${IF_1.seam} -- only a value crosses it (LR-6)`, () => {
  it('declares a string parameter and no browser type', () => {
    const declaration = code(read(DECLARATION))
    expect(declaration).toMatch(/showSvg\s*\(\s*\w+\s*:\s*string\s*\)\s*:\s*void/)
    expect(importsOf(read(DECLARATION))).toEqual([])
    // LR-6 keeps browser types out of `Entity` and `UseCase`; the declaration
    // is what those layers would see through SvgRenderer's public entry, so it
    // is the file that has to name none of them.
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

  it('gives back nothing but the member the seam declares', () => {
    const { host } = bareHost()
    const surface = domSvgSurface(host)
    expect(Object.keys(surface)).toEqual(['showSvg'])
    expect(typeof surface.showSvg).toBe('function')
    expect(surface.showSvg(A_PICTURE)).toBeUndefined()
  })
})

describe(`${IF_1.id} ${IF_1.seam} -- showing the same picture twice`, () => {
  // ⛔ NOT DERIVED FROM THE SPECIFICATION.
  //
  // Nothing in the specification requires this. NFR-010 and table T-078 govern
  // whether a FRAME RUNS -- "本表に無い契機でフレームを起こしてはならない
  // （MUST NOT）" -- not what the surface does once a frame has already handed
  // it a string. FR-048 puts the same judgement on "描く内容" at the shell, not
  // at the seam. Table T-065 IF-1 says only "作った SVG 文字列を画面に載せる",
  // and svg-surface.ts's own declaration records that no requirement states a
  // diffing rule.
  //
  // So skipping an identical write is DomSvgSurface's discretion, which LY-5
  // permits (`Framework` is the layer allowed to hold a current value). This
  // case pins the behaviour that is there so that dropping it is a decision
  // rather than an accident. ⚠️ A failure here is not a defect against the
  // specification.
  it('does not write the host again (implementation discretion)', () => {
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
    // Two surfaces over two hosts: the second must still paint. ⚠️ Held here
    // because a module-level cache would make a second host start out blank,
    // which NFR-011 forbids for the first picture.
    const first = bareHost()
    const second = bareHost()
    domSvgSurface(first.host).showSvg(A_PICTURE)
    domSvgSurface(second.host).showSvg(A_PICTURE)
    expect(second.writes).toEqual([A_PICTURE])
  })
})
