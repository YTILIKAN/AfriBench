# Critique AfriBench — v1.0 (Juin 2026)

> **Document d'auto-critique structurée** — à lire comme une roadmap d'amélioration, pas comme un constat d'échec. Ce benchmark en est à sa phase de prototypage. Voici ce qui cloche, pourquoi, et comment y remédier.

---

## Table des matières

1. [Critique du benchmark (fond)](#1-critique-du-benchmark-fond)
   - [1.1 Taille d'échantillon statistiquement insignifiante](#11-taille-déchantillon)
   - [1.2 Français uniquement — pas africain](#12-français-uniquement)
   - [1.3 Plafonnement des scores (90-96%)](#13-plafonnement)
   - [1.4 Format QCM exclusif](#14-format-qcm-exclusif)
   - [1.5 Absence de validation externe](#15-absence-de-validation-externe)
   - [1.6 Reproductibilité affirmée mais non démontrée](#16-reproductibilité)
   - [1.7 Collision de nom avec AfroBench (McGill-NLP)](#17-collision-de-nom)
   - [1.8 Questions de raisonnement culturel à risque de stéréotypes](#18-raisonnement-culturel)
2. [Critique du frontend (forme)](#2-critique-du-frontend-forme)
   - [2.1 Performance et chargement](#21-performance)
   - [2.2 Accessibilité (a11y)](#22-accessibilité)
   - [2.3 Responsive design](#23-responsive-design)
   - [2.4 Architecture JavaScript](#24-architecture-javascript)
   - [2.5 SEO et métadonnées](#25-seo)
   - [2.6 Expérience utilisateur (UX)](#26-ux)
3. [Solutions et roadmap](#3-solutions-et-roadmap)

---

## 1. Critique du benchmark (fond)

### 1.1 Taille d'échantillon

**Problème :** 101 questions pour 9 catégories = ~11 questions par catégorie. La différence entre DeepSeek V4 (96%) et Claude Haiku (90.1%), c'est 6 questions sur 101.

**Pourquoi c'est grave :** Avec un écart-type de 4.7 à 12.0 selon les modèles, l'intervalle de confiance à 95% est tellement large que le classement est du bruit. Impossible d'affirmer que DeepSeek V4 est "meilleur" que Claude Sonnet 4 (96% vs 95%) sur la base d'UNE question d'écart.

**Standard de référence :** MMLU = 15 000 questions. HellaSwag = 10 000. Même les benchmarks spécialisés visent 500-1000 questions minimum. Le propre livrable 6 du projet cible "500+ questions par langue".

### 1.2 Français uniquement

**Problème :** Toutes les questions sont en français. Zéro swahili, haoussa, yoruba, bambara, amharique.

**Pourquoi c'est grave :** L'Objectif 04 promet ces langues. Le livrable 1 promet "5+ langues africaines". Le benchmark se dit "ancré dans les réalités africaines" mais il est structurellement inaccessible à la majorité des africains non-francophones. C'est un benchmark **français sur l'Afrique**, pas un benchmark africain.

### 1.3 Plafonnement

**Problème :** 7 modèles entre 90% et 96%. Tous les top models sont à 100% sur 4 catégories (géographie, langue_culture, raisonnement_culturel, droit_politique).

**Pourquoi c'est grave :** Un benchmark utile doit créer un spread. Si tout le monde est à 90%+, on mesure du bruit autour d'un plafond, pas de la compétence. La catégorie `raisonnement_culturel` a un score parfait pour TOUS les modèles — elle ne discrimine rien.

### 1.4 Format QCM exclusif

**Problème :** 100% des questions sont des QCM A/B/C/D. Aucune tâche de génération, traduction, résumé, raisonnement ouvert.

**Pourquoi c'est grave :** Ça mesure le *knowledge retrieval*, pas la compétence linguistique réelle. Les vrais défis des LLMs sur l'Afrique : génération en langues africaines, traduction entre langues à faibles ressources, compréhension de la variation dialectale. Rien de tout ça n'est évalué.

### 1.5 Absence de validation externe

**Problème :** 100% des champs `validated_by` et `date_validated` sont à `null`. Une seule personne a écrit et validé toutes les questions.

**Pourquoi c'est grave :** Le propre document de cadrage identifie ce risque comme "ÉLEVÉ" avec mitigation "Comité de révision diversifié, audits". Aucune mitigation n'a été appliquée. Une seule erreur factuelle ou un seul biais culturel non détecté, et c'est toute la crédibilité qui tombe.

### 1.6 Reproductibilité

**Problème :** La page d'accueil dit "reproductible" et les KPI visent "100%", mais :
- Pas de documentation des paramètres exacts d'inférence (temperature=0.0 est dans la config — c'est bien — mais pas documenté publiquement)
- Pas de seeds fixées documentées
- Pas de conteneur Docker
- Pas d'intégration effective avec LM Evaluation Harness (le dossier `lm_eval_tasks/` existe mais semble vide)
- Le script `afribench.py` est propre et fonctionnel (627 lignes, bien structuré) mais n'est pas documenté sur le site

**Nuance positive :** Le script d'évaluation existe, il est en Python avec une CLI propre, il charge les questions, évalue les modèles, sauvegarde les résultats. C'est mieux que beaucoup de benchmarks "maison". Mais la boucle de reproduction n'est pas documentée de bout en bout.

### 1.7 Collision de nom

**Problème :** Il existe déjà **AfroBench** (McGill-NLP, EMNLP 2024) : 64 langues africaines, 15 tâches NLP, 22 datasets. "AfriBench" avec un "i" au lieu d'un "o" prête à confusion.

**Impact :** Pas rédhibitoire — l'angle est différent (francophone, QCM culturel vs. NLP tasks multilingues) — mais c'est un problème de positionnement, surtout pour une soumission académique.

### 1.8 Raisonnement culturel

**Problème :** Certaines questions culturalisent de manière excessive. Exemple : CULT-004 ("je vais venir" = temps polychronique) présente une généralisation comme LA réponse correcte pour "le contexte africain", sans nuance régionale ou situationnelle.

**Risque :** Reproduction du geste de catégorisation essentialisante qu'on reproche aux benchmarks occidentalo-centrés, juste avec des références académiques (Hall, Mbiti) au lieu de la Bible.

---

## 2. Critique du frontend (forme)

### 2.1 Performance et chargement

| Problème | Sévérité | Description |
|----------|----------|-------------|
| **SPA sans fallback HTML** | ⚠️ Haute | La page est vide sans JavaScript. Le `<noscript>` est absent. Les moteurs de recherche et les lecteurs d'écran voient "Chargement... Patientez". |
| **Chart.js depuis CDN non versionné** | 🔶 Moyenne | `chart.js@4.4.7` chargé depuis jsdelivr. Pas de fallback local, pas d'intégrité SRI. Si le CDN est down, toute la partie graphique est cassée. |
| **Google Fonts bloquantes** | 🔶 Moyenne | Les polices Inter et JetBrains Mono sont chargées en blocking depuis Google Fonts (pas de `display=swap`). Le site attend les polices avant de peindre le texte. |
| **Pas de minification/bundling** | 🟡 Faible | CSS 2193 lignes non minifiées, JS modulaires mais chargés séparément. Pour un site statique de cette taille c'est acceptable, mais à scaler. |
| **Pas de lazy loading** | 🟡 Faible | Aucun `loading="lazy"` sur les assets, pas de code splitting. Acceptable vu la taille actuelle. |

### 2.2 Accessibilité (a11y)

| Problème | Sévérité | Description |
|----------|----------|-------------|
| **Pas de skip-link** | ⚠️ Haute | Pas de lien "Aller au contenu principal". Les utilisateurs clavier doivent tabber à travers toute la sidebar. |
| **Contraste insuffisant en light mode** | 🔶 Moyenne | Le bronze (`#8a6d3b`) sur fond clair (`#f5f5f0`) a un ratio de contraste ~3.8:1 (minimum WCAG AA = 4.5:1). |
| **Pas d'ARIA live regions** | 🔶 Moyenne | Les mises à jour dynamiques (filtrage, chargement) ne sont pas annoncées aux lecteurs d'écran. Pas de `aria-live="polite"`. |
| **Icônes CSS uniquement** | 🔶 Moyenne | Les icônes sont des pseudo-éléments CSS (`.sidebar-icon-table::before`). Aucun contenu accessible, pas de `aria-label`. Les lecteurs d'écran ne voient rien. |
| **Pas de gestion `prefers-reduced-motion`** | 🟡 Faible | Les animations et transitions n'ont pas de media query pour les désactiver. |
| **Landmarks bien structurés** | ✅ OK | `<aside role="navigation">`, `<main role="tabpanel">`, `<nav role="tablist">` — la structure sémantique est bonne. |
| **Focus visible** | ✅ OK | `:focus-visible` implémenté avec outline bronze. |

### 2.3 Responsive design

| Problème | Sévérité | Description |
|----------|----------|-------------|
| **Sidebar masquée sous 768px sans alternative de navigation** | ⚠️ Haute | Sur mobile, la sidebar disparaît (`display: none`) sans hamburger menu ni bottom nav. L'utilisateur perd tout accès à la navigation par catégories. |
| **Tableau non responsive** | 🔶 Moyenne | Le leaderboard table n'a pas de scroll horizontal ni de carte alternative sur mobile. Les 10 colonnes deviennent illisibles. |
| **Graphiques Chart.js non adaptés** | 🟡 Faible | Les radars et bar charts utilisent `maintainAspectRatio: false` mais les labels peuvent déborder sur petit écran. |
| **Hero section ok** | ✅ OK | Le hero utilise des flex wraps et les badges s'empilent correctement. |

### 2.4 Architecture JavaScript

| Problème | Sévérité | Description |
|----------|----------|-------------|
| **Variables globales** | 🔶 Moyenne | `lbSortField`, `lbSortDir`, `lbFilterType`, `categoryFilter`, `qFilterCat`, `qFilterDiff`, `compareChartInstance` — toutes dans le scope global. Risque de collision. |
| **Pas de gestion d'erreur sur fetch** | 🔶 Moyenne | `loadData()` fait `if (resultsResp.ok)` mais ne gère pas les erreurs réseau (timeout, DNS failure). Pas de retry, pas de message d'erreur utilisateur. |
| **Pas d'EventEmitter / pub-sub** | 🟡 Faible | La communication inter-modules se fait via des variables globales et des `window.__categoryFilter`. Fonctionnel mais fragile. |
| **Pas de tests** | 🔶 Moyenne | 0 tests unitaires ou d'intégration. La seule validation est le script `validate_questions()` côté Python. |
| **innerHTML sans échappement** | ⚠️ **Haute** | Plusieurs rendus utilisent `innerHTML` avec des données concaténées sans échappement. Si une question contient du HTML/JS, c'est une XSS. **Exemple :** `questions.js` ligne ~100 : `html += \`<div>${q.question}</div>\`` — `q.question` vient du JSON de questions, qui est sous contrôle du repo, donc risque modéré mais réel si quelqu'un fait une PR malveillante. |

### 2.5 SEO

| Problème | Sévérité | Description |
|----------|----------|-------------|
| **Contenu chargé en JS uniquement** | ⚠️ Haute | Les moteurs de recherche voient "Chargement... Patientez". Le contenu réel (leaderboard, questions) est injecté dynamiquement. Google rend le JS mais avec délai et inconsistances. |
| **Pas de sitemap.xml** | 🟡 Faible | Pas de sitemap, pas de robots.txt optimisé. |
| **Meta tags OK** | ✅ OK | `og:title`, `og:description`, `meta description`, `meta keywords` sont présents. |
| **Pas de structured data** | 🟡 Faible | Pas de JSON-LD (schema.org/Dataset) pour le référencement académique. |

### 2.6 UX

| Problème | Sévérité | Description |
|----------|----------|-------------|
| **Pas d'indicateur de chargement visible** | 🟡 Faible | Le "Chargement..." initial est visible mais aucune progress bar ou skeleton screen pendant le fetch des données. |
| **Pas de persistance des filtres dans l'URL** | 🟡 Faible | Les filtres (catégorie, difficulté, favoris) ne sont pas reflétés dans l'URL. Impossible de partager un lien vers une vue filtrée. |
| **"Question du jour" sans navigation** | 🟡 Faible | La question quotidienne est affichée mais on ne peut pas voir les précédentes ni naviguer dans l'historique. |
| **Design system cohérent** | ✅ OK | Thème sombre/clair propre, tokens CSS bien définis, palette bronze cohérente. L'inspiration llm-stats.com est bien digérée. |
| **Favoris + localStorage** | ✅ OK | Bonne UX de favoris avec persistance. |

---

## 3. Solutions et roadmap

### Phase 1 — Correction des faiblesses critiques (semaines 1-2)

Ces corrections peuvent être faites immédiatement, avec le budget actuel (0€).

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Ajouter une bannière "Prototype — v0.1"** sur le site et dans le README. Remplacer "Leader" par "Meilleur score (prototype)" | 10 min | **Honnêteté** |
| 2 | **Ajouter `display=swap` aux Google Fonts** dans le `<link>` | 2 min | Performance |
| 3 | **Ajouter un skip-link** (`<a href="#tab-content" class="skip-link">Aller au contenu</a>`) | 15 min | a11y |
| 4 | **Échapper le HTML dans les rendus JS** — créer une fonction `escapeHtml()` et l'appliquer partout où des données JSON sont injectées dans `innerHTML` | 1h | **Sécurité XSS** |
| 5 | **Ajouter `<noscript>`** — message expliquant que le site nécessite JavaScript | 5 min | SEO/a11y |
| 6 | **Ajouter un hamburger menu mobile** — remplacer le `display:none` de la sidebar par un menu off-canvas | 2h | **Mobile UX** |
| 7 | **Ajouter `loading="lazy"` sur les images** (s'il y en a) et `decoding="async"` | 5 min | Performance |
| 8 | **Améliorer le contraste light mode** — ajuster `--bronze: #6d5530` pour atteindre le ratio 4.5:1 | 10 min | a11y |

### Phase 2 — Renforcement du benchmark (semaines 3-6)

Ces actions nécessitent du temps mais pas nécessairement de budget.

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 9 | **Passer à 300+ questions** — écrire 200 nouvelles questions sur les catégories existantes. Objectif : ~30-35 questions par catégorie minimum | 2-3 sem | **Signal statistique** |
| 10 | **Ajouter 20 questions "témoin"** — des questions MMLU-like (non-africaines) pour servir de baseline de comparaison | 1 jour | Comparabilité |
| 11 | **Recruter 3 validateurs africains** via Twitter/LinkedIn/Masakhane/Deep Learning Indaba. 1 par grande région (Ouest, Est, Australe) | Variable | **Crédibilité** |
| 12 | **Ajouter 10-20 questions de génération ouverte** avec une grille d'évaluation manuelle ou LLM-as-judge | 1 sem | Profondeur |
| 13 | **Documenter le protocole d'évaluation sur le site** : temperature, prompt template, few-shot strategy, seeds | 2h | Reproductibilité |
| 14 | **Publier le script d'évaluation sur le site** — lien direct vers `scripts/afribench.py`, instructions de reproduction | 1h | Reproductibilité |

### Phase 3 — Internationalisation et scale (semaines 7-12, nécessite budget/partenariats)

| # | Action | Effort | Budget |
|---|--------|--------|--------|
| 15 | **Traduire les questions existantes en 2-3 langues africaines** (swahili, yoruba, amharique) avec des traducteurs natifs | 3-4 sem | ~500-1000€ |
| 16 | **Ajouter des tâches non-QCM** — traduction FR↔langue africaine, résumé, question-réponse ouverte | 4 sem | ~1000€ |
| 17 | **Intégrer LM Evaluation Harness** — créer un task YAML pour chaque catégorie/langue, rendre le benchmark exécutable via `lm_eval --tasks afribench_*` | 1-2 sem | Gratuit |
| 18 | **Conteneuriser l'évaluation** — Dockerfile avec toutes les dépendances, seeds fixées, version taguée | 1 jour | Gratuit |
| 19 | **Soumettre à une conférence** (ACL 2027, NeurIPS 2027 datasets track) une fois les 300+ questions et la validation externe en place | — | — |

### Phase 4 — Améliorations frontend long-terme

| # | Action |
|---|--------|
| 20 | **SSR/static generation** — générer le HTML statique avec les données embarquées (plus de "Chargement..." pour les crawlers). Solution simple : script Python qui génère un `index.html` pré-rempli. |
| 21 | **Ajouter une page `/question/jour`** avec navigation dans l'historique |
| 22 | **Ajouter des structured data JSON-LD** (schema.org/Dataset) pour le SEO académique |
| 23 | **Ajouter un sitemap.xml et robots.txt** |
| 24 | **Passer à un module bundler simple** (esbuild) pour minifier et versionner les assets |
| 25 | **Ajouter des tests frontend** (Vitest + Testing Library) pour les fonctions de rendu critiques |
| 26 | **Persistance des filtres dans l'URL** (query params) pour permettre le partage de vues filtrées |
| 27 | **Ajouter `prefers-reduced-motion`** pour désactiver les animations |
| 28 | **Remplacer les icônes CSS par des SVG inline avec `aria-label`** pour l'accessibilité |

---

## Statut : Ce qui est BON et qu'il faut garder

Pour équilibrer la critique — voici ce qui fonctionne :

- ✅ **Le script d'évaluation `afribench.py` est solide** : 627 lignes, CLI propre, validation des questions, export CSV/JSON/Markdown, gestion des APIs (OpenAI, Anthropic, Mistral, DeepSeek, Google, Together)
- ✅ **Le format de question est bien pensé** : template JSON standard, catégories documentées, sources obligatoires, explications détaillées
- ✅ **Le design system CSS est cohérent** : 2193 lignes de custom properties bien organisées, thème clair/sombre, composants réutilisables
- ✅ **La structure sémantique HTML est bonne** : landmarks, rôles ARIA sur la navigation, structure de page logique
- ✅ **Les questions sont bien sourcées** : UNESCO, travaux académiques africains, sources vérifiables
- ✅ **Le script de validation existe** : `validate_questions()` vérifie la syntaxe, les catégories, les difficultés, les options — c'est plus que ce que font beaucoup de benchmarks

---

*Document généré le 21 juin 2026 — à mettre à jour après chaque phase.*
