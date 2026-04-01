# Architecture

## Vue d'ensemble

Le projet suit une separation nette entre transport, logique metier et integrations externes.

```text
src/
├── adapters/
│   └── graph/
├── bot/
├── config/
├── controllers/
├── middlewares/
├── models/
├── routes/
├── services/
└── utils/
```

## Responsabilites

- `adapters/graph`: encapsule tous les appels Microsoft Graph.
- `bot`: expose l'ActivityHandler Teams et delegue la logique aux controllers.
- `config`: charge et structure les variables d'environnement.
- `controllers`: traduit les messages Teams et les requetes HTTP vers les services.
- `middlewares`: centralise la gestion transverse du pipeline HTTP.
- `models`: decrit les contrats de donnees TypeScript du domaine onboarding.
- `routes`: assemble les routes Express a partir des controllers.
- `services`: porte la logique metier, le scheduling, le chargement de catalogue et les workflows.
- `utils`: regroupe les briques techniques reutilisables comme le logger et les erreurs applicatives.

## Patterns utilises

- `Controller`: adaptation du transport HTTP et Teams vers le domaine.
- `Service`: orchestration metier independante du framework.
- `Adapter`: isolation des APIs externes et reduction du couplage a Microsoft Graph.
- `Configuration Object`: projection typée des variables d'environnement via `appConfig`.
- `Error Boundary`: middleware Express unique pour la traduction des erreurs en reponses HTTP.

## Flux principal

1. `src/index.ts` compose les dependances.
2. Les messages Teams arrivent sur `/api/messages` et passent par `TeamsOnboardingBot`.
3. `BotMessageController` applique les commandes du bot et l'attribution locale de missions.
4. Les endpoints `/api/onboarding/*` passent par `OnboardingController`.
5. `OnboardingWorkflowService` orchestre configuration, Planner, reporting et notifications.
6. Les appels a Teams/Planner transitent exclusivement par les adapters Graph.

## Decisions de conception

- La logique metier reste testable sans dependre directement d'Express ni du Bot Framework.
- Les appels Graph ne sont plus disperses dans plusieurs services.
- Le logger est structure via `pino` pour faciliter l'observabilite locale et Azure.
- Le catalogue onboarding est charge depuis un fichier JSON ou YAML via un loader unique.

## Evolutions recommandees

- Remplacer les stockages en memoire par une persistance durable.
- Introduire des tests unitaires autour des controllers et du workflow.
- Ajouter une authentification OAuth utilisateur si des permissions Graph deleguees deviennent necessaires.
- Extraire la composition des dependances dans un conteneur ou une factory si le projet continue de croitre.