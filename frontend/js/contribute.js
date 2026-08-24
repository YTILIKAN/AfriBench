/* AfriBench — hub démocratique de propositions. */

const {
  escapeHtml, categoryLabel, categoryKeys, difficultyLabel, getApiBase,
} = globalThis;
const renderIcon = globalThis.icon || (() => '');

const LETTERS = ['A', 'B', 'C', 'D'];
const LOCAL_PROPOSALS_KEY = 'afribench-local-proposals';
const VOTER_KEY = 'afribench-voter-id';
let hubSort = 'needs_votes';
let hubProposals = [];
let hubLocalMode = false;
let modalTrigger = null;
let modalEscapeHandler = null;

function voterId() {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random()}`;
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return `session-${Date.now()}-${Math.random()}`;
  }
}

function loadLocalProposals() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROPOSALS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalProposals(proposals) {
  try {
    localStorage.setItem(LOCAL_PROPOSALS_KEY, JSON.stringify(proposals));
  } catch { /* stockage privé indisponible */ }
}

function sortProposals(proposals) {
  const rows = [...proposals];
  if (hubSort === 'popular') {
    rows.sort((a, b) => (b.score - a.score) || (b.total_votes - a.total_votes));
  } else if (hubSort === 'new') {
    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  } else {
    rows.sort((a, b) => (a.total_votes - b.total_votes)
      || String(a.created_at).localeCompare(String(b.created_at)));
  }
  return rows;
}

async function fetchProposals() {
  try {
    const response = await fetch(`${getApiBase()}/proposals?sort=${hubSort}`, {
      headers: { 'X-Voter-ID': voterId() },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    hubLocalMode = false;
    hubProposals = await response.json();
  } catch {
    hubLocalMode = true;
    hubProposals = sortProposals(loadLocalProposals());
  }
  return hubProposals;
}

function readForm() {
  const value = (id) => (document.getElementById(id)?.value || '').trim();
  return {
    category: value('cq-category'),
    difficulty: value('cq-difficulty'),
    question: value('cq-question'),
    options: Object.fromEntries(LETTERS.map((letter) => [letter, value(`cq-option-${letter}`)])),
    answer: document.querySelector('input[name="cq-answer"]:checked')?.value || '',
    explanation: value('cq-explanation'),
    source: value('cq-source'),
    author: value('cq-author') || null,
  };
}

function validateForm(data) {
  const errors = [];
  if (!data.category) errors.push('Catégorie requise.');
  if (!data.difficulty) errors.push('Difficulté requise.');
  if (data.question.length < 20) errors.push('Question : 20 caractères minimum.');
  if (Object.values(data.options).some((option) => !option)) errors.push('Quatre options requises.');
  if (new Set(Object.values(data.options).map((option) => option.toLowerCase())).size !== 4) {
    errors.push('Les options doivent être distinctes.');
  }
  if (!data.answer) errors.push('Bonne réponse requise.');
  if (data.explanation.length < 20) errors.push('Explication : 20 caractères minimum.');
  if (data.source.length < 8) errors.push('Source vérifiable requise.');
  return errors;
}

function showFormErrors(errors) {
  const box = document.getElementById('cq-errors');
  if (!box) return;
  box.hidden = errors.length === 0;
  box.innerHTML = errors.length
    ? `<ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`
    : '';
}

function proposalCard(proposal) {
  const safeSource = escapeHtml(proposal.source || '');
  const source = /^https?:\/\//i.test(proposal.source || '')
    ? `<a href="${safeSource}" target="_blank" rel="noopener">Source ${renderIcon('ExternalLink')}</a>`
    : `<span>${safeSource}</span>`;
  return `
    <article class="hub-card" data-proposal-id="${escapeHtml(proposal.id)}">
      <div class="hub-votes" aria-label="${proposal.total_votes} votes">
        <button type="button" class="hub-vote ${proposal.user_vote === 1 ? 'active' : ''}"
                data-vote="1" aria-label="Soutenir cette question"
                aria-pressed="${proposal.user_vote === 1}">${renderIcon('ArrowUp')}</button>
        <strong>${proposal.score}</strong>
        <button type="button" class="hub-vote ${proposal.user_vote === -1 ? 'active' : ''}"
                data-vote="-1" aria-label="Signaler une question faible"
                aria-pressed="${proposal.user_vote === -1}">${renderIcon('ArrowDown')}</button>
      </div>
      <div class="hub-card__body">
        <div class="q-meta">
          <span class="q-meta-badge category">${escapeHtml(categoryLabel(proposal.category))}</span>
          <span class="q-meta-badge ${escapeHtml(proposal.difficulty)}">${escapeHtml(difficultyLabel(proposal.difficulty))}</span>
          <span class="q-meta-badge subtle">${proposal.total_votes} vote${proposal.total_votes > 1 ? 's' : ''}</span>
        </div>
        <h3>${escapeHtml(proposal.question)}</h3>
        <details class="hub-card__details">
          <summary>Examiner la proposition</summary>
          <div class="hub-options">
            ${Object.entries(proposal.options || {}).map(([key, text]) => `
              <div class="${proposal.answer === key ? 'answer' : ''}">
                <strong>${escapeHtml(key)}.</strong> ${escapeHtml(text)}
              </div>
            `).join('')}
          </div>
          <p>${escapeHtml(proposal.explanation)}</p>
          <div class="hub-card__source">${source}</div>
        </details>
      </div>
    </article>
  `;
}

function renderHubList() {
  const list = document.getElementById('hub-list');
  const count = document.getElementById('hub-count');
  if (!list) return;
  if (count) count.textContent = `${hubProposals.length} proposition${hubProposals.length > 1 ? 's' : ''}`;
  if (hubProposals.length === 0) {
    list.innerHTML = `
      <div class="hub-empty">
        <h3>Aucune proposition</h3>
        <p>Soumettez la première question.</p>
        <button type="button" class="cq-btn cq-btn--primary" data-open-proposal>Proposer une question</button>
      </div>`;
    wireOpenButtons();
    return;
  }
  list.innerHTML = sortProposals(hubProposals).map(proposalCard).join('');
  list.querySelectorAll('[data-vote]').forEach((button) => {
    button.addEventListener('click', () => vote(
      button.closest('[data-proposal-id]').dataset.proposalId,
      Number(button.dataset.vote),
    ));
  });
}

async function vote(proposalId, value) {
  const current = hubProposals.find((proposal) => proposal.id === proposalId);
  if (!current) return;
  try {
    if (hubLocalMode) throw new Error('local');
    const response = await fetch(`${getApiBase()}/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, voter_id: voterId() }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const updated = await response.json();
    hubProposals = hubProposals.map((proposal) => proposal.id === proposalId ? updated : proposal);
  } catch {
    const previous = current.user_vote || 0;
    const next = previous === value ? 0 : value;
    current.upvotes += (next === 1 ? 1 : 0) - (previous === 1 ? 1 : 0);
    current.downvotes += (next === -1 ? 1 : 0) - (previous === -1 ? 1 : 0);
    current.user_vote = next;
    current.score = current.upvotes - current.downvotes;
    current.total_votes = current.upvotes + current.downvotes;
    saveLocalProposals(hubProposals);
  }
  renderHubList();
}

