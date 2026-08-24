/**
 * Backoffice AfriBench.
 *
 * Extrait du <script> en ligne de admin/index.html : ce module passe
 * désormais par Vite, donc par ESLint, par la minification et par une
 * Content-Security-Policy stricte — un script en ligne l'aurait interdite.
 */
// Sora auto-hébergée, comme l'application principale : plus de requête vers
// fonts.googleapis.com depuis le backoffice.
import '@fontsource/sora/latin-400.css';
import '@fontsource/sora/latin-600.css';
import '@fontsource/sora/latin-700.css';
import '@fontsource/sora/latin-ext-400.css';
import '@fontsource/sora/latin-ext-600.css';
import '@fontsource/sora/latin-ext-700.css';
import './admin.css';

const API = '/api/v1/admin';
const CATEGORIES = [
  'histoire','geographie','droit_politique','sante_sciences','langue_culture',
  'economie','ia_technologie','societe','raisonnement_culturel','temoin',
];
const DIFFICULTIES = ['easy','medium','hard'];
const state = { token: localStorage.getItem('afribench_admin_token') || '', tab: 'questions', questions: [], results: [], models: [] };

// ── helpers ──────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast${  isErr ? ' err' : ''}`;
  t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.display = 'none'; }, 2500);
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers['Authorization'] = `Bearer ${  state.token}`;
  const resp = await fetch(API + path, { ...opts, headers });
  if (resp.status === 401) { logout(); throw new Error('Session expirée'); }
  const data = resp.status === 204 ? null : await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(data?.detail || (`HTTP ${  resp.status}`));
  return data;
}

// ── auth ─────────────────────────────────────────────────
async function login(password) {
  const out = await api('/login', { method: 'POST', body: JSON.stringify({ password }) });
  state.token = out.token;
  localStorage.setItem('afribench_admin_token', state.token);
  showApp();
  await loadAll();
}

function logout() {
  state.token = '';
  localStorage.removeItem('afribench_admin_token');
  $('#appView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
  $('#loginErr').textContent = '';
}

function showApp() {
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
}

// ── data ─────────────────────────────────────────────────
async function loadAll() {
  try {
    [state.questions, state.results, state.models] = await Promise.all([api('/questions'), api('/results'), api('/models')]);
  } catch (e) { toast(e.message, true); }
  render();
}

function render() {
  $('#qCount').textContent = state.questions.length;
  $('#rCount').textContent = state.results.length;
  const q = ($('#search').value || '').toLowerCase();
  if (state.tab === 'questions') renderQuestions(q);
  else if (state.tab === 'results') renderResults(q);
  else if (state.tab === 'models') renderModels(q);
  else renderEvaluation();
}

/**
 * Index de recherche par objet, mis en cache.
 * Sans lui, chaque frappe re-sérialisait tout le jeu de données : 350 questions
 * avec leurs options et explications, à chaque caractère saisi.
 */
const searchIndex = new WeakMap();

function haystack(item) {
  let value = searchIndex.get(item);
  if (value === undefined) {
    value = JSON.stringify(item).toLowerCase();
    searchIndex.set(item, value);
  }
  return value;
}

function matches(item, q) {
  return !q || haystack(item).includes(q);
}

function renderQuestions(q) {
  const rows = state.questions.filter(x => matches(x, q));
  $('#dataTable').innerHTML =
    `<thead><tr><th scope="col">ID</th><th scope="col">Catégorie</th><th scope="col">Question</th><th scope="col">Difficulté</th><th scope="col">Réponse</th><th scope="col"></th></tr></thead><tbody>${
    rows.map(x => `<tr>
      <td class="mono">${esc(x.id)}</td>
      <td><span class="pill">${esc(x.category)}</span></td>
      <td>${esc(x.question)}</td>
      <td>${esc(x.difficulty || '')}</td>
      <td class="mono">${esc(x.answer || '')}</td>
      <td><div class="actions">
        <button class="btn ghost sm" data-act="edit-question" data-id="${esc(x.id)}">Éditer</button>
        <button class="btn danger sm" data-act="delete-question" data-id="${esc(x.id)}">Suppr.</button>
      </div></td>
    </tr>`).join('')
    }${rows.length ? '' : '<tr><td colspan="6" class="empty">Aucune question</td></tr>'  }</tbody>`;
}

function renderResults(q) {
  const rows = state.results.filter(x => matches(x, q));
  $('#dataTable').innerHTML =
    `<thead><tr><th scope="col">#</th><th scope="col">Modèle</th><th scope="col">Label</th><th scope="col">Score</th><th scope="col">Correct/Total</th><th scope="col">Date</th><th scope="col"></th></tr></thead><tbody>${
    rows.map(x => `<tr>
      <td class="mono">${esc(x.id)}</td>
      <td class="mono">${esc(x.model)}</td>
      <td>${esc(x.model_label || '')}</td>
      <td class="mono">${x.accuracy ?? '-'}%</td>
      <td class="mono">${x.correct}/${x.total}</td>
      <td class="mono">${esc((x.timestamp || '').slice(0,10))}</td>
      <td><div class="actions">
        <button class="btn ghost sm" data-act="edit-result" data-id="${esc(x.id)}">Éditer</button>
        <button class="btn danger sm" data-act="delete-result" data-id="${esc(x.id)}">Suppr.</button>
      </div></td>
    </tr>`).join('')
    }${rows.length ? '' : '<tr><td colspan="7" class="empty">Aucun résultat</td></tr>'  }</tbody>`;
}

// ── modal ────────────────────────────────────────────────
function openModal(title, fieldsHtml) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = fieldsHtml;
  $('#modalBackdrop').classList.add('open');
}
function closeModal() { $('#modalBackdrop').classList.remove('open'); }

