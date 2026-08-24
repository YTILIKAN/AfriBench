# AfriBench — Notes d'orateur

**Support :** [`docs/presentation/index.html`](index.html) — 32 diapositives
**Occasion :** soutenance de validation, 7 septembre 2026
**Format cible :** 20 à 25 minutes d'exposé, 10 à 15 minutes d'échange
**Public :** mixte, majoritairement non technique

---

## Avant de commencer

### Ouvrir le support

Ouvrir `docs/presentation/index.html` dans n'importe quel navigateur. Aucune installation, aucun serveur.

| Touche | Effet |
|---|---|
| `→` `↓` `Espace` | Diapositive suivante |
| `←` `↑` | Diapositive précédente |
| `Début` / `Fin` | Première / dernière diapositive |
| `F` | Plein écran |
| `P` | Impression — permet d'exporter en PDF |
| Glisser | Navigation tactile sur téléphone et tablette |

L'URL retient le numéro de diapositive (`index.html#17`) : on peut envoyer un lien qui ouvre directement une diapositive précise, et rafraîchir sans perdre sa place.

**Export PDF :** touche `P`, puis « Enregistrer au format PDF », orientation paysage, marges nulles, cocher « graphismes d'arrière-plan ». Les 32 diapositives sortent au format 1280 × 720.

### Plan de secours

