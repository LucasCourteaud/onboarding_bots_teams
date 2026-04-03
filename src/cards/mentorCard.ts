import { Attachment, CardFactory } from "botbuilder";

export interface MentorCardData {
  displayName: string;
  email: string;
  tenantId?: string;
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const [firstName = displayName, ...rest] = displayName.trim().split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" ")
  };
}

export function createMentorCard(mentor: MentorCardData): Attachment {
  const { firstName, lastName } = splitDisplayName(mentor.displayName);
  const tenantIdQuery = mentor.tenantId ? `&tenantId=${encodeURIComponent(mentor.tenantId)}` : "";
  const teamsChatUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(mentor.email)}${tenantIdQuery}`;

  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      {
        type: "Container",
        style: "emphasis",
        items: [
          {
            type: "TextBlock",
            text: "Ton mentor",
            color: "Accent",
            weight: "Bolder",
            size: "Small",
            spacing: "None"
          },
          {
            type: "TextBlock",
            text: mentor.displayName,
            weight: "Bolder",
            size: "Large",
            wrap: true,
            spacing: "Small"
          },
          {
            type: "TextBlock",
            text: "Voici la personne a contacter en priorite pour ton accompagnement et tes questions du quotidien.",
            wrap: true,
            spacing: "Medium"
          }
        ]
      },
      {
        type: "FactSet",
        spacing: "Large",
        facts: [
          {
            title: "Prenom",
            value: firstName
          },
          {
            title: "Nom",
            value: lastName || "Non renseigne"
          },
          {
            title: "Mail EPITECH",
            value: mentor.email
          }
        ]
      }
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "Envoyer un message a mon mentor",
        url: teamsChatUrl
      }
    ]
  });
}