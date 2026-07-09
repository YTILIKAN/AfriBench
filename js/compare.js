/* ═══════════════════════════════════════════════════════════
   AfriBench — Compare View (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

let compareChartInstance = null;

function renderCompare(container) {
  const models = getLatestResults();

  if (models.length < 1) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Pas assez de résultats</h3>
          <p>Évaluez au moins un modèle pour utiliser la comparaison.</p>
        </div>
      </div>
    `;
    return;
  }

  // ---- Model selector ----
  let html = `
    <div class="card">
      <div class="card-title">Sélectionner les modèles à comparer</div>
      <div class="compare-selector">
  `;

  models.forEach((m, i) => {
    const name = m.model_label || m.model;
    // Check if this model should be pre-selected
    let checked = i < 3 && !AppState.comparePreset;
    if (AppState.comparePreset && name === AppState.comparePreset) {
      checked = true;
    }
    html += `
      <label>
        <input type="checkbox" class="compare-check" value="${i}" ${checked ? 'checked' : ''}>
        <span>${name}</span>
        <span style="color:var(--ocre);font-family:var(--mono);font-size:0.68rem">${m.accuracy}%</span>
      </label>
    `;
  });

  // Clear preset after use
  AppState.comparePreset = null;

  html += `
      </div>
    </div>
  `;

  // ---- Radar comparison ----
  html += `
    <div class="card">
      <div class="card-title">Comparaison par catégorie</div>
      <div class="chart-container" style="min-height:350px">
        <canvas id="compare-radar"></canvas>
      </div>
    </div>
  `;

  // ---- Side-by-side table ----
  html += `
    <div class="card">
      <div class="card-title">Détail des scores</div>
      <div class="compare-table" id="compare-table-detail">
  `;

  // Build the detail comparison table
  const selected = models.slice(0, 3); // default: top 3
  const cats = new Set();
  selected.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => cats.add(c));
  });
  const catList = Array.from(cats).sort();

  html += '<table class="lb-table"><thead><tr><th>Catégorie</th>';
  selected.forEach((m) => {
    html += `<th style="text-align:center">${m.model_label || m.model}</th>`;
  });
  html += '</tr></thead><tbody>';

  catList.forEach((cat) => {
    html += `<tr><td style="color:${categoryColor(cat)}">${categoryLabel(cat)}</td>`;
    selected.forEach((m) => {
      const score = m.by_category?.[cat]?.accuracy;
      const val = score !== undefined ? score.toFixed(1) + '%' : '-';
      const highlight = score >= 90 ? 'style="color:var(--ocre);font-weight:600"' : '';
      html += `<td style="text-align:center;font-family:var(--mono)" ${highlight}>${val}</td>`;
    });
    html += '</tr>';
  });

  // Overall row
  html += `<tr style="border-top:2px solid var(--sable-d)">
    <td style="font-weight:600;color:var(--ocre)">Score global</td>`;
  selected.forEach((m) => {
    html += `<td style="text-align:center;font-family:var(--mono);font-weight:700;color:var(--ocre)">${m.accuracy}%</td>`;
  });
  html += '</tr>';

  html += '</tbody></table></div></div>';

  container.innerHTML = html;

  // Wire up checkboxes
  document.querySelectorAll('.compare-check').forEach((cb) => {
    cb.addEventListener('change', updateCompare);
  });

  requestAnimationFrame(updateCompare);
}

function updateCompare() {
  const canvas = document.getElementById('compare-radar');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const checkboxes = document.querySelectorAll('.compare-check:checked');
  const indices = Array.from(checkboxes).map((cb) => parseInt(cb.value));
  const models = getLatestResults();
  const selected = indices.map((i) => models[i]).filter(Boolean);

  if (selected.length === 0) {
    if (compareChartInstance) compareChartInstance.destroy();
    return;
  }

  // Collect categories
  const cats = new Set();
  selected.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => cats.add(c));
  });
  const catList = Array.from(cats).sort();

  const datasets = selected.map((m, i) => {
    const data = catList.map((c) => m.by_category?.[c]?.accuracy || 0);
    const hue = (i * 360) / Math.max(selected.length, 1);
    return {
      label: `${m.model_label || m.model} (${m.accuracy}%)`,
      data,
      backgroundColor: `hsla(${hue}, 60%, 55%, 0.08)`,
      borderColor: `hsla(${hue}, 60%, 55%, 0.9)`,
      borderWidth: 2,
      pointBackgroundColor: `hsla(${hue}, 60%, 55%, 1)`,
      pointRadius: 4,
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

  // Update detail table
  updateCompareTable(selected, catList);
}

function updateCompareTable(selected, catList) {
  const container = document.getElementById('compare-table-detail');
  if (!container) return;

  let html = '<table class="lb-table"><thead><tr><th>Catégorie</th>';
  selected.forEach((m) => {
    html += `<th style="text-align:center">${m.model_label || m.model}</th>`;
  });
  html += '</tr></thead><tbody>';

  catList.forEach((cat) => {
    html += `<tr><td style="color:${categoryColor(cat)}">${categoryLabel(cat)}</td>`;
    selected.forEach((m) => {
      const score = m.by_category?.[cat]?.accuracy;
      const val = score !== undefined ? score.toFixed(1) + '%' : '-';
      const style = score >= 90 ? 'style="color:var(--ocre);font-weight:600"' : 'style="font-family:var(--mono)"';
      html += `<td style="text-align:center" ${style}>${val}</td>`;
    });
    html += '</tr>';
  });

  // Overall row
  html += `<tr style="border-top:2px solid var(--sable-d)">
    <td style="font-weight:600;color:var(--ocre)">Score global</td>`;
  selected.forEach((m) => {
    html += `<td style="text-align:center;font-family:var(--mono);font-weight:700;color:var(--ocre)">${m.accuracy}%</td>`;
  });
  html += '</tr>';

  html += '</tbody></table>';
  container.innerHTML = html;
}