function field(name, label, opts = {}) {
  const { type = 'text', value = '', full = false, required = false, options = null } = opts;
  const val = esc(value);
  const id = `f_${  name}`;
  let input;
  if (options) {
    input = `<select id="${id}" name="${name}">${options.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  } else if (type === 'textarea') {
    input = `<textarea id="${id}" name="${name}" ${required ? 'required' : ''}>${val}</textarea>`;
  } else if (type === 'checkbox') {
    input = `<input type="checkbox" id="${id}" name="${name}" ${value === 'true' || value === true ? 'checked' : ''}>`;
  } else {
    input = `<input type="${type}" id="${id}" name="${name}" value="${val}" ${required ? 'required' : ''}>`;
  }
  return `<div class="field ${full ? 'full' : ''}"><label for="${id}">${label}</label>${input}</div>`;
}

function readForm() {
  const out = {};
  $('#modalBody').querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'number') out[el.name] = el.value === '' ? null : Number(el.value);
    else out[el.name] = el.value;
  });
  return out;
}

// ── questions CRUD ───────────────────────────────────────
function questionFields(x = {}) {
  const opts = { A: x.options?.A || '', B: x.options?.B || '', C: x.options?.C || '', D: x.options?.D || '' };
  const idField = x.id
    ? `<input type="hidden" name="id" value="${esc(x.id)}"><div class="field"><label>ID</label><input value="${esc(x.id)}" disabled></div>`
    : field('id', 'ID (ex: HIST-001)', { required: true });
  return `
    ${idField}
    ${field('category', 'Catégorie', { options: CATEGORIES, value: x.category || 'histoire' })}
    ${field('subcategory', 'Sous-catégorie', { value: x.subcategory || '' })}
    ${field('difficulty', 'Difficulté', { options: DIFFICULTIES, value: x.difficulty || 'medium' })}
    ${field('language', 'Langue', { value: x.language || 'fr' })}
    ${field('question', 'Question', { type: 'textarea', full: true, required: true, value: x.question || '' })}
    <div class="opts-grid">
      ${field('optA', 'Option A', { value: opts.A, required: true })}
      ${field('optB', 'Option B', { value: opts.B, required: true })}
      ${field('optC', 'Option C', { value: opts.C, required: true })}
      ${field('optD', 'Option D', { value: opts.D, required: true })}
    </div>
    ${field('answer', 'Bonne réponse', { options: ['A','B','C','D'], value: x.answer || 'A' })}
    ${field('source', 'Source', { value: x.source || '' })}
    ${field('explanation', 'Explication', { type: 'textarea', full: true, value: x.explanation || '' })}
    ${field('author', 'Auteur', { value: x.author || '' })}
    ${field('date_created', 'Date de création', { type: 'date', value: x.date_created || '' })}
    <div class="field check">${field('is_control', 'Question témoin (baseline)', { type: 'checkbox', value: x.is_control })}</div>
  `;
}

function editQuestion(id) {
  const x = state.questions.find(q => q.id === id);
  openModal('Éditer la question', questionFields(x));
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = readForm();
    const body = {
      ...f,
      options: { A: f.optA, B: f.optB, C: f.optC, D: f.optD },
      is_control: !!f.is_control,
    };
    delete body.optA; delete body.optB; delete body.optC; delete body.optD;
    try { await api(`/questions/${  encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }); toast('Question mise à jour'); closeModal(); await loadAll(); }
    catch (err) { toast(err.message, true); }
  };
}

