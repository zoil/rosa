import { injectable, inject } from "inversify";

// Types
import { TRedisClient } from "../../types/di";
import { IPromiseRedisClient } from "../../types/redis";
import { IdentityData } from "./data";
import { IdentityId } from "../../types/identity";

/**
 * Factory Service for creating SessionData instances.
 */
@injectable()
export class IdentityDataFactory {
  /**
   * Inject Dependencies.
   */
  @inject(TRedisClient)
  private redisClient!: IPromiseRedisClient;

  /**
   * Factory method to create `SessionData`s.
   */
  create(identityId: IdentityId): IdentityData {
    return new IdentityData(this.redisClient, identityId);
  }
}
