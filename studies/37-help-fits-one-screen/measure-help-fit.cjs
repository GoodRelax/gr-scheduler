// Rearrange the live help of a built GRS the way CR-665 proposes (JDG-1391..1396)
// and measure whether the help body fits without scrolling, in ja and en.
//
//   node measure-help-fit.cjs <node_modules dir> <dist/index.html> <out dir> <w> <h> [steps]
//
// steps: digits 1..4 name which of the user's four points to apply (JDG-1391);
// add 'f' to draw the body at 12px (S-203 = 0.75, JDG-1393). '0' applies none.
// Prints, per language, the body's client and scroll height before and after,
// the column heights, and `fitAt`: [font px, overflow px, footer px] for a sweep
// of font sizes. Overflow 0 means the body needs no vertical scroll.
// The edits are DOM surgery on the shipped build -- nothing in src/ is touched.
const { chromium } = require(process.argv[2] + '/playwright');
(async () => {
  const out = process.argv[4];
  const w = +process.argv[5], h = +process.argv[6];
  const steps = process.argv[7] || '1234';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('file:///' + process.argv[3].split(String.fromCharCode(92)).join('/'));
  await p.waitForTimeout(1500);
  await p.keyboard.press('F1');
  await p.waitForTimeout(800);
  const results = [];
  for (const lang of ['ja', 'en']) {
    if (lang === 'en') {
      await p.click('[data-role="Help Modal"] [data-icon="IC-128"]');
      await p.waitForTimeout(600);
    }
    const r = await p.evaluate((steps) => {
      const modal = document.querySelector('[data-role="Help Modal"]');
      const cols = modal.querySelector('[data-help-column]').parentElement;
      const body = cols.parentElement;
      const before = { client: body.clientHeight, scroll: body.scrollHeight };
      const licence = cols.nextElementSibling;
      const footnote = modal.querySelector('[data-help-column="HC-2"] > div:not([data-help-block])');
      // 1) drop the entrances indented under IC-1 (Open Chooser, Difference Review).
      if (steps.includes('1')) {
        for (const id of ['IC-71', 'IC-72', 'IC-73', 'IC-95', 'IC-96', 'IC-97']) {
          const row = modal.querySelector(`[data-help-block="App Header"] [data-row="${id}"]`);
          if (row) row.remove();
        }
      }
      // 2) move the palette's second group into a new framed block under the Row Title Panel.
      if (steps.includes('2')) {
        const pal = modal.querySelector('[data-help-block="Command Palette"]');
        const kids = [...pal.children];
        const rules = kids.filter(k => !k.hasAttribute('data-row') && !k.hasAttribute('data-help-heading'));
        const i0 = kids.indexOf(rules[1]), i1 = kids.indexOf(rules[2]);
        const moved = kids.slice(i0 + 1, i1);
        const nb = pal.cloneNode(false);
        nb.setAttribute('data-help-block', 'Command Palette (2)');
        const hd = pal.querySelector('[data-help-heading]').cloneNode(true);
        // JDG-1394: the new block's heading says it continues the palette.
        hd.textContent = document.documentElement.lang === 'en' || modal.getAttribute('data-language') === 'en' ? 'Command Palette (continued)' : '\u30b3\u30de\u30f3\u30c9\u30d1\u30ec\u30c3\u30c8\uff08\u7d9a\u304d\uff09';
        nb.append(hd);
        moved.forEach(m => nb.append(m));
        rules[1].remove();
        modal.querySelector('[data-help-column="HC-4"]').append(nb);
      }
      // 3) and 4) below the columns: note *1 on its own line, right-aligned
      // (JDG-1396: above the licence), then the licence on one line.
      if (steps.includes('3') || steps.includes('4')) {
        licence.style.display = 'flex';
        licence.style.flexWrap = 'wrap';
        licence.style.columnGap = '1em';
        licence.style.alignItems = 'baseline';
        if (steps.includes('3') && footnote) {
          footnote.style.marginTop = '0';
          footnote.style.flexBasis = '100%';
          footnote.style.textAlign = 'right';
          footnote.style.whiteSpace = 'nowrap';
          licence.prepend(footnote);
        }
      }
      const fitAt = [];
      for (const f of [12.8, 12.4, 12.2, 12, 11.8, 11.6, 11.5, 11.4, 11.2, 11]) {
        body.style.fontSize = f + 'px';
        fitAt.push([f, body.scrollHeight - body.clientHeight, Math.round(licence.getBoundingClientRect().height)]);
      }
      body.style.fontSize = steps.includes('f') ? '12px' : '';
      const nat = [...licence.children].map(c => { const sp = document.createElement('span'); sp.style.whiteSpace = 'nowrap'; sp.style.position = 'absolute'; sp.innerHTML = c.tagName === 'DETAILS' ? c.querySelector('summary').outerHTML : c.innerHTML; document.body.append(sp); const ww = Math.round(sp.getBoundingClientRect().width); sp.remove(); return ww; });
      const lic = licence.getBoundingClientRect();
      return {
        before, after: { client: body.clientHeight, scroll: body.scrollHeight, footer: Math.round(licence.getBoundingClientRect().height) },
        footerH: Math.round(lic.height), nat, fitAt, footerW: Math.round(lic.width),
        cols: [...modal.querySelectorAll('[data-help-column]')].map(c => [c.getAttribute('data-help-column'), Math.round(c.getBoundingClientRect().height)]),
        fontSize: getComputedStyle(cols).fontSize,
      };
    }, steps);
    results.push({ lang, ...r });
    await p.screenshot({ path: `${out}/s-${w}x${h}-${steps}-${lang}.png` });
    // Re-open the help fresh for the next language.
    await p.keyboard.press('F1');
    await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(1500);
    await p.keyboard.press('F1'); await p.waitForTimeout(800);
  }
  console.log(JSON.stringify(results));
  await b.close();
})();
