/**
 * Fusionne les règles CSS qui partagent exactement la même liste de sélecteurs.
 *
 * `css/style.css` est l'empilement de deux feuilles : la seconde redéfinissait
 * les mêmes composants au lieu de les modifier, laissant `.sidebar` déclaré
 * 7 fois et `.app-main` 6 fois. Les déclarations provablement écrasées ayant
 * déjà été retirées, les blocs d'un même sélecteur portent désormais des
 * propriétés DISJOINTES : les réunir ne change donc aucune valeur pour ce
 * sélecteur pris isolément.
 *
 * Le seul risque restant est l'ordre de cascade face aux AUTRES sélecteurs de
 * spécificité égale. On fusionne donc vers la DERNIÈRE occurrence — la position
 * qui gagne déjà aujourd'hui — et on vérifie le résultat avec
 * `tools/style-snapshot.mjs`, qui compare les styles calculés dans un vrai
 * navigateur sur 90 contextes.
 *
 * Usage : node tools/merge-duplicate-selectors.mjs [--apply]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const CSS_PATH = resolve(import.meta.dirname, '..', 'css', 'style.css');

/** Découpe le CSS en segments : règles de premier niveau et texte intercalaire. */
function parseTopLevel(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf('{', i);
    if (brace === -1) break;
    let depth = 1;
    let j = brace + 1;
    while (depth && j < css.length) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    const prelude = css.slice(i, brace);
    // Sépare les commentaires/blancs qui précèdent du sélecteur lui-même.
    const match = /^([\s\S]*?)([^\s;{}][^{}]*)$/.exec(prelude);
    const lead = match ? match[1] : prelude;
    const rawSelector = match ? match[2] : '';
    const selector = rawSelector.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    rules.push({
      start: i,
      end: j,
      lead,
      rawSelector,
      selector,
      body: css.slice(brace + 1, j - 1),
      isAtRule: selector.startsWith('@') || rawSelector.trimStart().startsWith('@'),
    });
    i = j;
  }
  return rules;
}

/** Déclarations d'un corps de règle, commentaires conservés séparément. */
function splitBody(body) {
  const comments = [];
  const decls = [];
  let rest = body;
  // Extrait les commentaires pour ne pas les couper en deux.
  rest = rest.replace(/\/\*[\s\S]*?\*\//g, (c) => {
    comments.push(c.trim());
    return '';
  });
  for (const chunk of rest.split(';')) {
    const decl = chunk.trim();
    if (decl) decls.push(`${decl};`);
  }
  return { comments, decls };
}

const css = await readFile(CSS_PATH, 'utf-8');
const rules = parseTopLevel(css);

// Regroupe les règles de premier niveau par liste de sélecteurs identique.
const groups = new Map();
for (const rule of rules) {
  if (rule.isAtRule || !rule.selector) continue;
  if (!groups.has(rule.selector)) groups.set(rule.selector, []);
  groups.get(rule.selector).push(rule);
}

/**
 * Une at-rule (typiquement @media) qui redéclare le même sélecteur crée une
 * frontière infranchissable : une règle racine déplacée APRÈS elle prendrait
 * le dessus, car une media query n'ajoute pas de spécificité — seul l'ordre
 * source décide. La surcharge responsive serait alors muette.
 *
 * Constaté en conditions réelles : fusionner `.sidebar` faisait passer son
 * z-index de 70 (tiroir mobile, dans @media) à 50 (valeur racine).
 */
function atRuleBoundaries(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declaresSelector = new RegExp(`(^|[,}])\\s*${escaped}\\s*\\{`, 'm');
  return rules
    .filter((r) => r.isAtRule && declaresSelector.test(r.body))
    .map((r) => r.start);
}

/** Découpe une liste de blocs en séries séparées par les frontières. */
function splitIntoRuns(list, boundaries) {
  const runs = [[list[0]]];
  for (let i = 1; i < list.length; i += 1) {
    const prev = list[i - 1];
    const cur = list[i];
    const crosses = boundaries.some((b) => b > prev.start && b < cur.start);
    if (crosses) runs.push([cur]);
    else runs[runs.length - 1].push(cur);
  }
  return runs.filter((run) => run.length > 1);
}

const duplicated = [...groups.entries()].filter(([, list]) => list.length > 1);
duplicated.sort((a, b) => b[1].length - a[1].length);

let mergedRules = 0;
let removedBlocks = 0;
let skippedByBoundary = 0;
const edits = [];

for (const [selector, list] of duplicated) {
  const boundaries = atRuleBoundaries(selector);
  const runs = splitIntoRuns(list, boundaries);
  const mergeable = runs.reduce((n, run) => n + run.length, 0);
  if (mergeable < list.length) skippedByBoundary += list.length - mergeable;

  for (const run of runs) {
    // Cible = PREMIÈRE occurrence de la série : rien ne se déplace vers une
    // position plus tardive, donc aucune surcharge ultérieure n'est neutralisée.
    const target = run[0];
    const sources = run.slice(1);

    const comments = [];
    const decls = [];
    for (const rule of run) {
      const parsed = splitBody(rule.body);
      comments.push(...parsed.comments);
      decls.push(...parsed.decls);
    }

    const indent = '  ';
    const commentBlock = comments.length
      ? `${comments.map((c) => `${indent}${c}`).join('\n')}\n`
      : '';
    const newBody = `\n${commentBlock}${decls.map((d) => `${indent}${d}`).join('\n')}\n`;

    edits.push({
      kind: 'replace',
      rule: target,
      text: `${target.lead}${target.rawSelector}{${newBody}}`,
    });
    for (const rule of sources) edits.push({ kind: 'delete', rule });

    mergedRules += 1;
    removedBlocks += sources.length;
  }
}

// Applique de la fin vers le début pour ne pas décaler les positions.
edits.sort((a, b) => b.rule.start - a.rule.start);
let out = css;
for (const edit of edits) {
  const { rule } = edit;
  if (edit.kind === 'delete') {
    // Conserve les commentaires de tête : ils documentent souvent le composant.
    let end = rule.end;
    while (end < out.length && (out[end] === '\n' || out[end] === ' ')) end += 1;
    out = out.slice(0, rule.start + rule.lead.length) + out.slice(end);
  } else {
    out = out.slice(0, rule.start) + edit.text + out.slice(rule.end);
  }
}

out = out.replace(/\n{3,}/g, '\n\n');

const before = css.split('\n').length;
const after = out.split('\n').length;

console.log(`sélecteurs déclarés plusieurs fois : ${duplicated.length}`);
console.log(`fusions réalisées                  : ${mergedRules}`);
console.log(`blocs supprimés par fusion         : ${removedBlocks}`);
console.log(`blocs laissés (frontière at-rule)  : ${skippedByBoundary}`);
console.log(`lignes : ${before} -> ${after}`);
console.log(`accolades : ${out.split('{').length - 1} / ${out.split('}').length - 1}`);
if ((out.split('{').length) !== (out.split('}').length)) {
  console.error('DÉSÉQUILIBRE D\'ACCOLADES — abandon');
  process.exit(1);
}

console.log('\ntop 12 :');
for (const [selector, list] of duplicated.slice(0, 12)) {
  console.log(`  ${list.length}x  ${selector}`);
}

if (process.argv.includes('--apply')) {
  await writeFile(CSS_PATH, out, 'utf-8');
  console.log('\nappliqué');
} else {
  console.log('\n(essai à blanc — passez --apply pour écrire)');
}
