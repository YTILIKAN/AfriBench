/* ═══════════════════════════════════════════════════════════
   AfriBench — Application Core (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

const renderIcon = globalThis.icon || (() => '');

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
      ['contribute', 'Participer'],
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
    desc: 'Scores, filtres et exports.',
  },
  models: {
    title: 'Modèles',
    desc: 'Scores et profils par modèle.',
  },
  compare: {
    title: 'Comparer',
    desc: 'Comparer les modèles sélectionnés.',
  },
  evolution: {
    title: 'Évolution',
    desc: 'Suivre les scores dans le temps.',
  },
  questions: {
    title: 'Questions',
    desc: 'Filtrer et consulter le corpus.',
  },
  open_tasks: {
    title: 'Tâches ouvertes',
    desc: 'Évaluations hors QCM.',
  },
  contribute: {
    title: 'Participer',
    desc: 'Proposer, examiner et voter.',
  },
  methodology: {
    title: 'Méthodologie',
    desc: 'Protocole, métriques et limites.',
  },
  api: {
    title: 'API',
    desc: 'Endpoints et exemples.',
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
  questionPage: 1,
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
  // Si l'instantané pré-généré arrive avant l'API, on affiche déjà quelque
  // chose au lieu d'attendre la réponse du réseau.
  await loadData({
    onEarlyPaint: () => {
      syncFilterState();
      renderActiveTab();
      updateHeroStats();
    },
  });
  setLoadingState(false);
  syncFilterState();
  renderActiveTab();
  updateHeroStats();
  // Deep link (?tab=X) : amener l'utilisateur directement à la vue demandée
  if (AppState._deepLinked) {
    const header = document.getElementById('view-header');
    if (header) header.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  window.addEventListener('popstate', () => {
    // applyUrlState() rend déjà via setActiveTab ; ne pas rendre une seconde fois.
    applyUrlState();
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
    if (icon) icon.classList.toggle('is-expanded', !expanded);
  });
}

/* ── URL state (?tab=&category=&difficulty=&page=) ───── */

/**
 * Lit les filtres de l'URL en n'acceptant que des valeurs connues.
 * `category` et `difficulty` sont interpolées dans du HTML par plusieurs vues :
 * une chaîne arbitraire venant de l'URL y serait une XSS réfléchie.
 */
function parseUrlFilters(search) {
  const params = new URLSearchParams(search);
  const category = params.get('category');
  const difficulty = params.get('difficulty');
  const page = Number.parseInt(params.get('page') || '1', 10);
  return {
    tab: params.get('tab'),
    category: categoryKeys().includes(category) ? category : null,
    difficulty: DIFFICULTY_KEYS.includes(difficulty) ? difficulty : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function applyUrlState() {
  const filters = parseUrlFilters(location.search);
  const requestedTab = filters.tab;
  const tab = requestedTab === 'categories' ? 'leaderboard' : requestedTab;
  AppState.urlCategory = filters.category;
  AppState.urlDifficulty = filters.difficulty;
  AppState.questionPage = filters.page;
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
  if (AppState.activeTab === 'questions' && AppState.questionPage > 1) {
    params.set('page', String(AppState.questionPage));
  } else {
    params.delete('page');
  }
  const qs = params.toString();
  const next = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) {
    history.replaceState(null, '', next);
  }
}

// Remplace les anciens attributs de gestionnaire en ligne, incompatibles avec
// la Content-Security-Policy stricte servie par nginx.
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-goto-tab]');
  if (target) setActiveTab(target.dataset.gotoTab);
});

/** Reporte l'état des filtres dans les vues concernées, sans déclencher de rendu. */
function syncFilterState() {
  if (AppState.activeTab === 'questions' && window.__setQuestionFilters) {
    window.__setQuestionFilters(
      AppState.urlCategory,
      AppState.urlDifficulty,
      AppState.questionPage,
    );
  }
}

/** Appelé par les contrôles de filtrage : synchronise puis rend une seule fois. */
function applyUrlFilters() {
  syncFilterState();
  renderActiveTab();
}

