/* ═══════════════════════════════════════════════════════════
   AfriBench — Leaderboard View (refonte 2026)
   Ajout : meilleure catégorie, écart-type, tooltips, légende
   ═══════════════════════════════════════════════════════════ */

let lbSortField = null;
let lbSortDir = 'desc';
let lbFilterType = 'all';
let lbShowLegend = false;

/* ── Metric definitions (used for tooltips + legend) ─── */
const METRICS = {
  score: {
    label: 'Score global',
    desc: 'Pourcentage de réponses correctes sur l\'ensemble du benchmark (101 questions). Métrique principale de performance.',
  },
  facile: {
    label: 'Facile',
    desc: 'Précision sur les questions de niveau facile. Teste les connaissances de base sur l\'Afrique.',
  },
  moyen: {
    label: 'Moyen',
    desc: 'Précision sur les questions de niveau intermédiaire. Évalue la profondeur des connaissances.',
  },
  difficile: {
    label: 'Difficile',
    desc: 'Précision sur les questions de niveau difficile. Mesure la capacité de raisonnement avancé sur des sujets spécialisés.',
  },
  meilleure_cat: {
    label: 'Meilleure cat.',
    desc: 'Catégorie où le modèle obtient le meilleur score. Indique le domaine de prédilection du modèle.',
  },
  ecart_type: {
    label: 'Écart-type',
    desc: 'Mesure de la régularité des performances entre les 9 catégories. Plus l\'écart-type est faible, plus le modèle est consistant.',
  },
  questions: {
    label: 'Questions',
    desc: 'Nombre de réponses correctes sur le total de questions (correct/total).',
  },
  evalue: {
    label: 'Évalué',
    desc: 'Date de la dernière évaluation du modèle sur AfriBench.',
  },
};

