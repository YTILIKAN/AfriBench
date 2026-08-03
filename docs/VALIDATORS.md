# Recrutement de validateurs africains (issue #5)

Objectif : **3+ experts / universitaires africains** pour valider le corpus QCM
(champs `validated_by`, `date_validated` actuellement vides).

## Profils recherchés

| Profil | Domaines utiles | Langues |
|--------|-----------------|---------|
| Historien / africaniste | histoire, société, culture | FR (± EN) |
| Géographe / économiste | géographie, économie | FR (± EN) |
| Juriste / politiste | droit_politique | FR |
| Locuteur natif SW / YO / AM | relecture traductions (#14) | langue cible |

Idéal : affiliation universitaire ou labo NLP/SHS en Afrique, ou diaspora active
(Masakhane, Deep Learning Indaba, etc.).

## Canaux

1. **Masakhane** — community@ / Slack / GitHub discussions
2. **Deep Learning Indaba** — mailing list / Discord alumni
3. Universités : UCAD (Dakar), University of Ghana, University of Nairobi, Addis Ababa University, University of Lagos
4. Réseaux : LinkedIn / X avec tags `#AfricanNLP` `#Masakhane` `#AfriBench`

Modèle de message court : [`templates/validator_outreach.md`](templates/validator_outreach.md).

## Processus de validation

Voir [`VALIDATION_PROTOCOL.md`](VALIDATION_PROTOCOL.md).

Résumé :

1. Assigner un **batch de 30–50 questions** (mix catégories / difficultés)
2. Le validateur marque chaque item : `ok` / `fix` / `reject` + commentaire
3. Deux validateurs indépendants sur ≥20 % du corpus (accord inter-annotateurs)
4. Intégrer les corrections ; renseigner `validated_by` + `date_validated`

## Rémunération / reconnaissance (proposition)

- Co-authorship dataset paper si contribution substantielle (≥50 items validés + relecture)
- Mention nominative dans `DATASET_CARD.md` / README
- Budget indicatif : selon partenariat (bénévolat académique ou vacation)

## Suivi

```bash
# Extraire un batch pour un validateur
python scripts/prepare_validation_batch.py --size 40 --out data/validation/batch_01.jsonl

# Après retour : appliquer les validations
python scripts/apply_validations.py --batch data/validation/batch_01_reviewed.jsonl
```

Statut actuel : **recrutement non démarré** — infrastructure prête.
