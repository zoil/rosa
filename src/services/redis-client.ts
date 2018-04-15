import * as Redis from "redis";
import * as Promise from "bluebird";
import { Token } from "typedi";

// Services
import Config from "../config";

/**
 * Singleton Service providing a RedisClient.
 */
export const RedisClient = new Token<Redis.RedisClient>();

export const RedisClientSub = new Token<Redis.RedisClient>();

export function redisClientFactory(config: Config): Redis.RedisClient | any {
  if (config.redisInstance) {
    const redisInstance = config.redisInstance as Redis.RedisClient;
    Promise.promisifyAll(redisInstance);
    Promise.promisifyAll(redisInstance.multi);
    return redisInstance;
  }
  Promise.promisifyAll(Redis.Multi.prototype);
  Promise.promisifyAll(Redis.RedisClient.prototype);
  return Redis.createClient(config.redis);
}
