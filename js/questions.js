/* ═══════════════════════════════════════════════════════════
   AfriBench — Questions Browser (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

let qFilterCat = 'all';
let qFilterDiff = 'all';

function renderQuestions(container) {
  const qs = AppState.questions;

  if (qs.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Questions non chargées</h3>
          <p>Le fichier <code>data/questions.json</code> est requis.</p>
        </div>
      </div>
    `;
    return;
  }

  // Collect unique categories
  const cats = [...new Set(qs.map((q) => q.category))].sort();
  const diffs = [...new Set(qs.map((q) => q.difficulty))].sort();

  // Apply filters
  let filtered = qs;
  if (qFilterCat !== 'all') filtered = filtered.filter((q) => q.category === qFilterCat);
  if (qFilterDiff !== 'all') filtered = filtered.filter((q) => q.difficulty === qFilterDiff);
  // Apply search filter (full-text on question, options, explanation, id)
  if (AppState.searchQuery) {
    const q = AppState.searchQuery.toLowerCase();
    filtered = filtered.filter((item) => {
      return (item.question && item.question.toLowerCase().includes(q)) ||
        (item.explanation && item.explanation.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        Object.values(item.options || {}).some((opt) => opt.toLowerCase().includes(q));
    });
  }

  let html = `
    <div class="card">
      <div class="card-title">
        Parcourir les questions
        <span class="count-badge">${filtered.length} / ${qs.length}</span>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <span style="font-size:0.68rem;color:var(--muted)">Catégorie:</span>
        <button class="filter-btn ${qFilterCat === 'all' ? 'active' : ''}" data-qcat="all">Toutes</button>
        ${cats.map((c) => `
          <button class="filter-btn ${qFilterCat === c ? 'active' : ''}" data-qcat="${c}">${categoryLabel(c)}</button>
        `).join('')}
      </div>
      <div class="filter-bar">
        <span style="font-size:0.68rem;color:var(--muted)">Difficulté:</span>
        <button class="filter-btn ${qFilterDiff === 'all' ? 'active' : ''}" data-qdiff="all">Toutes</button>
        ${diffs.map((d) => `
          <button class="filter-btn ${qFilterDiff === d ? 'active' : ''}" data-qdiff="${d}">
            ${difficultyLabel(d)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Questions list
  html += '<div class="card"><div class="q-list">';

  if (filtered.length === 0) {
    html += `
      <div class="empty-state" style="padding:30px">
        <h3>Aucune question trouvée</h3>
        <p>Essayez de modifier les filtres.</p>
      </div>
    `;
  } else {
    filtered.forEach((q, i) => {
      const diffClass = q.difficulty || 'medium';
      const catColor = categoryColor(q.category);
      const safeQuestion = escapeHtml(q.question || '');
      const safeId = escapeHtml(q.id || '');
      const safeAnswer = escapeHtml(q.answer || '');
      const safeExplanation = q.explanation ? escapeHtml(q.explanation) : '';
      const safeSource = q.source ? escapeHtml(q.source) : '';
      const dateInfo = q.date_created ? formatDate(q.date_created) : '';

      html += `
        <div class="q-item" data-category="${q.category}" data-difficulty="${q.difficulty || ''}">
          <div class="q-meta">
            <span class="q-meta-badge category" style="background:${catColor}22;color:${catColor}">
              ${categoryLabel(q.category)}
            </span>
            <span class="q-meta-badge ${diffClass}">${difficultyLabel(q.difficulty)}</span>
            <span class="q-meta-badge subtle">${safeId}</span>
            ${dateInfo ? `<span class="q-meta-badge subtle">${dateInfo}</span>` : ''}
          </div>
          <div class="q-text">${safeQuestion}</div>
          <div class="q-options">
            ${Object.entries(q.options || {}).map(([k, v]) => `
              <div class="q-option"><strong>${escapeHtml(k)}.</strong> ${escapeHtml(v)}</div>
            `).join('')}
          </div>
          <div class="q-answer">
            <div class="label">Reponse : ${safeAnswer}</div>
            ${safeExplanation ? `<div class="explanation">${safeExplanation}</div>` : ''}
            ${safeSource ? `<div class="q-source">Source : ${safeSource}</div>` : ''}
          </div>
        </div>
      `;
    });
  }

  html += '</div></div>';

  container.innerHTML = html;

  // Wire up toggle expand/collapse
  document.querySelectorAll('.q-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      // Don't toggle if user clicked a link
      if (e.target.tagName === 'A') return;
      el.classList.toggle('expanded');
    });
  });

  // Wire up category filters
  document.querySelectorAll('[data-qcat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      qFilterCat = btn.dataset.qcat;
      renderQuestions(container);
    });
  });

  // Wire up difficulty filters
  document.querySelectorAll('[data-qdiff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      qFilterDiff = btn.dataset.qdiff;
      renderQuestions(container);
    });
  });
}
