import { Router } from "express";

import { OnboardingController } from "../controllers/onboardingController";

export function createOnboardingRouter(controller: OnboardingController): Router {
  const router = Router();

  router.post("/start", controller.start);
  router.post("/sync", controller.sync);
  router.post("/report", controller.report);

  return router;
}