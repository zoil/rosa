import { Service } from "typedi";
import { ConfigType } from "./types/config";

import { Server } from "http";
import * as Redis from "redis";
import * as SockJS from "sockjs";

/**
 * Singleton Service to store and provide the app configuration.
 */
@Service()
export default class Config {
  httpServer!: Server;
  redisInstance: any;
  redis: Redis.ClientOpts = {
    host: "localhost"
  };
  redisClient?: any;
  sockjs: SockJS.ServerOptions = {};
  authentication = {
    handshakeTimeout: 5000,
    sessionTimeout: 1000,
    requestSignatureTimeout: 60000,
    inactiveSessionExpiry: 60,
    activeSessionExpiry: 86400
  };

  init(config: ConfigType) {
    this.httpServer = config.httpServer;
    this.redis = { ...this.redis, ...config.redis };
    this.sockjs = { ...this.sockjs, ...config.sockjs };
  }
}
