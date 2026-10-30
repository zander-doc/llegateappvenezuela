import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:5174";
const OUT = path.resolve("shots");
fs.mkdirSync(OUT, { recursive: true });

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const routes = [
  ["home", "/"],
  ["servicios", "/servicios"],
  ["servicio-moto", "/servicios/mototaxi"],
  ["tarifas", "/tarifas"],
  ["cobertura", "/cobertura"],
  ["conductores", "/conductores"],
  ["planes", "/conductores/planes"],
  ["registro", "/conductores/registro"],
  ["club-vip", "/pasajeros/club-vip"],
  ["seguridad", "/seguridad"],
  ["mercado", "/mercado"],
  ["negocio", "/mercado/negocio/repuestos-el-motor"],
  ["publicar", "/mercado/publicar"],
  ["app", "/app"],
  ["ingresar", "/ingresar"],
  ["crear-cuenta", "/registro"],
  ["empresas", "/empresas"],
  ["ayuda", "/ayuda"],
  ["aliados", "/nosotros/aliados"],
  ["legal-terminos", "/legal/terminos"],
  ["legal-privacidad", "/legal/privacidad"],
  ["legal-cookies", "/legal/cookies"],
  ["404", "/ruta-inexistente"],
];

const results = { errors: [], routes: [], interactions: [], internalLinks: [] };
const internalLinks = new Set();

function recordError(scope, message) {
  results.errors.push({ scope, message });
}

async function analyze(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const de = document.documentElement;
    const overflowing = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (r.right > vw + 2 || r.left < -2) {
        const parent = el.parentElement;
        const parentScrolls = parent && ["auto", "scroll"].includes(getComputedStyle(parent).overflowX);
        if (parentScrolls) continue;
        overflowing.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className).slice(0, 90)) || "",
          text: (el.textContent || "").trim().slice(0, 50),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
    }
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const scrollAreas = [...document.querySelectorAll("div.overflow-x-auto")].map((el) => ({
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      scrollable: el.scrollWidth > el.clientWidth + 1,
    }));
    const smallButtons = [...document.querySelectorAll("main button, main a")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 40;
    }).slice(0, 8).map((el) => ({
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      h: Math.round(el.getBoundingClientRect().height),
    }));
    return {
      title: document.title,
      viewport: [vw, window.innerHeight],
      scrollWidth: de.scrollWidth,
      horizontalOverflow: de.scrollWidth > vw + 1,
      overflowing: overflowing.slice(0, 6),
      scrollAreas,
      smallButtons,
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
      mainTop: main ? Math.round(main.getBoundingClientRect().top + window.scrollY) : null,
      h1: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      pageHeight: de.scrollHeight,
    };
  });
}

