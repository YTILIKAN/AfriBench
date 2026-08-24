# AfriBench — Audit de qualité

**Date :** 24 août 2026 · **Périmètre :** dépôt complet (backend, frontend, scripts, données, CI/CD, déploiement)
**Méthode :** revue de code assistée, puis **vérification par exécution** de chaque constat — aucune affirmation de ce document n'est déduite de la seule lecture du code.

---

## 1. Résumé exécutif

Deux défauts critiques rendaient le produit défaillant en production au moment de l'audit :

1. **Le site déployé ne chargeait pas.** Le build Vite référençait ses assets en chemin absolu (`/assets/…`) alors que GitHub Pages sert le site sous `/AfriBench/`. Vérifié en direct : `https://ytilikan.github.io/assets/index-W-rcl8wY.js` → **404**, la même ressource sous `/AfriBench/` → 200. Les visiteurs ne voyaient que le classement statique de repli, sans style ni interactivité.

2. **Une XSS réfléchie donnait accès au backoffice.** `?category=<img src=x onerror=…>` s'interpolait sans échappement dans le classement, et le jeton d'administration est stocké en `localStorage` sur la même origine. Un simple lien envoyé à un administrateur suffisait à obtenir l'accès CRUD complet — j'ai reproduit l'exfiltration du jeton de bout en bout.

Un troisième défaut atteignait la validité scientifique du projet : **l'extraction des réponses attribuait une lettre à des refus et à des messages d'erreur.** « Désolé, je ne peux pas répondre. » était noté **D**, « Rate limit exceeded » était noté **A**. Les scores publiés (90–96 %) étaient donc contaminés dans les deux sens, et la catégorie `no_answer` pratiquement inatteignable.

**Vingt corrections ont été apportées et vérifiées.** Le reste de ce document liste ce qui a été fait, puis ce qui reste — par ordre de priorité, avec le raisonnement.

### État après corrections

| Indicateur | Avant | Après |
|---|---|---|
| Site déployé fonctionnel | **non** | oui |
| XSS réfléchie | **présente** | fermée, avec tests de non-régression |
| Exfiltration du jeton admin | **possible** | fermée, avec preuve de non-régression |
| Fuite de clé d'API via `/jobs` | **présente** | fermée |
| Rate limiting contournable | **oui** (`X-Forwarded-For`) | non |
| `/admin/login` protégé contre le dictionnaire | **non** | oui (5 essais / 15 min) |
| Extraction de réponse fiable | **non** | oui, 25 tests |
| Poids transféré au premier chargement | **395 Ko** | **115 Ko** (−71 %) |
| Contrastes WCAG AA | 6 paires en échec | toutes conformes |
| Tests backend | 61 | **98** |
| Tests frontend | 33 | **58** |
| Graphiques couverts par des tests | **aucun** | 5 tests |
| Les tests salissent le dépôt | **oui** | non, vérifié en CI |
| Lignes de CSS | 4 520 | **3 714** (−18 %) |
| Classes CSS mortes | 32 | **0** |
| Blocs de tokens dupliqués | 2 `:root` + 2 sombres | **1 + 1** |
| Backoffice bundlé, linté, sous CSP stricte | **non** | oui |
| Lint CSS, audit des dépendances en CI | **absents** | en place |
| Règle de lint contre les interpolations non échappées | **absente** | en place (8 défauts trouvés) |

---

## 2. Ce qui a été corrigé

Chaque entrée indique la gravité, ce qui n'allait pas, et **comment la correction a été vérifiée**.

### 2.1 Critique

**C1 — Le build déployé référençait ses assets en chemin absolu**
`frontend/vite.config.js`

Vite utilise `base: '/'` par défaut. Le site étant servi sous `/AfriBench/` sur GitHub Pages, `dist/index.html` demandait `/assets/index-*.js` → 404. Les deux liens vers `/admin/` étaient également cassés.

*Correction :* `base: './'` — les chemins relatifs fonctionnent aussi bien à la racine (nginx, Docker) que sous un sous-chemin. Liens admin passés en relatif.
*Vérification :* le HTML construit référence `./assets/…` ; un garde-fou CI échoue désormais si un chemin absolu réapparaît.

**C2 — XSS réfléchie via les filtres d'URL**
`frontend/js/app.js`, `leaderboard.js`, `questions.js`, `compare.js`

`applyUrlState` recopiait `?category=` sans validation ; `categoryLabel()` renvoyait la valeur brute pour toute clé inconnue, et cinq vues l'interpolaient dans du `innerHTML`. Reproduit : deux éléments `<img onerror>` injectés dans le classement.

*Correction :* deux couches. Validation par liste blanche à la frontière (`parseUrlFilters`, extraite en fonction pure testable), et échappement à chaque point d'interpolation HTML. Les libellés restent bruts pour les exports CSV/JSON et les étiquettes de graphiques, où un échappement HTML corromprait la sortie.
*Vérification :* 4 tests de non-régression, dont l'injection depuis une catégorie de question et depuis la meilleure catégorie d'un modèle.

**C3 — Échappement HTML utilisé dans un contexte JavaScript (backoffice)**
`frontend/admin/index.html`

Les tables généraient `onclick="editQuestion('${esc(x.id)}')"`. `esc` transforme `'` en `&#39;`, mais **l'analyseur HTML le redécode avant que l'attribut soit compilé comme du JavaScript**. Un identifiant contenant une apostrophe s'échappait donc de la chaîne. Reproduit : jeton d'administration exfiltré.

*Correction :* suppression des huit gestionnaires en ligne, remplacés par des attributs `data-act`/`data-id` et une délégation d'événements unique.
*Vérification :* la charge ne s'exécute plus, `data-id` transite intact, le gestionnaire fonctionne toujours. Un garde-fou CI interdit tout retour d'un attribut `on*=`.

**C4 — L'extraction des réponses devinait une lettre**
`scripts/afribench.py`

