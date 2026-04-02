import { Attachment, CardFactory } from "botbuilder";

const welcomeCardPayload = {
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.4",
  body: [
    {
      type: "Container",
      style: "emphasis",
      bleed: true,
      items: [
        {
          type: "TextBlock",
          text: "EPITECH",
          color: "Accent",
          weight: "Bolder",
          size: "Small",
          spacing: "None"
        },
        {
          type: "TextBlock",
          text: "Bienvenue chez EPITECH 🚀",
          weight: "Bolder",
          size: "ExtraLarge",
          wrap: true,
          spacing: "Small"
        },
        {
          type: "TextBlock",
          text: "onboarding",
          isSubtle: true,
          spacing: "None",
          wrap: true
        },
        {
          type: "TextBlock",
          text: "Ton parcours commence ici. Le bot va t'aider a structurer tes premieres etapes, comprendre les bons outils et lancer tes premieres missions rapidement.",
          wrap: true,
          spacing: "Medium"
        }
      ]
    },
    {
      type: "Container",
      spacing: "Large",
      items: [
        {
          type: "TextBlock",
          text: "Ton parcours en 3 etapes",
          weight: "Bolder",
          size: "Medium",
          wrap: true
        },
        {
          type: "ColumnSet",
          spacing: "Medium",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "Container",
                  style: "accent",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🤝",
                      size: "Large",
                      horizontalAlignment: "Center"
                    },
                    {
                      type: "TextBlock",
                      text: "Rencontre avec ton mentor",
                      weight: "Bolder",
                      wrap: true,
                      horizontalAlignment: "Center"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "Container",
                  style: "good",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🧰",
                      size: "Large",
                      horizontalAlignment: "Center"
                    },
                    {
                      type: "TextBlock",
                      text: "Decouverte des outils",
                      weight: "Bolder",
                      wrap: true,
                      horizontalAlignment: "Center"
                    }
                  ]
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "Container",
                  style: "attention",
                  items: [
                    {
                      type: "TextBlock",
                      text: "🎯",
                      size: "Large",
                      horizontalAlignment: "Center"
                    },
                    {
                      type: "TextBlock",
                      text: "Premieres missions",
                      weight: "Bolder",
                      wrap: true,
                      horizontalAlignment: "Center"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "Container",
      style: "default",
      spacing: "Large",
      items: [
        {
          type: "TextBlock",
          text: "Ce que tu vas trouver ici",
          weight: "Bolder",
          size: "Medium",
          wrap: true
        },
        {
          type: "FactSet",
          spacing: "Medium",
          facts: [
            {
              title: "📍",
              value: "Un point de depart clair pour ton onboarding"
            },
            {
              title: "🗂️",
              value: "Des missions structurees par categorie"
            },
            {
              title: "✅",
              value: "Un suivi simple de ta progression"
            }
          ]
        }
      ]
    }
  ],
  actions: [
    {
      type: "Action.Submit",
      title: "Demarrer mon onboarding",
      data: {
        action: "start_onboarding"
      }
    }
  ]
} as const;

export function createWelcomeCard(): Attachment {
  return CardFactory.adaptiveCard(welcomeCardPayload);
}

export function getWelcomeCardPayload(): typeof welcomeCardPayload {
  return welcomeCardPayload;
}