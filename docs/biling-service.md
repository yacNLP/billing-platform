# Billing Service — Documentation

## 1. Contexte & objectifs
<!-- Présentation du service, rôle dans la plateforme biling, vision B2B -->

### 1.1 Contexte produit

biling-platform est une plateforme **SaaS B2B** de gestion d’abonnements et de facturation.  
Des entreprises s’y connectent pour gérer leurs propres clients, leurs offres et leurs revenus récurrents.

Le **Billing Service** est le backend chargé de :
- centraliser les données de facturation (customers, products, plans) ;
- exposer une API REST consommable par le frontend et d’autres services ;
- préparer le terrain pour la gestion des abonnements, factures et paiements.

Il est développé avec **NestJS**, **Prisma** et **PostgreSQL**, et tourne en local via **Docker Compose** dans le cadre du MVP.

### 1.2 Public cible

Le Billing Service est utilisé par :

- Les **clients internes** : équipes frontend, outils internes (back-office, scripts).
- Les **clients finaux indirectement** : via l’application qui consomme cette API.
- Les **DevOps / Ops** : pour le déploiement et la supervision (healthchecks, logs, etc.).



## 2. Périmètre du MVP

Le MVP du Billing Service couvre uniquement les fondations nécessaires pour gérer des données de facturation de base : clients, produits et plans d’abonnement.  
Il s’agit de poser une base solide avant d’introduire les abonnements, la facturation et les paiements.

### 2.1 Fonctionnalités incluses

- **Customers**
  - CRUD complet
  - Validation basique (name, email unique)
  - Pagination et recherche simple

- **Products**
  - CRUD complet
  - SKU unique
  - Champs essentiels : prix, devise, stock, TVA
  - Filtres : actif/inactif, prix min/max, recherche (name/sku), tri complet
  - Pagination standard

- **Plans**
  - CRUD complet
  - Modèle d’abonnement : amount, interval, intervalCount, trialDays
  - Rattaché obligatoirement à un Product
  - Soft delete (`deletedAt`)
  - Filtres : active, currency, search (code/name), tri
  - Pagination standard

### 2.2 Hors périmètre (prévu plus tard)

Les éléments ci-dessous ne font pas partie du MVP mais arriveront dans les versions suivantes :

- **Subscriptions** (gestion des abonnements actifs)
- **Invoices** (génération et historique des factures)
- **Payments** (intégration passerelle de paiement)
- **Coupons & taxes avancées**
- **Gestion des utilisateurs + rôles (Admin / Client)**
- **Audit logs / Historique d’évènements**
- **Multi-tenancy avancé** (plusieurs comptes isolés)

---

## 3. Architecture générale

### 3.1 Structure du backend

Le Billing Service est une application **NestJS monolithique modulaire**.  
Chaque domaine fonctionnel est isolé dans un module :

- `customers/`
- `products/`
- `plans/`
- `common/` (DTO génériques, helpers)
- `prisma/` (PrismaService, seed, migrations)

Chaque module suit la structure standard :

- `controller` — exposition HTTP (REST)
- `service` — logique métier
- `repository` via Prisma (accès DB et requêtes)
- `dto` — validation entrante / sortante

Ce modèle est stable, simple et adapté pour un MVP.

### 3.2 Technologies utilisées

- **NestJS** — structure du backend, modules, pipes, validation
- **Prisma ORM** — accès à PostgreSQL, migrations, schéma typé
- **PostgreSQL** — base de données principale
- **Docker Compose** — pour lancer et isoler la DB en local
- **TypeScript** — langage principal
- **class-validator** — validation des DTO
- **supertest / Jest** — tests end-to-end et unitaires

### 3.3 Décisions techniques globales

- **Monolithe modulaire** plutôt que microservices (plus simple, moins de complexité pour un MVP).
- **Soft delete** uniquement sur les Plans (`deletedAt`).
- **Hard delete** pour Customers et Products.
- **Pagination / tri / filtres standardisés** (DTO commun + variations par module).
- **Validation centralisée** via `ValidationPipe` global.
- **Gestion des erreurs** via codes HTTP cohérents (400/404/409).
- **DTO stricts** : tout input est validé avant traitement.

