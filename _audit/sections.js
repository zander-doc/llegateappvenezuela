const puppeteer = require('puppeteer-core');
const fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://llegateappvenezuela.pages.dev/';

async function run(viewport, tag) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
  const heights = await page.evaluate(() => [...document.querySelector('main').children].map(s => s.getBoundingClientRect().height));
  for (let i = 0; i < heights.length; i++) {
    const el = (await page.$$('main > *'))[i];
    if (!el) continue;
    try { await el.screenshot({ path: `sec/${tag}-${String(i).padStart(2, '0')}.png` }); } catch (e) { console.log('fail', tag, i, e.message); }
  }
  console.log(tag, 'sections', heights.length);
  await browser.close();
}
(async () => {
  fs.mkdirSync('sec', { recursive: true });
  await run({ width: 1440, height: 1000 }, 'd');
  await run({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'm');
})();
