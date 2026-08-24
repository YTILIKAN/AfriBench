/* ═══════════════════════════════════════════════════════════
   AfriBench — Questions Browser (refonte 2026)
   ═══════════════════════════════════════════════════════════ */

const {
  AppState, categoryLabel, escapeHtml, formatDate, difficultyLabel,
} = globalThis;
const renderIcon = globalThis.icon || (() => '');

let qFilterCat = 'all';
let qFilterDiff = 'all';
const QUESTIONS_PER_PAGE = 20;

function paginationItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push(null);
    items.push(page);
  });
  return items;
}

function renderPagination(current, total) {
  if (total <= 1) return '';
  return `
    <nav class="questions-pagination" aria-label="Pagination des questions">
      <button type="button" class="questions-pagination__button questions-pagination__button--nav"
              data-question-page="${current - 1}" ${current === 1 ? 'disabled' : ''}
              aria-label="Page précédente">${renderIcon('ArrowLeft')} <span>Précédent</span></button>
      <div class="questions-pagination__pages">
        ${paginationItems(current, total).map((page) => page === null
          ? '<span class="questions-pagination__ellipsis" aria-hidden="true">…</span>'
          : `<button type="button" class="questions-pagination__button ${page === current ? 'active' : ''}"
                     data-question-page="${page}" ${page === current ? 'aria-current="page"' : ''}>
               ${page}
             </button>`).join('')}
      </div>
      <button type="button" class="questions-pagination__button questions-pagination__button--nav"
              data-question-page="${current + 1}" ${current === total ? 'disabled' : ''}
              aria-label="Page suivante"><span>Suivant</span> ${renderIcon('ArrowRight')}</button>
    </nav>
  `;
}

