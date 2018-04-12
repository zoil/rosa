import { Inject, Service } from "typedi";
import * as Promise from "bluebird";

// Types
import { SessionId } from "rosa-shared";
import { SessionDataAccessor } from "../../types/session";
import { RedisClientType } from "../../types/redis";

// Services
import { RedisClient } from "../redis-client";

/**
 * Factory Service for creating SessionData instances.
 * They are used to get access to Session variables throughout
 * all components.
 */
@Service()
export class SessionDataFactory {
  /**
   * Inject Dependencies.
   */
  @Inject(RedisClient) private redisClient!: RedisClientType;

  /**
   * Factory method to create `SessionData`s.
   */
  create(sessionId: SessionId): SessionData {
    return new SessionData(this.redisClient, sessionId);
  }
}

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

  /**
   * Make sure the `init()` method was called already.
   */
  private checkInit() {
    if (!this.dataKey) {
      throw new Error("Unknown session id.");
    }
  }

  constructor(private redisClient: RedisClientType, sessionId: SessionId) {
    this.sessionId = sessionId;
    this.dataKey = `session:${sessionId}:data`;
  }

  /**
   * Return the SessionId.
   */
  getSessionId(): SessionId {
    this.checkInit();
    return this.sessionId;
  }

  /**
   * Delete all data of `sessionId`.
   */
  flush(): Promise<void> {
    this.checkInit();
    return this.redisClient.delAsync(this.dataKey).then(() => {
      delete this.dataKey;
      delete this.sessionId;
    });
  }

  /**
   * Return the value for `key`.
   */
  get(key: string) {
    this.checkInit();
    return this.redisClient
      .hgetAsync(this.dataKey, key)
      .then((resultJSON: string) => {
        try {
          return JSON.parse(resultJSON);
        } catch (err) {
          return null;
        }
      });
  }

  /**
   * Set `value` for `key`.
   */
  set(key: string, value: any) {
    this.checkInit();
    return Promise.try(() => {
      const valueJSON = JSON.stringify(value);
      return this.redisClient.hsetAsync(this.dataKey, key, valueJSON);
    });
  }

  /**
   * Delete `key`.
   */
  del(key: string) {
    this.checkInit();
    return this.redisClient.hdelAsync(this.dataKey, key);
  }

  /**
   * Increment any existing value by `value` for `key`.
   */
  incr(key: string, value: number) {
    this.checkInit();
    return this.redisClient.hincrbyAsync(this.dataKey, key, value);
  }

  /**
   * Increment any existing value by `value` for `key`.
   */
  incrByFloat(key: string, value: number) {
    this.checkInit();
    return this.redisClient.hincrbyfloatAsync(this.dataKey, key, value);
  }
}