async function visit(page, name, route, viewportName) {
  const errorsBefore = results.errors.length;
  const onConsole = (msg) => {
    if (msg.type() === "error") recordError(`${name}@${viewportName}`, msg.text().slice(0, 300));
  };
  const onPageError = (err) => recordError(`${name}@${viewportName}`, `PAGEERROR ${String(err).slice(0, 300)}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  const response = await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(900);
  const status = response?.status() ?? null;

  const info = await analyze(page, name);
  const hrefs = await page.$$eval('a[href^="/"]', (els) => els.map((el) => el.getAttribute("href")));
  for (const href of hrefs) internalLinks.add((href || "/").split("#")[0] || "/");
  await page.screenshot({
    path: path.join(OUT, `${viewportName}-${name}.jpg`),
    type: "jpeg",
    quality: 78,
    fullPage: true,
  });
  const entry = {
    name,
    route,
    viewportName,
    status,
    ...info,
    newErrors: results.errors.length - errorsBefore,
  };
  results.routes.push(entry);
  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  return entry;
}

async function findVisible(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, txt) => {
      const nodes = [...document.querySelectorAll(sel)];
      return (
        nodes.find((el) => {
          if (!el.textContent || !el.textContent.includes(txt)) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) ?? null
      );
    },
    selector,
    text
  );
  return handle.asElement();
}

async function clickText(page, selector, text) {
  const el = await findVisible(page, selector, text);
  if (!el) throw new Error(`No visible ${selector} containing "${text}"`);
  await el.evaluate((node) => node.click());
  await sleep(450);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), type: "png", fullPage: false });
}

async function modalInfo(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return dialog
      ? {
          title: dialog.querySelector("h2")?.textContent?.trim() ?? null,
          text: (dialog.textContent || "").replace(/\s+/g, " ").trim().slice(0, 240),
          height: Math.round(dialog.getBoundingClientRect().height),
        }
      : null;
  });
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

try {
  /* ---------------- Desktop ---------------- */
  const desktop = await browser.newPage();
  await desktop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await desktop.setCacheEnabled(false);

  for (const [name, route] of routes) {
    try {
      await visit(desktop, name, route, "desktop");
    } catch (err) {
      recordError(`desktop-${name}`, String(err));
    }
  }

  // Mega menu
  try {
    await desktop.goto(BASE + "/", { waitUntil: "networkidle2" });
    const serviciosBtn = await findVisible(desktop, "header nav button", "Servicios");
    if (!serviciosBtn) throw new Error("Servicios nav button not found");
    await serviciosBtn.hover();
    await sleep(500);
    const expanded = await desktop.evaluate(() => !!document.querySelector('header [aria-expanded="true"]'));
    const panelLinks = await desktop.evaluate(() => {
      const panel = document.querySelector("header .wrap.py-7");
      return panel ? [...panel.querySelectorAll("a")].length : 0;
    });
    await shot(desktop, "desktop-mega-servicios");
    results.interactions.push({ name: "mega-menu-desktop", expanded, links: panelLinks });
  } catch (err) {
    recordError("mega-menu-desktop", String(err));
  }

  // Header login entry
  try {
    await desktop.goto(BASE + "/", { waitUntil: "networkidle2" });
    await clickText(desktop, "header a", "Ingresar");
    await sleep(500);
    const loginLink = await desktop.evaluate(() => ({
      path: window.location.pathname,
      hasForm: !!document.querySelector('main input[autocomplete="username"]'),
    }));
    results.interactions.push({ name: "header-login-link", ...loginLink });
  } catch (err) {
    recordError("header-login-link", String(err));
  }

  // Download modal
  try {
    await desktop.goto(BASE + "/", { waitUntil: "networkidle2" });
    await clickText(desktop, "header button", "Descargar app");
    await sleep(500);
    const info = await modalInfo(desktop);
    await shot(desktop, "desktop-modal-download");
    // Submit an empty form to check validation, then type a demo waitlist
    await desktop.keyboard.press("Escape");
    await sleep(300);
    const closed = await desktop.evaluate(() => !document.querySelector('[role="dialog"]'));
    results.interactions.push({ name: "modal-download-desktop", info, closesOnEscape: closed });
  } catch (err) {
    recordError("modal-download-desktop", String(err));
  }

  // BCV modal
  try {
    await desktop.goto(BASE + "/", { waitUntil: "networkidle2" });
    await desktop.click('button[aria-label="Ver tasa BCV y convertir montos"]');
    await sleep(500);
    const info = await modalInfo(desktop);
    await shot(desktop, "desktop-modal-bcv");
    results.interactions.push({ name: "modal-bcv-desktop", info });
    await desktop.keyboard.press("Escape");
    await sleep(200);
  } catch (err) {
    recordError("modal-bcv-desktop", String(err));
  }

  // Fare modal from tarifas
  try {
    await desktop.goto(BASE + "/tarifas", { waitUntil: "networkidle2" });
    await clickText(desktop, "main button", "Calcular");
    await sleep(500);
    const info = await modalInfo(desktop);
    await shot(desktop, "desktop-modal-fare");
    results.interactions.push({ name: "modal-fare-desktop", info });
    await desktop.keyboard.press("Escape");
  } catch (err) {
    recordError("modal-fare-desktop", String(err));
  }

  // Driver plan modal
  try {
    await desktop.goto(BASE + "/conductores/planes", { waitUntil: "networkidle2" });
    await clickText(desktop, "main button", "Pro Mensual");
    await sleep(500);
    const info = await modalInfo(desktop);
    results.interactions.push({ name: "modal-plan-desktop", info });
    await shot(desktop, "desktop-modal-plan");
    await desktop.keyboard.press("Escape");
  } catch (err) {
    recordError("modal-plan-desktop", String(err));
  }

  // Market filter
  try {
    await desktop.goto(BASE + "/mercado", { waitUntil: "networkidle2" });
    const before = await desktop.evaluate(() => document.querySelectorAll('a[href^="/mercado/negocio/"]').length);
    await clickText(desktop, "button", "Talleres");
    await sleep(350);
    const after = await desktop.evaluate(() => document.querySelectorAll('a[href^="/mercado/negocio/"]').length);
    await shot(desktop, "desktop-mercado-filtro");
    results.interactions.push({ name: "mercado-filter", vendorCardsBefore: before, vendorCardsAfter: after });
  } catch (err) {
    recordError("mercado-filter", String(err));
  }

  // Help search
  try {
    await desktop.goto(BASE + "/ayuda", { waitUntil: "networkidle2" });
    const input = await desktop.$('input[aria-label="Buscar en el centro de ayuda"]');
    await input.click();
    await input.type("BCV");
    await sleep(400);
    const res = await desktop.evaluate(() => {
      const live = document.querySelector('[aria-live="polite"]');
      return {
        countText: live?.querySelector("p")?.textContent?.trim() ?? null,
        openResults: live?.querySelectorAll("details").length ?? 0,
      };
    });
    await shot(desktop, "desktop-ayuda-busqueda");
    results.interactions.push({ name: "ayuda-search", ...res });
  } catch (err) {
    recordError("ayuda-search", String(err));
  }

  // App demo mode switch
  try {
    await desktop.goto(BASE + "/app", { waitUntil: "networkidle2" });
    const modeButtons = await desktop.evaluate(() =>
      [...document.querySelectorAll("main button")].map((b) => b.textContent.trim()).slice(0, 14)
    );
    await clickText(desktop, "main button", "Paquete");
    await sleep(400);
    await shot(desktop, "desktop-app-paquete");
    results.interactions.push({ name: "app-mode-switch", modeButtons });
  } catch (err) {
    recordError("app-mode-switch", String(err));
  }

  // Login demo (no real auth, password never persisted)
  try {
    await desktop.goto(BASE + "/ingresar", { waitUntil: "networkidle2" });
    await desktop.evaluate(() => localStorage.removeItem("llegate_sim_waitlist"));
    const tabs = await desktop.evaluate(() =>
      [...document.querySelectorAll("main [aria-pressed], main a")]
        .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
        .filter((t) => t === "Ingresar" || t === "Crear cuenta")
    );
    const contact = await desktop.$('main input[autocomplete="username"]');
    if (!contact) throw new Error("login contact input not found");
    await contact.type("demo@example.com");
    const password = await desktop.$('main input[type="password"]');
    if (!password) throw new Error("login password input not found");
    await password.type("clave-demo-123");
    await clickText(desktop, "main button", "Entrar");
    await sleep(1100);
    const login = await desktop.evaluate(() => {
      const storage = Object.keys(localStorage);
      return {
        success: !!document.querySelector("main")?.textContent?.includes("Acceso de demostración"),
        storedKeys: storage,
        passwordLeaked: JSON.stringify(localStorage).includes("clave-demo-123"),
      };
    });
    await shot(desktop, "desktop-ingresar-success");
    results.interactions.push({ name: "login-demo", tabs, ...login });
  } catch (err) {
    recordError("login-demo", String(err));
  }

  // Registration page: validation and safe persistence
  try {
    await desktop.goto(BASE + "/registro", { waitUntil: "networkidle2" });
    await desktop.evaluate(() => localStorage.removeItem("llegate_sim_waitlist"));

    await clickText(desktop, "main button", "Crear mi cuenta");
    await sleep(400);
    const emptyValidation = await desktop.evaluate(() => ({
      alert: document.querySelector('main [role="alert"]')?.textContent?.trim() ?? null,
      invalidFields: document.querySelectorAll('main [aria-invalid="true"]').length,
    }));
    await shot(desktop, "desktop-crear-cuenta-validation");

    const name = await desktop.$('main input[autocomplete="name"]');
    if (!name) throw new Error("register name input not found");
    await name.type("María Rodríguez");
    const email = await desktop.$('main input[autocomplete="email"]');
    if (!email) throw new Error("register email input not found");
    await email.type("maria@example.com");
    const phone = await desktop.$('main input[autocomplete="tel"]');
    if (!phone) throw new Error("register phone input not found");
    await phone.type("04141234567");
    const idCard = await desktop.$('main input[autocomplete="off"]');
    if (!idCard) throw new Error("register idCard input not found");
    await idCard.type("V-12345678");
    const password = await desktop.$('main input[name="password"]');
    if (!password) throw new Error("register password input not found");
    await password.type("ClaveDemo123");
    const confirm = await desktop.$('main input[name="confirm"]');
    if (!confirm) throw new Error("register confirm input not found");
    await confirm.type("ClaveDemo124");
    const cityValue = await desktop.evaluate(() => {
      const sel = document.querySelector('main select[name="city"]');
      return sel?.options?.[1]?.value ?? sel?.options?.[0]?.value ?? "";
    });
    if (cityValue) await desktop.select('main select[name="city"]', cityValue);
    await desktop.$eval('main form input[type="checkbox"]', (el) => el.click());

    await clickText(desktop, "main button", "Crear mi cuenta");
    await sleep(400);
    const mismatch = await desktop.evaluate(() => ({
      confirmError: document.querySelector("main")?.textContent?.includes("Las contraseñas no coinciden.") ?? false,
      success: document.querySelector("main")?.textContent?.includes("Lista, María") ?? false,
    }));

    await confirm.click();
    await desktop.keyboard.down("Control");
    await desktop.keyboard.press("A");
    await desktop.keyboard.up("Control");
    await confirm.type("ClaveDemo123");
    await clickText(desktop, "main button", "Crear mi cuenta");
    await sleep(1300);

    const register = await desktop.evaluate(() => {
      const raw = localStorage.getItem("llegate_sim_waitlist") || "";
      const list = raw ? JSON.parse(raw) : [];
      const saved = Array.isArray(list) ? list[list.length - 1] : list;
      return {
        success: !!document.querySelector("main")?.textContent?.includes("Lista, María"),
        savedIntent: saved?.intent ?? null,
        savedName: saved?.name ?? null,
        passwordLeaked: raw.includes("ClaveDemo123"),
        idLeaked: raw.includes("12345678"),
        phoneLeaked: raw.includes("04141234567"),
      };
    });
    await shot(desktop, "desktop-crear-cuenta-success");
    results.interactions.push({ name: "register-demo", emptyValidation, mismatch, ...register });
  } catch (err) {
    recordError("register-demo", String(err));
  }

  // Vendor modal
  try {
    await desktop.goto(BASE + "/mercado/negocio/repuestos-el-motor", { waitUntil: "networkidle2" });
    await clickText(desktop, "main button", "Contactar al negocio");
    await sleep(450);
    const info = await modalInfo(desktop);
    await shot(desktop, "desktop-modal-vendor");
    results.interactions.push({ name: "modal-vendor-desktop", info });
    await desktop.keyboard.press("Escape");
  } catch (err) {
    recordError("modal-vendor-desktop", String(err));
  }

  // Driver wizard
  try {
    await desktop.goto(BASE + "/conductores/registro", { waitUntil: "networkidle2" });
    await clickText(desktop, "main button", "Empezar registro");
    await sleep(450);
    const info = await modalInfo(desktop);
    await shot(desktop, "desktop-modal-driver");
    const fields = await desktop.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"] input, [role="dialog"] select')].map((el) => ({
        tag: el.tagName.toLowerCase(),
        label: el.closest("label")?.querySelector(".label")?.textContent?.trim() ?? el.getAttribute("aria-label"),
      }))
    );
    results.interactions.push({ name: "modal-driver-desktop", info, fields });
    await desktop.keyboard.press("Escape");
  } catch (err) {
    recordError("modal-driver-desktop", String(err));
  }

  // Publish modal
  try {
    await desktop.goto(BASE + "/mercado/publicar", { waitUntil: "networkidle2" });
    await clickText(desktop, "main button", "Enviar mi ficha");
    await sleep(450);
    const info = await modalInfo(desktop);
    await shot(desktop, "desktop-modal-publish");
    results.interactions.push({ name: "modal-publish-desktop", info });
    await desktop.keyboard.press("Escape");
  } catch (err) {
    recordError("modal-publish-desktop", String(err));
  }

  // Coverage search + waitlist modal
  try {
    await desktop.goto(BASE + "/cobertura", { waitUntil: "networkidle2" });
    const input = await desktop.$('input[aria-label="Buscar ciudad o municipio"]');
    await input.click();
    await input.type("Puerto Ayacucho");
    await sleep(450);
    const resultCount = await desktop.evaluate(
      () => document.querySelectorAll('input[aria-label="Buscar ciudad o municipio"]')?.length ?? 0
    );
    await clickText(desktop, "main button", "Puerto Ayacucho");
    await sleep(350);
    await clickText(desktop, "main button", "Solicitar cobertura");
    await sleep(450);
    const info = await modalInfo(desktop);
    await shot(desktop, "desktop-modal-coverage");
    results.interactions.push({ name: "coverage-flow", resultCount, info });
    await desktop.keyboard.press("Escape");
  } catch (err) {
    recordError("coverage-flow", String(err));
  }

  // Waitlist form submission
  try {
    await desktop.goto(BASE + "/", { waitUntil: "networkidle2" });
    await clickText(desktop, "header button", "Descargar app");
    await sleep(400);
    const input = await desktop.$('[role="dialog"] input[type="text"], [role="dialog"] input:not([type])');
    if (!input) throw new Error("waitlist input not found");
    await input.type("demo@example.com");
    await desktop.click('[role="dialog"] input[type="checkbox"]');
    await clickText(desktop, '[role="dialog"] button[type="submit"]', "Avísame");
    await sleep(500);
    const success = await desktop.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return {
        hasSuccess: !!d?.querySelector("h3"),
        title: d?.querySelector("h3")?.textContent?.trim() ?? null,
        saved: !!localStorage.getItem("llegate_sim_waitlist"),
      };
    });
    await shot(desktop, "desktop-modal-waitlist-success");
    results.interactions.push({ name: "waitlist-submit", ...success });
    await desktop.keyboard.press("Escape");
  } catch (err) {
    recordError("waitlist-submit", String(err));
  }

  // Hero viewport captures
  try {
    await desktop.goto(BASE + "/", { waitUntil: "networkidle2" });
    await sleep(300);
    await shot(desktop, "desktop-home-hero");
  } catch (err) {
    recordError("desktop-home-hero", String(err));
  }

  await desktop.close();

  /* ---------------- Mobile ---------------- */  const mobileRoutes = [
    ["home", "/"],
    ["servicios", "/servicios"],
    ["tarifas", "/tarifas"],
    ["cobertura", "/cobertura"],
    ["conductores", "/conductores"],
    ["planes", "/conductores/planes"],
    ["registro", "/conductores/registro"],
    ["mercado", "/mercado"],
    ["negocio", "/mercado/negocio/repuestos-el-motor"],
    ["publicar", "/mercado/publicar"],
    ["app", "/app"],
    ["ingresar", "/ingresar"],
    ["crear-cuenta", "/registro"],
    ["empresas", "/empresas"],
    ["ayuda", "/ayuda"],
    ["aliados", "/nosotros/aliados"],
    ["legal", "/legal/terminos"],
    ["404", "/ruta-inexistente"],
  ];

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await mobile.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );

  for (const [name, route] of mobileRoutes) {
    try {
      await visit(mobile, name, route, "mobile");
    } catch (err) {
      recordError(`mobile-${name}`, String(err));
    }
  }

  // Mobile hero viewport
  try {
    await mobile.goto(BASE + "/", { waitUntil: "networkidle2" });
    await sleep(300);
    await shot(mobile, "mobile-home-hero");
  } catch (err) {
    recordError("mobile-home-hero", String(err));
  }

  // Drawer
  try {
    await mobile.goto(BASE + "/", { waitUntil: "networkidle2" });
    await mobile.click('button[aria-label="Abrir menú"]');
    await sleep(550);
    const drawer = await mobile.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-label="Menú"]');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return {
        width: Math.round(r.width),
        closeButton: !!d.querySelector('button[aria-label="Cerrar menú"]'),
        links: d.querySelectorAll("a").length,
        scrollHeight: d.querySelector(".overflow-y-auto")?.scrollHeight ?? null,
      };
    });
    await shot(mobile, "mobile-drawer");
    await clickText(mobile, '[role="dialog"] button', "Conductores");
    await sleep(350);
    await shot(mobile, "mobile-drawer-conductores");
    results.interactions.push({ name: "mobile-drawer", drawer });
  } catch (err) {
    recordError("mobile-drawer", String(err));
  }

  // Mobile drawer login entry
  try {
    await mobile.goto(BASE + "/", { waitUntil: "networkidle2" });
    await mobile.click('button[aria-label="Abrir menú"]');
    await sleep(500);
    await clickText(mobile, '[role="dialog"][aria-label="Menú"] a', "Ingresar");
    await sleep(600);
    const drawerLogin = await mobile.evaluate(() => ({
      path: window.location.pathname,
      drawerClosed: !document.querySelector('[role="dialog"][aria-label="Menú"]'),
      hasForm: !!document.querySelector('main input[autocomplete="username"]'),
    }));
    results.interactions.push({ name: "mobile-drawer-login", ...drawerLogin });
  } catch (err) {
    recordError("mobile-drawer-login", String(err));
  }

  // Mobile drawer create-account entry
  try {
    await mobile.goto(BASE + "/", { waitUntil: "networkidle2" });
    await mobile.click('button[aria-label="Abrir menú"]');
    await sleep(500);
    await clickText(mobile, '[role="dialog"][aria-label="Menú"] a', "Crear cuenta");
    await sleep(600);
    const drawerRegister = await mobile.evaluate(() => ({
      path: window.location.pathname,
      drawerClosed: !document.querySelector('[role="dialog"][aria-label="Menú"]'),
      hasForm: !!document.querySelector('main input[autocomplete="name"]'),
    }));
    results.interactions.push({ name: "mobile-drawer-register", ...drawerRegister });
  } catch (err) {
    recordError("mobile-drawer-register", String(err));
  }

  // Mobile download sheet
  try {
    await mobile.goto(BASE + "/", { waitUntil: "networkidle2" });
    await clickText(mobile, "header button", "App");
    await sleep(550);
    const info = await modalInfo(mobile);
    await shot(mobile, "mobile-modal-download");
    results.interactions.push({ name: "mobile-download-sheet", info });
    await mobile.keyboard.press("Escape");
    await sleep(300);
    const closed = await mobile.evaluate(() => !document.querySelector('[role="dialog"]'));
    results.interactions.push({ name: "mobile-sheet-escape", closed });
  } catch (err) {
    recordError("mobile-download-sheet", String(err));
  }

  // Mobile tap target audit on header
  try {
    await mobile.goto(BASE + "/", { waitUntil: "networkidle2" });
    const smallTargets = await mobile.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("header a, header button")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < 40) out.push({ label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30), h: Math.round(r.height) });
      }
      return out;
    });
    results.interactions.push({ name: "mobile-header-targets", smallTargets });
  } catch (err) {
    recordError("mobile-header-targets", String(err));
  }

  await mobile.close();
} finally {
  const known = (p) =>
    p === "/" ||
    /^\/servicios(\/[a-z0-9-]+)?$/.test(p) ||
    ["/tarifas", "/cobertura", "/conductores", "/conductores/planes", "/conductores/registro", "/pasajeros/club-vip", "/seguridad", "/mercado", "/mercado/publicar", "/app", "/ingresar", "/registro", "/empresas", "/ayuda", "/nosotros/aliados"].includes(p) ||
    /^\/mercado\/negocio\/[a-z0-9-]+$/.test(p) ||
    /^\/legal\/(terminos|privacidad|cookies)$/.test(p);
  results.internalLinks = [...internalLinks].sort();
  results.unknownLinks = results.internalLinks.filter((p) => !known(p));
  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(results, null, 2));
  await browser.close();
}

const errCount = results.errors.length;
const overflowRoutes = results.routes.filter((r) => r.horizontalOverflow);
const failed = results.routes.filter((r) => ![200, 304].includes(r.status));
console.log(`Routes: ${results.routes.length}`);
console.log(`Errors: ${errCount}`);
console.log(`Non-200: ${failed.map((f) => `${f.name}(${f.status})`).join(", ") || "none"}`);
console.log(`Horizontal overflow: ${overflowRoutes.map((r) => `${r.name}@${r.viewportName}`).join(", ") || "none"}`);
console.log(`Internal links: ${results.internalLinks.length}, unknown: ${results.unknownLinks.join(", ") || "none"}`);
const scrollableRoutes = results.routes.filter((r) => r.scrollAreas?.some((a) => a.scrollable));
console.log(`Scrollable tables/areas: ${scrollableRoutes.map((r) => `${r.name}@${r.viewportName}`).join(", ") || "none"}`);
const smallTargetRoutes = results.routes.filter((r) => r.smallButtons?.length);
console.log(`Routes with sub-40px links/buttons in main: ${smallTargetRoutes.map((r) => `${r.name}@${r.viewportName}(${r.smallButtons.length})`).join(", ") || "none"}`);
for (const r of results.routes) {
  if (r.overflowing.length) {
    console.log(`  overflow elements ${r.name}@${r.viewportName}: ${r.overflowing.map((o) => `${o.tag}.${o.cls.split(" ")[0]}(${o.right}>${r.viewport[0]})`).join(" | ")}`);
  }
}
console.log("Interactions:", JSON.stringify(results.interactions, null, 2));
if (errCount) console.log("Error log:", JSON.stringify(results.errors, null, 2));
