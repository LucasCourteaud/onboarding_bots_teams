import { appConfig } from "../config";
import { ExternalConnector } from "../connectors/baseConnector";
import {
  OnboardingJourneyConfig,
  OnboardingMissionDefinition,
  OnboardingQuestDefinition,
  OnboardingRequest,
  OnboardingState,
  PlannerTaskSnapshot,
  StartOnboardingResult
} from "../models/onboarding";
import { logger } from "../utils/logger";
import { AppError } from "../utils/errors";
import { OnboardingConfigLoader } from "./onboardingConfigLoader";
import { PlannerService } from "./plannerService";
import { ReportingService } from "./reportingService";
import { TeamsMessagingService } from "./teamsMessagingService";

export class OnboardingWorkflowService {
  private readonly states = new Map<string, OnboardingState>();

  constructor(
    private readonly configLoader: OnboardingConfigLoader,
    private readonly plannerService: PlannerService,
    private readonly teamsMessagingService: TeamsMessagingService,
    private readonly reportingService: ReportingService,
    private readonly connectors: ExternalConnector[]
  ) {}

  async start(request: OnboardingRequest): Promise<StartOnboardingResult> {
    const config = await this.configLoader.load();
    const allQuests = await this.configLoader.flattenQuests();
    const planId = request.planId ?? appConfig.onboarding.defaults.planId;

    if (!planId) {
      throw new AppError("Planner planId is required", 400);
    }

    const chatId = await this.teamsMessagingService.createMentorChat(request.onboardee, request.mentor);
    await this.teamsMessagingService.sendChatMessage(
      chatId,
      this.teamsMessagingService.buildWelcomeMessage(request.onboardee, request.mentor)
    );

    const initialQuests = allQuests.slice(0, Math.min(config.journey.defaultActiveQuestLimit, appConfig.onboarding.maxActiveTasks));
    const createdTasks: PlannerTaskSnapshot[] = [];
    const plannerTaskDefinitions: Record<string, string> = {};

    for (const quest of initialQuests) {
      const created = await this.plannerService.createTask(planId, quest, request.onboardee.aadUserId);
      createdTasks.push(created);
      plannerTaskDefinitions[created.id] = quest.id;
      await Promise.all(this.connectors.map((connector) => connector.onTaskCreated(request, quest)));
    }

    this.states.set(request.onboardingId, {
      onboardingId: request.onboardingId,
      planId,
      chatId,
      teamId: request.teamId,
      onboardee: request.onboardee,
      mentor: request.mentor,
      manager: request.manager,
      queuedQuestIds: allQuests.slice(initialQuests.length).map((quest) => quest.id),
      activeQuestIds: initialQuests.map((quest) => quest.id),
      completedQuestIds: [],
      questHistory: [],
      unlockedMissionIds: [],
      missionStates: [],
      statsByCategory: Object.fromEntries(
        config.journey.categories.map((category) => [category.id, { completedQuestCount: 0 }])
      ),
      createdTaskIds: createdTasks.map((task) => task.id),
      notifiedCompletedTaskIds: [],
      plannerTaskDefinitions
    });

    logger.info({ onboardingId: request.onboardingId, chatId, planId, initialTaskCount: createdTasks.length }, "Onboarding started");

    return {
      onboardingId: request.onboardingId,
      chatId,
      planId,
      createdTasks
    };
  }

  getState(onboardingId: string): OnboardingState | undefined {
    return this.states.get(onboardingId);
  }

