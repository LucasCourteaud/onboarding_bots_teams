import fs from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";
import { z } from "zod";

import { env } from "../config/env";
import { OnboardingJourneyConfig, OnboardingTaskDefinition } from "../models/onboarding";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  checklist: z.array(z.string()).optional(),
  connectorHints: z
    .object({
      github: z
        .object({
          repository: z.string(),
          issueTemplate: z.string().optional(),
          createIssue: z.boolean().optional()
        })
        .optional()
    })
    .optional()
});

const configSchema = z.object({
  version: z.number(),
  journey: z.object({
    name: z.string(),
    defaultActiveLimit: z.number().int().positive(),
    phases: z.array(
      z.object({
        key: z.string(),
        title: z.string(),
        tasks: z.array(taskSchema)
      })
    )
  })
});

export class OnboardingConfigLoader {
  private cache?: OnboardingJourneyConfig;

  async load(): Promise<OnboardingJourneyConfig> {
    if (this.cache) {
      return this.cache;
    }

    const absolutePath = path.resolve(process.cwd(), env.ONBOARDING_CONFIG_PATH);
    const rawContent = await fs.readFile(absolutePath, "utf-8");
    const parsed = absolutePath.endsWith(".json") ? JSON.parse(rawContent) : YAML.parse(rawContent);
    this.cache = configSchema.parse(parsed);
    return this.cache;
  }

  async flattenTasks(): Promise<OnboardingTaskDefinition[]> {
    const config = await this.load();
    return config.journey.phases.flatMap((phase) => phase.tasks);
  }
}