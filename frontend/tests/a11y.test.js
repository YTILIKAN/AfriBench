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
    <nav aria-label="Navigation principale">
      <div class="sidebar-tablist">
        <button id="nav-overview" data-workspace="overview" data-sidebar data-tab="leaderboard"></button>
        <button id="nav-analysis" data-workspace="analysis" data-sidebar data-tab="compare"></button>
        <button id="nav-data" data-workspace="data" data-sidebar data-tab="questions"></button>
        <button id="nav-project" data-workspace="project" data-sidebar data-tab="methodology"></button>
      </div>
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

  it('une seule tablist contrôle le panneau', () => {
    setActiveTab('leaderboard');
    // La barre latérale choisit un espace (navigation) ; seule #workspace-nav
    // est une tablist et pointe vers #tab-content.
    const controllers = [...document.querySelectorAll('[role="tab"]')];
    expect(controllers.length).toBeGreaterThan(0);
    controllers.forEach((tab) => {
      expect(tab.closest('#workspace-nav'), `${tab.id} hors de #workspace-nav`).toBeTruthy();
    });
    expect(document.querySelectorAll('.sidebar-tablist [role="tab"]')).toHaveLength(0);
  });

  it('les boutons d espace utilisent aria-current, pas aria-selected', () => {
    setActiveTab('questions');
    const dataBtn = document.getElementById('nav-data');
    expect(dataBtn.getAttribute('aria-current')).toBe('true');
    expect(dataBtn.hasAttribute('aria-selected')).toBe(false);
    expect(document.getElementById('nav-overview').getAttribute('aria-current')).toBe('false');
  });
});

describe('structure des tableaux', () => {
  const RESULTS = [{
    model: 'gpt-4o', model_label: 'GPT-4o', timestamp: '2026-06-04T22:23:49',
    total: 10, correct: 9, accuracy: 90,
    by_category: { histoire: { correct: 9, total: 10, accuracy: 90 } },
    by_difficulty: { easy: { correct: 9, total: 10, accuracy: 90 } },
  }];

  beforeEach(() => {
    AppState.results = structuredClone(RESULTS);
    document.body.innerHTML = '<main id="tab-content"></main>';
  });

  it('le classement a une legende et des en-tetes portee', () => {
    const container = document.getElementById('tab-content');
    globalThis.renderLeaderboard(container);
    const table = container.querySelector('table.lb-table');
    expect(table.querySelector('caption'), 'caption manquante').toBeTruthy();
    const headers = [...table.querySelectorAll('thead th')];
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((th) => expect(th.getAttribute('scope')).toBe('col'));
    // Le nom du modèle identifie la ligne : c'est un en-tête de ligne.
    const rowHeader = table.querySelector('tbody th[scope="row"]');
    expect(rowHeader, 'en-tête de ligne manquant').toBeTruthy();
    expect(rowHeader.textContent).toContain('GPT-4o');
  });
});
