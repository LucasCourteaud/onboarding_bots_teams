import { OnboardingRequest, OnboardingTaskDefinition } from "../models/onboarding";

export interface ExternalConnector {
  readonly name: string;
  onTaskCreated(request: OnboardingRequest, task: OnboardingTaskDefinition): Promise<void>;
  onTaskCompleted(request: OnboardingRequest, task: OnboardingTaskDefinition): Promise<void>;
}