import { injectable, inject } from "inversify";

// Types
import { QueryId } from "rosa-shared";
import { ConnectionId } from "../../types/connection";
import { TConnectionSubscriptions } from "../../types/di";

// Services
import ConnectionSubscriptionsService from "../connection/subscriptions";
import { ConnectionWrapper } from "../connection/wrapper";

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
  async unsubscribeAll(connection: ConnectionWrapper) {
    const connectionId = connection.getConnectionId();
    const queryIds: QueryId[] = await this.connectionSubscriptionsService.getQueryIdsForConnection(
      connectionId
    );

    const promises: Promise<void>[] = [];
    for (let queryId in queryIds) {
      const promise = this.unsubscribe(connectionId, queryId);
      promises.push(promise);
    }
    return Promise.all(promises);
  }
}
