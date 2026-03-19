import { graphClient } from "../graph/graphClient";
import { OnboardingTaskDefinition, PlannerTaskSnapshot } from "../models/onboarding";

interface GraphPlannerTask {
  id: string;
  title: string;
  percentComplete: number;
  completedDateTime?: string;
  details?: {
    description?: string;
  };
}

export class PlannerService {
  async listTasks(planId: string): Promise<PlannerTaskSnapshot[]> {
    const response = await graphClient.api(`/planner/plans/${planId}/tasks`).get();
    return ((response.value as GraphPlannerTask[]) ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      percentComplete: task.percentComplete,
      completedAt: task.completedDateTime
    }));
  }

  async createTask(planId: string, task: OnboardingTaskDefinition, assigneeAadId: string): Promise<PlannerTaskSnapshot> {
    const plannerTask = await graphClient.api("/planner/tasks").post({
      planId,
      title: task.title,
      assignments: {
        [assigneeAadId]: {
          "@odata.type": "microsoft.graph.plannerAssignment",
          orderHint: " !"
        }
      }
    });

    const details = await graphClient.api(`/planner/tasks/${plannerTask.id}/details`).get();
    const etag = details["@odata.etag"] as string;

    await graphClient
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

  async listCompletedTasks(planId: string, knownCompletedTaskIds: string[]): Promise<PlannerTaskSnapshot[]> {
    const tasks = await this.listTasks(planId);
    return tasks.filter((task) => task.percentComplete === 100 && !knownCompletedTaskIds.includes(task.id));
  }
}