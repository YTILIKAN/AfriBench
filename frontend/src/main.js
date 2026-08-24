/**
 * AfriBench — point d'entrée Vite (bundle unique).
 */
import { setupChart } from './chart-setup.js';
// Sous-ensembles latin et latin-ext uniquement. latin couvre le français et la
// ligature « œ » ; latin-ext couvre « ĩ » et « ũ », présents dans le corpus.
// Les jeux cyrillique, grec et vietnamien ne peuvent jamais être atteints.
// Sora ne sert qu'aux titres : ses graisses 400 et 500 ne sont référencées par
// aucune règle CSS.
import '@fontsource/sora/latin-600.css';
import '@fontsource/sora/latin-700.css';
import '@fontsource/sora/latin-800.css';
import '@fontsource/sora/latin-ext-600.css';
import '@fontsource/sora/latin-ext-700.css';
import '@fontsource/sora/latin-ext-800.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import '../css/style.css';
import './icons.js';

setupChart();

import '../js/app.js';
import '../js/leaderboard.js';
import '../js/models.js';
import '../js/compare.js';
import '../js/evolution.js';
import '../js/questions.js';
import '../js/open_tasks.js';
import '../js/contribute.js';
import '../js/methodology.js';
import '../js/api.js';