### 3.4 Diagramme d’architecture (textuel)

Structure simplifiée de l’application :
[Frontend / Admin (futur)]   → ce qui consomme l’API (UI)
        |
        v
[Billing Service - NestJS]   → ton backend
   |      |       |
   v      v       v
Customers  Products  Plans   → les modules internes (controllers/services)
        \     |     /
         \    |    /
          \   |   /
             Prisma ORM      → l’ORM (Prisma) qui sert d’interface avec la DB
                 |
                 v
          PostgreSQL (Docker) → la base de données


## 4. Modèle métier (Domain Model)

Le Billing Service gère trois entités principales dans le MVP :  
**Customer**, **Product**, et **Plan**.  
Ces entités représentent le noyau du système de facturation.

---

### 4.1 Entités principales

#### **Customer**
Représente un client final d'une entreprise utilisant biling.  
Exemples : “ACME Corp”, “Alice Dupont”.

Champs clés :
- Identité (name, email)
- Dates de création / mise à jour

#### **Product**
Représente un élément vendable : un service ou un article.  
C’est la base commerciale.

Champs clés :
- Nom, SKU unique
- Prix en centimes
- Devise
- Stock
- TVA
- Actif / inactif

#### **Plan**
Représente une **offre d’abonnement** rattachée à un Product.  
Exemples : “Basic Monthly”, “Annual Premium”.

Champs clés :
- Code unique
- Tarif (amount + currency)
- Intervalle (month/year + intervalCount)
- Jours d’essai
- Actif / inactif
- Soft delete (deletedAt)

---


### 4.2 Relations entre les entités

- Un **Product** peut avoir plusieurs **Plans** (Product (1) ─── (N) Plan).  
- Un **Plan** appartient toujours à un **Product**.   (Plan (1) ---- (1) Product)
    - Plan (1) ─── (N) Subscription (futur)
- Un **Customer** pourra avoir des **Subscriptions**  (Customer (1) ─── (N) Subscription (futur)) .   


### 4.3 Règles métier globales

- Un Product doit avoir un **SKU unique**.
- Un Plan doit avoir un **code unique**.
- Un Plan ne peut pas exister sans Product (`productId` obligatoire).
- Les Plans utilisent **soft delete** (`deletedAt`).
- Customers et Products utilisent **hard delete**.
- Les entités ont un champ `active` permettant de les désactiver (sans suppression).
- La devise principale du MVP est **EUR**.
- Les champs monétaires sont exprimés en **centimes** (`amount`, `priceCents`).

---


### 4.4 Diagramme textuel du domaine
<!-- Petit schéma ASCII clair -->


---

## 5. API du Billing Service

L’API du Billing Service suit une structure REST simple, versionnée, cohérente entre modules et basée sur des conventions communes : JSON, validation DTO, pagination standard, filtres et tri.

---

### 5.1 Conventions générales API

- **Format** : toutes les réponses sont au format **JSON**.  
- **Versionning** : pour le moment, l’API est exposée sous `/` (pas encore de `/v1` → prévu plus tard).  
- **Validation** : toutes les entrées passent par des DTO stricts (class-validator).  
- **Erreurs standardisées** :  
  - `400` = erreur de validation  
  - `404` = ressource introuvable  
  - `409` = contrainte unique / conflit métier  
- **Horodatage** : les dates sont retournées en **ISO 8601**.

---

### 5.2 Pagination, tri et filtres

La majorité des endpoints de listing utilisent une structure commune :

- `page` : numéro de page (défaut : 1)
- `pageSize` : taille de page (défaut : 20)
- `sortBy` : champ autorisé selon le module
- `order` : `asc` / `desc`
- Filtres spécifiques :  
  - `search` (Customers)  
  - `q`, `minPriceCents`, `maxPriceCents`, `isActive` (Products)  
  - `search`, `active`, `currency` (Plans)

Toutes les réponses de type liste suivent :

