import { injectable, inject } from "inversify";
import * as shortid from "shortid";
import * as crypto from "crypto";
import sha1 = require("sha1");

// Types
import { TConfig, TRedisClient } from "../../types/di";
import { IPromiseRedisClient } from "../../types/redis";
import { IdentityId } from "../../types/identity";

// Services
import Config from "../../config";

export const KEY_IDENTITY_SECRET = "secret";
export const KEY_EXPIRY = "expiry";
export const ZKEY_EXPIRING_IDENTITIES = "ex_idn";

/**
 * This Service deals with any Meta Data related to Identities,
 * eg. the Secret Key of them.
 */
@injectable()
export default class IdentityMetaService {
  /**
   * Inject Dependencies.
   */
  @inject(TConfig)
  private config!: Config;
  @inject(TRedisClient)
  private redisClient!: IPromiseRedisClient;

  /**
   * Return the Redis key for the HASH of `identityId`.
   */
  private getKey(identityId: IdentityId): string {
    return `identity:${identityId}`;
  }

  /**
   * Set `secret` for `identityId`.
   */
  private async setSecret(identityId: IdentityId, secret: string) {
    const key = this.getKey(identityId);
    return this.redisClient.hset(key, KEY_IDENTITY_SECRET, secret);
  }

  /**
   * Return the `secret` for `identityId`.
   */
  private async getSecret(identityId: IdentityId): Promise<string> {
    const key = this.getKey(identityId);
    return this.redisClient.hget(key, KEY_IDENTITY_SECRET);
  }

  /**
   * Return the `secret` for `identityId`.
   */
  // private getExpiry(identityId: IdentityId): Promise<number> {
  //   const key = this.getKey(identityId);
  //   return this.redisClient.hgetAsync(key, KEY_EXPIRY);
  // }

  /**
   * Create a new identity.
   * Generate a unique id and a secret, store it in Redis and tell them to the client.
   */
  async createNewIdentity(): Promise<{ id: IdentityId; secret: string }> {
    const id: IdentityId = <IdentityId>shortid.generate();
    const secret = crypto.randomBytes(64).toString("hex");
    // TODO: repeat until identity id is unique and not found
    await this.setSecret(id, secret);
    return {
      id,
      secret
    };
  }

  generateSignature(
    identityId: IdentityId,
    secret: string,
    timestamp: number
  ): string {
    return sha1(`${identityId}_${secret}_${timestamp}`).toString();
  }

  /**
   * Authenticate the client based on the attributes.
   * Create a new identity if attribs can't be validated.
   */
  async authenticate(
    identityId: IdentityId,
    signature: string,
    timestamp: number
  ): Promise<string> {
    const secret = await this.getSecret(identityId);
    if (!secret) {
      throw new Error(`Unknown identity ${identityId}`);
    }
    const currentTimestamp = new Date().getTime();
    const signatureChallenge = this.generateSignature(
      identityId,
      secret,
      timestamp
    );
    if (signatureChallenge !== signature) {
      throw new Error(
        `Invalid signature ${signature} instead of ${signatureChallenge}`
      );
    } else if (
      currentTimestamp - timestamp >
      this.config.authentication.requestSignatureTimeout
    ) {
      throw new Error(`Expired signature ${currentTimestamp} ${timestamp}`);
    } else {
      return identityId;
    }
  }

  /**
   * @todo
   */
  async resetExpiry(identityId: IdentityId, isActive: boolean): Promise<void> {
    const metaKey = this.getKey(identityId);
    const multi = this.redisClient.multi();
    const seconds = isActive
      ? this.config.authentication.activeIdentityExpiry
      : this.config.authentication.inactiveIdentityExpiry;
    multi.expire(metaKey, seconds);

    const expiry = new Date().getTime() / 1000 + seconds;
    multi.hset(metaKey, KEY_EXPIRY, expiry.toString());

    multi.zadd(ZKEY_EXPIRING_IDENTITIES, expiry, identityId);
    return multi.exec();
  }

  /**
   * Delete all data for `identityId`.
   */
  async cleanup(identityId: IdentityId) {
    const key = this.getKey(identityId);
    return this.redisClient.del(key);
  }
}
