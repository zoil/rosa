import * as Promise from "bluebird";
import { Service, Inject } from "typedi";

// Types
import { RedisClientType } from "../../types/redis";
import { QueryId, QueryParams } from "rosa-shared";

// Services
import { RedisClient } from "../redis-client";
import { PublicationName } from "rosa-shared";

// const KEY_VERSION = "version";
const KEY_PUBLICATION = "publication";
const KEY_PARAMS = "params";
// const KEY_CURRENT_DATA = "current";

/**
 * Singleton Service to access Meta Data of Query entities.
 */
@Service()
export default class QueryMetaService {
  /**
   * Inject Dependencies.
   */
  @Inject(RedisClient) private redisClient!: RedisClientType;

  /**
   * Return the Redis key for `queryId`.
   */
  private getKey(queryId: QueryId) {
    return `query:${queryId}`;
  }

  /**
   * Returns true if queryId exists.
   */
  exists(queryId: QueryId): Promise<boolean> {
    const key = this.getKey(queryId);
    return this.redisClient.existsAsync(key).then((exists: number) => !!exists);
  }

  /**
   * Set `params` for `queryId`.
   * @todo isPlainObject()
   */
  create(
    queryId: QueryId,
    publicationName: PublicationName,
    params: QueryParams
  ) {
    const multi = this.redisClient.multi();

    const key = this.getKey(queryId);
    const paramsJson = JSON.stringify(params);
    multi.hset(key, KEY_PARAMS, paramsJson);

    multi.hset(key, KEY_PUBLICATION, publicationName);

    return multi.execAsync();
  }

  /**
   * Return the params of `queryId`.
   */
  getParams(queryId: QueryId) {
    const key = this.getKey(queryId);
    return this.redisClient
      .hgetAsync(key, KEY_PARAMS)
      .then(params => JSON.parse(params));
  }

  /**
   * Return the PublicationId for `queryId`.
   */
  getPublicationIdAndParams(queryId: QueryId) {
    const key = this.getKey(queryId);
    return this.redisClient
      .hmgetAsync(key, [KEY_PUBLICATION, KEY_PARAMS])
      .then(([publicationId, queryParams]) => ({
        publicationId,
        queryParams: JSON.parse(queryParams)
      }));
  }

  /**
   * Delete all data for `queryId`.
   */
  cleanup(queryId: QueryId) {
    const key = this.getKey(queryId);
    return this.redisClient.delAsync(key);
  }
}
