/* ═══════════════════════════════════════════════════════════
   AfriBench — Tâches ouvertes (non-QCM) — issue #15
   ═══════════════════════════════════════════════════════════ */

const { AppState, escapeHtml } = globalThis;

const TASK_LABELS = {
  open_generation: 'Génération ouverte',
  open_qa: 'QA ouverte',
  translation: 'Traduction',
  summarization: 'Résumé',
  ner: 'NER',
  sentiment: 'Sentiment',
};

async function ensureOpenScores() {
  if (AppState.openScores) return AppState.openScores;
  try {
    const apiBase = globalThis.getApiBase ? globalThis.getApiBase() : '/api/v1';
    AppState.openScores = await fetch(`${apiBase}/open/scores`).then((r) => r.json());
  } catch {
    try {
      AppState.openScores = await fetch('data/open_scores.json').then((r) => r.json());
    } catch {
      AppState.openScores = { dry_run: true, tasks: {}, models: [] };
    }
  }
  return AppState.openScores;
}

async function renderOpenTasks(container) {
  const scores = await ensureOpenScores();
  const tasks = scores.tasks || {};
  const taskKeys = Object.keys(tasks);

  let html = `
    <div class="card">
      <div class="card-title">
        Tâches ouvertes (non-QCM)
        ${scores.dry_run ? '<span class="count-badge">dry-run</span>' : ''}
      </div>
      <p style="font-size:0.85rem;color:var(--muted);margin-bottom:16px">
        Traduction, résumé, QA, NER et sentiment.
        Source : <code>eval_open_tasks.py</code>${scores.dry_run ? ' · score indicatif' : ''}.
      </p>
    </div>
  `;

  if (taskKeys.length === 0) {
    html += `
      <div class="card">
        <div class="empty-state">
          <h3>Aucun score disponible</h3>
          <p>Exécutez le pipeline d'évaluation.</p>
        </div>
      </div>`;
    container.innerHTML = html;
    return;
  }

  html += '<div class="card"><div class="lb-table-wrap"><table class="lb-table">';
  html += '<thead><tr><th>Tâche</th><th>N</th><th>Métrique</th><th>Moyenne</th></tr></thead><tbody>';
  for (const key of taskKeys) {
    const t = tasks[key];
    html += `<tr>
      <td>${escapeHtml(TASK_LABELS[key] || key)}</td>
      <td>${t.n || '—'}</td>
      <td><code>${escapeHtml(t.metric || '—')}</code></td>
      <td>${t.average != null ? (t.average * 100).toFixed(1) + '%' : '—'}</td>
    </tr>`;
  }
  html += '</tbody></table></div></div>';

  html += `
    <div class="card">
      <div class="card-title">Pipeline</div>
      <ol style="font-size:0.85rem;color:var(--muted);padding-left:1.2rem">
        <li>Éditer les pilotes dans <code>data/questions/v1/open/</code></li>
        <li><code>python scripts/eval_open_tasks.py --dry-run</code></li>
        <li><code>python scripts/aggregate_open_scores.py</code></li>
        <li>API : <code>GET /api/v1/open/scores</code></li>
      </ol>
    </div>`;

  container.innerHTML = html;
}

globalThis.renderOpenTasks = renderOpenTasks;
export {};
