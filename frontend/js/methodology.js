/* ═══════════════════════════════════════════════════════════
   AfriBench — Méthodologie page (documentation)
   ═══════════════════════════════════════════════════════════ */

const {
  AppState, getUniqueModels, categoryKeys, categoryLabel,
} = globalThis;

function renderMethodology(container) {
  const totalQ = AppState.questions.length;
  const cats = new Set(AppState.questions.map(q => q.category));
  const languages = new Set(AppState.questions.map(q => q.language));

  container.innerHTML = `
    <div class="methodology-content">

      <p class="lead">
        Protocole d'évaluation des LLM sur les réalités africaines.
      </p>

      <div class="meth-stat-grid">
        <div class="meth-stat-card">
          <span class="stat-value">${totalQ}</span>
          <span class="stat-label">questions</span>
        </div>
        <div class="meth-stat-card">
          <span class="stat-value">${cats.size}</span>
          <span class="stat-label">categories</span>
        </div>
        <div class="meth-stat-card">
          <span class="stat-value">${languages.size}</span>
          <span class="stat-label">langues</span>
        </div>
        <div class="meth-stat-card">
          <span class="stat-value">${getUniqueModels().length}</span>
          <span class="stat-label">modeles evalues</span>
        </div>
      </div>

      <div class="meth-section">
        <h3>Conception du benchmark</h3>
        <p>
          AfriBench est un benchmark <strong>a choix multiples</strong> (4 options par question) 
          conçu pour mesurer la capacité des LLMs a répondre correctement a des questions portant
          sur les réalités africaines.
        </p>
        <p>
          Chaque question est accompagnee :
        </p>
        <ul>
          <li>D'une <strong>categorie</strong> thematique (histoire, geographie, droit, etc.)</li>
          <li>D'une <strong>sous-categorie</strong> plus precise (institutions, capitales, etc.)</li>
          <li>D'un <strong>niveau de difficulte</strong> (Facile, Moyen, Difficile)</li>
          <li>D'une <strong>source</strong> et d'une <strong>explication</strong> de la reponse</li>
        </ul>
      </div>

      <div class="meth-section">
        <h3>Categories</h3>
        <p>Les questions sont organisees en ${cats.size} catégories couvrant les aspects fondamentaux des societes africaines :</p>
        <div class="meth-tags">
          ${categoryKeys().map(key =>
            `<span class="meth-tag">${categoryLabel(key)}</span>`
          ).join('')}
        </div>
      </div>

      <div class="meth-section">
        <h3>Evaluation des modeles</h3>
        <p>
          Chaque modèle est évalué sur l'ensemble des questions (${totalQ} questions).
          Le protocole est le suivant :
        </p>
        <ol>
          <li>Chaque question est envoyée au modèle via son API avec un prompt standardisé</li>
          <li>Paramètres par défaut : <code>temperature = 0.0</code>, <code>max_tokens = 256</code>, few-shot = 0 (zero-shot)</li>
          <li>Retries exponentiels sur erreurs / HTTP 429 (jusqu'à 5 tentatives) ; délai ~0,5&nbsp;s entre questions</li>
          <li>Le modèle doit choisir parmi 4 options (A, B, C ou D) ; seule la lettre est scoree</li>
          <li>Scoring : 1 point par bonne réponse ; moyennes par catégorie et difficulté</li>
          <li>Pas de seed API globale (déterminisme via temperature 0) ; le mode <code>--mock</code> utilise un seed dérivé du nom du modèle</li>
        </ol>
        <p>
          Script : <a href="https://github.com/YTILIKAN/AfriBench/blob/main/scripts/afribench.py" target="_blank" rel="noopener">scripts/afribench.py</a>
          · Reproduction : <a href="https://github.com/YTILIKAN/AfriBench/blob/main/scripts/reproduce.sh" target="_blank" rel="noopener">scripts/reproduce.sh</a>
          (<code>--mock</code> pour un run offline CI).
        </p>
        <div class="meth-code-block">
          // Exemple de prompt standardise
          {
            "question": "Où se trouve le siege de l'Union africaine ?",
            "options": ["Nairobi, Kenya", "Addis-Abeba, Ethiopie", "Pretoria, Afrique du Sud", "Dakar, Senegal"]
            "instruction": "Repondez UNIQUEMENT par la lettre de la bonne réponse (A, B, C ou D)."
          }
        </div>
      </div>

      <div class="meth-section">
        <h3>Metriques</h3>
        <p>AfriBench utilise 8 métriques standard pour évaluer et comparer les modèles :</p>

        <div class="meth-stat-grid">
          <div class="meth-stat-card">
            <span class="stat-value">Score</span>
            <span class="stat-label">% global</span>
          </div>
          <div class="meth-stat-card">
            <span class="stat-value">3 niv.</span>
            <span class="stat-label">difficulte</span>
          </div>
          <div class="meth-stat-card">
            <span class="stat-value">9 cat.</span>
            <span class="stat-label">thematiques</span>
          </div>
          <div class="meth-stat-card">
            <span class="stat-value">Ecart-t.</span>
            <span class="stat-label">consistance</span>
          </div>
        </div>

        <div class="meth-code-block">
          <strong style="display:block;margin-bottom:8px;color:var(--ocre);font-size:.82rem">Score global</strong>
          Pourcentage de réponses correctes sur l'ensemble du benchmark (${totalQ} questions).
          Métrique principale de performance.
          <br><br>
          <strong style="display:block;margin-bottom:8px;color:var(--ocre);font-size:.82rem">Scores par difficulte</strong>
          Les questions sont classees en 3 niveaux :
          <strong>Facile</strong> (connaissances de base),
          <strong>Moyen</strong> (connaissances intermediaires),
          <strong>Difficile</strong> (raisonnement avance).
          Ces scores permettent d'evaluer la profondeur des connaissances du modele.
          <br><br>
          <strong style="display:block;margin-bottom:8px;color:var(--ocre);font-size:.82rem">Meilleure categorie</strong>
          La catégorie thematique dans laquelle le modèle obtient son meilleur score.
          Revele le domaine de predilection du modèle (ex: Droit et Politique, Geographie).
          <br><br>
          <strong style="display:block;margin-bottom:8px;color:var(--ocre);font-size:.82rem">Ecart-type (consistance)</strong>
          Mesure de la regularite des performances a travers les 9 categories.
          <br>
          <span style="color:var(--success)">Faible (&lt;5) :</span> performances homogenes
          <br>
          <span style="color:var(--warning)">Moyen (5-8) :</span> legeres variations
          <br>
          <span style="color:var(--danger)">Eleve (&gt;8) :</span> forte disparité selon les sujets
        </div>

        <p><strong>Interpretation :</strong></p>
        <ul>
          <li><strong>DeepSeek V4</strong> (ecart-type 4.7) est le plus <strong>consistant</strong> sur toutes les categories</li>
          <li><strong>Gemini 2.5 Flash</strong> (ecart-type 12.0) montre une forte <strong>disparite</strong> (excellent en Droit, faible en IA)</li>
          <li><strong>Tous les modeles</strong> performent mieux en Droit et Politique et Geographie</li>
          <li><strong>IA et Technologie</strong> est la catégorie la plus difficile pour tous les modeles</li>
        </ul>
      </div>

      <div class="meth-section">
        <h3>Reproductibilite</h3>
        <p>
          AfriBench est entièrement <strong>open source</strong> et
          <strong>reproductible (protocole documenté)</strong> :
        </p>
        <ul>
          <li>Les <strong>données</strong> (questions, réponses) sont publiées sur GitHub</li>
          <li>Le <strong>code d'évaluation</strong> est ouvert (<code>scripts/afribench.py</code>)</li>
          <li>Le script <code>reproduce.sh</code> enchaîne validation → eval → export frontend</li>
          <li>Les <strong>résultats</strong> portent un timestamp et le modèle exact</li>
          <li>Tout le monde peut <strong>soumettre un nouveau modèle</strong> ou une nouvelle question</li>
        </ul>
      </div>

      <div class="meth-section">
        <h3>Contribuer</h3>
        <p>
          Vous voulez contribuer a AfriBench ? Plusieurs facons de participer :
        </p>
        <ul>
          <li><strong>Soumettre un modele</strong> — faites évaluer votre modèle via notre protocole standard</li>
          <li><strong>Proposer des questions</strong> — ajoutez des questions dans les catégories existantes ou nouvelles</li>
          <li><strong>Reviser les questions</strong> — aidez a valider et améliorer la qualite des questions</li>
          <li><strong>Traductions</strong> — ajoutez des traductions en langues africaines (wolof, haoussa, swahili, etc.)</li>
        </ul>
        <p>
          Consultez le guide de contribution sur 
          <a href="https://github.com/YTILIKAN/AfriBench/blob/main/CONTRIBUTING.md" target="_blank">GitHub</a>.
        </p>
      </div>

      <div class="meth-section">
        <h3>Limites et améliorations futures</h3>
        <ul>
          <li>Le benchmark est actuellement en <strong>version 0.1</strong> (${totalQ} questions Afrique ; classement encore indicatif)</li>
          <li>Les questions sont principalement en <strong>francais</strong> — les versions multilingues sont en cours</li>
          <li>Les catégories seront étendues (sports, arts, religions, etc.)</li>
          <li>Le format pourra evoluer (questions ouvertes, generation de texte, etc.)</li>
          <li>Un systeme de <strong>votation communautaire</strong> pour la qualite des questions est prevu</li>
        </ul>
      </div>

    </div>
  `;
}

globalThis.renderMethodology = renderMethodology;
export {};