function newQuestion() {
  openModal('Nouvelle question', questionFields());
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = readForm();
    const body = {
      ...f,
      options: { A: f.optA, B: f.optB, C: f.optC, D: f.optD },
      is_control: !!f.is_control,
    };
    delete body.optA; delete body.optB; delete body.optC; delete body.optD;
    try { await api('/questions', { method: 'POST', body: JSON.stringify(body) }); toast('Question créée'); closeModal(); await loadAll(); }
    catch (err) { toast(err.message, true); }
  };
}

async function deleteQuestion(id) {
  if (!confirm(`Supprimer la question ${  id  } ?`)) return;
  try { await api(`/questions/${  encodeURIComponent(id)}`, { method: 'DELETE' }); toast('Question supprimée'); await loadAll(); }
  catch (err) { toast(err.message, true); }
}

// ── results CRUD ─────────────────────────────────────────
function resultFields(x = {}) {
  return `
    ${field('model', 'Modèle (id)', { required: true, value: x.model || '' })}
    ${field('model_label', 'Label', { value: x.model_label || '' })}
    ${field('timestamp', 'Horodatage (ISO)', { value: x.timestamp || new Date().toISOString() })}
    ${field('correct', 'Correct', { type: 'number', value: x.correct ?? 0 })}
    ${field('total', 'Total', { type: 'number', value: x.total ?? 0 })}
    ${field('incorrect', 'Incorrect', { type: 'number', value: x.incorrect ?? '' })}
    ${field('no_answer', 'Sans réponse', { type: 'number', value: x.no_answer ?? '' })}
    ${field('accuracy', 'Accuracy (%)', { type: 'number', value: x.accuracy ?? '' })}
    <div class="full" style="font-size:12px;color:var(--muted)">
      Les champs by_category / by_difficulty / details sont générés par l'évaluation
      et ne sont pas éditables ici (conservés tels quels à la création).
    </div>
  `;
}

function editResult(id) {
  // id provient d'un attribut data-* : toujours une chaîne.
  const x = state.results.find(r => String(r.id) === String(id));
  openModal('Éditer le résultat', resultFields(x));
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await api(`/results/${  id}`, { method: 'PUT', body: JSON.stringify(readForm()) }); toast('Résultat mis à jour'); closeModal(); await loadAll(); }
    catch (err) { toast(err.message, true); }
  };
}

function newResult() {
  openModal('Nouveau résultat', resultFields());
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/results', { method: 'POST', body: JSON.stringify(readForm()) }); toast('Résultat créé'); closeModal(); await loadAll(); }
    catch (err) { toast(err.message, true); }
  };
}

async function deleteResult(id) {
  if (!confirm(`Supprimer le résultat #${  id  } ?`)) return;
  try { await api(`/results/${  id}`, { method: 'DELETE' }); toast('Résultat supprimé'); await loadAll(); }
  catch (err) { toast(err.message, true); }
}

