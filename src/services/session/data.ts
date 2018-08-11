// Types
import { SessionId } from "rosa-shared";
import { SessionDataAccessor } from "../../types/session";
import { IPromiseRedisClient } from "../../types/redis";

export class SessionData implements SessionDataAccessor {
  /**
   * The Redis Hash key for this.sessionId.
   * This is set by this.setSessionId().
   */
  private dataKey: string;

  /**
   * The Session Id for `this`.
   */
  private sessionId: SessionId;

  constructor(private redisClient: IPromiseRedisClient, sessionId: SessionId) {
    this.sessionId = sessionId;
    this.dataKey = `session:${sessionId}:data`;
  }

  /**
   * Return the SessionId.
   */
  getSessionId(): SessionId {
    return this.sessionId;
  }

  /**
   * Delete all data of `sessionId`.
   */
  async flush(): Promise<void> {
    await this.redisClient.del(this.dataKey);
    delete this.dataKey;
    delete this.sessionId;
  }

  /**
   * Return the value for `key`.
   */
  async get(key: string) {
    const resultJSON = await this.redisClient.hget(this.dataKey, key);
    try {
      return JSON.parse(resultJSON);
    } catch (err) {
      return null;
    }
  }

  /**
   * Set `value` for `key`.
   */
  async set(key: string, value: any) {
    const valueJSON = JSON.stringify(value);
    return this.redisClient.hset(this.dataKey, key, valueJSON);
  }

  /**
   * Delete `key`.
   */
  async del(key: string) {
    return this.redisClient.hdel(this.dataKey, key);
  }

  /**
   * Increment any existing value by `value` for `key`.
   */
  async incr(key: string, value: number) {
    return this.redisClient.hincrby(this.dataKey, key, value);
  }
}
