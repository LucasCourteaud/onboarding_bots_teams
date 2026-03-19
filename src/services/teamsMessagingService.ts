import { graphClient } from "../graph/graphClient";
import { PersonProfile } from "../models/onboarding";

export class TeamsMessagingService {
  async createMentorChat(onboardee: PersonProfile, mentor: PersonProfile): Promise<string> {
    const response = await graphClient.api("/chats").post({
      chatType: "group",
      members: [onboardee, mentor].map((member) => ({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: [],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${member.aadUserId}')`
      }))
    });

    return response.id as string;
  }

  async sendChatMessage(chatId: string, message: string): Promise<void> {
    await graphClient.api(`/chats/${chatId}/messages`).post({
      body: {
        contentType: "html",
        content: message
      }
    });
  }

  buildWelcomeMessage(onboardee: PersonProfile, mentor: PersonProfile): string {
    return [
      `<p>Bienvenue <strong>${onboardee.displayName}</strong> chez EPITECH.</p>`,
      `<p>Ton parcours d'onboarding est lancé pour le rôle <strong>${onboardee.role ?? "Non renseigné"}</strong> dans l'équipe <strong>${onboardee.team ?? "Non renseignée"}</strong>.</p>`,
      `<p>Ton mentor est <strong>${mentor.displayName}</strong>. Ce chat servira pour les questions, les points de suivi et les notifications automatiques.</p>`
    ].join("");
  }

  buildTaskCompletionMessage(taskTitle: string): string {
    return `<p>La tâche <strong>${taskTitle}</strong> est terminée. Le bot va débloquer la suite du parcours si nécessaire.</p>`;
  }

  buildReportMessage(summary: string): string {
    return `<p><strong>Compte rendu onboarding</strong></p><p>${summary}</p>`;
  }
}