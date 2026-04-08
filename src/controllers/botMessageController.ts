import { TurnContext } from "botbuilder";

import { createMentorCard } from "../cards/mentorCard";
import { createWelcomeCard } from "../cards/welcomeCard";
import { appConfig } from "../config";
import { OnboardingMissionDefinition, OnboardingRequest, PersonProfile } from "../models/onboarding";
import { OnboarderDirectoryService } from "../services/onboarderDirectoryService";
import { OnboardingConfigLoader } from "../services/onboardingConfigLoader";
import { OnboardingWorkflowService } from "../services/onboardingWorkflowService";

export class BotMessageController {
  constructor(
    private readonly workflow: OnboardingWorkflowService,
    private readonly onboarderDirectoryService: OnboarderDirectoryService,
    private readonly configLoader: OnboardingConfigLoader
  ) {}

  async handleMembersAdded(context: TurnContext): Promise<void> {
    for (const member of context.activity.membersAdded ?? []) {
      if (member.id === context.activity.recipient?.id) {
        continue;
      }

      const userId = this.getUserId(member);
      const displayName = member.name ?? "Utilisateur";
      await this.onboarderDirectoryService.ensureAssignment(userId, displayName);

      if (!this.workflow.getState(this.buildOnboardingId(userId))) {
        await context.sendActivity({ attachments: [createWelcomeCard()] });
      }
    }
  }

  async handleMessage(context: TurnContext): Promise<void> {
    const userId = this.getUserId(context.activity.from);
    const displayName = context.activity.from?.name ?? "Utilisateur";
    await this.onboarderDirectoryService.ensureAssignment(userId, displayName);
    const text = TurnContext.removeRecipientMention(context.activity)?.toLowerCase().trim() ?? "";
    const action = this.getSubmittedAction(context);

    if (action === "start_onboarding") {
      await this.handleStartOnboarding(context);
      return;
    }

    switch (text) {
      case "help":
        await context.sendActivity("Commandes disponibles: `help`, `status`, `ping`, `missions`, `mentor`.");
        return;
      case "status":
        await context.sendActivity(await this.buildStatusMessage(userId));
        return;
      case "ping":
        await context.sendActivity("pong");
        return;
      case "missions":
        await context.sendActivity(await this.buildUnlockedMissionsMessage(userId));
        return;
      case "mentor":
        await this.sendMentorCard(context, userId, displayName);
        return;
      default:
        await context.sendActivity("Commande non reconnue. Tape `help` pour voir les commandes disponibles.");
    }
  }

  private async handleStartOnboarding(context: TurnContext): Promise<void> {
    const request = await this.buildOnboardingRequest(context);
    const existingState = this.workflow.getState(request.onboardingId);

    if (existingState) {
      await context.sendActivity(
        [
          "Ton onboarding est deja demarre.",
          await this.buildQuestSummary(existingState.activeQuestIds),
          await this.buildUnlockedMissionsMessage(this.getUserId(context.activity.from))
        ].join("\n\n")
      );
      return;
    }

    const result = await this.workflow.start(request);
    await context.sendActivity(
      [
        "Ton onboarding est demarre.",
        `Un chat mentor a ete prepare avec l'identifiant \`${result.chatId}\`.`,
        await this.buildQuestSummary(result.createdTasks.map((task) => task.definitionId ?? task.title)),
        "Aucune mission n'est debloquee pour le moment. Termine tes premieres quetes pour en ouvrir."
      ].join("\n\n")
    );
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

  private async buildStatusMessage(userId: string): Promise<string> {
    const state = this.workflow.getState(this.buildOnboardingId(userId));
    if (!state) {
      return "Le bot est actif. Ton onboarding n'est pas encore demarre. Utilise le bouton de bienvenue pour lancer le parcours.";
    }

    return [
      `Onboarding actif pour ${state.onboardee.displayName}.`,
      `Quetes en cours: ${state.activeQuestIds.length}.`,
      `Quetes completees: ${state.completedQuestIds.length}.`,
      `Missions debloquees: ${state.unlockedMissionIds.length}.`
    ].join(" ");
  }

  private async buildUnlockedMissionsMessage(userId: string): Promise<string> {
    const state = this.workflow.getState(this.buildOnboardingId(userId));
    if (!state) {
      return "Ton onboarding n'est pas encore demarre. Lance-le pour suivre tes quetes et debloquer des missions.";
    }

    if (state.unlockedMissionIds.length === 0) {
      return "Aucune mission debloquee pour le moment. Continue tes quetes actives pour ouvrir la suite du parcours.";
    }

    const missions = await this.configLoader.flattenMissions();
    const unlocked = state.unlockedMissionIds
      .map((missionId) => missions.find((mission) => mission.id === missionId))
      .filter((mission): mission is OnboardingMissionDefinition => Boolean(mission));

    if (unlocked.length === 0) {
      return "Des missions sont marquees comme debloquees, mais leur definition est introuvable dans la configuration.";
    }

    return [
      "Missions debloquees :",
      ...unlocked.map((mission) => `- ${mission.title}: ${mission.description}`)
    ].join("\n");
  }

  private async buildQuestSummary(questIdsOrTitles: string[]): Promise<string> {
    if (questIdsOrTitles.length === 0) {
      return "Aucune quete active pour le moment.";
    }

    const quests = await this.configLoader.flattenQuests();
    const titles = questIdsOrTitles.map((questIdOrTitle) => {
      const definition = quests.find((quest) => quest.id === questIdOrTitle || quest.title === questIdOrTitle);
      return definition?.title ?? questIdOrTitle;
    });

    return [
      "Quetes actives :",
      ...titles.map((title) => `- ${title}`)
    ].join("\n");
  }

  private async buildOnboardingRequest(context: TurnContext): Promise<OnboardingRequest> {
    const userId = this.getUserId(context.activity.from);
    const displayName = context.activity.from?.name ?? "Utilisateur";
    const directoryEntry = await this.onboarderDirectoryService.ensureAssignment(userId, displayName);
    const mentor = directoryEntry.mentor;

    const onboardee: PersonProfile = {
      aadUserId: userId,
      displayName,
      email: this.buildFallbackEmail(context.activity.from?.id, displayName),
      role: directoryEntry.poste,
      team: directoryEntry.city
    };

    const request: OnboardingRequest = {
      onboardingId: this.buildOnboardingId(userId),
      onboardee,
      mentor: {
        aadUserId: mentor.aadUserId,
        displayName: mentor.displayName,
        email: mentor.email,
        city: mentor.city,
        poste: mentor.poste,
        role: mentor.role,
        team: mentor.team
      },
      teamId: appConfig.onboarding.defaults.teamId
    };

    return request;
  }

  private buildOnboardingId(userId: string): string {
    return `teams-${userId}`;
  }

  private buildFallbackEmail(rawId: string | undefined, displayName: string): string {
    const seed = rawId && rawId.trim().length > 0 ? rawId : displayName;
    const normalized = seed.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
    return `${normalized || "utilisateur"}@local.invalid`;
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
