import { Inject, Service } from "typedi";
import * as Promise from "bluebird";

// Types
import { RedisClientType } from "../../types/redis";
import { QueryId, SessionId } from "rosa-shared";

// Services
import { RedisClient } from "../redis-client";

/**
 * Singleton Service to maintain the n:n relation between
 * Queries and Sessions.
 *
 * Sessions must be aware what Queries they are subscribed to.
 * Queries must be aware which Sessions are subscribed to it.
 */
@Service()
export default class SessionSubscriptionsService {
  /**
   * Inject Dependencies.
   */
  @Inject(RedisClient) private redisClient!: RedisClientType;

  /**
   * Return the Redis key of the SET of QueryIdes for `sessionId`.
   */
  private getKeyForSession(sessionId: SessionId): string {
    return `session:${sessionId}:wables`;
  }

  /**
   * Return the Redis key of the SET of SessionIds for `queryId`.
   */
  private getKeyForQueryId(queryId: QueryId): string {
    return `wable:${queryId}:sessions`;
  }

  /**
   * Bind `queryId` with `sessionId`.
   */
  bind(sessionId: SessionId, queryId: QueryId): Promise<void> {
    const sessionKey = this.getKeyForSession(sessionId);
    const queryKey = this.getKeyForQueryId(queryId);
    const multi = this.redisClient.multi();
    multi.sadd(sessionKey, queryId).sadd(queryKey, sessionId);
    return multi.execAsync();
  }

  /**
   * Unbind `queryId` from `sessionId`.
   */
  unbind(sessionId: SessionId, queryId: QueryId): Promise<void> {
    const sessionKey = this.getKeyForSession(sessionId);
    const queryKey = this.getKeyForQueryId(queryId);
    const multi = this.redisClient.multi();
    multi.srem(sessionKey, queryId).srem(queryKey, sessionId);
    return multi.execAsync();
  }

  /**
   * Return QueryIdes for `sessionId`.
   */
  getQueryIdsSession(sessionId: SessionId): Promise<QueryId[]> {
    const key = this.getKeyForSession(sessionId);
    return this.redisClient.smembersAsync(key);
  }

  /**
   * Return SessionIds for `queryId`.
   */
  getSessionsForQueryId(queryId: QueryId): Promise<SessionId[]> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.smembersAsync(key);
  }

  /**
   * Return 1 SessionId for `queryId`.
   */
  getOneSessionForQueryId(queryId: QueryId): Promise<SessionId> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.srandmemberAsync(key);
  }

  /**
   * Delete all bindings of `sessionId`.
   */
  cleanupSession(sessionId: SessionId): Promise<void> {
    return this.getQueryIdsSession(sessionId).then((queryIdes: QueryId[]) => {
      const redis = this.redisClient.multi();

      // remove `sessionId from all queryId sets
      queryIdes.forEach((queryId: QueryId): void => {
        const queryKey = this.getKeyForQueryId(queryId);
        redis.del(queryKey);
      });

      // delete the set for `sessionId` itself
      const sessionKey = this.getKeyForSession(sessionId);
      redis.del(sessionKey);

      // execute all above
      return redis.execAsync();
    });
  }
}
