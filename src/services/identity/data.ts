// Types
import { IdentityDataAccessor, IdentityId } from "../../types/identity";
import { IPromiseRedisClient } from "../../types/redis";

export class IdentityData implements IdentityDataAccessor {
  /**
   * The Redis Hash key for this.identityId.
   */
  private dataKey: string;

  /**
   * The Identity Id for `this`.
   */
  private identityId: IdentityId;

  constructor(
    private redisClient: IPromiseRedisClient,
    identityId: IdentityId
  ) {
    this.identityId = identityId;
    this.dataKey = `identity:${identityId}:data`;
  }

  /**
   * Return the IdentityId bound to this.
   */
  getIdentityId(): IdentityId {
    return this.identityId;
  }

  /**
   * Delete all data of `this.identityId`.
   */
  async flush(): Promise<void> {
    await this.redisClient.del(this.dataKey);
    delete this.dataKey;
    delete this.identityId;
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
