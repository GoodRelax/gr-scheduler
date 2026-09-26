// E22: display-scale-steps.ts:70 rowAreaWidthAt vs screen-regions.ts:180 regionsAtDisplayScale(...).rowArea.width
// Width/height paths of screen-regions.ts copied (drawnRowTitlePanelWidthPx, displayRatioOf, regionsFromScreen width/height lines).
const S138 = 16, S237 = 1, S243 = 1, S235 = 0.6667, S236 = 0.625
const entranceOuterHeightPx = () => S138 + S243 * 2
const entranceOuterWidthPx = () => entranceOuterHeightPx() + S237 * 2
type St = { displayScale: number; rowTitlePanelWidth: number; rowTitleIndent: number; maxGroupDepth: number;
  rulerHeight: number; canvasPadding: number; propertyPanelWidth: number; appHeaderMaxHeight: number }
const displayRatioOf = (s: St) => (s.displayScale / 100) * S236
function drawnRowTitlePanelWidthPx(settings: St, ratio: number): number {
  const indents = settings.rowTitleIndent * ratio * settings.maxGroupDepth
  const grabStrip = S138 * S235
  const rowControls = 4 * entranceOuterWidthPx() * S235
  return Math.max(settings.rowTitlePanelWidth * ratio, indents + grabStrip + rowControls)
}
function drawn(s: St): St {
  const r = displayRatioOf(s)
  return { ...s, rulerHeight: s.rulerHeight * r, rowTitlePanelWidth: drawnRowTitlePanelWidthPx(s, r) }
}
type Env = { width: number; height: number; appHeaderHeight: number; scrollbarThickness: number }
function regionsFromScreen(env: Env, settings: St) {
  const d = drawn(settings)
  const headerHeight = Math.min(env.appHeaderHeight, d.appHeaderMaxHeight)
  const canvas = { x: 0, y: headerHeight, width: env.width, height: env.height - headerHeight }
  const titleWidth = d.rowTitlePanelWidth, propsWidth = d.propertyPanelWidth, bandHeight = d.rulerHeight
  const bar = env.scrollbarThickness
  const rowAreaWidth = canvas.width - settings.canvasPadding - titleWidth - propsWidth - bar
  const rowAreaHeight = canvas.height - bandHeight - settings.canvasPadding - bar
  return { appHeader: { width: env.width, height: headerHeight }, scheduleCanvas: canvas,
    propertiesPanel: { width: propsWidth }, rowArea: { width: rowAreaWidth, height: rowAreaHeight } }
}
type R = ReturnType<typeof regionsFromScreen>
function regionsAtDisplayScale(regions: R, settings: St, displayScale: number): R {
  const canvas = regions.scheduleCanvas
  const bandHeight = drawn(settings).rulerHeight
  const env: Env = { width: regions.appHeader.width, height: canvas.y + canvas.height,
    appHeaderHeight: regions.appHeader.height,
    scrollbarThickness: canvas.height - bandHeight - settings.canvasPadding - regions.rowArea.height }
  return regionsFromScreen(env, { ...settings, displayScale, propertyPanelWidth: regions.propertiesPanel.width })
}
function rowAreaWidthAt(regions: R, settings: St, next: number): number {
  const held = drawn(settings).rowTitlePanelWidth
  const moved = drawn({ ...settings, displayScale: next }).rowTitlePanelWidth
  return regions.rowArea.width + held - moved
}
const STEPS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200]
let n = 0, diff = 0, maxAbs = 0, first = ''
for (const W of [800, 1024, 1280, 1366.4, 1536, 1920, 2560.5])
  for (const H of [600, 768, 900.8, 1080])
    for (const bar of [0, 15, 17, 16.8])
      for (const tw of [120, 200, 300, 333, 480])
        for (let i = 0; i < STEPS.length; i++)
          for (const j of [i - 1, i + 1]) {
            if (j < 0 || j >= STEPS.length) continue
            const s: St = { displayScale: STEPS[i], rowTitlePanelWidth: tw, rowTitleIndent: 16, maxGroupDepth: 5,
              rulerHeight: 69, canvasPadding: 10, propertyPanelWidth: 320, appHeaderMaxHeight: 48 }
            const env: Env = { width: W, height: H, appHeaderHeight: 40, scrollbarThickness: bar }
            const reg = regionsFromScreen(env, s)
            const a = rowAreaWidthAt(reg, s, STEPS[j])
            const b = regionsAtDisplayScale(reg, s, STEPS[j]).rowArea.width
            n++
            if (a !== b) { diff++; maxAbs = Math.max(maxAbs, Math.abs(a - b))
              if (!first) first = `W=${W} H=${H} bar=${bar} rowTitlePanelWidth=${tw} ${STEPS[i]}->${STEPS[j]}: rowAreaWidthAt=${a} regionsAtDisplayScale=${b}` }
          }
console.log(`cases ${n}, differ ${diff}, max |a-b| ${maxAbs}`)
console.log(first)
