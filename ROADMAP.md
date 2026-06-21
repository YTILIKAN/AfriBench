# Roadmap AfriBench — Solutions priorisées

> Version actionnable du [CRITIQUE.md](CRITIQUE.md). Ce qu'on fait, dans quel ordre, avec quel budget.

---

## 🔴 Phase 1 — Corrections critiques (0€, ~4h de travail)

**Objectif :** Réparer ce qui est cassé ou trompeur avant de construire plus.

- [ ] **Bannière prototype** sur le site + README — remplacer "LEADER" par "Meilleur score (v0.1)"
- [ ] **Échapper le HTML** dans les rendus JS (`escapeHtml()`) — correction XSS
- [ ] **Google Fonts `display=swap`** — ne plus bloquer le rendu du texte
- [ ] **Skip-link** — `<a href="#main-content">` pour l'accessibilité clavier
- [ ] **Menu hamburger mobile** — la sidebar disparaît sous 768px sans alternative
- [ ] **Contraste light mode** — ajuster `--bronze` pour ratio 4.5:1 minimum
- [ ] **`<noscript>`** — message pour les utilisateurs sans JS
- [ ] **Ajuster le wording** — remplacer "reproductible" par "reproductible (protocole documenté)" et linker la doc

## 🟡 Phase 2 — Renforcement du benchmark (~0€, 3-6 semaines de travail)

**Objectif :** Donner au benchmark une signification statistique et une crédibilité externe.

- [ ] **200+ nouvelles questions** — cible : 300-350 questions total, 30-35 par catégorie
- [ ] **20 questions témoins** — QCM non-africains pour servir de baseline comparative
- [ ] **3 validateurs africains** — recruter via Masakhane, Deep Learning Indaba, Twitter
- [ ] **10 questions de génération ouverte** — avec grille d'évaluation LLM-as-judge
- [ ] **Documenter le protocole** sur le site : temperature, prompt, few-shot, seeds
- [ ] **Publier le script d'évaluation** en lien direct sur le site
- [ ] **Fichier `reproduce.sh`** — script bout-en-bout pour reproduire les résultats

## 🟢 Phase 3 — Scale et internationalisation (~500-1500€, 2-3 mois)

- [ ] **Traduction en 2-3 langues africaines** (swahili, yoruba, amharique) avec traducteurs natifs
- [ ] **Tâches non-QCM** — traduction FR↔langue africaine, résumé, QA ouverte
- [ ] **Intégration LM Evaluation Harness** — task YAML, exécution standardisée
- [ ] **Dockerfile** — conteneur reproductible avec seeds fixées
- [ ] **Soumission académique** — ACL/NeurIPS datasets track

## 🔵 Phase 4 — Frontend long-terme

- [ ] **HTML statique pré-généré** — plus de "Chargement..." pour les crawlers
- [ ] **Structured data** JSON-LD (schema.org/Dataset)
- [ ] **Filtres dans l'URL** — partage de vues filtrées
- [ ] **Sitemap + robots.txt**
- [ ] **Asset bundling** (esbuild) — minification, versionnement
- [ ] **Tests frontend** (Vitest)
- [ ] **Icônes SVG accessibles** — remplacer les icônes CSS-only

---

*Dernière mise à jour : 21 juin 2026*
