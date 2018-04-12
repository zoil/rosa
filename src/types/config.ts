import * as SockJS from "sockjs";
import * as Redis from "redis";
import { Server } from "http";

export interface ConfigType {
  httpServer: Server;
  redis?: Redis.ClientOpts;
  sockjs?: SockJS.ServerOptions;
  redisClient?: any;
  authentication?: {
    handshakeTimeout?: number;
    sessionTimeout?: number;
    requestSignatureTimeout?: number;
  };
}
