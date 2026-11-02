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

- **Ventilation par type de lubrifiant** : somme des quantités par parc/lubrifiant et par engin/lubrifiant, en conservant l’unité de chaque lubrifiant. Les deux tableaux sont triés par consommation décroissante. La première ligne du tableau par parc présente le total du parc, tous lubrifiants confondus, avec une quantité distincte par unité. La période, le parc et le type de lubrifiant sont obligatoires ; le site, le type de parc, l’engin, le lubrifiant, la section et l’imputation sont facultatifs. La liste des engins est limitée au parc sélectionné. Les deux tableaux peuvent être exportés séparément.
- **Spécifique par type de lubrifiant** : présente le spécifique par parc/lubrifiant et par engin/type de lubrifiant. Les deux tableaux sont triés par spécifique décroissant. La première ligne du tableau par parc présente le total du parc, tous lubrifiants confondus, avec consommation, HRM et spécifique distincts par unité. Les calculs de quantité, HRM, spécifique, objectif et écart sont arrondis à deux décimales. Le HRM est compté une seule fois par engin dans chaque groupe. Le tableau par engin comprend l’objectif annuel et l’écart (spécifique moins objectif) ; un écart inférieur ou égal à zéro est vert, un écart positif est rouge. L’objectif (`spe_huile`, `spe_go` ou `spe_graisse`) est déterminé par le nom du type de lubrifiant et correspond à l’année de fin de période et au site de l’engin. Si aucun HRM ou objectif n’est disponible, le spécifique ou l’écart correspondant n’est pas calculé.
- **Partie 3 — Les spécifiques** : tableau récapitulatif de tous les parcs du type de parc associé au parc sélectionné, avec les objectifs, spécifiques et écarts pour gas-oil, huile et graisse. Le spécifique utilise les saisies entièrement comprises dans la période sélectionnée et les HRM correspondants ; un site sélectionné filtre les engins et les objectifs. Les objectifs de plusieurs sites sont moyennés et les unités différentes sont présentées séparément.
- **Évolution spécifique** (`/rapports/evolution-specifique-lubrifiants`) : courbe mensuelle par type de lubrifiant et unité, avec filtres année, type de parc, parc, site, engin, type de lubrifiant et lubrifiant. Le type de lubrifiant est obligatoire ; tous les calculs et classements ne portent que sur ce type. Le lubrifiant est sélectionné dans le type choisi. Les objectifs annuels `spe_huile`, `spe_go` et `spe_graisse` sont associés aux types dont le nom désigne respectivement l’huile, le gasoil/diesel ou la graisse ; les objectifs de plusieurs sites sont moyennés lorsque le filtre site n’est pas précisé.

Une saisie n’est incluse dans un rapport que si sa période entière se trouve dans la période filtrée. Les résultats peuvent être filtrés par site et les deux parties de chaque rapport sont paginées et exportables séparément.

## Mise en service locale

La migration Prisma `20261101180000_add_lubrifiant_consumption` crée les tables et les permissions de ces modules. Elle n’a pas été appliquée à la base pendant le développement. Avant d’utiliser les pages, appliquer la migration sur la base locale, régénérer le client Prisma et attribuer les nouvelles permissions aux rôles concernés.
