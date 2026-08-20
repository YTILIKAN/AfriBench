/* ═══════════════════════════════════════════════════════════
   AfriBench — API Documentation page
   ═══════════════════════════════════════════════════════════ */

function renderAPI(container) {
  container.innerHTML = `
    <div class="api-content">

      <h2>API Publique</h2>
      <p class="lead">
        AfriBench propose une API publique pour acceder aux résultats des evaluations,
        aux questions du benchmark, et aux donnees des modeles. Tous les endpoints
        retournent des donnees au format JSON.
      </p>

      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:var(--sp-lg)">
        Base URL (local) : <code style="font-family:var(--mono);background:var(--surface);padding:2px 8px;border-radius:4px;color:var(--ocre)">http://127.0.0.1:8080/api/v1</code>
        &nbsp;·&nbsp; Docs : <a href="http://127.0.0.1:8080/docs" target="_blank" rel="noopener">/docs</a>
        &nbsp;·&nbsp; Source données : <code style="font-family:var(--mono);color:var(--ocre)">${AppState.dataSource || '—'}</code>
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
              <tr><td>model</td><td>string</td><td>Filtrer par modèle (optionnel)</td></tr>
              <tr><td>category</td><td>string</td><td>Filtrer par catégorie (optionnel)</td></tr>
              <tr><td>limit</td><td>integer</td><td>Nombre de résultats (defaut: 50, max: 1000)</td></tr>
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
curl -s "http://127.0.0.1:8080/api/v1/results?limit=3" | jq '.'
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
              <tr><td>category</td><td>string</td><td>Filtrer par catégorie (optionnel)</td></tr>
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
curl -s "http://127.0.0.1:8080/api/v1/questions?category=histoire&difficulty=hard" | jq '.'
          </div>
        </div>
      </div>

      <div class="api-endpoint">
        <div class="api-endpoint-header">
          <span class="http-method http-get">GET</span>
          <span class="endpoint-url">/models</span>
          <span class="endpoint-desc">Liste des modèles avec leurs scores agreges</span>
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
  "total_questions": 189,
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
const resp = await fetch('http://127.0.0.1:8080/api/v1/stats');
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
          <p style="font-size:0.82rem;color:var(--charbon);margin-bottom:var(--space-1)">
            Endpoint combiné retournant le classement complet avec moyennes par catégorie.
          </p>

          <h4>Exemple Python</h4>
          <div class="api-code-sample">
import requests
url = "http://127.0.0.1:8080/api/v1/leaderboard"
data = requests.get(url).json()
print(data['stats'])
          </div>
        </div>
      </div>

      <div class="api-endpoint">
        <div class="api-endpoint-header">
          <span class="http-method http-post">POST</span>
          <span class="endpoint-url">/evaluate</span>
          <span class="endpoint-desc">Lancer une évaluation (auth requise)</span>
        </div>
        <div class="api-endpoint-body">
          <p style="font-size:0.82rem;color:var(--charbon);margin-bottom:8px">
            Header requis : <code style="font-family:var(--mono);color:var(--ocre)">X-API-Key</code>
            (= <code style="font-family:var(--mono)">AFRIBENCH_API_KEY</code>).
            Job asynchrone — suivre via <code style="font-family:var(--mono)">GET /jobs/{id}</code>.
          </p>
          <div class="api-code-sample">
curl -X POST http://127.0.0.1:8080/api/v1/evaluate \\
  -H "X-API-Key: $AFRIBENCH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o","limit":5}'

# Suivi
curl -s http://127.0.0.1:8080/api/v1/jobs/JOB_ID | jq .
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:var(--sp-md)">
        <div class="card-title">
          Architecture
          <span class="badge">v0.1</span>
        </div>
        <p style="font-size:0.82rem;color:var(--charbon);line-height:1.6">
          AfriBench est scindé en deux services :
        </p>
        <ul style="font-size:0.82rem;color:var(--charbon);line-height:1.8;margin-top:8px;padding-left:20px">
          <li><strong>backend/</strong> — API FastAPI (<code style="font-family:var(--mono);color:var(--ocre)">:8080</code>) + rate-limit + clé API pour l'écriture</li>
          <li><strong>frontend/</strong> — UI statique (nginx ou <code style="font-family:var(--mono)">python -m http.server</code>)</li>
        </ul>
        <p style="font-size:0.82rem;color:var(--charbon);line-height:1.6;margin-top:8px">
          En local : <code style="font-family:var(--mono);color:var(--ocre)">docker compose up --build</code>
          (frontend <code>:3000</code>, API <code>:8080</code>, docs <code>/docs</code>).
          Sans backend, le frontend retombe sur les JSON statiques
          <code style="font-family:var(--mono);color:var(--ocre)">frontend/data/*.json</code>.
        </p>
      </div>

    </div>
  `;
}
