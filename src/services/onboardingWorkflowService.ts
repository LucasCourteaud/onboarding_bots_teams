import { env } from "../config/env";
import { ExternalConnector } from "../connectors/baseConnector";
import {
  OnboardingRequest,
  OnboardingState,
  PlannerTaskSnapshot,
  StartOnboardingResult
} from "../models/onboarding";
import { logger } from "../utils/logger";
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
    const planId = request.planId ?? env.DEFAULT_PLANNER_PLAN_ID;

    if (!planId) {
      throw new Error("Planner planId is required");
    }

    const chatId = await this.teamsMessagingService.createMentorChat(request.onboardee, request.mentor);
    await this.teamsMessagingService.sendChatMessage(
      chatId,
      this.teamsMessagingService.buildWelcomeMessage(request.onboardee, request.mentor)
    );

    const allTasks = config.journey.phases.flatMap((phase) => phase.tasks);
    const initialTasks = allTasks.slice(0, Math.min(config.journey.defaultActiveLimit, env.MAX_ACTIVE_TASKS));
    const createdTasks: PlannerTaskSnapshot[] = [];

    for (const task of initialTasks) {
      const created = await this.plannerService.createTask(planId, task, request.onboardee.aadUserId);
      createdTasks.push(created);
      await Promise.all(this.connectors.map((connector) => connector.onTaskCreated(request, task)));
    }

    this.states.set(request.onboardingId, {
      onboardingId: request.onboardingId,
      planId,
      chatId,
      teamId: request.teamId,
      onboardee: request.onboardee,
      mentor: request.mentor,
      manager: request.manager,
      queuedTaskIds: allTasks.slice(initialTasks.length).map((task) => task.id),
      createdTaskIds: createdTasks.map((task) => task.id),
      notifiedCompletedTaskIds: []
    });

    logger.info("Onboarding started", {
      onboardingId: request.onboardingId,
      chatId,
      planId,
      initialTaskCount: createdTasks.length
    });

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

  async syncCompletedTasks(onboardingId: string): Promise<{ completed: PlannerTaskSnapshot[]; created: PlannerTaskSnapshot[] }> {
    const state = this.getRequiredState(onboardingId);
    const config = await this.configLoader.load();
    const definitions = config.journey.phases.flatMap((phase) => phase.tasks);

    const completed = await this.plannerService.listCompletedTasks(state.planId, state.notifiedCompletedTaskIds);
    const created: PlannerTaskSnapshot[] = [];

    for (const task of completed) {
      state.notifiedCompletedTaskIds.push(task.id);
      await this.teamsMessagingService.sendChatMessage(
        state.chatId,
        this.teamsMessagingService.buildTaskCompletionMessage(task.title)
      );

      const definition = definitions.find((item) => item.title === task.title || item.id === task.definitionId);
      if (definition) {
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
      }
    }

    const currentTasks = await this.plannerService.listTasks(state.planId);
    const activeTasks = currentTasks.filter((task) => task.percentComplete < 100);
    const capacity = Math.max(0, env.MAX_ACTIVE_TASKS - activeTasks.length);

    for (const definitionId of state.queuedTaskIds.splice(0, capacity)) {
      const definition = definitions.find((task) => task.id === definitionId);
      if (!definition) {
        continue;
      }

      const newTask = await this.plannerService.createTask(state.planId, definition, state.onboardee.aadUserId);
      state.createdTaskIds.push(newTask.id);
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

    return { completed, created };
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
      throw new Error(`Unknown onboardingId ${onboardingId}`);
    }

    return state;
  }
}