# Gestion des lubrifiants

## Pages

- Types : `/{locale}/types-lubrifiants`
- Lubrifiants : `/{locale}/lubrifiants`
- Saisies de consommation : `/{locale}/saisie-lubrifiants`
- Rapports : `/{locale}/rapports/lubrifiants`

Les types et les lubrifiants sont propres au tenant actif. Un lubrifiant possède un nom, un code, une unité et un type, et peut être associé à plusieurs parcs. Une saisie enregistre sa période, sa section, son imputation, son engin, son lubrifiant et sa quantité. Elle n’est pas liée à une saisie HRM ou HIM.

Les champs `section` et `imputation` sont des informations textuelles indépendantes. Les dates `du` et `au` sont inclusives. Deux périodes d’un même engin pour un même lubrifiant ne peuvent pas se chevaucher, même si la section ou l’imputation diffère.

## Import en lots

Dans `/batch-import`, importer les modules dans cet ordre :

1. `type_lubrifiants` : `name`
2. `lubrifiants` : `name`, `code`, `unite`, `typeLubrifiantName`, `parcNames`
3. `saisie_lubrifiants` : `du`, `au`, `section`, `imputation`, `code`, `lubrifiantName`, `designation`, `enginName`, `qte`

Dans `parcNames`, séparer plusieurs noms de parcs par un point-virgule. Les noms, codes et désignations d’une saisie doivent correspondre aux références existantes. L’import conserve le traitement par lots et renvoie un résultat par ligne Excel.

## Rapports

- **Consommations par engin** : somme des quantités par engin et lubrifiant, en conservant l’unité de chaque lubrifiant.
- **Spécifique par parc et lubrifiant** : somme des quantités divisée par la somme des HRM de la période pour les engins ayant consommé ce lubrifiant dans ce parc. Si aucun HRM n’est disponible, le spécifique n’est pas calculé.

Une saisie n’est incluse dans un rapport que si sa période entière se trouve dans la période filtrée. Les filtres de parc et de lubrifiant sont hiérarchiques ; les filtres engin, section et imputation sont également disponibles.

## Mise en service locale

La migration Prisma `20261101180000_add_lubrifiant_consumption` crée les tables et les permissions de ces modules. Elle n’a pas été appliquée à la base pendant le développement. Avant d’utiliser les pages, appliquer la migration sur la base locale, régénérer le client Prisma et attribuer les nouvelles permissions aux rôles concernés.
