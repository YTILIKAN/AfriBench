/**
 * Vérifie l'accessibilité de l'application construite avec axe-core.
 *
 * Complète Stylelint et les tests unitaires : mesure le rendu calculé dans un
 * vrai navigateur sur toutes les vues et les deux thèmes, et échoue sur toute
 * violation WCAG 2 AA (contraste, ARIA, noms accessibles, etc.).
 *
 * Usage : npm run build && node tools/a11y-check.mjs
 *
 * Prérequis : `npm run build` (l'outil sert dist/).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const DIST = resolve(import.meta.dirname, '..', 'dist');

const TABS = [
  'leaderboard', 'models', 'compare', 'evolution',
  'questions', 'open_tasks', 'contribute', 'methodology', 'api',
];
const THEMES = ['light', 'dark'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function serve(root, port) {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let file = join(root, normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

async function run() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('dist/ introuvable — lancez `npm run build` d\'abord.');
    process.exitCode = 2;
    return;
  }

  const port = 8232;
  const server = await serve(DIST, port);
  const browser = await chromium.launch();
  const violations = [];
  let scans = 0;

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    for (const theme of THEMES) {
      for (const tab of TABS) {
        await page.goto(`http://127.0.0.1:${port}/?tab=${tab}`, { waitUntil: 'load' });
        await page.evaluate((t) => { document.body.setAttribute('data-theme', t); }, theme);
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        scans += 1;
        for (const v of results.violations) {
          violations.push({
            scope: `${theme}|${tab}`,
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
            targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
          });
        }
      }
    }

    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`analyses axe-core : ${scans} (${THEMES.length} thèmes × ${TABS.length} vues)`);
  console.log(`violations        : ${violations.length}`);

  if (violations.length) {
    console.log('');
    for (const v of violations) {
      console.log(`  [${v.scope}] ${v.id} (${v.impact}) — ${v.help}`);
      for (const t of v.targets) console.log(`      ${t}`);
      if (v.nodes > 3) console.log(`      … et ${v.nodes - 3} autres nœuds`);
    }
    process.exitCode = 1;
  } else {
    console.log('OK : aucune violation WCAG 2 AA détectée.');
  }
}

await run();
