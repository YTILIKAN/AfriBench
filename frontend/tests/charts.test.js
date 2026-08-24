/**
 * Vérifie que les composants Chart.js effectivement enregistrés par src/main.js
 * suffisent aux graphiques de l'application.
 *
 * Sans ce test, remplacer `registerables` par un import sélectif se solderait
 * par des graphiques vides en production sans qu'aucun test n'échoue : les
 * autres suites tournent avec `Chart` indéfini et `mountChart` renvoie null.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Le même module que src/main.js : la liste des composants enregistrés ne peut
// donc pas diverger entre l'application et ces tests.
import { Chart, setupChart } from '../src/chart-setup.js';

import '../js/app.js';
import '../js/leaderboard.js';
import '../js/models.js';
import '../js/compare.js';
import '../js/evolution.js';

setupChart();

const { AppState } = globalThis;

const RESULTS = [
  {
    model: 'gpt-4o', model_label: 'GPT-4o', timestamp: '2026-06-04T22:23:49',
    total: 101, correct: 95, accuracy: 94.1,
    by_category: {
      histoire: { correct: 14, total: 15, accuracy: 93.3 },
      geographie: { correct: 15, total: 16, accuracy: 93.8 },
      economie: { correct: 9, total: 10, accuracy: 90.0 },
    },
    by_difficulty: {
      easy: { correct: 30, total: 31, accuracy: 96.8 },
      medium: { correct: 40, total: 43, accuracy: 93.0 },
      hard: { correct: 25, total: 27, accuracy: 92.6 },
    },
  },
  {
    model: 'llama-3-70b', model_label: 'Llama 3 70B', timestamp: '2026-07-01T10:00:00',
    total: 101, correct: 80, accuracy: 79.2,
    by_category: {
      histoire: { correct: 11, total: 15, accuracy: 73.3 },
      geographie: { correct: 13, total: 16, accuracy: 81.3 },
      economie: { correct: 8, total: 10, accuracy: 80.0 },
    },
    by_difficulty: {
      easy: { correct: 28, total: 31, accuracy: 90.3 },
      medium: { correct: 33, total: 43, accuracy: 76.7 },
      hard: { correct: 19, total: 27, accuracy: 70.4 },
    },
  },
];

function makeContainer() {
  document.body.innerHTML = '<main id="tab-content"></main>';
  return document.getElementById('tab-content');
}

/** Plusieurs vues montent leurs graphiques dans un requestAnimationFrame. */
function nextFrame() {
  return new Promise((resolve) => { requestAnimationFrame(() => resolve()); });
}

beforeEach(() => {
  AppState.results = structuredClone(RESULTS);
  AppState.questions = [];
  AppState.searchQuery = '';
  AppState.modelType = 'all';
  AppState.comparePreset = null;
  AppState.urlCategory = null;
  AppState.dataSource = 'api';
  AppState.loading = false;
});

afterEach(() => {
  Object.values(Chart.instances || {}).forEach((chart) => chart.destroy());
});

describe('graphiques', () => {
  it('le classement instancie ses deux graphiques en barres', async () => {
    const container = makeContainer();
    globalThis.renderLeaderboard(container);
    await nextFrame();
    const cat = Chart.getChart(container.querySelector('#lb-cat-chart'));
    const diff = Chart.getChart(container.querySelector('#lb-diff-chart'));
    expect(cat, 'graphique par catégorie').toBeTruthy();
    expect(cat.config.type).toBe('bar');
    expect(diff, 'graphique par difficulté').toBeTruthy();
    expect(diff.config.type).toBe('bar');
  });

  it('la vue Comparer instancie un radar', async () => {
    const container = makeContainer();
    globalThis.renderCompare(container);
    await nextFrame();
    const radar = Chart.getChart(container.querySelector('#compare-radar'));
    expect(radar).toBeTruthy();
    expect(radar.config.type).toBe('radar');
    // Vérifier le type déclaré ne suffit pas : sans RadarController enregistré,
    // la configuration reste correcte mais rien ne se dessine.
    expect(radar.getDatasetMeta(0).controller).toBeTruthy();
    expect(radar.getDatasetMeta(0).type).toBe('radar');
  });

  it('la vue Évolution instancie une courbe', async () => {
    const container = makeContainer();
    globalThis.renderEvolution(container);
    await nextFrame();
    const line = Chart.getChart(container.querySelector('#evolution-chart'));
    expect(line).toBeTruthy();
    expect(line.config.type).toBe('line');
  });

  it('les fiches modèles instancient un mini-radar chacune', async () => {
    const container = makeContainer();
    globalThis.renderModels(container);
    await nextFrame();
    const canvases = [...container.querySelectorAll('canvas')];
    expect(canvases.length).toBeGreaterThan(0);
    canvases.forEach((canvas) => {
      expect(Chart.getChart(canvas), `radar de ${canvas.id}`).toBeTruthy();
    });
  });

  it('remonter la même vue ne laisse pas de graphique orphelin', async () => {
    const container = makeContainer();
    for (let i = 0; i < 5; i += 1) {
      globalThis.renderLeaderboard(container);
      await nextFrame();
    }
    const live = Object.values(Chart.instances || {});
    // Deux canvas dans cette vue : sans registre, on en accumulait deux par rendu.
    expect(live).toHaveLength(2);
  });
});
