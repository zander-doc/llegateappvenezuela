import puppeteer from "puppeteer-core";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const landingUrl = pathToFileURL(path.resolve("landing/index.html")).href;
const BASE = "http://localhost:5174";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

const results = [];
const log = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
};

async function linesState(page, selector) {
  return page.evaluate((sel) => {
    const items = [...document.querySelectorAll(sel)]
      .map((el) => {
        const cs = getComputedStyle(el);
        return { transform: cs.transform, height: cs.height, bg: el.style.backgroundImage };
      })
      .filter((item) => item.height === "1px" && item.bg.includes("50%, transparent"));
    return {
      transforms: items.map((i) => i.transform),
      animations: document.getAnimations().length,
      toggle: [...document.querySelectorAll("button")].some((b) => b.textContent.includes("movimiento")),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  }, selector);
}

async function sample(page, selector) {
  const before = await linesState(page, selector);
  await sleep(700);
  const after = await linesState(page, selector);
  return {
    ...after,
    moved: before.transforms.map((t, i) => t !== after.transforms[i]),
  };
}

const reactLines = "section div.left-0";
const landingLines = ".racing-line";

/* ---------------- React app ---------------- */
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
await sleep(1100);
let reduceState = await sample(page, reactLines);
log(
  "react reduce · moves without a toggle",
  !reduceState.toggle && reduceState.moved.some(Boolean) && reduceState.animations > 0,
  `toggle=${reduceState.toggle} moved=${reduceState.moved} animations=${reduceState.animations}`
);
await page.screenshot({ path: "shots/hero-auto-motion.png" });

const noPref = await browser.newPage();
await noPref.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await noPref.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await noPref.goto(BASE + "/", { waitUntil: "networkidle0" });
await sleep(1100);
let noPrefState = await sample(noPref, reactLines);
log(
  "react no-preference · moves",
  !noPrefState.toggle && noPrefState.moved.some(Boolean),
  `moved=${noPrefState.moved} animations=${noPrefState.animations}`
);

const small = await browser.newPage();
await small.setViewport({ width: 452, height: 554, deviceScaleFactor: 1 });
await small.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await small.goto(BASE + "/", { waitUntil: "networkidle0" });
await sleep(1000);
let smallState = await sample(small, reactLines);
log(
  "react mobile · moves, no overflow",
  !smallState.toggle && smallState.moved.some(Boolean) && smallState.scrollWidth <= smallState.clientWidth,
  `moved=${smallState.moved} scroll=${smallState.scrollWidth}/${smallState.clientWidth}`
);
await small.screenshot({ path: "shots/hero-small-auto.png" });
log("react console errors", errors.length === 0, errors.join(" | ") || "none");

/* ---------------- Static landing ---------------- */
const land = await browser.newPage();
await land.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const landErrors = [];
land.on("console", (msg) => {
  if (msg.type() === "error") landErrors.push(msg.text());
});
land.on("pageerror", (err) => landErrors.push(String(err)));
await land.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await land.goto(landingUrl, { waitUntil: "load" });
await sleep(900);
let landState = await sample(land, landingLines);
log(
  "landing reduce · moves without a toggle",
  !landState.toggle && landState.moved.some(Boolean) && landState.animations > 0,
  `toggle=${landState.toggle} moved=${landState.moved} animations=${landState.animations}`
);
await land.screenshot({ path: "shots/landing-auto-motion.png" });

await land.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await land.reload({ waitUntil: "load" });
await sleep(800);
let landMobile = await sample(land, landingLines);
log(
  "landing mobile · moves, no overflow",
  !landMobile.toggle && landMobile.moved.some(Boolean) && landMobile.scrollWidth <= landMobile.clientWidth,
  `moved=${landMobile.moved} scroll=${landMobile.scrollWidth}/${landMobile.clientWidth}`
);
await land.screenshot({ path: "shots/landing-mobile-auto.png" });
log("landing console errors", landErrors.length === 0, landErrors.join(" | ") || "none");

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
