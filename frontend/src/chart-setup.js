/**
 * Enregistrement Chart.js — import sélectif.
 *
 * `registerables` embarque les contrôleurs camembert, secteur polaire, nuage de
 * points et bulles, les échelles logarithmique et temporelle et les greffons de
 * décimation et de sous-titre. L'application n'utilise que barres, courbes et
 * radar, avec légende et infobulles ; `Filler` est nécessaire au remplissage
 * des radars.
 *
 * Module partagé avec les tests, afin que la liste ne puisse pas dériver : un
 * composant retiré ici fait échouer tests/charts.test.js.
 */
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  RadarController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Filler,
  Legend,
  Tooltip,
} from 'chart.js';

export const CHART_COMPONENTS = [
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  RadarController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Filler,
  Legend,
  Tooltip,
];

/** Enregistre les composants et publie Chart sur globalThis (attendu par js/app.js). */
export function setupChart() {
  Chart.register(...CHART_COMPONENTS);
  globalThis.Chart = Chart;
  // Valeur de repli identique à celle de chartTheme() dans js/app.js ; les vues
  // relisent la variable CSS --chart-tick au montage et au changement de thème.
  Chart.defaults.color = '#5B5854';
  Chart.defaults.font.family = "'Inter', 'Sora', sans-serif";
  Chart.defaults.font.size = 11;
  return Chart;
}

export { Chart };
