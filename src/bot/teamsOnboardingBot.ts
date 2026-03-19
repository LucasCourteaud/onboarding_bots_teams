import { ActivityHandler, CardFactory, MessageFactory, TurnContext } from "botbuilder";

export class TeamsOnboardingBot extends ActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const welcome = MessageFactory.attachment(
        CardFactory.heroCard("BotTeams Onboarding", "Je peux présenter le parcours d'onboarding, suivre Planner et publier des notifications Teams.")
      );
      await context.sendActivity(welcome);
      await next();
    });
  }

  private async handleMessage(context: TurnContext): Promise<void> {
    const text = TurnContext.removeRecipientMention(context.activity)?.toLowerCase().trim() ?? "";

    if (text.includes("help")) {
      await context.sendActivity("Commandes disponibles: `help`, `status`, `ping`.");
      return;
    }

    if (text.includes("status")) {
      await context.sendActivity("Le bot est actif. Les orchestrations d'onboarding se déclenchent via les endpoints HTTP du POC.");
      return;
    }

    if (text.includes("ping")) {
      await context.sendActivity("pong");
      return;
    }

    await context.sendActivity("Commande non reconnue. Tape `help` pour voir les commandes disponibles.");
  }
}