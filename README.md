# BotTeams Onboarding

Bot Microsoft Teams d'onboarding construit avec Node.js, TypeScript et Bot Framework.

Le projet fournit deux usages complementaires:

- un bot Teams conversationnel pour accueillir l'utilisateur, exposer des commandes simples et attribuer des missions locales
- une API HTTP pour piloter un workflow d'onboarding plus riche avec notifications, taches locales et reporting

Le runtime principal est maintenant heberge sur Azure App Service. Le flux de test nominal ne repose plus sur `ngrok`, mais sur l'URL HTTPS stable de l'application Azure.

## Stack technique

- Node.js 20
- TypeScript 5
- Express
- Microsoft Bot Framework
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

## Execution

### Environnement principal Azure

Le bot est deploye sur Azure App Service et doit etre teste prioritairement via son endpoint public.

Verifications minimales:

```bash
curl https://<app-service-host>/healthz
```

Le `Messaging endpoint` du bot Azure doit pointer vers:

```text
https://<app-service-host>/api/messages
```

Pour mettre a jour le package Teams apres un changement de domaine ou de version:

```bash
npm run package:teams
```

### Execution locale optionnelle

Le mode local reste possible pour du developpement, mais ce n'est plus le flux principal de validation.

```bash
npm install
cp .env.example .env
npm run dev
```

Verification de typage:

```bash
npm run check
```

## Variables d'environnement

Les variables sont validees au demarrage.

### Bot / HTTP

- `PORT`: port HTTP local du serveur Express
- `BOT_APP_ID`: Microsoft App ID du bot Azure
- `BOT_APP_PASSWORD`: valeur du secret client de l'App Registration
- `BOT_APP_TYPE`: `SingleTenant` ou `MultiTenant`
- `BOT_APP_TENANT_ID`: tenant Entra utilise pour un bot single-tenant

### Packaging Teams

- `PUBLIC_HOSTNAME`: domaine public sans protocole pour le manifeste Teams, typiquement le domaine Azure App Service
- `TEAMS_APP_ID`: GUID du package Teams, optionnel si identique au bot

### Onboarding / jobs

- `ONBOARDING_CONFIG_PATH`: chemin du catalogue onboarding
- `MAX_ACTIVE_TASKS`: limite de quetes actives simultanees
- `REPORT_CRON`: cron du reporting periodique
- `PLANNER_SYNC_CRON`: cron de synchronisation des taches locales
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

Pour une distribution organisationnelle stable:

1. deployer ou mettre a jour le backend sur Azure App Service
2. verifier `GET /healthz` sur l'URL App Service
3. configurer Azure Bot sur `https://<app-service-host>/api/messages`
4. mettre a jour `PUBLIC_HOSTNAME` avec le domaine Azure App Service
5. regenerer le package Teams
6. publier ou reimporter le zip dans Teams

Pour rendre l'application telechargeable par les autres membres de l'organisation, le zip doit ensuite etre publie dans le catalogue interne Teams de l'organisation.

### Test fonctionnel recommande

1. verifier `https://<app-service-host>/healthz`
2. verifier que le bot Azure pointe bien sur `/api/messages`
3. regenerer le package si le domaine ou le manifeste a change
4. ouvrir Teams puis tester `ping`, `help` et `missions`

### Usage local avec tunnel

Le tunnel local n'est utile que pour des tests ponctuels de developpement.

1. lancer le serveur avec `npm run dev`
2. exposer le port avec `ngrok http 3978`
3. mettre temporairement a jour `PUBLIC_HOSTNAME`
4. regenerer le package Teams

Ce mode n'est pas recommande pour un usage partage dans l'organisation.

## Documentation complementaire

- [ARCHITECTURE.md](/home/lucky/Epitech/onboarding_bots_teams/ARCHITECTURE.md)
- [BOT_FLOW.md](/home/lucky/Epitech/onboarding_bots_teams/BOT_FLOW.md)
- [AZURE_SETUP.md](/home/lucky/Epitech/onboarding_bots_teams/AZURE_SETUP.md)

## Etat du projet

Le projet est structure pour etre facilement etendu, mais certaines briques restent orientees POC:

- stockage en memoire
- notifications et taches avancees simulees localement
- absence de tests unitaires automatises

Les fondations sont maintenant pretes pour une evolution vers une architecture plus persistante autour d'un hebergement Azure stable.