  async syncCompletedTasks(
    onboardingId: string
  ): Promise<{ completed: PlannerTaskSnapshot[]; created: PlannerTaskSnapshot[]; unlockedMissions: OnboardingMissionDefinition[] }> {
    const state = this.getRequiredState(onboardingId);
    const config = await this.configLoader.load();
    const quests = await this.configLoader.flattenQuests();
    const missions = await this.configLoader.flattenMissions();

    const completed = await this.plannerService.listCompletedTasks(state.planId, state.notifiedCompletedTaskIds);
    const created: PlannerTaskSnapshot[] = [];
    const unlockedMissions: OnboardingMissionDefinition[] = [];

    for (const task of completed) {
      state.notifiedCompletedTaskIds.push(task.id);
      await this.teamsMessagingService.sendChatMessage(
        state.chatId,
        this.teamsMessagingService.buildTaskCompletionMessage(task.title)
      );

      const definitionId = state.plannerTaskDefinitions[task.id] ?? task.definitionId;
      const definition = quests.find((quest) => quest.id === definitionId || quest.title === task.title);
      if (!definition) {
        continue;
      }

      this.recordQuestCompletion(state, definition);
      delete state.plannerTaskDefinitions[task.id];

      await Promise.all(
        this.connectors.map((connector) =>
          connector.onTaskCompleted(
            {
              onboardingId: state.onboardingId,
              onboardee: state.onboardee,
              mentor: state.mentor,
              manager: state.manager,
              teamId: state.teamId,
              planId: state.planId
            },
            definition
          )
        )
      );

      const newlyUnlocked = this.unlockMissions(state, config, missions, definition.categoryId);
      unlockedMissions.push(...newlyUnlocked);

      for (const mission of newlyUnlocked) {
        const category = config.journey.categories.find((item) => item.id === mission.categoryId);
        await this.teamsMessagingService.sendChatMessage(
          state.chatId,
          this.teamsMessagingService.buildMissionUnlockedMessage(mission.title, category?.title ?? mission.categoryId)
        );
      }
    }

    const currentTasks = await this.plannerService.listTasks(state.planId);
    const activeTasks = currentTasks.filter((task) => task.percentComplete < 100);
    const capacity = Math.max(0, appConfig.onboarding.maxActiveTasks - activeTasks.length);

    for (const definitionId of state.queuedQuestIds.splice(0, capacity)) {
      const definition = quests.find((quest) => quest.id === definitionId);
      if (!definition) {
        continue;
      }

      const newTask = await this.plannerService.createTask(state.planId, definition, state.onboardee.aadUserId);
      state.createdTaskIds.push(newTask.id);
      state.activeQuestIds.push(definition.id);
      state.plannerTaskDefinitions[newTask.id] = definition.id;
      created.push(newTask);

      await Promise.all(
        this.connectors.map((connector) =>
          connector.onTaskCreated(
            {
              onboardingId: state.onboardingId,
              onboardee: state.onboardee,
              mentor: state.mentor,
              manager: state.manager,
              teamId: state.teamId,
              planId: state.planId
            },
            definition
          )
        )
      );
    }

    return { completed, created, unlockedMissions };
  }

  async sendReport(onboardingId: string): Promise<void> {
    const state = this.getRequiredState(onboardingId);
    const tasks = await this.plannerService.listTasks(state.planId);
    await this.reportingService.sendBiMonthlyReport(state, tasks);
  }

  listStates(): OnboardingState[] {
    return [...this.states.values()];
  }

  private getRequiredState(onboardingId: string): OnboardingState {
    const state = this.states.get(onboardingId);
    if (!state) {
      throw new AppError(`Unknown onboardingId ${onboardingId}`, 404);
    }

    return state;
  }

  private recordQuestCompletion(state: OnboardingState, quest: OnboardingQuestDefinition): void {
    state.activeQuestIds = state.activeQuestIds.filter((questId) => questId !== quest.id);
    if (!state.completedQuestIds.includes(quest.id)) {
      state.completedQuestIds.push(quest.id);
    }

    state.questHistory.push({
      questId: quest.id,
      categoryId: quest.categoryId,
      status: "validated",
      validatedAt: new Date().toISOString(),
      validation: {
        mode: quest.validation.mode,
        source: quest.validation.source
      }
    });

    const categoryStats = state.statsByCategory[quest.categoryId] ?? { completedQuestCount: 0 };
    categoryStats.completedQuestCount += 1;
    state.statsByCategory[quest.categoryId] = categoryStats;
  }

  private unlockMissions(
    state: OnboardingState,
    config: OnboardingJourneyConfig,
    missions: OnboardingMissionDefinition[],
    categoryId: string
  ): OnboardingMissionDefinition[] {
    const completedQuestCount = state.statsByCategory[categoryId]?.completedQuestCount ?? 0;
    if (completedQuestCount === 0) {
      return [];
    }

    return missions.filter((mission) => {
      if (mission.categoryId !== categoryId) {
        return false;
      }

      if (state.unlockedMissionIds.includes(mission.id)) {
        return false;
      }

      const minimumCount = mission.unlockCondition.requiredCount ?? config.journey.rules.missionUnlock.requiredCount;
      if (completedQuestCount < minimumCount) {
        return false;
      }

      state.unlockedMissionIds.push(mission.id);
      state.missionStates.push({
        missionId: mission.id,
        categoryId: mission.categoryId,
        status: "unlocked",
        validatedAt: null,
        validatedBy: null
      });
      return true;
    });
  }
}