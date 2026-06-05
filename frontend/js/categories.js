/* ═══════════════════════════════════════════════
   AfriBench — Categories View
   ═══════════════════════════════════════════════ */

function renderCategories(container) {
  const models = getLatestResults();

  if (models.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Pas encore de résultats</h3>
          <p>Les performances par catégorie apparaîtront après la première évaluation.</p>
        </div>
      </div>`;
    return;
  }

  // Collect all categories
  const allCats = new Set();
  models.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => allCats.add(c));
  });
  const cats = Array.from(allCats).sort();

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

  let html = `
    <div class="card">
      <div class="card-title">Scores par categorie</div>
      <div class="chart-container" style="min-height:350px"><canvas id="cat-detail-chart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">Meilleur modele par categorie</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">`;

  cats.forEach((c) => {
    const bp = bestPerCategory[c];
    const color = categoryColor(c);
    html += `
      <div style="background:var(--bg-primary);border:1px solid var(--border-light);border-radius:8px;padding:16px">
        <div style="font-size:0.75rem;color:${color};font-weight:600;margin-bottom:4px">${categoryLabel(c)}</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--bronze)">${bp.score >= 0 ? bp.score.toFixed(1) + '%' : '-'}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">${bp.model ? bp.model.model_label || bp.model.model : '-'}</div>
      </div>`;
  });

  html += `</div></div>`;

  container.innerHTML = html;

  requestAnimationFrame(() => renderCategoryDetailChart(models, cats));
}

function renderCategoryDetailChart(models, categories) {
  const canvas = document.getElementById('cat-detail-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const topModels = models.slice(0, 5);

  const datasets = topModels.map((m, i) => {
    const data = categories.map((c) => m.by_category?.[c]?.accuracy || 0);
    const hue = i * 45;
    return {
      label: m.model_label || m.model,
      data,
      backgroundColor: `hsla(${hue}, 55%, 55%, 0.15)`,
      borderColor: `hsla(${hue}, 55%, 55%, 0.9)`,
      borderWidth: 2,
      pointBackgroundColor: `hsla(${hue}, 55%, 55%, 1)`,
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
          labels: { color: '#A8A6B8', font: { size: 11 } },
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
          grid: { color: '#1E1C3A' },
          angleLines: { color: '#1E1C3A' },
          pointLabels: { color: '#A8A6B8', font: { size: 11 } },
        },
      },
    },
  });
}
