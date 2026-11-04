const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://llegateappvenezuela.pages.dev/';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  for (const vp of [{ width: 1440, height: 900, tag: 'desktop' }, { width: 390, height: 844, tag: 'mobile', isMobile: true, hasTouch: true }]) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    const data = await page.evaluate(() => {
      const vis = el => el.offsetParent !== null;
      const stats = el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
      const header = document.querySelector('header');
      const navRows = [...header.querySelectorAll('div')].filter(d => d.scrollWidth > d.clientWidth + 2).map(d => ({ cls: d.className.slice(0, 40), scrollW: d.scrollWidth, clientW: d.clientWidth }));
      const smallTargets = [...document.querySelectorAll('button, a')].filter(vis).map(b => ({ t: b.textContent.trim().slice(0, 28), ...stats(b) })).filter(b => b.h < 40);
      const fontSizes = {};
      [...document.querySelectorAll('p, span, li, button, a, h1, h2, h3, h4')].filter(vis).forEach(el => {
        const fs = getComputedStyle(el).fontSize; fontSizes[fs] = (fontSizes[fs] || 0) + 1;
      });
      const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(h => ({ tag: h.tagName, t: h.textContent.trim().slice(0, 60), fs: getComputedStyle(h).fontSize }));
      const tables = [...document.querySelectorAll('table')].map(t => ({ scrollW: t.parentElement.scrollWidth, clientW: t.parentElement.clientWidth, rows: t.querySelectorAll('tbody tr').length }));
      return {
        headerH: Math.round(header.getBoundingClientRect().height),
        headerOverflows: navRows,
        visibleButtons: [...document.querySelectorAll('button')].filter(vis).length,
        smallTargets: smallTargets.slice(0, 40),
        smallTargetCount: smallTargets.length,
        fontSizes,
        h1Count: headings.filter(h => h.tag === 'H1').length,
        headingsTop: headings.slice(0, 14),
        tables,
        imgNoAlt: [...document.images].filter(i => !i.alt).length,
        imgBroken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
        selectOptionsMax: Math.max(0, ...[...document.querySelectorAll('select')].map(s => s.options.length)),
      };
    });
    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource');
      const bytes = res.reduce((a, r) => a + (r.transferSize || 0), 0);
      const lcp = performance.getEntriesByType('largest-contentful-paint').slice(-1)[0];
      return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), resources: res.length, transferKB: Math.round(bytes / 1024) };
    });
    console.log(vp.tag, 'loadMs', Date.now() - t0, JSON.stringify(data, null, 1), JSON.stringify(perf));
    await page.close();
  }
  await browser.close();
})();
