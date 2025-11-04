# Billing Service — MVP (NestJS + Prisma + PostgreSQL)

Ce projet est le **backend de la plateforme d’abonnements biling-platform**.  
Il gère les **clients**, les **abonnements**, et la **facturation** via une API REST construite avec **NestJS**, **Prisma**, et **PostgreSQL** (conteneurisé avec Docker).

---

## Démarrage rapide

### 🧩 Prérequis
- Node.js ≥ 18
- npm ≥ 9
- Docker & Docker Compose
- Prisma CLI (`npx prisma` fonctionne sans installation globale)

---

### 1. Lancer la base de données

Depuis la racine du projet (`biling-platform/`) :

```bash
docker compose up -d
```
Ce conteneur PostgreSQL tourne sur localhost:5432

Identifiants par défaut : admin / admin, base billingdb

### 2. Installer et démarrer le backend
Depuis le dossier biling-platform/backend/billing-service/ :

```bash
npm install
npx prisma migrate dev --name init
npm run start:dev
```

### 3. Vérifier que tout fonnctionne

Santé du serveur
```bash
curl http://localhost:3000/healthz
```

Réponse attendue :
```bash
{ "status": "ok" }
```

Créer un client :
```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

Lister les clients :

```bash
curl http://localhost:3000/customers
```


## Structure du projet

```bash
billing-service/
├── src/
│   ├── app.controller.ts       # Contrôleur principal
│   ├── customers.controller.ts # Routes clients
│   ├── prisma.service.ts       # Service de connexion DB
│   └── main.ts                 # Point d’entrée NestJS
│
├── prisma/
│   └── schema.prisma           # Modèle de données
│
├── docs/
│   ├── setup/local.md          # Setup local détaillé
│   ├── api/README.md           # Endpoints disponibles
│   ├── runbook/troubleshooting.md # Dépannage
│   └── adr/001-stack.md        # Choix techniques
│
├── package.json
├── tsconfig.json
└── README.md                   # Ce fichier

```

## Documentation associée

| Type | Fichier |
|------|----------|
| 🧭 Setup local | [`docs/setup/local.md`](docs/setup/local.md) |
| 📡 API Endpoints | [`docs/api/README.md`](docs/api/README.md) |
| 🧰 Dépannage (Runbook) | [`docs/runbook/troubleshooting.md`](docs/runbook/troubleshooting.md) |
| 🧩 Décision technique (ADR) | [`docs/adr/001-stack.md`](docs/adr/001-stack.md) |



## Stack technique

| Composant | Usage |
|------------|-------|
| **NestJS** | Framework backend |
| **Prisma** | ORM typé |
| **PostgreSQL** | Base de données |
| **Docker Compose** | Environnement local |
| **TypeScript** | Langage |