// ── modèles CRUD ─────────────────────────────────────────
const PROVIDERS = ['openai', 'anthropic', 'google'];

function renderModels(q) {
  const rows = state.models.filter(x => matches(x, q));
  $('#dataTable').innerHTML =
    `<thead><tr><th scope="col">Nom</th><th scope="col">Label</th><th scope="col">Provider</th><th scope="col">Model ID</th><th scope="col">Clé</th><th scope="col"></th></tr></thead><tbody>${
    rows.map(x => `<tr>
      <td class="mono">${esc(x.name)}</td>
      <td>${esc(x.label || '')}</td>
      <td><span class="pill">${esc(x.provider || '')}</span></td>
      <td class="mono">${esc(x.model_id || '')}</td>
      <td>${x.api_key_set ? '<span class="pill ok">configurée</span>' : '<span class="pill">manquante</span>'}</td>
      <td><div class="actions">
        <button class="btn ghost sm" data-act="edit-model" data-id="${esc(x.name)}">Éditer</button>
        <button class="btn sm" data-act="eval-model" data-id="${esc(x.name)}">Évaluer</button>
        <button class="btn danger sm" data-act="delete-model" data-id="${esc(x.name)}">Suppr.</button>
      </div></td>
    </tr>`).join('')
    }${rows.length ? '' : '<tr><td colspan="6" class="empty">Aucun modèle</td></tr>'  }</tbody>`;
}

function modelFields(x = {}) {
  return `
    ${field('name', 'Nom (id)', { required: true, value: x.name || '' })}
    ${field('label', 'Label', { value: x.label || '' })}
    ${field('provider', 'Provider', { options: PROVIDERS, value: x.provider || 'openai' })}
    ${field('model_id', 'Model ID', { value: x.model_id || '' })}
    ${field('api_base', 'API base (optionnel)', { value: x.api_base || '' })}
    ${field('api_key', 'Clé API', { type: 'password', value: x.api_key || '', full: true })}
    ${field('max_tokens', 'Max tokens', { type: 'number', value: x.max_tokens ?? 256 })}
    ${field('temperature', 'Temperature', { type: 'number', value: x.temperature ?? 0 })}
  `;
}

function editModel(name) {
  const x = state.models.find(m => m.name === name);
  openModal('Éditer le modèle', modelFields(x));
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await api(`/models/${  encodeURIComponent(name)}`, { method: 'PUT', body: JSON.stringify(readForm()) }); toast('Modèle mis à jour'); closeModal(); await loadAll(); }
    catch (err) { toast(err.message, true); }
  };
}

function newModel() {
  openModal('Nouveau modèle', modelFields());
  $('#modalForm').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/models', { method: 'POST', body: JSON.stringify(readForm()) }); toast('Modèle créé'); closeModal(); await loadAll(); }
    catch (err) { toast(err.message, true); }
  };
}

async function deleteModel(name) {
  if (!confirm(`Supprimer le modèle ${  name  } ?`)) return;
  try { await api(`/models/${  encodeURIComponent(name)}`, { method: 'DELETE' }); toast('Modèle supprimé'); await loadAll(); }
  catch (err) { toast(err.message, true); }
}

// ── évaluation ──────────────────────────────────────────
function renderEvaluation() {
  const m = state.models;
  const modelOpts = m.map(x => `<option value="${esc(x.name)}">${esc(x.label || x.name)}</option>`).join('');
  const catOpts = ['<option value="">Toutes</option>'].concat(CATEGORIES.map(c => `<option value="${c}">${c}</option>`)).join('');
  $('#dataTable').innerHTML = `
    <tr><td colspan="2" style="padding:28px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:560px">
        <div class="field"><label>Modèle</label><select id="evModel">${modelOpts}</select></div>
        <div class="field"><label>Catégorie</label><select id="evCategory">${catOpts}</select></div>
        <div class="field"><label>Few-shot</label><input type="number" id="evFewShot" value="0"></div>
        <div class="field"><label>Limite (optionnel)</label><input type="number" id="evLimit" value=""></div>
      </div>
      <div style="margin-top:18px;display:flex;gap:12px;align-items:center">
        <button class="btn" data-act="eval-form">Lancer l'évaluation</button>
        <span id="evalStatus" style="color:var(--muted);font-size:13px"></span>
      </div>
      ${m.length ? '' : '<p style="color:var(--muted);margin-top:12px">Aucun modèle configuré. Ajoutez-en un dans l\'onglet Modèles.</p>'}
    </td></tr>
  `;
}

