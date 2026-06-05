/* ═══════════════════════════════════════════════
   AfriBench — Compare View
   ═══════════════════════════════════════════════ */

function renderCompare(container) {
  const models = getLatestResults();

  if (models.length < 1) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Pas assez de résultats</h3>
          <p>Évaluez au moins un modèle pour utiliser la comparaison.</p>
        </div>
      </div>`;
    return;
  }

  let html = `
    <div class="card">
      <div class="card-title">Comparer les modèles</div>
      <div class="compare-selector">`;

  models.forEach((m) => {
    const checked = models.indexOf(m) < 3 ? 'checked' : '';
    html += `
      <label>
        <input type="checkbox" class="compare-check" value="${models.indexOf(m)}" ${checked}>
        ${m.model_label || m.model}
      </label>`;
  });

  html += `</div>
    <div id="compare-charts">
      <div class="chart-container" style="min-height:300px"><canvas id="compare-radar"></canvas></div>
    </div>
  </div>`;

  container.innerHTML = html;

  // Event listeners for checkboxes
  document.querySelectorAll('.compare-check').forEach((cb) => {
    cb.addEventListener('change', updateCompareChart);
  });

  requestAnimationFrame(updateCompareChart);
}

let compareChartInstance = null;

function updateCompareChart() {
  const canvas = document.getElementById('compare-radar');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const checkboxes = document.querySelectorAll('.compare-check:checked');
  const selected = Array.from(checkboxes).map((cb) => parseInt(cb.value));
  const models = getLatestResults();
  const selectedModels = selected.map((i) => models[i]).filter(Boolean);

  if (selectedModels.length === 0) {
    if (compareChartInstance) compareChartInstance.destroy();
    return;
  }

  // Collect all categories
  const cats = new Set();
  selectedModels.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => cats.add(c));
  });
  const catList = Array.from(cats).sort();

  const datasets = selectedModels.map((m, i) => {
    const data = catList.map((c) => m.by_category?.[c]?.accuracy || 0);
    const hue = (i * 360) / Math.max(selectedModels.length, 1);
    return {
      label: m.model_label || m.model,
      data,
      backgroundColor: `hsla(${hue}, 60%, 55%, 0.1)`,
      borderColor: `hsla(${hue}, 60%, 55%, 0.9)`,
      borderWidth: 2,
      pointBackgroundColor: `hsla(${hue}, 60%, 55%, 1)`,
    };
  });

  if (compareChartInstance) compareChartInstance.destroy();

  compareChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: catList.map((c) => categoryLabel(c)),
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
