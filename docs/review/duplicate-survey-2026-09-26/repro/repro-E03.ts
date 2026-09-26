// E03: frame-loop.ts:1295 readInstantOfWrite (clock read inlined as a parameter) vs dialogue-field-drawing.ts:16 stampOf
function readInstantOfWriteAt(now: number): string { return new Date(now).toISOString().replace(/\.\d+Z$/, 'Z') } // body of :1296 with new Date() -> new Date(now)
function stampOf(atMs: number): string { return `${new Date(atMs).toISOString().slice(0, 19)}Z` }
const inputs = [0, 1, 999, Date.UTC(2026, 8, 26, 12, 34, 56, 789), Date.UTC(1969, 11, 31, 23, 59, 59, 999), -1, Date.UTC(9999, 11, 31, 23, 59, 59, 999), Date.UTC(10000, 0, 1), -62198755200000 /* year -1 */, 8.64e15]
let diff = 0
for (const ms of inputs) { const a = readInstantOfWriteAt(ms), b = stampOf(ms); if (a !== b) diff++; console.log(ms, a, b, a === b ? 'equal' : 'DIFFER') }
for (let i = 0; i < 200000; i++) { const ms = Math.floor(Math.random() * 253402300799999); if (readInstantOfWriteAt(ms) !== stampOf(ms)) { diff++; console.log('DIFFER', ms) } }
console.log('differences', diff)
