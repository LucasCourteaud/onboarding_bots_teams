import { Client } from "@microsoft/microsoft-graph-client";

import { PersonProfile } from "../../models/onboarding";

export interface TeamsChatGateway {
  createChat(members: PersonProfile[]): Promise<string>;
  sendMessage(chatId: string, message: string): Promise<void>;
}

export class GraphTeamsChatAdapter implements TeamsChatGateway {
  constructor(private readonly graphClient: Client) {}

  async createChat(members: PersonProfile[]): Promise<string> {
    const response = await this.graphClient.api("/chats").post({
      chatType: "group",
      members: members.map((member) => ({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: [],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${member.aadUserId}')`
      }))
    });

    return response.id as string;
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    await this.graphClient.api(`/chats/${chatId}/messages`).post({
      body: {
        contentType: "html",
        content: message
      }
    });
  }
}