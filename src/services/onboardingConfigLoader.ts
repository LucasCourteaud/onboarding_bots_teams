import fs from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";
import { z } from "zod";

import { appConfig } from "../config";
import {
  OnboardingJourneyConfig,
  OnboardingMissionDefinition,
  OnboardingQuestDefinition
} from "../models/onboarding";

const connectorHintsSchema = z
  .object({
    github: z
      .object({
        repository: z.string(),
        issueTemplate: z.string().optional(),
        createIssue: z.boolean().optional()
      })
      .optional()
  })
  .optional();

const questSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  checklist: z.array(z.string()).optional(),
  connectorHints: connectorHintsSchema,
  difficulty: z.literal("short").optional(),
  repeatable: z.boolean().optional(),
  priority: z.number().int().nonnegative().optional(),
  validation: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("automatic"),
      source: z.string(),
      rule: z.string().optional()
    }),
    z.object({
      mode: z.literal("jenkins"),
      source: z.string(),
      jobName: z.string(),
      successCriteria: z.string().optional(),
      rule: z.string().optional()
    })
  ])
});

const missionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  checklist: z.array(z.string()).optional(),
  connectorHints: connectorHintsSchema,
  difficulty: z.literal("long").optional(),
  duration: z.enum(["multi_weeks", "multi_months"]).optional(),
  repeatable: z.boolean().optional(),
  unlockCondition: z.object({
    type: z.literal("completed_quests_in_category"),
    categoryId: z.string(),
    requiredCount: z.number().int().positive()
  }),
  validation: z.object({
    mode: z.literal("mentor"),
    requiredApprovals: z.number().int().positive().optional()
  })
});

const configSchema = z.object({
  version: z.number(),
  journey: z.object({
    name: z.string(),
    defaultActiveQuestLimit: z.number().int().positive(),
    rules: z.object({
      questReplacement: z.literal("auto"),
      missionUnlock: z.object({
        type: z.literal("completed_quests_in_category"),
        requiredCount: z.number().int().positive()
      })
    }),
    categories: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        quests: z.array(questSchema),
        missions: z.array(missionSchema)
      })
    )
  })
});

export class OnboardingConfigLoader {
  private cache?: OnboardingJourneyConfig;

  constructor(private readonly configPath = appConfig.onboarding.configPath) {}

  async load(): Promise<OnboardingJourneyConfig> {
    if (this.cache) {
      return this.cache;
    }

    const absolutePath = path.resolve(process.cwd(), this.configPath);
    const rawContent = await fs.readFile(absolutePath, "utf-8");
    const parsed = absolutePath.endsWith(".json") ? JSON.parse(rawContent) : YAML.parse(rawContent);
    this.cache = configSchema.parse(parsed);
    return this.cache;
  }

  async flattenQuests(): Promise<OnboardingQuestDefinition[]> {
    const config = await this.load();
    return config.journey.categories.flatMap((category) =>
      category.quests.map((quest) => ({
        ...quest,
        type: "quest" as const,
        categoryId: category.id
      }))
    );
  }

  async flattenMissions(): Promise<OnboardingMissionDefinition[]> {
    const config = await this.load();
    return config.journey.categories.flatMap((category) =>
      category.missions.map((mission) => ({
        ...mission,
        type: "mission" as const,
        categoryId: category.id
      }))
    );
  }
}