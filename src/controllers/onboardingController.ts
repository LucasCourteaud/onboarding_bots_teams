import { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { OnboardingWorkflowService } from "../services/onboardingWorkflowService";

const personSchema = z.object({
  aadUserId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional(),
  team: z.string().optional()
});

const startSchema = z.object({
  onboardingId: z.string().min(1),
  onboardee: personSchema,
  mentor: personSchema,
  manager: personSchema.optional(),
  teamId: z.string().optional(),
  planId: z.string().optional()
});

const onboardingIdSchema = z.object({
  onboardingId: z.string().min(1)
});

export class OnboardingController {
  constructor(private readonly workflow: OnboardingWorkflowService) {}

  start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = startSchema.parse(req.body);
      const result = await this.workflow.start(payload);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = onboardingIdSchema.parse(req.body);
      const result = await this.workflow.syncCompletedTasks(payload.onboardingId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  report = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = onboardingIdSchema.parse(req.body);
      await this.workflow.sendReport(payload.onboardingId);
      res.status(202).json({ onboardingId: payload.onboardingId, status: "queued" });
    } catch (error) {
      next(error);
    }
  };
}