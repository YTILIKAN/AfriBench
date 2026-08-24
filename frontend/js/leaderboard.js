/* ═══════════════════════════════════════════════════════════
   AfriBench — Leaderboard View (refonte 2026)
   Ajout : meilleure catégorie, écart-type, tooltips, légende
   ═══════════════════════════════════════════════════════════ */

const {
  AppState, getLatestResults, applySearchFilter, isOpenModel, isFavorite,
  computeBestCategory, computeStdDev, categoryLabel,
  formatDate, exportCSV, exportJSON, toggleFavorite,
  escapeHtml, mountChart, chartTheme, chartSeriesColor,
} = globalThis;
const renderIcon = globalThis.icon || (() => '');

let lbSortField = null;
let lbSortDir = 'desc';
let lbShowLegend = false;

function resultMetric(model) {
  if (!AppState.urlCategory) {
    return {
      accuracy: model.accuracy || 0,
      correct: model.correct || 0,
      total: model.total || 0,
    };
  }
  const category = model.by_category?.[AppState.urlCategory] || {};
  return {
    accuracy: category.accuracy || 0,
    correct: category.correct || 0,
    total: category.total || 0,
  };
}

/* ── Metric definitions (used for tooltips + legend) ─── */
const METRICS = {
  score: {
    label: 'Score global',
    desc: 'Part de réponses correctes.',
  },
  facile: {
    label: 'Facile',
    desc: 'Score des questions faciles.',
  },
  moyen: {
    label: 'Moyen',
    desc: 'Score des questions intermédiaires.',
  },
  difficile: {
    label: 'Difficile',
    desc: 'Score des questions difficiles.',
  },
  meilleure_cat: {
    label: 'Meilleure cat.',
    desc: 'Catégorie au meilleur score.',
  },
  ecart_type: {
    label: 'Écart-type',
    desc: 'Écart entre les catégories. Plus bas = plus régulier.',
  },
  questions: {
    label: 'Questions',
    desc: 'Réponses correctes / total.',
  },
  evalue: {
    label: 'Évalué',
    desc: 'Dernière évaluation.',
  },
};

/* ── Sort helpers for new columns ────────────────────── */
function getSortVal(m, field) {
  switch (field) {
    case 'rank': return 0;
    case 'name': return (m.model_label || m.model || '').toLowerCase();
    case 'score': return resultMetric(m).accuracy;
    case 'total': return m.total || 0;
    case 'date': return m.timestamp || '';
    case 'best_cat': return computeBestCategory(m)?.accuracy || 0;
    case 'stddev': {
      const sd = computeStdDev(m);
      return sd !== null ? sd : 999;
    }
    default: return 0;
  }
}

