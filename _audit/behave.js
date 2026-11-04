const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'https://llegateappvenezuela.pages.dev/';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await wait(1500);

  // scroll deep on home, then switch tab
  await page.evaluate(() => window.scrollTo(0, 9000));
  await wait(500);
  const before = await page.evaluate(() => scrollY);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('header button')].find(x => x.textContent.trim() === 'App Móvil' && x.offsetParent);
    b.click();
  });
  await wait(800);
  const after = await page.evaluate(() => ({ y: scrollY, h: document.documentElement.scrollHeight, url: location.href }));
  console.log('tab switch scroll', before, after);

  // open register modal
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Agregar Cliente'));
    b && b.click();
  });
  await wait(1000);
  const modal = await page.evaluate(() => {
    const fixed = [...document.querySelectorAll('div')].filter(d => getComputedStyle(d).position === 'fixed' && d.offsetParent !== null);
    const top = fixed.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
    if (!top) return null;
    return {
      h: Math.round(top.getBoundingClientRect().height),
      fields: top.querySelectorAll('input, select, textarea').length,
      selects: [...top.querySelectorAll('select')].map(s => ({ name: s.name || s.id, options: s.options.length })),
      text: top.innerText.slice(0, 500),
    };
  });
  console.log('register modal', JSON.stringify(modal, null, 1));
  await page.screenshot({ path: 'sec/modal-register.png' });

  await page.keyboard.press('Escape');
  await wait(600);

  // footer link behavior
  const footerBtn = await page.evaluate(() => {
    const f = document.querySelector('footer') || document.querySelector('contentinfo');
    const b = f && [...f.querySelectorAll('button')][0];
    return b ? { tag: b.tagName, href: b.getAttribute('href'), text: b.textContent } : null;
  });
  console.log('footer first link', footerBtn);

  // check all nav links are buttons, any anchors to sections
  const anchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].length);
  console.log('hash anchors', anchors);

  await browser.close();
})();
