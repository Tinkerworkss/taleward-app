/*
 * Aufnahmen für Website und Store aus dem Testmodus (Demo „Die leisen Wasser“).
 *
 *   npm run build:mock
 *   npx vite preview --port 4173          (in einem zweiten Fenster laufen lassen)
 *   node scripts/screenshots.mjs          (Chrome oder Edge wird gesucht; sonst CHROME_PATH setzen)
 *
 * Ergebnis: screenshots/taleward-<nr>-<sprache>-<thema>.png, 1080 × 2400 px (Pixel-7-Maße, Dichte 2,625).
 * Die Aufnahmen entstehen im Browser in Handy-Größe – ohne Android-Statusleiste, die setzt die Website selbst.
 */
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const OUT = process.env.OUT_DIR ?? 'screenshots';
const SERVER = 'https://taleward.euer-verein.de';
const DPR = 1080 / 411;
const W = 411, H = 2400.9 / DPR; // leicht aufgerundet, damit genau 2400 px entstehen

const CHROME = process.env.CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'
].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome/Edge nicht gefunden – bitte CHROME_PATH setzen.');

const L = {
  de: { cid: 'c-wasser', next: 'Weiter', askConsent: 'Zustimmen lassen', agree: 'Zustimmen', summarize: 'Zusammenfassung erstellen',
    accept: 'Übernehmen', publish: 'Recap veröffentlichen', invite: 'Mitspielende einladen', qr: 'QR-Code zeigen' },
  en: { cid: 'c-waters', next: 'Continue', askConsent: 'Ask to agree', agree: 'Agree', summarize: 'Create summary',
    accept: 'Accept', publish: 'Publish recap', invite: 'Invite players', qr: 'Show QR code' }
};

// Welche Aufnahmen in welchem Thema (Stern in der Anfrage = zusätzlich Spielabend)
const RUNS = [
  { lang: 'de', theme: 'pergament', shots: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { lang: 'en', theme: 'pergament', shots: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { lang: 'de', theme: 'spielabend', shots: [1, 7] },
  { lang: 'en', theme: 'spielabend', shots: [1, 7] }
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', ...(process.env.NO_SANDBOX ? ['--no-sandbox', '--single-process', '--no-zygote'] : [])] });

for (const run of RUNS) {
  const t = L[run.lang];
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewport({ width: W, height: Math.ceil(H), deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  // Zeitanzeige der Aufnahme gezielt auf 01:12:40 bringen: Sekunden-Takte laufen schnell und halten dort an
  await page.evaluateOnNewDocument(() => {
    const orig = window.setInterval.bind(window);
    window.setInterval = (fn, ms, ...a) => {
      const target = window.__recTarget;
      if (ms !== 1000 || !target) return orig(fn, ms, ...a);
      let n = 0;
      return orig(() => { if (n < target) { n++; fn(); } }, 2, ...a);
    };
  });

  const shot = async (nr) => {
    if (!run.shots.includes(nr)) return;
    await wait(700);
    const file = `${OUT}/taleward-${String(nr).padStart(2, '0')}-${run.lang}-${run.theme}.png`;
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
    console.log('  ', file);
  };
  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(1200); };
  const click = async (text, scope = 'body') => page.evaluate((txt, sc) => {
    const el = [...document.querySelectorAll(`${sc} button, ${sc} summary`)].find((b) => b.textContent.trim() === txt || b.textContent.trim().startsWith(txt));
    if (!el) throw new Error('Knopf fehlt: ' + txt);
    el.click();
  }, text, scope);
  const login = async (user) => {
    await go(`/verbinden?server=${encodeURIComponent(SERVER + '/api/v1')}`);
    await page.$eval('#address', (el) => { el.value = ''; });
    await page.type('#address', SERVER);
    await click(t.next); await wait(900);
    await page.type('#user', user); await page.type('#pass', 'demo');
    await page.click('button[type=submit]'); await wait(1500);
  };

  console.log(`${run.lang} / ${run.theme}`);
  await page.goto(`${BASE}/#/`);
  await page.evaluate((lang, theme) => {
    localStorage.clear();
    localStorage.setItem('session-chronik.lang', lang);
    localStorage.setItem('taleward.theme', theme === 'spielabend' ? 'dark' : 'light');
  }, run.lang, run.theme);
  await page.reload(); await wait(800);

  await login('anja');
  const conn = await page.evaluate(() => JSON.parse(localStorage.getItem('session-chronik.connections'))[0].id);
  const k = `/v/${conn}/k/${t.cid}`, s = `/v/${conn}/s/s-${t.cid}-7`;

  await go(`${k}/aufnahme`); await shot(2);
  await go(`${s}/stimmen`); await shot(4);
  await click(t.summarize); await wait(12000);
  await go(`${s}/freigabe`);
  await page.evaluate(() => document.querySelector('details.card summary')?.click());
  await shot(5);
  await go(k); await click(t.invite); await wait(600); await click(t.qr); await wait(400);
  await page.evaluate(() => [...document.querySelectorAll('.card')].find((c) => c.querySelector('svg') && c.textContent.includes('/einladung/'))?.scrollIntoView({ block: 'start' }));
  await shot(9);
  if (run.shots.includes(3)) {
    await go(`${k}/aufnahme`);
    await click(t.askConsent); await wait(300);
    await page.evaluate(() => document.querySelector('[role=dialog] input[type=checkbox]').click());
    await click(t.agree, '[role=dialog]'); await wait(300);
    await page.evaluate(() => { window.__recTarget = 1 * 3600 + 12 * 60 + 40; });
    await page.click('.rec-button');
    await page.waitForFunction(() => document.querySelector('.rec-time')?.textContent === '01:12:40', { timeout: 30000 });
    await shot(3);
    await page.evaluate(() => { window.__recTarget = 0; });
  }
  await go(`${s}/freigabe`); await click(t.accept); await wait(500); await click(t.publish); await wait(1500);
  await go(`${k}/bibel`);
  await page.evaluate(() => [...document.querySelectorAll('.card-title')].find((c) => c.textContent.trim() === 'Oren Silt')?.closest('.card')?.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => document.querySelector('.screen-main').scrollBy(0, -12));
  await shot(7);

  await login('lea');
  await go(`${k}/chronik`); await shot(1);
  await go(`${k}/termin`); await shot(8);

  await login('tom');
  await go(`${s}/recap`); await shot(6);

  if (errors.length) console.log('   Fehler in der Seite:', errors);
  await page.close();
}
await browser.close();
