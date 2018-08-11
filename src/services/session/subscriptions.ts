import { injectable, inject } from "inversify";
import { QueryId, SessionId } from "rosa-shared";

// Types
import { TRedisClient } from "../../types/di";
import { IPromiseRedisClient } from "../../types/redis";

/**
 * Singleton Service to maintain the n:n relation between
 * Queries and Sessions.
 *
 * Sessions must be aware what Queries they are subscribed to.
 * Queries must be aware which Sessions are subscribed to it.
 */
@injectable()
export default class SessionSubscriptionsService {
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

  constructor(@inject(TRedisClient) private redisClient: IPromiseRedisClient) {}

  /**
   * Bind `queryId` with `sessionId`.
   */
  bind(sessionId: SessionId, queryId: QueryId): Promise<void> {
    const sessionKey = this.getKeyForSession(sessionId);
    const queryKey = this.getKeyForQueryId(queryId);
    const multi = this.redisClient.multi();
    multi.sadd(sessionKey, queryId);
    multi.sadd(queryKey, sessionId);
    return multi.exec();
  }

  /**
   * Unbind `queryId` from `sessionId`.
   */
  unbind(sessionId: SessionId, queryId: QueryId): Promise<void> {
    const sessionKey = this.getKeyForSession(sessionId);
    const queryKey = this.getKeyForQueryId(queryId);
    const multi = this.redisClient.multi();
    multi.srem(sessionKey, queryId);
    multi.srem(queryKey, sessionId);
    return multi.exec();
  }

  /**
   * Return QueryIdes for `sessionId`.
   */
  getQueryIdsSession(sessionId: SessionId): Promise<QueryId[]> {
    const key = this.getKeyForSession(sessionId);
    return this.redisClient.smembers(key);
  }

  /**
   * Return SessionIds for `queryId`.
   */
  getSessionsForQueryId(queryId: QueryId): Promise<SessionId[]> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.smembers(key);
  }

  /**
   * Return 1 SessionId for `queryId`.
   */
  getOneSessionForQueryId(queryId: QueryId): Promise<SessionId> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.srandmember(key);
  }

  /**
   * Delete all bindings of `sessionId`.
   */
  async cleanupSession(sessionId: SessionId): Promise<void> {
    const queryIds = await this.getQueryIdsSession(sessionId);
    const redis = this.redisClient.multi();

    // remove `sessionId from all queryId sets
    queryIds.forEach(
      (queryId: QueryId): void => {
        const queryKey = this.getKeyForQueryId(queryId);
        redis.del(queryKey);
      }
    );

    // delete the set for `sessionId` itself
    const sessionKey = this.getKeyForSession(sessionId);
    redis.del(sessionKey);

    // execute all above
    return redis.exec();
  }
}