function proposalForm() {
  return `
    <form class="cq-form" id="cq-form" novalidate>
      <div class="cq-errors" id="cq-errors" hidden role="alert"></div>
      <div class="cq-row">
        <div class="cq-field">
          <label for="cq-category">Catégorie *</label>
          <select id="cq-category" required>
            <option value="">Choisir…</option>
            ${categoryKeys().map((key) => `<option value="${key}">${categoryLabel(key)}</option>`).join('')}
          </select>
        </div>
        <div class="cq-field">
          <label for="cq-difficulty">Difficulté *</label>
          <select id="cq-difficulty" required>
            <option value="">Choisir…</option>
            <option value="easy">Facile</option>
            <option value="medium">Moyen</option>
            <option value="hard">Difficile</option>
          </select>
        </div>
      </div>
      <div class="cq-field">
        <label for="cq-question">Question *</label>
        <textarea id="cq-question" rows="2" required></textarea>
      </div>
      <fieldset class="cq-field">
        <legend>Options * <span class="cq-hint">— cochez la réponse</span></legend>
        ${LETTERS.map((letter) => `
          <div class="cq-option-row">
            <input type="radio" name="cq-answer" id="cq-answer-${letter}" value="${letter}"
                   aria-label="Bonne réponse : ${letter}">
            <label class="cq-letter" for="cq-option-${letter}">${letter}.</label>
            <input type="text" id="cq-option-${letter}" required>
          </div>
        `).join('')}
      </fieldset>
      <div class="cq-field">
        <label for="cq-explanation">Explication *</label>
        <textarea id="cq-explanation" rows="2" required></textarea>
      </div>
      <div class="cq-field">
        <label for="cq-source">Source vérifiable *</label>
        <input type="text" id="cq-source" placeholder="Lien ou référence" required>
      </div>
      <div class="cq-field">
        <label for="cq-author">Nom public <span class="cq-hint">(facultatif)</span></label>
        <input type="text" id="cq-author" maxlength="80">
      </div>
      <div class="cq-actions">
        <button type="submit" class="cq-btn cq-btn--primary">Publier dans le hub</button>
        <button type="button" class="cq-btn cq-btn--ghost" data-close-proposal>Annuler</button>
      </div>
    </form>
  `;
}

