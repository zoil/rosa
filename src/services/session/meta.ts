import { Inject, Service } from "typedi";
import * as Promise from "bluebird";
import * as shortid from "shortid";
import * as crypto from "crypto";
import sha1 = require("sha1");

// Types
import { RedisClientType } from "../../types/redis";
import { SessionId } from "rosa-shared";

// Services
import Config from "../../config";
import { RedisClient } from "../redis-client";

const KEY_SESSION_SECRET = "secret";
const KEY_EXPIRY = "expiry";
const ZKEY_EXPIRING_SESSIONS = "ex_sess";

/**
 * This Service deals with any Meta Data related to Sessions,
 * eg. the Secret Key of them.
 */
@Service()
export default class SessionMetaService {
  /**
   * Inject Dependencies.
   */
  @Inject() private config!: Config;
  @Inject(RedisClient) private redisClient!: RedisClientType;

  /**
   * Return the Redis key for the HASH of `sessionId`.
   */
  private getKey(sessionId: SessionId): string {
    return `session:${sessionId}`;
  }

  /**
   * Set `secret` for `sessionId`.
   */
  private setSecret(sessionId: SessionId, secret: string): Promise<void> {
    const key = this.getKey(sessionId);
    return this.redisClient.hsetAsync(key, KEY_SESSION_SECRET, secret);
  }

  /**
   * Return the `secret` for `sessionId`.
   */
  private getSecret(sessionId: SessionId): Promise<void> {
    const key = this.getKey(sessionId);
    return this.redisClient.hgetAsync(key, KEY_SESSION_SECRET);
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
  createNewSession(): Promise<{ id: SessionId; secret: string }> {
    const id: SessionId = <SessionId>shortid.generate();
    const secret = crypto.randomBytes(64).toString("hex");
    // TODO: repeat until session id is unique and not found
    return this.setSecret(id, secret).then(() => ({
      id,
      secret
    }));
  }

  /**
   * Authenticate the client based on the attributes.
   * Create a new session if attribs can't be validated.
   */
  authenticate(
    sessionId: SessionId,
    signature: string,
    timestamp: number
  ): Promise<string> {
    return this.getSecret(sessionId).then(secret => {
      if (!secret) {
        throw new Error(`Unknown session ${sessionId}`);
      }
      const signatureChallenge = sha1(`${sessionId}_${secret}_${timestamp}`);
      const currentTimestamp = new Date().getTime();
      // Promise.resolve();
      if (signatureChallenge !== signature) {
        // callback(new Error(`Invalid signature ${secret}`));
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
    });
  }

  /**
   * Set `secret` for `sessionId`.
   */
  resetExpiry(sessionId: SessionId, isActive: boolean): Promise<void> {
    const metaKey = this.getKey(sessionId);
    const multi = this.redisClient.multi();
    const seconds = isActive
      ? this.config.authentication.activeSessionExpiry
      : this.config.authentication.inactiveSessionExpiry;
    multi.expire(metaKey, seconds);

    const expiry = new Date().getTime() / 1000 + seconds;
    multi.hset(metaKey, KEY_EXPIRY, expiry.toString());

    multi.zadd(ZKEY_EXPIRING_SESSIONS, expiry, sessionId);
    return multi.execAsync();
  }

  /**
   * Delete all data for `sessionId`.
   */
  cleanup(sessionId: SessionId): Promise<void> {
    const key = this.getKey(sessionId);
    return this.redisClient.delAsync(key);
  }
}
