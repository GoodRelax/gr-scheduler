// The number a row of table T-206 states, from the manuscript, and the rows a generated constant was printed with.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const SETTINGS_SOURCE = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8'),
) as Record<string, unknown>

// see T-206
export function settingRow(id: string): Record<string, any> {
  let found: Record<string, any> | undefined
  const walk = (node: unknown): void => {
    if (found !== undefined) return
    if (Array.isArray(node)) {
      for (const one of node) walk(one)
    } else if (node !== null && typeof node === 'object') {
      const record = node as Record<string, any>
      if (record['id'] === id) {
        found = record
        return
      }
      for (const value of Object.values(record)) walk(value)
    }
  }
  walk(SETTINGS_SOURCE)
  if (found === undefined) throw new Error(`settings.json has no row ${id}`)
  return found
}

// see T-206
export function settingNumber(id: string): number {
  const row = settingRow(id)
  const value = Number(row['default']?.['num'] ?? row['value']?.['num'])
  if (!Number.isFinite(value)) throw new Error(`settings row ${id} states no number`)
  return value
}

const GENERATED_REGION = /\/\/ <generated -- do not edit by hand>([\s\S]*?)\/\/ <\/generated>/g
const ROW_VALUE = /^\s*'(S-\d+[a-z]?)': (\[[^\]]*\]|-?[\d.]+),?$/

// WHY: JDG-139 stage 2 -- a test checking the generator reads the printed text, so no constant stays exported for tests.
export function generatedConstantOf(
  file: string,
  name: string,
): Record<string, number | readonly number[]> {
  const text = readFileSync(join(process.cwd(), ...file.split('/')), 'utf8').replace(/\r\n/g, '\n')
  for (const [, region] of text.matchAll(GENERATED_REGION)) {
    const lines = (region ?? '').split('\n')
    const head = lines.findIndex((line) => new RegExp(`^(export )?const ${name}: \\{$`).test(line))
    if (head < 0) continue
    const body = lines.slice(lines.indexOf('} = {', head) + 1)
    const rows: Record<string, number | readonly number[]> = {}
    for (const line of body) {
      if (line === '}') return rows
      const found = ROW_VALUE.exec(line)
      if (found === null) throw new Error(`${file}: ${name} holds a line this reader does not read: ${line}`)
      const value = found[2] as string
      rows[found[1] as string] = value.startsWith('[')
        ? value.slice(1, -1).split(',').map((one) => Number(one.trim()))
        : Number(value)
    }
  }
  throw new Error(`${file} prints no generated constant ${name}`)
}
