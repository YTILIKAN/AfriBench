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

const AppState = {
  results: [],
  questions: [],
  activeTab: 'leaderboard',
  searchQuery: '',
  filteredModels: [],
  comparePreset: null,
  favorites: new Set(loadFavorites()),
};

/* ── Initialization ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupTabs();
  setupSearch();
  await loadData();
  renderActiveTab();
  renderTopModels();
  updateHeroStats();
});

/* ── Theme ─────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('afribench-theme');
  if (saved === 'light') {
    document.body.setAttribute('data-theme', 'light');
  }
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const isLight = document.body.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('afribench-theme', 'dark');
      } else {
        document.body.setAttribute('data-theme', 'light');
        localStorage.setItem('afribench-theme', 'light');
      }
    });
  }
}

/* ── Tabs ─────────────────────────────────────────────── */
function setupTabs() {
  // Top tab bar
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.tab);
    });
  });

  // Sidebar buttons
  document.querySelectorAll('[data-sidebar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.tab);
    });
  });

  // Footer quick links
  document.querySelectorAll('[data-quicktab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.quicktab;
      setActiveTab(tab);
      // If it also has a category filter, pass to categories view
      if (link.dataset.filter && window.__categoryFilter) {
        setTimeout(() => window.__categoryFilter(link.dataset.filter), 100);
      }
    });
  });
}

function setActiveTab(tabId) {
  AppState.activeTab = tabId;

  // Update tab bar
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tabId);
    b.setAttribute('aria-selected', b.dataset.tab === tabId ? 'true' : 'false');
  });

  // Update sidebar
  document.querySelectorAll('[data-sidebar]').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });

  renderActiveTab();
}

function renderActiveTab() {
  const container = document.getElementById('tab-content');
  switch (AppState.activeTab) {
    case 'leaderboard': renderLeaderboard(container); break;
    case 'models': renderModels(container); break;
    case 'categories': renderCategories(container); break;
    case 'compare': renderCompare(container); break;
    case 'evolution': renderEvolution(container); break;
    case 'questions': renderQuestions(container); break;
    case 'methodology': renderMethodology(container); break;
    case 'api': renderAPI(container); break;
  }
}

/* ── Sidebar Categories ──────────────────────────────── */
function renderSidebarCategories() {
  const sidebar = document.getElementById('sidebar-categories');
  const catCounts = {};
  AppState.questions.forEach((q) => {
    const cat = q.category;
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  let html = '';
  categoryKeys().forEach((key) => {
    const count = catCounts[key] || 0;
    const active = AppState.activeTab === 'categories' ? '' : '';
    html += `
      <button class="sidebar-btn ${active}" data-sidebar data-tab="categories" data-filter-cat="${key}">
        <span class="sidebar-cat-dot" style="color:${categoryColor(key)}"></span>
        ${categoryLabel(key)}
        <span class="count">${count}</span>
      </button>
    `;
  });
  sidebar.innerHTML = html;

  // Wire up category filter clicks in sidebar
  sidebar.querySelectorAll('[data-filter-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab('categories');
      // Signal categories view to filter
      if (window.__categoryFilter) window.__categoryFilter(btn.dataset.filterCat);
    });
  });
}

/* ── Search ──────────────────────────────────────────── */
function setupSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      AppState.searchQuery = input.value.trim().toLowerCase();
      // Re-render current tab with filter
      if (AppState.activeTab === 'leaderboard' || AppState.activeTab === 'models' || AppState.activeTab === 'questions') {
        renderActiveTab();
      }
    }, 200);
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

/* ── Data Loading ────────────────────────────────────── */
async function loadData() {
  const resultsContainer = document.getElementById('hdr-models');
  try {
    const resp = await fetch('data/results.json');
    if (resp.ok) {
      AppState.results = await resp.json();
      if (resultsContainer) resultsContainer.textContent = getUniqueModels().length;
    }
  } catch {
    if (resultsContainer) resultsContainer.textContent = '0';
  }

  const qContainer = document.getElementById('hdr-questions');
  try {
    const resp = await fetch('data/questions.json');
    if (resp.ok) {
      AppState.questions = await resp.json();
      if (qContainer) qContainer.textContent = AppState.questions.length;
    }
  } catch {
    if (qContainer) qContainer.textContent = '0';
  }

  renderSidebarCategories();
  renderDailyQuestion();
}

/* ── Hero Stats ──────────────────────────────────────── */
function updateHeroStats() {
  const models = getUniqueModels();
  setText('hero-model-count', models.length);
  setText('hero-q-count', AppState.questions.length);

  const cats = new Set();
  AppState.questions.forEach((q) => cats.add(q.category));
  setText('hero-cat-count', cats.size);

  // Last update date from results timestamps
  const timestamps = AppState.results
    .map((r) => r.timestamp)
    .filter(Boolean)
    .sort()
    .reverse();

  if (timestamps.length > 0) {
    const d = new Date(timestamps[0]);
    const formatted = d.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    setText('hero-date', formatted);
    setText('hdr-date', formatted);
    document.getElementById('hdr-last-update').style.display = 'flex';
  }
}

