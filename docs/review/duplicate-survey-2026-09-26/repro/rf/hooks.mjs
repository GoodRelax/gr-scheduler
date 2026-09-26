import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith('.') || spec.startsWith('/')) && !/\.(ts|mjs|js|json)$/.test(spec) && ctx.parentURL) {
    for (const ext of ['.ts', '/index.ts']) {
      const u = new URL(spec + ext, ctx.parentURL)
      if (existsSync(fileURLToPath(u))) return next(u.href, ctx)
    }
  }
  if (spec.endsWith('.json')) {
    const r = await next(spec, ctx)
    return { ...r, importAttributes: { type: 'json' } }
  }
  return next(spec, ctx)
}
