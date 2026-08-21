/* ═══════════════════════════════════════════════════════════
   AfriBench — Application Core (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

/* ── Security ────────────────────────────────────────── */
function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#96;',
    '=': '&#61;'
  };
  return str.replace(/[&<>"'/`=]/g, function(m) { return map[m]; });
}

const VALID_TABS = [
  'leaderboard', 'models', 'compare',
  'evolution', 'questions', 'open_tasks', 'contribute', 'methodology', 'api',
];

const WORKSPACES = {
  overview: {
    label: 'Vue d’ensemble',
    tabs: [
      ['leaderboard', 'Classement'],
      ['models', 'Modèles'],
    ],
  },
  analysis: {
    label: 'Analyse',
    tabs: [
      ['compare', 'Comparer'],
      ['evolution', 'Évolution'],
    ],
  },
  data: {
    label: 'Données',
    tabs: [
      ['questions', 'Questions'],
      ['open_tasks', 'Tâches ouvertes'],
    ],
  },
  project: {
    label: 'Projet',
    tabs: [
      ['methodology', 'Méthodologie'],
      ['contribute', 'Contribuer'],
      ['api', 'API'],
    ],
  },
};

function workspaceForTab(tabId) {
  return Object.entries(WORKSPACES).find(([, workspace]) =>
    workspace.tabs.some(([id]) => id === tabId))?.[0] || 'overview';
}

/* Titre + description affichés dans l'en-tête de vue (et barre mobile) */
const VIEW_META = {
  leaderboard: {
    title: 'Classement',
    desc: 'Performance globale des modèles sur le benchmark (tri, filtres, exports).',
  },
  models: {
    title: 'Modèles',
    desc: 'Fiches détaillées par modèle : provider, radar par catégorie, actions.',
  },
  compare: {
    title: 'Comparer',
    desc: 'Comparaison côte à côte des modèles sélectionnés.',
  },
  evolution: {
    title: 'Évolution',
    desc: 'Progression des scores dans le temps, par modèle.',
  },
  questions: {
    title: 'Questions',
    desc: 'Parcourir les questions du benchmark (filtres par catégorie et difficulté).',
  },
  open_tasks: {
    title: 'Tâches ouvertes',
    desc: 'Pilotes non-QCM : traduction, résumé, QA ouverte, NER, sentiment.',
  },
  contribute: {
    title: 'Contribuer',
    desc: 'Proposez une question d\'évaluation — revue communautaire publique avant intégration.',
  },
  methodology: {
    title: 'Méthodologie',
    desc: 'Protocole d\'évaluation, métriques, reproductibilité et limites.',
  },
  api: {
    title: 'API',
    desc: 'Endpoints publics, paramètres et exemples d\'utilisation.',
  },
};

const AppState = {
  results: [],
  questions: [],
  stats: null,
  activeTab: 'leaderboard',
  searchQuery: '',
  filteredModels: [],
  comparePreset: null,
  favorites: new Set(loadFavorites()),
  openScores: null,
  dataSource: null, // 'api' | 'static' | 'bootstrap'
  loading: true,
  urlCategory: null,
  urlDifficulty: null,
  modelType: 'all',
  _skipUrlWrite: false,
  _skipScroll: false,
};

/* ── Initialization ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupMobileNav();
  setupTabs();
  setupDashboardIntro();
  setupSearch();
  setupRevealAnimations();
  applyUrlState();
  setLoadingState(true);
  await loadData();
  setLoadingState(false);
  renderActiveTab();
  updateHeroStats();
  applyUrlFilters();
  // Deep link (?tab=X) : amener l'utilisateur directement à la vue demandée
  if (AppState._deepLinked) {
    const header = document.getElementById('view-header');
    if (header) header.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  window.addEventListener('popstate', () => {
    applyUrlState();
    renderActiveTab();
    applyUrlFilters();
  });
});

/* ── Reveal on scroll (.reveal → .in) ────────────────── */
function setupRevealAnimations(root = document) {
  const els = root.querySelectorAll('.reveal:not(.in)');
  if (els.length === 0) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' });
  els.forEach((el) => observer.observe(el));
}

function setLoadingState(loading) {
  AppState.loading = loading;
  document.body.classList.toggle('is-loading', loading);
}

/* ── Mobile sidebar (hamburger) ───────────────────────── */
function setupMobileNav() {
  const toggle = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('sidebar-close');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!toggle) return;

  const open = () => {
    document.body.classList.add('sidebar-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fermer le menu');
    if (backdrop) backdrop.hidden = false;
  };

  const close = () => {
    document.body.classList.remove('sidebar-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    if (backdrop) backdrop.hidden = true;
  };

  const toggleMenu = () => {
    if (document.body.classList.contains('sidebar-open')) close();
    else open();
  };

  window.__closeMobileNav = close;

  toggle.addEventListener('click', toggleMenu);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      close();
      toggle.focus();
    }
  });

  // Close when leaving mobile breakpoint
  const mq = window.matchMedia('(max-width: 768px)');
  const onBreakpoint = (e) => {
    if (!e.matches) close();
  };
  if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
  else if (mq.addListener) mq.addListener(onBreakpoint);
}

