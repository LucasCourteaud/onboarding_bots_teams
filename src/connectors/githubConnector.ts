import { ExternalConnector } from "./baseConnector";
import { OnboardingQuestDefinition, OnboardingRequest } from "../models/onboarding";
import { logger } from "../utils/logger";

export class GitHubConnector implements ExternalConnector {
  readonly name = "github";

  async onTaskCreated(request: OnboardingRequest, task: OnboardingQuestDefinition): Promise<void> {
    if (!task.connectorHints?.github) {
      return;
    }

    logger.info("GitHub connector placeholder on task created", {
      onboardingId: request.onboardingId,
      taskId: task.id,
      repository: task.connectorHints.github.repository
    });
  }

  async onTaskCompleted(request: OnboardingRequest, task: OnboardingQuestDefinition): Promise<void> {
    if (!task.connectorHints?.github) {
      return;
    }

    logger.info("GitHub connector placeholder on task completed", {
      onboardingId: request.onboardingId,
      taskId: task.id,
      repository: task.connectorHints.github.repository
    });
  }
}