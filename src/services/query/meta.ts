import { injectable, inject } from "inversify";
import { QueryId, QueryParams, PublicationName } from "rosa-shared";

// Types
import { TRedisClient } from "../../types/di";
import { IPromiseRedisClient } from "../../types/redis";

// const KEY_VERSION = "version";
export const KEY_PUBLICATION = "publication";
export const KEY_PARAMS = "params";
// const KEY_CURRENT_DATA = "current";

/**
 * Singleton Service to access Meta Data of Query entities.
 */
@injectable()
export default class QueryMetaService {
  /**
   * Return the Redis key for `queryId`.
   */
  private getKey(queryId: QueryId) {
    return `q:${queryId}`;
  }

  /**
   * Inject Dependencies.
   */
  constructor(@inject(TRedisClient) private redisClient: IPromiseRedisClient) {}

  /**
   * Returns true if queryId exists.
   */
  async exists(queryId: QueryId): Promise<boolean> {
    const key = this.getKey(queryId);
    const exists = await this.redisClient.exists(key);
    return !!exists;
  }

  /**
   * Set `params` for `queryId`.
   * @todo isPlainObject()
   */
  async create(
    queryId: QueryId,
    publicationName: PublicationName,
    params: QueryParams
  ) {
    const multi = this.redisClient.multi();

    const key = this.getKey(queryId);
    const paramsJson = JSON.stringify(params);
    multi.hset(key, KEY_PARAMS, paramsJson);

    multi.hset(key, KEY_PUBLICATION, publicationName);

    return multi.exec();
  }

  /**
   * Return the params of `queryId`.
   */
  async getParams(queryId: QueryId) {
    const key = this.getKey(queryId);
    const params = await this.redisClient.hget(key, KEY_PARAMS);
    return JSON.parse(params);
  }

  /**
   * Return the PublicationId for `queryId`.
   */
  async getPublicationIdAndParams(queryId: QueryId) {
    const key = this.getKey(queryId);
    const [publicationId, queryParams] = await this.redisClient.hmget(key, [
      KEY_PUBLICATION,
      KEY_PARAMS
    ]);
    return {
      publicationId,
      queryParams: JSON.parse(queryParams)
    };
  }

  /**
   * Delete all data for `queryId`.
   */
  async cleanup(queryId: QueryId) {
    const key = this.getKey(queryId);
    return this.redisClient.del(key);
  }
}
