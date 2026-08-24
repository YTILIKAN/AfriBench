import { beforeEach, describe, expect, it } from 'vitest';
import '../js/app.js';
import '../js/leaderboard.js';
import '../js/models.js';
import '../js/compare.js';
import '../js/evolution.js';
import '../js/questions.js';

const { AppState, setActiveTab } = globalThis;

const RESULTS = [{
  model: 'gpt-4o', model_label: 'GPT-4o', timestamp: '2026-06-04T22:23:49',
  total: 10, correct: 9, accuracy: 90,
  by_category: { histoire: { correct: 9, total: 10, accuracy: 90 } },
  by_difficulty: { easy: { correct: 9, total: 10, accuracy: 90 } },
}];

beforeEach(() => {
  document.body.innerHTML = `
    <nav role="tablist">
      <button id="nav-overview" role="tab" data-workspace="overview"></button>
      <button id="nav-analysis" role="tab" data-workspace="analysis"></button>
      <button id="nav-data" role="tab" data-workspace="data"></button>
      <button id="nav-project" role="tab" data-workspace="project"></button>
    </nav>
    <div id="workspace-nav"></div>
    <div id="workspace-filters"></div>
    <h2 id="view-title"></h2>
    <p id="view-desc"></p>
    <span id="mobile-view-title"></span>
    <main id="tab-content" role="tabpanel" aria-labelledby="nav-overview" aria-live="polite"></main>
  `;
  AppState.results = structuredClone(RESULTS);
  AppState.questions = [];
  AppState.searchQuery = '';
  AppState.modelType = 'all';
  AppState.urlCategory = null;
  AppState.urlDifficulty = null;
  AppState.dataSource = 'api';
  AppState.loading = false;
});

describe('references ARIA', () => {
  const TABS = ['leaderboard', 'models', 'compare', 'evolution', 'questions'];
  TABS.forEach((tab) => {
    it(`aria-labelledby designe un element existant pour ${tab}`, () => {
      setActiveTab(tab);
      const panel = document.getElementById('tab-content');
      const ref = panel.getAttribute('aria-labelledby');
      expect(ref, `aria-labelledby absent pour ${tab}`).toBeTruthy();
      expect(document.getElementById(ref), `#${ref} introuvable`).toBeTruthy();
    });
  });

  it('le repli sans navigation secondaire designe l espace', () => {
    document.getElementById('workspace-nav').remove();
    setActiveTab('compare');
    const ref = document.getElementById('tab-content').getAttribute('aria-labelledby');
    expect(ref).toBe('nav-analysis');
    expect(document.getElementById(ref)).toBeTruthy();
  });
});
