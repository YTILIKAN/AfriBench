/* ═══════════════════════════════════════════════
   AfriBench — Leaderboard View
   ═══════════════════════════════════════════════ */

function renderLeaderboard(container) {
  const models = getLatestResults();
  const maxScore = models.length > 0 ? Math.max(...models.map((m) => m.accuracy)) : 100;

  if (models.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Aucun resultat pour le moment</h3>
          <p>Lancez une evaluation depuis votre terminal :</p>
          <p><code>python scripts/afribench.py run</code></p>
          <p style="margin-top:12px">Les resultats apparaitront ici automatiquement.</p>
        </div>
      </div>`;
    return;
  }

  let html = `
    <div class="card">
      <div class="card-title">Classement des modeles</div>
      <table class="lb-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Modele</th>
            <th>Score</th>
            <th>Questions</th>
            <th>Facile</th>
            <th>Moyen</th>
            <th>Difficile</th>
          </tr>
        </thead>
        <tbody>`;

  models.forEach((m, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const barWidth = maxScore > 0 ? (m.accuracy / maxScore) * 100 : 0;
    const d = m.by_difficulty || {};
    const easy = d.easy ? `${d.easy.accuracy || 0}%` : '-';
    const med = d.medium ? `${d.medium.accuracy || 0}%` : '-';
    const hard = d.hard ? `${d.hard.accuracy || 0}%` : '-';

    html += `
      <tr>
        <td class="rank ${rankClass}">${i + 1}</td>
        <td class="model-name">${m.model_label || m.model}</td>
        <td>
          <span class="score-bar" style="width:${barWidth}%"></span>
          <span class="score">${m.accuracy}%</span>
        </td>
        <td class="correct">${m.correct}/${m.total}</td>
        <td>${easy}</td>
        <td>${med}</td>
        <td>${hard}</td>
      </tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>`;

  // Category breakdown summary
  if (models.length > 0) {
    html += `<div class="card"><div class="card-title">Performance par categorie</div><div class="chart-container"><canvas id="cat-chart"></canvas></div></div>`;
    html += `<div class="card"><div class="card-title">Performance par difficulte</div><div class="chart-container"><canvas id="diff-chart"></canvas></div></div>`;
  }

  container.innerHTML = html;

  if (models.length > 0) {
    // Use requestAnimationFrame to let DOM render before Chart.js
    requestAnimationFrame(() => {
      renderCategoryChart(models);
      renderDifficultyChart(models);
    });
  }
}

/* ── Category Chart ──────────────────────── */
function renderCategoryChart(models) {
  const canvas = document.getElementById('cat-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Collect all categories across all models
  const allCats = new Set();
  models.forEach((m) => {
    if (m.by_category) Object.keys(m.by_category).forEach((c) => allCats.add(c));
  });
  const cats = Array.from(allCats).sort();

  // Build datasets: one per model, one bar per category
  const datasets = models.slice(0, 6).map((m, i) => {
    const catData = cats.map((c) => {
      const info = m.by_category?.[c];
      return info ? info.accuracy : 0;
    });
    return {
      label: m.model_label || m.model,
      data: catData,
      backgroundColor: `hsla(${i * 50}, 60%, 60%, 0.8)`,
      borderColor: `hsla(${i * 50}, 60%, 50%, 1)`,
      borderWidth: 1,
      borderRadius: 3,
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
        legend: {
          labels: { color: '#A8A6B8', font: { size: 11 } },
        },
      },
      scales: {
        x: {
          ticks: { color: '#A8A6B8', font: { size: 10 } },
          grid: { color: '#1E1C3A' },
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#A8A6B8', callback: (v) => v + '%' },
          grid: { color: '#1E1C3A' },
        },
      },
    },
  });
}

/* ── Difficulty Chart ─────────────────────── */
function renderDifficultyChart(models) {
  const canvas = document.getElementById('diff-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const diffs = ['easy', 'medium', 'hard'];
  const diffLabels = ['Facile', 'Moyen', 'Difficile'];
  const diffColors = ['#81C784', '#FFB74D', '#E57373'];

  // Average accuracy per difficulty across all models
  const avgData = diffs.map((d) => {
    const vals = models
      .map((m) => m.by_difficulty?.[d]?.accuracy)
      .filter((v) => v !== undefined);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: diffLabels,
      datasets: [
        {
          label: 'Moyenne des modeles',
          data: avgData,
          backgroundColor: diffColors.map((c) => c + 'CC'),
          borderColor: diffColors,
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: '#A8A6B8', font: { size: 12 } },
          grid: { color: '#1E1C3A' },
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#A8A6B8', callback: (v) => v + '%' },
          grid: { color: '#1E1C3A' },
        },
      },
    },
  });
}
