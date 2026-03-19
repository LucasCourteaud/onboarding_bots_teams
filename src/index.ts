import cron from "node-cron";
import express, { Request, Response } from "express";
import { BotFrameworkAdapter, ConversationState, MemoryStorage, UserState } from "botbuilder";

import { TeamsOnboardingBot } from "./bot/teamsOnboardingBot";
import { env } from "./config/env";
import { GitHubConnector } from "./connectors/githubConnector";
import { createOnboardingRouter } from "./routes/onboardingRoutes";
import { OnboardingConfigLoader } from "./services/onboardingConfigLoader";
import { OnboardingWorkflowService } from "./services/onboardingWorkflowService";
import { PlannerService } from "./services/plannerService";
import { ReportingService } from "./services/reportingService";
import { TeamsMessagingService } from "./services/teamsMessagingService";
import { logger } from "./utils/logger";

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

const adapter = new BotFrameworkAdapter({
  appId: env.BOT_APP_ID,
  appPassword: env.BOT_APP_PASSWORD
});

adapter.onTurnError = async (context, error) => {
  logger.error("Unhandled bot error", { error: error instanceof Error ? error.message : String(error) });
  await context.sendActivity("Une erreur est survenue côté bot.");
  await conversationState.clear(context);
};

const bot = new TeamsOnboardingBot();
const teamsMessagingService = new TeamsMessagingService();
const reportingService = new ReportingService(teamsMessagingService);
const workflow = new OnboardingWorkflowService(
  new OnboardingConfigLoader(),
  new PlannerService(),
  teamsMessagingService,
  reportingService,
  [new GitHubConnector()]
);

const app = express();
app.use(express.json());

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/api/messages", async (req: Request, res: Response) => {
  await adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
    await conversationState.saveChanges(context, false);
    await userState.saveChanges(context, false);
  });
});

app.use("/api/onboarding", createOnboardingRouter(workflow));

app.use((error: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  logger.error("HTTP request failed", {
    error: error instanceof Error ? error.message : String(error)
  });
  res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
});

cron.schedule(env.PLANNER_SYNC_CRON, async () => {
  for (const state of workflow.listStates()) {
    try {
      const result = await workflow.syncCompletedTasks(state.onboardingId);
      if (result.completed.length > 0 || result.created.length > 0) {
        logger.info("Planner sync executed", {
          onboardingId: state.onboardingId,
          completed: result.completed.length,
          created: result.created.length
        });
      }
    } catch (error) {
      logger.error("Planner sync failed", {
        onboardingId: state.onboardingId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

cron.schedule(env.REPORT_CRON, async () => {
  for (const state of workflow.listStates()) {
    try {
      await workflow.sendReport(state.onboardingId);
      logger.info("Bi-monthly report sent", { onboardingId: state.onboardingId });
    } catch (error) {
      logger.error("Bi-monthly report failed", {
        onboardingId: state.onboardingId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

app.listen(env.PORT, () => {
  logger.info("BotTeams POC listening", { port: env.PORT });
});