- Le PDF exporté, sur une clé USB. Il ne dépend ni du réseau ni du navigateur de la salle.
- Le [rapport technique](../RAPPORT_TECHNIQUE.md) imprimé ou accessible, pour toute question de détail.
- Le site public [ytilikan.github.io/AfriBench](https://ytilikan.github.io/AfriBench/) ouvert dans un onglet : il fonctionne même sans API, donc une démonstration live reste possible en cas de réseau dégradé.

---

## La règle d'or de cette présentation

Le public n'est pas là pour admirer une architecture logicielle. Il est là pour savoir **si le projet tient debout**.

Une seule idée doit rester si tout le reste s'efface :

> **Nous avons construit une balance que ceux qu'elle mesure ne possèdent pas.**

Trois principes d'animation :

1. **Une métaphore par idée, jamais deux.** Le fil rouge est l'examen. Les images secondaires — thermomètre, sondage, groupe électrogène, arbre à palabres — sont attachées à une diapositive précise. Ne pas les mélanger.
2. **Ne pas lire les diapositives.** Elles sont là pour être lues *après*, par un absent. À l'oral, raconter.
3. **Ne pas s'excuser des limites.** Les annoncer comme un résultat. C'est le mouvement le plus fort de la présentation.

---

## Déroulé, diapositive par diapositive

### Ouverture — diapositives 1 à 2 · ~2 min

**1 · Couverture**
Se présenter, nommer le cadre : projet d'été Y'TILIKAN, un des trois projets de la cohorte. Ne pas encore expliquer le sujet.

> *« AfriBench répond à une question simple que personne ne posait : qu'est-ce que l'intelligence artificielle sait vraiment de l'Afrique ? Pas ce qu'elle prétend savoir. Ce qu'on peut mesurer. »*

**2 · Plan**
Annoncer le fil rouge, et l'annoncer explicitement comme un outil de compréhension.

> *« Un benchmark, c'est un examen. Gardez cette image pendant vingt minutes et vous comprendrez tout, même sans connaître une ligne de code. Nous avons écrit le sujet, rédigé le règlement, convoqué les candidats, corrigé les copies, publié le palmarès. »*

---

### Le problème — diapositives 3 à 5 · ~4 min

**3 · Un examen écrit ailleurs**
La diapositive la plus importante pour accrocher un public non technique. Prendre le temps.

Raconter l'analogie du concours rédigé à l'étranger. Marquer un silence après « Cela ne dit rien de ce que vous savez de votre propre pays. »

Si un exemple concret est utile : les benchmarks les plus cités interrogent les modèles sur la Constitution américaine ou le baseball. Quasiment jamais sur l'Empire du Mali, le droit OHADA ou la CEMAC.

**4 · Ce qui n'est pas mesuré n'est jamais amélioré**
Le pivot du discours : ce n'est pas une blessure identitaire, c'est un problème opérationnel.

> *« Les laboratoires d'IA optimisent ce qu'on mesure. C'est leur métier. Si aucun test public ne révèle qu'un modèle ignore le droit foncier coutumier, personne n'a de raison de le corriger. Le trou reste invisible, donc il reste. »*

Insister sur la conséquence pratique : les écoles, les hôpitaux et les administrations adoptent ces outils **maintenant**, sans connaître leurs angles morts.

**5 · AfriBench en une phrase**
Poser la définition. Puis désamorcer immédiatement toute lecture concurrentielle.

> *« Masakhane, AfriMMLU, AfroBench existent et sont excellents. Ils travaillent sur les langues africaines à faibles ressources, majoritairement en anglais. Nous occupons un vide, pas leur place : la connaissance factuelle et le raisonnement contextuel, en français. La langue de travail de plus de vingt pays africains. »*

---

### L'alignement Y'TILIKAN — diapositives 6 à 8 · ~3 min

**6 · Les quatre verbes**
Ne pas lire les quatre cartes. Choisir **deux** verbes et les incarner.

Suggestion : *Informer* et *Former*.

> *« Informer : nous publions des chiffres avec leur marge d'erreur et la méthode qui les a produits. C'est exactement le contraire du marketing des laboratoires d'IA, qui annoncent des scores sur des examens qu'ils ont eux-mêmes écrits. »*
>
> *« Former : ce dépôt est un cahier d'apprentissage. Six personnes ont traversé une chaîne complète, de la conception de données jusqu'au déploiement. Le livrable, ce n'est pas seulement le benchmark — c'est aussi ce que nous savons faire maintenant et que nous ne savions pas faire en mai. »*

**7 · Comprendre, maîtriser, créer**
Le cœur de l'alignement. Insister sur le fait que la vision de Y'TILIKAN décrit un **ordre d'opérations**, pas une ambiance.

> *« On ne peut pas maîtriser ce qu'on ne comprend pas, et on ne comprend pas ce qu'on ne mesure pas. Construire un instrument de mesure, c'est donc le tout premier geste. Avant AfriBench, "les IA connaissent mal l'Afrique" était une intuition de conversation. C'est aujourd'hui une hypothèse testable. »*

**8 · Trois projets, un même ADN**
Situer AfriBench dans la cohorte, nommer les autres équipes. Terminer par la division du travail : AfroLang nourrit, AfroTech-Pulse suit, AfriBench établit les faits.

---

### Ce que nous avons construit — diapositives 9 à 25 · ~11 min

C'est la partie la plus longue. **Ne pas tout détailler.** Le rapport technique est là pour ça.

**9 · Quatre briques**
Annoncer la structure : sujet, règlement, palmarès, vitrine. Laisser les quatre chiffres du bas parler seuls.

**10 · Le corpus**
Le message clé n'est pas le nombre 350, c'est **le travail que représente 350**.

> *« Trois cent cinquante questions écrites à la main, une par une. Quatre options, une explication, et une source vérifiable pour chacune. C'est la partie la plus lente du projet, la moins spectaculaire, et celle qui donne toute sa valeur au reste. Un beau site posé sur de mauvaises questions ne vaut rien. »*

Puis pointer la catégorie **Raisonnement culturel** : c'est notre signature. Aucun benchmark occidental n'a d'équivalent.

**11 · Anatomie d'une question**
Lire la question HIST-001 à voix haute — le public y répond mentalement, ce qui le met dans la position du modèle évalué. Effet garanti.

Puis les deux champs : `source` sépare un corpus scientifique d'un quiz ; `explanation` rend le corrigé contestable.

Terminer sur le champ **vide** :

> *« Et un troisième champ, volontairement vide sur les 350 questions : "validé par". Ce n'est pas un oubli. C'est la trace, lisible par une machine, du fait que personne d'extérieur à l'équipe n'a encore relu ces questions. Un script le compte et publie zéro pour cent. Nous y revenons dans un instant. »*

**12 · Les témoins**
La métaphore du thermomètre. C'est la diapositive qui fait comprendre à un public non scientifique ce qu'est un groupe de contrôle. La dérouler entièrement, elle vaut son temps.

**13 · Au-delà du QCM**
Message : le QCM permet de deviner, donc il ne suffit pas. Puis la grille de correction (exactitude / profondeur / nuance culturelle) et l'idée du correcteur automatique dont on peut relire la copie.

**Ne pas cacher que c'est un pilote.** Le dire soi-même, avant qu'on ne le demande.

**14 · Le protocole**
Ne pas lire le tableau. Choisir **la température à zéro**, qui est la notion la plus contre-intuitive et la plus importante.

> *« Ces modèles ont un réglage de créativité. À zéro, le modèle donne toujours exactement la même réponse à la même question. C'est indispensable : sinon, refaire l'examen donnerait un autre classement, et le classement ne voudrait rien dire. »*

Puis la copie illisible (`no_answer`) : Mistral Large en a produit 3 sur 101, et c'est affiché.

**15 · Reproductibilité**
Quatre niveaux. Insister surtout sur le niveau 4.

> *« Le dernier niveau est le plus important : notre examen est intégré à l'outil standard de la communauté scientifique. Cela veut dire qu'un chercheur peut nous vérifier avec son propre outil, sans nous faire confiance, sans même lire notre code. C'est ça, la reproductibilité — pas une case à cocher, mais la différence entre une affirmation et une mesure. »*

**16 · Validation externe**
Diapositive délicate : elle contient une croix rouge. L'assumer frontalement, et retourner la faiblesse en demande.

> *« Tout est prêt : le protocole, les documents de consentement, quatre scripts, les canaux de recrutement identifiés. Il manque trois personnes. C'est notre verrou numéro un, et c'est aussi une invitation directe à toute personne dans cette salle qui connaît un historien, un juriste ou un spécialiste de santé publique. »*

Expliquer le κ de Cohen simplement : *« il détecte deux correcteurs qui valident les yeux fermés »*.

**17 · Le palmarès**
Laisser le tableau respirer. Ne pas commenter les rangs — la diapositive suivante s'en charge. Annoncer :

> *« Ce tableau est incomplet, et volontairement. Il lui manque la chose la plus importante. »*

**18 · L'honnêteté statistique — LA diapositive de la présentation**

Ralentir. C'est ici que le projet gagne ou perd sa crédibilité.

> *« Notre premier de classe n'est pas démontré premier. Sur vingt-et-une comparaisons entre modèles, deux seulement sont statistiquement solides. Tout le reste est du bruit.*
>
> *C'est la logique d'un sondage électoral. Cinquante-deux contre quarante-huit, marge d'erreur trois points : ça ne veut pas dire que le premier gagne, ça veut dire qu'on ne sait pas.*
>
> *Avec cent une questions, une question de plus ou de moins déplace un score d'un point entier. Notre classement affiche un ordre. Notre analyse dit que le podium est indécidable. Nous publions les deux — et le site affiche l'avertissement au lieu de le cacher.*
>
> *Un support de communication ordinaire aurait supprimé cette diapositive. C'est précisément pour ça qu'elle est là. »*

**19 · Le plafond de verre**
Enchaîner naturellement : si tout le monde a plus de 90 %, l'examen ne classe personne. Trois hypothèses, et la réponse déjà inscrite dans l'architecture — les tâches ouvertes, où deviner ne sert à rien.

**20 · Architecture**
La métaphore du journal : rédaction, imprimerie, kiosque, vitrine. Ne pas entrer dans les technologies.

Le point à faire passer est la décision structurante :

> *« Nous avons choisi que les fichiers fassent foi, pas la base de données. Pourquoi ? Parce qu'un corpus scientifique doit être auditable. Quand quelqu'un corrige une question, on voit exactement ce qui change, mot par mot, dans l'historique. Une ligne modifiée dans une base de données ne laisse pas cette trace. »*

**21 · Résilience**
Diapositive à fort impact devant un public africain. Prendre le temps de la métaphore du groupe électrogène.

> *« Nous avons conçu ce système en sachant que l'électricité et le réseau ne sont pas des acquis là où nous vivons. Quand quelque chose tombe, le site ne montre pas une page blanche : il baisse d'un cran et affiche honnêtement d'où viennent ses données. Et ce n'est pas qu'une intention : un robot vérifie à chaque modification que le site démarre alors que l'API est éteinte. »*

**22 · Visite guidée**
Aller vite sur les quatre espaces. **Si le réseau le permet, basculer sur le site en direct** et montrer deux choses seulement : le classement qui se trie, et la question du jour qui se déplie.

La question du jour est le meilleur argument auprès d'un public non technique : elle transforme un tableau de bord en objet de curiosité quotidienne.

**23 · Le hub participatif**
La métaphore de l'arbre à palabres. Insister sur le tri par défaut, qui est un choix politique déguisé en détail technique :

> *« Nous faisons remonter les propositions les moins vues, pas les plus populaires. Sinon, les mêmes questions captent tous les votes et les nouvelles ne sont jamais lues. Nous répartissons l'attention au lieu de la concentrer. »*

**24 · Design et accessibilité**
Ne pas parler couleurs. Parler **mobile** et **accessibilité**, avec l'argument le plus concret :

> *« Le grand tableau du classement ne défile jamais horizontalement, à aucune largeur d'écran. Il masque progressivement ses colonnes les moins importantes. Pourquoi ? Parce que personne ne découvre un défilement horizontal sur un téléphone — et parce qu'ici, le premier écran, souvent l'unique, c'est un téléphone. »*

Puis la phrase sur l'accessibilité comme qualité de fabrication, pas comme faveur.

**25 · Industrialisation**
Trois vitrines, sept robots. Terminer sur le détail dont l'équipe est le plus fière :

> *« Notre chaîne automatique ne teste pas seulement le code. Elle vérifie aussi le niveau de complétude scientifique du projet — la couverture de validation, l'état du dossier académique — à chaque modification. Autrement dit : il est impossible de laisser filer une régression d'honnêteté sans qu'un robot le signale. »*

---

### Bilan et suite — diapositives 26 à 32 · ~5 min

**26 · Chronologie**
Aller vite. Un seul point à souligner : en juin, le projet semblait fini. C'est **là** que l'équipe a écrit sa propre critique. Cela installe la diapositive suivante.

**27 · L'autocritique comme méthode**
Enchaînement direct.

> *« Le document qui a le plus fait avancer ce projet est celui qui le démolit. Il a produit dix-sept issues, qui ont produit vingt-huit pull requests, qui ont produit tout ce que vous venez de voir. Nommer ses faiblesses est le chemin le plus court vers un plan de travail. »*

**28 · Les trois manques**
Les énoncer calmement, sans posture défensive. La force vient du ton.

> *« La crédibilité d'un instrument se juge autant sur ce qu'il refuse d'affirmer que sur ce qu'il affirme. Ces trois manques sont écrits dans le dépôt, affichés sur le site, et vérifiés par un robot à chaque modification. Nous considérons que le dire fait partie du livrable. »*

**29 · Cinq chantiers**
Priorités 1 et 2 uniquement à l'oral. Le reste se lit.

Rappeler le levier mécanique : passer de 101 à 350 questions **divise la marge d'erreur par environ 1,9**. Le classement devient enfin discriminant. Ce n'est pas une promesse, c'est de l'arithmétique.

**30 · Trois leçons**
Le moment pédagogique du projet d'été. La leçon 1 est la plus forte :

> *« Écrire le classement a pris quelques heures. Comprendre qu'il ne permet pas de conclure — et le publier quand même — a pris beaucoup plus. C'est exactement ce qui sépare un projet scientifique d'une démonstration. »*

**31 · Participer**
Passer en mode appel. Nommer le besoin le plus urgent : **des validateurs**. Donner la commande unique et souligner qu'elle ne coûte rien.

**32 · Clôture**
Laisser la diapositive s'installer avant de parler.

> *« Nous n'avons pas construit un classement. Nous avons construit une balance. Et cette balance ne se trouve pas dans le laboratoire de ceux qu'elle mesure. C'est toute la différence.*
>
> *Le savoir, c'est le pouvoir — et mesurer, c'est savoir. Merci. »*

---

## Versions courtes

### 10 minutes

Diapositives **1, 3, 4, 5, 7, 9, 10, 12, 17, 18, 22, 28, 29, 32**.
Sacrifier l'architecture et l'industrialisation. Conserver impérativement la 18 (honnêteté statistique) et la 28 (limites) : ce sont elles qui donnent le crédit.

### 5 minutes

Diapositives **1, 3, 5, 10, 17, 18, 28, 32**.
Une image (l'examen écrit ailleurs), un chiffre (350 questions), un résultat (90–96 %), une honnêteté (le podium est indécidable), une conclusion (la balance).

### Démonstration live, si le temps le permet

Trois gestes, deux minutes, dans cet ordre :
1. Le classement — trier par une colonne, montrer la ventilation par matière.
2. La question du jour — la déplier, laisser la salle répondre, révéler.
3. Le hub — montrer une proposition et un vote.

Ne pas montrer le backoffice en public : il demande un mot de passe et n'intéresse pas l'auditoire.

---

## Questions attendues, et réponses préparées

**« Pourquoi seulement 350 questions ? MMLU en a des dizaines de milliers. »**
Parce que chacune est écrite à la main et sourcée. MMLU agrège des banques de questions existantes ; nous créons de la matière qui n'existait pas. Notre contrainte n'est pas la taille, c'est la validation. Un corpus de 5 000 questions non relues vaut moins qu'un corpus de 350 validées par des experts — et c'est précisément notre prochain chantier.

**« Vos scores sont sur 101 questions et vous en annoncez 350. N'est-ce pas trompeur ? »**
Ce serait trompeur si nous le cachions. Le site affiche une bannière automatique qui compare les deux nombres et prévient le visiteur, et le README le dit dès la troisième ligne. Le corpus a triplé après la campagne d'évaluation ; rejouer les modèles coûte du budget d'inférence et c'est la priorité numéro deux de la feuille de route.

**« Comment garantissez-vous que les questions ne sont pas dans les données d'entraînement des modèles ? »**
Nous ne le garantissons pas, et c'est une limite déclarée. C'est même l'une des trois hypothèses que nous mettons sur la table pour expliquer le plafonnement à 90–96 %. Un script d'analyse de contamination a été ajouté pour instruire la question. La réponse structurelle est le basculement vers les tâches ouvertes, où avoir vu le sujet aide beaucoup moins.

**« Les modèles sont tous au-dessus de 90 %. Le problème n'est-il pas déjà résolu ? »**
Trois raisons de ne pas conclure cela. D'abord, un QCM à quatre options est indulgent : reconnaître n'est pas produire. Ensuite, nos questions portent sur des faits assez présents sur le web francophone ; les questions vraiment difficiles sont celles qu'on n'a pas encore écrites. Enfin, ces 90 % sont en français sur du factuel — rien ne dit qu'ils tiennent en swahili ou sur du raisonnement ouvert. Notre travail commence là.

**« Qui a écrit les questions, et comment savez-vous qu'elles sont justes ? »**
Elles ont été écrites en interne, et nous ne savons pas encore qu'elles sont toutes justes. C'est exactement pourquoi la validation externe est notre verrou numéro un. Ce que nous garantissons : chaque question porte une source vérifiable et une explication publique. N'importe qui peut nous contredire, preuve en main, et ouvrir une issue.

**« Pourquoi pas React, Vue ou un framework moderne ? »**
Trois raisons. Le projet doit enseigner le web, pas un framework. Le site doit rester léger, parce qu'une connexion mobile se paie au mégaoctet. Et du JavaScript natif de 2026 fonctionnera encore en 2032, ce dont aucun framework ne peut se prévaloir.

**« Combien cela a-t-il coûté ? »**
Le développement : du temps bénévole. Les évaluations : un budget d'inférence modeste, à quoi s'ajoute le mode simulé qui permet de tester toute la chaîne à coût nul. L'hébergement : GitHub Pages et Hugging Face sont gratuits. Le poste de dépense qui vient est la rémunération des validateurs, prévue par le protocole de consentement.

**« Quelle différence avec AfroBench, de McGill ? »**
La proximité de nom est réelle et nous la documentons publiquement. AfroBench travaille sur le NLP multilingue africain, majoritairement en anglais. AfriBench travaille sur la connaissance factuelle et le raisonnement contextuel en français. Ce sont deux créneaux complémentaires, et un renommage reste une option si la confusion nuit à l'un ou l'autre.

**« Qu'est-ce qui empêche quelqu'un de tricher en optimisant pour votre benchmark ? »**
Rien, et c'est le sort de tous les benchmarks publics — c'est le prix de l'ouverture. Nos garde-fous : les questions témoins, qui détectent un modèle anormalement bon sur l'Afrique et faible ailleurs ; la ventilation par matière, qui rend visible une spécialisation suspecte ; et les tâches ouvertes, beaucoup plus difficiles à surajuster qu'un QCM.

**« Le projet va-t-il continuer après l'été ? »**
La feuille de route est publique et ordonnée par priorité. Ce qui reste à faire est du remplissage et de la revue, plus de la construction : l'instrument existe, il est testé, il est déployé. La suite dépend de deux ressources identifiées — des validateurs, et du budget d'inférence — pas d'un nouveau chantier technique.

---

## Fiche mémo — les dix chiffres à connaître par cœur

| Chiffre | Signification |
|---|---|
| **350** | Questions africaines validées |
| **20** | Questions témoins de calibrage |
| **9** | Matières |
| **7** | Modèles évalués |
| **90,1 – 96,0 %** | Amplitude des scores |
| **2 sur 21** | Comparaisons statistiquement significatives |
| **0 %** | Couverture de validation externe — assumé |
| **101** | Questions du seed d'évaluation, pas 350 — assumé |
| **17 / 17** | Issues ouvertes puis fermées |
| **1** | Commande pour tout reproduire : `./scripts/reproduce.sh --mock` |

---

## Documents associés

| Document | Usage |
|---|---|
| [`docs/presentation/index.html`](index.html) | Le support projeté |
| [`docs/RAPPORT_TECHNIQUE.md`](../RAPPORT_TECHNIQUE.md) | Le rapport complet, pour les questions de détail |
| [`CRITIQUE.md`](../../CRITIQUE.md) | L'autocritique publique |
| [`ROADMAP.md`](../../ROADMAP.md) | L'état d'avancement par phase |
| [`docs/VALIDATORS.md`](../VALIDATORS.md) | Le kit de recrutement, à partager après la soutenance |

---

**AfriBench** · Y'TILIKAN · *« Le savoir, c'est le pouvoir. »*
