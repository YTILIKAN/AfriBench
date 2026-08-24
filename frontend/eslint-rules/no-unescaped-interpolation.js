/**
 * Règle ESLint locale — interdit d'interpoler du texte non échappé dans un
 * littéral de gabarit qui construit du HTML.
 *
 * Pourquoi une règle maison plutôt que `eslint-plugin-no-unsanitized` :
 * ce plugin signale toute affectation à `innerHTML`, sans pouvoir vérifier que
 * les interpolations du gabarit sont échappées. Sur ce projet, où tout le HTML
 * est construit par littéraux de gabarit, il produirait une vingtaine d'erreurs
 * qu'il faudrait toutes supprimer — ce qui apprend à ignorer la règle.
 *
 * Cette règle vérifie l'invariant qui compte réellement : une valeur venant des
 * données ou d'un assistant de libellé ne doit jamais atteindre le HTML sans
 * passer par escapeHtml(). C'est exactement le défaut qui a produit la XSS
 * réfléchie de l'audit du 24 août 2026 :
 *
 *     `<span>${categoryLabel(q.category)}</span>`   // ← interdit
 *     `<span>${escapeHtml(categoryLabel(q.category))}</span>`  // ← correct
 *
 * Les libellés restent volontairement non échappés à la source, car ils
 * alimentent aussi les exports CSV/JSON et les étiquettes de graphiques, où un
 * échappement HTML corromprait la sortie.
 */

/** Fonctions dont le retour est du texte non fiable (données ou libellé). */
const UNTRUSTED_CALLS = new Set([
  'categoryLabel',
  'difficultyLabel',
  'formatDate',
  'getModelProvider',
]);

/** Fonctions qui rendent une valeur sûre pour du HTML. */
const SAFE_WRAPPERS = new Set(['escapeHtml', 'encodeURIComponent']);

/** Champs de données bruts qui ne doivent pas être interpolés directement. */
const UNTRUSTED_FIELDS = new Set([
  'category',
  'subcategory',
  'difficulty',
  'model',
  'model_label',
  'question',
  'answer',
  'explanation',
  'source',
  'author',
  'label',
  'name',
  'provider',
  'metric',
  'id',
]);

function calleeName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return null;
}

/** Le nœud est-il enveloppé par un assistant sûr ? */
function isWrappedSafely(node, ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const a = ancestors[i];
    if (a.type === 'CallExpression' && SAFE_WRAPPERS.has(calleeName(a.callee))) {
      return true;
    }
    if (a.type === 'TemplateLiteral') break;
  }
  return false;
}

/** Le gabarit construit-il du HTML ? */
function buildsHtml(templateLiteral) {
  return templateLiteral.quasis.some((q) => /[<>]/.test(q.value.raw));
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Interdit d\'interpoler une valeur de données ou de libellé sans escapeHtml() '
        + 'dans un littéral de gabarit qui construit du HTML.',
    },
    schema: [],
    messages: {
      unescapedCall:
        '{{name}}() renvoie du texte non fiable : enveloppez-le dans escapeHtml() '
        + 'avant de l\'interpoler dans du HTML.',
      unescapedField:
        '« .{{name}} » vient des données : enveloppez-le dans escapeHtml() avant '
        + 'de l\'interpoler dans du HTML.',
    },
  },

  create(context) {
    const stack = [];

    function report(node, messageId, name) {
      if (isWrappedSafely(node, stack)) return;
      context.report({ node, messageId, data: { name } });
    }

    return {
      '*': (node) => stack.push(node),
      '*:exit': () => stack.pop(),

      CallExpression(node) {
        const name = calleeName(node.callee);
        if (!name || !UNTRUSTED_CALLS.has(name)) return;
        const template = stack.find((a) => a.type === 'TemplateLiteral');
        if (!template || !buildsHtml(template)) return;
        report(node, 'unescapedCall', name);
      },

      MemberExpression(node) {
        if (node.computed || node.property.type !== 'Identifier') return;
        if (!UNTRUSTED_FIELDS.has(node.property.name)) return;
        // On ne considère que les interpolations directes : `${q.category}`.
        const parent = stack[stack.length - 2];
        if (!parent || parent.type !== 'TemplateLiteral') return;
        if (!buildsHtml(parent)) return;
        report(node, 'unescapedField', node.property.name);
      },
    };
  },
};
