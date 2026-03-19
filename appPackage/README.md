# Teams App Package

Le répertoire contient le template du manifeste Teams et les icônes du bot.

Génération locale:

```bash
npm run package:teams
```

Pré-requis `.env`:

- `BOT_APP_ID`: App ID Azure du bot.
- `PUBLIC_HOSTNAME`: domaine public du tunnel sans protocole.
- `TEAMS_APP_ID`: optionnel, GUID du package Teams. Si non renseigné, `BOT_APP_ID` est réutilisé.

Sortie générée:

- `appPackage/build/manifest.json`
- `appPackage/build/botteams-onboarding-poc.zip`