function openModal(trigger) {
  const modal = document.getElementById('proposal-modal');
  if (!modal) return;
  modalTrigger = trigger || document.activeElement;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  modalEscapeHandler = (event) => {
    if (event.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', modalEscapeHandler);
  modal.querySelector('#cq-category')?.focus();
}

function closeModal() {
  const modal = document.getElementById('proposal-modal');
  // Le nettoyage global est inconditionnel : quitter l'onglet retire la modale
  // du DOM, et un retour anticipé ici laissait le défilement de la page
  // verrouillé et l'écouteur Échap orphelin pour toute la session.
  if (modal) modal.hidden = true;
  document.body.classList.remove('modal-open');
  if (modalEscapeHandler) {
    document.removeEventListener('keydown', modalEscapeHandler);
    modalEscapeHandler = null;
  }
  if (modal) modalTrigger?.focus?.();
  modalTrigger = null;
}

function wireOpenButtons() {
  document.querySelectorAll('[data-open-proposal]').forEach((button) => {
    button.addEventListener('click', () => openModal(button));
  });
}

async function submitProposal(event) {
  event.preventDefault();
  const data = readForm();
  const errors = validateForm(data);
  showFormErrors(errors);
  if (errors.length) return;
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = submit.textContent;
  submit.disabled = true;
  submit.textContent = 'Publication…';
  try {
    const response = await fetch(`${getApiBase()}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }
    hubProposals.unshift(await response.json());
  } catch {
    hubLocalMode = true;
    hubProposals.unshift({
      ...data,
      id: `local-${Date.now()}`,
      status: 'pending',
      upvotes: 0,
      downvotes: 0,
      score: 0,
      total_votes: 0,
      user_vote: 0,
      created_at: new Date().toISOString(),
    });
    saveLocalProposals(hubProposals);
  } finally {
    // Sans cela, réouvrir la modale montrait la proposition précédente et un
    // bouton définitivement désactivé, libellé « Publication… ».
    form.reset();
    showFormErrors([]);
    submit.disabled = false;
    submit.textContent = submitLabel;
  }
  closeModal();
  const note = document.getElementById('hub-local-note');
  if (note) note.hidden = !hubLocalMode;
  renderHubList();
}

async function renderContribute(container) {
  container.innerHTML = `
    <section class="hub-hero">
      <div>
        <span class="hub-hero__eyebrow">Décision communautaire</span>
        <h2>Le hub des questions</h2>
        <p>Un visiteur, un vote modifiable. Scores publics. Validation finale documentée.</p>
      </div>
      <button type="button" class="hub-hero__cta" data-open-proposal>
        ${renderIcon('Plus')} Proposer une question
      </button>
    </section>
    <div class="hub-toolbar">
      <span id="hub-count">Chargement…</span>
      <label for="hub-sort">Trier</label>
      <select id="hub-sort">
        <option value="needs_votes">À départager</option>
        <option value="popular">Mieux notées</option>
        <option value="new">Récentes</option>
      </select>
    </div>
    <div class="hub-local-note" id="hub-local-note" hidden>
      Mode local : connectez PostgreSQL pour partager les votes.
    </div>
    <div class="hub-list" id="hub-list" aria-live="polite">
      <div class="hub-loading">Chargement du hub…</div>
    </div>
    <div class="cq-modal" id="proposal-modal" hidden>
      <button type="button" class="cq-modal__backdrop" data-close-proposal aria-label="Fermer"></button>
      <section class="cq-modal__dialog" role="dialog" aria-modal="true"
               aria-labelledby="proposal-modal-title">
        <header class="cq-modal__header">
          <div>
            <span>Nouvelle proposition</span>
            <h2 id="proposal-modal-title">Suggérer une question</h2>
          </div>
          <button type="button" class="cq-modal__close" data-close-proposal aria-label="Fermer">
            ${renderIcon('X')}
          </button>
        </header>
        <div class="cq-modal__body">${proposalForm()}</div>
      </section>
    </div>
  `;

  wireOpenButtons();
  container.querySelectorAll('[data-close-proposal]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      closeModal();
    });
  });
  container.querySelector('#cq-form')?.addEventListener('submit', submitProposal);
  container.querySelector('#hub-sort')?.addEventListener('change', async (event) => {
    hubSort = event.target.value;
    await fetchProposals();
    renderHubList();
  });
  container.querySelector('#proposal-modal')?.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      const focusable = [...event.currentTarget.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )].filter((element) => !element.closest('[hidden]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const token = globalThis.currentRenderToken?.();
  await fetchProposals();
  // renderHubList() est déjà protégé par l'absence de #hub-list, mais le jeton
  // évite d'écrire dans une vue que l'utilisateur a quittée entre-temps.
  if (globalThis.isRenderStale?.(token)) return;
  const note = document.getElementById('hub-local-note');
  if (note) note.hidden = !hubLocalMode;
  renderHubList();
}

globalThis.renderContribute = renderContribute;
// Permet à la navigation de libérer le verrou de défilement et l'écouteur Échap
// si l'utilisateur quitte l'onglet avec la modale ouverte.
globalThis.__closeProposalModal = closeModal;
export {};