/* ── Main render ─────────────────────────────────────── */
function renderLeaderboard(container) {
  let models = getLatestResults();
  models = applySearchFilter(models);

  // Apply type filter
  if (AppState.modelType === 'open') {
    models = models.filter((m) => isOpenModel(m));
  } else if (AppState.modelType === 'closed') {
    models = models.filter((m) => !isOpenModel(m));
  } else if (AppState.modelType === 'favs') {
    models = models.filter((m) => isFavorite(m.model_label || m.model));
  }

  if (AppState.urlCategory && !lbSortField) {
    models.sort((a, b) => resultMetric(b).accuracy - resultMetric(a).accuracy);
  }

  // Sort
  if (lbSortField) {
    models.sort((a, b) => {
      const va = getSortVal(a, lbSortField);
      const vb = getSortVal(b, lbSortField);
      if (typeof va === 'string') {
        return lbSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return lbSortDir === 'asc' ? va - vb : vb - va;
    });
  }

  const maxScore = models.length > 0
    ? Math.max(...models.map((m) => resultMetric(m).accuracy))
    : 100;

  if (models.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Aucun résultat</h3>
          <p>Lancez une évaluation :</p>
          <p><code>python scripts/afribench.py run</code></p>
        </div>
      </div>
    `;
    return;
  }

  // ── Filter bar ──
  let html = `
    <div class="filter-bar">
      <button class="filter-btn ${AppState.modelType === 'favs' ? 'active' : ''}" data-filter="favs">Favoris</button>
      <button class="filter-btn ${lbShowLegend ? 'active' : ''}" id="lb-toggle-legend">
        ${renderIcon('ChevronDown', `ui-icon ${lbShowLegend ? 'is-expanded' : ''}`)} Légende
      </button>
      <span style="flex:1"></span>
      <button class="filter-btn" id="lb-export-csv" title="Exporter en CSV">CSV</button>
      <button class="filter-btn" id="lb-export-json" title="Exporter en JSON">JSON</button>
      ${AppState.urlCategory ? `
        <span class="filter-context">Score · ${escapeHtml(categoryLabel(AppState.urlCategory))}</span>
      ` : ''}
      <span class="filter-label" style="margin-left:4px">${models.length} modèle${models.length > 1 ? 's' : ''}</span>
    </div>
  `;

  // ── Legend card ──
  if (lbShowLegend) {
    html += `
      <div class="card" id="lb-legend">
        <div class="card-title">Légende des métriques</div>
        <div class="legend-grid">
          ${Object.values(METRICS).map((m) => `
            <div class="legend-item">
              <span class="legend-label">${escapeHtml(m.label)}</span>
              <span class="legend-desc">${escapeHtml(m.desc)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ── Table ──
  html += `
    <div class="card lb-table-wrap">
      <table class="lb-table">
        <caption class="sr-only">
          Classement des modèles évalués : rang, nom, score global, nombre de
          réponses correctes, scores par niveau de difficulté, meilleure
          catégorie, écart-type entre catégories et date d'évaluation.
        </caption>
        <thead>
          <tr>
            ${renderTH('rank', '#')}
            ${renderTH('name', 'Modèle')}
            ${renderTH('score', AppState.urlCategory ? escapeHtml(categoryLabel(AppState.urlCategory)) : 'Score')}
            <th scope="col" class="th-with-tip col-questions" data-tip="${METRICS.questions.desc}">Questions ${renderIcon('CircleHelp', 'tip-icon')}</th>
            <th scope="col" class="th-with-tip col-facile" data-tip="${METRICS.facile.desc}">Facile ${renderIcon('CircleHelp', 'tip-icon')}</th>
            <th scope="col" class="th-with-tip col-moyen" data-tip="${METRICS.moyen.desc}">Moyen ${renderIcon('CircleHelp', 'tip-icon')}</th>
            <th scope="col" class="th-with-tip col-difficile" data-tip="${METRICS.difficile.desc}">Difficile ${renderIcon('CircleHelp', 'tip-icon')}</th>
            ${renderTH('best_cat', 'Meilleure cat.', METRICS.meilleure_cat.desc)}
            ${renderTH('stddev', 'Écart-type', METRICS.ecart_type.desc)}
            ${renderTH('date', 'Évalué', METRICS.evalue.desc)}
          </tr>
        </thead>
        <tbody>
  `;

  models.forEach((m, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const name = m.model_label || m.model;
    const safeName = escapeHtml(name);
    const metric = resultMetric(m);
    const barWidth = maxScore > 0 ? (metric.accuracy / maxScore) * 100 : 0;
    const d = m.by_difficulty || {};
    const easy = d.easy ? `${(d.easy.accuracy || 0).toFixed(1)}%` : '-';
    const med = d.medium ? `${(d.medium.accuracy || 0).toFixed(1)}%` : '-';
    const hard = d.hard ? `${(d.hard.accuracy || 0).toFixed(1)}%` : '-';
    const isOpen = isOpenModel(m);
    const best = computeBestCategory(m);
    const stddev = computeStdDev(m);

    const favorite = isFavorite(name);

    html += `
      <tr>
        <td class="rank col-rank ${rankClass}">${i + 1}</td>
        <th scope="row" class="col-name">
          <div class="model-cell">
            <button type="button" class="fav-star ${favorite ? 'is-favorite' : ''}"
                    data-fav="${safeName}" aria-pressed="${favorite}"
                    aria-label="${favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
              ${renderIcon('Star')}
            </button>
            <span class="model-name">${safeName}</span>
            <span class="model-provider">${isOpen ? 'open' : 'propriétaire'}</span>
          </div>
        </th>
        <td class="col-score">
          <div class="score-bar-wrap">
            <span class="score-cell">${metric.accuracy.toFixed(1)}%</span>
            <div class="score-bar-bg">
              <div class="score-bar-fill" style="width:${barWidth}%"></div>
            </div>
          </div>
        </td>
        <td class="metadata col-questions">${metric.correct}/${metric.total}</td>
        <td class="metadata col-facile">${easy}</td>
        <td class="metadata col-moyen">${med}</td>
        <td class="metadata col-difficile">${hard}</td>
        <td class="metadata col-best_cat">
          ${best ? `${escapeHtml(categoryLabel(best.key))} ${best.accuracy.toFixed(0)}%` : '-'}
        </td>
        <td class="metadata col-stddev ${stddev !== null ? (stddev < 5 ? 'std-good' : stddev < 8 ? 'std-mid' : 'std-wide') : ''}">
          ${stddev !== null ? stddev.toFixed(1) : '-'}
        </td>
        <td class="metadata col-date">${m.timestamp ? escapeHtml(formatDate(m.timestamp)) : '-'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // ── Charts ──
  html += `<div class="grid-2">`;
  html += `
    <div class="card">
      <div class="card-title">Par catégorie</div>
      <div class="chart-container" style="min-height:300px">
        <canvas id="lb-cat-chart"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Par difficulté</div>
      <div class="chart-container" style="min-height:300px">
        <canvas id="lb-diff-chart"></canvas>
      </div>
    </div>
  `;
  html += `</div>`;

  container.innerHTML = html;

  // ── Wire filters ──
  container.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      AppState.modelType = AppState.modelType === btn.dataset.filter ? 'all' : btn.dataset.filter;
      globalThis.renderWorkspaceFilters?.();
      renderLeaderboard(container);
    });
  });

  // ── Legend toggle ──
  document.getElementById('lb-toggle-legend')?.addEventListener('click', () => {
    lbShowLegend = !lbShowLegend;
    renderLeaderboard(container);
  });

  // ── Export buttons ──
  document.getElementById('lb-export-csv')?.addEventListener('click', exportCSV);
  document.getElementById('lb-export-json')?.addEventListener('click', exportJSON);

  // ── Sort ──
  container.querySelectorAll('[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (lbSortField === field) {
        lbSortDir = lbSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        lbSortField = field;
        lbSortDir = field === 'name' ? 'asc' : 'desc';
      }
      renderLeaderboard(container);
    });
  });

  // ── Tooltips ──
  setupTooltips(container);

  // ── Favorites stars ──
  container.querySelectorAll('.fav-star').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(el.dataset.fav);
    });
  });

  // ── Charts ──
  requestAnimationFrame(() => {
    renderLBCategoryChart(models);
    renderLBDifficultyChart(models);
  });
}

