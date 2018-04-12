import * as Promise from "bluebird";
import { Service, Inject } from "typedi";

// Types
import { RedisClientType } from "../../types/redis";
import { StringMap } from "../../types/general";

// Services
import { RedisClient } from "../redis-client";
import { QueryId } from "rosa-shared";
import { QueryTag } from "../../types/query";

/**
 * Singleton Service to maintain the n:n relation between QueryId and RequestTag.
 *
 * Requests may provide RequestTags, which identify the results related to them.
 * After an Action has applied a data change, it provides a set of Tags, which will
 * be matched to Tags provided by Requests. When any overlapping Tags are detected
 * in a Request, it will be invalidated and triggered to execute once more.
 */
@Service()
export default class QueryTagsService {
  /**
   * Inject Dependencies.
   */
  @Inject(RedisClient) private redisClient!: RedisClientType;

  /**
   * Return the Redis key of the QueryId SET for `tag`.
   */
  private getKeyForTag(tag: QueryTag) {
    return `tag:${tag}:queries`;
  }

  /**
   * Return the Redis key of the Tags SET for `queryId`.
   */
  private getKeyForQueryId(queryId: QueryId) {
    return `query:${queryId}:tags`;
  }

  /**
   * Return all Tags for `queryId`.
   */
  getTagsForQueryId(queryId: QueryId): Promise<QueryTag[]> {
    const key = this.getKeyForQueryId(queryId);
    return this.redisClient.smembersAsync(key);
  }

  /**
   * Return all QueryIds for `tag`.
   */
  getQueryIdsForTag(tag: string): Promise<QueryId[]> {
    const key = this.getKeyForTag(tag);
    return this.redisClient.smembersAsync(key);
  }

  /**
   * Return all QueryIds for `tags`.
   */
  getQueryIdsForTags(tags: QueryTag[]): Promise<QueryId[]> {
    const tagKeys = tags.map(tag => this.getKeyForTag(tag));
    return this.redisClient.sunionAsync(tagKeys);
  }

  /**
   * Bind `queryId` with `tag`.
   */
  update(queryId: QueryId, tags: QueryTag[]) {
    const key = this.getKeyForQueryId(queryId);
    return this.getTagsForQueryId(queryId).then((currentTags: QueryTag[]) => {
      // calculate keys for `tags`
      const tagKeys: StringMap = Object.create(null);
      tags.forEach((tag: QueryTag) => {
        tagKeys[tag] = this.getKeyForTag(tag);
      });

      // start Redis.Multi
      const redis = this.redisClient.multi();

      // add missing tags
      const missingTags = tags.filter(e => !currentTags.includes(e));
      missingTags.forEach(tag => {
        redis.sadd(key, tag);
        const tagKey = tagKeys[tag];
        redis.sadd(tagKey, queryId);
      });

      // remove obsolete tags
      const obsoleteTags = currentTags.filter(e => !tags.includes(e));
      obsoleteTags.forEach(tag => {
        redis.srem(key, tag);
        const tagKey = tagKeys[tag];
        redis.srem(tagKey, queryId);
      });

      // exec Redis.Multi
      return redis.execAsync();
    });
  }

  /**
   * Delete all bindings of `queryId`.
   */
  cleanupQueryId(queryId: QueryId) {
    this.update(queryId, []).then(() => {
      const key = this.getKeyForQueryId(queryId);
      return this.redisClient.delAsync(key);
    });
  }
}
