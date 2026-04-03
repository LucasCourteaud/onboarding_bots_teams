import cron from "node-cron";

import { appConfig } from "../config";
import { OnboardingWorkflowService } from "./onboardingWorkflowService";
import { logger } from "../utils/logger";
import { toError } from "../utils/errors";

export function registerOnboardingSchedulers(workflow: OnboardingWorkflowService): void {
  cron.schedule(appConfig.jobs.plannerSyncCron, async () => {
    for (const state of workflow.listStates()) {
      try {
        const result = await workflow.syncCompletedTasks(state.onboardingId);
        if (result.completed.length > 0 || result.created.length > 0) {
          logger.info({
            onboardingId: state.onboardingId,
            completed: result.completed.length,
            created: result.created.length,
            unlockedMissions: result.unlockedMissions.length,
            msg: "Planner sync executed"
          });
        }
      } catch (error) {
        logger.error({ onboardingId: state.onboardingId, err: toError(error), msg: "Planner sync failed" });
      }
    }
  });

  cron.schedule(appConfig.jobs.reportCron, async () => {
    for (const state of workflow.listStates()) {
      try {
        await workflow.sendReport(state.onboardingId);
        logger.info({ onboardingId: state.onboardingId, msg: "Bi-monthly report sent" });
      } catch (error) {
        logger.error({ onboardingId: state.onboardingId, err: toError(error), msg: "Bi-monthly report failed" });
      }
    }
  });
}