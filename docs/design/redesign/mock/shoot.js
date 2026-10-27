const { chromium } = require('playwright');
const path = require('path');
const [mockDir, outDir, only, scale = '2'] = process.argv.slice(2);
const desk = ['chat-empty','chat-thread','model-picker','run-streaming','run-finished','run-clarify','guest','palette','archive','settings-security','settings-appearance','settings-archived','settings-account','archived-session','context-hover','context-details','auth-signin','auth-states','device','admin-overview','admin-users','admin-ban','admin-usage','admin-audit','admin-session'];
const jobs = [
  ...desk.map((s) => ({ s, theme: 'dark', w: 1440, h: 900 })),
  ...['chat-empty','chat-thread','run-finished','admin-usage','settings-appearance'].map((s) => ({ s, theme: 'light', w: 1440, h: 900 })),
  ...['m-chat','m-drawer','m-sheet'].map((s) => ({ s, theme: 'dark', w: 390, h: 844 })),
].filter((j) => !only || only === 'all' || only.split(',').includes(j.s));
(async () => {
  const b = await chromium.launch();
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: +scale });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('file://' + path.resolve(mockDir, 'index.html') + `?s=${j.s}&theme=${j.theme}`);
    await p.waitForSelector('body[data-ready]', { timeout: 5000 }).catch(() => errs.push('not ready'));
    const f = path.join(outDir, `${j.s}${j.theme === 'light' ? '-light' : ''}.png`);
    await p.screenshot({ path: f });
    console.log(errs.length ? `ERR ${j.s}: ${errs.join(' | ')}` : `ok  ${path.basename(f)}`);
    await p.close();
  }
  await b.close();
})();
