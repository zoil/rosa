import * as Redis from "redis";
import { promisify } from "util";

import Config from "../config";
import { IPromiseRedisClient } from "../types/redis";

export function RedisClientFactory(
  config: Config
): IPromiseRedisClient | Redis.RedisClient {
  const redisInstance =
    config.redisInstance || Redis.createClient(config.redis);

  const client = Object.create(null);
  const redisCommands = require("redis-commands");
  redisCommands.list.forEach((command: string) => {
    client[command] = promisify(redisInstance[command]).bind(redisInstance);
  });

  return client;
}