async function launchEvalFromForm() {
  await launchEvalJob({
    model: $('#evModel').value,
    few_shot: Number($('#evFewShot').value) || 0,
    limit: $('#evLimit').value === '' ? null : Number($('#evLimit').value),
    category: $('#evCategory').value || null,
  });
}

async function launchEval(modelName) {
  await launchEvalJob({ model: modelName, few_shot: 0, limit: null, category: null });
}

async function launchEvalJob(body) {
  const st = $('#evalStatus');
  if (st) st.textContent = 'Lancement…';
  try {
    const out = await api('/evaluate', { method: 'POST', body: JSON.stringify(body) });
    toast(`Évaluation lancée (job ${  out.job_id  })`);
    pollJob(out.job_id, st);
  } catch (err) { toast(err.message, true); if (st) st.textContent = ''; }
}

let pollTimer = null;

async function pollJob(jobId, st) {
  // Un seul sondage à la fois : relancer une évaluation ne doit pas laisser
  // le précédent minuteur tourner indéfiniment en arrière-plan.
  if (pollTimer) clearInterval(pollTimer);
  if (st) st.textContent = `Job ${  jobId  } : en cours…`;
  const stop = () => { clearInterval(pollTimer); pollTimer = null; };
  pollTimer = setInterval(async () => {
    try {
      // /jobs est public (hors préfixe admin), donc appelé sans le wrapper api().
      const resp = await fetch(`/api/v1/jobs/${  encodeURIComponent(jobId)}`);
      if (!resp.ok) throw new Error(`HTTP ${  resp.status}`);
      const j = await resp.json();
      if (st) st.textContent = `Job ${  jobId  } : ${  j.status}`;
      if (j.status === 'completed') { stop(); toast('Évaluation terminée'); await loadAll(); }
      else if (j.status === 'failed') { stop(); toast(`Échec : ${  j.error || ''}`, true); if (st) st.textContent = `Échec : ${  j.error || ''}`; }
    } catch (e) { stop(); }
  }, 3000);
}

// ── wiring ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (state.token) { showApp(); loadAll(); }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    try { await login($('#password').value); $('#password').value = ''; }
    catch (err) { $('#loginErr').textContent = err.message === 'Mot de passe incorrect.' ? 'Mot de passe incorrect.' : err.message; }
  });
  $('#logoutBtn').addEventListener('click', logout);
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    state.tab = t.dataset.tab;
    render();
  }));
  // Anti-rebond : le rendu reconstruit toute la table, inutile de le faire à
  // chaque caractère.
  let searchTimer = null;
  $('#search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 180);
  });
  $('#newBtn').addEventListener('click', () => {
    if (state.tab === 'questions') newQuestion();
    else if (state.tab === 'results') newResult();
    else if (state.tab === 'models') newModel();
  });
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);
  $('#modalBackdrop').addEventListener('click', (e) => { if (e.target === $('#modalBackdrop')) closeModal(); });

  // Délégation : les identifiants transitent par data-id, jamais par du code
  // JavaScript généré. Un échappement HTML ne protège pas un contexte JS.
  const ACTIONS = {
    'edit-question': editQuestion,
    'delete-question': deleteQuestion,
    'edit-result': editResult,
    'delete-result': deleteResult,
    'edit-model': editModel,
    'delete-model': deleteModel,
    'eval-model': launchEval,
    'eval-form': launchEvalFromForm,
  };
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const handler = ACTIONS[btn.dataset.act];
    if (handler) handler(btn.dataset.id);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#modalBackdrop').classList.contains('open')) closeModal();
  });
});
