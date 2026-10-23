// Bundles sample-entry.ts (the shipped drawing and hit-test code) into one HTML file.
// Run from this folder:  ROLLDOWN=<path to rolldown/dist/index.mjs> node build-sample.mjs
// The hit-test variant hook: claimingRegions() hands its candidate regions to window.grsHitVariant (if set),
// so the page can try other answer orders on the real regions without a second copy of the code.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const rolldownPath = process.env.ROLLDOWN ?? join(here, '..', '..', 'node_modules', 'rolldown', 'dist', 'index.mjs')
const { rolldown } = await import(pathToFileURL(rolldownPath).href)

const HOOK_FROM = `function claimingRegions(walk: PointerWalk, x: number, y: number, onShape: boolean): readonly Region[] {
  const out = walk.taskRegions.filter((region) => region.covers(x, y))`
const HOOK_TO = `function claimingRegions(walk: PointerWalk, x: number, y: number, onShape: boolean): readonly Region[] {
  const out = claimingRegionsShipped(walk, x, y, onShape)
  const variant = (globalThis as any).grsHitVariant
  return typeof variant === 'function' ? variant(out, x, y, onShape) : out
}
function claimingRegionsShipped(walk: PointerWalk, x: number, y: number, onShape: boolean): Region[] {
  const out = walk.taskRegions.filter((region) => region.covers(x, y))`

const hook = {
  name: 'grs-hit-variant-hook',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('item-hit-area/item-hit-area.ts')) return null
    if (!code.includes(HOOK_FROM)) throw new Error('hook anchor not found in item-hit-area.ts')
    return code.replace(HOOK_FROM, HOOK_TO)
  },
}

const bundle = await rolldown({ input: join(here, 'sample-entry.ts'), plugins: [hook], platform: 'browser' })
const { output } = await bundle.generate({ format: 'iife', minify: true })
const js = output[0].code.replace(/<\/script/gi, '<\\/script')
const page = readFileSync(join(here, 'sample-template.html'), 'utf8').replace('/*BUNDLE*/', () => js)
writeFileSync(join(here, 'dependency-lines-and-grab-sample.html'), page)
console.log(`wrote dependency-lines-and-grab-sample.html (${Math.round(page.length / 1024)} KiB)`)
