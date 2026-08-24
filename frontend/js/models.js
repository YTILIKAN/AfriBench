/* ═══════════════════════════════════════════════════════════
   AfriBench — Modeles page (model detail cards)
   ═══════════════════════════════════════════════════════════ */

const {
  AppState, getLatestResults, isOpenModel, isFavorite, applySearchFilter,
  formatDate, toggleFavorite, categoryKeys, categoryLabel, setActiveTab,
  escapeHtml, mountChart, chartTheme,
} = globalThis;
const renderIcon = globalThis.icon || (() => '');

let modelSortKey = 'score';
let modelSortDir = 'desc';

function renderModels(container) {
  const models = getLatestResults();
  if (models.length === 0) {
    container.innerHTML = `<div class="card"><div class="empty-state"><h3>Aucun modèle</h3><p>Données indisponibles.</p></div></div>`;
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
  if (AppState.modelType === 'open') {
    sorted = sorted.filter(m => isOpenModel(m));
  } else if (AppState.modelType === 'closed') {
    sorted = sorted.filter(m => !isOpenModel(m));
  } else if (AppState.modelType === 'favs') {
    sorted = sorted.filter(m => isFavorite(m.model_label || m.model));
  }

  // Search filter
  if (AppState.searchQuery) {
    sorted = applySearchFilter(sorted);
  }

  let html = `
    <div class="models-filters">
      <button class="filter-btn ${AppState.modelType === 'favs' ? 'active' : ''}" data-mfilter="favs">Favoris</button>
      <span style="flex:1"></span>
      <span class="filter-label">Trier :</span>
      <button class="filter-btn ${modelSortKey === 'score' ? 'active' : ''}" data-msort="score">Score</button>
      <button class="filter-btn ${modelSortKey === 'name' ? 'active' : ''}" data-msort="name">Nom</button>
      <button class="filter-btn" data-msortdir title="${modelSortDir === 'desc' ? 'Descendant' : 'Ascendant'}" aria-label="Inverser l'ordre de tri">
        ${renderIcon(modelSortDir === 'desc' ? 'ArrowDown' : 'ArrowUp')}
      </button>
      <span class="filter-label" style="margin-left:8px">${sorted.length} modèle${sorted.length > 1 ? 's' : ''}</span>
    </div>

    <div class="models-grid">
  `;

  sorted.forEach((m, index) => {
    const name = m.model_label || m.model;
    const safeName = escapeHtml(name);
    const acc = m.accuracy || 0;
    const correct = m.correct || 0;
    const total = m.total || 0;
    const open = isOpenModel(m);
    const provider = getModelProvider(name);
    const timestamp = m.timestamp ? formatDate(m.timestamp) : '—';
    const favorite = isFavorite(name);

    html += `
      <div class="model-card">
        <div class="model-card-header">
          <div class="model-card-name">
            <button type="button" class="fav-star ${favorite ? 'is-favorite' : ''}"
                    data-fav="${safeName}" aria-pressed="${favorite}"
                    aria-label="${favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
              ${renderIcon('Star')}
            </button>
            ${safeName}
          </div>
          <span class="model-card-badge ${open ? 'open' : 'closed'}">${open ? 'Ouvert' : 'Propriétaire'}</span>
        </div>

        <div class="model-card-score">
          <span class="big-score">${acc.toFixed(1)}%</span>
          <span class="score-label">Précision globale</span>
          <span class="score-detail">${correct}/${total}</span>
        </div>

        <dl class="model-card-meta">
          <dt>Provider</dt>
          <dd>${provider}</dd>
          <dt>Dernière éval.</dt>
          <dd>${timestamp}</dd>
          <dt>Questions</dt>
          <dd>${total}</dd>
          <dt>Correctes</dt>
          <dd>${correct}</dd>
        </dl>

        <div class="model-card-categories">
          <div class="cat-mini-label">Par catégorie</div>
          <canvas class="model-mini-radar" id="mradar-${index}" data-model="${safeName}" height="100" width="100"></canvas>
        </div>

        <div class="model-card-actions">
          <button class="mcard-btn mcard-btn-primary" data-action="compare" data-model="${safeName}">Comparer</button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  // Wire up filters
  container.querySelectorAll('[data-mfilter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.modelType = AppState.modelType === btn.dataset.mfilter ? 'all' : btn.dataset.mfilter;
      globalThis.renderWorkspaceFilters?.();
      renderModels(container);
    });
  });

  container.querySelectorAll('[data-msort]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (modelSortKey === btn.dataset.msort && modelSortDir === 'desc') {
        modelSortDir = 'asc';
      } else {
        modelSortKey = btn.dataset.msort;
        modelSortDir = 'desc';
      }
      renderModels(container);
    });
  });

  container.querySelectorAll('[data-msortdir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      modelSortDir = modelSortDir === 'desc' ? 'asc' : 'desc';
      renderModels(container);
    });
  });

  // Wire up actions
  container.querySelectorAll('[data-action="compare"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.comparePreset = btn.dataset.model;
      setActiveTab('compare');
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
    // Index par nom : une recherche linéaire par canvas rendait le montage
    // quadratique en nombre de modèles.
    const byName = new Map(
      getLatestResults().map((m) => [m.model_label || m.model, m]),
    );
    container.querySelectorAll('.model-mini-radar').forEach((canvas) => {
      const m = byName.get(canvas.dataset.model);
      if (!m || !m.by_category) return;
      drawMiniRadar(canvas, m);
    });
  });
}

function drawMiniRadar(canvas, m) {
  const cats = categoryKeys().filter(k => m.by_category[k]);
  if (cats.length === 0) return;
  const theme = chartTheme();

  mountChart(canvas, {
    type: 'radar',
    data: {
      labels: cats.map(c => categoryLabel(c).slice(0, 4)),
      datasets: [{
        data: cats.map(c => m.by_category[c].accuracy),
        backgroundColor: 'rgba(255, 167, 38, 0.12)',
        borderColor: 'rgba(255, 167, 38, 0.9)',
        borderWidth: 2,
        pointBackgroundColor: '#FFA726',
        pointBorderColor: theme.label,
        pointBorderWidth: 1,
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
          grid: { color: theme.grid },
          angleLines: { color: theme.grid },
          pointLabels: {
            color: theme.tick,
            font: { size: 7 },
          },
        },
      },
    },
  });
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

globalThis.renderModels = renderModels;
export {};
