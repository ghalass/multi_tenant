analyse mon projet de gmao https://github.com/ghalass/multi_tenant
et me faire des recommandations, mais reste objectif, efficace, fiable, précis, brève, sans être long (le plus court possible) et me proposer des solutions étape par étape, et avant de me donner des codes à changer il faut me faire un résumé de ce que tu propose et comment tu va le traiter 
ne modifie jamais jamais jamais jamais jamais jamais mon repo, mais plutôt me donner la version finale complète des codes à modifier en local
--------
ok ok tout fonctionne, 
lire tout les fichiers du projet https://github.com/ghalass/multi_tenant
ne modifie jamais jamais jamais jamais jamais jamais mon repo, mais plutôt me donner la version finale complète des codes à modifier en local
faire:
-rajoute une page pour gestion des saisie_hrm,  s'inspire de ce qui est fait avec sites, users, parcs, engins,typepannes,pannes (page complète avec ajoute du lien dans le sidebar des configurations, respecte la même architecture)
--------
ok ok tout fonctionne, 
lire tout les fichiers du projet https://github.com/ghalass/multi_tenant
ne modifie jamais jamais jamais jamais jamais jamais mon repo, mais plutôt me donner ici (pas en téléchargement ) la version finale complète des codes à modifier en local
faire:
-la gestion saisie_hrm doit être séparer en deux page : la 1ière juste pour afficher, filtrer, modifier, supprimer (n'affiche rien au chargement de la page, mais seulement en cliquant sur un button avec ou sans filter) et la 2ième juste pour ajouter une saisie_hrm (n'affiche rien au chargement de la page, mais seulement en filtrant une date"jour" les saisie_hrm de ce jour est afficher et on peut les modifier ou rajouter d'autres)
-aussi il faut rajouter une filtration par typeparc => parc => engin à toutes les deux pages afin de faciliter la recherche et la saisie
dans la page saisie-hrm ==> je doit consulter les saisie_hrm entre deux dates
dans la page saisie-hrm/saisie ==> je doit consulter les saisie_hrm d'une date précise et pouvoir faire le crud de saisie_hrm à cette date
--------
ok ok tout fonctionne, 
lire tout les fichiers du projet https://github.com/ghalass/multi_tenant
ne modifie jamais jamais jamais jamais jamais jamais mon repo, mais plutôt me donner ici (pas en téléchargement ) la version finale complète des codes à modifier en local
faire:
-rajoute une page pour gestion des saisie_him,  s'inspire de ce qui est fait avec saisie_hrm (page complète avec ajoute du lien dans le sidebar des configurations, respecte la même architecture)
--------
ok ok tout fonctionne, 
lire tout les fichiers du projet https://github.com/ghalass/multi_tenant
bien lire https://github.com/ghalass/gmao_nextjs
ne modifie jamais jamais jamais jamais jamais jamais mon repo, mais plutôt me donner ici (pas en téléchargement ) la version finale complète des codes à modifier en local

s'inspirer du projet gmao_nextjs
faire pour multi_tenant:
-rajoute une page pour gestion des rapports/pareto,  s'inspire de ce qui est fait avec rapports/etat-mensuel (page complète avec ajoute du lien dans le sidebar des configurations, respecte la même architecture) et du projet gmao_nextjs (faire la même fonctionalité)
--------
ok ok tout fonctionne, 
lire tout les fichiers du projet https://github.com/ghalass/multi_tenant
bien lire https://github.com/ghalass/gmao_nextjs
ne modifie jamais jamais jamais jamais jamais jamais mon repo, mais plutôt me donner ici (pas en téléchargement ) la version finale complète des codes à modifier en local

s'inspirer du projet gmao_nextjs
faire pour multi_tenant:
-rajoute une page pour gestion des backlogs, s'inspire de ce qui est fait avec saisie-hrm (page complète avec ajoute du lien dans le sidebar des configurations, respecte la même architecture) et du projet gmao_nextjs (faire la même fonctionalité)
nota:backlogs est équivalent à anomalies dans gmao_nextjs
--------
ok ok tout fonctionne, 
lire tout les fichiers du projet https://github.com/ghalass/multi_tenant
ne modifie jamais jamais jamais jamais jamais jamais mon repo, mais plutôt me donner ici (pas en téléchargement ) la version finale complète des codes à modifier en local
faire:
-rajoute au dialog d'ajout/modifier un backlog, le filtre typeparc->parc->site->engin
-typeparc->parc : sur la même ligne
-site->engin : sur la même ligne
-date d'exection ne doit pas être actif que quen status choisi est execute
-N°backlog, date de détection, source, priorité : sur la même ligne 

-----
en plus de ce qui est dèjà dans la page backlogs/stats
me rajouter des graphiques (charts) de statistique avec l'option de les changer en fonction de la période (date Du, Au)
exemple des charts:
-évolution du total backlogs et total executé pendant la période (sur le même graphique), "pas de l'évolution est à définir, soit mois ou jour en fonction de la longueur de la période sélectionnée"
-la réparition des baclogs par source pour la période sélectionnée
-la réparition des baclogs par priorité pour la période sélectionnée
-la réparition des baclogs par status pour la période sélectionnée

------------
A CORRIGER
-pour saisie_hrm : il faut rajouter la nho aux champs obligatoire (à l'import et au formulaire), et partout dans l'application il faut lire nho à partir du saisie_hrm
-pour le calcul de MTBF partout dans l'application : si NI est 0 ou non renseigné donc MTBF=NHO et non pas 0
-page engins : ajouter filtre par site, tyeparc->parc
-page pannes : ajouter filtre par parc, par typepanne
-page rapports/rje : le filtre site doit se baser sur le site de saisie_hrm (la dernière) et non pas sur le site dans engin.site
-page rapports/etat-general : vérifie le calcul des heures chassis 
-page rapports/pareto : 
    rajoute Evolution DISPO (comme Evolution MTBF)
    rajoute Pareto NI (comme Pareto Indisponibilité)