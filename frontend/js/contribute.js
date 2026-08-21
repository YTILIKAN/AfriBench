/* ═══════════════════════════════════════════════════════════
   AfriBench — Contribuer : proposition démocratique de questions
   Soumission publique via issue GitHub pré-remplie (revue
   communautaire) ou copie JSON pour PR directe.
   ═══════════════════════════════════════════════════════════ */

const {
  escapeHtml, categoryLabel, categoryKeys, difficultyLabel,
} = globalThis;

const GITHUB_REPO = 'YTILIKAN/AfriBench';
const LETTERS = ['A', 'B', 'C', 'D'];

function readForm() {
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  return {
    category: val('cq-category'),
    difficulty: val('cq-difficulty'),
    question: val('cq-question'),
    options: LETTERS.map((l) => val(`cq-option-${l}`)),
    answer: document.querySelector('input[name="cq-answer"]:checked')?.value || '',
    explanation: val('cq-explanation'),
    source: val('cq-source'),
  };
}

function validateForm(data) {
  const errors = [];
  if (!data.category) errors.push('Choisissez une catégorie.');
  if (!data.difficulty) errors.push('Choisissez une difficulté.');
  if (data.question.length < 10) errors.push('La question doit faire au moins 10 caractères.');
  if (data.options.some((o) => !o)) errors.push('Les 4 options (A à D) sont requises.');
  if (new Set(data.options.map((o) => o.toLowerCase())).size !== data.options.length) {
    errors.push('Les options doivent être distinctes.');
  }
  if (!data.answer) errors.push('Indiquez la bonne réponse (A, B, C ou D).');
  return errors;
}

function buildQuestionJson(data) {
  return {
    category: data.category,
    difficulty: data.difficulty,
    language: 'fr',
    question: data.question,
    options: Object.fromEntries(LETTERS.map((l, i) => [l, data.options[i]])),
    answer: data.answer,
    ...(data.explanation ? { explanation: data.explanation } : {}),
    ...(data.source ? { source: data.source } : {}),
  };
}

