"""Write display-scale variants of lm-19 and first-notch into an output directory (supplementary run).

Usage: python make-scaled-variants.py <tree> <out-dir>

Why: head cdca63ac opens at displayScale 100, which draws at ratio 0.5 (S-236), so at 1920x1080
it draws about twice the rows of stage 0 (which has no display scale and draws at ratio 1.0).
To split "more drawn" from "slower code", the supplementary run presses IC-105 (display scale up)
SCALE_PRESSES times right after the page settles, before anything is measured:
100 -> 110 -> 125 -> 150 -> 175 -> 200 is 5 presses, and 200 draws at ratio 1.0.
On stage 0 there is no IC-105; the variant then presses nothing and says so.

The variants are the unchanged probes plus exactly these edits (each asserted to apply once):
  lm-19      ROOT comes from the LM19_ROOT environment variable instead of the script's own place;
             playwright is resolved from ROOT; after the first settle, IC-105 is pressed; the
             displayScale read through the Agent API after measuring is added to conditions.
  first-notch after each page's settle, IC-105 is pressed; the displayScale is not read (the probe
             never opens the Agent API) -- the lm-19 variant's reading stands for both.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def once(text, old, new):
    if text.count(old) != 1:
        raise SystemExit("expected exactly one %r, found %d" % (old[:60], text.count(old)))
    return text.replace(old, new)


PRESS_JS = """
const SCALE_PRESSES = Number(process.env.SCALE_PRESSES ?? '0')
async function pressScaleUp(page) {
  let pressed = 0
  for (let i = 0; i < SCALE_PRESSES; i += 1) {
    const at = await page.evaluate(() => {
      const e = document.querySelector('[data-icon="IC-105"]')
      if (e === null) return null
      const b = e.getBoundingClientRect()
      return b.width === 0 ? null : { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    })
    if (at === null) break
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(800)
    pressed += 1
  }
  return pressed
}
"""


def main():
    tree, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)

    src = open(os.path.join(tree, "tools", "probe", "examples", "lm-19-frame-time-baseline.mjs"), encoding="utf-8").read()
    src = once(src, "import { chromium } from 'playwright'\n", "import { createRequire } from 'node:module'\n")
    src = once(src, "const ROOT = path.resolve(HERE, '../../..')\n",
               "const ROOT = path.resolve(process.env.LM19_ROOT)\nconst { chromium } = createRequire(path.join(ROOT, 'package.json'))('playwright')\n" + PRESS_JS)
    src = once(src, "  await page.goto(pathToFileURL(BUILD).href)\n  await settle(page)\n",
               "  await page.goto(pathToFileURL(BUILD).href)\n  await settle(page)\n  const scalePresses = await pressScaleUp(page)\n  await settle(page)\n")
    src = once(src, "  const tasksMeasured = await taskCount(page)\n",
               "  const tasksMeasured = await taskCount(page)\n  const displayScaleMeasured = await page.evaluate(() => window.grSchedulerAgentApi?.readDocument?.()?.documentSettings?.displayScale ?? null)\n")
    src = once(src, "      tasksMeasured,\n", "      tasksMeasured,\n      scalePressesAsked: SCALE_PRESSES,\n      scalePresses,\n      displayScaleMeasured,\n")
    with open(os.path.join(out, "lm-19-scaled.mjs"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(src)

    fn = open(os.path.join(HERE, "first-notch.mjs"), encoding="utf-8").read()
    fn = once(fn, "const conditions = {\n", PRESS_JS + "\nconst conditions = {\n  scalePressesAsked: SCALE_PRESSES,\n")
    fn = once(fn, "        await settle(page)\n        const before = await expanderCount(page)\n",
              "        await settle(page)\n        if (await pressScaleUp(page) !== SCALE_PRESSES) doubts.push(`${tag} page ${p + 1}: IC-105 pressed fewer times than asked`)\n        await settle(page)\n        const before = await expanderCount(page)\n")
    with open(os.path.join(out, "first-notch-scaled.mjs"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(fn)

    # zoom-row-axis (added after the first supplementary run): IC-105 pressed after the first settle;
    # the one page then keeps that display scale through both window heights.
    old = os.path.join(os.path.dirname(HERE), "frame-time-ab-2026-09-16", "extra-zoom-row-axis-and-dependency-drag", "zoom-row-axis.mjs")
    zr = open(old, encoding="utf-8").read()
    zr = once(zr, "const conditions = {\n", PRESS_JS + "\nconst conditions = {\n  scalePressesAsked: SCALE_PRESSES,\n")
    zr = once(zr, "  await page.goto(pathToFileURL(BUILD).href)\n  await settle(page)\n",
              "  await page.goto(pathToFileURL(BUILD).href)\n  await settle(page)\n  conditions.scalePresses = await pressScaleUp(page)\n  await settle(page)\n")
    with open(os.path.join(out, "zoom-row-axis-scaled.mjs"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(zr)


if __name__ == "__main__":
    main()
