import { OnboardingState, PlannerTaskSnapshot } from "../models/onboarding";
import { TeamsMessagingService } from "./teamsMessagingService";

export class ReportingService {
  constructor(private readonly teamsMessagingService: TeamsMessagingService) {}

  buildBiMonthlySummary(state: OnboardingState, tasks: PlannerTaskSnapshot[]): string {
    const completed = tasks.filter((task) => task.percentComplete === 100);
    const remaining = tasks.filter((task) => task.percentComplete < 100);
    const completionRate = tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100);

    const blockers = remaining.length === 0
      ? "Aucun blocage remonté."
      : `Points d'attention: ${remaining.slice(0, 3).map((task) => task.title).join(", ")}.`;

    return [
      `Onboardé: ${state.onboardee.displayName}`,
      `Mentor: ${state.mentor.displayName}`,
      `Quêtes complétées: ${completed.length}/${tasks.length}`,
      `Progression globale: ${completionRate}%`,
      blockers
    ].join("<br />");
  }

  async sendBiMonthlyReport(state: OnboardingState, tasks: PlannerTaskSnapshot[]): Promise<void> {
    if (!state.manager) {
      return;
    }

    const message = this.buildBiMonthlySummary(state, tasks);
    const managerChatId = await this.teamsMessagingService.createMentorChat(state.manager, state.mentor);
    await this.teamsMessagingService.sendChatMessage(
      managerChatId,
      this.teamsMessagingService.buildReportMessage(message)
    );
  }
}