function buildIssueUrl(data) {
  const title = `[Question] ${data.question.slice(0, 80)}${data.question.length > 80 ? '…' : ''}`;
  const json = JSON.stringify(buildQuestionJson(data), null, 2);
  const body = [
    '## Proposition de question',
    '',
    `**Catégorie** : \`${data.category}\` (${categoryLabel(data.category)})`,
    `**Difficulté** : \`${data.difficulty}\` (${difficultyLabel(data.difficulty)})`,
    '',
    `**Question** : ${data.question}`,
    '',
    '**Options** :',
    ...LETTERS.map((l, i) => `- ${l}. ${data.options[i]}`),
    '',
    `**Bonne réponse** : **${data.answer}**`,
    '',
    data.explanation ? `**Explication** : ${data.explanation}` : '',
    data.source ? `**Source** : ${data.source}` : '',
    '',
    '<details><summary>JSON prêt à intégrer</summary>',
    '',
    '```json',
    json,
    '```',
    '',
    '</details>',
    '',
    '*Proposé via le formulaire AfriBench — revue communautaire publique avant intégration.*',
  ].filter((line) => line !== '').join('\n');
  return `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

function renderPreview() {
  const preview = document.getElementById('cq-preview');
  if (!preview) return;
  const data = readForm();

  if (!data.question && data.options.every((o) => !o)) {
    preview.innerHTML = '<p class="cq-preview-empty">L\'aperçu apparaîtra ici au fur et à mesure.</p>';
    return;
  }

  preview.innerHTML = `
    <div class="q-item expanded">
      <div class="q-meta">
        ${data.category ? `<span class="q-meta-badge category" style="background:var(--surface-2);color:var(--charbon)">${escapeHtml(categoryLabel(data.category))}</span>` : ''}
        ${data.difficulty ? `<span class="q-meta-badge ${escapeHtml(data.difficulty)}">${escapeHtml(difficultyLabel(data.difficulty))}</span>` : ''}
      </div>
      <div class="q-text">${escapeHtml(data.question) || '<em>Question…</em>'}</div>
      <div class="q-options">
        ${LETTERS.map((l, i) => `
          <div class="q-option${data.answer === l ? ' q-option--answer' : ''}">
            <strong>${l}.</strong> ${escapeHtml(data.options[i]) || '<em>…</em>'}
          </div>
        `).join('')}
      </div>
      ${data.explanation ? `<div class="q-answer"><div class="explanation">${escapeHtml(data.explanation)}</div></div>` : ''}
    </div>
  `;
}

function showFormErrors(errors) {
  const box = document.getElementById('cq-errors');
  if (!box) return;
  if (errors.length === 0) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = `<ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderContribute(container) {
  container.innerHTML = `
    <div class="cq-intro card">
      <p>
        Proposez une question. La communauté la valide publiquement sur GitHub.
      </p>
      <ol class="cq-steps">
        <li><strong>1.</strong> Rédiger</li>
        <li><strong>2.</strong> Soumettre</li>
        <li><strong>3.</strong> Valider</li>
      </ol>
    </div>

    <div class="cq-layout">
      <form class="card cq-form" id="cq-form" novalidate>
        <div class="cq-errors" id="cq-errors" hidden role="alert"></div>

        <div class="cq-row">
          <div class="cq-field">
            <label for="cq-category">Catégorie <span class="cq-req">*</span></label>
            <select id="cq-category" required>
              <option value="">Choisir…</option>
              ${categoryKeys().map((k) => `<option value="${k}">${categoryLabel(k)}</option>`).join('')}
            </select>
          </div>
          <div class="cq-field">
            <label for="cq-difficulty">Difficulté <span class="cq-req">*</span></label>
            <select id="cq-difficulty" required>
              <option value="">Choisir…</option>
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </select>
          </div>
        </div>

        <div class="cq-field">
          <label for="cq-question">Question <span class="cq-req">*</span></label>
          <textarea id="cq-question" rows="2" required
            placeholder="Ex. : Où se trouve le siège de l'Union africaine ?"></textarea>
        </div>

        <fieldset class="cq-field">
          <legend>Options <span class="cq-req">*</span> <span class="cq-hint">— bonne réponse</span></legend>
          ${LETTERS.map((l) => `
            <div class="cq-option-row">
              <input type="radio" name="cq-answer" id="cq-answer-${l}" value="${l}"
                     title="Marquer ${l} comme bonne réponse" aria-label="Bonne réponse : ${l}">
              <label class="cq-letter" for="cq-option-${l}">${l}.</label>
              <input type="text" id="cq-option-${l}" required placeholder="Option ${l}">
            </div>
          `).join('')}
        </fieldset>

        <div class="cq-field">
          <label for="cq-explanation">Explication <span class="cq-hint">(recommandée)</span></label>
          <textarea id="cq-explanation" rows="2"
            placeholder="Pourquoi cette réponse est correcte…"></textarea>
        </div>

        <div class="cq-field">
          <label for="cq-source">Source <span class="cq-hint">(lien ou référence)</span></label>
          <input type="text" id="cq-source" placeholder="https://…">
        </div>

        <div class="cq-actions">
          <button type="submit" class="cq-btn cq-btn--primary">Proposer via GitHub ↗</button>
          <button type="button" class="cq-btn cq-btn--ghost" id="cq-copy-json">Copier le JSON</button>
        </div>
        <p class="cq-note">
          Compte GitHub requis. Alternative : PR dans <code>data/questions/v1/raw/</code>.
        </p>
      </form>

      <div class="cq-preview-wrap">
        <div class="cq-preview-title">Aperçu</div>
        <div id="cq-preview"></div>
      </div>
    </div>
  `;

  const form = document.getElementById('cq-form');

  // Aperçu en direct
  form.addEventListener('input', renderPreview);
  form.addEventListener('change', renderPreview);
  renderPreview();

  // Soumission → issue GitHub pré-remplie
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = readForm();
    const errors = validateForm(data);
    showFormErrors(errors);
    if (errors.length > 0) return;
    window.open(buildIssueUrl(data), '_blank', 'noopener');
  });

  // Copie JSON
  document.getElementById('cq-copy-json')?.addEventListener('click', async (e) => {
    const data = readForm();
    const errors = validateForm(data);
    showFormErrors(errors);
    if (errors.length > 0) return;
    const json = JSON.stringify(buildQuestionJson(data), null, 2);
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(json);
      btn.textContent = 'Copié ✓';
    } catch {
      // Fallback si le presse-papier est indisponible
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = 'Copié ✓';
    }
    setTimeout(() => { btn.textContent = 'Copier le JSON'; }, 2000);
  });
}

globalThis.renderContribute = renderContribute;
export {};