/* ── Sort helpers for new columns ────────────────────── */
function getSortVal(m, field) {
  switch (field) {
    case 'rank': return 0;
    case 'name': return (m.model_label || m.model || '').toLowerCase();
    case 'score': return m.accuracy || 0;
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
  if (lbFilterType === 'open') {
    models = models.filter((m) => isOpenModel(m));
  } else if (lbFilterType === 'proprietary') {
    models = models.filter((m) => !isOpenModel(m));
  } else if (lbFilterType === 'favs') {
    models = models.filter((m) => isFavorite(m.model_label || m.model));
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

  const maxScore = models.length > 0 ? Math.max(...models.map((m) => m.accuracy)) : 100;

  if (models.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Aucun résultat</h3>
          <p>Lancez une évaluation depuis votre terminal :</p>
          <p><code>python scripts/afribench.py run</code></p>
        </div>
      </div>
    `;
    return;
  }

  // ── Filter bar ──
  html = `
    <div class="filter-bar">
      <button class="filter-btn ${lbFilterType === 'all' ? 'active' : ''}" data-filter="all">Tous</button>
      <button class="filter-btn ${lbFilterType === 'open' ? 'active' : ''}" data-filter="open">Open Weights</button>
      <button class="filter-btn ${lbFilterType === 'proprietary' ? 'active' : ''}" data-filter="proprietary">Propriétaire</button>
      <button class="filter-btn ${lbFilterType === 'favs' ? 'active' : ''}" data-filter="favs">★ Favoris</button>
      <button class="filter-btn ${lbShowLegend ? 'active' : ''}" id="lb-toggle-legend" style="margin-left:8px">
        ${lbShowLegend ? '▼' : '▶'} Légende
      </button>
      <span style="flex:1"></span>
      <button class="filter-btn" id="lb-export-csv" title="Exporter en CSV">CSV</button>
      <button class="filter-btn" id="lb-export-json" title="Exporter en JSON">JSON</button>
      <span style="font-size:var(--font-size-xs);color:var(--text-muted);margin-left:8px">${models.length} modèle${models.length > 1 ? 's' : ''}</span>
    </div>
  `;

  // ── Legend card ──
  if (lbShowLegend) {
    html += `
      <div class="card legend-card" id="lb-legend">
        <div class="card-title">Légende des métriques</div>
        <div class="legend-grid">
          ${Object.entries(METRICS).map(([key, m]) => `
            <div class="legend-item">
              <strong>${m.label}</strong>
              <span>${m.desc}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ── Table ──
  html += `
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="lb-table">
        <thead>
          <tr>
            ${renderTH('rank', '#')}
            ${renderTH('name', 'Modèle')}
            ${renderTH('score', 'Score')}
            <th class="th-with-tip" data-tip="${METRICS.questions.desc}">Questions <span class="tip-icon"></span></th>
            <th class="th-with-tip" data-tip="${METRICS.facile.desc}">Facile <span class="tip-icon"></span></th>
            <th class="th-with-tip" data-tip="${METRICS.moyen.desc}">Moyen <span class="tip-icon"></span></th>
            <th class="th-with-tip" data-tip="${METRICS.difficile.desc}">Difficile <span class="tip-icon"></span></th>
            ${renderTH('best_cat', 'Meilleure cat.', METRICS.meilleure_cat.desc)}
            ${renderTH('stddev', 'Écart-type', METRICS.ecart_type.desc)}
            ${renderTH('date', 'Évalué', METRICS.evalue.desc)}
          </tr>
        </thead>
        <tbody>
  `;

  // Compute badge data
  const stdDevs = models.map(m => computeStdDev(m));
  const minStdDev = Math.min(...stdDevs.filter(s => s !== null));
  const bestOpen = models.find(m => isOpenModel(m));
  const bestOpenName = bestOpen ? (bestOpen.model_label || bestOpen.model) : null;

  models.forEach((m, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const name = m.model_label || m.model;
    const barWidth = maxScore > 0 ? (m.accuracy / maxScore) * 100 : 0;
    const d = m.by_difficulty || {};
    const easy = d.easy ? `${(d.easy.accuracy || 0).toFixed(1)}%` : '-';
    const med = d.medium ? `${(d.medium.accuracy || 0).toFixed(1)}%` : '-';
    const hard = d.hard ? `${(d.hard.accuracy || 0).toFixed(1)}%` : '-';
    const isOpen = isOpenModel(m);
    const providerClass = isOpen ? 'model-icon-open' : 'model-icon-closed';
    const best = computeBestCategory(m);
    const stddev = computeStdDev(m);
    const isBestStd = stddev !== null && stddev === minStdDev;
    const isBestOpen = isOpen && name === bestOpenName;

    let badges = '<span class="perf-badge bronze">1er (v0.1)</span>';

    const favStar = isFavorite(name) ? '★' : '☆';

    html += `
      <tr>
        <td class="rank ${rankClass}">${i + 1}</td>
        <td>
          <div class="model-cell">
            <span class="fav-star" data-fav="${name}" title="${isFavorite(name) ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${favStar}</span>
            <span class="model-icon ${providerClass}"></span>
            <span class="model-name">${name}</span>
            <span class="model-provider">${isOpen ? 'open' : 'propriétaire'}</span>
            ${badges}
          </div>
        </td>
        <td>
          <div class="score-bar-wrap">
            <span class="score-cell">${m.accuracy}%</span>
            <div class="score-bar-bg">
              <div class="score-bar-fill" style="width:${barWidth}%"></div>
            </div>
          </div>
        </td>
        <td class="metadata">${m.correct}/${m.total}</td>
        <td class="metadata">${easy}</td>
        <td class="metadata">${med}</td>
        <td class="metadata">${hard}</td>
        <td class="metadata" style="color:${best ? categoryColor(best.key) : 'var(--text-muted)'}">
          ${best ? `${categoryLabel(best.key)} ${best.accuracy.toFixed(0)}%` : '-'}
        </td>
        <td class="metadata ${stddev !== null ? (stddev < 5 ? 'std-good' : stddev < 8 ? 'std-mid' : 'std-wide') : ''}">
          ${stddev !== null ? stddev.toFixed(1) : '-'}
        </td>
        <td class="metadata">${m.timestamp ? formatDate(m.timestamp) : '-'}</td>
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
      <div class="card-title">Performance par catégorie</div>
      <div class="chart-container" style="min-height:300px">
        <canvas id="lb-cat-chart"></canvas>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Performance par difficulté</div>
      <div class="chart-container" style="min-height:300px">
        <canvas id="lb-diff-chart"></canvas>
      </div>
    </div>
  `;
  html += `</div>`;

  // ── Podium par categorie ──
  html += `
    <div class="card">
      <div class="card-title">
        Classement par catégorie
        <span class="count-badge">top 3 par domaine</span>
      </div>
      <div class="podium-grid">
        ${renderCategoryPodium(models)}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // ── Wire filters ──
  container.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lbFilterType = btn.dataset.filter;
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
  const tipIcon = tip ? ' <span class="tip-icon"></span>' : '';
  return `
    <th data-sort="${field}" class="${cls} th-with-tip"${tipAttr}>
      ${label} <span class="sort-arrows"></span>${tipIcon}
    </th>
  `;
}

/* ── Tooltip system ──────────────────────────────────── */
function setupTooltips(container) {
  const tips = container.querySelectorAll('.th-with-tip');
  tips.forEach(th => {
    th.addEventListener('mouseenter', (e) => {
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
      tooltip.style.left = left + 'px';
      tooltip.style.top = (rect.bottom + 8) + 'px';
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
  const ctx = canvas.getContext('2d');
  const allCats = new Set();
  models.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => allCats.add(c));
  });
  const cats = Array.from(allCats).sort();
  const datasets = models.slice(0, 6).map((m, i) => ({
    label: m.model_label || m.model,
    data: cats.map((c) => m.by_category?.[c]?.accuracy || 0),
    backgroundColor: `hsla(${i * 50}, 55%, 55%, 0.7)`,
    borderColor: `hsla(${i * 50}, 55%, 45%, 1)`,
    borderWidth: 1,
    borderRadius: 2,
  }));
  new Chart(ctx, {
    type: 'bar',
    data: { labels: cats.map((c) => categoryLabel(c)), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8a8a9e', font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#8a8a9e', font: { size: 9 }, maxRotation: 45 }, grid: { color: '#2c2c2f' } },
        y: { beginAtZero: true, max: 100, ticks: { color: '#8a8a9e', callback: (v) => v + '%' }, grid: { color: '#2c2c2f' } },
      },
    },
  });
}

function renderLBDifficultyChart(models) {
  const canvas = document.getElementById('lb-diff-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const diffs = ['easy', 'medium', 'hard'];
  const diffLabels = ['Facile', 'Moyen', 'Difficile'];
  const topModels = models.slice(0, 6);
  const datasets = topModels.map((m, i) => ({
    label: m.model_label || m.model,
    data: diffs.map((d) => m.by_difficulty?.[d]?.accuracy || 0),
    backgroundColor: `hsla(${i * 50}, 55%, 55%, 0.6)`,
    borderColor: `hsla(${i * 50}, 55%, 45%, 1)`,
    borderWidth: 1,
    borderRadius: 2,
  }));
  new Chart(ctx, {
    type: 'bar',
    data: { labels: diffLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8a8a9e', font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: '#8a8a9e', font: { size: 10 } }, grid: { color: '#2c2c2f' } },
        y: { beginAtZero: true, max: 100, ticks: { color: '#8a8a9e', callback: (v) => v + '%' }, grid: { color: '#2c2c2f' } },
      },
    },
  });
}

/* ── Category Podium ──────────────────────────────────── */
function renderCategoryPodium(models) {
  const cats = categoryKeys();
  return cats.map(catKey => {
    const scores = models
      .map(m => ({ name: m.model_label || m.model, score: m.by_category?.[catKey]?.accuracy || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const color = categoryColor(catKey);
    return `
      <div class="podium-item">
        <div class="podium-cat" style="color:${color}">${categoryLabel(catKey)}</div>
        ${scores.map((s, i) => `
          <div class="podium-row ${i === 0 ? 'podium-gold' : ''}">
            <span class="podium-rank">${i + 1}</span>
            <span class="podium-name">${s.name}</span>
            <span class="podium-score">${s.score.toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}
