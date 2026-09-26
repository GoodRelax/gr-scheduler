// G28: display language read from the ScreenSession
// screen-renderer.ts:507-513
const DEFAULT_DISPLAY_LANGUAGE = 'en'
function displayLanguageOf(session: any) { return session.screen.language ?? DEFAULT_DISPLAY_LANGUAGE }
// frame-loop.ts:843-847
function displayLanguageIn(session: any) { return session.screen.language ?? 'en' }
const inputs = [null, undefined, 'ja', 'en']
let d = 0
for (const language of inputs) {
  const s = { screen: language === undefined ? {} : { language } }
  const a = displayLanguageOf(s), b = displayLanguageIn(s)
  if (a !== b) d++
  console.log(JSON.stringify(language), '->', a, b)
}
console.log(`differ on ${d} of ${inputs.length}`)