/* ── Bandeau d'introduction compact ───────────────────── */
function setupDashboardIntro() {
  const toggle = document.getElementById('page-header-toggle');
  const details = document.getElementById('page-header-details');
  if (!toggle || !details) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
    const label = toggle.querySelector('span:first-child');
    const icon = toggle.querySelector('.page-header__toggle-icon');
    if (label) label.textContent = expanded ? 'Détails' : 'Réduire';
    if (icon) icon.textContent = expanded ? '+' : '−';
  });
}

/* ── URL state (?tab=&category=&difficulty=) ─────────── */
function applyUrlState() {
  const params = new URLSearchParams(location.search);
  const requestedTab = params.get('tab');
  const tab = requestedTab === 'categories' ? 'leaderboard' : requestedTab;
  AppState.urlCategory = params.get('category');
  AppState.urlDifficulty = params.get('difficulty');
  // Deep link explicite (?tab=…) : on scrollera vers la vue après le chargement
  AppState._deepLinked = Boolean(requestedTab);
  AppState._skipUrlWrite = true;
  AppState._skipScroll = true;
  setActiveTab(VALID_TABS.includes(tab) ? tab : 'leaderboard');
  AppState._skipUrlWrite = false;
  AppState._skipScroll = false;
  if (requestedTab === 'categories') syncUrlState();
}

function syncUrlState() {
  if (AppState._skipUrlWrite) return;
  const params = new URLSearchParams(location.search);
  params.set('tab', AppState.activeTab);
  if (AppState.urlCategory) params.set('category', AppState.urlCategory);
  else params.delete('category');
  if (AppState.urlDifficulty) params.set('difficulty', AppState.urlDifficulty);
  else params.delete('difficulty');
  const qs = params.toString();
  const next = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) {
    history.replaceState(null, '', next);
  }
}

function applyUrlFilters() {
  if (AppState.activeTab === 'leaderboard') {
    renderActiveTab();
  }
  if (AppState.activeTab === 'questions' && window.__applyQuestionFilters) {
    window.__applyQuestionFilters(AppState.urlCategory, AppState.urlDifficulty);
  }
}

window.__setUrlCategory = (cat) => {
  AppState.urlCategory = cat && cat !== 'all' ? cat : null;
  syncUrlState();
};

window.__setUrlDifficulty = (diff) => {
  AppState.urlDifficulty = diff && diff !== 'all' ? diff : null;
  syncUrlState();
};

/* ── Theme (clair par défaut, sombre via data-theme) ───── */
function applyTheme(theme) {
  const dark = theme === 'dark';
  if (dark) document.body.setAttribute('data-theme', 'dark');
  else document.body.removeAttribute('data-theme');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    const label = btn.querySelector('.theme-toggle__label');
    if (label) label.textContent = dark ? 'Clair' : 'Sombre';
  }
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color = chartTheme().tick;
  }
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('afribench-theme'); } catch { /* mode privé */ }
  const prefersDark = window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || (saved === null && prefersDark) ? 'dark' : 'light');

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('afribench-theme', next); } catch { /* ignore */ }
      // Redessiner les graphiques avec les couleurs du nouveau thème
      renderActiveTab();
    });
  }
}

