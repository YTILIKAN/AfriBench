/**
 * AfriBench — point d'entrée Vite (bundle unique).
 */
import { Chart, registerables } from 'chart.js';
import '@fontsource/sora/400.css';
import '@fontsource/sora/500.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/sora/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '../css/style.css';

Chart.register(...registerables);
globalThis.Chart = Chart;

Chart.defaults.color = '#5B5854';
Chart.defaults.font.family = "'Inter', 'Sora', sans-serif";
Chart.defaults.font.size = 11;

import '../js/app.js';
import '../js/leaderboard.js';
import '../js/models.js';
import '../js/categories.js';
import '../js/compare.js';
import '../js/evolution.js';
import '../js/questions.js';
import '../js/open_tasks.js';
import '../js/contribute.js';
import '../js/methodology.js';
import '../js/api.js';
