/* ═══════════════════════════════════════════════════════════
   AfriBench — Évolution page (timeline chart)
   ═══════════════════════════════════════════════════════════ */

const { AppState, getLatestResults, escapeHtml, mountChart, chartTheme, chartSeriesColor } = globalThis;

let evoSelectedModels = new Set();

function renderEvolution(container) {
  const models = getLatestResults();
  if (models.length === 0) {
    container.innerHTML = `<div class="card"><div class="empty-state"><h3>Aucune donnee</h3><p>Les donnees ne sont pas encore chargees.</p></div></div>`;
    return;
  }

  // By default select all models if none selected
  if (evoSelectedModels.size === 0) {
    models.forEach(m => evoSelectedModels.add(m.model_label || m.model));
  }

  // Build timeline data from results (group by date per model)
  const timelineData = buildTimelineData();

  const modelList = models.map(m => m.model_label || m.model);
  const chartLabels = getSortedDates(timelineData);

  const datasets = modelList.filter(name => evoSelectedModels.has(name)).map((name, idx) => {
    const points = timelineData[name] || [];
    const fullData = chartLabels.map(date => {
      const pt = points.find(p => p.date === date);
      return pt ? pt.accuracy : null;
    });
    const series = chartSeriesColor(idx);
    return {
      label: name,
      data: fullData,
      borderColor: series.border,
      backgroundColor: series.bg.replace(/[\d.]+\)$/, '0.12)'),
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      spanGaps: true,
      tension: 0.2,
    };
  });

  container.innerHTML = `
    <div class="evolution-header">
      <h2>Evolution des scores</h2>
      <p>Suivez la progression des modèles dans le temps. Selectionnez les modèles a comparer.</p>
    </div>

    <div class="evolution-controls" id="evo-selectors">
      ${modelList.map(name => `
        <label>
          <input type="checkbox" value="${escapeHtml(name)}" ${evoSelectedModels.has(name) ? 'checked' : ''}>
          <span>${escapeHtml(name)}</span>
        </label>
      `).join('')}
      <button class="filter-btn" id="evo-select-all">Tout</button>
      <button class="filter-btn" id="evo-deselect-all">Aucun</button>
    </div>

    <div class="evolution-chart-container">
      <canvas id="evolution-chart"></canvas>
    </div>

    <div class="card">
      <div class="card-title">
        Évolution detaillee
        <span class="count-badge">${chartLabels.length} dates</span>
      </div>
      <div class="evolution-table-wrap">
        ${renderEvolutionTable(timelineData, modelList)}
      </div>
    </div>
  `;

  // Wire up checkboxes
  container.querySelectorAll('#evo-selectors input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        evoSelectedModels.add(cb.value);
      } else {
        evoSelectedModels.delete(cb.value);
      }
      renderEvolution(container);
    });
  });

  document.getElementById('evo-select-all')?.addEventListener('click', () => {
    modelList.forEach(n => evoSelectedModels.add(n));
    renderEvolution(container);
  });

  document.getElementById('evo-deselect-all')?.addEventListener('click', () => {
    evoSelectedModels.clear();
    renderEvolution(container);
  });

  // Draw chart
  const canvas = document.getElementById('evolution-chart');
  if (canvas && datasets.length > 0) {
    const theme = chartTheme();
    mountChart(canvas, {
      type: 'line',
      data: { labels: chartLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.tick, font: { size: 10 }, padding: 16, usePointStyle: true, pointStyle: 'circle' },
          },
          tooltip: {
            backgroundColor: '#0f0f1a',
            borderColor: '#2c2c2f',
            borderWidth: 1,
            titleColor: '#ffffff',
            bodyColor: '#ebebeb',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.parsed.y !== null ? item.parsed.y.toFixed(1) + '%' : '—'}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: theme.grid },
            ticks: { color: theme.tick, font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: theme.grid },
            ticks: { color: theme.tick, font: { size: 10 }, callback: (v) => v + '%' },
          },
        },
      },
    });
  }
}

function buildTimelineData() {
  const map = {};

  for (const r of AppState.results) {
    const name = r.model_label || r.model;
    if (!name) continue;
    if (!map[name]) map[name] = [];

    const date = r.timestamp ? r.timestamp.slice(0, 10) : 'unknown';
    const existing = map[name].find(p => p.date === date);
    if (!existing) {
      map[name].push({
        date,
        accuracy: r.accuracy || 0,
        correct: r.correct || 0,
        total: r.total || 0,
      });
    }
  }

  return map;
}

function getSortedDates(timelineData) {
  const allDates = new Set();
  Object.values(timelineData).forEach(points => {
    points.forEach(p => allDates.add(p.date));
  });
  return [...allDates].sort();
}

function renderEvolutionTable(timelineData, modelList) {
  // For each model, compute first and last score
  let html = `
    <table class="evolution-table">
      <thead>
        <tr>
          <th>Modele</th>
          <th>Premier score</th>
          <th>Score actuel</th>
          <th>Evolution</th>
          <th>Nb d'evaluations</th>
        </tr>
      </thead>
      <tbody>
  `;

  modelList.forEach(name => {
    const points = (timelineData[name] || []).sort((a, b) => a.date.localeCompare(b.date));
    if (points.length === 0) return;

    const first = points[0];
    const last = points[points.length - 1];
    const delta = last.accuracy - first.accuracy;
    const deltaClass = delta > 0 ? 'evo-delta-pos' : (delta < 0 ? 'evo-delta-neg' : 'evo-delta-neutral');
    const deltaStr = delta > 0 ? `+${delta.toFixed(1)}%` : (delta < 0 ? `${delta.toFixed(1)}%` : '—');

    html += `
      <tr>
        <td><span class="evo-model-name">${escapeHtml(name)}</span></td>
        <td>${first.date} — ${first.accuracy.toFixed(1)}%</td>
        <td>${last.date} — ${last.accuracy.toFixed(1)}%</td>
        <td class="${deltaClass}">${deltaStr}</td>
        <td>${points.length}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  return html;
}

globalThis.renderEvolution = renderEvolution;
export {};
