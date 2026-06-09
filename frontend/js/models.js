/* ═══════════════════════════════════════════════════════════
   AfriBench — Modeles page (model detail cards)
   ═══════════════════════════════════════════════════════════ */

let modelSortKey = 'score';
let modelSortDir = 'desc';
let modelFilter = 'all'; // 'all', 'open', 'closed'

function renderModels(container) {
  const models = getLatestResults();
  if (models.length === 0) {
    container.innerHTML = `<div class="card"><div class="empty-state"><h3>Aucun modele</h3><p>Les donnees ne sont pas encore chargees.</p></div></div>`;
    return;
  }

  // Sort
  let sorted = [...models];
  if (modelSortKey === 'score') {
    sorted.sort((a, b) => modelSortDir === 'desc' ? (b.accuracy || 0) - (a.accuracy || 0) : (a.accuracy || 0) - (b.accuracy || 0));
  } else if (modelSortKey === 'name') {
    sorted.sort((a, b) => {
      const na = (a.model_label || a.model || '').toLowerCase();
      const nb = (b.model_label || b.model || '').toLowerCase();
      return modelSortDir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
    });
  }

  // Filter
  if (modelFilter === 'open') {
    sorted = sorted.filter(m => isOpenModel(m));
  } else if (modelFilter === 'closed') {
    sorted = sorted.filter(m => !isOpenModel(m));
  } else if (modelFilter === 'favs') {
    sorted = sorted.filter(m => isFavorite(m.model_label || m.model));
  }

  // Search filter
  if (AppState.searchQuery) {
    sorted = applySearchFilter(sorted);
  }

  let html = `
    <div class="models-header">
      <div>
        <h2>Modeles</h2>
        <div class="models-count">${sorted.length} modele${sorted.length > 1 ? 's' : ''} evalue${sorted.length > 1 ? 's' : ''}</div>
      </div>
    </div>

    <div class="models-filters">
      <span class="filter-label">Filtres</span>
      <button class="filter-btn ${modelFilter === 'all' ? 'active' : ''}" data-mfilter="all">Tous</button>
      <button class="filter-btn ${modelFilter === 'open' ? 'active' : ''}" data-mfilter="open">Open Weights</button>
      <button class="filter-btn ${modelFilter === 'closed' ? 'active' : ''}" data-mfilter="closed">Proprietaires</button>
      <button class="filter-btn ${modelFilter === 'favs' ? 'active' : ''}" data-mfilter="favs">★ Favoris</button>
      <span class="filter-label" style="margin-left:12px">Trier</span>
      <button class="filter-btn ${modelSortKey === 'score' ? 'active' : ''}" data-msort="score">Score</button>
      <button class="filter-btn ${modelSortKey === 'name' ? 'active' : ''}" data-msort="name">Nom</button>
      <button class="filter-btn" data-msortdir title="${modelSortDir === 'desc' ? 'Descendant' : 'Ascendant'}">
        ${modelSortDir === 'desc' ? '▼' : '▲'}
      </button>
    </div>

    <div class="models-grid">
  `;

  sorted.forEach((m) => {
    const name = m.model_label || m.model;
    const acc = m.accuracy || 0;
    const correct = m.correct || 0;
    const total = m.total || 0;
    const open = isOpenModel(m);
    const provider = getModelProvider(name);
    const timestamp = m.timestamp ? formatDate(m.timestamp) : '—';

    html += `
      <div class="model-card">
        <div class="model-card-header">
          <div class="model-card-name">
            <span class="fav-star" data-fav="${name}" title="${isFavorite(name) ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${isFavorite(name) ? '★' : '☆'}</span>
            ${name}
          </div>
          <span class="model-card-badge ${open ? 'open' : 'closed'}">${open ? 'OPEN' : 'CLOSED'}</span>
        </div>

        <div class="model-card-score">
          <span class="big-score">${acc.toFixed(1)}%</span>
          <span class="score-label">precision globale</span>
          <span class="score-detail">${correct}/${total}</span>
        </div>

        <dl class="model-card-meta">
          <dt>Provider</dt>
          <dd>${provider}</dd>
          <dt>Derniere eval</dt>
          <dd>${timestamp}</dd>
          <dt>Questions</dt>
          <dd>${total}</dd>
          <dt>Correctes</dt>
          <dd>${correct}</dd>
        </dl>

        <div class="model-card-categories">
          <div class="cat-mini-label">Scores par categorie</div>
          <canvas class="model-mini-radar" id="mradar-${name.replace(/[^a-zA-Z0-9]/g, '')}" data-model="${name}" height="100" width="100"></canvas>
        </div>

        <div class="model-card-actions">
          <button class="mcard-btn mcard-btn-primary" data-action="compare" data-model="${name}">Comparer</button>
          <button class="mcard-btn mcard-btn-secondary" data-action="leaderboard" data-model="${name}">Voir details</button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  // Wire up filters
  container.querySelectorAll('[data-mfilter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      modelFilter = btn.dataset.mfilter;
      renderModels(container);
    });
  });

  container.querySelectorAll('[data-msort]').forEach((btn) => {
    if (btn.dataset.msortdir !== undefined) {
      modelSortDir = modelSortDir === 'desc' ? 'asc' : 'desc';
    } else {
      if (modelSortKey === btn.dataset.msort && modelSortDir === 'desc') {
        modelSortDir = 'asc';
      } else {
        modelSortKey = btn.dataset.msort;
        modelSortDir = 'desc';
      }
    }
    renderModels(container);
  });

  // Wire up actions
  container.querySelectorAll('[data-action="compare"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.comparePreset = btn.dataset.model;
      setActiveTab('compare');
    });
  });

  container.querySelectorAll('[data-action="leaderboard"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.searchQuery = btn.dataset.model.toLowerCase();
      const searchInput = document.getElementById('global-search');
      if (searchInput) searchInput.value = btn.dataset.model;
      setActiveTab('leaderboard');
    });
  });

  // Favorites stars
  container.querySelectorAll('.fav-star').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(el.dataset.fav);
    });
  });

  // Draw mini radar charts
  requestAnimationFrame(() => {
    const models = getLatestResults();
    container.querySelectorAll('.model-mini-radar').forEach(canvas => {
      const name = canvas.dataset.model;
      const m = models.find(x => (x.model_label || x.model) === name);
      if (!m || !m.by_category) return;
      drawMiniRadar(canvas, m);
    });
  });
}

function drawMiniRadar(canvas, m) {
  const cats = categoryKeys().filter(k => m.by_category[k]);
  if (cats.length === 0) return;
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: cats.map(c => categoryLabel(c).slice(0, 4)),
      datasets: [{
        data: cats.map(c => m.by_category[c].accuracy),
        backgroundColor: 'rgba(196, 164, 106, 0.1)',
        borderColor: 'rgba(196, 164, 106, 0.7)',
        borderWidth: 1.5,
        pointBackgroundColor: 'rgba(196, 164, 106, 0.8)',
        pointRadius: 2,
        pointHoverRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: 'rgba(44,44,47,0.3)' },
          angleLines: { color: 'rgba(44,44,47,0.2)' },
          pointLabels: {
            color: '#8a8a9e',
            font: { size: 7 },
          },
        },
      },
    },
  });
}

function renderCategoryMiniBars(m) {
  if (!m.by_category) return '<div style="font-size:9px;color:var(--text-muted)">Aucune donnee</div>';

  const cats = Object.entries(m.by_category).sort((a, b) => (b[1].accuracy || 0) - (a[1].accuracy || 0));

  return cats.map(([key, info]) => {
    const score = info.accuracy || 0;
    const color = categoryColor(key);
    const label = categoryLabel(key);
    return `
      <div class="cat-mini-bar">
        <span class="cat-mini-name" title="${label}">${label}</span>
        <div class="cat-mini-track">
          <div class="cat-mini-fill" style="width:${score}%;background:${color}"></div>
        </div>
        <span class="cat-mini-score">${score.toFixed(0)}%</span>
      </div>
    `;
  }).join('');
}

function getModelProvider(name) {
  const nameL = (name || '').toLowerCase();
  if (nameL.includes('deepseek')) return 'DeepSeek';
  if (nameL.includes('claude')) return 'Anthropic';
  if (nameL.includes('gpt')) return 'OpenAI';
  if (nameL.includes('mistral')) return 'Mistral AI';
  if (nameL.includes('gemini')) return 'Google';
  if (nameL.includes('llama')) return 'Meta';
  if (nameL.includes('qwen')) return 'Alibaba';
  if (nameL.includes('haiku') || nameL.includes('sonnet') || nameL.includes('opus')) return 'Anthropic';
  return '—';
}
