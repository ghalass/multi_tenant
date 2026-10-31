## Pour démarrer ton environnement Docker
docker compose up -d
## Pour arrêter les conteneurs tout en conservant les données
docker compose down
## Pour consulter les journaux :
docker compose logs -f app
## après Modification des pages, composants ou Server Actions
docker compose up -d --build app
## après Modification des tables Prisma (Cette commande applique les nouvelles migrations à la base Docker sans réinitialiser les données.)
docker compose run --build --rm --no-deps migrate pnpm prisma migrate deploy
docker compose up -d --build app
## après Modification des variables d'environnement
docker compose up -d --force-recreate app
