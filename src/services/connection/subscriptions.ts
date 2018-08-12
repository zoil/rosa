import { injectable, inject } from "inversify";
import { QueryId } from "rosa-shared";

// Types
import { TRedisClient } from "../../types/di";
import { IPromiseRedisClient } from "../../types/redis";
import { ConnectionId } from "../../types/connection";

/**
 * Singleton Service to maintain the n:n relation between
 * Queries and Connections.
 *
 * Connections must be aware what Queries they are subscribed to.
 * Queries must be aware which Connections are subscribed to it.
 */
@injectable()
export default class ConnectionSubscriptionsService {
  /**
   * Return the Redis key of the SET of QueryIdes for `connectionId`.
   */
  private getKeyForConnection(connectionId: ConnectionId): string {
    return `c:${connectionId}:q`;
  }

  /**
   * Return the Redis key of the SET of ConnectionIds for `queryId`.
   */
  private getKeyForQueryId(queryId: QueryId): string {
    return `q:${queryId}:c`;
  }

  constructor(@inject(TRedisClient) private redisClient: IPromiseRedisClient) {}

  /**
   * Bind `queryId` with `connectionId`.
   */
  async bind(connectionId: ConnectionId, queryId: QueryId): Promise<void> {
    const connectionKey = this.getKeyForConnection(connectionId);
    const queryKey = this.getKeyForQueryId(queryId);
    const multi = this.redisClient.multi();
    multi.sadd(connectionKey, queryId);
    multi.sadd(queryKey, connectionId);
    return multi.exec();
  }

  /**
   * Unbind `queryId` from `connectionId`.
   */
  async unbind(connectionId: ConnectionId, queryId: QueryId): Promise<void> {
    const connectionKey = this.getKeyForConnection(connectionId);
    const queryKey = this.getKeyForQueryId(queryId);
    const multi = this.redisClient.multi();
    multi.srem(connectionKey, queryId);
    multi.srem(queryKey, connectionId);
    return multi.exec();
  }

  /**
   * Return QueryIdes for `connectionId`.
   */
  async getQueryIdsForConnection(
    connectionId: ConnectionId
  ): Promise<QueryId[]> {
    const key = this.getKeyForConnection(connectionId);
    return this.redisClient.smembers(key);
  }

  /**
   * Return ConnectionIds for `queryId`.
   */
  async getConnectionIdsForQueryId(queryId: QueryId): Promise<ConnectionId[]> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.smembers(key);
  }

  /**
   * Return 1 ConnectionId for `queryId`.
   */
  async getOneConnectionForQueryId(queryId: QueryId): Promise<ConnectionId> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.srandmember(key);
  }

  /**
   * Delete all bindings of `connectionId`.
   */
  async cleanupConnection(connectionId: ConnectionId): Promise<void> {
    const queryIds = await this.getQueryIdsForConnection(connectionId);
    const redis = this.redisClient.multi();

    // remove `connectionId from all queryId sets
    queryIds.forEach(
      (queryId: QueryId): void => {
        const queryKey = this.getKeyForQueryId(queryId);
        redis.del(queryKey);
      }
    );

    // delete the set for `connectionId` itself
    const connectionKey = this.getKeyForConnection(connectionId);
    redis.del(connectionKey);

    // execute all above
    return redis.exec();
  }
}
