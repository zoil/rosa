import { injectable, inject } from "inversify";

// Types
import { SessionId } from "rosa-shared";
import { TRedisClient } from "../../types/di";
import { IPromiseRedisClient } from "../../types/redis";
import { SessionData } from "./data";

/**
 * Factory Service for creating SessionData instances.
 */
@injectable()
export class SessionDataFactory {
  /**
   * Inject Dependencies.
   */
  @inject(TRedisClient)
  private redisClient!: IPromiseRedisClient;

  /**
   * Factory method to create `SessionData`s.
   */
  create(sessionId: SessionId): SessionData {
    return new SessionData(this.redisClient, sessionId);
  }
}
