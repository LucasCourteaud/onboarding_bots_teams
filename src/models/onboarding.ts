export interface PersonProfile {
  aadUserId: string;
  displayName: string;
  email: string;
  role?: string;
  team?: string;
}

export interface ConnectorHints {
  github?: {
    repository: string;
    issueTemplate?: string;
    createIssue?: boolean;
  };
}

export interface OnboardingTaskDefinition {
  id: string;
  title: string;
  description: string;
  checklist?: string[];
  connectorHints?: ConnectorHints;
}

export interface OnboardingPhase {
  key: string;
  title: string;
  tasks: OnboardingTaskDefinition[];
}

export interface OnboardingJourneyConfig {
  version: number;
  journey: {
    name: string;
    defaultActiveLimit: number;
    phases: OnboardingPhase[];
  };
}

export interface OnboardingRequest {
  onboardingId: string;
  onboardee: PersonProfile;
  mentor: PersonProfile;
  manager?: PersonProfile;
  teamId?: string;
  planId?: string;
}

export interface PlannerTaskSnapshot {
  id: string;
  title: string;
  percentComplete: number;
  completedAt?: string;
  definitionId?: string;
}

export interface OnboardingState {
  onboardingId: string;
  planId: string;
  chatId: string;
  teamId?: string;
  onboardee: PersonProfile;
  mentor: PersonProfile;
  manager?: PersonProfile;
  queuedTaskIds: string[];
  createdTaskIds: string[];
  notifiedCompletedTaskIds: string[];
}

export interface StartOnboardingResult {
  onboardingId: string;
  chatId: string;
  planId: string;
  createdTasks: PlannerTaskSnapshot[];
}