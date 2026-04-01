import "isomorphic-fetch";

import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

import { appConfig } from "../../config";

export function createGraphClient(): Client {
  const credential = new ClientSecretCredential(
    appConfig.graph.tenantId,
    appConfig.graph.clientId,
    appConfig.graph.clientSecret
  );

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken(appConfig.graph.scope);
        return token?.token ?? "";
      }
    }
  });
}