import "reflect-metadata";
import { Container } from "typedi";

import { ConfigType } from "./types/config";
import Config from "./config";

import PublicationStoreService from "./services/publication/store";
import ActionStoreService from "./services/action/store";
import WebsocketServer from "./services/websocket/server";
import {
  RedisClient,
  RedisClientSub,
  redisClientFactory
} from "./services/redis-client";

export * from "./types/publication";
export * from "./types/session";
export * from "./types/action";

export function Rosa(config: ConfigType) {
  const configInstance = Container.get(Config);
  configInstance.init(config);

  // Create the Read/Write...
  const redisClient = redisClientFactory(configInstance);
  Container.set(RedisClient, redisClient);
  // ...and the Subscribe-only Redis clients
  const redisClientSub = redisClientFactory(configInstance);
  Container.set(RedisClientSub, redisClientSub);

  // Create and wire up the SockJS server
  const server = Container.get(WebsocketServer);
  server.init();

  // then expose the public methods
  const publications = Container.get(PublicationStoreService);
  const actions = Container.get(ActionStoreService);

  return {
    // socket server
    connectionCount: server.connectionCount,

    // endpoints
    publish: publications.addPublication.bind(publications),
    action: actions.addAction.bind(actions)
  };
}
