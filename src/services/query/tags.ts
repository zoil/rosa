import { QueryId } from "rosa-shared";
import { injectable, inject } from "inversify";

// Types
import { StringMap } from "../../types/general";
import { TRedisClient } from "../../types/di";
import { QueryTag } from "../../types/query";
import { IPromiseRedisClient } from "../../types/redis";

/**
 * Singleton Service to maintain the n:n relation between QueryId and RequestTag.
 *
 * Requests may provide RequestTags, which identify the results related to them.
 * After an Action has applied a data change, it provides a set of Tags, which will
 * be matched to Tags provided by Requests. When any overlapping Tags are detected
 * in a Request, it will be invalidated and triggered to execute once more.
 */
@injectable()
export default class QueryTagsService {
  /**
   * Return the Redis key of the QueryId SET for `tag`.
   */
  private getKeyForTag(tag: QueryTag) {
    return `t:${tag}:q`;
  }

  /**
   * Return the Redis key of the Tags SET for `queryId`.
   */
  private getKeyForQueryId(queryId: QueryId) {
    return `q:${queryId}:t`;
  }

  /**
   * Inject Dependencies.
   */
  constructor(@inject(TRedisClient) private redisClient: IPromiseRedisClient) {}

  /**
   * Return all Tags for `queryId`.
   */
  async getTagsForQueryId(queryId: QueryId): Promise<QueryTag[]> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.smembers(key);
  }

  /**
   * Return all QueryIds for `tag`.
   */
  async getQueryIdsForTag(tag: string): Promise<QueryId[]> {
    const key = this.getKeyForTag(tag);
    return this.redisClient.smembers(key);
  }

  /**
   * Return all QueryIds for `tags`.
   */
  async getQueryIdsForTags(tags: QueryTag[]): Promise<QueryId[]> {
    const tagKeys = tags.map(tag => this.getKeyForTag(tag));
    return this.redisClient.sunion(tagKeys);
  }

  /**
   * Bind `queryId` with `tag`.
   */
  async update(queryId: QueryId, tags: QueryTag[]) {
    const queryKey = this.getKeyForQueryId(queryId);

    // calculate keys for `tags`
    const currentTags: QueryTag[] = await this.getTagsForQueryId(queryId);
    const tagKeys: StringMap = Object.create(null);
    tags.forEach((tag: QueryTag) => {
      tagKeys[tag] = this.getKeyForTag(tag);
    });

    // start Redis.Multi
    const redis = this.redisClient.multi();

    // add missing tags
    const missingTags = tags.filter(e => !currentTags.includes(e));
    missingTags.forEach(tag => {
      redis.sadd(queryKey, tag);
      const tagKey = tagKeys[tag];
      redis.sadd(tagKey, queryId);
    });

    // remove obsolete tags
    const obsoleteTags = currentTags.filter(e => !tags.includes(e));
    obsoleteTags.forEach(tag => {
      redis.srem(queryKey, tag);
      const tagKey = tagKeys[tag];
      redis.srem(tagKey, queryId);
    });

    // exec Redis.Multi
    return redis.exec();
  }

  /**
   * Delete all bindings of `queryId`.
   */
  async cleanupQueryId(queryId: QueryId) {
    await this.update(queryId, []);
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.del(key);
  }
}
