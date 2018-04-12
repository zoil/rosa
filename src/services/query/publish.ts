import { Service, Inject } from "typedi";
import * as Async from "async";
import * as Promise from "bluebird";

// Types
import { QueryId, SessionId } from "rosa-shared";

// Services
import WebsocketServer from "../websocket/server";
import SessionSubscriptionsService from "../session/subscriptions";
import ExecuteQueryService from "./execute";

type Task = {
  queryId: QueryId;
  sessionId?: SessionId;
};

/**
 * Singleton Service to publish Query Results.
 * TODO: this module should just get the cache key of the payload.
 * Also we need a separate module listening for invalidations via tags.
 */
@Service()
export default class QueryPublishService {
  /**
   * Inject Dependencies.
   */
  @Inject(() => WebsocketServer)
  private websocketServer!: WebsocketServer;
  @Inject() private sessionSubscriptionsService!: SessionSubscriptionsService;
  @Inject() private executeQueryService!: ExecuteQueryService;

  /**
   * Operation Queue.
   */
  private queue: Async.AsyncQueue<{}>;

  /**
   * Return the subscribed SessionIds for task.
   */
  private getSessionIdsForTask(task: Task): Promise<SessionId[]> {
    return Promise.try(() => {
      if (task.sessionId) {
        return [task.sessionId];
      } else {
        return this.sessionSubscriptionsService.getSessionsForQueryId(
          task.queryId
        );
      }
    });
  }

  /**
   * Queue worker for Async.
   */
  private worker(task: Task, callback: (err?: Error, msg?: string) => void) {
    this.getSessionIdsForTask(task)
      .then((sessionIds: SessionId[]) =>
        this.publishForSessionIds(sessionIds, task.queryId)
      )
      .finally(callback);
  }

  /**
   * Publish `data` of `queryId` for `sessionIds`.
   */
  private publishForSessionIds(
    sessionIds: SessionId[],
    queryId: QueryId
  ): Promise<void> {
    return this.executeQueryService.executeQueryId(queryId).then(result => {
      // TODO: maybe use Promise.all() here?
      sessionIds.forEach(sessionId => {
        const connection = this.websocketServer.getConnectionForSessionId(
          sessionId
        );
        if (!connection) {
          console.log("Cannot find connection for session id", sessionId);
          return;
        }
        // TODO: return??
        connection.onSubscriptionData(queryId, result);
      });
    });
  }

  constructor() {
    this.queue = Async.queue(this.worker.bind(this), 1);
  }

  /**
   * Execute `queryId` and broadcast the results throughout all subscribers.
   */
  queryId(queryId: QueryId) {
    return this.queue.push({ queryId });
  }

  /**
   * Execute `queryId` and send the result to `sessionId`.
   * These kind of requests take priority in the queue.
   */
  queryIdForSessionId(queryId: QueryId, sessionId: SessionId) {
    return this.queue.unshift({ queryId, sessionId });
  }
}
