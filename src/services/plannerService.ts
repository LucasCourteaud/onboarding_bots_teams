import { PlannerGateway } from "../adapters/local/localTaskGateway";
import { OnboardingQuestDefinition, PlannerTaskSnapshot } from "../models/onboarding";

export class PlannerService {
  constructor(private readonly plannerGateway: PlannerGateway) {}

  async listTasks(planId: string): Promise<PlannerTaskSnapshot[]> {
    return this.plannerGateway.listTasks(planId);
  }

  async createTask(planId: string, task: OnboardingQuestDefinition, assigneeAadId: string): Promise<PlannerTaskSnapshot> {
    return this.plannerGateway.createTask(planId, task, assigneeAadId);
  }

  async listCompletedTasks(planId: string, knownCompletedTaskIds: string[]): Promise<PlannerTaskSnapshot[]> {
    const tasks = await this.listTasks(planId);
    return tasks.filter((task) => task.percentComplete === 100 && !knownCompletedTaskIds.includes(task.id));
  }
}