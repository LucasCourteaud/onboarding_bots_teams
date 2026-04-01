import { ActivityHandler } from "botbuilder";

import { BotMessageController } from "../controllers/botMessageController";

export class TeamsOnboardingBot extends ActivityHandler {
  constructor(private readonly controller: BotMessageController) {
    super();

    this.onMessage(async (context, next) => {
      await this.controller.handleMessage(context);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      await this.controller.handleMembersAdded(context);
      await next();
    });
  }
}