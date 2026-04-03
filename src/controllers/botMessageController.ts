import { MessageFactory, TurnContext } from "botbuilder";

import { createMentorCard } from "../cards/mentorCard";
import { createWelcomeCard } from "../cards/welcomeCard";
import { appConfig } from "../config";
import { AssignedMission, LocalMissionAssignmentService } from "../services/localMissionAssignmentService";
import { OnboarderDirectoryService } from "../services/onboarderDirectoryService";

export class BotMessageController {
  constructor(
    private readonly missionAssignmentService: LocalMissionAssignmentService,
    private readonly onboarderDirectoryService: OnboarderDirectoryService
  ) {}

  async handleMembersAdded(context: TurnContext): Promise<void> {
    for (const member of context.activity.membersAdded ?? []) {
      if (member.id === context.activity.recipient?.id) {
        continue;
      }

      const userId = this.getUserId(member);
      const displayName = member.name ?? "Utilisateur";
      await this.onboarderDirectoryService.ensureAssignment(userId, displayName);
      const result = await this.missionAssignmentService.ensureAssignments(userId, displayName);

      if (result.firstVisit) {
        await context.sendActivity({ attachments: [createWelcomeCard()] });
      }
    }
  }

  async handleMessage(context: TurnContext): Promise<void> {
    const userId = this.getUserId(context.activity.from);
    const displayName = context.activity.from?.name ?? "Utilisateur";
    await this.onboarderDirectoryService.ensureAssignment(userId, displayName);
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
        await context.sendActivity("Commandes disponibles: `help`, `status`, `ping`, `missions`, `mentor`.");
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
      case "mentor":
        await this.sendMentorCard(context, userId, displayName);
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

  private async sendMentorCard(context: TurnContext, userId: string, displayName: string): Promise<void> {
    const mentor = await this.onboarderDirectoryService.findMentorByUserId(userId, displayName);
    const mentorName = mentor.displayName ?? appConfig.onboarding.defaults.mentorName;
    const mentorEmail = mentor.email ?? appConfig.onboarding.defaults.mentorEmail;

    if (!mentorName || !mentorEmail) {
      await context.sendActivity(`Aucun mentor n'est configure pour ${displayName} pour le moment.`);
      return;
    }

    await context.sendActivity({
      attachments: [
        createMentorCard({
          displayName: mentorName,
          email: mentorEmail,
          tenantId: appConfig.bot.tenantId || undefined
        })
      ]
    });
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