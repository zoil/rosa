import "reflect-metadata";

// Inversify
import { Kernel } from "./inversify.config";
import { ConfigType } from "./types/config";

// Services
import * as Services from "./types/di";
import PublicationStoreService from "./services/publication/store";
import ActionStoreService from "./services/action/store";
import WebsocketServer from "./services/sockjs-server";

// export imports
export * from "./types/publication";
export * from "./types/identity";
export * from "./types/action";

/**
 * Instantiate a new Rosa Server.
 */
export function Rosa(config: ConfigType) {
  const iocKernel = new Kernel(config);
  const server = iocKernel.get<WebsocketServer>(Services.TWebsocketServer);
  server.init();

  const publications = iocKernel.get<PublicationStoreService>(
    Services.TPublicationStore
  );
  const actions = iocKernel.get<ActionStoreService>(Services.TActionStore);

  return {
    // socket server
    connectionCount: server.connectionCount,

    // endpoints
    publish: publications.addPublication.bind(publications),
    action: actions.addAction.bind(actions)
  };
}