/* ── Navigation (sidebar = tablist vertical) ──────────── */
function setupTabs() {
  const navButtons = [...document.querySelectorAll('.sidebar-tablist [data-sidebar]')];

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.tab);
      btn.focus();
    });
  });

  // Navigation clavier ARIA (↑/↓/Home/End) dans la tablist verticale
  const tablist = document.querySelector('.sidebar-tablist[role="tablist"]');
  if (tablist) {
    tablist.addEventListener('keydown', (e) => {
      const current = document.activeElement;
      const idx = navButtons.indexOf(current);
      if (idx === -1) return;
      let nextIdx = null;
      if (e.key === 'ArrowDown') nextIdx = (idx + 1) % navButtons.length;
      else if (e.key === 'ArrowUp') nextIdx = (idx - 1 + navButtons.length) % navButtons.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = navButtons.length - 1;
      if (nextIdx !== null) {
        e.preventDefault();
        const next = navButtons[nextIdx];
        setActiveTab(next.dataset.tab);
        next.focus();
      }
    });
  }

  // Raccourcis globaux : Ctrl+K / Cmd+K → recherche
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const input = document.getElementById('global-search');
      if (input) input.focus();
    }
  });
}

function setActiveTab(tabId) {
  if (!VALID_TABS.includes(tabId)) tabId = 'leaderboard';
  AppState.activeTab = tabId;
  const activeWorkspace = workspaceForTab(tabId);

  // Sidebar : quatre espaces stables, chacun ouvre sa vue principale.
  document.querySelectorAll('.sidebar-tablist [data-sidebar]').forEach((b) => {
    const isActive = b.dataset.workspace
      ? b.dataset.workspace === activeWorkspace
      : b.dataset.tab === tabId;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    b.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  // En-tête de vue + barre mobile + aria-labelledby du panel
  const meta = VIEW_META[tabId];
  if (meta) {
    setText('view-title', meta.title);
    setText('view-desc', meta.desc);
    setText('mobile-view-title', meta.title);
    document.title = `AfriBench — ${meta.title}`;
  }
  const panel = document.getElementById('tab-content');
  if (panel) {
    const hasWorkspaceNav = Boolean(document.getElementById('workspace-nav'));
    panel.setAttribute('aria-labelledby', hasWorkspaceNav ? `workspace-tab-${tabId}` : `nav-${tabId}`);
  }

  renderWorkspaceNavigation();
  renderWorkspaceFilters();

  // Close mobile drawer after navigation (si présent)
  if (typeof window.__closeMobileNav === 'function') {
    window.__closeMobileNav();
  }

  syncUrlState();
  renderActiveTab();
  applyUrlFilters();

  // Scroll vers l'en-tête de la vue courante
  if (!AppState._skipScroll) {
    var target = document.getElementById('view-header') || document.getElementById('tab-content');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function renderActiveTab() {
  const container = document.getElementById('tab-content');
  if (!container) return;

  // Aucune source de données disponible : message d'erreur explicite
  if (!AppState.loading && AppState.dataSource === 'none'
      && AppState.activeTab !== 'methodology' && AppState.activeTab !== 'api') {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Données indisponibles</h3>
          <p>L'API et les fichiers statiques sont injoignables. Vérifiez votre connexion
          ou lancez le backend (<code>docker compose up --build</code>).</p>
          <p><button class="filter-btn" id="retry-load">Réessayer</button></p>
        </div>
      </div>
    `;
    document.getElementById('retry-load')?.addEventListener('click', async () => {
      setLoadingState(true);
      await loadData();
      setLoadingState(false);
      renderActiveTab();
      updateHeroStats();
    });
    return;
  }

  const tabs = {
    leaderboard: globalThis.renderLeaderboard,
    models: globalThis.renderModels,
    compare: globalThis.renderCompare,
    evolution: globalThis.renderEvolution,
    questions: globalThis.renderQuestions,
    open_tasks: globalThis.renderOpenTasks,
    contribute: globalThis.renderContribute,
    methodology: globalThis.renderMethodology,
    api: globalThis.renderAPI,
  };
  const render = tabs[AppState.activeTab];
  if (typeof render === 'function') render(container);
}

/* ── Navigation secondaire + filtres persistants ─────── */
function renderWorkspaceNavigation() {
  const container = document.getElementById('workspace-nav');
  if (!container) return;
  const workspace = WORKSPACES[workspaceForTab(AppState.activeTab)];

  container.innerHTML = `
    <span class="workspace-nav__label">${workspace.label}</span>
    <div class="workspace-nav__tabs" role="tablist" aria-label="${workspace.label}">
      ${workspace.tabs.map(([id, label]) => `
        <button type="button" role="tab" id="workspace-tab-${id}"
                class="workspace-nav__tab ${id === AppState.activeTab ? 'active' : ''}"
                aria-selected="${id === AppState.activeTab}" data-workspace-tab="${id}">
          ${label}
        </button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('[data-workspace-tab]').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.workspaceTab));
  });
}

function renderWorkspaceFilters() {
  const container = document.getElementById('workspace-filters');
  if (!container) return;
  const workspace = workspaceForTab(AppState.activeTab);
  const showModelType = workspace === 'overview';
  const showCategory = AppState.activeTab === 'leaderboard' || AppState.activeTab === 'questions';
  const showDifficulty = AppState.activeTab === 'questions';

  container.innerHTML = `
    <div class="workspace-filter workspace-filter--search">
      <label for="workspace-search">Recherche</label>
      <input type="search" id="workspace-search" value="${escapeHtml(AppState.searchQuery)}"
             placeholder="Modèle, question, mot-clé…" autocomplete="off">
    </div>
    ${showModelType ? `
      <div class="workspace-filter">
        <label for="workspace-model-type">Type de modèle</label>
        <select id="workspace-model-type">
          <option value="all" ${AppState.modelType === 'all' ? 'selected' : ''}>Tous les modèles</option>
          <option value="open" ${AppState.modelType === 'open' ? 'selected' : ''}>Open weights</option>
          <option value="closed" ${AppState.modelType === 'closed' ? 'selected' : ''}>Propriétaires</option>
          <option value="favs" ${AppState.modelType === 'favs' ? 'selected' : ''}>Favoris</option>
        </select>
      </div>
    ` : ''}
    ${showCategory ? `
      <div class="workspace-filter">
        <label for="workspace-category">Catégorie</label>
        <select id="workspace-category">
          <option value="all">Toutes</option>
          ${categoryKeys().map((key) => `
            <option value="${key}" ${AppState.urlCategory === key ? 'selected' : ''}>${categoryLabel(key)}</option>
          `).join('')}
        </select>
      </div>
    ` : ''}
    ${showDifficulty ? `
      <div class="workspace-filter">
        <label for="workspace-difficulty">Difficulté</label>
        <select id="workspace-difficulty">
          <option value="all">Toutes</option>
          ${['easy', 'medium', 'hard'].map((key) => `
            <option value="${key}" ${AppState.urlDifficulty === key ? 'selected' : ''}>${difficultyLabel(key)}</option>
          `).join('')}
        </select>
      </div>
    ` : ''}
    <button type="button" class="workspace-filters__reset" id="workspace-reset"
            title="Réinitialiser tous les filtres">Réinitialiser</button>
  `;

  const search = container.querySelector('#workspace-search');
  let searchTimer;
  search?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      AppState.searchQuery = search.value.trim().toLowerCase();
      const sidebarSearch = document.getElementById('global-search');
      if (sidebarSearch) sidebarSearch.value = search.value;
      if (AppState.searchQuery && !SEARCHABLE_TABS.includes(AppState.activeTab)) {
        setActiveTab('models');
      } else {
        renderActiveTab();
      }
    }, 150);
  });

  container.querySelector('#workspace-model-type')?.addEventListener('change', (event) => {
    AppState.modelType = event.target.value;
    renderActiveTab();
  });

  container.querySelector('#workspace-category')?.addEventListener('change', (event) => {
    AppState.urlCategory = event.target.value === 'all' ? null : event.target.value;
    syncUrlState();
    applyUrlFilters();
  });

  container.querySelector('#workspace-difficulty')?.addEventListener('change', (event) => {
    AppState.urlDifficulty = event.target.value === 'all' ? null : event.target.value;
    syncUrlState();
    applyUrlFilters();
  });

  container.querySelector('#workspace-reset')?.addEventListener('click', () => {
    AppState.searchQuery = '';
    AppState.modelType = 'all';
    AppState.urlCategory = null;
    AppState.urlDifficulty = null;
    const sidebarSearch = document.getElementById('global-search');
    if (sidebarSearch) sidebarSearch.value = '';
    syncUrlState();
    renderWorkspaceFilters();
    renderActiveTab();
    applyUrlFilters();
  });
}


/* ── Search ──────────────────────────────────────────── */
const SEARCHABLE_TABS = ['leaderboard', 'models', 'questions'];

function setupSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      AppState.searchQuery = input.value.trim().toLowerCase();
      const workspaceSearch = document.getElementById('workspace-search');
      if (workspaceSearch) workspaceSearch.value = input.value;
      // Si l'onglet courant ne supporte pas la recherche, basculer sur Modèles
      if (AppState.searchQuery && !SEARCHABLE_TABS.includes(AppState.activeTab)) {
        setActiveTab('models');
        return;
      }
      if (SEARCHABLE_TABS.includes(AppState.activeTab)) {
        renderActiveTab();
      }
    }, 200);
  });

  // La croix native d'input[type=search] déclenche 'search' quand vidé
  input.addEventListener('search', () => {
    if (input.value === '') {
      AppState.searchQuery = '';
      const workspaceSearch = document.getElementById('workspace-search');
      if (workspaceSearch) workspaceSearch.value = '';
      if (SEARCHABLE_TABS.includes(AppState.activeTab)) renderActiveTab();
    }
  });

  // Escape efface la recherche et rend le focus
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value !== '') {
      input.value = '';
      AppState.searchQuery = '';
      const workspaceSearch = document.getElementById('workspace-search');
      if (workspaceSearch) workspaceSearch.value = '';
      if (SEARCHABLE_TABS.includes(AppState.activeTab)) renderActiveTab();
      input.blur();
    }
  });
}

function applySearchFilter(models) {
  if (!AppState.searchQuery) return models;
  const q = AppState.searchQuery;
  return models.filter((m) => {
    const label = (m.model_label || m.model || '').toLowerCase();
    return label.includes(q);
  });
}

/* ── API / Data Loading ──────────────────────────────── */
function getApiBase() {
  if (typeof window !== 'undefined' && window.AFRIBENCH_API_BASE) {
    return String(window.AFRIBENCH_API_BASE).replace(/\/$/, '');
  }
  // Dev static server (python -m http.server 8000) → backend :8080
  if (location.port === '8000') {
    return 'http://127.0.0.1:8080/api/v1';
  }
  const meta = document.querySelector('meta[name="afribench-api"]');
  if (meta && meta.content) {
    return meta.content.replace(/\/$/, '');
  }
  // Docker nginx / same-origin proxy
  return '/api/v1';
}

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

async function loadBootstrap() {
  try {
    const data = await fetchJson('data/bootstrap.json');
    if (data && Array.isArray(data.results)) AppState.results = data.results;
    if (data && Array.isArray(data.questions)) AppState.questions = data.questions;
    if (data && data.stats && typeof data.stats === 'object') AppState.stats = data.stats;
    if (AppState.results.length || AppState.questions.length) {
      AppState.dataSource = 'bootstrap';
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

async function loadData() {
  const apiBase = getApiBase();

  // 1) Bootstrap pré-généré (SEO / premier paint)
  await loadBootstrap();

  // 2) API live (écrase le bootstrap si dispo)
  try {
    const [results, questions, stats] = await Promise.all([
      fetchJson(`${apiBase}/results?limit=1000`),
      fetchJson(`${apiBase}/questions?limit=500`),
      fetchJson(`${apiBase}/stats`).catch(() => null),
    ]);
    AppState.results = Array.isArray(results) ? results : AppState.results;
    AppState.questions = Array.isArray(questions) ? questions : AppState.questions;
    if (stats && typeof stats === 'object') AppState.stats = stats;
    AppState.dataSource = 'api';
  } catch (err) {
    if (AppState.dataSource !== 'bootstrap') {
      console.warn('API unavailable, falling back to static JSON', err);
      AppState.dataSource = 'static';
      try {
        const resp = await fetch('data/results.json');
        if (resp.ok) AppState.results = await resp.json();
      } catch { /* ignore */ }
      try {
        const resp = await fetch('data/questions.json');
        if (resp.ok) AppState.questions = await resp.json();
      } catch { /* ignore */ }
      try {
        const resp = await fetch(`${apiBase}/stats`);
        if (resp.ok) AppState.stats = await resp.json();
      } catch { /* ignore */ }
    }
  }

  if (AppState.results.length === 0 && AppState.questions.length === 0) {
    AppState.dataSource = 'none';
  }

  updateDataSourceBadge();
  renderDailyQuestion();
}

/* ── Badge source de données (sidebar footer) ────────── */
function updateDataSourceBadge() {
  const badge = document.getElementById('data-source-badge');
  if (!badge) return;
  const map = {
    api: ['Données : API live', 'ok'],
    static: ['Données : statiques (API injoignable)', 'warn'],
    bootstrap: ['Données : aperçu pré-généré', 'warn'],
    none: ['Données indisponibles', 'err'],
  };
  const entry = map[AppState.dataSource];
  if (!entry) {
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  badge.textContent = entry[0];
  badge.dataset.state = entry[1];
}

/* ── Hero Stats ──────────────────────────────────────── */
function updateHeroStats() {
  const stats = AppState.stats;
  const models = getUniqueModels();
  const cats = new Set();
  AppState.questions.forEach((q) => cats.add(q.category));

  setText('hero-model-count', stats?.total_models ?? models.length);
  setText('hero-q-count', stats?.total_questions ?? AppState.questions.length);
  setText('hero-cat-count', stats?.categories ?? cats.size);

  const lastUpdated = stats?.last_updated;
  const formatted = lastUpdated ? formatDate(lastUpdated) : '—';
  setText('hero-date', formatted);
}

/* ── Utilities ────────────────────────────────────────── */

/* ── Favorites ──────────────────────────────────────── */
function loadFavorites() {
  try {
    const saved = localStorage.getItem('afribench-favs');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveFavorites() {
  localStorage.setItem('afribench-favs', JSON.stringify([...AppState.favorites]));
}

function toggleFavorite(name) {
  if (AppState.favorites.has(name)) {
    AppState.favorites.delete(name);
  } else {
    AppState.favorites.add(name);
  }
  saveFavorites();
  // Re-render current tab to update star
  const active = AppState.activeTab;
  if (active === 'leaderboard' || active === 'models') {
    renderActiveTab();
  }
}

function isFavorite(name) {
  return AppState.favorites.has(name);
}

/* ── Chart.js helpers (registry anti-fuite + thème) ──── */
function mountChart(canvas, config) {
  if (typeof Chart === 'undefined' || !canvas) return null;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  return new Chart(canvas, config);
}

function chartTheme() {
  const styles = getComputedStyle(document.body);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  return {
    tick: read('--chart-tick', '#5B5854'),
    grid: read('--chart-grid', 'rgba(43,43,43,0.12)'),
    label: read('--chart-label', '#2B2B2B'),
  };
}

/* Palette duotone discrète (orange + gris chauds), lisible en clair et sombre */
const CHART_PALETTE = [
  { bg: 'rgba(255, 167, 38, 0.75)', border: 'rgba(240, 138, 0, 1)' },
  { bg: 'rgba(91, 88, 84, 0.55)', border: 'rgba(91, 88, 84, 0.9)' },
  { bg: 'rgba(249, 160, 63, 0.45)', border: 'rgba(249, 160, 63, 0.85)' },
  { bg: 'rgba(163, 158, 150, 0.5)', border: 'rgba(163, 158, 150, 0.9)' },
  { bg: 'rgba(196, 127, 23, 0.6)', border: 'rgba(196, 127, 23, 1)' },
  { bg: 'rgba(210, 204, 196, 0.55)', border: 'rgba(181, 175, 168, 0.95)' },
];

function chartSeriesColor(i) {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}

/* ── Compute helpers (shared with leaderboard & models) ─ */
function computeBestCategory(m) {
  const cats = m.by_category;
  if (!cats) return null;
  return Object.entries(cats).reduce((best, [k, v]) =>
    v.accuracy > (best?.accuracy || -1) ? { key: k, accuracy: v.accuracy } : best, null);
}

function computeStdDev(m) {
  const cats = m.by_category;
  if (!cats) return null;
  const scores = Object.values(cats).map(v => v.accuracy);
  if (scores.length < 2) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

/* ── Export CSV ─────────────────────────────────────── */
function exportCSV() {
  const models = getLatestResults();
  let csv = 'Rang,Modele,Score,Questions,Facile,Moyen,Difficile,Meilleure Categorie,Ecart-type,Provider\n';
  models.forEach((m, i) => {
    const d = m.by_difficulty || {};
    const best = computeBestCategory(m);
    const std = computeStdDev(m);
    const open = isOpenModel(m);
    csv += `${i + 1},"${m.model_label || m.model}",${m.accuracy},${m.correct}/${m.total},${d.easy?.accuracy || ''},${d.medium?.accuracy || ''},${d.hard?.accuracy || ''},"${best ? categoryLabel(best.key) : ''}",${std !== null ? std.toFixed(1) : ''},${open ? 'open' : 'proprietaire'}\n`;
  });
  downloadFile(csv, 'afribench-scores.csv', 'text/csv');
}

/* ── Export JSON ────────────────────────────────────── */
function exportJSON() {
  const models = getLatestResults();
  const data = models.map((m, i) => {
    const d = m.by_difficulty || {};
    const best = computeBestCategory(m);
    return {
      rank: i + 1,
      model: m.model_label || m.model,
      score: m.accuracy,
      correct: m.correct,
      total: m.total,
      difficulty: {
        easy: d.easy?.accuracy || null,
        medium: d.medium?.accuracy || null,
        hard: d.hard?.accuracy || null,
      },
      best_category: best ? { key: best.key, label: categoryLabel(best.key), score: best.accuracy } : null,
      std_dev: computeStdDev(m),
      open_weights: isOpenModel(m),
      last_evaluated: m.timestamp || null,
    };
  });
  downloadFile(JSON.stringify(data, null, 2), 'afribench-scores.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Question du jour ────────────────────────────────── */
function renderDailyQuestion() {
  const container = document.getElementById('daily-question');
  if (!container || AppState.questions.length === 0) return;

  // Seed-based daily so it changes once per day
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  const idx = seed % AppState.questions.length;
  const q = AppState.questions[idx];

  const catColor = categoryColor(q.category);

  container.innerHTML = `
    <div class="dq-card dq-card--collapsed">
      <div class="dq-summary">
        <div class="dq-summary__content">
          <span class="dq-title">Question du jour</span>
          <span class="dq-summary__question">${escapeHtml(q.question || '')}</span>
        </div>
        <button type="button" class="dq-collapse-toggle" id="dq-collapse-toggle"
                aria-expanded="false" aria-controls="dq-content">
          <span>Afficher</span>
          <span class="dq-collapse-toggle__icon" aria-hidden="true">+</span>
        </button>
      </div>
      <div class="dq-content" id="dq-content" hidden>
        <div class="dq-header">
          <span class="dq-badge" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}44">
            ${categoryLabel(q.category)}
          </span>
          <span class="dq-badge dq-badge--muted">
            ${difficultyLabel(q.difficulty)}
          </span>
        </div>
        <div class="dq-question">${escapeHtml(q.question || '')}</div>
        <div class="dq-options">
          ${Object.entries(q.options || {}).map(([letter, text]) =>
            `<div class="dq-option"><span class="dq-letter">${escapeHtml(letter)}</span> ${escapeHtml(text)}</div>`
          ).join('')}
        </div>
        <div class="dq-reveal" id="dq-reveal" style="display:none">
          <div class="dq-answer">
            Réponse : <strong>${escapeHtml(q.answer || '')}</strong>
            ${q.explanation ? `<span class="dq-exp">— ${escapeHtml(q.explanation)}</span>` : ''}
          </div>
        </div>
        <div class="dq-actions">
          <button class="dq-btn" id="dq-show-answer">Voir la réponse</button>
          <button class="dq-btn dq-btn-outline" onclick="setActiveTab('questions')">Toutes les questions</button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    document.getElementById('dq-collapse-toggle')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      const content = document.getElementById('dq-content');
      const card = button.closest('.dq-card');
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.querySelector('span:first-child').textContent = expanded ? 'Afficher' : 'Réduire';
      button.querySelector('.dq-collapse-toggle__icon').textContent = expanded ? '+' : '−';
      content.hidden = expanded;
      card.classList.toggle('dq-card--collapsed', expanded);
    });
    document.getElementById('dq-show-answer')?.addEventListener('click', () => {
      document.getElementById('dq-reveal').style.display = 'block';
      document.getElementById('dq-show-answer').style.display = 'none';
    });
  }, 0);
}

function getUniqueModels() {
  const seen = new Set();
  return AppState.results.filter((r) => {
    const name = r.model || r.model_label;
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function getLatestResults() {
  const latest = {};
  for (const r of AppState.results) {
    const name = r.model || r.model_label;
    if (!latest[name] || r.timestamp > latest[name].timestamp) {
      latest[name] = r;
    }
  }
  return Object.values(latest).sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
}

function isOpenModel(m) {
  const openModels = ['llama', 'qwen', 'mistral', 'gemma', 'deepseek', 'olmo', 'phi', 'bloom'];
  const name = (m.model || m.model_label || '').toLowerCase();
  return openModels.some((k) => name.includes(k));
}

function difficultyLabel(d) {
  const map = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
  return map[d] || d;
}

const CATEGORY_MAP = {
  histoire: 'Histoire',
  geographie: 'Géographie',
  droit_politique: 'Droit et Politique',
  sante_sciences: 'Santé et Sciences',
  langue_culture: 'Langue et Culture',
  economie: 'Économie',
  ia_technologie: 'IA et Technologie',
  societe: 'Société',
  raisonnement_culturel: 'Raisonnement Culturel',
};

const CATEGORY_COLORS = {
  histoire: '#C4A46A',
  geographie: '#4A90D9',
  droit_politique: '#E57373',
  sante_sciences: '#81C784',
  langue_culture: '#FFB74D',
  economie: '#9575CD',
  ia_technologie: '#4DB6AC',
  societe: '#F06292',
  raisonnement_culturel: '#A1887F',
};

function categoryLabel(cat) {
  return CATEGORY_MAP[cat] || cat;
}

function categoryKeys() {
  return Object.keys(CATEGORY_MAP);
}

function categoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#C4A46A';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatDate(ts) {
  const raw = String(ts).slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

Object.assign(globalThis, {
  AppState,
  escapeHtml,
  VALID_TABS,
  VIEW_META,
  WORKSPACES,
  getUniqueModels,
  getLatestResults,
  isOpenModel,
  applySearchFilter,
  computeBestCategory,
  computeStdDev,
  categoryLabel,
  categoryKeys,
  categoryColor,
  setText,
  formatDate,
  toggleFavorite,
  isFavorite,
  getApiBase,
  fetchJson,
  setActiveTab,
  exportCSV,
  exportJSON,
  difficultyLabel,
  renderActiveTab,
  renderWorkspaceFilters,
  mountChart,
  chartTheme,
  chartSeriesColor,
  setupRevealAnimations,
  setupSearch,
  setupTabs,
  setupDashboardIntro,
  renderDailyQuestion,
});

export {};
