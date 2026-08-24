/**
 * Capture l'empreinte des styles CALCULÉS de l'application, dans un vrai
 * navigateur.
 *
 * Pourquoi cet outil existe : lors de l'audit du 24 août 2026, la fusion des
 * sélecteurs dupliqués de `css/style.css` a été différée parce qu'elle déplace
 * l'ordre de cascade et qu'aucune vérification mécanique ne couvrait les
 * interactions ENTRE sélecteurs — une comparaison sélecteur par sélecteur ne
 * suffit pas. Un instantané des styles calculés, lui, mesure le résultat final
 * tel que le navigateur le rend, donc toutes les interactions à la fois.
 *
 * Usage :
 *   node tools/style-snapshot.mjs avant.json      # capture
 *   node tools/style-snapshot.mjs apres.json
 *   node tools/style-snapshot.mjs --diff avant.json apres.json
 *
 * Prérequis : `npm run build` (l'outil sert dist/).
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const DIST = resolve(import.meta.dirname, '..', 'dist');

/** Vues à parcourir, thèmes et largeurs : la matrice de capture. */
const TABS = [
  'leaderboard', 'models', 'compare', 'evolution',
  'questions', 'open_tasks', 'contribute', 'methodology', 'api',
];
const THEMES = ['light', 'dark'];
const WIDTHS = [1440, 1000, 820, 700, 500];

/** Propriétés retenues : celles qui changent quelque chose à l'œil. */
const PROPS = [
  'display', 'position', 'visibility', 'opacity', 'z-index', 'overflow',
  'color', 'background-color', 'background-image',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-transform', 'text-align',
  'text-decoration-line', 'white-space',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-bottom-color', 'border-top-left-radius',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
  'grid-template-columns', 'box-shadow', 'outline-width', 'outline-color',
  'transform', 'transition-duration', 'cursor',
];

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

/**
 * Clé stable pour un élément : chemin structurel + classes.
 * Volontairement indépendante du texte, qui varie avec les données.
 */
const KEY_FN = `(el) => {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== document.documentElement) {
    const parent = node.parentElement;
    const index = parent ? [...parent.children].indexOf(node) : 0;
    const cls = node.className && typeof node.className === 'string'
      ? '.' + node.className.trim().split(/\\s+/).filter(Boolean).sort().join('.')
      : '';
    parts.unshift(node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + cls + '[' + index + ']');
    node = parent;
  }
  return parts.join('>');
}`;

async function capture(outPath) {
  const port = 8231;
  const server = await serve(DIST, port);
  const browser = await chromium.launch();
  const snapshot = {};
  let elements = 0;

  try {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 950 } });
      const page = await context.newPage();
      for (const theme of THEMES) {
        for (const tab of TABS) {
          await page.goto(`http://127.0.0.1:${port}/?tab=${tab}`, { waitUntil: 'load' });
          await page.evaluate(
            (t) => { document.body.setAttribute('data-theme', t); },
            theme,
          );
          // Laisse le temps aux vues asynchrones et aux graphiques de se monter.
          await page.waitForTimeout(450);
          const styles = await page.evaluate(
            ({ props, keyFn }) => {
              const key = eval(keyFn);
              const out = {};
              for (const el of document.querySelectorAll('body *')) {
                // Les canvas sont peints par Chart.js : leur style calculé
                // suffit, leur contenu n'est pas du ressort du CSS.
                const cs = getComputedStyle(el);
                const record = {};
                for (const p of props) record[p] = cs.getPropertyValue(p);
                out[key(el)] = record;
              }
              return out;
            },
            { props: PROPS, keyFn: KEY_FN },
          );
          const scope = `${width}px|${theme}|${tab}`;
          snapshot[scope] = styles;
          elements += Object.keys(styles).length;
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  await writeFile(outPath, JSON.stringify(snapshot, null, 0), 'utf-8');
  const scopes = Object.keys(snapshot).length;
  console.log(`instantané écrit : ${outPath}`);
  console.log(`  ${scopes} contextes (largeur × thème × vue), ${elements} éléments`);
}

async function diff(beforePath, afterPath) {
  const a = JSON.parse(await readFile(beforePath, 'utf-8'));
  const b = JSON.parse(await readFile(afterPath, 'utf-8'));
  const problems = [];
  let compared = 0;

  for (const scope of Object.keys(a)) {
    const ea = a[scope];
    const eb = b[scope] || {};
    for (const key of Object.keys(ea)) {
      if (!(key in eb)) {
        problems.push({ scope, key, kind: 'élément absent après' });
        continue;
      }
      for (const [prop, value] of Object.entries(ea[key])) {
        compared += 1;
        if (eb[key][prop] !== value) {
          problems.push({
            scope, key, kind: 'valeur différente', prop,
            before: value, after: eb[key][prop],
          });
        }
      }
    }
    for (const key of Object.keys(eb)) {
      if (!(key in ea)) problems.push({ scope, key, kind: 'élément nouveau' });
    }
  }

  console.log(`propriétés comparées : ${compared.toLocaleString('fr-FR')}`);
  console.log(`différences          : ${problems.length}`);
  if (problems.length) {
    console.log('');
    for (const p of problems.slice(0, 60)) {
      if (p.prop) {
        console.log(`  [${p.scope}] ${p.key}\n      ${p.prop} : ${p.before}  ->  ${p.after}`);
      } else {
        console.log(`  [${p.scope}] ${p.key}  (${p.kind})`);
      }
    }
    if (problems.length > 60) console.log(`  … et ${problems.length - 60} autres`);
    process.exitCode = 1;
  }
}

const [first, ...rest] = process.argv.slice(2);
if (first === '--diff') {
  await diff(rest[0], rest[1]);
} else if (first) {
  await capture(first);
} else {
  console.error('usage : style-snapshot.mjs <sortie.json> | --diff <avant.json> <apres.json>');
  process.exitCode = 2;
}
