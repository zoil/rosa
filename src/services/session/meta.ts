import { injectable, inject } from "inversify";
import * as shortid from "shortid";
import * as crypto from "crypto";
import sha1 = require("sha1");

// Types
import { SessionId } from "rosa-shared";

// Services
import Config from "../../config";
import { TConfig, TRedisClient } from "../../types/di";
import { IPromiseRedisClient } from "../../types/redis";

export const KEY_SESSION_SECRET = "secret";
export const KEY_EXPIRY = "expiry";
export const ZKEY_EXPIRING_SESSIONS = "ex_sess";

/**
 * This Service deals with any Meta Data related to Sessions,
 * eg. the Secret Key of them.
 */
@injectable()
export default class SessionMetaService {
  /**
   * Inject Dependencies.
   */
  @inject(TConfig)
  private config!: Config;
  @inject(TRedisClient)
  private redisClient!: IPromiseRedisClient;

  /**
   * Return the Redis key for the HASH of `sessionId`.
   */
  private getKey(sessionId: SessionId): string {
    return `session:${sessionId}`;
  }

  /**
   * Set `secret` for `sessionId`.
   */
  private setSecret(sessionId: SessionId, secret: string) {
    const key = this.getKey(sessionId);
    return this.redisClient.hset(key, KEY_SESSION_SECRET, secret);
  }

  /**
   * Return the `secret` for `sessionId`.
   */
  private getSecret(sessionId: SessionId): Promise<string> {
    const key = this.getKey(sessionId);
    return this.redisClient.hget(key, KEY_SESSION_SECRET);
  }

  /**
   * Return the `secret` for `sessionId`.
   */
  // private getExpiry(sessionId: SessionId): Promise<number> {
  //   const key = this.getKey(sessionId);
  //   return this.redisClient.hgetAsync(key, KEY_EXPIRY);
  // }

  /**
   * Create a new session.
   * Generate a unique id and a secret, store it in Redis and tell them to the client.
   */
  async createNewSession(): Promise<{ id: SessionId; secret: string }> {
    const id: SessionId = <SessionId>shortid.generate();
    const secret = crypto.randomBytes(64).toString("hex");
    // TODO: repeat until session id is unique and not found
    await this.setSecret(id, secret);
    return {
      id,
      secret
    };
  }

  generateSignature(
    sessionId: SessionId,
    secret: string,
    timestamp: number
  ): string {
    return sha1(`${sessionId}_${secret}_${timestamp}`).toString();
  }

  /**
   * Authenticate the client based on the attributes.
   * Create a new session if attribs can't be validated.
   */
  async authenticate(
    sessionId: SessionId,
    signature: string,
    timestamp: number
  ): Promise<string> {
    const secret = await this.getSecret(sessionId);
    if (!secret) {
      throw new Error(`Unknown session ${sessionId}`);
    }
    const currentTimestamp = new Date().getTime();
    const signatureChallenge = this.generateSignature(
      sessionId,
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
      return sessionId;
    }
  }

  /**
   * @todo
   */
  async resetExpiry(sessionId: SessionId, isActive: boolean): Promise<void> {
    const metaKey = this.getKey(sessionId);
    const multi = this.redisClient.multi();
    const seconds = isActive
      ? this.config.authentication.activeSessionExpiry
      : this.config.authentication.inactiveSessionExpiry;
    multi.expire(metaKey, seconds);

    const expiry = new Date().getTime() / 1000 + seconds;
    multi.hset(metaKey, KEY_EXPIRY, expiry.toString());

    multi.zadd(ZKEY_EXPIRING_SESSIONS, expiry, sessionId);
    return multi.exec();
  }

  /**
   * Delete all data for `sessionId`.
   */
  async cleanup(sessionId: SessionId) {
    const key = this.getKey(sessionId);
    return this.redisClient.del(key);
  }
}
