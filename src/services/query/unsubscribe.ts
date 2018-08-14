import { injectable, inject } from "inversify";
import { QueryId } from "rosa-shared";

// Types
import { ConnectionId } from "../../types/connection";
import { TConnectionSubscriptions } from "../../types/di";

// Services
import ConnectionSubscriptionsService from "../connection/subscriptions";

/**
 * Singleton Service to let Connections unsubscribing from Queries.
 */
@injectable()
export default class QueryUnsubscribeService {
  /**
   * Inject Dependencies.
   */
  @inject(TConnectionSubscriptions)
  connectionSubscriptionsService!: ConnectionSubscriptionsService;

  /**
   * Unsubscribe `connectionId` from `queryId`.
   */
  async unsubscribe(connectionId: ConnectionId, queryId: QueryId) {
    return this.connectionSubscriptionsService.unbind(connectionId, queryId);
  }

  /**
   * Unsubscribe `connection` from all of its subscriptions.
   */
  async unsubscribeAll(connectionId: ConnectionId) {
    const queryIds: QueryId[] = await this.connectionSubscriptionsService.getQueryIdsForConnection(
      connectionId
    );

    const promises: Promise<void>[] = [];
    queryIds.forEach(queryId => {
      const promise = this.unsubscribe(connectionId, queryId);
      promises.push(promise);
    });
    return Promise.all(promises);
  }
}
