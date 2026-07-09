/* ═══════════════════════════════════════════════════════════
   AfriBench — Categories View (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

let categoryFilter = null;

// Expose for sidebar
window.__categoryFilter = (cat) => {
  categoryFilter = cat;
  const container = document.getElementById('tab-content');
  if (container && AppState.activeTab === 'categories') {
    renderCategories(container);
  }
};

function renderCategories(container) {
  const models = getLatestResults();

  if (models.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Pas encore de résultats</h3>
          <p>Les performances par catégorie apparaîtront après la première évaluation.</p>
        </div>
      </div>
    `;
    return;
  }

  // Collect all categories
  const allCats = new Set();
  models.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => allCats.add(c));
  });
  let cats = Array.from(allCats).sort();

  // Apply sidebar filter
  if (categoryFilter) {
    cats = cats.filter((c) => c === categoryFilter);
  }

  // Best model per category
  const bestPerCategory = {};
  cats.forEach((c) => {
    let best = null;
    let bestScore = -1;
    models.forEach((m) => {
      const info = m.by_category?.[c];
      if (info && info.accuracy > bestScore) {
        bestScore = info.accuracy;
        best = m;
      }
    });
    bestPerCategory[c] = { model: best, score: bestScore };
  });

  // ---- Filter bar ----
  const allCatsList = Array.from(allCats).sort();
  let html = `
    <div class="filter-bar">
      <button class="filter-btn ${!categoryFilter ? 'active' : ''}" data-cat="all">Toutes</button>
      ${allCatsList.map((c) => `
        <button class="filter-btn ${categoryFilter === c ? 'active' : ''}" data-cat="${c}">${categoryLabel(c)}</button>
      `).join('')}
    </div>
  `;

  // ---- Category cards grid ----
  html += `
    <div class="grid-auto">
  `;

  cats.forEach((c) => {
    const bp = bestPerCategory[c];
    const color = categoryColor(c);
    html += `
      <div class="cat-card">
        <div class="cat-label" style="color:${color}">${categoryLabel(c)}</div>
        <div class="cat-score">${bp.score >= 0 ? bp.score.toFixed(1) + '%' : '-'}</div>
        <div class="cat-model">${bp.model ? bp.model.model_label || bp.model.model : '-'}</div>
      </div>
    `;
  });

  html += `</div>`;

  // ---- Radar Chart ----
  html += `
    <div class="card" style="margin-top:var(--sp-md)">
      <div class="card-title">Comparaison radar par catégorie</div>
      <div class="chart-container" style="min-height:350px">
        <canvas id="cat-radar-chart"></canvas>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Wire up filter chips
  container.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryFilter = btn.dataset.cat === 'all' ? null : btn.dataset.cat;
      renderCategories(container);
    });
  });

  requestAnimationFrame(() => renderCategoryRadar(models, cats));
}

function renderCategoryRadar(models, categories) {
  const canvas = document.getElementById('cat-radar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const topModels = models.slice(0, 5);

  const datasets = topModels.map((m, i) => {
    const data = categories.map((c) => m.by_category?.[c]?.accuracy || 0);
    const hue = i * 72;
    return {
      label: m.model_label || m.model,
      data,
      backgroundColor: `hsla(${hue}, 55%, 55%, 0.08)`,
      borderColor: `hsla(${hue}, 55%, 55%, 0.9)`,
      borderWidth: 2,
      pointBackgroundColor: `hsla(${hue}, 55%, 55%, 1)`,
      pointRadius: 3,
      tension: 0.3,
    };
  });

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: categories.map((c) => categoryLabel(c)),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#8a8a9e', font: { size: 10 } },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#6B6980',
            backdropColor: 'transparent',
            font: { size: 9 },
            stepSize: 25,
          },
          grid: { color: '#2c2c2f' },
          angleLines: { color: '#2c2c2f' },
          pointLabels: {
            color: '#ebebeb',
            font: { size: 10 },
          },
        },
      },
    },
  });
}
