/**
 * Copie les fichiers statiques non gérés par Vite vers dist/.
 *
 * Remplace l'ancien `cp -r … 2>/dev/null || true`, qui masquait ses propres
 * échecs : un dossier `data/` absent produisait un build « réussi » livrant un
 * site dont toute la couche de données répondait 404.
 */
import { cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// Seuls les dossiers que Vite ne prend pas en charge. Les fichiers à URL fixe
// (favicon, manifeste, robots.txt, sitemap.xml, .nojekyll, og-image) vivent
// dans public/ et sont copiés verbatim par Vite.
// `required: true` → l'absence fait échouer le build.
const ENTRIES = [
  { name: 'data', required: true },
  // Backoffice autonome, non bundlé : à replier dans le build Vite à terme.
  { name: 'admin', required: true },
];

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(DIST))) {
  console.error(`copy-static : ${DIST} est absent — lancez d'abord « vite build ».`);
  process.exit(1);
}

const missing = [];
let copied = 0;

for (const { name, required } of ENTRIES) {
  const from = join(ROOT, name);
  if (!(await exists(from))) {
    if (required) missing.push(name);
    continue;
  }
  await cp(from, join(DIST, name), { recursive: true });
  copied += 1;
}

if (missing.length) {
  console.error(`copy-static : fichiers requis absents — ${missing.join(', ')}`);
  process.exit(1);
}

// Vérifie que Vite a bien recopié public/ : une régression de publicDir
// produirait un site sans favicon, sans manifeste et sans sitemap.
const FROM_PUBLIC = [
  'favicon.svg',
  'apple-touch-icon.png',
  'manifest.webmanifest',
  'og-image.png',
  'robots.txt',
  'sitemap.xml',
];
const absent = [];
for (const name of FROM_PUBLIC) {
  if (!(await exists(join(DIST, name)))) absent.push(name);
}
if (absent.length) {
  console.error(
    `copy-static : absent(s) de dist/ — ${absent.join(', ')}. Vérifiez publicDir dans vite.config.js.`,
  );
  process.exit(1);
}

console.log(`copy-static : ${copied} entrées copiées vers dist/.`);
