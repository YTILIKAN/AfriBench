/**
 * Vérifie que les paires de couleurs documentées respectent WCAG 2 AA.
 *
 * Complète axe-core (qui ne voit que le rendu d'une page donnée) en contrôlant
 * les tokens du design system dans les deux thèmes.
 *
 * Usage : node tools/contrast-tokens.mjs
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const CSS_PATH = resolve(import.meta.dirname, '..', 'css', 'style.css');

/**
 * Paires (texte, fond, seuil) par thème.
 * --ocre-ui est réservé aux bordures et au focus (WCAG 1.4.11 : 3:1).
 */
const THEME_PAIRS = {
  clair: [
    ['--noir', '--ivoire', 4.5],
    ['--charbon', '--ivoire', 4.5],
    ['--muted', '--ivoire', 4.5],
    ['--ocre-ink', '--ivoire', 4.5],
    ['--ocre-ui', '--ivoire', 3],
    ['--success', '--ivoire', 4.5],
    ['--warning', '--ivoire', 4.5],
    ['--danger', '--ivoire', 4.5],
    ['--on-dark', '--noir', 4.5],
    ['--orange', '--noir', 3],
    ['--noir', '--surface', 4.5],
    ['--muted', '--surface', 4.5],
    ['--ocre-ink', '--surface-2', 4.5],
  ],
  sombre: [
    ['--noir', '--ivoire', 4.5],
    ['--charbon', '--ivoire', 4.5],
    ['--muted', '--ivoire', 4.5],
    ['--ocre-ink', '--ivoire', 4.5],
    ['--ocre-ui', '--surface', 3],
    ['--success', '--ivoire', 4.5],
    ['--warning', '--ivoire', 4.5],
    ['--danger', '--ivoire', 4.5],
    ['--on-dark', '--surface-2', 4.5],
    ['--orange', '--surface-2', 3],
    ['--noir', '--surface', 4.5],
    ['--muted', '--surface', 4.5],
  ],
};

const THEMES = [
  { name: 'clair', selector: ':root' },
  { name: 'sombre', selector: 'body[data-theme="dark"]' },
];

function parseBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = re.exec(css);
  if (!match) return {};
  const tokens = {};
  for (const line of match[1].split('\n')) {
    const m = /^\s*(--[\w-]+)\s*:\s*([^;]+);/.exec(line);
    if (m) tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

function resolveToken(name, themeTokens, rootTokens, stack = new Set()) {
  if (stack.has(name)) return null;
  stack.add(name);
  const raw = themeTokens[name] ?? rootTokens[name];
  if (!raw) return null;
  const varRef = /^var\((--[\w-]+)\)$/.exec(raw);
  if (varRef) return resolveToken(varRef[1], themeTokens, rootTokens, stack);
  return raw;
}

function parseHex(value) {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (!hex) return null;
  let h = hex[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relLuminance({ r, g, b }) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(fg, bg) {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const css = await readFile(CSS_PATH, 'utf-8');
const rootTokens = parseBlock(css, ':root');
const failures = [];
let checked = 0;

for (const theme of THEMES) {
  const themeTokens = parseBlock(css, theme.selector);
  const pairs = THEME_PAIRS[theme.name] || [];
  for (const [fgVar, bgVar, minRatio] of pairs) {
    checked += 1;
    const fgRaw = resolveToken(fgVar, themeTokens, rootTokens);
    const bgRaw = resolveToken(bgVar, themeTokens, rootTokens);
    if (!fgRaw || !bgRaw) {
      failures.push({ theme: theme.name, fgVar, bgVar, reason: 'token manquant' });
      continue;
    }
    const fg = parseHex(fgRaw);
    const bg = parseHex(bgRaw);
    if (!fg || !bg) {
      failures.push({
        theme: theme.name, fgVar, bgVar, reason: `valeur non hex (${fgRaw} / ${bgRaw})`,
      });
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio < minRatio) {
      failures.push({
        theme: theme.name, fgVar, bgVar, fgRaw, bgRaw,
        ratio: ratio.toFixed(2), required: `${minRatio}:1`,
      });
    }
  }
}

console.log(`paires contrôlées : ${checked}`);
console.log(`échecs            : ${failures.length}`);

if (failures.length) {
  for (const f of failures) {
    if (f.reason) {
      console.log(`  [${f.theme}] ${f.fgVar} sur ${f.bgVar} — ${f.reason}`);
    } else {
      console.log(
        `  [${f.theme}] ${f.fgVar} (${f.fgRaw}) sur ${f.bgVar} (${f.bgRaw})`
        + ` — ${f.ratio}:1 < ${f.required}`,
      );
    }
  }
  process.exitCode = 1;
} else {
  console.log('OK : tous les tokens passent WCAG 2 AA (4,5:1).');
}
