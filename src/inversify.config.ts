import { Container } from "inversify";

import Config from "./config";
import ActionStoreService from "./services/action/store";
import PublicationStoreService from "./services/publication/store";
import PublicationSubscribeService from "./services/publication/subscribe";
import ActionExecuteService from "./services/action/execute";
import { WebsocketServer } from "./services/sockjs-server";

import * as Services from "./types/di";
import { ConfigType } from "./types/config";
import {
  IPromiseRedisClient,
  RedisClientFactory
} from "./services/redis-client";
import WebsocketConnectionFactory from "./services/websocket/connection";
import { ProtocolHandshakeFactory } from "./protocols/handshake";
import { ProtocolV1Factory } from "./protocols/v1";
import ConnectionSubscriptionsService from "./services/connection/subscriptions";
import {
  IProtocolMessageReceiver,
  IProtocolMessageEmitter
} from "./types/protocols";
import { ProtocolV1Anon } from "./services/protocols/receive/v1-anon";
import { Protocols } from "rosa-shared";
import { ProtocolsEmitMessageV1 } from "./services/protocols/emit-message/v1";
import { ProtocolsEmitMessageHandshake } from "./services/protocols/emit-message/handshake";
import { ProtocolReceiveHandshake } from "./services/protocols/receive/handshake";

/**
 * Inversion Of Control class container
 */
export class Kernel extends Container {
  constructor(config: ConfigType) {
    super();

    // Configuration
    const configInstance = new Config();
    configInstance.init(config);
    this.bind<Config>(Services.TConfig).toConstantValue(configInstance);

    // Utils
    [Services.TRedisClient, Services.TRedisClientSub].forEach(diType => {
      const redisClient = RedisClientFactory(
        configInstance
      ) as IPromiseRedisClient;
      this.bind<IPromiseRedisClient>(diType).toConstantValue(redisClient);
    });

    // Protocols
    this.bind<Services.IProtocolFactory>(Services.TWebsocketProtocolFactory)
      .to(ProtocolHandshakeFactory)
      .inSingletonScope()
      .whenTargetTagged(Services.ProtocolTag, Services.ProtocolTags.Handshake);
    this.bind<Services.IProtocolFactory>(Services.TWebsocketProtocolFactory)
      .to(ProtocolV1Factory)
      .inSingletonScope()
      .whenTargetTagged(Services.ProtocolTag, Services.ProtocolTags.V1);

    // Server
    this.bind<WebsocketServer>(Services.TWebsocketServer).to(WebsocketServer);
    this.bind<WebsocketConnectionFactory>(Services.TWebsocketConnectionFactory)
      .to(WebsocketConnectionFactory)
      .inSingletonScope();

    // Publications
    this.bind<PublicationStoreService>(Services.TPublicationStore)
      .to(PublicationStoreService)
      .inSingletonScope();
    this.bind<PublicationSubscribeService>(Services.TPublicationSubscribe)
      .to(PublicationSubscribeService)
      .inSingletonScope();

    // Actions
    this.bind<ActionStoreService>(Services.TActionStore)
      .to(ActionStoreService)
      .inSingletonScope();
    this.bind<ActionExecuteService>(Services.TExecuteAction)
      .to(ActionExecuteService)
      .inSingletonScope();

    // Connections
    this.bind<ConnectionSubscriptionsService>(Services.TConnectionSubscriptions)
      .to(ConnectionSubscriptionsService)
      .inSingletonScope();

    // Protocols / Receivers
    this.bind<IProtocolMessageReceiver>(Services.TProtocolMessageReceiver)
      .to(ProtocolReceiveHandshake)
      .inSingletonScope()
      .whenTargetNamed(Protocols.Handshake.ID);
    this.bind<IProtocolMessageReceiver>(Services.TProtocolMessageReceiver)
      .to(ProtocolV1Anon)
      .inSingletonScope()
      .whenTargetNamed(Protocols.V1.ID);

    // Protocols / Emitters
    this.bind<IProtocolMessageEmitter>(Services.TProtocolMessageEmitter)
      .to(ProtocolsEmitMessageHandshake)
      .inSingletonScope()
      .whenTargetNamed(Protocols.Handshake.ID);
    this.bind<IProtocolMessageEmitter>(Services.TProtocolMessageEmitter)
      .to(ProtocolsEmitMessageV1)
      .inSingletonScope()
      .whenTargetNamed(Protocols.V1.ID);
  }
}
