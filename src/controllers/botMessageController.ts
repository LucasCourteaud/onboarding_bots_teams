import { MessageFactory, TurnContext } from "botbuilder";

import { createWelcomeCard } from "../cards/welcomeCard";
import { AssignedMission, LocalMissionAssignmentService } from "../services/localMissionAssignmentService";

export class BotMessageController {
  constructor(private readonly missionAssignmentService: LocalMissionAssignmentService) {}

  async handleMembersAdded(context: TurnContext): Promise<void> {
    for (const member of context.activity.membersAdded ?? []) {
      if (member.id === context.activity.recipient?.id) {
        continue;
      }

      const userId = this.getUserId(member);
      const displayName = member.name ?? "Utilisateur";
      const result = await this.missionAssignmentService.ensureAssignments(userId, displayName);

      if (result.firstVisit) {
        await context.sendActivity({ attachments: [createWelcomeCard()] });
      }
    }
  }

  async handleMessage(context: TurnContext): Promise<void> {
    const userId = this.getUserId(context.activity.from);
    const displayName = context.activity.from?.name ?? "Utilisateur";
    const { firstVisit, assignments } = await this.missionAssignmentService.ensureAssignments(userId, displayName);
    const text = TurnContext.removeRecipientMention(context.activity)?.toLowerCase().trim() ?? "";
    const action = this.getSubmittedAction(context);

    if (firstVisit) {
      await context.sendActivity({ attachments: [createWelcomeCard()] });
    }

    if (action === "start_onboarding") {
      await this.handleStartOnboarding(context, userId, assignments);
      return;
    }

    switch (text) {
      case "help":
        await context.sendActivity("Commandes disponibles: `help`, `status`, `ping`, `missions`.");
        return;
      case "status":
        await context.sendActivity("Le bot est actif. Une mission locale par categorie est attribuee au premier contact, et les orchestrations avancees restent disponibles via les endpoints HTTP du POC.");
        return;
      case "ping":
        await context.sendActivity("pong");
        return;
      case "missions":
        await context.sendActivity(this.buildAssignedMissionsMessage(assignments));
        return;
      default:
        await context.sendActivity("Commande non reconnue. Tape `help` pour voir les commandes disponibles.");
    }
  }

  private async handleStartOnboarding(
    context: TurnContext,
    userId: string,
    assignments: AssignedMission[]
  ): Promise<void> {

    const assignedMissions = assignments.length === 0
      ? this.missionAssignmentService.getAssignments(userId)
      : assignments;

    if (assignedMissions.length > 0) {
      await context.sendActivity(this.buildAssignedMissionsMessage(assignedMissions));
    }

    await this.prepareOnboardingStart(userId);
  }

  private buildAssignedMissionsMessage(assignments: AssignedMission[]): string {
    if (assignments.length === 0) {
      return "Aucune mission n'est configuree pour le moment.";
    }

    return [
      "Missions attribuees :",
      ...assignments.map(
        ({ categoryTitle, mission }) => `- ${categoryTitle}: ${mission.title} - ${mission.description}`
      )
    ].join("\n");
  }

  // Placeholder pour le futur branchement du workflow d'onboarding applicatif.
  private async prepareOnboardingStart(_userId: string): Promise<void> {
    return Promise.resolve();
  }

  private getSubmittedAction(context: TurnContext): string | undefined {
    const value = context.activity.value;
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return "action" in value && typeof value.action === "string" ? value.action : undefined;
  }

  private getUserId(account?: { id?: string; aadObjectId?: string }): string {
    return account?.aadObjectId ?? account?.id ?? "unknown-user";
  }
}