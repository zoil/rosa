import { injectable } from "inversify";
import { QueryId } from "rosa-shared";

// Types
import { ConnectionId } from "../../types/connection";

/**
 * Singleton Service to maintain the n:n relation between
 * Queries and Connections.
 *
 * Connections must be aware what Queries they are subscribed to.
 * Queries must be aware which Connections are subscribed to it.
 */
@injectable()
export default class ConnectionSubscriptionsService {
  private connectionIdsByQueryIds: {
    [key: string]: Set<ConnectionId>;
  } = Object.create(null);
  private queryIdsByConnectionIds: {
    [key: string]: Set<QueryId>;
  } = Object.create(null);

  /**
   * Bind `queryId` with `connectionId`.
   */
  bind(connectionId: ConnectionId, queryId: QueryId) {
    // add connectionId to the connections of queryId
    if (this.connectionIdsByQueryIds[queryId] === undefined) {
      this.connectionIdsByQueryIds[queryId] = new Set();
    }
    this.connectionIdsByQueryIds[queryId].add(connectionId);

    // add queryId to the queries of connectionId
    if (this.queryIdsByConnectionIds[connectionId] === undefined) {
      this.queryIdsByConnectionIds[connectionId] = new Set();
    }
    this.queryIdsByConnectionIds[connectionId].add(queryId);
  }

  /**
   * Unbind `queryId` from `connectionId`.
   */
  unbind(connectionId: ConnectionId, queryId: QueryId) {
    // Remove connectionId from the connections of queryId
    if (this.connectionIdsByQueryIds[queryId] !== undefined) {
      this.connectionIdsByQueryIds[queryId].delete(connectionId);
    }
    // Remove queryId from the queries of connectionId
    if (this.queryIdsByConnectionIds[connectionId] !== undefined) {
      this.queryIdsByConnectionIds[connectionId].delete(queryId);
    }
  }

  /**
   * Return QueryIdes for `connectionId`.
   */
  getQueryIdsForConnection(connectionId: ConnectionId): QueryId[] {
    if (this.queryIdsByConnectionIds[connectionId] === undefined) {
      return [];
    }
    return Array.from(this.queryIdsByConnectionIds[connectionId]);
  }

  /**
   * Return ConnectionIds for `queryId`.
   */
  getConnectionIdsForQueryId(queryId: QueryId): ConnectionId[] {
    if (this.connectionIdsByQueryIds[queryId] === undefined) {
      return [];
    }

    return Array.from(this.connectionIdsByQueryIds[queryId]);
  }

  /**
   * Return 1 ConnectionId for `queryId`.
   */
  getOneConnectionForQueryId(queryId: QueryId): ConnectionId | false {
    if (this.connectionIdsByQueryIds[queryId] === undefined) {
      return false;
    }

    return this.connectionIdsByQueryIds[queryId].values().next().value;
  }

  /**
   * Delete all bindings of `connectionId`.
   */
  cleanupConnection(connectionId: ConnectionId) {
    const queryIds = this.getQueryIdsForConnection(connectionId);
    queryIds.forEach(
      (queryId: QueryId) =>
        this.connectionIdsByQueryIds[queryId] !== undefined
          ? this.connectionIdsByQueryIds[queryId].delete(connectionId)
          : () => false
    );
    if (this.queryIdsByConnectionIds[connectionId] !== undefined) {
      delete this.queryIdsByConnectionIds[connectionId];
    }
  }
}