function renderQuestions(container) {
  const qs = AppState.questions;

  if (qs.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3>Questions indisponibles</h3>
          <p>Source de données absente.</p>
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / QUESTIONS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, AppState.questionPage || 1), totalPages);
  AppState.questionPage = currentPage;
  const pageStart = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const pageQuestions = filtered.slice(pageStart, pageStart + QUESTIONS_PER_PAGE);
  const visibleStart = filtered.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + QUESTIONS_PER_PAGE, filtered.length);

  const activeFilters = [
    qFilterCat !== 'all' ? ['qcat', categoryLabel(qFilterCat)] : null,
    qFilterDiff !== 'all' ? ['qdiff', difficultyLabel(qFilterDiff)] : null,
  ].filter(Boolean);

  let html = `
    <div class="q-toolbar">
      <span class="q-toolbar__count">${visibleStart}–${visibleEnd} sur ${filtered.length} question${filtered.length > 1 ? 's' : ''}</span>
      ${activeFilters.map(([kind, label]) => `
        <button type="button" class="q-toolbar__chip" data-clear="${kind}"
                title="Retirer ce filtre">${escapeHtml(label)} ${renderIcon('X')}</button>
      `).join('')}
      <details class="q-toolbar__picker">
        <summary>Catégories ${renderIcon('ChevronDown')}</summary>
        <div class="q-toolbar__menu">
          <button class="q-toolbar__option ${qFilterCat === 'all' ? 'active' : ''}" data-qcat="all">Toutes</button>
          ${cats.map((c) => `
            <button class="q-toolbar__option ${qFilterCat === c ? 'active' : ''}" data-qcat="${escapeHtml(c)}">${escapeHtml(categoryLabel(c))}</button>
          `).join('')}
        </div>
      </details>
      <details class="q-toolbar__picker">
        <summary>Difficulté ${renderIcon('ChevronDown')}</summary>
        <div class="q-toolbar__menu">
          <button class="q-toolbar__option ${qFilterDiff === 'all' ? 'active' : ''}" data-qdiff="all">Toutes</button>
          ${diffs.map((d) => `
            <button class="q-toolbar__option ${qFilterDiff === d ? 'active' : ''}" data-qdiff="${escapeHtml(d)}">${escapeHtml(difficultyLabel(d))}</button>
          `).join('')}
        </div>
      </details>
      <button class="filter-btn" id="q-toggle-all" aria-expanded="false">Tout déplier</button>
      <button class="filter-btn" id="q-goto-contribute" title="Proposer une question d'évaluation">
        ${renderIcon('Plus')} Proposer
      </button>
    </div>
  `;

  // Questions list
  html += '<div class="card"><div class="q-list">';

  if (filtered.length === 0) {
    html += `
      <div class="empty-state" style="padding:30px">
        <h3>Aucune question trouvée</h3>
        <p>Modifiez les filtres.</p>
      </div>
    `;
  } else {
    pageQuestions.forEach((q, index) => {
      const diffClass = q.difficulty || 'medium';
      const safeQuestion = escapeHtml(q.question || '');
      const safeId = escapeHtml(q.id || '');
      const safeAnswer = escapeHtml(q.answer || '');
      const safeExplanation = q.explanation ? escapeHtml(q.explanation) : '';
      const safeSource = q.source ? escapeHtml(q.source) : '';
      const dateInfo = q.date_created ? formatDate(q.date_created) : '';
      const detailsId = `q-details-${pageStart + index}`;

      html += `
        <div class="q-item" data-category="${escapeHtml(q.category)}" data-difficulty="${escapeHtml(q.difficulty || '')}">
          <div class="q-meta">
            <span class="q-meta-badge category">
              ${escapeHtml(categoryLabel(q.category))}
            </span>
            <span class="q-meta-badge ${diffClass}">${escapeHtml(difficultyLabel(q.difficulty))}</span>
            <span class="q-meta-badge subtle">${safeId}</span>
            ${dateInfo ? `<span class="q-meta-badge subtle">${dateInfo}</span>` : ''}
          </div>
          <div class="q-item__summary">
            <div class="q-text">${safeQuestion}</div>
            <button type="button" class="q-item__toggle" data-question-toggle
                    aria-expanded="false" aria-controls="${detailsId}">
              <span>Afficher</span>
              <span class="q-item__toggle-icon" aria-hidden="true">${renderIcon('ChevronDown')}</span>
            </button>
          </div>
          <div class="q-item__details" id="${detailsId}" hidden>
            <div class="q-options">
              ${Object.entries(q.options || {}).map(([k, v]) => `
                <div class="q-option"><strong>${escapeHtml(k)}.</strong> ${escapeHtml(v)}</div>
              `).join('')}
            </div>
            <div class="q-answer">
              <div class="label">Réponse : ${safeAnswer}</div>
              ${safeExplanation ? `<div class="explanation">${safeExplanation}</div>` : ''}
              ${safeSource ? `<div class="q-source">Source : ${safeSource}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    });
  }

  html += `</div></div>${renderPagination(currentPage, totalPages)}`;

  container.innerHTML = html;

  // Déplier/replier une question sans alourdir la liste.
  container.querySelectorAll('[data-question-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const details = document.getElementById(button.getAttribute('aria-controls'));
      button.setAttribute('aria-expanded', String(!expanded));
      button.querySelector('span:first-child').textContent = expanded ? 'Afficher' : 'Réduire';
      button.querySelector('.q-item__toggle-icon').classList.toggle('is-expanded', !expanded);
      if (details) details.hidden = expanded;
      button.closest('.q-item')?.classList.toggle('expanded', !expanded);
    });
  });

  document.getElementById('q-toggle-all')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    const expand = button.getAttribute('aria-expanded') !== 'true';
    container.querySelectorAll('[data-question-toggle]').forEach((toggle) => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded !== expand) toggle.click();
    });
    button.setAttribute('aria-expanded', String(expand));
    button.textContent = expand ? 'Tout replier' : 'Tout déplier';
  });

  // Wire up category filters
  container.querySelectorAll('[data-qcat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      qFilterCat = btn.dataset.qcat;
      AppState.questionPage = 1;
      if (window.__setUrlCategory) window.__setUrlCategory(qFilterCat);
      if (window.__setQuestionPage) window.__setQuestionPage(1);
      globalThis.renderWorkspaceFilters?.();
      renderQuestions(container);
    });
  });

  // Wire up difficulty filters
  container.querySelectorAll('[data-qdiff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      qFilterDiff = btn.dataset.qdiff;
      AppState.questionPage = 1;
      if (window.__setUrlDifficulty) window.__setUrlDifficulty(qFilterDiff);
      if (window.__setQuestionPage) window.__setQuestionPage(1);
      globalThis.renderWorkspaceFilters?.();
      renderQuestions(container);
    });
  });

  // Un seul menu ouvert à la fois, refermé après un clic extérieur.
  const pickers = [...container.querySelectorAll('.q-toolbar__picker')];
  pickers.forEach((picker) => {
    picker.addEventListener('toggle', () => {
      if (!picker.open) return;
      pickers.filter((other) => other !== picker).forEach((other) => { other.open = false; });
    });
  });
  container.querySelectorAll('[data-clear]').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.dataset.clear === 'qcat') {
        qFilterCat = 'all';
        window.__setUrlCategory?.('all');
      } else {
        qFilterDiff = 'all';
        window.__setUrlDifficulty?.('all');
      }
      AppState.questionPage = 1;
      window.__setQuestionPage?.(1);
      globalThis.renderWorkspaceFilters?.();
      renderQuestions(container);
    });
  });

  // CTA vers l'onglet Contribuer
  document.getElementById('q-goto-contribute')?.addEventListener('click', () => {
    globalThis.setActiveTab('contribute');
  });

  container.querySelectorAll('[data-question-page]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const nextPage = Number.parseInt(button.dataset.questionPage, 10);
      AppState.questionPage = nextPage;
      if (window.__setQuestionPage) window.__setQuestionPage(nextPage);
      renderQuestions(container);
      document.getElementById('view-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// Synchronise l'état de filtrage sans déclencher de rendu : l'appelant décide
// quand rendre, ce qui évite le double rendu à chaque navigation.
window.__setQuestionFilters = (cat, diff, page = 1) => {
  qFilterCat = cat || 'all';
  qFilterDiff = diff || 'all';
  AppState.questionPage = Math.max(1, Number.parseInt(page, 10) || 1);
};

window.__applyQuestionFilters = (cat, diff, page = 1) => {
  window.__setQuestionFilters(cat, diff, page);
  const container = document.getElementById('tab-content');
  if (container && AppState.activeTab === 'questions') {
    renderQuestions(container);
  }
};

// Enregistré une seule fois au chargement du module. Placé dans renderQuestions,
// cet écouteur s'accumulait à chaque filtre, chaque page et chaque frappe de
// recherche, retenant à chaque fois un DOM détaché.
document.addEventListener('click', (event) => {
  if (event.target.closest('.q-toolbar__picker')) return;
  document.querySelectorAll('.q-toolbar__picker[open]').forEach((picker) => {
    picker.open = false;
  });
});

globalThis.renderQuestions = renderQuestions;
export {};
