# Déploiement automatique Next.js + PostgreSQL + Prisma via GitHub Actions sur un VPS Hostinger

**Principe :** à chaque `push` sur `main`, GitHub Actions se connecte en SSH au VPS, qui récupère le code, installe les dépendances, applique les migrations Prisma, compile et redémarre l'app (PM2). Nginx sert de reverse proxy avec HTTPS.

---

## Étape 1 : Préparer le VPS (Ubuntu 22.04/24.04)

Connectez-vous en root, puis créez un utilisateur dédié :

```bash
adduser deploy
usermod -aG sudo deploy
```

Installez les outils de base :

```bash
apt update && apt upgrade -y
apt install -y git nginx ufw curl build-essential

# Node.js LTS (exemple avec Node 22)
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# PM2
npm install -g pm2
```

Pare-feu :

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

> Si vous avez aussi un pare-feu dans hPanel, vérifiez que les ports 22, 80 et 443 y sont autorisés.

## Étape 2 : Installer et configurer PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

```sql
CREATE USER app_multi_tenant_user WITH PASSWORD 'MotDePasseFort';
CREATE DATABASE app_multi_tenant_db OWNER app_multi_tenant_user;
\q
```

Votre `DATABASE_URL` sera :
```
postgresql://app_multi_tenant_user:MotDePasseFort@localhost:5432/app_multi_tenant_db?schema=public
```
(Si le mot de passe contient des caractères spéciaux, encodez-les en URL.)

PostgreSQL écoute par défaut sur localhost uniquement : ne l'exposez pas publiquement.

## Étape 3 : Préparer le projet

Dans `package.json` :

```json
"scripts": {
  "build": "next build",
  "start": "next start -p 3000",
  "postinstall": "prisma generate"
}
```

Dans `schema.prisma`, `prisma` doit être disponible au déploiement (mettez `prisma` en `dependencies`, ou utilisez `npx prisma`). Versionnez le dossier `prisma/migrations` (créé avec `prisma migrate dev` en local). Ne versionnez jamais `.env`.

## Étape 4 : Cloner le dépôt sur le VPS

Connectez-vous en tant que `deploy` et générez une clé pour que le serveur puisse lire votre repo GitHub :

```bash
ssh-keygen -t ed25519 -C "vps-deploy-key" -f ~/.ssh/github_deploy
cat ~/.ssh/github_deploy.pub
```

Ajoutez cette clé publique dans GitHub : **Repo → Settings → Deploy keys** (lecture seule suffit). Puis :

```bash
cat >> ~/.ssh/config <<EOF
Host github.com
  IdentityFile ~/.ssh/github_deploy
EOF

su - deploy
sudo mkdir -p /var/www/multi_tenant && sudo chown deploy:deploy /var/www/multi_tenant
git clone git@github.com:ghalass/multi_tenant.git /var/www/multi_tenant
```

Créez le fichier d'environnement **sur le serveur** :

```bash
nano /var/www/multi_tenant/.env
```
```
DATABASE_URL="postgresql://multi_tenant_user:MotDePasseFort@localhost:5432/multi_tenant_db?schema=public"
NODE_ENV=production
# NEXTAUTH_SECRET, NEXTAUTH_URL, etc.
```

## Étape 5 : Script de déploiement sur le serveur

`/var/www/multi_tenant/deploy.sh` :

```bash
#!/bin/bash
set -e
su - deploy
cd /var/www/multi_tenant
git fetch origin main
git reset --hard origin/main

npm ci
npx prisma generate
npx prisma migrate deploy   # jamais "migrate dev" en production
npm run build

pm2 reload multi_tenant --update-env || pm2 start npm --name multi_tenant -- start
pm2 save
```

```bash
chmod +x deploy.sh
./deploy.sh        # premier déploiement manuel pour valider
pm2 startup        # exécutez la commande affichée pour démarrer PM2 au reboot
pm2 save
```

> **Mémoire :** `next build` peut planter sur un petit VPS (1 à 2 Go de RAM). Ajoutez du swap (`fallocate -l 2G /swapfile` puis `mkswap` et `swapon`) ou compilez dans GitHub Actions (voir l'option plus bas).

## Étape 6 : Nginx + HTTPS

`/etc/nginx/sites-available/multi_tenant` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/multi_tenant /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

N'oubliez pas de faire pointer l'enregistrement DNS **A** de votre domaine vers l'IP du VPS.

## Étape 7 : Clé SSH pour GitHub Actions

Sur votre machine locale (ou sur le VPS), créez une clé **dédiée** à la CI :

```bash
ssh-keygen -t ed25519 -f gha_deploy -C "github-actions"
```

- Ajoutez `gha_deploy.pub` dans `/home/deploy/.ssh/authorized_keys` sur le VPS.
- Gardez `gha_deploy` (clé privée) pour l'étape suivante, puis supprimez-la de votre machine.

## Étape 8 : Secrets GitHub

**Repo → Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP du VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | contenu de la clé privée `gha_deploy` |
| `VPS_PORT` | `22` (optionnel) |

## Étape 9 : Workflow GitHub Actions

`.github/workflows/deploy.yml` :

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run build
        env:
          DATABASE_URL: postgresql://user:pass@localhost:5432/db

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Déploiement via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || 22 }}
          script: |
            /var/www/multi_tenant/deploy.sh
```

Poussez sur `main` et suivez l'exécution dans l'onglet **Actions**.

---

## Bonnes pratiques

- **Migrations :** utilisez uniquement `prisma migrate deploy` en production. Faites des migrations rétrocompatibles (ajouter avant de supprimer) pour limiter les pannes.
- **Sauvegardes :** programmez un `pg_dump` quotidien (cron) avant tout changement de schéma important.
- **Environnement :** gardez `.env` uniquement sur le serveur ; les secrets ne doivent pas être commités.
- **Rollback :** `git reset --hard <commit précédent>` puis relancez `deploy.sh`.
- **Logs :** `pm2 logs multi_tenant` et `/var/log/nginx/error.log`.
- **Sécurité SSH :** désactivez la connexion root et par mot de passe (`PermitRootLogin no`, `PasswordAuthentication no` dans `/etc/ssh/sshd_config`), et installez `fail2ban`.

## Option : compiler dans GitHub Actions (si le VPS est petit)

Au lieu de compiler sur le serveur, vous pouvez faire `npm run build` dans la CI avec `output: 'standalone'` dans `next.config.js`, puis envoyer le dossier `.next/standalone` (plus `public` et `.next/static`) avec `rsync` ou `scp`, et lancer seulement `prisma migrate deploy` + `pm2 reload` sur le VPS. C'est plus léger pour le serveur mais un peu plus complexe à mettre en place.

## Erreurs fréquentes

- **`Permission denied (publickey)`** : mauvaise clé dans le secret, ou clé publique absente d'`authorized_keys`.
- **`Prisma Client could not locate the Query Engine`** : `prisma generate` n'a pas été exécuté sur le serveur.
- **502 Bad Gateway** : l'app n'tourne pas sur le port 3000 (`pm2 status`).
- **Build tué (`Killed`)** : manque de RAM, ajoutez du swap.

---

Si vous préférez une approche **Docker** (Docker Compose avec Next.js + PostgreSQL), je peux vous détailler cette variante aussi.