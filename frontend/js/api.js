/* ═══════════════════════════════════════════════════════════
   AfriBench — API Documentation page
   ═══════════════════════════════════════════════════════════ */

function renderAPI(container) {
  container.innerHTML = `
    <div class="api-content">

      <h2>API Publique</h2>
      <p class="lead">
        AfriBench propose une API publique pour acceder aux resultats des evaluations,
        aux questions du benchmark, et aux donnees des modeles. Tous les endpoints
        retournent des donnees au format JSON.
      </p>

      <p style="font-size:var(--font-size-sm);color:var(--text-muted);margin-bottom:var(--space-3)">
        Base URL : <code style="font-family:var(--font-mono);background:var(--surface-input);padding:2px 8px;border-radius:4px;color:var(--bronze)">https://ytilikan.github.io/AfriBench/api/v1</code>
      </p>

      <div class="api-endpoint">
        <div class="api-endpoint-header">
          <span class="http-method http-get">GET</span>
          <span class="endpoint-url">/results</span>
          <span class="endpoint-desc">Liste de tous les resultats</span>
        </div>
        <div class="api-endpoint-body">
          <h4>Parametres</h4>
          <table class="api-param-table">
            <thead>
              <tr><th>Param</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td>model</td><td>string</td><td>Filtrer par modele (optionnel)</td></tr>
              <tr><td>category</td><td>string</td><td>Filtrer par categorie (optionnel)</td></tr>
              <tr><td>limit</td><td>integer</td><td>Nombre de resultats (defaut: 50, max: 1000)</td></tr>
            </tbody>
          </table>

          <h4>Reponse</h4>
          <div class="api-code-sample">
${'  '}[
  {
    "model": "deepseek-chat",
    "model_label": "DeepSeek V4",
    "timestamp": "2026-06-04T22:23:49.968079",
    "total": 101,
    "correct": 97,
    "accuracy": 96.0,
    "by_category": {
      "histoire": { "correct": 14, "total": 15, "accuracy": 93.3 },
      "geographie": { "correct": 16, "total": 16, "accuracy": 100.0 }
    }
  }
]
          </div>

          <h4>Exemple</h4>
          <div class="api-code-sample">
curl -s "https://ytilikan.github.io/AfriBench/api/v1/results?limit=3" | jq '.'
          </div>
        </div>
      </div>

      <div class="api-endpoint">
        <div class="api-endpoint-header">
          <span class="http-method http-get">GET</span>
          <span class="endpoint-url">/questions</span>
          <span class="endpoint-desc">Liste de toutes les questions</span>
        </div>
        <div class="api-endpoint-body">
          <h4>Parametres</h4>
          <table class="api-param-table">
            <thead>
              <tr><th>Param</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td>category</td><td>string</td><td>Filtrer par categorie (optionnel)</td></tr>
              <tr><td>difficulty</td><td>string</td><td>Filtrer par difficulte: easy, medium, hard (optionnel)</td></tr>
              <tr><td>limit</td><td>integer</td><td>Nombre de questions (defaut: 50, max: 500)</td></tr>
            </tbody>
          </table>

          <h4>Reponse</h4>
          <div class="api-code-sample">
${'  '}[
  {
    "id": "POL-001",
    "category": "droit_politique",
    "subcategory": "institutions",
    "difficulty": "easy",
    "language": "fr",
    "question": "Où se trouve le siege de l'Union africaine ?",
    "options": { "A": "Nairobi, Kenya", "B": "Addis-Abeba, Ethiopie", ... },
    "answer": "B",
    "explanation": "Le siege de l'Union africaine se trouve à Addis-Abeba..."
  }
]
          </div>

          <h4>Exemple</h4>
          <div class="api-code-sample">
curl -s "https://ytilikan.github.io/AfriBench/api/v1/questions?category=histoire&difficulty=hard" | jq '.'
          </div>
        </div>
      </div>

      <div class="api-endpoint">
        <div class="api-endpoint-header">
          <span class="http-method http-get">GET</span>
          <span class="endpoint-url">/models</span>
          <span class="endpoint-desc">Liste des modeles avec leurs scores agreges</span>
        </div>
        <div class="api-endpoint-body">
          <h4>Parametres</h4>
          <table class="api-param-table">
            <thead>
              <tr><th>Param</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td>sort</td><td>string</td><td>Trier par score (asc/desc, defaut: desc)</td></tr>
              <tr><td>open</td><td>boolean</td><td>Filtrer open weights uniquement (optionnel)</td></tr>
            </tbody>
          </table>

          <h4>Reponse</h4>
          <div class="api-code-sample">
${'  '}[
  {
    "id": "deepseek-chat",
    "label": "DeepSeek V4",
    "accuracy": 96.0,
    "correct": 97,
    "total": 101,
    "open_weights": true,
    "categories": {
      "histoire": { "accuracy": 93.3, "correct": 14, "total": 15 }
    }
  }
]
          </div>
        </div>
      </div>

      <div class="api-endpoint">
        <div class="api-endpoint-header">
          <span class="http-method http-get">GET</span>
          <span class="endpoint-url">/stats</span>
          <span class="endpoint-desc">Statistiques globales du benchmark</span>
        </div>
        <div class="api-endpoint-body">
          <h4>Reponse</h4>
          <div class="api-code-sample">
${'  '}{
  "total_questions": 101,
  "total_models": 7,
  "categories": 9,
  "languages": ["fr"],
  "top_score": 96.0,
  "top_model": "DeepSeek V4",
  "average_score": 92.2,
  "last_updated": "2026-06-04"
}
          </div>

          <h4>Exemple avec JavaScript</h4>
          <div class="api-code-sample">
const resp = await fetch('https://ytilikan.github.io/AfriBench/api/v1/stats');
const stats = await resp.json();
console.log(\`Top modele: \${stats.top_model} (\${stats.top_score}%)\`);
          </div>
        </div>
      </div>

      <div class="api-endpoint">
        <div class="api-endpoint-header">
          <span class="http-method http-get">GET</span>
          <span class="endpoint-url">/leaderboard</span>
          <span class="endpoint-desc">Classement complet etendu</span>
        </div>
        <div class="api-endpoint-body">
          <p style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--space-1)">
            Endpoint combine retournant le classement complet avec les top model cards, 
            les tendances et les statistiques de distribution.
          </p>

          <h4>Exemple Python</h4>
          <div class="api-code-sample">
import requests
import pandas as pd

url = "https://ytilikan.github.io/AfriBench/api/v1/leaderboard"
data = requests.get(url).json()

df = pd.DataFrame(data['models'])
print(df[['label', 'accuracy', 'correct', 'total']])

# Score moyen par categorie
for cat, scores in data['category_averages'].items():
    print(f"{cat}: {scores['average']:.1f}%")
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:var(--space-2)">
        <div class="card-title">
          Utilisation
          <span class="badge">NOTE</span>
        </div>
        <p style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.6">
          L'API AfriBench est entierement statique et accessible via GitHub Pages. 
          Les donnees sont mises a jour manuellement lors de chaque nouvelle evaluation.
          Actuellement, les donnees brutes sont accessibles directement depuis le depot GitHub :
        </p>
        <ul style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.8;margin-top:8px;padding-left:20px">
          <li><code style="font-family:var(--font-mono);color:var(--bronze)">data/results.json</code> — Resultats complets</li>
          <li><code style="font-family:var(--font-mono);color:var(--bronze)">data/questions.json</code> — Questions et reponses</li>
        </ul>
        <p style="font-size:var(--font-size-sm);color:var(--text-muted);margin-top:8px">
          Une API REST formelle est en cours de developpement (version 1.0).
        </p>
      </div>

    </div>
  `;
}
