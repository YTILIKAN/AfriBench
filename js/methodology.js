/* ═══════════════════════════════════════════════════════════
   AfriBench — Methodologie page (documentation)
   ═══════════════════════════════════════════════════════════ */

function renderMethodology(container) {
  const totalQ = AppState.questions.length;
  const cats = new Set(AppState.questions.map(q => q.category));
  const languages = new Set(AppState.questions.map(q => q.language));

  container.innerHTML = `
    <div class="methodology-content">

      <h2>Methodologie</h2>
      <p class="lead">
        AfriBench est un benchmark concu specifiquement pour evaluer la performance des modeles
        de langage (LLMs) sur des connaissances et contextes africains. Voici comment il fonctionne.
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
          concu pour mesurer la capacite des LLMs a repondre correctement a des questions portant
          sur les realites africaines.
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
        <p>Les questions sont organisees en ${cats.size} categories couvrant les aspects fondamentaux des societes africaines :</p>
        <p>
          ${categoryKeys().map(key =>
            `<span class="meth-tag bronze" style="border-color:${categoryColor(key)};color:${categoryColor(key)}">${categoryLabel(key)}</span>`
          ).join('')}
        </p>
      </div>

      <div class="meth-section">
        <h3>Evaluation des modeles</h3>
        <p>
          Chaque modele est evalue sur l'ensemble des questions (${totalQ} questions). 
          Le protocole est le suivant :
        </p>
        <ol>
          <li>Chaque question est envoyee au modele via son API avec un prompt standardise</li>
          <li>Le modele doit choisir parmi 4 options (A, B, C ou D)</li>
          <li>La reponse est comparee a la reponse attendue</li>
          <li>Les resultats sont aggregates par categorie et globalement</li>
        </ol>
        <div class="meth-code-block">
          // Exemple de prompt standardise
          {
            "question": "Où se trouve le siege de l'Union africaine ?",
            "options": ["Nairobi, Kenya", "Addis-Abeba, Ethiopie", "Pretoria, Afrique du Sud", "Dakar, Senegal"]
            "instruction": "Repondez UNIQUEMENT par la lettre de la bonne reponse (A, B, C ou D)."
          }
        </div>
      </div>

      <div class="meth-section">
        <h3>Metriques</h3>
        <p>AfriBench utilise 8 metriques standard pour evaluer et comparer les modeles :</p>

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
          <strong style="display:block;margin-bottom:8px;color:var(--bronze);font-size:var(--font-size-sm)">Score global</strong>
          Pourcentage de reponses correctes sur l'ensemble du benchmark (101 questions).
          Metrique principale de performance. Un score de 96% signifie que le modele a repondu
          correctement a 97 questions sur 101.
          <br><br>
          <strong style="display:block;margin-bottom:8px;color:var(--bronze);font-size:var(--font-size-sm)">Scores par difficulte</strong>
          Les questions sont classees en 3 niveaux :
          <strong>Facile</strong> (connaissances de base),
          <strong>Moyen</strong> (connaissances intermediaires),
          <strong>Difficile</strong> (raisonnement avance).
          Ces scores permettent d'evaluer la profondeur des connaissances du modele.
          <br><br>
          <strong style="display:block;margin-bottom:8px;color:var(--bronze);font-size:var(--font-size-sm)">Meilleure categorie</strong>
          La categorie thematique dans laquelle le modele obtient son meilleur score.
          Revele le domaine de predilection du modele (ex: Droit et Politique, Geographie).
          <br><br>
          <strong style="display:block;margin-bottom:8px;color:var(--bronze);font-size:var(--font-size-sm)">Ecart-type (consistance)</strong>
          Mesure de la regularite des performances a travers les 9 categories.
          <br>
          <span style="color:var(--success)">Faible (&lt;5) :</span> performances homogenes
          <br>
          <span style="color:var(--warning)">Moyen (5-8) :</span> legeres variations
          <br>
          <span style="color:var(--danger)">Eleve (&gt;8) :</span> forte disparite selon les sujets
        </div>

        <p><strong>Interpretation :</strong></p>
        <ul>
          <li><strong>DeepSeek V4</strong> (ecart-type 4.7) est le plus <strong>consistant</strong> sur toutes les categories</li>
          <li><strong>Gemini 2.5 Flash</strong> (ecart-type 12.0) montre une forte <strong>disparite</strong> (excellent en Droit, faible en IA)</li>
          <li><strong>Tous les modeles</strong> performent mieux en Droit et Politique et Geographie</li>
          <li><strong>IA et Technologie</strong> est la categorie la plus difficile pour tous les modeles</li>
        </ul>
      </div>

      <div class="meth-section">
        <h3>Reproductibilite</h3>
        <p>
          AfriBench est entierement <strong>open source</strong> et <strong>reproductible</strong> (scripts d'évaluation publiés) :
        </p>
        <ul>
          <li>Les <strong>donnees</strong> (questions, reponses) sont publiees sur GitHub</li>
          <li>Le <strong>code d'evaluation</strong> est ouvert et auditable</li>
          <li>Les <strong>resultats</strong> sont accompagnes d'un timestamp et du modele exact</li>
          <li>Tout le monde peut <strong>soumettre un nouveau modele</strong> ou une nouvelle question</li>
        </ul>
      </div>

      <div class="meth-section">
        <h3>Contribuer</h3>
        <p>
          Vous voulez contribuer a AfriBench ? Plusieurs facons de participer :
        </p>
        <ul>
          <li><strong>Soumettre un modele</strong> — faites evaluer votre modele via notre protocole standard</li>
          <li><strong>Proposer des questions</strong> — ajoutez des questions dans les categories existantes ou nouvelles</li>
          <li><strong>Reviser les questions</strong> — aidez a valider et ameliorer la qualite des questions</li>
          <li><strong>Traductions</strong> — ajoutez des traductions en langues africaines (wolof, haoussa, swahili, etc.)</li>
        </ul>
        <p>
          Consultez le guide de contribution sur 
          <a href="https://github.com/YTILIKAN/AfriBench/blob/main/CONTRIBUTING.md" target="_blank">GitHub</a>.
        </p>
      </div>

      <div class="meth-section">
        <h3>Limites et ameliorations futures</h3>
        <ul>
          <li>Le benchmark est actuellement en <strong>version 0.1</strong> (101 questions)</li>
          <li>Les questions sont principalement en <strong>francais</strong> — les versions multilingues sont en cours</li>
          <li>Les categories seront etendues (sports, arts, religions, etc.)</li>
          <li>Le format pourra evoluer (questions ouvertes, generation de texte, etc.)</li>
          <li>Un systeme de <strong>votation communautaire</strong> pour la qualite des questions est prevu</li>
        </ul>
      </div>

    </div>
  `;
}
