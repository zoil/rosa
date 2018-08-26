import { injectable, inject, named } from "inversify";
import { QueryId } from "rosa-shared";

// Types
import {
  TRedisClient,
  TConnectionSubscriptions,
  TQueryPublishService
} from "../../types/di";
import { IPromiseRedisClientSub } from "../../types/redis";
import ConnectionSubscriptionsService from "../connection/subscriptions";

// Modules
import QueryPublishService from "./publish";

const MESSAGE_PUBLISH = "P";

/**
 * TODO create a queue for invalidations
 */
@injectable()
export class QueryInvalidationService {
  // TODO handle Redis reconnection
  @inject(TRedisClient)
  @named("subscriber")
  private redisClient!: IPromiseRedisClientSub;
  @inject(TConnectionSubscriptions)
  private connectionSubscriptions!: ConnectionSubscriptionsService;
  @inject(TQueryPublishService)
  private queryPublisher!: QueryPublishService;

  private updating: boolean = false;
  private needsAnotherUpdate: boolean = false;

  /**
   * The subscribed QueryIds which is in sync with Redis.
   */
  private subscribedQueryChannels: Set<string>;

  /**
   * Return the Redis subscription key for `queryId`.
   */
  private getChannelForQueryId(queryId: QueryId) {
    return `q${queryId}`;
  }

  /**
   * Return the QueryId for `queryChannel`
   */
  private getQueryIdForChannel(queryChannel: string): QueryId {
    return queryChannel.substr(1);
  }

  /**
   * Maintain the list Queries which we're subscribed to.
   */
  private updateSubscribedQueries_do() {
    const newQueryChannelsArray = this.connectionSubscriptions
      .getAllQueryIds()
      .map(queryId => this.getChannelForQueryId(queryId));
    const newQueryChannels = new Set<string>(newQueryChannelsArray);

    // Calculate new and missing ones and subscribe to them.
    newQueryChannels.forEach(queryChannel => {
      if (!this.subscribedQueryChannels.has(queryChannel)) {
        this.redisClient.subscribe(queryChannel);
        this.subscribedQueryChannels.add(queryChannel);
      }
    });

    // Calculate the ones we don't need anymore and unsubscribe from them.
    this.subscribedQueryChannels.forEach(queryChannel => {
      if (!newQueryChannels.has(queryChannel)) {
        this.redisClient.unsubscribe(queryChannel);
        this.subscribedQueryChannels.delete(queryChannel);
      }
    });
  }

  async onMessage(queryChannel: string, message: string) {
    if (this.subscribedQueryChannels.has(queryChannel) === false) {
      return;
    }
    const queryId = this.getQueryIdForChannel(queryChannel);
    if (message === MESSAGE_PUBLISH) {
      this.queryPublisher.publishById(queryId);
    }
  }

  constructor() {
    this.updateSubscribedQueries();
    this.subscribedQueryChannels = new Set<string>();
    this.redisClient.on("message", this.onMessage.bind(this));
  }

  async updateSubscribedQueries() {
    if (this.updating) {
      this.needsAnotherUpdate = true;
      return;
    }

    this.updating = true;
    try {
      this.updateSubscribedQueries_do();
    } finally {
      this.updating = false;
      if (this.needsAnotherUpdate) {
        this.needsAnotherUpdate = false;
        this.updateSubscribedQueries();
      }
    }
  }
}