```ts
interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### 5.3 Endpoints par module (vue synthétique)

#### 5.3.1 Customers
- GET /customers
- POST /customers
- GET /customers/:id
- PATCH /customers/:id
- DELETE /customers/:id

#### 5.3.2 Products
- GET /products
- POST /products
- GET /products/:id
- PATCH /products/:id
- DELETE /products/:id

#### 5.3.3 Plans
- GET /plans
- POST /plans
- GET /plans/:id
- PATCH /plans/:id
- DELETE /plans/:id

---

## 6. Configuration & Exécution

### 6.1 Variables d’environnement

Les principales variables utilisées par le Billing Service :

- `DATABASE_URL` : URL de connexion PostgreSQL (incluant user, mot de passe, host, port, base).
- `PORT` : port HTTP exposé par l’API (par défaut : 3000).
- `NODE_ENV` : environnement d’exécution (`development`, `production`, etc.).

### 6.2 Commandes utiles

Depuis le dossier `billing-service` :

- Installation des dépendances :
  ```bash
  npm install
  ```

- Lancer les migrations Prisma : 
  ```
  npx prisma migrate dev --name init
  ```
- Lancer l’application en développement :
  ```
  npm run start:dev
  ```
## 7. Tests & Qualité
Le Billing Service inclut des tests destinés à garantir la stabilité du MVP.  
L’objectif n’est pas une couverture exhaustive, mais de valider les comportements critiques.

---

### 7.1 Types de tests

- **Unit tests**
  - Testent la logique métier isolée (services, helpers).
  - Utilisent Jest.
  - Ne touchent pas la base de données.

- **End-to-End (e2e) tests**
  - Testent les endpoints REST réels.
  - Bootent une instance NestJS complète en mémoire.
  - Interagissent avec une base test via Prisma.

---

### 7.2 Exécution des tests

- **Lancer tous les tests**
  ```
  npm run test
  ```
- **Tests e2e uniquement**
  ```
  npm run test:e2e
  ```

### 7.3 Critères de qualité internes
<!-- ce qu'on doit tester pour valider une feature -->

Pour chaque module (Customers, Products, Plans), le MVP requiert au minimum :
- 1 test e2e pour POST (validation + conflit unique)
- 1 test e2e pour GET /:id (success + 404)
- 1 test e2e pour listing (pagination minimale)
- 1 test e2e pour DELETE (success + 404)
    - 409 pour Products et Plans selon les règles métier

Objectif :
Valider le comportement métier essentiel, pas couvrir tout le code.

---

## 8. Roadmap courte
Les prochaines versions du Billing Service étendront la logique métier au-delà du simple catalogue (Customers / Products / Plans) pour couvrir l’ensemble du cycle de facturation.

---

### 8.1 Subscriptions (prochaine étape majeure)

- Création et gestion des abonnements clients.
- Lien Customer → Plan.
- Gestion de l’état (active, annulée, expirée…).
- Validation supplémentaire avant suppression de Plans ou Products.
- Début du cycle de facturation.

---

### 8.2 Invoices

- Génération automatique à partir des subscriptions.
- Historique des factures.
- Statuts : draft, pending, paid, failed.
- Exposition via API REST.

---

### 8.3 Payments

- Intégration future d’une passerelle de paiement (Stripe ou autre).
- Création des intents de paiement.
- Webhooks pour synchronisation des statuts.

---

### 8.4 Authentification & rôles

- Ajout d’un module `auth` (JWT).
- Séparation des accès : Admin / Client.
- Validation avancée des permissions.

---

### 8.5 Multi-tenancy

- Isolation des données par organisation.
- Ajout d’un champ `tenantId` sur les entités principales.
- Filtrage automatique par tenant dans Prisma.

---

### 8.6 Autres évolutions prévues

- Coupons, remises et taxes avancées.
- Webhooks internes (évènements domain-driven).
- Audit logs.
- Monitoring (healthcheck, logs structurés, métriques Prometheus).

---

# ANNEXES

## Annexe A — Customers (Détails)
<!-- Modèle Prisma, DTO, endpoints détaillés, erreurs, règles spécifiques -->


### Modèle de données (Prisma) :

```prisma
model Customer {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt 
}
```

### API REST

#### Vue d’ensemble

| Méthode | URL               | Description                             |
|---------|--------------------|-----------------------------------------|
| GET     | /customers         | Lister les customers (avec pagination)  |
| GET     | /customers/:id     | Récupérer un customer par son id        |
| POST    | /customers         | Créer un nouveau customer               |
| PATCH   | /customers/:id     | Mettre à jour un customer               |
| DELETE  | /customers/:id     | Supprimer un customer                   |

Les réponses utilisent un DTO de base :
```
interface CustomerDto {
  id: number;
  name: string;
  email: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```
Et pour les listes paginées :

```
interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```
##### Filtres et tri actuellement implémentés

Le listing `/customers` supporte déjà :

- **Pagination**
  - `page`
  - `pageSize`

- **Tri**
  - `sortBy` : champ autorisé (`id`, `name`, `email`, `createdAt`)
  - `order` : `asc` ou `desc`

- **Recherche textuelle**
  - `search` : filtre sur `name` ou `email` (contient la chaîne)

Exemples :
- `GET /customers?page=1&pageSize=20`
- `GET /customers?search=alice`
- `GET /customers?sortBy=createdAt&order=desc`



#### Détail des endpoints

---

**GET /customers**

**Query params :**
- `page` (optionnel, défaut : 1)
- `pageSize` (optionnel, défaut : 10 ou 20)
- `search` (optionnel) — filtre sur `name` ou `email`
- `sortBy` (optionnel) — champs autorisés : `id`, `name`, `email`, `createdAt`
- `order` (optionnel) — `asc` ou `desc`
- autres filtres possibles (extensions futures)

**Réponse 200 :**  
`Paginated<Customer>`

---

 **GET /customers/:id**

**Path param :**
- `id` (number)

**Réponse 200 :**  
`Customer`

**Erreurs possibles :**
- **404** : customer inexistant

---

 **POST /customers**

**Body (CreateCustomerDto) :**
- `name` (string, obligatoire)
- `email` (string, obligatoire, format email)

**Réponse 201 :**  
`Customer`

**Erreurs possibles :**
- **400** : DTO invalide (email mal formé, name vide…)
- **409** : email déjà utilisé (contrainte unique)

---

 **PATCH /customers/:id**

**Path param :**
- `id`

**Body (UpdateCustomerDto) :**
- `name` (optionnel)
- `email` (optionnel, format email)

**Réponse 200 :**  
`Customer` mis à jour

**Erreurs possibles :**
- **400** : validation DTO
- **404** : customer non trouvé
- **409** : email utilisé par un autre customer

---

 **DELETE /customers/:id**

**Path param :**
- `id`

**Réponse 204 :**  
Aucun contenu

**Erreurs possibles :**
- **404** : customer non trouvé


## Annexe B — Products

### Modèle de données (Prisma)

```prisma
model Product {
  id                Int      @id @default(autoincrement())
  name              String
  sku               String   @unique
  description       String?  @db.Text
  priceCents        Int
  currency          String   @default("EUR")
  taxRate           Decimal  @default(0.20) @db.Decimal(5, 4)
  isActive          Boolean  @default(true)
  stock             Int      @default(0)
  lowStockThreshold Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([name])
  @@index([isActive])

  plans Plan[]
}
```


### Query params — GET /products

 **Pagination** (hérité du PaginationDto)
- `page` — défaut : `1`
- `pageSize` — défaut : `20`

 **Recherche textuelle**
- `q` — recherche sur `name` ou `sku`

 **Tri**
- `sortBy` ∈ `name`, `priceCents`, `createdAt`, `updatedAt`, `stock`, `sku`
- `order` ∈ `asc` / `desc` (défaut : `desc`)

 **Filtres prix**
- `minPriceCents`
- `maxPriceCents`

 **Filtre état**
- `isActive` ∈ `true` / `false`

---

### Détail des endpoints

**GET /products**

Retourne une liste **paginée + filtrée + triée**.

**Réponse :**
```ts
Paginated<Product>
```

**GET /products/:id** : Retourne un produit par son ID.

**Erreurs** : 404 — produit introuvable

**POST /products** 
Body typique :
```
{
  name: string;
  sku: string;               // unique
  priceCents: number;        // ≥ 0
  description?: string;
  stock: number;             // ≥ 0
  currency?: string;         // défaut "EUR"
  taxRate?: number;
  lowStockThreshold?: number;
}

```

**Erreurs** :
- 400 — validation échouée
- 409 — sku déjà utilisé

**PATCH /products/:id**

Met à jour un produit.

Les mêmes contraintes métier que pour `POST` sont appliquées.

**Erreurs possibles :**
- **404** — produit introuvable  
- **409** — conflit de `sku`

---

**DELETE /products/:id**

Suppression refusée si le produit est référencé par un ou plusieurs plans.

**Réponses possibles :**
- **204** — supprimé avec succès  
- **409** — le produit possède des plans → suppression interdite  
- **404** — produit introuvable  

---



## Annexe C — Plans

### Modèle de données (Prisma)

```prisma
model Plan {
  id             Int              @id @default(autoincrement())
  code           String           @unique // human-readable unique code (e.g. PRO_MONTHLY)
  name           String           // display name
  description    String?
  productId      Int              // FK to Product
  product        Product          @relation(fields: [productId], references: [id])

  // Pricing
  amount         Int              // amount in minor units (cents)
  currency       String           @db.VarChar(3) // ISO code (e.g. EUR, USD)

  // Billing cadence
  interval       BillingInterval  // month, year, etc.
  intervalCount  Int              @default(1) // e.g. every 1 month, every 12 months

  // Trial
  trialDays      Int              @default(0) // 0 = no trial

  // Lifecycle
  active         Boolean          @default(true) // plan can be toggled off
  metadata       Json?

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  deletedAt      DateTime?

  @@index([productId])
  @@index([active])
}
```
---

### Query params — GET /plans

**Pagination**
- `page` — défaut : 1
- `pageSize` — défaut : 20

**Recherche textuelle**
- `search` — recherche sur `code` ou `name` (case-insensitive)

**Tri**
- `sort` ∈ `id`, `code`, `name`, `amount`, `createdAt`
- `order` ∈ `asc` / `desc` (défaut : `asc`)

**Filtres**
- `active` ∈ `true` / `false`
- `currency` — filtre exact (ex. `EUR`)

---

### Détail des endpoints

**GET /plans**

Retourne une liste **paginée**, filtrée et triée, contenant uniquement les plans **non soft-deleted**.

**Réponse :**
```ts
interface PlanListResponse {
  data: Plan[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```
---

**GET /plans/:id**

Retourne un plan par ID **s’il n’est pas soft-deleted**.

**Erreurs possibles :**
- **404** — introuvable ou soft-deleted

---

**POST /plans**

**Body typique :**
```ts
{
  code: string;            // obligatoire, unique
  name: string;            // obligatoire
  description?: string;
  productId: number;       // obligatoire, doit référencer un Product existant
  amount: number;          // ≥ 0
  currency: string;        // ex : "EUR"
  interval: string;        // ex : "month", "year"
  intervalCount?: number;  // ≥ 1, défaut : 1
  trialDays?: number;      // ≥ 0, défaut : 0
  active?: boolean;        // défaut : true
  metadata?: Record<string, any>;
}
```

**Erreurs possibles — POST /plans**

- **400** — DTO invalide (champs manquants, mauvais types)
- **404** — `productId` ne correspond à aucun produit
- **409** — `code` déjà utilisé

---

**PATCH /plans/:id**

Met à jour les champs **modifiables** :

- name  
- description  
- amount  
- currency  
- interval  
- intervalCount  
- trialDays  
- active  
- metadata  

> **Note :** `productId` ne se modifie pas (règle métier). Le champ `code` est immuable après création.

**Erreurs possibles :**
- **404** — plan introuvable ou soft-deleted    
    


---

**DELETE /plans/:id**

Effectue un **soft delete** :

- remplit `deletedAt`
- exclu automatiquement des `GET /plans`  
  (filtre : `deletedAt = null`)

**Erreurs possibles :**
- **404** — plan introuvable ou déjà soft-deleted  
- **409** — *(futur)* plan lié à des subscriptions actives  

---