Deux règles fautives : la deuxième renvoyait `text[0]` dès que le premier caractère était A–D (« **D**'après moi… » → D), la quatrième renvoyait le premier caractère A–D trouvé n'importe où dans le texte (toute prose française produisait une lettre).

*Correction :* quatre motifs ancrés, du plus strict au plus permissif, avec refus explicite en cas d'ambiguïté. Le dernier recours n'accepte une lettre isolée que si elle est **unique** dans le texte. Les réponses non interprétables sont conservées dans `details.unparsed_response`, ce qui rend les `no_answer` auditables.
*Vérification :* 25 tests, dont les cinq chaînes qui produisaient un faux positif.

**C5 — Fuite de clé d'API via un endpoint public**
`scripts/afribench.py`, `backend/app/redaction.py`, `backend/app/services/evaluate.py`

La clé Gemini passait en query string ; `requests` recopie l'URL complète dans le message de ses `HTTPError` ; ce message était persisté dans `eval_jobs.error`, exposé par `GET /api/v1/jobs` — **sans authentification**.

*Correction :* trois couches. Clé transmise par l'en-tête `x-goog-api-key`. Nouveau module `redaction.py` qui masque les clés en query string, les préfixes connus (`sk-`, `AIza`, `hf_`, `xox*`) et les valeurs littérales des variables d'environnement sensibles. Détail complet journalisé côté serveur uniquement.
*Vérification :* 6 tests, plus reproduction du message d'erreur d'origine avant/après.

**C6 — `/admin/login` sans limitation de débit**
`backend/app/routers/admin.py`, `app/security.py`, `app/config.py`

Le routeur v1 déclarait `enforce_rate_limit`, le routeur admin non. Mesuré : 8 tentatives → 8 × 401, aucun 429. Or un succès donne un jeton valide 12 h ouvrant tout le CRUD.

*Correction :* rate limiting appliqué au routeur admin, avec un budget dédié beaucoup plus strict pour `/login` (5 essais / 15 min, configurable).
*Vérification :* test qui assert la présence d'un 429.

**C7 — `X-Forwarded-For` cru sans réserve**
`backend/app/security.py`

L'en-tête est fourni par le client. Mesuré : 6 requêtes depuis la même IP → 3 × 200 puis 3 × 429 ; 6 requêtes avec un `X-Forwarded-For` tournant → **6 × 200**. Toute limite de débit était donc décorative, ce qui rendait C6 exploitable même après correction.

*Correction :* nouveau réglage `AFRIBENCH_TRUSTED_PROXY_HOPS` (défaut `0`). À 0, l'en-tête est ignoré. À N ≥ 1, la lecture se fait **depuis la droite** — la seule extrémité qu'un attaquant ne contrôle pas.
*Vérification :* 2 tests couvrant les deux configurations.
*⚠️ Action requise au déploiement :* **`AFRIBENCH_TRUSTED_PROXY_HOPS=1` doit être défini sur Railway**, sinon toutes les requêtes portent l'IP du proxy et les visiteurs se bloquent mutuellement. Documenté dans [`docs/deploiement-railway.md`](deploiement-railway.md) et `.env.example`.

### 2.2 Élevé

**H1 — Appel bloquant dans une dépendance `async`**
`backend/app/security.py` — `enforce_rate_limit` était `async def` mais appelait des entrées-sorties **synchrones** (psycopg ou redis-py). Une dépendance `async` s'exécute directement dans la boucle d'événements : chaque requête bloquait toutes les autres. Mesuré avec un limiteur simulé à 200 ms : 10 requêtes concurrentes sur `/health` en **2,03 s** au lieu de 0,2 s. Le débit de toute l'API était plafonné à `1 / latence_du_limiteur`.
*Correction :* retrait du mot-clé `async`, FastAPI exécute alors la dépendance dans son pool de threads.

**H2 — Contamination train/test du few-shot dans le CLI**
`scripts/afribench.py` — les N premiers exemples étaient injectés dans le prompt **avec leur réponse correcte**, puis notés. Le chemin service faisait correctement `questions[few_shot:]` ; le CLI, non — or c'est le chemin de l'`ENTRYPOINT` Docker, donc celui de la reproductibilité annoncée.
*Correction :* alignement sur le service, plus une sortie en erreur si `--few-shot` consomme tout le corpus.
*Vérification :* `--few-shot 3` évalue désormais 347 questions au lieu de 350.

**H3 — Un fichier JSON malformé mettait l'API par terre**
`backend/app/services/data_loader.py`, `open_tasks.py` — `load_questions` et les trois chargeurs de `open_tasks` ne protégeaient pas leur parsing. Mesuré avec un fichier corrompu déposé dans le corpus : `/questions`, `/stats`, `/validation/status` et `/leaderboard` renvoyaient tous **500**. Or le corpus est alimenté par des contributions externes.
*Correction :* `_read_json` tolérant dans les deux modules, avec journalisation du chemin et de l'erreur. Même garde dans le chargeur du CLI.
*Vérification :* les quatre endpoints renvoient 200 et le fichier fautif est signalé dans les logs.

**H4 — Des identifiants dupliqués faisaient échouer le seed sans alerte**
`scripts/afribench.py` — deux fichiers contenant le même `id` font échouer l'`INSERT … ON CONFLICT DO UPDATE` de PostgreSQL. L'exception étant capturée au démarrage, le service basculait en mode fichiers et **la base restait vide sans que personne ne soit averti**.
*Correction :* détection d'unicité des `id` dans `validate_questions`, et exécution de `afribench.py validate` ajoutée à la CI — un doublon bloque désormais la pull request.

**H5 — Deux fuites de ressources dans le frontend**
`frontend/js/questions.js` — un écouteur `click` sur `document` était enregistré **à chaque rendu** : mesuré 25 écouteurs après 25 rendus, chacun retenant un DOM détaché. Chaque filtre, changement de page et frappe de recherche en ajoutait un.
`frontend/js/app.js` — `mountChart` appelait `Chart.getChart(canvas)` pour détruire l'instance précédente, mais les vues remplacent leur `innerHTML` avant de remonter : le canvas est donc neuf et l'ancienne instance restait vivante avec ses données et son `ResizeObserver`. Mesuré : 10 instances après 5 rendus.
*Correction :* écouteur enregistré une seule fois au niveau du module ; registre explicite de graphiques indexé par identifiant de canvas, plus destruction des graphiques détachés au changement de vue.
*Vérification :* 0 écouteur ajouté sur 25 rendus ; 2 instances de graphique après 5 rendus (au lieu de 10).

**H6 — Double rendu à chaque navigation**
`frontend/js/app.js` — `setActiveTab` appelait `renderActiveTab()` puis `applyUrlFilters()`, qui rendait une seconde fois pour le classement et les questions. Combiné à H5, cela doublait le rythme de la fuite.
*Correction :* séparation de la synchronisation des filtres (`syncFilterState`) et du rendu.
*Vérification :* test qui compte les appels — 1 par navigation.

**H7 — Ni compression, ni cache, ni en-têtes de sécurité**
`frontend/nginx.template.conf` — l'image `nginx:1.27-alpine` livre gzip désactivé. Les assets à nom haché étaient revalidés à chaque visite. Aucune CSP, aucun `X-Content-Type-Options`, `Referrer-Policy` ni `Permissions-Policy`.
*Correction :* gzip activé, cache d'un an sur `/assets/`, revalidation systématique de `index.html`, et jeu complet d'en-têtes de sécurité avec CSP stricte. Politique distincte et documentée pour `/admin/`, dont le JavaScript est encore en ligne.
*Vérification :* configuration validée par `nginx -t`, puis **servie réellement** et en-têtes inspectés. Mesures : JS 304 Ko → 98 Ko (−68 %), CSS 76 Ko → 13 Ko (−83 %), HTML 14 Ko → 4 Ko (−72 %). **Total premier chargement : 395 Ko → 115 Ko.**
*Piège nginx évité :* un `add_header` dans un bloc `location` **annule** ceux hérités du parent. Les blocs de cache n'utilisent donc que `expires`, ce qui préserve les en-têtes de sécurité — vérifié sur les réponses réelles.

**H8 — Contrastes non conformes WCAG AA en thème clair**
`frontend/css/style.css` — l'orange de marque `#FFA726` plafonne à **1,85:1** sur fond ivoire. Il était utilisé comme couleur de texte dans 32 règles et comme anneau de focus, là où WCAG 1.4.3 exige 4,5:1 et 1.4.11 exige 3:1. `--success`, `--warning` et `--danger` échouaient également.
*Correction :* deux variantes dérivées — `--ocre-ink` (#A05A08, ≥4,78:1) pour le texte, `--ocre-ui` (#C4740A, ≥3,24:1) pour icônes, bordures et focus. L'orange de marque est **conservé pour les remplissages**, où le noir dessus atteint 10,29:1, et **conservé tel quel dans la barre latérale**, qui est sombre dans les deux thèmes (9,12:1). En thème sombre, les deux variantes reviennent à l'orange de marque.
*Vérification :* ratios recalculés sur les trois fonds clairs et les deux fonds sombres — toutes les paires passent. Rendu contrôlé visuellement dans les deux thèmes : l'identité visuelle est préservée.

**H9 — Anneau de focus supprimé sur les commandes les plus utilisées**
`frontend/css/style.css` — un `outline: 0` situé 1 900 lignes après la règle globale `input:focus-visible`, à spécificité égale, la neutralisait sur la recherche et les trois sélecteurs de la barre de filtres.
*Correction :* règle `:focus-visible` dédiée avec l'anneau conforme.

**H10 — Référence ARIA pointant vers un élément inexistant**
`frontend/index.html`, `js/app.js` — le panneau déclarait `aria-labelledby="nav-leaderboard"`, identifiant absent du document ; le repli calculé produisait la même erreur. Le panneau était donc sans étiquette. Aggravant : `#tab-content` n'avait aucune région `aria-live`, alors que tout y est remplacé sans rechargement — la navigation entière était silencieuse pour un lecteur d'écran.
*Correction :* référence corrigée vers l'identifiant d'espace, plus `aria-live="polite"`.
*Vérification :* 6 tests qui assertent que la référence désigne un élément réel pour chaque vue. Le test préexistant de navigation validait un gabarit DOM **qui n'existe pas en production** (identifiants par vue au lieu d'identifiants par espace) : il a été aligné sur le balisage réel.

### 2.3 Moyen

**M1 — Chart.js importé en totalité**
`frontend/src/main.js` → `src/chart-setup.js` — `registerables` embarquait les contrôleurs camembert, secteur polaire, nuage de points et bulles, les échelles logarithmique et temporelle, et les greffons de décimation et de sous-titre. L'application n'utilise que barres, courbes et radar.
*Correction :* import sélectif de 12 composants, extrait dans un module partagé avec les tests pour empêcher toute dérive.

**M2 — Polices inatteignables livrées**
31 fichiers `woff2` étaient produits, dont les jeux cyrillique, grec et vietnamien qu'un site francophone ne peut jamais atteindre, plus deux graisses de Sora référencées par aucune règle CSS.
*Correction :* sous-ensembles `latin` et `latin-ext` uniquement. **Point de vigilance vérifié :** le corpus contient `œ` (57 occurrences, jeu latin), `ĩ` et `ũ` (jeu latin-ext) — se limiter à `latin` aurait dégradé le rendu du corpus.
*Résultat combiné M1+M2 :* JS 303,5 → 278,5 Ko, CSS 76,3 → 68,5 Ko, polices 401 → 252 Ko, artefact total 2,1 → 1,7 Mo.

**M3 — Les graphiques n'étaient couverts par aucun test**
Chart.js n'était jamais chargé en test : `typeof Chart === 'undefined'` et `mountChart` renvoyait `null` sur tous les chemins. Remplacer `registerables` par un import sélectif aurait donc produit des graphiques vides en production **sans faire échouer un seul test**.
*Correction :* `tests/setup.js` fournit `ResizeObserver` et un contexte 2D factice — jsdom expose bien `getContext`, mais son implémentation lève « Not implemented », ce qui invalidait le garde d'existence initial. 5 tests couvrent les quatre types de graphiques et l'absence de fuite.
*Vérification :* retirer un composant enregistré fait bien échouer deux tests. L'assertion initiale sur le radar ne vérifiait que le type déclaré — insuffisant — et a été renforcée sur le contrôleur réellement instancié.

**M4 — Les tests salissaient le dépôt**
`backend/tests/test_exports.py` — le test d'export réécrivait `data/DATASET_CARD.md` et `data/hf/…/README.md` à chaque exécution. Un `git diff --exit-code` après les tests était donc impossible, et un développeur committait par accident des fichiers regénérés.
*Correction :* option `--out` sur `export_hf_dataset.py`, test dirigé vers `tmp_path`, et **étape CI qui échoue si la suite modifie un fichier versionné**.

**M5 — Le build masquait ses propres échecs**
`frontend/package.json` — `cp -r … 2>/dev/null || true` : un dossier `data/` absent produisait un build « réussi » livrant un site dont toute la couche de données répondait 404.
*Correction :* script Node explicite qui échoue avec un message nommant les fichiers manquants, et vérifie que `public/` a bien été recopié.
*Vérification :* code de sortie 1 quand `data/` est absent, 0 sinon.

**M6 — Absence de favicon, d'image de partage et de manifeste**
Aucun `og:image`, `twitter:card`, favicon, `apple-touch-icon`, manifeste ni `theme-color`. Chaque visite générait un 404 sur `/favicon.ico`, et tout partage sur LinkedIn, WhatsApp ou Slack s'affichait comme un lien nu — pour un projet dont l'objet est la visibilité publique.
*Correction :* favicon SVG et icône tactile dans la charte, image de partage 1200×630 générée dans la charte, manifeste web, `theme-color` par préférence de thème.
*Point technique :* Vite hachait le manifeste, ce qui cassait les chemins d'icônes qu'il contient (relatifs à lui-même). Les fichiers à URL fixe ont donc été déplacés dans `public/`, mécanisme idiomatique de Vite, et `copy-static` vérifie leur présence dans le build.

**M7 — Le sitemap se contredisait**
Quatre des cinq URL déclarées étaient des variantes `?tab=…` servant le même `index.html`, dont la balise canonique pointe sur la racine : chaque entrée se déclarait donc elle-même non canonique et était écartée par les moteurs.
*Correction :* une seule URL, avec `lastmod`, et la raison documentée dans le fichier.

**M8 — Trois défauts fonctionnels**
Le bouton « Aucun » de la vue Évolution était inerte : il vidait la sélection, puis le rendu suivant la voyait vide et la repeuplait aussitôt (mesuré : 2 cases cochées avant, 2 après). Corrigé par un drapeau d'initialisation explicite.
`saveFavorites` n'était pas protégé, alors que `loadFavorites` l'était : en navigation privée, l'exception remontait du gestionnaire de clic et laissait l'étoile incohérente.
Quitter l'onglet Participer avec la modale ouverte laissait le défilement de la page **verrouillé pour toute la session**, `closeModal` sortant prématurément quand la modale n'était plus dans le DOM.

**M9 — Deux défauts d'authentification**
`secrets.compare_digest` refuse les `str` non-ASCII. Un mot de passe accentué — le cas normal en français — produisait un **500 déclenchable sans authentification** sur `/admin/login`, et une clé d'API accentuée un 500 au lieu d'un 401. Corrigé par comparaison sur les octets.
*À noter :* la voie `X-API-Key` n'est pas exploitable via un client HTTP standard, les en-têtes devant être ASCII — mais la voie du mot de passe, transmise en JSON, l'était.

**M10 — Un minuteur de sondage non borné**
`frontend/admin/index.html` — relancer une évaluation laissait le `setInterval` précédent tourner indéfiniment. Corrigé par un minuteur unique. Ajout au passage de la fermeture par Échap, absente de la modale du backoffice.

**M11 — Code mort et chiffres périmés**
`frontend/js/categories.js` (185 lignes) n'était importé par aucun point d'entrée, absent de `VALID_TABS` et de la table de dispatch, et `?tab=categories` était activement réécrit vers `leaderboard` — seul son test le maintenait en vie. Supprimé avec son test.
`data/questions/v1/manifest.json` annonçait 300 QCM pour un corpus de 350 ; le README annonçait 58 tests pour 98. Chiffres du rapport technique recalculés.

### 2.4 Garde-fous ajoutés en CI

Quatre étapes empêchent la réapparition des défauts les plus coûteux :

| Étape | Ce qu'elle empêche |
|---|---|
| `git diff --exit-code` après les tests | Qu'une suite de tests modifie des fichiers versionnés (M4) |
| `afribench.py validate` sur le corpus | Qu'un identifiant dupliqué ou un schéma invalide entre dans le corpus (H4) |
| Détection de chemins absolus dans `dist/index.html` | Que le site déployé redevienne inchargeable (C1) |
| Détection d'attributs `on*=` | Qu'un gestionnaire en ligne casse la CSP ou réintroduise C3 |

---

## 3. Ce qui reste à améliorer

Classé par retour sur effort. Chaque entrée précise **pourquoi c'est un problème** et **ce qu'il faut faire**, avec les emplacements exacts.

### 3.1 À traiter en premier — intégrité des mesures et des données

**R1. L'exclusion mutuelle des évaluations est contournée par son propre repli** — `backend/app/services/evaluate.py:175-185`
Quand le verrou PostgreSQL est refusé (une évaluation tourne déjà), `_acquire_runner` ne s'arrête pas : il se replie sur le verrou mémoire, qui réussit puisque le premier job détient le verrou *PostgreSQL* et non le verrou *processus*. Vérifié : deux jobs acquièrent simultanément. La garantie annoncée « une seule à la fois » est donc fausse dès que PostgreSQL est activé, c'est-à-dire en production. Deux évaluations concurrentes écrivent deux résultats, épuisent le quota du fournisseur et faussent le classement.
*Correctif :* distinguer trois états — acquis, refusé, backend indisponible — et ne se replier que sur le troisième.

**R2. Le verrou consultatif est pris et relâché sur deux connexions différentes** — `backend/app/repository.py:720-749`
`pg_try_advisory_lock` est attaché à la *session PostgreSQL*, pas à la transaction. La prise et la libération ouvrent deux sessions distinctes : si le pool rend une autre connexion, la libération est un no-op et **plus aucune évaluation ne peut démarrer** jusqu'au recyclage de la connexion ; à l'inverse, si le pool recycle la connexion pendant l'évaluation, le verrou disparaît en cours de route. Le comportement dépend de l'ordonnancement du pool, donc il est intermittent et très difficile à diagnostiquer.
*Correctif :* tenir une connexion dédiée pour toute la durée du job, via un gestionnaire de contexte.

**R3. Une panne d'infrastructure devient un score de 0 % publié** — `scripts/afribench.py:336-350`
Après cinq échecs, l'exception est capturée, `model_answer` reste `None`, et la question est comptée `no_answer`. Une clé expirée ou une coupure réseau produit donc un run complet à `accuracy: 0.0` qui entre dans le classement comme une mesure légitime. Aggravant : les réessais s'appliquent aussi aux erreurs non rejouables (401, 400), soit environ 3 h de réessais inutiles sur 350 questions avant de produire ce 0 %.
*Correctif :* compter les erreurs, abandonner au-delà d'un seuil (5 %) en marquant le job `failed` plutôt qu'en écrivant un résultat ; ne rejouer que 429, 5xx et erreurs réseau.

**R4. Horodatages naïfs, triés comme des chaînes, décident du « dernier » résultat** — `scripts/afribench.py`, `backend/app/models.py:95`, `repository.py:136`
`datetime.now().isoformat()` produit une heure locale sans décalage, et `Result.timestamp` est une colonne `String` triée lexicographiquement. Un run lancé depuis un poste en UTC+1 et un autre depuis un conteneur en UTC ne sont pas comparables ; au changement d'heure, une heure entière de résultats se retrouve mal ordonnée. Le classement peut donc afficher un résultat plus ancien comme le plus récent, silencieusement.
*Correctif :* `datetime.now(timezone.utc)`, et migration de la colonne en `DateTime(timezone=True)`.

**R5. Une clé de chiffrement invalide stocke les secrets en clair, sans un mot** — `backend/app/repository.py:439-474`
`_fernet()` avale toute erreur de construction et `_encrypt_secret` retourne alors le texte en clair. Vérifié : avec une clé tronquée ou fautive, la valeur stockée est le secret brut. Une faute de frappe dans `AFRIBENCH_ENCRYPTION_KEY` désactive donc le chiffrement de toutes les clés de fournisseurs — on croit être protégé, on ne l'est pas. Symétriquement, après une rotation de clé, `_decrypt_secret` renvoie `None`, ce que l'interface traduit par « clé API manquante » : l'opérateur ressaisit des clés valides pour un problème de rotation.
*Correctif :* échouer bruyamment au démarrage si la clé est non vide et invalide ; distinguer « absente » de « indéchiffrable ».

### 3.2 Ensuite — robustesse et exploitation

**R6. `/health` ne teste jamais la base : le healthcheck conteneur affirme le faux** — `backend/app/routers/v1.py:44-46`
Le cycle de vie capture toute exception d'initialisation, migrations comprises, et se contente de la journaliser. Si les migrations échouent ou si PostgreSQL est injoignable, le conteneur est déclaré sain, l'orchestrateur le laisse en service, et l'API sert silencieusement les anciens fichiers JSON. Le repli fichier est un choix défendable, mais il doit être **observable**.
*Correctif :* renvoyer `{"status": "ok"|"degraded", "database": …, "migrations": …}` avec un `SELECT 1` borné, et garder un `/health/live` trivial pour la sonde de vivacité.

**R7. Les endpoints d'administration renvoient 500 sans base de données** — `backend/app/routers/admin.py`
Le routeur v1 gère ce cas proprement (503 avec message actionnable) ; le routeur admin, non. Or `database_url` vide est le mode par défaut, explicitement documenté comme supporté. Tout le backoffice renvoie donc des 500 opaques dans la configuration par défaut.
*Correctif :* une dépendance `require_db` levant 503, appliquée au routeur.

**R8. Les handlers d'administration acceptent des dictionnaires bruts** — `backend/app/routers/admin.py`
Six handlers prennent `dict[str, Any]` avec pour seule validation un test de présence. Conséquences : un champ trop long ou mal typé propage un `DataError` en 500 avec trace au lieu d'un 422 exploitable ; aucune contrainte métier n'est vérifiée (`difficulty` hors énumération, `answer` absente des options), alors que `validate_questions` sait déjà les détecter ; et `/docs` affiche `{}` comme schéma, rendant le backoffice non documentable. Le modèle à suivre existe déjà dans le dépôt : `schemas.ProposalCreate` est exemplaire.
*Correctif :* de vrais schémas Pydantic avec longueurs alignées sur les colonnes SQL, `Literal` pour les énumérations, validateur croisé `answer in options`, et `response_model` sur chaque route.
*Lié :* un nom de modèle contrôlé par l'administrateur alimente un chemin de fichier (`scripts/afribench.py:399`) sans assainissement — traversée de chemin possible depuis un compte admin compromis, d'autant que les conteneurs tournent en root.

**R9. Quatre défauts dans le rate limiter** — `backend/app/rate_limit.py`
Mémoire non bornée : les clés `(ip, path)` ne sont jamais évincées — 50 000 clés retenues après 50 000 IP uniques. Un `DELETE` non scopé purge les compteurs d'écriture quand la fenêtre de lecture est plus courte, remettant le budget d'écriture à zéro à chaque lecture. Le `COUNT` puis `INSERT` n'est pas atomique, donc la limite est franchissable proportionnellement à la concurrence, côté PostgreSQL comme côté Redis. Et deux à trois requêtes SQL plus un `COMMIT` sont émis par requête HTTP.
*Correctif :* éviction LRU, purge hors du chemin chaud, script Lua atomique côté Redis.

**R10. `_load_afribench` empoisonne `sys.modules`** — `backend/app/services/evaluate.py:37-50`
Le module est inscrit dans `sys.modules` **avant** son exécution, et le test de cache précède l'affectation. Après un seul échec de chargement, toute évaluation ultérieure échoue avec `AttributeError: module has no attribute 'load_questions'` — message qui masque totalement la cause — et cela persiste jusqu'au redémarrage du processus. Le même créneau existe entre threads.
*Correctif :* verrou de module, test de cache sous verrou, inscription après exécution réussie. Mieux : faire de `scripts/` un vrai paquet installable et remplacer ce chargement dynamique par un `import`.

**R11. `resume_queued_jobs` peut faire échouer un job qui tourne correctement** — `backend/app/services/evaluate.py:317-338`
Au démarrage, chaque réplica relance tous les jobs `queued` sans réservation atomique. Celui qui n'obtient pas le verrou écrit `status="failed"` — sur le job que l'autre exécute correctement.
*Correctif :* réserver par `UPDATE … WHERE status='queued' RETURNING`, et ne démarrer que si l'`UPDATE` retourne une ligne.

**R12. Sept `except: pass` masquent les pannes de base** — `data_loader.py`, `evaluate.py`
Le repli fichier est légitime, mais il est ici *muet* : base injoignable, migration en retard, mot de passe expiré — l'API sert des données périmées avec des 200 OK et pas une ligne de log. Le plus grave (`evaluate.py:257`) avale l'échec d'insertion du résultat : le job est marqué `completed`, le fichier existe, la base ne contient rien.
*Correctif :* journaliser en `warning` avec `exc_info`, restreindre le type capturé à `SQLAlchemyError`, et exposer un compteur de replis dans `/health` (R6).

### 3.3 Performance

**R13. N+1 et absence de pagination sur `/proposals`** — `backend/app/repository.py:184-244`
Mesuré : **76 allers-retours SQL pour 25 propositions** (1 + 3N), sans `LIMIT`, avec tri en Python après chargement complet. À 1 000 propositions, une seule requête HTTP déclenche environ 3 000 allers-retours — sur un endpoint public destiné à grossir.
*Correctif :* une requête avec agrégation `LEFT JOIN` + `GROUP BY`, tri et pagination en SQL.

**R14. Le champ `details` représente 92 % du payload et est chargé pour rien** — `backend/app/repository.py:90-107`
`list_results()` fait `select(Result)` — colonne JSONB `details` incluse — puis `filter_results` la retire. Mesuré sur les données réelles : 87 Kio de JSON dont **81 Kio de `details`**. Quatre endpoints transfèrent donc depuis PostgreSQL environ 12 fois plus d'octets que nécessaire, à chaque requête, sans cache.
*Correctif :* `load_only`/`defer`, et un endpoint dédié pour le détail.

**R15. `/stats` relit des dizaines de fichiers à chaque appel** — `backend/app/routers/v1.py:147-156`
`build_validation_status`, `load_translation_manifest` et `load_open_tasks` ne sont pas mis en cache et reparcourent l'intégralité des répertoires. C'est l'endpoint qui alimente la page d'accueil, donc le plus sollicité.
*Correctif :* les placer derrière le même cache invalidable que le catalogue.

**R16. Le cache des scores ouverts n'est jamais invalidé** — `backend/app/services/open_tasks.py:74`
`clear_catalog_cache()` ne vide que `get_catalog`. `POST /reload` prétend recharger le catalogue mais `/open/scores` continue de servir l'ancien fichier jusqu'au redémarrage.

**R17. Index manquants pour les requêtes réellement émises** — `backend/app/models.py`
`rate_limit_hits` a deux index séparés là où la requête chaude est `WHERE key = ? AND hit_at >= ?` (composite requis). `results` est trié par `timestamp` sans index utilisable sur cette colonne. `questions.category` est indexé mais le filtrage est fait en Python après chargement de toute la table — l'index n'est jamais utilisé.

**R18. `bootstrap.json` : 283 Ko téléchargés puis jetés** — *corrigé le 24 août (soir).*
`await loadBootstrap()` s'achevait **avant** que les requêtes API démarrent, donc le temps
d'interactivité était la *somme* des latences et non la plus grande. Sur un déploiement sain, ces
283 Ko étaient téléchargés puis immédiatement écrasés par la réponse API, à chaque chargement de
page. Ni délai d'expiration, ni `AbortController`, ni garde de réentrance — le bouton « Réessayer »
pouvait déclencher des chargements concurrents dont les réponses arrivaient dans le désordre.
*Correction :* les deux partent ensemble ; dès que l'API répond, le téléchargement de l'instantané
est **interrompu** ; si l'API tarde, l'instantané est affiché puis remplacé (`onEarlyPaint`) ;
délai d'expiration de 12 s et garde de réentrance ajoutés. 6 tests couvrent ces comportements,
dont l'interruption effective et le repli en cascade.

**R19. Un délai fixe de 0,5 s codé en dur** — `scripts/afribench.py:333`
Non configurable, dans une boucle strictement séquentielle : 350 questions représentent 175 s de
sommeil pur, avant toute latence d'API. Le thread est lancé en `daemon=True` depuis un handler
HTTP : il n'est pas supervisé, ne peut pas être annulé, n'émet aucun signe de vie, et ne sait pas
reprendre. Sur Railway, chaque déploiement détruit l'évaluation en cours et tout le travail
effectué est perdu.
*Correctif :* rendre le délai configurable, paralléliser avec un pool borné, et à terme sortir
l'exécution du processus web vers un worker qui persiste la progression par question.

### 3.4 Accessibilité — *traitée le 24 août (soir)*

**R20. Tableaux sans `scope` ni `<caption>`** — *corrigé.* 9 tableaux, 48 `<th>`, 0 `scope`,
0 `caption` (WCAG 1.3.1). Tous les en-têtes portent désormais `scope="col"`, chaque tableau a une
`<caption class="sr-only">`, et le nom du modèle dans le classement est devenu un
`<th scope="row">` — c'est lui qui identifie la ligne dans un tableau de dix colonnes. Une règle
CSS étend le style de cellule de données à ce nouvel en-tête de ligne, et un test l'assert.

**R21. Hiérarchie de titres** — *corrigé.* La marque de la barre latérale n'est plus un `<h1>`
(la page n'en a plus qu'un, le titre de la vue), et l'URL d'endpoint de la vue API est devenue un
`<h3>`, ce qui supprime le saut h2 → h4 sur onze titres.

**R22. Deux listes d'onglets concurrentes** — *corrigé.* La barre latérale choisit un *espace*,
la barre secondaire une *vue* : deux `tablist` pointant vers le même panneau rendaient la relation
ambiguë. La barre latérale est désormais une navigation (`aria-current`, plus de `role="tab"` ni
d'`aria-controls`), `#workspace-nav` reste la seule `tablist`, et le `role="presentation"` placé
dans une `tablist` — interdit par la spécification — a disparu. Trois tests verrouillent l'invariant.

**R23. Absence de repère `main`** — *corrigé.* `<main role="tabpanel">` : le rôle explicite
écrasait le repère implicite, donc la page n'avait aucun repère principal. Le conteneur applicatif
est désormais le `<main>`, et `#tab-content` reste le `tabpanel`. Il a aussi reçu
`aria-live="polite"` : tout y est remplacé sans rechargement, donc la navigation était jusqu'ici
entièrement silencieuse pour un lecteur d'écran.

**Reste ouvert :** aucune vérification automatisée de contraste ni d'axe (`axe-core`) n'est
branchée en CI. Les ratios ont été calculés à la main lors de l'audit ; un contrôle automatique
éviterait une régression silencieuse.

### 3.5 Dette de structure

**R24. Le backoffice était un passif** — *corrigé le 24 août (soir).* 689 lignes portant leur
propre système de design qui dupliquait et divergeait de `style.css`, chargeant Sora depuis Google
Fonts alors que l'application auto-héberge la même police. Non bundlé, non haché, non minifié, non
linté, non testé. C'était aussi le fichier qui contenait les deux failles les plus graves du
frontend.
*Correction :* le `<style>` (182 lignes) et le `<script>` (429 lignes) en ligne sont extraits en
`admin/admin.css` et `admin/admin.js`, et `admin/index.html` est devenu un **second point d'entrée
Vite** — donc minifié, haché, et couvert par ESLint et Stylelint comme le reste. Les polices sont
auto-hébergées : plus aucune requête vers `fonts.googleapis.com` (une origine tierce et une
exposition RGPD en moins). N'ayant plus de script en ligne, le backoffice relève désormais de la
**CSP stricte** du serveur : son exception permissive a été supprimée. La recherche a reçu un index
mis en cache et un anti-rebond de 180 ms — elle re-sérialisait tout le jeu de données à chaque
frappe. Le fichier HTML passe de 689 à 73 lignes.

**R25. `style.css` était deux feuilles concaténées** — *largement corrigé le 24 août (soir).*
Mesures avant : **2 blocs `:root`** et **2 blocs de thème sombre** aux valeurs proches mais
différentes, **182 sélecteurs dupliqués**, **32 classes sans consommateur**, 9 points de rupture
dont un provablement inerte, et des tokens référencés mais jamais définis (`--space-1`,
`--shadow-subtle`). Lire le bloc de tokens documenté en tête donnait la mauvaise réponse pour la
moitié du système.
*Correction :* un seul bloc `:root` et un seul bloc de thème sombre, documentés, portant les
valeurs effectives ; 32 classes mortes et leurs 51 sélecteurs supprimés ; 302 déclarations
provablement écrasées retirées ; `@keyframes` orpheline supprimée ; les deux tokens fantômes
corrigés ; le point de rupture inerte documenté et réduit à sa seule règle utile ; `clip`
obsolète remplacé par `clip-path`. Résultat : **4 520 → 3 814 lignes**, bundle CSS **68,5 → 55,8 Ko**
(gzip 12,2 → 10,5 Ko), **0 classe morte**.
*Vérification :* un script compare la valeur finale de chaque couple (contexte, sélecteur,
propriété) avant et après — **2 302 couples, 0 divergence** pour le retrait des déclarations
écrasées — et les 202 déclarations perdues au total sont toutes attribuées à une classe morte, à
un token supprimé ou au point de rupture inerte. Le rendu a ensuite été contrôlé en navigateur,
thèmes clair et sombre, sur toutes les vues et jusqu'à 500 px de large.
*Reste ouvert :* ~~135 sélecteurs restent déclarés plusieurs fois~~ — *corrigé le 24 août (fin de journée).*
Les 135 doublons ont été fusionnés manuellement et via `tools/merge-duplicate-selectors.mjs`,
avec vérification par `tools/style-snapshot.mjs` (90 contextes, styles calculés dans Chromium).
**0 sélecteur dupliqué restant** ; Stylelint `no-duplicate-selectors` ne signale plus d'avertissement.

**R26. Dépendances non épinglées** — `backend/requirements.txt` utilise `>=` sur ses treize entrées, et le Dockerfile fait `pip install` sans contrainte : deux builds à deux dates produisent deux images différentes. Ni la CI ni les déploiements ne sont reproductibles, et une version majeure amont casse la production sans qu'un seul commit ait changé. C'est en tension directe avec l'objectif de reproductibilité affiché par le projet — et `requirements-eval.txt` est, lui, correctement épinglé.
*Correctif :* `pip-compile` avec hachages ; déplacer `pytest` vers un fichier de développement, il n'a rien à faire dans l'image de production.

**R27. Aucun lint Python** — Pas de `pyproject.toml`, `ruff.toml` ni `setup.cfg` dans le dépôt. La CI linte le frontend mais pas une ligne de Python. Preuve qu'une configuration a existé puis a été perdue : le code porte onze directives `# noqa` que `ruff` signale aujourd'hui comme inutiles, faute de règles activées. `ruff --select F` remonte 14 imports ou variables inutilisés.
*Correctif :* committer un `pyproject.toml` correspondant à ces `noqa` et ajouter `ruff check` à la CI.

**R28. Outillage de lint** — *corrigé le 24 août (soir), complété le 24 août (fin de journée).*
`no-unused-vars` était en `warn`
(donc n'échouait pas la CI) ; `eqeqeq`, `prefer-const` et `no-var` étaient désactivés ; aucune
règle ne gardait les globales alors que toute l'architecture repose sur des assignations à
`globalThis` ; ni `.editorconfig`, ni Stylelint, ni `npm audit` en CI ; le script `lint` ignorait
`admin/`, `tests/` et le CSS.
*Correction :* règles passées en erreur, périmètre étendu à `admin/`, `tests/` et `scripts/`,
Stylelint ajouté sur `css/` et `admin/`, `npm audit --audit-level=high` en CI, `.editorconfig` à
la racine.
*Complément (contrôle automatique de contraste et axe-core) :* deux outils ajoutés dans
`frontend/tools/` — `contrast-tokens.mjs` vérifie 25 paires de tokens (clair + sombre, seuils
4,5:1 pour le texte et 3:1 pour les éléments d'interface) ; `a11y-check.mjs` lance axe-core via
Playwright sur les 9 vues × 2 thèmes (18 analyses WCAG 2 AA). Les deux sont branchés en CI après
le build Vite. L'exécution a immédiatement révélé et permis de corriger 30 violations réelles
(`aria-orientation` sur une navigation sans `role="tablist"`, contrastes des badges de difficulté,
du lien « Participer », des blocs de code et des étiquettes HTTP).
*Point notable :* `eslint-plugin-no-unsanitized` a été **écarté** après essai. Il signale toute
affectation à `innerHTML` sans pouvoir vérifier que les interpolations du gabarit sont échappées :
sur ce projet, où tout le HTML est construit par littéraux de gabarit, il produisait 20 erreurs
qu'il aurait fallu toutes supprimer — ce qui apprend à ignorer la règle. À sa place,
`eslint-rules/no-unescaped-interpolation.js` vérifie l'invariant qui compte réellement : une valeur
venant des données ou d'un assistant de libellé ne doit jamais atteindre le HTML sans passer par
`escapeHtml()`. **Cette règle a immédiatement trouvé 8 interpolations non échappées** que la revue
manuelle avait manquées, dont une exploitable (`formatDate()` sur un horodatage venant de l'API) et
une dans le backoffice. Réintroduire volontairement la XSS de l'audit fait bien échouer le lint.

**R29. Quatre implémentations du chargement du corpus** — `data_loader.load_questions`, `open_tasks.build_validation_status`, `afribench.load_questions` et `test_consistency._count_validated`, aux comportements divergents (l'une ignore les objets uniques, une autre n'exclut pas `template.json`). Les totaux peuvent donc différer selon l'endpoint interrogé, et chaque correction doit être appliquée quatre fois — c'est ce qui a rendu H3 possible.

**R30. Six réglages de configuration morts** — `data_dir`, `questions_witness_dir`, `translations_dir`, `open_tasks_dir`, `host`, `port`. Pire que du bruit : `open_tasks.py` recalcule ses chemins en dur au lieu d'utiliser les réglages prévus, donc `AFRIBENCH_TRANSLATIONS_DIR` est silencieusement ignoré.

**R31. Tests tautologiques restants** — Six cas passeraient même si le code était cassé : une assertion placée dans le corps d'une boucle vide (`test_api.py:31-36`), une assertion dans un `if` dont la branche n'est jamais prise (`test_consistency.py:44-50`), un test dont la fonction testée est remplacée par un mock qui renvoie la valeur attendue (`test_proposals_api.py:79-93`), un `MagicMock` dont seule la présence d'appel est vérifiée alors que c'est la sémantique du `ON CONFLICT` qui compte (`test_seed_version.py:48-61`), un κ de Cohen comparé à lui-même (`test_validation_scripts.py:24-47`), et un `return` au lieu d'un `pytest.importorskip` qui fait compter un test comme réussi sans rien exécuter (`test_stats_and_open_eval.py:51-55`).
*Lié :* aucun `conftest.py` dans le dépôt, d'où le `PYTHONPATH: .` en CI ; le limiteur de débit est un singleton global que seuls deux fichiers de test réinitialisent, et `test_rate_limit_triggers` ne passe que grâce à l'ordre alphabétique des fichiers.

**R32. Le CRUD d'administration n'est pas testé** — L'authentification et le rate limiting du backoffice le sont depuis cet audit ; les quinze handlers CRUD, non. Le cycle de vie de l'application n'est jamais exercé (aucun test n'utilise `with TestClient(app)`, donc migrations, seed et reprise des jobs ne tournent jamais en test), et toute la couche SQL de `repository.py` est mockée. C'est le prérequis de R1, R2, R9, R13 et R17 : sans un PostgreSQL de test, leurs correctifs ne sont pas vérifiables.

**R33. Défauts d'interface** — *corrigés le 24 août (soir).* Six défauts réels :
les vues asynchrones pouvaient écraser l'onglet courant si l'utilisateur naviguait pendant le
chargement (jeton de rendu ajouté, et `renderActiveTab` capture désormais les rejets) ; les
identifiants de canvas des fiches modèles étaient dérivés du nom par suppression des caractères
non alphanumériques, donc `GPT-4o` et `gpt4o` collisionnaient (index utilisé, et la recherche
linéaire par canvas remplacée par une `Map`) ; `compare.js` construisait un tableau « top 3 »
aussitôt écrasé au cadre suivant (33 lignes de logique dupliquée supprimées) et cliquer
« Comparer » sur une fiche produisait une comparaison à **un seul** modèle (le modèle demandé est
désormais accompagné des deux meilleurs autres) ; le formulaire de proposition n'était jamais
réinitialisé après envoi, laissant un bouton désactivé libellé « Publication… » ; la recherche du
backoffice re-sérialisait tout le jeu de données à chaque frappe (index en cache + anti-rebond).

À cela s'ajoutent **17 styles en ligne dans le JavaScript** qui contournaient la correction de
contraste appliquée au CSS : ils utilisaient encore l'orange non conforme comme couleur de texte.

*Constat corrigé :* l'audit affirmait que les scores du classement étaient « codés en dur en double
dans `index.html` ». C'est inexact — le bloc `<noscript>` et le bloc statique sont tous deux
**générés** par `scripts/generate_static_html.py` depuis la même source. Il n'y a pas de double
maintenance manuelle.

---

## 4. Ce qui est déjà remarquable

Il serait malhonnête de ne lister que des défauts. Plusieurs choix sont au-dessus de la moyenne pour un projet de cette taille et méritent d'être préservés.

**L'échappement HTML est appliqué avec discipline.** `escapeHtml` couvre `&<>"'/` plus l'accent grave et le signe égal — plus complet que la plupart des implémentations artisanales. Noms de modèles, énoncés, réponses, explications, sources et options sont échappés à chaque point de rendu. Les failles trouvées étaient une lacune étroite dans deux fonctions utilitaires, pas un relâchement systémique.

**Le repli en cascade est un vrai travail d'ingénierie, pas une intention.** Base → fichiers, API → bootstrap → JSON statique → message explicite, avec un badge de provenance visible en permanence. Et un workflow CI vérifie que **le frontend démarre alors que le backend est absent**. La résolution DNS différée dans `nginx.template.conf`, trois lignes de shell, a supprimé une classe entière de pannes de déploiement.

**La CI vérifie le niveau de complétude scientifique du projet**, pas seulement le code : `validation_status.py` et `submission_readiness.py` tournent à chaque commit. Il est donc impossible de laisser filer une régression d'honnêteté sans qu'un robot le signale. Je n'ai jamais vu cela ailleurs.

**Les migrations Alembic sont propres et défensives.** `_has_table()` rend chaque `upgrade()` idempotent, les `server_default` sont cohérents avec les défauts ORM, `compare_type=True` est activé, et le choix d'Alembic plutôt que `create_all()` est documenté avec sa raison.

**Les schémas Pydantic du hub participatif sont exemplaires** — bornes sur tous les champs, `Literal` pour les énumérations, validateur vérifiant l'ensemble exact `{A,B,C,D}` avec normalisation des espaces. C'est précisément ce qui manque au routeur admin : le modèle à suivre existe déjà dans le dépôt.

**Le mode simulé est bien conçu** — dérivation déterministe par SHA-256 du nom du modèle, biais par difficulté, écriture isolée dans `data/results/mock/`, exclusion par défaut du classement. Impossible de confondre un résultat simulé avec une mesure. `test_mock_eval.py` est le meilleur fichier de test du projet.

**Les annotations de retour couvrent 97 % des fonctions Python**, avec `from __future__ import annotations` partout et la syntaxe moderne `X | None`. Aucun `print()` dans `backend/app/`. Aucune surface d'injection SQL : tout passe par l'ORM ou par du `text()` paramétré.

**La navigation clavier est réelle, pas décorative** — `tabindex` glissant, `aria-selected`, flèches et Début/Fin sur la liste d'onglets, `Ctrl+K` pour la recherche, Échap pour fermer, piège de focus authentique dans la modale avec restitution du focus au déclencheur. `prefers-reduced-motion` est implémenté et couvre transitions, animations d'apparition et tiroir.

**Le tableau du classement ne défile jamais horizontalement**, à aucune largeur : une *container query* masque progressivement les colonnes par ordre inverse d'importance. La solution paresseuse — le défilement horizontal — n'est découverte par personne sur mobile. Ce détail traduit une vraie compréhension du contexte d'usage.

**Et `CRITIQUE.md` existe.** Un projet qui publie sa propre critique, avec la gravité de chaque faiblesse, fait quelque chose de juste. C'est aussi ce document qui a produit les 17 issues et les 28 pull requests dont le reste découle.

---

## 5. Ordre de traitement recommandé

Le prérequis de presque tout le reste est **R32** : monter un PostgreSQL de test. Sans lui, les correctifs de R1, R2, R9, R13 et R17 ne sont pas vérifiables, et on corrigerait à l'aveugle un sous-système concurrent — le pire cas de figure.

1. **R32** — PostgreSQL de test, plus les tests du CRUD d'administration.
2. **R1, R2, R11, R10** — le sous-système d'évaluation forme un tout cohérent et devrait être repris en une seule passe, avec la connexion dédiée de R2 comme pivot.
3. **R3, R4** — intégrité des mesures publiées.
4. **R5, R7, R8** — durcissement du backoffice.
5. **R6, R12** — rendre le mode dégradé observable.
6. **R27** — lint Python : travail court qui empêche la moitié de la section 3.5 de récidiver.
   *(R28, son équivalent côté frontend, est fait.)*
7. **R13, R14, R15** — performance backend, par ordre de gain mesuré.
8. **R26** — épingler les dépendances, condition d'une reproductibilité réellement tenue.
9. **R19** — sortir l'évaluation du processus web vers un worker qui persiste sa progression.

Le périmètre frontend de cet audit est **entièrement traité** : **R18, R20, R21, R22, R23, R24,
R25, R28 et R33** sont corrigés et vérifiés.

---

## 6. Reproduire cet audit

```bash
# Backend
cd backend && PYTHONPATH=. python3 -m pytest -q          # 98 tests
git diff --exit-code                                      # doit rester propre

# Frontend
cd frontend && npm ci && npm run lint:all && npm test         # 58 tests
npm run build && npm run test:contrast && npm run test:a11y

# Corpus et chaîne d'évaluation
python3 scripts/afribench.py validate data/questions/v1/validated
python3 scripts/afribench.py run --mock --model gpt-4o
python3 scripts/validation_status.py
python3 scripts/submission_readiness.py

# Contrastes et en-têtes servis : voir §2.2 H7 et H8 pour la méthode de mesure
```

---

**AfriBench** · Y'TILIKAN · audit du 24 août 2026
Documents liés : [`RAPPORT_TECHNIQUE.md`](RAPPORT_TECHNIQUE.md) · [`CRITIQUE.md`](../CRITIQUE.md) · [`ROADMAP.md`](../ROADMAP.md)