/* ── Render a sortable TH with optional tooltip ──────── */
function renderTH(field, label, tip) {
  const active = lbSortField === field;
  const cls = active ? (lbSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
  const tipAttr = tip ? ` data-tip="${tip}"` : '';
  const tipIcon = tip ? ` ${renderIcon('CircleHelp', 'tip-icon')}` : '';
  const sortIcon = active
    ? renderIcon(lbSortDir === 'asc' ? 'ArrowUp' : 'ArrowDown', 'sort-icon')
    : renderIcon('ChevronsUpDown', 'sort-icon');
  return `
    <th scope="col" data-sort="${field}" class="${cls} th-with-tip col-${field}"${tipAttr}>
      ${label} ${sortIcon}${tipIcon}
    </th>
  `;
}

/* ── Tooltip system ──────────────────────────────────── */
function setupTooltips(container) {
  const tips = container.querySelectorAll('.th-with-tip');
  tips.forEach(th => {
    th.addEventListener('mouseenter', () => {
      const tipText = th.dataset.tip;
      if (!tipText) return;
      const existing = document.querySelector('.metric-tooltip');
      if (existing) existing.remove();
      const rect = th.getBoundingClientRect();
      const tooltip = document.createElement('div');
      tooltip.className = 'metric-tooltip';
      tooltip.textContent = tipText;
      document.body.appendChild(tooltip);
      const ttRect = tooltip.getBoundingClientRect();
      let left = rect.left + (rect.width / 2) - (ttRect.width / 2);
      if (left < 10) left = 10;
      if (left + ttRect.width > window.innerWidth - 10) left = window.innerWidth - ttRect.width - 10;
      tooltip.style.left = `${left  }px`;
      tooltip.style.top = `${rect.bottom + 8  }px`;
    });
    th.addEventListener('mouseleave', () => {
      const existing = document.querySelector('.metric-tooltip');
      if (existing) existing.remove();
    });
  });
}

/* ── Charts ──────────────────────────────────────────── */
function renderLBCategoryChart(models) {
  const canvas = document.getElementById('lb-cat-chart');
  if (!canvas) return;
  const theme = chartTheme();
  const allCats = new Set();
  models.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => allCats.add(c));
  });
  const cats = Array.from(allCats).sort();
  const datasets = models.slice(0, 6).map((m, i) => ({
    label: m.model_label || m.model,
    data: cats.map((c) => m.by_category?.[c]?.accuracy || 0),
    backgroundColor: chartSeriesColor(i).bg,
    borderColor: chartSeriesColor(i).border,
    borderWidth: 1,
    borderRadius: 2,
  }));
  mountChart(canvas, {
    type: 'bar',
    data: { labels: cats.map((c) => categoryLabel(c)), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: theme.tick, font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: theme.tick, font: { size: 9 }, maxRotation: 45 }, grid: { color: theme.grid } },
        y: { beginAtZero: true, max: 100, ticks: { color: theme.tick, callback: (v) => `${v  }%` }, grid: { color: theme.grid } },
      },
    },
  });
}

function renderLBDifficultyChart(models) {
  const canvas = document.getElementById('lb-diff-chart');
  if (!canvas) return;
  const theme = chartTheme();
  const diffs = ['easy', 'medium', 'hard'];
  const diffLabels = ['Facile', 'Moyen', 'Difficile'];
  const topModels = models.slice(0, 6);
  const datasets = topModels.map((m, i) => ({
    label: m.model_label || m.model,
    data: diffs.map((d) => m.by_difficulty?.[d]?.accuracy || 0),
    backgroundColor: chartSeriesColor(i).bg,
    borderColor: chartSeriesColor(i).border,
    borderWidth: 1,
    borderRadius: 2,
  }));
  mountChart(canvas, {
    type: 'bar',
    data: { labels: diffLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: theme.tick, font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: theme.tick, font: { size: 10 } }, grid: { color: theme.grid } },
        y: { beginAtZero: true, max: 100, ticks: { color: theme.tick, callback: (v) => `${v  }%` }, grid: { color: theme.grid } },
      },
    },
  });
}

globalThis.renderLeaderboard = renderLeaderboard;
export {};
