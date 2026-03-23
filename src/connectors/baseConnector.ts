import { OnboardingQuestDefinition, OnboardingRequest } from "../models/onboarding";

export interface ExternalConnector {
  readonly name: string;
  onTaskCreated(request: OnboardingRequest, task: OnboardingQuestDefinition): Promise<void>;
  onTaskCompleted(request: OnboardingRequest, task: OnboardingQuestDefinition): Promise<void>;
}