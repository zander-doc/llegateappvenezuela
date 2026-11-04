const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://llegateappvenezuela.pages.dev/';
const TABS = ['inicio', 'servicios', 'suscripciones', 'marketplace', 'app_simulador', 'base_datos'];

async function run(viewport, tag) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const main = document.querySelector('main');
    const sections = [...main.children];
    return {
      totalHeight: document.documentElement.scrollHeight,
      viewportH: innerHeight,
      viewportW: innerWidth,
      docWidth: document.documentElement.scrollWidth,
      mainSections: sections.map(s => ({ h: Math.round(s.getBoundingClientRect().height), tag: s.tagName })),
    };
  });
  console.log(tag, JSON.stringify(info));

  // full page capture per tab
  for (const tab of TABS) {
    const label = tab === 'inicio' ? 'Inicio' : tab === 'servicios' ? 'Servicios' : tab === 'suscripciones' ? 'Suscripciones' : tab === 'marketplace' ? 'Mercado Motor' : tab === 'app_simulador' ? 'App Móvil' : 'Base de Datos';
    const btn = await page.evaluateHandle((label) => {
      const btns = [...document.querySelectorAll('header button')].filter(b => b.offsetParent !== null && b.getBoundingClientRect().height > 0);
      return btns.find(b => b.textContent.trim().startsWith(label)) || null;
    }, label);
    try {
      await btn.click();
      await new Promise(r => setTimeout(r, 1500));
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(tag, tab, 'height', h);
      await page.screenshot({ path: `shots/${tag}-${tab}.png`, fullPage: h < 16000 });
      if (h >= 16000) {
        // capture in chunks
        const chunks = Math.ceil(h / 14000);
        for (let i = 0; i < chunks; i++) {
          await page.screenshot({ path: `shots/${tag}-${tab}-part${i + 1}.png`, clip: { x: 0, y: i * 14000, width: viewport.width, height: Math.min(14000, h - i * 14000) } });
        }
      }
      // viewport shot at top
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: `shots/${tag}-${tab}-top.png` });
    } catch (e) {
      console.log('skip', tab, e.message);
    }
  }
  await browser.close();
}

(async () => {
  fs.mkdirSync('shots', { recursive: true });
  await run({ width: 1440, height: 900, deviceScaleFactor: 1 }, 'desktop');
  await run({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'mobile');
})();
