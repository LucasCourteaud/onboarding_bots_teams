# BotTeams Onboarding

Bot Microsoft Teams d'onboarding construit avec Node.js, TypeScript, Bot Framework et Microsoft Graph.

Le projet fournit deux usages complementaires:

- un bot Teams conversationnel pour accueillir l'utilisateur, exposer des commandes simples et attribuer des missions locales
- une API HTTP pour piloter un workflow d'onboarding plus riche avec Teams, Planner et reporting

## Stack technique

- Node.js 20
- TypeScript 5
- Express
- Microsoft Bot Framework
- Microsoft Graph SDK
- Zod pour la validation
- Pino pour le logging structure

## Structure principale

```text
src/
├── adapters/
├── bot/
├── config/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── services/
└── utils/
```

La description detaillee est disponible dans [ARCHITECTURE.md](/home/lucky/Epitech/onboarding_bots_teams/ARCHITECTURE.md).

## Lancement local

```bash
npm install
cp .env.example .env
npm run dev
```

Verification de typage:

```bash
npm run check
```

Generation du package Teams:

```bash
npm run package:teams
```

## Variables d'environnement

Les variables sont validees au demarrage.

### Bot / HTTP

- `PORT`: port HTTP local du serveur Express
- `BOT_APP_ID`: Microsoft App ID du bot Azure
- `BOT_APP_PASSWORD`: valeur du secret client de l'App Registration
- `BOT_APP_TYPE`: `SingleTenant` ou `MultiTenant`
- `BOT_APP_TENANT_ID`: tenant Entra utilise pour un bot single-tenant

### Microsoft Graph

- `GRAPH_TENANT_ID`
- `GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_SECRET`

### Packaging Teams

- `PUBLIC_HOSTNAME`: domaine public sans protocole pour le manifeste Teams
- `TEAMS_APP_ID`: GUID du package Teams, optionnel si identique au bot

### Onboarding / jobs

- `ONBOARDING_CONFIG_PATH`: chemin du catalogue onboarding
- `MAX_ACTIVE_TASKS`: limite de quetes actives simultanees
- `REPORT_CRON`: cron du reporting periodique
- `PLANNER_SYNC_CRON`: cron de synchronisation Planner
- `LOG_LEVEL`: niveau de logs Pino

Un exemple complet est fourni dans [.env.example](/home/lucky/Epitech/onboarding_bots_teams/.env.example).

## Fonctionnalites actuelles

### Bot Teams

- `help`
- `status`
- `ping`
- `missions`

### API HTTP

- `GET /healthz`
- `POST /api/onboarding/start`
- `POST /api/onboarding/sync`
- `POST /api/onboarding/report`

## Distribution Teams

Pour un test local:

1. lancer le serveur avec `npm run dev`
2. exposer le port avec `ngrok http 3978`
3. mettre a jour `PUBLIC_HOSTNAME`
4. regenerer le package Teams
5. importer le zip dans Teams

Pour une distribution organisationnelle, remplace `ngrok` par une URL HTTPS stable et fais publier le package dans le catalogue interne Teams de l'organisation.

## Documentation complementaire

- [ARCHITECTURE.md](/home/lucky/Epitech/onboarding_bots_teams/ARCHITECTURE.md)
- [BOT_FLOW.md](/home/lucky/Epitech/onboarding_bots_teams/BOT_FLOW.md)
- [AZURE_SETUP.md](/home/lucky/Epitech/onboarding_bots_teams/AZURE_SETUP.md)

## Etat du projet

Le projet est structure pour etre facilement etendu, mais certaines briques restent orientees POC:

- stockage en memoire
- dependance aux permissions Graph applicatives pour les fonctions avancees
- absence de tests unitaires automatises

Les fondations sont maintenant pretes pour une evolution vers une architecture plus persistante et un deploiement Azure stable.