import "isomorphic-fetch";

import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

import { env } from "../config/env";

const credential = new ClientSecretCredential(
  env.GRAPH_TENANT_ID,
  env.GRAPH_CLIENT_ID,
  env.GRAPH_CLIENT_SECRET
);

export const graphClient = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken("https://graph.microsoft.com/.default");
      return token?.token ?? "";
    }
  }
});