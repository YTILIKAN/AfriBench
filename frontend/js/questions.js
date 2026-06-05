/* ═══════════════════════════════════════════════
   AfriBench — Questions Browser
   ═══════════════════════════════════════════════ */

function renderQuestions(container) {
  const qs = AppState.questions;

  if (qs.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Questions non chargees</h3>
          <p>Le fichier <code>data/questions.json</code> est requis.</p>
          <p style="margin-top:8px">Generer avec : <code>python scripts/afribench.py export --format json > frontend/data/questions.json</code></p>
        </div>
      </div>`;
    return;
  }

  // Categorie filter
  const cats = [...new Set(qs.map((q) => q.category))].sort();

  let html = `
    <div class="card">
      <div class="card-title">Parcourir les questions (${qs.length})</div>
      <div class="filter-bar">
        <button class="filter-chip active" data-cat="all">Toutes</button>`;

  cats.forEach((c) => {
    const count = qs.filter((q) => q.category === c).length;
    html += `<button class="filter-chip" data-cat="${c}">${categoryLabel(c)} (${count})</button>`;
  });

  html += `</div>
    <div class="q-list" id="q-list">`;

  qs.forEach((q, i) => {
    const diff = q.difficulty || 'medium';
    html += `
      <div class="q-item" data-index="${i}" data-category="${q.category}">
        <div class="q-meta">
          <span class="q-category">${categoryLabel(q.category)}</span>
          <span class="q-difficulty ${diff}">${difficultyLabel(diff)}</span>
          <span style="color:var(--text-muted);font-size:0.75rem">${q.id || ''}</span>
        </div>
        <div class="q-text">${q.question}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">
          ${Object.entries(q.options || {}).map(([k, v]) => `<span style="margin-right:12px"><strong>${k}.</strong> ${v}</span>`).join('')}
        </div>
        <div class="q-answer">
          Reponse : <strong>${q.answer}</strong>
          ${q.explanation ? `<br><span style="color:var(--text-secondary);font-size:0.8rem">${q.explanation}</span>` : ''}
        </div>
      </div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;

  // Event listeners
  document.querySelectorAll('.q-item').forEach((el) => {
    el.addEventListener('click', () => el.classList.toggle('expanded'));
  });

  document.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.q-item').forEach((el) => {
        if (cat === 'all' || el.dataset.category === cat) {
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    });
  });
}
