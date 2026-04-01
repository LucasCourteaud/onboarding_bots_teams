import { OnboardingMission } from "../models/onboarding";
import { OnboardingConfigLoader } from "./onboardingConfigLoader";

export interface AssignedMission {
  categoryId: string;
  categoryTitle: string;
  mission: OnboardingMission;
}

interface UserMissionAssignment {
  userId: string;
  displayName: string;
  assignedAt: string;
  missions: AssignedMission[];
}

export class LocalMissionAssignmentService {
  private readonly assignments = new Map<string, UserMissionAssignment>();

  constructor(private readonly configLoader: OnboardingConfigLoader) {}

  async ensureAssignments(userId: string, displayName: string): Promise<{ firstVisit: boolean; assignments: AssignedMission[] }> {
    const existing = this.assignments.get(userId);
    if (existing) {
      return {
        firstVisit: false,
        assignments: existing.missions
      };
    }

    const config = await this.configLoader.load();
    const missions = config.journey.categories.flatMap((category) => {
      const mission = category.missions[0];
      if (!mission) {
        return [];
      }

      return [
        {
          categoryId: category.id,
          categoryTitle: category.title,
          mission
        }
      ];
    });

    this.assignments.set(userId, {
      userId,
      displayName,
      assignedAt: new Date().toISOString(),
      missions
    });

    return {
      firstVisit: true,
      assignments: missions
    };
  }

  getAssignments(userId: string): AssignedMission[] {
    return this.assignments.get(userId)?.missions ?? [];
  }
}