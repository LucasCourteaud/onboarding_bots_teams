# Bot Flow

## Capacites actuelles

Le bot supporte un usage personnel Teams et des endpoints HTTP de pilotage onboarding.

Commandes conversationnelles actuelles:

- `help`
- `status`
- `ping`
- `missions`

## Cycle de vie des messages Teams

1. Teams envoie un evenement au endpoint `/api/messages`.
2. `BotFrameworkAdapter` valide la requete et cree le contexte de conversation.
3. `TeamsOnboardingBot` delegue le traitement a `BotMessageController`.
4. Le controller detecte le premier contact utilisateur.
5. Si c'est la premiere interaction, une mission locale par categorie est attribuee depuis le catalogue.
6. Le bot envoie un message de bienvenue avec la synthese des missions.
7. Les commandes utilisateur sont resolues et une reponse textuelle ou une card est renvoyee.

## Evenements pris en charge

### `message`

- Attribution locale si l'utilisateur n'a pas encore de missions.
- Routage vers les commandes connues.
- Retour d'une erreur fonctionnelle simple si la commande est inconnue.

### `conversationUpdate` / `membersAdded`

- Detection de l'arrivee d'un nouvel utilisateur dans le chat.
- Attribution initiale des missions locales.
- Envoi du message de bienvenue si c'est le premier contact.

## Flow HTTP onboarding

### `POST /api/onboarding/start`

- Valide le payload.
- Charge le catalogue.
- Cree un chat mentor/onboarde via l'adapter local.
- Cree les taches initiales dans le stockage local.
- Enregistre l'etat onboarding en memoire.

### `POST /api/onboarding/sync`

- Relit les taches locales completees.
- Met a jour l'etat onboarding.
- Debloque des missions quand le seuil de quetes est atteint.

### `POST /api/onboarding/report`

- Construit un resume de progression.
- Envoie le reporting au manager via Teams.

## Scheduling

- `PLANNER_SYNC_CRON`: maintien des quetes actives et debloquage de missions.
- `REPORT_CRON`: emission periodique du reporting manager.

## Limites actuelles

- Les attributions locales et les etats onboarding sont volatiles.
- Les chats et taches de workflow restent simules localement.
- Le bot ne declenche pas encore tout le workflow onboarding depuis le chat Teams seul.