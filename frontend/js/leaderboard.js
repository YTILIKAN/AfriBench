/* ═══════════════════════════════════════════════════════════
   AfriBench — Leaderboard View (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

let lbSortField = null;
let lbSortDir = 'desc';
let lbFilterType = 'all';

function renderLeaderboard(container) {
  let models = getLatestResults();
  models = applySearchFilter(models);

  // Apply type filter
  if (lbFilterType === 'open') {
    models = models.filter((m) => isOpenModel(m));
  } else if (lbFilterType === 'proprietary') {
    models = models.filter((m) => !isOpenModel(m));
  }

  // Sort
  if (lbSortField) {
    models.sort((a, b) => {
      let va, vb;
      switch (lbSortField) {
        case 'name':
          va = (a.model_label || a.model || '').toLowerCase();
          vb = (b.model_label || b.model || '').toLowerCase();
          return lbSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        case 'score':
          va = a.accuracy || 0;
          vb = b.accuracy || 0;
          break;
        case 'total':
          va = a.total || 0;
          vb = b.total || 0;
          break;
        case 'date':
          va = a.timestamp || '';
          vb = b.timestamp || '';
          break;
        default: return 0;
      }
      return lbSortDir === 'asc' ? va - vb : vb - va;
    });
  }

  // Compute max score for bar widths
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

  // ---- Filter bar ----
  let html = `
    <div class="filter-bar">
      <button class="filter-btn ${lbFilterType === 'all' ? 'active' : ''}" data-filter="all">Tous</button>
      <button class="filter-btn ${lbFilterType === 'open' ? 'active' : ''}" data-filter="open">Open Weights</button>
      <button class="filter-btn ${lbFilterType === 'proprietary' ? 'active' : ''}" data-filter="proprietary">Propriétaire</button>
      <span style="flex:1"></span>
      <span style="font-size:var(--font-size-xs);color:var(--text-muted)">${models.length} modèle${models.length > 1 ? 's' : ''}</span>
    </div>
  `;

  // ---- Table ----
  html += `
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="lb-table">
        <thead>
          <tr>
            <th data-sort="rank" class="${lbSortField === 'rank' ? (lbSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}">
              # <span class="sort-arrows"></span>
            </th>
            <th data-sort="name" class="${lbSortField === 'name' ? (lbSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}">
              Modèle <span class="sort-arrows"></span>
            </th>
            <th data-sort="score" class="${lbSortField === 'score' ? (lbSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}">
              Score <span class="sort-arrows"></span>
            </th>
            <th>Questions</th>
            <th>Facile</th>
            <th>Moyen</th>
            <th>Difficile</th>
            <th data-sort="date" class="${lbSortField === 'date' ? (lbSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}">
              Évalué <span class="sort-arrows"></span>
            </th>
          </tr>
        </thead>
        <tbody>
  `;

  models.forEach((m, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const barWidth = maxScore > 0 ? (m.accuracy / maxScore) * 100 : 0;
    const d = m.by_difficulty || {};
    const easy = d.easy ? `${(d.easy.accuracy || 0).toFixed(1)}%` : '-';
    const med = d.medium ? `${(d.medium.accuracy || 0).toFixed(1)}%` : '-';
    const hard = d.hard ? `${(d.hard.accuracy || 0).toFixed(1)}%` : '-';
    const isOpen = isOpenModel(m);
    const providerIcon = '';
    const providerClass = isOpen ? 'model-icon-open' : 'model-icon-closed';

    html += `
      <tr>
        <td class="rank ${rankClass}">${i + 1}</td>
        <td>
          <div class="model-cell">
            <span class="model-icon ${providerClass}"></span>
            <span class="model-name">${m.model_label || m.model}</span>
            <span class="model-provider">${isOpen ? 'open' : 'propriétaire'}</span>
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
        <td class="metadata">${m.timestamp ? formatDate(m.timestamp) : '-'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // ---- Charts Row ----
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

  container.innerHTML = html;

  // ---- Wire up filters ----
  container.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      lbFilterType = btn.dataset.filter;
      renderLeaderboard(container); // re-render
    });
  });

  // ---- Wire up sort ----
  container.querySelectorAll('[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (lbSortField === field) {
        lbSortDir = lbSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        lbSortField = field;
        lbSortDir = field === 'name' ? 'asc' : 'desc';
      }
      renderLeaderboard(container); // re-render
    });
  });

  // ---- Draw charts ----
  requestAnimationFrame(() => {
    renderLBCategoryChart(models);
    renderLBDifficultyChart(models);
  });
}

/* ── Category Chart ──────────────────────────────────── */
function renderLBCategoryChart(models) {
  const canvas = document.getElementById('lb-cat-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const allCats = new Set();
  models.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => allCats.add(c));
  });
  const cats = Array.from(allCats).sort();

  const datasets = models.slice(0, 6).map((m, i) => {
    const data = cats.map((c) => m.by_category?.[c]?.accuracy || 0);
    return {
      label: m.model_label || m.model,
      data,
      backgroundColor: `hsla(${i * 50}, 55%, 55%, 0.7)`,
      borderColor: `hsla(${i * 50}, 55%, 45%, 1)`,
      borderWidth: 1,
      borderRadius: 2,
    };
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cats.map((c) => categoryLabel(c)),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8a8a9e', font: { size: 10 } } },
      },
      scales: {
        x: {
          ticks: { color: '#8a8a9e', font: { size: 9 }, maxRotation: 45 },
          grid: { color: '#2c2c2f' },
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#8a8a9e', callback: (v) => v + '%' },
          grid: { color: '#2c2c2f' },
        },
      },
    },
  });
}

/* ── Difficulty Chart ────────────────────────────────── */
function renderLBDifficultyChart(models) {
  const canvas = document.getElementById('lb-diff-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const diffs = ['easy', 'medium', 'hard'];
  const diffLabels = ['Facile', 'Moyen', 'Difficile'];
  const diffColors = ['#81C784', '#FFB74D', '#E57373'];

  // Per-model difficulty scores (show top 6)
  const topModels = models.slice(0, 6);

  const datasets = topModels.map((m, i) => {
    const data = diffs.map((d) => m.by_difficulty?.[d]?.accuracy || 0);
    return {
      label: m.model_label || m.model,
      data,
      backgroundColor: `hsla(${i * 50}, 55%, 55%, 0.6)`,
      borderColor: `hsla(${i * 50}, 55%, 45%, 1)`,
      borderWidth: 1,
      borderRadius: 2,
    };
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: diffLabels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8a8a9e', font: { size: 10 } } },
      },
      scales: {
        x: {
          ticks: { color: '#8a8a9e', font: { size: 10 } },
          grid: { color: '#2c2c2f' },
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#8a8a9e', callback: (v) => v + '%' },
          grid: { color: '#2c2c2f' },
        },
      },
    },
  });
}
