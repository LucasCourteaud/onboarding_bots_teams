import { TeamsChatGateway } from "../adapters/local/localTeamsChatGateway";
import { PersonProfile } from "../models/onboarding";

export class TeamsMessagingService {
  constructor(private readonly teamsChatGateway: TeamsChatGateway) {}

  async createMentorChat(onboardee: PersonProfile, mentor: PersonProfile): Promise<string> {
    return this.teamsChatGateway.createChat([onboardee, mentor]);
  }

  async sendChatMessage(chatId: string, message: string): Promise<void> {
    await this.teamsChatGateway.sendMessage(chatId, message);
  }

  buildWelcomeMessage(onboardee: PersonProfile, mentor: PersonProfile): string {
    return [
      `<p>Bienvenue <strong>${onboardee.displayName}</strong> chez EPITECH.</p>`,
      `<p>Ton parcours d'onboarding est lancé pour le rôle <strong>${onboardee.role ?? "Non renseigné"}</strong> dans l'équipe <strong>${onboardee.team ?? "Non renseignée"}</strong>.</p>`,
      `<p>Ton mentor est <strong>${mentor.displayName}</strong>. Ce chat servira pour les questions, les points de suivi et les notifications automatiques.</p>`
    ].join("");
  }

  createDirectChat(person1: PersonProfile, person2: PersonProfile): Promise<string> {
    return this.teamsChatGateway.createChat([person1, person2]);
  }

  buildTaskCompletionMessage(taskTitle: string): string {
    return `<p>La tâche <strong>${taskTitle}</strong> est terminée. Le bot va débloquer la suite du parcours si nécessaire.</p>`;
  }

  buildMissionUnlockedMessage(missionTitle: string, categoryTitle: string, requiredCount: number): string {
    return [
      `<p>Nouvelle mission débloquée: <strong>${missionTitle}</strong>.</p>`,
      `<p>Elle devient disponible après la validation de ${requiredCount} quêtes dans la catégorie <strong>${categoryTitle}</strong>.</p>`
    ].join("");
  }

  buildReportMessage(summary: string): string {
    return `<p><strong>Compte rendu onboarding</strong></p><p>${summary}</p>`;
  }
}
