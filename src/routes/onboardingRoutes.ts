import { Router } from "express";

import { OnboardingWorkflowService } from "../services/onboardingWorkflowService";

export function createOnboardingRouter(workflow: OnboardingWorkflowService): Router {
  const router = Router();

  router.post("/start", async (req, res, next) => {
    try {
      const result = await workflow.start(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/sync", async (req, res, next) => {
    try {
      const { onboardingId } = req.body as { onboardingId: string };
      const result = await workflow.syncCompletedTasks(onboardingId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/report", async (req, res, next) => {
    try {
      const { onboardingId } = req.body as { onboardingId: string };
      await workflow.sendReport(onboardingId);
      res.status(202).json({ onboardingId, status: "queued" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}