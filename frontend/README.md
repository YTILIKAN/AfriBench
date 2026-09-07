# AfriBench — Frontend (interface)

Application monopage en **JavaScript natif** (modules ES, sans framework), bundlée par **Vite 6**, servie par **nginx** en production. Elle consomme l'API du backend et se replie automatiquement sur des données statiques quand l'API est absente.

> Ce README est le guide pratique. Les raisons des choix — pourquoi pas de framework, pourquoi la convention `globalThis`, pourquoi une règle ESLint maison contre les XSS — sont dans [`docs/ARCHITECTURE.md § 7`](../docs/ARCHITECTURE.md#7-linterface-frontend). L'état de la dette est dans [`docs/AUDIT_QUALITE.md`](../docs/AUDIT_QUALITE.md) (périmètre frontend entièrement traité).

**Chiffres (7 septembre 2026) :** 9 vues + Question du jour + backoffice · 4 280 lignes de JavaScript applicatif · 3 714 lignes de CSS · 58 tests Vitest dans 4 fichiers · ~115 Ko compressés au premier chargement · 4 dépendances d'exécution.

---

## Sommaire

- [Démarrage](#démarrage)
- [Structure](#structure)
- [Chargement des données](#chargement-des-données)
- [Conventions de code](#conventions-de-code)
- [Qualité](#qualité)
- [Design system et accessibilité](#design-system-et-accessibilité)
- [Backoffice](#backoffice)
- [Production : nginx et déploiement](#production--nginx-et-déploiement)
- [Ajouter une vue](#ajouter-une-vue)

---

## Démarrage

```bash
npm install
npm run dev          # Vite, proxy /api → http://127.0.0.1:8080, rechargement à chaud → http://localhost:3000
npm run build        # dist/ (assets hachés, chemins relatifs) + copie des données statiques
npm run preview      # sert dist/ localement
```

Avec toute la plateforme (nginx + API + PostgreSQL) :

```bash
docker compose up --build     # → http://localhost:3000
```

Le site fonctionne **sans backend** : c'est le mode de GitHub Pages. Il affiche alors « Données statiques » dans la barre latérale.

### Régénérer les données statiques

```bash
python ../scripts/export_frontend.py         # data/results.json, data/questions.json
python ../scripts/aggregate_open_scores.py   # data/open_scores.json
python ../scripts/generate_static_html.py    # classement dans index.html + <noscript> + data/bootstrap.json
```

## Structure

```
frontend/
├── index.html                Shell : SEO, Open Graph, JSON-LD Dataset, <noscript>, classement pré-généré, squelette des vues
├── src/
│   ├── main.js               Point d'entrée Vite : polices (latin + latin-ext), CSS, icônes, Chart.js, puis js/app.js et les vues
│   ├── chart-setup.js        Enregistrement sélectif de 12 composants Chart.js (partagé avec les tests)
│   └── icons.js              Sous-ensemble Lucide → globalThis.icon(name)
├── js/
│   ├── app.js                Noyau : AppState, navigation, URL, thème, chargement, favoris, graphiques, escapeHtml…
│   ├── leaderboard.js        Classement
│   ├── models.js             Fiches par modèle
│   ├── compare.js            Comparaison (radar)
│   ├── evolution.js          Scores dans le temps
│   ├── questions.js          Explorateur du corpus
│   ├── open_tasks.js         Tâches ouvertes
│   ├── contribute.js         Hub participatif
│   ├── methodology.js        Protocole en clair
│   └── api.js                Documentation de l'API
├── admin/                    Backoffice : index.html + admin.js + admin.css — second point d'entrée Vite
├── css/style.css             Design system : un bloc :root, un bloc [data-theme="dark"], tokens documentés en tête
├── data/                     Repli JSON : results.json, questions.json, open_scores.json, bootstrap.json
├── public/                   Copiés tels quels : favicon.svg, apple-touch-icon.png, manifest.webmanifest, og-image.png, robots.txt, sitemap.xml, .nojekyll
├── tests/                    Vitest + jsdom : views · a11y · charts · loaddata (+ setup.js)
├── tools/                    a11y-check.mjs (axe-core/Playwright) · contrast-tokens.mjs · style-snapshot.mjs · merge-duplicate-selectors.mjs
├── eslint-rules/             no-unescaped-interpolation.js — règle XSS maison
├── scripts/copy-static.mjs   Copie de data/ dans dist/ après le build
├── nginx.template.conf       Serveur de production : gzip, cache, en-têtes de sécurité, CSP, proxy /api
├── docker-entrypoint.d/      15-backend-resolver.sh — resolver DNS dynamique pour nginx
├── Dockerfile                node:20-alpine (build) → nginx:1.27-alpine
├── vite.config.js            base: './' (obligatoire pour GitHub Pages sous /AfriBench/), 2 entrées, proxy dev
└── eslint.config.js          ESLint 9 (flat config)
```

### Navigation

Quatre **espaces** dans la barre latérale, chacun avec ses **vues** dans une barre secondaire (`#workspace-nav`, seule `tablist` ARIA de la page) :

| Espace | Vues (`?tab=`) |
|---|---|
| Vue d'ensemble | `leaderboard` · `models` |
| Analyse | `compare` · `evolution` |
| Données | `questions` · `open_tasks` |
| Projet | `methodology` · `contribute` · `api` |

L'état (`tab`, `category`, `difficulty`, `page`) est encodé dans l'URL et partageable. Les valeurs `category` et `difficulty` sont **filtrées par liste blanche** (`parseUrlFilters`) avant tout usage.

## Chargement des données

Ordre de priorité, avec un délai de 12 s par requête et une seule campagne de chargement à la fois :

1. **API** (`/api/v1/results`, `/questions`, `/stats`) — prioritaire si joignable ;
2. **`data/bootstrap.json`** — téléchargé en parallèle ; s'il arrive avant l'API, il produit un premier rendu immédiat, puis est **interrompu** dès que l'API répond ;
3. **`data/*.json`** — repli statique si l'API échoue et que le bootstrap n'a pas été affiché ;
4. **Aucune** — carte « Données indisponibles » avec bouton *Réessayer*.

La source active est affichée en permanence dans la barre latérale : « API en direct », « Aperçu pré-généré », « Données statiques », « Données indisponibles ».

Base de l'API, par ordre de priorité : `window.AFRIBENCH_API_BASE`, port `8000` du serveur de dev (→ `http://127.0.0.1:8080/api/v1`), `<meta name="afribench-api" content="/api/v1">`, sinon `/api/v1`.

## Conventions de code

Ces conventions sont **vérifiées par le lint** ; les connaître évite les allers-retours en CI.

1. **Un module par vue.** Chaque fichier de `js/` définit `render<Vue>(container)`, le publie sur `globalThis` (`globalThis.renderAPI = renderAPI`) et se termine par `export {}`. `app.js` publie ses utilitaires par `Object.assign(globalThis, {...})` et dispatche par une table `{ leaderboard: globalThis.renderLeaderboard, … }`. L'ordre d'import dans `src/main.js` compte : `app.js` d'abord.
2. **Tout texte de donnée passe par `escapeHtml()`** avant d'entrer dans un littéral HTML — questions, options, noms de modèles, libellés calculés (`categoryLabel`, `difficultyLabel`, `formatDate`, `getModelProvider`). La règle ESLint maison [`no-unescaped-interpolation`](eslint-rules/no-unescaped-interpolation.js) le vérifie ; elle a trouvé 8 interpolations que la revue manuelle avait manquées.
3. **Aucun gestionnaire en ligne** (`onclick=`…) : attributs `data-*` + délégation d'événements. Un échappement HTML ne protège pas un contexte JavaScript, et la CSP (`script-src 'self'`) bloque ces gestionnaires. Vérifié en CI par `grep`.
4. **Les gestionnaires d'événements sont enregistrés une fois** (au `DOMContentLoaded`), jamais dans une fonction de rendu.
5. **Les graphiques passent par `chartRegistry`** (indexé par identifiant de canvas) : les instances détachées sont détruites à chaque changement de vue. Les composants Chart.js sont importés sélectivement dans `src/chart-setup.js`, module partagé avec les tests pour empêcher toute dérive.
6. **Une vue asynchrone capture `currentRenderToken()` avant son `await`** et vérifie `isRenderStale()` après, pour ne pas écrire dans le DOM d'un onglet que l'utilisateur a quitté.
7. **Les préférences restent dans le navigateur** (`localStorage` : thème, favoris, identifiant de votant). Aucun cookie, aucun traceur, aucune requête vers une origine externe (polices auto-hébergées).

## Qualité

```bash
npm run lint            # ESLint 9 : js/ src/ admin/ tests/ scripts/ — règles en erreur + no-unescaped-interpolation
npm run lint:css        # Stylelint (config-standard) sur css/ et admin/ — 0 sélecteur dupliqué
npm run lint:all        # les deux
npm audit --audit-level=high
npm test                # Vitest + jsdom — 58 tests
npm run build && npm run test:contrast   # 25 paires de tokens × 2 thèmes, seuils 4,5:1 (texte) et 3:1 (UI)
npm run test:a11y                        # axe-core dans Chromium (Playwright) sur 9 vues × 2 thèmes, WCAG 2 AA
```

| Fichier de test | Tests | Portée |
|---|---|---|
| `tests/views.test.js` | 38 | Fonctions pures, rendu des 9 vues, **non-régression XSS** (charges `<img onerror>` depuis les questions, l'URL, la meilleure catégorie), pagination, filtres ↔ URL, hub |
| `tests/a11y.test.js` | 9 | Une seule `tablist`, `aria-labelledby` réels, `<main>`, en-têtes de tableau |
| `tests/charts.test.js` | 5 | Les 4 types de graphiques montent réellement, pas de fuite d'instances |
| `tests/loaddata.test.js` | 6 | Cascade de chargement, interruption du bootstrap, délai, réentrance |

`tests/setup.js` fournit `ResizeObserver` et un contexte 2D factice à jsdom.

Garde-fous CI spécifiques au frontend : assets référencés en **chemin relatif** dans `dist/index.html` (un `base: '/'` rendait le site inchargeable sous `/AfriBench/`), **aucun `on*=`** dans les sources, `npm audit` bloquant sur élevé/critique.

## Design system et accessibilité

**Tokens.** Charte Y'TILIKAN : ivoire `#FAF9F6`, noir `#0A0806`, orange `#FFA726`. L'orange de marque plafonne à 1,85:1 sur ivoire, insuffisant pour du texte (WCAG exige 4,5:1) ; deux dérivés servent donc au texte et aux éléments d'interface : `--ocre-ink` (#A05A08) et `--ocre-ui` (#C4740A). L'orange pur reste réservé aux remplissages et à la barre latérale sombre. Un seul bloc `:root`, un seul bloc `[data-theme="dark"]`, tokens documentés en tête de `style.css`.

**Accessibilité.** Lien d'évitement, repère `<main>`, `aria-current` sur la navigation, `aria-live="polite"` sur le panneau de contenu, piège de focus dans les modales avec restitution, pagination `aria-current="page"`, tableaux avec `<caption>` et `scope`, anneau de focus visible partout, `prefers-reduced-motion` respecté.

**Mobile.** Cinq seuils (1020 / 900 / 768 / 600 / 520 px). Sous 768 px : menu hamburger et barre latérale en tiroir. Le tableau du classement ne défile jamais horizontalement : une *container query* masque les colonnes par ordre inverse d'importance ; rang, modèle et score restent visibles.

**Graphiques.** Palette de 6 couleurs **et** motifs de trait distincts, lisibles en daltonisme et en impression noir et blanc.

## Backoffice

`admin/` est un **second point d'entrée Vite** : minifié, haché, linté, couvert par la même CSP stricte, polices auto-hébergées. Cinq écrans : connexion (mot de passe → jeton en `localStorage`), questions (CRUD, modale A–D, marqueur témoin), résultats, modèles (fournisseur, identifiant, clé d'API), évaluation (formulaire → job → sondage toutes les 3 s).

Il n'existe que si `AFRIBENCH_ADMIN_PASSWORD` est défini côté API (sinon 503). Servi avec `X-Robots-Tag: noindex, nofollow`. En développement : `http://localhost:3000/admin/`.

## Production : nginx et déploiement

`nginx.template.conf` est instancié au démarrage du conteneur avec deux variables seulement (`PORT`, `BACKEND_URL` — `NGINX_ENVSUBST_FILTER` empêche `envsubst` de vider `$host` et consorts) :

- **gzip** activé (l'image officielle le livre désactivé ; −71 % au premier chargement) ;
- **cache** d'un an sur `/assets/` (noms hachés), revalidation systématique de `index.html` ;
- **en-têtes de sécurité** : CSP stricte (`script-src 'self'`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` ; piège documenté dans le fichier : un `add_header` dans un bloc `location` annule ceux du parent, d'où l'usage exclusif d'`expires` dans les blocs de cache ;
- **proxy `/api/`** vers `$BACKEND_URL` via une **variable** (`set $backend …; proxy_pass $backend;`) et un `resolver` généré au boot par `docker-entrypoint.d/15-backend-resolver.sh` depuis `/etc/resolv.conf` : la résolution DNS se fait **à la requête**, donc le frontend démarre même si le backend est absent (seul `/api/*` répond 502). Le workflow `docker-services.yml` le vérifie avec un `BACKEND_URL` invalide.

| Cible | Commande / mécanisme | Données |
|---|---|---|
| GitHub Pages | `deploy-pages.yml` : exports → HTML statique → `npm run build` → `gh-pages` | Statiques (`data/*.json`, bootstrap), pas d'API |
| Railway | `frontend/Dockerfile`, `BACKEND_URL=http://afribench-api.railway.internal:8080` | API en direct via le proxy |
| Local | `docker compose up` (port 3000 → 8080) | API en direct |

## Ajouter une vue

1. `js/<vue>.js` : `function render<Vue>(container)`, publication sur `globalThis`, `export {}`.
2. `app.js` : ajouter la clé à `VALID_TABS`, `WORKSPACES`, `VIEW_META`, à la table de dispatch de `renderActiveTab` et, si la recherche s'applique, à `SEARCHABLE_TABS`.
3. `src/main.js` : importer le module **après** `app.js`.
4. Toute interpolation passe par `escapeHtml()` ; toute vue asynchrone utilise le jeton de rendu.
5. `tests/views.test.js` : au minimum un test de rendu ; `tools/a11y-check.mjs` : ajouter l'onglet à `TABS`.
6. `index.html` : ajouter le squelette de la vue et l'entrée de navigation ; `public/sitemap.xml` n'a pas à changer (une seule URL canonique).

---

Documents liés : [Architecture § 7](../docs/ARCHITECTURE.md#7-linterface-frontend) · [Architecture § 9.6 (XSS)](../docs/ARCHITECTURE.md#96-xss--défense-en-profondeur) · [Audit de qualité](../docs/AUDIT_QUALITE.md) · [Index de la documentation](../docs/README.md)