/* ── Top Models Row ──────────────────────────────────── */
function renderTopModels() {
  const container = document.getElementById('top-models-row');
  if (!container) return;

  const models = getLatestResults();
  if (models.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'grid';

  const highlights = [
    { label: 'Leader', getter: () => models[0] },
    { label: 'Open Weights', getter: () => models.find((m) => isOpenModel(m)) },
  ];

  // Top by category (pick the category with highest variance)
  const catScores = {};
  models.forEach((m) => {
    if (m.by_category) {
      Object.entries(m.by_category).forEach(([cat, info]) => {
        if (!catScores[cat]) catScores[cat] = [];
        catScores[cat].push(info.accuracy);
      });
    }
  });

  // Best category (highest average score)
  let bestCat = null;
  let bestAvg = 0;
  Object.entries(catScores).forEach(([cat, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestAvg) { bestAvg = avg; bestCat = cat; }
  });

  // Card: Best overall
  const top = models[0];
  let html = `
    <div class="top-model-card">
      <div class="label">Leader</div>
      <div class="model-name">${top.model_label || top.model}</div>
      <div class="score">${top.accuracy}%</div>
      <div class="sub">${top.correct}/${top.total} questions</div>
    </div>
  `;

  // Card: Best by category
  if (bestCat) {
    const bestInCat = models.reduce((best, m) => {
      const score = m.by_category?.[bestCat]?.accuracy || 0;
      return score > (best.score || 0) ? { model: m, score } : best;
    }, {});
    if (bestInCat.model) {
      html += `
        <div class="top-model-card">
          <div class="label">Meilleur ${categoryLabel(bestCat)}</div>
          <div class="model-name">${bestInCat.model.model_label || bestInCat.model.model}</div>
          <div class="score">${bestInCat.score.toFixed(1)}%</div>
          <div class="sub">${categoryLabel(bestCat)}</div>
        </div>
      `;
    }
  }

  // Card: Open weights leader
  const open = models.find((m) => isOpenModel(m));
  if (open) {
    html += `
      <div class="top-model-card">
        <div class="label">Open Weights</div>
        <div class="model-name">${open.model_label || open.model}</div>
        <div class="score">${open.accuracy}%</div>
        <div class="sub">open-source</div>
      </div>
    `;
  }

  // Card: Best value (if we have meaningful comparison)
  if (models.length >= 3) {
    const cheapest = models[models.length - 1]; // lowest for now
    html += `
      <div class="top-model-card">
        <div class="label">Meilleur ratio</div>
        <div class="model-name">${cheapest.model_label || cheapest.model}</div>
        <div class="score">${cheapest.accuracy}%</div>
        <div class="sub">${cheapest.correct}/${cheapest.total}</div>
      </div>
    `;
  }

  container.innerHTML = html;
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

  // Pick model answers for this question
  const modelAnswers = [];
  const results = getLatestResults();
  // Check if any model answered this specific question (if we have per-question data)
  // For now, just show the question with a prompt to test it
  const catColor = categoryColor(q.category);

  container.innerHTML = `
    <div class="dq-card">
      <div class="dq-header">
        <span class="dq-badge" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}44">
          ${categoryLabel(q.category)}
        </span>
        <span class="dq-badge" style="background:var(--surface-muted);color:var(--text-muted)">
          ${difficultyLabel(q.difficulty)}
        </span>
        <span class="dq-date">${today}</span>
      </div>
      <div class="dq-question">${q.question}</div>
      <div class="dq-options">
        ${Object.entries(q.options || {}).map(([letter, text]) =>
          `<div class="dq-option"><span class="dq-letter">${letter}</span> ${text}</div>`
        ).join('')}
      </div>
      <div class="dq-reveal" id="dq-reveal" style="display:none">
        <div class="dq-answer">
          Reponse : <strong>${q.answer}</strong>
          ${q.explanation ? `<span class="dq-exp">— ${q.explanation}</span>` : ''}
        </div>
      </div>
      <div class="dq-actions">
        <button class="dq-btn" id="dq-show-answer">Voir la reponse</button>
        <button class="dq-btn dq-btn-outline" onclick="setActiveTab('questions')">Toutes les questions</button>
      </div>
    </div>
  `;

  setTimeout(() => {
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
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ── Chart.js Global Defaults ────────────────────────── */
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#8a8a9e';
  Chart.defaults.font.family = "'Helvetica Neue', Helvetica, 'Segoe UI', Arial, sans-serif";
  Chart.defaults.font.size = 10;
}
