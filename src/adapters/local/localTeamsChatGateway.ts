import { PersonProfile } from "../../models/onboarding";
import { logger } from "../../utils/logger";

export interface TeamsChatGateway {
  createChat(members: PersonProfile[]): Promise<string>;
  sendMessage(chatId: string, message: string): Promise<void>;
}

export class LocalTeamsChatGateway implements TeamsChatGateway {
  private readonly chats = new Map<string, { members: PersonProfile[]; messages: string[] }>();
  private sequence = 0;

  async createChat(members: PersonProfile[]): Promise<string> {
    const chatId = `local-chat-${++this.sequence}`;
    this.chats.set(chatId, { members: [...members], messages: [] });
    logger.info({ chatId, members: members.map((member) => member.email) }, "Local chat created");
    return chatId;
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      logger.warn({ chatId }, "Local chat not found");
      return;
    }

    chat.messages.push(message);
    logger.info({ chatId, message }, "Local message queued");
  }
}