# Azure Setup

## Objectif

Ce document decrit la configuration Azure minimale pour executer le bot Microsoft Teams en environnement de developpement et preparer un deploiement plus stable.

## App Registration

Le bot est concu pour une application Microsoft Entra ID configuree en `Single tenant`.

Champs a renseigner dans Azure:

- `Application (client) ID`: valeur injectee dans `BOT_APP_ID`.
- `Directory (tenant) ID`: valeur injectee dans `BOT_APP_TENANT_ID`.
- `Supported account types`: `Accounts in this organizational directory only`.

## Secret client

- Creer un `Client secret` dans `Certificates & secrets`.
- Copier la `Value` du secret au moment de sa creation.
- Stocker cette valeur dans `BOT_APP_PASSWORD`.

Ne jamais versionner le secret dans le depot.

## Azure Bot

Parametres importants du bot Azure:

- `Microsoft App ID`: identique a `BOT_APP_ID`.
- `Tenant ID`: identique au tenant Entra cible.
- `Messaging endpoint`: `https://<host>/api/messages`.
- `Schema transformation version`: `v1.3`.
- `Type`: `Single tenant`.

## Endpoint de developpement local

En developpement, le projet a ete teste avec un tunnel `ngrok` pointant vers le serveur local Node.js.

Exemple de mapping:

- Bot local: `http://localhost:3978`
- Endpoint public configure dans Azure Bot: `https://<ngrok-host>/api/messages`

Pourquoi `ngrok`:

- permet a Azure Bot et Teams d'atteindre un serveur local en HTTPS
- simplifie les demonstrations et les tests rapides

Limites:

- URL instable si le tunnel change
- dependance a la machine du developpeur
- non adapte a une distribution durable dans l'organisation

## Variables d'environnement reliees a Azure

- `BOT_APP_ID`
- `BOT_APP_PASSWORD`
- `BOT_APP_TYPE`
- `BOT_APP_TENANT_ID`
- `PUBLIC_HOSTNAME`
- `TEAMS_APP_ID`

## Recommandations de securite

- Stocker les secrets dans Azure App Service Configuration ou Azure Key Vault.
- Eviter `ngrok` pour un usage organisationnel durable.
- Remplacer le secret client par une `Managed Identity` en production Azure quand c'est possible.
- Verifier que les fichiers `.env` ne sont jamais partages ni commits.