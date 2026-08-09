/* ═══════════════════════════════════════════════════════════
   AfriBench — Fiabilité (contamination, IC, scores ouverts)
   ═══════════════════════════════════════════════════════════ */

function renderReliability(container) {
  const contam = AppState.contamination || { noise: [], permute: [] };
  const stats = AppState.stats || { models: [] };
  const openScores = AppState.openScores || [];

  let html = `
    <div class="card">
      <div class="card-title">Fiabilité & audit du benchmark</div>
      <p style="color:var(--text-muted);font-size:13px;line-height:1.6;margin:0">
        Ces analyses évaluent la <strong>crédibilité</strong> des scores : détection de
        contamination (mémorisation positionnelle), incertitude statistique (intervalles de
        confiance) et scores aux questions ouvertes (LLM-as-judge). Données produites par
        <code style="font-family:var(--font-mono)">scripts/contamination.py</code>,
        <code style="font-family:var(--font-mono)">scripts/stats.py</code> puis
        <code style="font-family:var(--font-mono)">export_frontend.py</code>.
      </p>
    </div>
  `;

  html += renderContaminationSection(contam);
  html += renderCISection(stats);
  html += renderOpenSection(openScores);

  container.innerHTML = html;
}

/* ── 1. Contamination : flip vs bruit de base ─────────────── */
function renderContaminationSection(contam) {
  const permute = contam.permute || [];
  const noise = contam.noise || [];

  if (permute.length === 0) {
    return emptyCard(
      'Contamination — sonde de permutation d’options',
      'Aucun run de permutation pour l’instant. Lancez : ' +
      '<code style="font-family:var(--font-mono)">python scripts/contamination.py permute --model … --category … --per-category 6</code> ' +
      '(et <code style="font-family:var(--font-mono)">noise</code> pour le bruit de base), puis ' +
      '<code style="font-family:var(--font-mono)">python scripts/export_frontend.py</code>.'
    );
  }

  // Index du bruit de base par modèle -> {cat: baseline_flip_rate}
  const noiseByModel = {};
  noise.forEach((r) => {
    const bycat = {};
    Object.entries(r.by_category || {}).forEach(([c, v]) => { bycat[c] = v.baseline_flip_rate; });
    noiseByModel[r.model] = bycat;
  });

  let rows = '';
  permute.forEach((r) => {
    const label = r.model_label || r.model;
    const baselineCats = noiseByModel[r.model] || {};
    Object.entries(r.by_category || {})
      .sort((a, b) => (b[1].flip_rate || 0) - (a[1].flip_rate || 0))
      .forEach(([cat, v]) => {
        const baseline = baselineCats[cat];
        const verdict = flipVerdict(v.flip_rate, baseline);
        rows += `
          <tr>
            <td>${label}</td>
            <td><span class="rl-dot" style="background:${categoryColor(cat)}"></span>${categoryLabel(cat)}</td>
            <td class="rl-num">${fmtPct(v.orig_accuracy)}</td>
            <td class="rl-num">${fmtPct(v.flip_rate)}</td>
            <td class="rl-num">${baseline == null ? '—' : fmtPct(baseline)}</td>
            <td><span class="rl-badge" style="background:${verdict.bg};color:${verdict.fg}">${verdict.label}</span></td>
            <td class="rl-num rl-muted">${v.n ?? '—'}</td>
          </tr>
        `;
      });
  });

  return `
    <div class="card" style="margin-top:var(--space-2)">
      <div class="card-title">Contamination — flip d’options vs bruit de base</div>
      <p style="color:var(--text-muted);font-size:12px;margin:0 0 12px">
        Un <strong>flip</strong> élevé sur une catégorie à haute précision suggère une mémorisation
        positionnelle. Il n’est un signal que s’il dépasse nettement le <strong>bruit de base</strong>
        de l’API (colonne « Bruit »). Signal exploratoire — la contamination est une propriété
        paire (dataset × modèle), un seul modèle ne prouve rien globalement.
      </p>
      <div class="rl-table-wrap">
        <table class="rl-table">
          <thead><tr>
            <th>Modèle</th><th>Catégorie</th><th>Précis. orig.</th><th>Flip</th>
            <th>Bruit</th><th>Verdict</th><th>n</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function flipVerdict(flip, baseline) {
  if (baseline == null) return { label: 'sans bruit', bg: 'var(--surface-muted)', fg: 'var(--text-muted)' };
  const margin = (flip || 0) - baseline;
  if (margin >= 15) return { label: 'signal', bg: '#E5737322', fg: '#E57373' };
  if (margin <= 5) return { label: 'bruit', bg: 'var(--surface-muted)', fg: 'var(--text-muted)' };
  return { label: 'à surveiller', bg: '#FFB74D22', fg: '#FFB74D' };
}

/* ── 2. Intervalles de confiance (bootstrap + Wilson) ─────── */
function renderCISection(stats) {
  const models = stats.models || [];
  if (models.length === 0) {
    return emptyCard(
      'Intervalles de confiance (bootstrap + Wilson)',
      'Aucun rapport bootstrap. Lancez : ' +
      '<code style="font-family:var(--font-mono)">python scripts/stats.py bootstrap --results …</code> ' +
      'puis <code style="font-family:var(--font-mono)">export_frontend.py</code>.'
    );
  }

  let rows = '';
  models.forEach((m) => {
    const label = m.model_label || m.model;
    rows += `
      <tr class="rl-group">
        <td>${label}</td><td><strong>Global</strong></td>
        <td class="rl-num">${fmtPct(m.accuracy)}</td>
        <td class="rl-num rl-muted">${ci(m.ci_low, m.ci_high)}</td>
        <td class="rl-num">${ci(m.wilson_low, m.wilson_high)}</td>
        <td class="rl-num rl-muted">${m.n ?? '—'}</td>
      </tr>
    `;
    Object.entries(m.by_category || {}).sort().forEach(([cat, c]) => {
      const wide = (c.wilson_high - c.wilson_low) >= 30;
      rows += `
        <tr>
          <td></td>
          <td><span class="rl-dot" style="background:${categoryColor(cat)}"></span>${categoryLabel(cat)}</td>
          <td class="rl-num">${fmtPct(c.accuracy)}</td>
          <td class="rl-num rl-muted">${ci(c.ci_low, c.ci_high)}</td>
          <td class="rl-num">${ci(c.wilson_low, c.wilson_high)}${wide ? ' <span class="rl-badge" style="background:#FFB74D22;color:#FFB74D">incertain</span>' : ''}</td>
          <td class="rl-num rl-muted">${c.n ?? '—'}</td>
        </tr>
      `;
    });
  });

  return `
    <div class="card" style="margin-top:var(--space-2)">
      <div class="card-title">Intervalles de confiance à 95 %</div>
      <p style="color:var(--text-muted);font-size:12px;margin:0 0 12px">
        Au bord (100 %/0 %) le <strong>bootstrap</strong> s’effondre (ex. 6/6 → [100–100], faussement
        certain) ; l’intervalle de <strong>Wilson</strong> reste honnête (6/6 → ~[61–100]). Fiez-vous
        à Wilson pour les catégories à 100 %.
      </p>
      <div class="rl-table-wrap">
        <table class="rl-table">
          <thead><tr>
            <th>Modèle</th><th>Portée</th><th>Score</th><th>Bootstrap</th><th>Wilson</th><th>n</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

/* ── 3. Scores ouverts (LLM-as-judge) ─────────────────────── */
function renderOpenSection(openScores) {
  if (!openScores || openScores.length === 0) {
    return emptyCard(
      'Questions ouvertes (LLM-as-judge)',
      'Aucun score ouvert. Lancez : ' +
      '<code style="font-family:var(--font-mono)">python scripts/afribench.py run-open --model …</code> ' +
      'puis <code style="font-family:var(--font-mono)">export_frontend.py</code>.'
    );
  }

  const judge = openScores[0].judge_model || '—';
  const version = openScores[0].judge_version || '—';

  let cards = '';
  openScores.forEach((m) => {
    cards += `
      <div class="cat-card">
        <div class="cat-label">${m.model_label || m.model}</div>
        <div class="cat-score">${m.mean_score != null ? m.mean_score.toFixed(1) : '—'}<span style="font-size:13px;color:var(--text-muted)">/100</span></div>
        <div class="cat-model">${m.scored ?? '?'}/${m.total ?? '?'} notées</div>
      </div>
    `;
  });

  return `
    <div class="card" style="margin-top:var(--space-2)">
      <div class="card-title">Questions ouvertes — score juge /100</div>
      <p style="color:var(--text-muted);font-size:12px;margin:0 0 12px">
        Score d’un juge FIXE (<code style="font-family:var(--font-mono)">${judge}</code>, grille
        <code style="font-family:var(--font-mono)">${version}</code>), agrégé <strong>séparément</strong>
        des QCM. Ne jamais mélanger un % de QCM avec un score de juge.
      </p>
      <div class="grid-auto">${cards}</div>
    </div>
  `;
}

/* ── Helpers ──────────────────────────────────────────────── */
function emptyCard(title, hint) {
  return `
    <div class="card" style="margin-top:var(--space-2)">
      <div class="card-title">${title}</div>
      <div class="empty-state">
        <h3>Pas encore de données</h3>
        <p style="font-size:12px;line-height:1.7">${hint}</p>
      </div>
    </div>
  `;
}

function fmtPct(v) {
  return v == null ? '—' : `${Number(v).toFixed(1)}%`;
}

function ci(lo, hi) {
  if (lo == null || hi == null) return '—';
  return `[${Number(lo).toFixed(1)} – ${Number(hi).toFixed(1)}]`;
}
