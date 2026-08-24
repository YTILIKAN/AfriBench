import js from '@eslint/js';
import globals from 'globals';
import noUnescapedInterpolation from './eslint-rules/no-unescaped-interpolation.js';

const local = {
  rules: { 'no-unescaped-interpolation': noUnescapedInterpolation },
};

export default [
  js.configs.recommended,
  {
    // L'architecture repose sur des modules ES qui publient leurs fonctions sur
    // globalThis. Le lint doit donc couvrir js/, src/ ET tests/ : les tests
    // portent la moitié des garde-fous du projet.
    files: ['js/**/*.js', 'src/**/*.js', 'admin/**/*.js', 'scripts/**/*.mjs'],
    plugins: { local },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Publié par src/chart-setup.js avant le chargement des vues
        Chart: 'writable',
      },
    },
    rules: {
      'no-undef': 'error',
      // Erreur, et non avertissement : un avertissement ne fait pas échouer la CI.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-condition': 'error',
      'no-prototype-builtins': 'error',

      // Règle maison : vérifie l'invariant réel du projet — toute valeur de
      // données ou de libellé interpolée dans du HTML passe par escapeHtml().
      // C'est exactement le défaut qui a produit la XSS réfléchie de l'audit.
      'local/no-unescaped-interpolation': 'error',

      // Hygiène de base, absente jusqu'ici.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-implicit-globals': 'error',
      'no-return-await': 'error',
      'no-else-return': 'warn',
      'prefer-template': 'warn',
      'object-shorthand': ['warn', 'properties'],

      // Cohérence de formatage, sans imposer un formateur complet.
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
    },
  },
  {
    // Les tests manipulent volontairement des globales et des charges XSS.
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      semi: ['error', 'always'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
    },
  },
];