window.__setUrlCategory = (cat) => {
  AppState.urlCategory = cat && cat !== 'all' ? cat : null;
  syncUrlState();
};

window.__setUrlDifficulty = (diff) => {
  AppState.urlDifficulty = diff && diff !== 'all' ? diff : null;
  syncUrlState();
};

window.__setQuestionPage = (page) => {
  AppState.questionPage = Math.max(1, Number.parseInt(page, 10) || 1);
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
    const themeIcon = btn.querySelector('.theme-toggle__icon');
    if (label) label.textContent = dark ? 'Clair' : 'Sombre';
    if (themeIcon) themeIcon.innerHTML = renderIcon(dark ? 'Sun' : 'Moon');
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
    // Le repli doit désigner un élément qui existe : les boutons de la barre
    // latérale portent l'identifiant de l'espace (nav-overview, nav-analysis…),
    // jamais celui de la vue, donc `nav-${tabId}` ne référençait rien.
    const hasWorkspaceNav = Boolean(document.getElementById('workspace-nav'));
    panel.setAttribute(
      'aria-labelledby',
      hasWorkspaceNav ? `workspace-tab-${tabId}` : `nav-${workspaceForTab(tabId)}`,
    );
  }

  renderWorkspaceNavigation();
  renderWorkspaceFilters();

  // Close mobile drawer after navigation (si présent)
  if (typeof window.__closeMobileNav === 'function') {
    window.__closeMobileNav();
  }

  syncUrlState();
  // L'ordre compte : on reporte l'état des filtres avant de rendre, pour ne
  // rendre qu'une fois. L'inverse produisait deux rendus complets par
  // navigation sur le classement et sur les questions.
  syncFilterState();
  renderActiveTab();

  // Scroll vers l'en-tête de la vue courante
  if (!AppState._skipScroll) {
    var target = document.getElementById('view-header') || document.getElementById('tab-content');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Incrémenté à chaque rendu. Une vue asynchrone capture le jeton courant avant
// son `await` et abandonne s'il a changé : sinon, naviguer pendant un
// chargement laissait la vue précédente écraser la nouvelle.
let renderGeneration = 0;

function currentRenderToken() {
  return renderGeneration;
}

function isRenderStale(token) {
  return token !== renderGeneration;
}

function renderActiveTab() {
  const container = document.getElementById('tab-content');
  if (!container) return;
  renderGeneration += 1;

  // Changer de vue détache la modale de proposition : on libère le verrou de
  // défilement et l'écouteur Échap avant de remplacer le contenu.
  if (AppState.activeTab !== 'contribute') globalThis.__closeProposalModal?.();

  // Aucune source de données disponible : message d'erreur explicite
  if (!AppState.loading && AppState.dataSource === 'none'
      && AppState.activeTab !== 'methodology' && AppState.activeTab !== 'api') {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Données indisponibles</h3>
          <p>API et fichiers statiques inaccessibles.</p>
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
  if (typeof render === 'function') {
    const outcome = render(container);
    // Les vues remplacent leur innerHTML : les graphiques de la vue précédente
    // sont désormais détachés et doivent être détruits, sinon ils s'accumulent.
    if (outcome && typeof outcome.finally === 'function') {
      outcome.catch((err) => console.error('Échec du rendu de la vue', err))
        .finally(destroyDetachedCharts);
    } else {
      destroyDetachedCharts();
    }
  }
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
             placeholder="Rechercher…" autocomplete="off">
    </div>
    ${showModelType ? `
      <div class="workspace-filter">
        <label for="workspace-model-type">Type de modèle</label>
        <select id="workspace-model-type">
          <option value="all" ${AppState.modelType === 'all' ? 'selected' : ''}>Tous les modèles</option>
          <option value="open" ${AppState.modelType === 'open' ? 'selected' : ''}>Poids ouverts</option>
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
      AppState.questionPage = 1;
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
    if (AppState.activeTab === 'questions') AppState.questionPage = 1;
    syncUrlState();
    applyUrlFilters();
  });

  container.querySelector('#workspace-difficulty')?.addEventListener('change', (event) => {
    AppState.urlDifficulty = event.target.value === 'all' ? null : event.target.value;
    AppState.questionPage = 1;
    syncUrlState();
    applyUrlFilters();
  });

  container.querySelector('#workspace-reset')?.addEventListener('click', () => {
    AppState.searchQuery = '';
    AppState.modelType = 'all';
    AppState.urlCategory = null;
    AppState.urlDifficulty = null;
    AppState.questionPage = 1;
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
      AppState.questionPage = 1;
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
      AppState.questionPage = 1;
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
      AppState.questionPage = 1;
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

/** Délai au-delà duquel une requête de données est abandonnée. */
const LOAD_TIMEOUT_MS = 12000;

/**
 * Signal combinant un délai d'expiration et un signal d'annulation optionnel.
 * Sans expiration, une requête qui ne répond jamais laisse l'interface en
 * chargement indéfiniment — cas courant sur une connexion mobile instable.
 */
function loadSignal(signal) {
  const timeout = AbortSignal.timeout?.(LOAD_TIMEOUT_MS);
  if (!signal) return timeout;
  if (!timeout) return signal;
  return AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal;
}

async function fetchJson(url, signal) {
  const resp = await fetch(url, { signal: loadSignal(signal) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

function applyDataset({ results, questions, stats }) {
  if (Array.isArray(results)) AppState.results = results;
  if (Array.isArray(questions)) AppState.questions = questions;
  if (stats && typeof stats === 'object') AppState.stats = stats;
}

async function fetchApiBundle(apiBase) {
  const [results, questions, stats] = await Promise.all([
    fetchJson(`${apiBase}/results?limit=1000`),
    fetchJson(`${apiBase}/questions?limit=500`),
    fetchJson(`${apiBase}/stats`).catch(() => null),
  ]);
  return { results, questions, stats };
}

async function fetchStaticFallback(apiBase) {
  const [results, questions, stats] = await Promise.all([
    fetchJson('data/results.json').catch(() => null),
    fetchJson('data/questions.json').catch(() => null),
    fetchJson(`${apiBase}/stats`).catch(() => null),
  ]);
  return { results, questions, stats };
}

// Une seule campagne de chargement à la fois : le bouton « Réessayer » pouvait
// en déclencher plusieurs en parallèle, dont les réponses arrivaient dans le
// désordre et écrasaient les plus récentes.
let loadInFlight = null;

function loadData(options) {
  if (loadInFlight) return loadInFlight;
  loadInFlight = performLoad(options).finally(() => { loadInFlight = null; });
  return loadInFlight;
}

/**
 * Charge les données. `onEarlyPaint` est appelé si l'instantané pré-généré
 * arrive avant l'API, pour afficher quelque chose sans attendre.
 */
async function performLoad({ onEarlyPaint } = {}) {
  const apiBase = getApiBase();
  const bootstrapAbort = new AbortController();
  let apiDone = false;

  // Les deux partent ensemble : les enchaîner faisait payer la somme des deux
  // latences au lieu de la plus grande.
  const apiPromise = fetchApiBundle(apiBase);
  const bootstrapPromise = fetchJson('data/bootstrap.json', bootstrapAbort.signal)
    .catch(() => null);

  // L'API est la source autoritaire : dès qu'elle répond, l'instantané devient
  // inutile et son téléchargement est interrompu — il pèse ~280 Ko qui étaient
  // jusqu'ici téléchargés puis jetés à chaque visite.
  apiPromise.then(
    () => { apiDone = true; bootstrapAbort.abort(); },
    () => {},
  );

  const bootstrap = await bootstrapPromise;
  if (!apiDone && bootstrap) {
    applyDataset(bootstrap);
    if (AppState.results.length || AppState.questions.length) {
      AppState.dataSource = 'bootstrap';
      updateDataSourceBadge();
      onEarlyPaint?.();
    }
  }

  try {
    applyDataset(await apiPromise);
    AppState.dataSource = 'api';
  } catch (err) {
    if (AppState.dataSource !== 'bootstrap') {
      console.warn('API indisponible, repli sur les fichiers statiques', err);
      applyDataset(await fetchStaticFallback(apiBase));
      AppState.dataSource = 'static';
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
    api: ['API en direct', 'ok'],
    static: ['Données statiques', 'warn'],
    bootstrap: ['Aperçu pré-généré', 'warn'],
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
  // En navigation privée ou sous quota saturé, setItem lève. Sans garde,
  // l'exception remonte du gestionnaire de clic et laisse l'étoile incohérente.
  try {
    localStorage.setItem('afribench-favs', JSON.stringify([...AppState.favorites]));
  } catch { /* préférence non persistée : sans conséquence sur la session */ }
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
// Registre explicite des graphiques, indexé par identifiant de canvas.
// Chart.getChart(canvas) ne suffit pas : les vues remplacent leur innerHTML
// avant de remonter, donc le canvas est neuf et l'ancienne instance — avec ses
// données et son ResizeObserver — resterait vivante dans Chart.instances.
const chartRegistry = new Map();

function mountChart(canvas, config) {
  if (typeof Chart === 'undefined' || !canvas) return null;
  const key = canvas.id || null;
  if (key && chartRegistry.has(key)) {
    chartRegistry.get(key).destroy();
    chartRegistry.delete(key);
  }
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  const chart = new Chart(canvas, config);
  if (key) chartRegistry.set(key, chart);
  return chart;
}

/** Détruit les graphiques dont le canvas n'est plus dans le document. */
function destroyDetachedCharts() {
  chartRegistry.forEach((chart, key) => {
    if (!chart.canvas || !chart.canvas.isConnected) {
      chart.destroy();
      chartRegistry.delete(key);
    }
  });
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

/* Palette qualitative contrastée : chaque série garde une teinte distincte.
   Les tracés restent lisibles en clair, en sombre et pour la plupart des
   déficiences de perception des couleurs. */
const CHART_PALETTE = [
  { bg: 'rgba(231, 111, 0, 0.68)', border: 'rgba(231, 111, 0, 1)', dash: [] },
  { bg: 'rgba(37, 99, 235, 0.62)', border: 'rgba(37, 99, 235, 1)', dash: [7, 4] },
  { bg: 'rgba(5, 150, 105, 0.62)', border: 'rgba(5, 150, 105, 1)', dash: [2, 3] },
  { bg: 'rgba(147, 51, 234, 0.58)', border: 'rgba(147, 51, 234, 1)', dash: [10, 3, 2, 3] },
  { bg: 'rgba(220, 38, 38, 0.58)', border: 'rgba(220, 38, 38, 1)', dash: [5, 3] },
  { bg: 'rgba(8, 145, 178, 0.6)', border: 'rgba(8, 145, 178, 1)', dash: [1, 3] },
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
          <span class="dq-collapse-toggle__icon" aria-hidden="true">${renderIcon('ChevronDown')}</span>
        </button>
      </div>
      <div class="dq-content" id="dq-content" hidden>
        <div class="dq-header">
          <span class="dq-badge dq-badge--category">
            ${escapeHtml(categoryLabel(q.category))}
          </span>
          <span class="dq-badge dq-badge--muted">
            ${escapeHtml(difficultyLabel(q.difficulty))}
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
          <button class="dq-btn dq-btn-outline" data-goto-tab="questions">Voir le corpus</button>
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
      button.querySelector('.dq-collapse-toggle__icon').classList.toggle('is-expanded', !expanded);
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

const DIFFICULTY_KEYS = ['easy', 'medium', 'hard'];

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

function categoryLabel(cat) {
  return CATEGORY_MAP[cat] || cat;
}

function categoryKeys() {
  return Object.keys(CATEGORY_MAP);
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
  parseUrlFilters,
  setText,
  formatDate,
  toggleFavorite,
  isFavorite,
  getApiBase,
  fetchJson,
  loadData,
  setActiveTab,
  exportCSV,
  exportJSON,
  difficultyLabel,
  renderActiveTab,
  currentRenderToken,
  isRenderStale,
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
