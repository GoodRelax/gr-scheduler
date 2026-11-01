// node measure-help-slack.cjs <node_modules dir> <dist/index.html> <w> <h>   (CR-665, after applying)
// Opens the help with F1 in ja, then switches to en, and prints per language:
// the body's client/scroll height and width, and the slack = client height minus
// the height the content needs (top padding + columns + licence box + bottom padding).
const { chromium } = require(process.argv[2] + '/playwright');
(async () => {
  const w = +process.argv[4], h = +process.argv[5];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('file:///' + process.argv[3].split(String.fromCharCode(92)).join('/'));
  await p.waitForTimeout(1500);
  await p.keyboard.press('F1');
  await p.waitForTimeout(800);
  const out = [];
  for (const lang of ['ja', 'en']) {
    if (lang === 'en') {
      await p.click('[data-role="Help Modal"] [data-icon="IC-128"]');
      await p.waitForTimeout(600);
    }
    out.push(await p.evaluate(() => {
      const modal = document.querySelector('[data-role="Help Modal"]');
      const cols = modal.querySelector('[data-help-column]').parentElement;
      const body = cols.parentElement;
      const cs = getComputedStyle(body);
      const top = body.getBoundingClientRect().top + body.clientTop;
      const last = body.lastElementChild.getBoundingClientRect();
      const need = Math.ceil(last.bottom - top + parseFloat(cs.paddingBottom));
      return {
        lang: modal.getAttribute('data-language'),
        font: getComputedStyle(cols).fontSize,
        client: [body.clientWidth, body.clientHeight],
        scroll: [body.scrollWidth, body.scrollHeight],
        need, slack: body.clientHeight - need,
        footnoteTop: Math.round(modal.querySelector('[data-help-footnote]').getBoundingClientRect().height),
        legalH: Math.round(body.lastElementChild.getBoundingClientRect().height),
        cols: [...modal.querySelectorAll('[data-help-column]')].map(c => [c.getAttribute('data-help-column'), Math.round(c.getBoundingClientRect().height)]),
      };
    }));
  }
  console.log(JSON.stringify(out));
  await b.close();
})();
