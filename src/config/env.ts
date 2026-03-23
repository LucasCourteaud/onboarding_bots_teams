import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3978),
  BOT_APP_ID: z.string().default(""),
  BOT_APP_PASSWORD: z.string().default(""),
  BOT_APP_TYPE: z.string().default("MultiTenant"),
  BOT_APP_TENANT_ID: z.string().default(""),
  GRAPH_TENANT_ID: z.string().min(1, "GRAPH_TENANT_ID is required"),
  GRAPH_CLIENT_ID: z.string().min(1, "GRAPH_CLIENT_ID is required"),
  GRAPH_CLIENT_SECRET: z.string().min(1, "GRAPH_CLIENT_SECRET is required"),
  DEFAULT_TEAM_ID: z.string().optional(),
  DEFAULT_PLANNER_PLAN_ID: z.string().optional(),
  DEFAULT_MANAGER_AAD_ID: z.string().optional(),
  DEFAULT_MENTOR_AAD_ID: z.string().optional(),
  ONBOARDING_CONFIG_PATH: z.string().default("./configs/onboarding.sample.json"),
  MAX_ACTIVE_TASKS: z.coerce.number().default(5),
  REPORT_CRON: z.string().default("0 9 1,15 * *"),
  PLANNER_SYNC_CRON: z.string().default("*/10 * * * *")
});

export const env = envSchema.parse(process.env);