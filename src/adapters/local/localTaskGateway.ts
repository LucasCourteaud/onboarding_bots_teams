import { OnboardingQuestDefinition, PlannerTaskSnapshot } from "../../models/onboarding";

export interface PlannerGateway {
  listTasks(planId: string): Promise<PlannerTaskSnapshot[]>;
  createTask(planId: string, task: OnboardingQuestDefinition, assigneeAadId: string): Promise<PlannerTaskSnapshot>;
}

export class LocalTaskGateway implements PlannerGateway {
  private readonly tasksByPlanId = new Map<string, PlannerTaskSnapshot[]>();
  private sequence = 0;

  async listTasks(planId: string): Promise<PlannerTaskSnapshot[]> {
    return [...(this.tasksByPlanId.get(planId) ?? [])];
  }

  async createTask(planId: string, task: OnboardingQuestDefinition, _assigneeAadId: string): Promise<PlannerTaskSnapshot> {
    const createdTask: PlannerTaskSnapshot = {
      id: `local-task-${++this.sequence}`,
      title: task.title,
      percentComplete: 0,
      definitionId: task.id
    };

    const existingTasks = this.tasksByPlanId.get(planId) ?? [];
    this.tasksByPlanId.set(planId, [...existingTasks, createdTask]);

    return createdTask;
  }
}