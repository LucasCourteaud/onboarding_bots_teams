import { Client } from "@microsoft/microsoft-graph-client";

import { OnboardingQuestDefinition, PlannerTaskSnapshot } from "../../models/onboarding";

interface GraphPlannerTask {
  id: string;
  title: string;
  percentComplete: number;
  completedDateTime?: string;
}

export interface PlannerGateway {
  listTasks(planId: string): Promise<PlannerTaskSnapshot[]>;
  createTask(planId: string, task: OnboardingQuestDefinition, assigneeAadId: string): Promise<PlannerTaskSnapshot>;
}

export class GraphPlannerAdapter implements PlannerGateway {
  constructor(private readonly graphClient: Client) {}

  async listTasks(planId: string): Promise<PlannerTaskSnapshot[]> {
    const response = await this.graphClient.api(`/planner/plans/${planId}/tasks`).get();

    return ((response.value as GraphPlannerTask[]) ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      percentComplete: task.percentComplete,
      completedAt: task.completedDateTime
    }));
  }

  async createTask(planId: string, task: OnboardingQuestDefinition, assigneeAadId: string): Promise<PlannerTaskSnapshot> {
    const plannerTask = await this.graphClient.api("/planner/tasks").post({
      planId,
      title: task.title,
      assignments: {
        [assigneeAadId]: {
          "@odata.type": "microsoft.graph.plannerAssignment",
          orderHint: " !"
        }
      }
    });

    const details = await this.graphClient.api(`/planner/tasks/${plannerTask.id}/details`).get();
    const etag = details["@odata.etag"] as string;

    await this.graphClient
      .api(`/planner/tasks/${plannerTask.id}/details`)
      .header("If-Match", etag)
      .patch({
        description: task.description,
        checklist: Object.fromEntries(
          (task.checklist ?? []).map((item, index) => [
            `check-${index + 1}`,
            {
              title: item,
              isChecked: false
            }
          ])
        )
      });

    return {
      id: plannerTask.id as string,
      title: task.title,
      percentComplete: 0,
      definitionId: task.id
    };
  }
}