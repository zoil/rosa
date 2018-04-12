import * as Promise from "bluebird";
import { Service, Inject } from "typedi";

// Types
import { SessionDataAccessor } from "../../types/session";
import { QueryId } from "rosa-shared";

// Services
import SessionSubscriptionsService from "../session/subscriptions";

/**
 * Singleton Service to let Sessions unsubscribing from Queries.
 */
@Service()
export default class QueryUnwatchService {
  /**
   * Inject Dependencies.
   */
  @Inject() sessionSubscriptionsService!: SessionSubscriptionsService;

  /**
   * Unsubscribe `session` from `queryId`.
   */
  unwatch(session: SessionDataAccessor, queryId: QueryId) {
    // TODO: onUnsubscribe
    return this.sessionSubscriptionsService.unbind(
      session.getSessionId(),
      queryId
    );
  }

  /**
   * Unsubscribe `session` from all of its subscriptions.
   */
  unwatchAll(session: SessionDataAccessor) {
    return this.sessionSubscriptionsService
      .getQueryIdsSession(session.getSessionId())
      .then((queryIdes: QueryId[]) =>
        Promise.map(queryIdes, (queryId: QueryId) =>
          this.unwatch(session, queryId)
        )
      );
  }
}
