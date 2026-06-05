/* ═══════════════════════════════════════════════
   AfriBench — Application principale
   ═══════════════════════════════════════════════ */

/** Résultats et questions chargés depuis data/ */
const AppState = {
  results: [],
  questions: [],
  activeTab: 'leaderboard',
};

/** Chargement initial */
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await loadData();
  renderActiveTab();
});

/* ── Tabs ────────────────────────────────── */
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.activeTab = btn.dataset.tab;
      renderActiveTab();
    });
  });
}

function renderActiveTab() {
  const container = document.getElementById('tab-content');
  switch (AppState.activeTab) {
    case 'leaderboard':
      renderLeaderboard(container);
      break;
    case 'categories':
      renderCategories(container);
      break;
    case 'compare':
      renderCompare(container);
      break;
    case 'questions':
      renderQuestions(container);
      break;
  }
}

/* ── Data Loading ────────────────────────── */

async function loadData() {
  // Load results from data/results/ (auto-discovered via results.json index)
  const resultsContainer = document.getElementById('results-count');
  try {
    const resp = await fetch('data/results.json');
    if (resp.ok) {
      AppState.results = await resp.json();
      if (resultsContainer) resultsContainer.textContent = AppState.results.length;
    }
  } catch {
    // No results yet — normal
    if (resultsContainer) resultsContainer.textContent = '0';
  }

  // Load questions stats
  const qContainer = document.getElementById('questions-count');
  try {
    const resp = await fetch('data/questions.json');
    if (resp.ok) {
      AppState.questions = await resp.json();
      if (qContainer) qContainer.textContent = AppState.questions.length;
    }
  } catch {
    if (qContainer) qContainer.textContent = '0';
  }
}

/* ── Utilities ───────────────────────────── */

function difficultyLabel(d) {
  const map = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
  return map[d] || d;
}

function categoryLabel(cat) {
  const map = {
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
  return map[cat] || cat;
}

function categoryColor(cat) {
  const map = {
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
  return map[cat] || '#C4A46A';
}

function getLatestResults() {
  // Keep only the most recent run per model
  const latest = {};
  for (const r of AppState.results) {
    const name = r.model || r.model_label;
    if (!latest[name] || r.timestamp > latest[name].timestamp) {
      latest[name] = r;
    }
  }
  return Object.values(latest).sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
}
