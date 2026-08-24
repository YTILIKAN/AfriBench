/* ═══════════════════════════════════════════════════════════
   AfriBench — Compare View (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

const {
  AppState, getLatestResults, categoryLabel,
  escapeHtml, mountChart, chartTheme, chartSeriesColor,
} = globalThis;

function renderCompare(container) {
  const models = getLatestResults();

  if (models.length < 1) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Pas assez de résultats</h3>
          <p>Un modèle minimum est requis.</p>
        </div>
      </div>
    `;
    return;
  }

  // ---- Model selector ----
  let html = `
    <div class="card">
      <div class="card-title">Modèles à comparer</div>
      <div class="compare-selector">
  `;

  // Arriver depuis le bouton « Comparer » d'une fiche modèle présélectionnait ce
  // seul modèle, produisant une « comparaison » à un élément. On garde le modèle
  // demandé et on lui adjoint les deux meilleurs autres, pour qu'il y ait
  // toujours quelque chose à comparer.
  const preset = AppState.comparePreset;
  const companions = new Set(
    models
      .filter((m) => (m.model_label || m.model) !== preset)
      .slice(0, preset ? 2 : 3)
      .map((m) => m.model_label || m.model),
  );

  models.forEach((m, i) => {
    const name = m.model_label || m.model;
    const checked = name === preset || companions.has(name);
    html += `
      <label>
        <input type="checkbox" class="compare-check" value="${i}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(name)}</span>
        <span style="color:var(--ocre-ink);font-family:var(--mono);font-size:0.68rem">${m.accuracy}%</span>
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

  // Conteneur du tableau de détail. Il est volontairement laissé vide : c'est
  // updateCompare(), appelé juste après, qui le remplit en fonction des modèles
  // réellement cochés. Le construire ici en dupliquant la logique produisait un
  // tableau « top 3 » aussitôt écrasé, et deux implémentations à maintenir.
  html += `
    <div class="card">
      <div class="card-title">Détail des scores</div>
      <div class="compare-table" id="compare-table-detail"></div>
    </div>
  `;

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

  const theme = chartTheme();
  const checkboxes = document.querySelectorAll('.compare-check:checked');
  const indices = Array.from(checkboxes).map((cb) => parseInt(cb.value, 10));
  const models = getLatestResults();
  const selected = indices.map((i) => models[i]).filter(Boolean);

  if (selected.length === 0) {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
    updateCompareTable([], []);
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
    const series = chartSeriesColor(i);
    return {
      label: `${m.model_label || m.model} (${m.accuracy}%)`,
      data,
      backgroundColor: series.bg.replace(/[\d.]+\)$/, '0.10)'),
      borderColor: series.border,
      borderDash: series.dash,
      borderWidth: 2,
      pointBackgroundColor: series.border,
      pointBorderColor: series.border,
      pointStyle: ['circle', 'rectRot', 'triangle', 'rect', 'star', 'crossRot'][i % 6],
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  mountChart(canvas, {
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
          labels: {
            color: theme.tick,
            font: { size: 10 },
            usePointStyle: true,
            pointStyleWidth: 14,
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: theme.tick,
            backdropColor: 'transparent',
            font: { size: 9 },
            stepSize: 25,
          },
          grid: { color: theme.grid },
          angleLines: { color: theme.grid },
          pointLabels: {
            color: theme.label,
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

  if (selected.length === 0) {
    container.innerHTML = '<p style="padding:16px;font-size:0.85rem;color:var(--muted)">Sélectionnez un modèle.</p>';
    return;
  }

  let html = '<table class="lb-table">'
    + '<caption class="sr-only">Scores par catégorie pour les modèles sélectionnés.</caption>'
    + '<thead><tr><th scope="col">Catégorie</th>';
  selected.forEach((m) => {
    html += `<th scope="col" style="text-align:center">${escapeHtml(m.model_label || m.model)}</th>`;
  });
  html += '</tr></thead><tbody>';

  catList.forEach((cat) => {
    html += `<tr><td class="compare-category">${escapeHtml(categoryLabel(cat))}</td>`;
    selected.forEach((m) => {
      const score = m.by_category?.[cat]?.accuracy;
      const val = score !== undefined ? `${score.toFixed(1)  }%` : '-';
      const style = score >= 90 ? 'style="color:var(--ocre-ink);font-weight:600"' : 'style="font-family:var(--mono)"';
      html += `<td style="text-align:center" ${style}>${val}</td>`;
    });
    html += '</tr>';
  });

  // Overall row
  html += `<tr style="border-top:2px solid var(--sable-d)">
    <td style="font-weight:600;color:var(--ocre-ink)">Score global</td>`;
  selected.forEach((m) => {
    html += `<td style="text-align:center;font-family:var(--mono);font-weight:700;color:var(--ocre-ink)">${m.accuracy}%</td>`;
  });
  html += '</tr>';

  html += '</tbody></table>';
  container.innerHTML = html;
}

globalThis.renderCompare = renderCompare;
export {};
