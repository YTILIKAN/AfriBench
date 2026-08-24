/**
 * Coordination du chargement des données.
 *
 * Trois défauts couverts ici :
 *  - bootstrap.json (~280 Ko) était attendu AVANT que les requêtes API
 *    démarrent, donc le temps d'interactivité était la somme des latences ;
 *  - il était téléchargé en entier puis jeté quand l'API répondait ;
 *  - aucune garde de réentrance : le bouton « Réessayer » pouvait lancer des
 *    chargements concurrents dont les réponses arrivaient dans le désordre.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../js/app.js';

const { AppState } = globalThis;

const API_RESULTS = [{
  model: 'gpt-4o', model_label: 'GPT-4o', timestamp: '2026-08-01T00:00:00',
  total: 350, correct: 330, accuracy: 94.3, by_category: {}, by_difficulty: {},
}];
const BOOTSTRAP_RESULTS = [{
  model: 'gpt-4o', model_label: 'GPT-4o', timestamp: '2026-06-01T00:00:00',
  total: 101, correct: 95, accuracy: 94.1, by_category: {}, by_difficulty: {},
}];

function jsonResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

/** Construit un faux fetch dont on contrôle le moment de résolution. */
function makeFetch({
  apiDelay = 0, bootstrapDelay = 0, apiFails = false, bootstrapFails = false,
} = {}) {
  const calls = [];
  const aborted = [];
  const fetchMock = vi.fn((url, options = {}) => {
    const href = String(url);
    calls.push(href);
    const isBootstrap = href.includes('bootstrap');
    const isStaticFile = href.startsWith('data/') && !isBootstrap;
    const delay = isBootstrap ? bootstrapDelay : apiDelay;
    return new Promise((resolve, reject) => {
      const signal = options.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          aborted.push(href);
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      }
      setTimeout(() => {
        if (signal?.aborted) return;
        if (isBootstrap) {
          if (bootstrapFails) reject(new Error('bootstrap absent'));
          else resolve(jsonResponse({ results: BOOTSTRAP_RESULTS, questions: [], stats: {} }));
        } else if (isStaticFile) {
          // Repli statique : toujours disponible sur GitHub Pages.
          resolve(jsonResponse(href.includes('results') ? BOOTSTRAP_RESULTS : []));
        } else if (apiFails) {
          reject(new Error('API down'));
        } else if (href.includes('/results')) {
          resolve(jsonResponse(API_RESULTS));
        } else if (href.includes('/questions')) {
          resolve(jsonResponse([]));
        } else {
          resolve(jsonResponse({}));
        }
      }, delay);
    });
  });
  return { fetchMock, calls, aborted };
}

beforeEach(() => {
  document.body.innerHTML = '<span id="data-source-badge"></span><div id="daily-question"></div>';
  AppState.results = [];
  AppState.questions = [];
  AppState.stats = {};
  AppState.dataSource = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('loadData', () => {
  it('lance le bootstrap et l API en parallele, pas en sequence', async () => {
    const { fetchMock, calls } = makeFetch({ apiDelay: 5, bootstrapDelay: 5 });
    vi.stubGlobal('fetch', fetchMock);
    const promise = globalThis.loadData();
    // Sans avoir laissé le temps à quoi que ce soit de se résoudre, les quatre
    // requêtes doivent déjà être parties.
    expect(calls.some((u) => u.includes('bootstrap'))).toBe(true);
    expect(calls.some((u) => u.includes('/results'))).toBe(true);
    await vi.runAllTimersAsync();
    await promise;
  });

  it('interrompt le telechargement du bootstrap quand l API repond', async () => {
    const { fetchMock, aborted } = makeFetch({ apiDelay: 1, bootstrapDelay: 500 });
    vi.stubGlobal('fetch', fetchMock);
    const promise = globalThis.loadData();
    await vi.runAllTimersAsync();
    await promise;
    expect(aborted.some((u) => u.includes('bootstrap'))).toBe(true);
    expect(AppState.dataSource).toBe('api');
    expect(AppState.results[0].total).toBe(350);
  });

  it('affiche l instantane si l API tarde, puis le remplace', async () => {
    const { fetchMock } = makeFetch({ apiDelay: 300, bootstrapDelay: 1 });
    vi.stubGlobal('fetch', fetchMock);
    const painted = [];
    const promise = globalThis.loadData({
      onEarlyPaint: () => painted.push(AppState.results[0]?.total),
    });
    await vi.runAllTimersAsync();
    await promise;
    expect(painted, 'affichage anticipé attendu').toEqual([101]);
    expect(AppState.dataSource).toBe('api');
    expect(AppState.results[0].total).toBe(350);
  });

  it('garde l instantane si l API echoue mais que le bootstrap a repondu', async () => {
    const { fetchMock } = makeFetch({ apiFails: true, apiDelay: 1, bootstrapDelay: 5 });
    vi.stubGlobal('fetch', fetchMock);
    const promise = globalThis.loadData();
    await vi.runAllTimersAsync();
    await promise;
    // L'instantané est lui-même une source statique valide : inutile de
    // retélécharger data/results.json par-dessus.
    expect(AppState.dataSource).toBe('bootstrap');
    expect(AppState.results).toHaveLength(1);
  });

  it('se replie sur les fichiers statiques si l API et le bootstrap echouent', async () => {
    const { fetchMock, calls } = makeFetch({
      apiFails: true, bootstrapFails: true, apiDelay: 1, bootstrapDelay: 1,
    });
    vi.stubGlobal('fetch', fetchMock);
    const promise = globalThis.loadData();
    await vi.runAllTimersAsync();
    await promise;
    expect(AppState.dataSource).toBe('static');
    expect(calls).toContain('data/results.json');
    expect(AppState.results).toHaveLength(1);
  });

  it('ne lance qu une campagne a la fois', async () => {
    const { fetchMock } = makeFetch({ apiDelay: 10, bootstrapDelay: 10 });
    vi.stubGlobal('fetch', fetchMock);
    const a = globalThis.loadData();
    const b = globalThis.loadData();
    expect(b, 'le second appel doit réutiliser le premier').toBe(a);
    await vi.runAllTimersAsync();
    await a;
    // 4 requêtes : bootstrap + results + questions + stats. Sans garde, 8.
    expect(fetchMock.mock.calls.length).toBe(4);
  });
});
