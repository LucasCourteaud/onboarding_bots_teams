import { env } from "./env";

export const appConfig = {
  server: {
    port: env.PORT
  },
  bot: {
    appId: env.BOT_APP_ID,
    appPassword: env.BOT_APP_PASSWORD,
    appType: env.BOT_APP_TYPE,
    tenantId: env.BOT_APP_TENANT_ID,
    channelAuthTenant: env.BOT_APP_TYPE === "SingleTenant" ? env.BOT_APP_TENANT_ID || undefined : undefined
  },
  graph: {
    tenantId: env.GRAPH_TENANT_ID,
    clientId: env.GRAPH_CLIENT_ID,
    clientSecret: env.GRAPH_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default"
  },
  onboarding: {
    configPath: env.ONBOARDING_CONFIG_PATH,
    maxActiveTasks: env.MAX_ACTIVE_TASKS,
    defaults: {
      teamId: env.DEFAULT_TEAM_ID,
      planId: env.DEFAULT_PLANNER_PLAN_ID,
      managerAadId: env.DEFAULT_MANAGER_AAD_ID,
      mentorAadId: env.DEFAULT_MENTOR_AAD_ID
    }
  },
  jobs: {
    reportCron: env.REPORT_CRON,
    plannerSyncCron: env.PLANNER_SYNC_CRON
  },
  logging: {
    level: env.LOG_LEVEL
  }
} as const;

export type AppConfig = typeof appConfig;