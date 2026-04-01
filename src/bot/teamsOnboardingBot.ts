import { ActivityHandler, CardFactory, MessageFactory, TurnContext } from "botbuilder";

import { AssignedMission, LocalMissionAssignmentService } from "../services/localMissionAssignmentService";

export class TeamsOnboardingBot extends ActivityHandler {
  constructor(private readonly missionAssignmentService: LocalMissionAssignmentService) {
    super();

    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded ?? []) {
        if (member.id === context.activity.recipient?.id) {
          continue;
        }

        const userId = this.getUserId(member);
        const displayName = member.name ?? "Utilisateur";
        const result = await this.missionAssignmentService.ensureAssignments(userId, displayName);

        if (result.firstVisit) {
          await context.sendActivity(this.buildWelcomeActivity(displayName, result.assignments));
        }
      }

      await next();
    });
  }

  private async handleMessage(context: TurnContext): Promise<void> {
    const userId = this.getUserId(context.activity.from);
    const displayName = context.activity.from?.name ?? "Utilisateur";
    const { firstVisit, assignments } = await this.missionAssignmentService.ensureAssignments(userId, displayName);
    const text = TurnContext.removeRecipientMention(context.activity)?.toLowerCase().trim() ?? "";

    if (firstVisit) {
      await context.sendActivity(this.buildWelcomeActivity(displayName, assignments));
    }

    if (text.includes("help")) {
      await context.sendActivity("Commandes disponibles: `help`, `status`, `ping`, `missions`.");
      return;
    }

    if (text.includes("status")) {
      await context.sendActivity("Le bot est actif. Une mission locale par catégorie est attribuée au premier contact, et les orchestrations avancées restent disponibles via les endpoints HTTP du POC.");
      return;
    }

    if (text.includes("ping")) {
      await context.sendActivity("pong");
      return;
    }

    if (text.includes("missions")) {
      await context.sendActivity(this.buildAssignedMissionsMessage(assignments));
      return;
    }

    await context.sendActivity("Commande non reconnue. Tape `help` pour voir les commandes disponibles.");
  }

  private buildWelcomeActivity(displayName: string, assignments: AssignedMission[]) {
    const assignmentSummary = assignments.length === 0
      ? "Aucune mission n'est configuree pour le moment."
      : assignments.map(({ categoryTitle, mission }) => `${categoryTitle}: ${mission.title}`).join("\n");

    return MessageFactory.attachment(
      CardFactory.heroCard(
        "BotTeams Onboarding",
        `${displayName}, bienvenue. Je t'ai attribue une mission locale par categorie pour demarrer ton parcours.\n`
      )
    );
  }

  private buildAssignedMissionsMessage(assignments: AssignedMission[]): string {
    if (assignments.length === 0) {
      return "Aucune mission n'est configuree pour le moment.";
    }

    return [
      "Missions attribuees :",
      ...assignments.map(
        ({ categoryTitle, mission }) =>
          `- ${categoryTitle}: ${mission.title} - ${mission.description}`
      )
    ].join("\n");
  }

  private getUserId(account?: { id?: string; aadObjectId?: string }): string {
    return account?.aadObjectId ?? account?.id ?? "unknown-user";
  }
}