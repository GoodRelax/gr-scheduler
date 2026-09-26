// Installs window.__installSwap(variant): rewrites the schedule svg string before innerHTML takes it.
window.__installSwap = (variant) => {
  const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
  const MASK = /<mask id="([^"]+)" maskUnits="userSpaceOnUse">([\s\S]*?)<\/mask>/
  const BLACK = /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="black"[^>]*\/>/g
  const esc = (s) => s // ids are [a-z0-9-] only
  const swaps = {
    none: (v) => v,
    scan: (v) => v.replace(/ mask="url\(#NEVER[^)]*\)"/g, ''),
    // halo drawn over bars too (FR-009 MUST NOT broken)
    nomask: (v) => v.replace(/ mask="url\(#[^)]*\)"/g, ''),
    // no halo at all (FR-009 MUST broken)
    nohalo: (v) => { const m = MASK.exec(v); if (!m) return v; return v.replace(new RegExp(`<polyline [^>]*mask="url\\(#${esc(m[1])}\\)"[^>]*/>`, 'g'), '') },
    // one mask, region limited to the viewport instead of the default -10%..120%
    maskregion: (v) => { const size = /^<svg[^>]* width="([\d.]+)" height="([\d.]+)"/.exec(v); return v.replace(/<mask id="([^"]+)" maskUnits="userSpaceOnUse">/, `<mask id="$1" maskUnits="userSpaceOnUse" x="0" y="0" width="${size[1]}" height="${size[2]}">`) },
    // one small mask per halo line: its own box, only the bar rects that meet it
    permask: (v) => {
      const m = MASK.exec(v); if (!m) return v
      const rects = [...m[2].matchAll(BLACK)].map((r) => ({ x: +r[1], y: +r[2], w: +r[3], h: +r[4], s: r[0] }))
      const defs = []; let k = 0
      const out = v.replace(new RegExp(`<polyline points="([^"]*)"([^>]*?) stroke-width="([\\d.]+)" mask="url\\(#${esc(m[1])}\\)"`, 'g'), (all, pts, mid, sw) => {
        const ps = pts.trim().split(/\s+/).map((p) => p.split(',').map(Number))
        const pad = +sw + 8
        const x0 = Math.floor(Math.min(...ps.map((p) => p[0])) - pad), x1 = Math.ceil(Math.max(...ps.map((p) => p[0])) + pad)
        const y0 = Math.floor(Math.min(...ps.map((p) => p[1])) - pad), y1 = Math.ceil(Math.max(...ps.map((p) => p[1])) + pad)
        const id = `${m[1]}-${k++}`
        const inside = rects.filter((r) => r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0).map((r) => r.s).join('')
        const box = `x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"`
        defs.push(`<mask id="${id}" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="white"/>${inside}</mask>`)
        return `<polyline points="${pts}"${mid} stroke-width="${sw}" mask="url(#${id})"`
      })
      return out.replace(m[0], m[0] + defs.join(''))
    },
  }
  const chain = variant.split('+').map((k) => swaps[k])
  window.__swapSeen = { calls: 0, before: 0, after: 0 }
  Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: true,
    get() { return d.get.call(this) },
    set(v) {
      if (typeof v === 'string' && v.startsWith('<svg')) {
        window.__swapSeen.calls += 1; window.__swapSeen.before = v.length
        for (const f of chain) v = f(v)
        window.__swapSeen.after = v.length
      }
      d.set.call(this, v)
    },
  })
}
