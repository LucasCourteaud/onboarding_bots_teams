import express, { Request, Response } from "express";
import { BotFrameworkAdapter, ConversationState, MemoryStorage, UserState } from "botbuilder";

import { LocalTaskGateway } from "./adapters/local/localTaskGateway";
import { LocalTeamsChatGateway } from "./adapters/local/localTeamsChatGateway";
import { TeamsOnboardingBot } from "./bot/teamsOnboardingBot";
import { appConfig } from "./config";
import { GitHubConnector } from "./connectors/githubConnector";
import { BotMessageController } from "./controllers/botMessageController";
import { OnboardingController } from "./controllers/onboardingController";
import { errorHandler } from "./middlewares/errorHandler";
import { createOnboardingRouter } from "./routes/onboardingRoutes";
import { OnboardingConfigLoader } from "./services/onboardingConfigLoader";
import { OnboarderDirectoryService } from "./services/onboarderDirectoryService";
import { registerOnboardingSchedulers } from "./services/onboardingScheduler";
import { OnboardingWorkflowService } from "./services/onboardingWorkflowService";
import { PlannerService } from "./services/plannerService";
import { ReportingService } from "./services/reportingService";
import { TeamsMessagingService } from "./services/teamsMessagingService";
import { logger } from "./utils/logger";
import { toError } from "./utils/errors";

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);
const configLoader = new OnboardingConfigLoader();

const adapter = new BotFrameworkAdapter({
  appId: appConfig.bot.appId,
  appPassword: appConfig.bot.appPassword,
  channelAuthTenant: appConfig.bot.channelAuthTenant
});

adapter.onTurnError = async (context, error) => {
  logger.error({ err: toError(error) }, "Unhandled bot error");
  await context.sendActivity("Une erreur est survenue côté bot.");
  await conversationState.clear(context);
};

const teamsMessagingService = new TeamsMessagingService(new LocalTeamsChatGateway());
const reportingService = new ReportingService(teamsMessagingService);
const workflow = new OnboardingWorkflowService(
  configLoader,
  new PlannerService(new LocalTaskGateway()),
  teamsMessagingService,
  reportingService,
  [new GitHubConnector()]
);
const bot = new TeamsOnboardingBot(
  new BotMessageController(
    workflow,
    new OnboarderDirectoryService(),
    configLoader
  )
);
const onboardingController = new OnboardingController(workflow);

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

app.use("/api/onboarding", createOnboardingRouter(onboardingController));
app.use(errorHandler);

registerOnboardingSchedulers(workflow);

app.listen(appConfig.server.port, () => {
  logger.info({ port: appConfig.server.port }, "BotTeams POC listening");
});
