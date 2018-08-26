import { injectable, inject } from "inversify";
import * as Async from "async";

// Types
import { QueryId } from "rosa-shared";
import {
  TConnectionSubscriptions,
  TQueryExecuteService,
  TProtocolQueryResultEmitter
} from "../../types/di";
import { ConnectionId } from "../../types/connection";

// Services
import ConnectionSubscriptionsService from "../connection/subscriptions";
import QueryExecute from "./execute";
import { ProtocolsSubscriptionsEmitterService } from "../protocols/emit-querydata";

type Task = {
  queryId: QueryId;
  connectionId?: ConnectionId;
};

/**
 * Singleton Service to publish Query Results.
 * TODO: this module should just get the cache key of the payload.
 */
@injectable()
export default class QueryPublishService {
  /**
   * Inject dependencies.
   */
  @inject(TConnectionSubscriptions)
  private connectionSubscriptionsService!: ConnectionSubscriptionsService;
  @inject(TQueryExecuteService)
  private executeQueryService!: QueryExecute;
  @inject(TProtocolQueryResultEmitter)
  private protocolQueryResultEmitter!: ProtocolsSubscriptionsEmitterService;

  /**
   * Operation Queue.
   */
  private queue: Async.AsyncQueue<{}>;

  /**
   * Return the subscribed ConnectionIds for task.
   */
  private async getConnectionIdsForTask(task: Task): Promise<ConnectionId[]> {
    if (task.connectionId) {
      // This task is for a single connectionId
      return [task.connectionId];
    }

    // This task is broadcast type.
    return this.connectionSubscriptionsService.getConnectionIdsForQueryId(
      task.queryId
    );
  }

  /**
   * Queue worker for Async.
   */
  private async worker(
    task: Task,
    callback: (err?: Error, msg?: string) => void
  ) {
    try {
      const connectionIds: ConnectionId[] = await this.getConnectionIdsForTask(
        task
      );
      await this.publishForConnectionIds(connectionIds, task.queryId);
    } finally {
      callback();
    }
  }

  /**
   * Publish `data` of `queryId` for `connectionIds`.
   */
  private async publishForConnectionIds(
    connectionIds: ConnectionId[],
    queryId: QueryId
  ): Promise<any> {
    const result = await this.executeQueryService.executeQueryId(queryId);
    return this.protocolQueryResultEmitter.emitDataToConnectionIds(
      connectionIds,
      queryId,
      result
    );
  }

  /**
   * Inject Dependencies.
   */
  constructor() {
    this.queue = Async.queue(this.worker.bind(this), 1);
  }

  /**
   * Execute `queryId` and broadcast the results throughout all subscribers.
   */
  publishById(queryId: QueryId) {
    return this.queue.push({ queryId });
  }

  /**
   * Execute `queryId` and send the result to `connectionId` via this.queue.
   * These kind of requests take priority in the queue.
   */
  publishByIdForConnectionId(queryId: QueryId, connectionId: ConnectionId) {
    return this.queue.unshift({ queryId, connectionId });
  }
}
