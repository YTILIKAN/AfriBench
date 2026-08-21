/**
 * Smoke tests des vues AfriBench.
 *
 * Ces tests auraient attrapé les régressions de la refonte 2026 :
 *  - leaderboard : variable `html` non déclarée (ReferenceError en ESM strict)
 *  - models : tri exécuté au render → récursion infinie (stack overflow)
 *  - reveal : sections invisibles sans IntersectionObserver
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// L'ordre compte : app.js publie les helpers sur globalThis.
import '../js/app.js';
import '../js/leaderboard.js';
import '../js/models.js';
import '../js/categories.js';
import '../js/compare.js';
import '../js/evolution.js';
import '../js/questions.js';
import '../js/contribute.js';
import '../js/methodology.js';
import '../js/api.js';

const {
  AppState, escapeHtml, getLatestResults, isOpenModel, setActiveTab,
} = globalThis;

afterEach(() => {
  vi.unstubAllGlobals();
});

const MOCK_RESULTS = [
  {
    model: 'gpt-4o',
    model_label: 'GPT-4o',
    timestamp: '2026-06-04T22:23:49',
    total: 101,
    correct: 95,
    accuracy: 94.1,
    by_category: {
      histoire: { correct: 14, total: 15, accuracy: 93.3 },
      geographie: { correct: 16, total: 16, accuracy: 100.0 },
    },
    by_difficulty: {
      easy: { correct: 40, total: 41, accuracy: 97.6 },
      medium: { correct: 35, total: 38, accuracy: 92.1 },
      hard: { correct: 20, total: 22, accuracy: 90.9 },
    },
  },
  {
    model: 'llama-3-70b',
    model_label: 'Llama 3 70B',
    timestamp: '2026-06-04T22:23:49',
    total: 101,
    correct: 88,
    accuracy: 87.1,
    by_category: {
      histoire: { correct: 12, total: 15, accuracy: 80.0 },
      geographie: { correct: 14, total: 16, accuracy: 87.5 },
    },
    by_difficulty: {
      easy: { correct: 38, total: 41, accuracy: 92.7 },
      medium: { correct: 32, total: 38, accuracy: 84.2 },
      hard: { correct: 18, total: 22, accuracy: 81.8 },
    },
  },
];

const MOCK_QUESTIONS = [
  {
    id: 'GEO-001',
    category: 'geographie',
    difficulty: 'easy',
    language: 'fr',
    question: 'Quelle est la capitale du Sénégal ?',
    options: { A: 'Bamako', B: 'Dakar', C: 'Abidjan', D: 'Accra' },
    answer: 'B',
    explanation: 'Dakar est la capitale du Sénégal.',
  },
  {
    id: 'HIS-001',
    category: 'histoire',
    difficulty: 'medium',
    language: 'fr',
    question: 'Quel empire africain a prospéré au XIVe siècle ?',
    options: { A: 'Mali', B: 'Carthage', C: 'Rome', D: 'Byzance' },
    answer: 'A',
  },
];

function makeContainer() {
  document.body.innerHTML = '<main id="tab-content"></main>';
  return document.getElementById('tab-content');
}

beforeEach(() => {
  AppState.results = structuredClone(MOCK_RESULTS);
  AppState.questions = structuredClone(MOCK_QUESTIONS);
  AppState.searchQuery = '';
  AppState.comparePreset = null;
  AppState.dataSource = 'api';
  AppState.loading = false;
  AppState.questionPage = 1;
});

describe('escapeHtml', () => {
  it('échappe les caractères dangereux', () => {
    expect(escapeHtml('<script>"x"</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&lt;&#x2F;script&gt;',
    );
  });
  it('tolère les entrées vides', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('getLatestResults', () => {
  it('déduplique par modèle et trie par score décroissant', () => {
    const results = getLatestResults();
    expect(results).toHaveLength(2);
    expect(results[0].model).toBe('gpt-4o');
    expect(results[1].model).toBe('llama-3-70b');
  });

  it('garde le timestamp le plus récent', () => {
    AppState.results.push({
      ...MOCK_RESULTS[0],
      timestamp: '2026-08-01T00:00:00',
      accuracy: 99.0,
    });
    const results = getLatestResults();
    expect(results.find((r) => r.model === 'gpt-4o').accuracy).toBe(99.0);
  });
});

describe('isOpenModel', () => {
  it('détecte les modèles open weights', () => {
    expect(isOpenModel({ model: 'llama-3-70b' })).toBe(true);
    expect(isOpenModel({ model: 'gpt-4o' })).toBe(false);
  });
});

describe('renderLeaderboard', () => {
  it('rend le tableau sans erreur (régression : html non déclaré)', () => {
    const container = makeContainer();
    expect(() => globalThis.renderLeaderboard(container)).not.toThrow();
    expect(container.querySelector('.lb-table')).toBeTruthy();
    expect(container.textContent).toContain('GPT-4o');
  });

  it('affiche un état vide sans résultats', () => {
    AppState.results = [];
    const container = makeContainer();
    globalThis.renderLeaderboard(container);
    expect(container.textContent).toContain('Aucun résultat');
  });

  it('échappe les noms de modèles (XSS)', () => {
    AppState.results[0].model_label = '<img src=x onerror=alert(1)>';
    const container = makeContainer();
    globalThis.renderLeaderboard(container);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x');
  });

  it('filtre par recherche globale', () => {
    AppState.searchQuery = 'llama';
    const container = makeContainer();
    globalThis.renderLeaderboard(container);
    expect(container.textContent).toContain('Llama 3 70B');
    expect(container.textContent).not.toContain('GPT-4o');
  });
});

describe('renderModels', () => {
  it('rend les cartes sans récursion (régression : tri au render)', () => {
    const container = makeContainer();
    expect(() => globalThis.renderModels(container)).not.toThrow();
    expect(container.querySelectorAll('.model-card')).toHaveLength(2);
  });

  it('le bouton de tri ne trie qu\'au clic', () => {
    const container = makeContainer();
    globalThis.renderModels(container);
    const scoreBtn = container.querySelector('[data-msort="score"]');
    expect(() => scoreBtn.click()).not.toThrow();
    expect(container.querySelectorAll('.model-card')).toHaveLength(2);
  });
});

describe('autres vues', () => {
  it('renderCategories', () => {
    const container = makeContainer();
    expect(() => globalThis.renderCategories(container)).not.toThrow();
    expect(container.textContent).toContain('Histoire');
  });

  it('renderCompare', () => {
    const container = makeContainer();
    expect(() => globalThis.renderCompare(container)).not.toThrow();
    expect(container.querySelectorAll('.compare-check').length).toBe(2);
  });

  it('renderEvolution', () => {
    const container = makeContainer();
    expect(() => globalThis.renderEvolution(container)).not.toThrow();
    expect(container.querySelector('#evolution-chart')).toBeTruthy();
    expect(container.textContent).toContain('GPT-4o');
  });

  it('renderQuestions avec filtres et XSS safe', () => {
    AppState.questions[0].question = '<b>Capitale</b> du Sénégal ?';
    const container = makeContainer();
    expect(() => globalThis.renderQuestions(container)).not.toThrow();
    expect(container.querySelectorAll('.q-item')).toHaveLength(2);
    expect(container.querySelector('.q-item b')).toBeNull();
    const details = container.querySelector('.q-item__details');
    const toggle = container.querySelector('[data-question-toggle]');
    expect(details.hidden).toBe(true);
    toggle.click();
    expect(details.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    container.querySelector('#q-toggle-all').click();
    expect(container.querySelectorAll('.q-item__details[hidden]')).toHaveLength(0);
    container.querySelector('#q-toggle-all').click();
    expect(container.querySelectorAll('.q-item__details[hidden]')).toHaveLength(2);
  });

  it('pagine les questions par groupes de 20 et synchronise la page', () => {
    AppState.questions = Array.from({ length: 45 }, (_, index) => ({
      ...MOCK_QUESTIONS[index % MOCK_QUESTIONS.length],
      id: `QUESTION-${index + 1}`,
      question: `Question numéro ${index + 1}`,
    }));
    const container = makeContainer();
    globalThis.renderQuestions(container);

    expect(container.querySelectorAll('.q-item')).toHaveLength(20);
    expect(container.querySelector('[aria-current="page"]').textContent.trim()).toBe('1');

    container.querySelector('[aria-label="Page suivante"]').click();
    expect(AppState.questionPage).toBe(2);
    expect(container.querySelectorAll('.q-item')).toHaveLength(20);

    container.querySelector('[aria-label="Page suivante"]').click();
    expect(AppState.questionPage).toBe(3);
    expect(container.querySelectorAll('.q-item')).toHaveLength(5);
    expect(container.textContent).toContain('41–45 sur 45 questions');
  });

  it('renderMethodology', () => {
    const container = makeContainer();
    expect(() => globalThis.renderMethodology(container)).not.toThrow();
    expect(container.textContent).toContain('benchmark');
  });

  it('renderAPI', () => {
    const container = makeContainer();
    expect(() => globalThis.renderAPI(container)).not.toThrow();
    expect(container.textContent).toContain('/results');
  });

  it('renderContribute : hub et formulaire modal accessibles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
    const container = makeContainer();
    await globalThis.renderContribute(container);
    expect(container.querySelector('.hub-hero')).toBeTruthy();
    expect(container.querySelector('#proposal-modal').hidden).toBe(true);
    container.querySelector('[data-open-proposal]').click();
    expect(container.querySelector('#proposal-modal').hidden).toBe(false);
    expect(container.querySelector('#cq-category')).toBeTruthy();
    expect(container.querySelector('#cq-question')).toBeTruthy();
    expect(container.querySelectorAll('input[name="cq-answer"]')).toHaveLength(4);
    container.querySelector('#cq-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const errors = container.querySelector('#cq-errors');
    expect(errors.hidden).toBe(false);
    expect(errors.textContent).toContain('Catégorie');
  });

  it('renderContribute : publie une proposition dans le hub', async () => {
    const proposal = {
      id: 'p1',
      category: 'geographie',
      difficulty: 'easy',
      question: 'Quelle est la capitale du Sénégal ?',
      options: { A: 'Bamako', B: 'Dakar', C: 'Abidjan', D: 'Accra' },
      answer: 'B',
      explanation: 'Dakar est la capitale politique et économique du Sénégal.',
      source: 'https://example.org/senegal',
      author: null,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      total_votes: 0,
      user_vote: 0,
      created_at: '2026-08-21T00:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => proposal }));
    const container = makeContainer();
    await globalThis.renderContribute(container);
    container.querySelector('[data-open-proposal]').click();
    container.querySelector('#cq-category').value = 'geographie';
    container.querySelector('#cq-difficulty').value = 'easy';
    container.querySelector('#cq-question').value = 'Quelle est la capitale du Sénégal ?';
    container.querySelector('#cq-option-A').value = 'Bamako';
    container.querySelector('#cq-option-B').value = 'Dakar';
    container.querySelector('#cq-option-C').value = 'Abidjan';
    container.querySelector('#cq-option-D').value = 'Accra';
    container.querySelector('#cq-answer-B').checked = true;
    container.querySelector('#cq-explanation').value = proposal.explanation;
    container.querySelector('#cq-source').value = proposal.source;
    container.querySelector('#cq-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector('#proposal-modal').hidden).toBe(true);
    expect(container.querySelector('#hub-list').textContent).toContain('capitale du Sénégal');
  });
});

describe('navigation par onglets (sidebar)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav class="sidebar-nav">
        <div class="sidebar-tablist" role="tablist" aria-orientation="vertical">
          <button class="sidebar-btn active" role="tab" data-tab="leaderboard" data-sidebar id="nav-leaderboard">Classement</button>
          <button class="sidebar-btn" role="tab" data-tab="models" data-sidebar id="nav-models">Modèles</button>
        </div>
      </nav>
      <header class="view-header">
        <h2 id="view-title"></h2>
        <p id="view-desc"></p>
      </header>
      <span id="mobile-view-title"></span>
      <main id="tab-content" role="tabpanel"></main>
    `;
  });

  it('setActiveTab met à jour aria-selected et le roving tabindex', () => {
    setActiveTab('models');
    const modelsBtn = document.getElementById('nav-models');
    const lbBtn = document.getElementById('nav-leaderboard');
    expect(modelsBtn.getAttribute('aria-selected')).toBe('true');
    expect(modelsBtn.getAttribute('tabindex')).toBe('0');
    expect(modelsBtn.classList.contains('active')).toBe(true);
    expect(lbBtn.getAttribute('aria-selected')).toBe('false');
    expect(lbBtn.getAttribute('tabindex')).toBe('-1');
    expect(document.getElementById('tab-content').getAttribute('aria-labelledby')).toBe('nav-models');
  });

  it('setActiveTab met à jour l\'en-tête de vue et le titre mobile', () => {
    setActiveTab('models');
    expect(document.getElementById('view-title').textContent).toBe('Modèles');
    expect(document.getElementById('view-desc').textContent.length).toBeGreaterThan(0);
    expect(document.getElementById('mobile-view-title').textContent).toBe('Modèles');
    expect(document.title).toContain('Modèles');
  });

  it('setActiveTab rejette les onglets inconnus', () => {
    setActiveTab('nope');
    expect(AppState.activeTab).toBe('leaderboard');
  });

  it('VIEW_META couvre tous les onglets valides', () => {
    const { VALID_TABS, VIEW_META } = globalThis;
    for (const tab of VALID_TABS) {
      expect(VIEW_META[tab], `VIEW_META.${tab}`).toBeTruthy();
      expect(VIEW_META[tab].title.length).toBeGreaterThan(0);
      expect(VIEW_META[tab].desc.length).toBeGreaterThan(0);
    }
  });
});

describe('navigation dynamique par espaces', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav class="sidebar-nav">
        <div class="sidebar-tablist" role="tablist">
          <button data-sidebar data-workspace="overview" data-tab="leaderboard"></button>
          <button data-sidebar data-workspace="analysis" data-tab="compare"></button>
          <button data-sidebar data-workspace="data" data-tab="questions"></button>
          <button data-sidebar data-workspace="project" data-tab="methodology"></button>
        </div>
      </nav>
      <input type="search" id="global-search">
      <nav id="workspace-nav"></nav>
      <div id="workspace-filters"></div>
      <h2 id="view-title"></h2>
      <p id="view-desc"></p>
      <span id="mobile-view-title"></span>
      <main id="tab-content" role="tabpanel"></main>
    `;
    AppState.modelType = 'all';
    AppState.urlCategory = null;
    AppState.urlDifficulty = null;
  });

  it('regroupe les vues dans le bon espace et rend les sous-onglets', () => {
    setActiveTab('compare');
    const analysis = document.querySelector('[data-workspace="analysis"]');
    expect(analysis.classList.contains('active')).toBe(true);
    expect(document.querySelectorAll('[data-workspace-tab]')).toHaveLength(2);
    expect(document.querySelector('[data-workspace-tab="compare"]').classList.contains('active')).toBe(true);
  });

  it('intègre la catégorie comme filtre du classement principal', () => {
    setActiveTab('leaderboard');
    const select = document.getElementById('workspace-category');
    select.value = 'geographie';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(AppState.urlCategory).toBe('geographie');
    expect(document.querySelector('.filter-context').textContent).toContain('Géographie');
    expect(document.querySelector('.lb-table .score-cell').textContent).toBe('100.0%');
  });

  it('le filtre global de type met à jour le contenu', () => {
    setActiveTab('models');
    const select = document.getElementById('workspace-model-type');
    select.value = 'open';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(AppState.modelType).toBe('open');
    expect(document.getElementById('tab-content').textContent).toContain('Llama 3 70B');
    expect(document.getElementById('tab-content').textContent).not.toContain('GPT-4o');
  });

  it('la réinitialisation efface tous les filtres partagés', () => {
    AppState.searchQuery = 'gpt';
    AppState.modelType = 'closed';
    AppState.urlCategory = 'histoire';
    AppState.urlDifficulty = 'hard';
    setActiveTab('questions');
    document.getElementById('workspace-reset').click();
    expect(AppState.searchQuery).toBe('');
    expect(AppState.modelType).toBe('all');
    expect(AppState.urlCategory).toBeNull();
    expect(AppState.urlDifficulty).toBeNull();
  });
});

describe('bandeau d’introduction compact', () => {
  it('déplie et replie les détails sans masquer le titre', () => {
    document.body.innerHTML = `
      <header>
        <h1>Évaluer les LLMs</h1>
        <button id="page-header-toggle" aria-expanded="false" aria-controls="page-header-details">
          <span>Détails</span><span class="page-header__toggle-icon">+</span>
        </button>
        <div id="page-header-details" hidden>Statistiques</div>
      </header>
    `;
    globalThis.setupDashboardIntro();
    const toggle = document.getElementById('page-header-toggle');
    const details = document.getElementById('page-header-details');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(details.hidden).toBe(false);
    expect(toggle.textContent).toContain('Réduire');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(details.hidden).toBe(true);
    expect(document.querySelector('h1')).toBeTruthy();
  });

  it('replie aussi la question du jour par défaut', async () => {
    document.body.innerHTML = '<div id="daily-question"></div>';
    globalThis.renderDailyQuestion();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const toggle = document.getElementById('dq-collapse-toggle');
    const content = document.getElementById('dq-content');
    expect(content.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    expect(content.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('recherche globale', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input type="search" id="global-search">
      <main id="tab-content" role="tabpanel"></main>
    `;
    AppState.activeTab = 'leaderboard';
    globalThis.setupSearch();
  });

  it('Escape efface la recherche sans changer d\'onglet (vue searchable)', () => {
    const input = document.getElementById('global-search');
    input.value = 'gpt';
    AppState.searchQuery = 'gpt';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(AppState.searchQuery).toBe('');
    expect(input.value).toBe('');
    expect(AppState.activeTab).toBe('leaderboard');
  });

  it('la saisie depuis une vue non searchable bascule vers Modèles', async () => {
    AppState.activeTab = 'methodology';
    const input = document.getElementById('global-search');
    input.value = 'gpt';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // debounce 200ms
    await new Promise((r) => setTimeout(r, 250));
    expect(AppState.activeTab).toBe('models');
  });
});
