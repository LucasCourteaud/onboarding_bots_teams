export interface PersonProfile {
  aadUserId: string;
  displayName: string;
  email: string;
  role?: string;
  team?: string;
}

export interface MentorProfile extends PersonProfile {
  onboardeeIds: string[];
}

export interface OnboarderDirectoryEntry {
  userId: string;
  displayName: string;
  mentorId: string;
}

export interface ResolvedOnboarderDirectoryEntry {
  userId: string;
  displayName: string;
  mentor: PersonProfile;
}

export interface OnboarderDirectoryData {
  mentors?: MentorProfile[];
  profiles: OnboarderDirectoryEntry[];
}

export interface ConnectorHints {
  github?: {
    repository: string;
    issueTemplate?: string;
    createIssue?: boolean;
  };
}

export type QuestValidationMode = "automatic" | "jenkins";

export interface QuestValidationRule {
  mode: QuestValidationMode;
  source: string;
  rule?: string;
  jobName?: string;
  successCriteria?: string;
}

export interface MissionValidationRule {
  mode: "mentor";
  requiredApprovals?: number;
}

export interface CompletedQuestsInCategoryCondition {
  type: "completed_quests_in_category";
  categoryId: string;
  requiredCount: number;
}

interface BaseJourneyItemDefinition {
  id: string;
  title: string;
  description: string;
  checklist?: string[];
  connectorHints?: ConnectorHints;
}

export interface OnboardingQuest {
  id: string;
  title: string;
  description: string;
  checklist?: string[];
  connectorHints?: ConnectorHints;
  difficulty?: "short";
  repeatable?: boolean;
  priority?: number;
  validation: QuestValidationRule;
}

export interface OnboardingMission {
  id: string;
  title: string;
  description: string;
  checklist?: string[];
  connectorHints?: ConnectorHints;
  difficulty?: "long";
  duration?: "multi_weeks" | "multi_months";
  repeatable?: boolean;
  unlockCondition: CompletedQuestsInCategoryCondition;
  validation: MissionValidationRule;
}

export interface OnboardingCategory {
  id: string;
  title: string;
  description: string;
  quests: OnboardingQuest[];
  missions: OnboardingMission[];
}

export interface OnboardingQuestDefinition extends BaseJourneyItemDefinition {
  type: "quest";
  categoryId: string;
  difficulty?: "short";
  repeatable?: boolean;
  priority?: number;
  validation: QuestValidationRule;
}

export interface OnboardingMissionDefinition extends BaseJourneyItemDefinition {
  type: "mission";
  categoryId: string;
  difficulty?: "long";
  duration?: "multi_weeks" | "multi_months";
  repeatable?: boolean;
  unlockCondition: CompletedQuestsInCategoryCondition;
  validation: MissionValidationRule;
}

export interface OnboardingJourneyRules {
  questReplacement: "auto";
  missionUnlock: {
    type: "completed_quests_in_category";
    requiredCount: number;
  };
}

export interface OnboardingJourneyConfig {
  version: number;
  journey: {
    name: string;
    defaultActiveQuestLimit: number;
    rules: OnboardingJourneyRules;
    categories: OnboardingCategory[];
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

export interface QuestHistoryEntry {
  questId: string;
  categoryId: string;
  status: "validated";
  validatedAt: string;
  validation: {
    mode: QuestValidationMode;
    source: string;
  };
}

export interface MissionState {
  missionId: string;
  categoryId: string;
  status: "unlocked" | "in-progress" | "validated";
  validatedAt?: string | null;
  validatedBy?: string | null;
}

export interface CategoryQuestStats {
  completedQuestCount: number;
}

export interface OnboardingState {
  onboardingId: string;
  planId: string;
  chatId: string;
  teamId?: string;
  onboardee: PersonProfile;
  mentor: PersonProfile;
  manager?: PersonProfile;
  queuedQuestIds: string[];
  activeQuestIds: string[];
  completedQuestIds: string[];
  questHistory: QuestHistoryEntry[];
  unlockedMissionIds: string[];
  missionStates: MissionState[];
  statsByCategory: Record<string, CategoryQuestStats>;
  createdTaskIds: string[];
  notifiedCompletedTaskIds: string[];
  plannerTaskDefinitions: Record<string, string>;
}

export interface StartOnboardingResult {
  onboardingId: string;
  chatId: string;
  planId: string;
  createdTasks: PlannerTaskSnapshot[];
}