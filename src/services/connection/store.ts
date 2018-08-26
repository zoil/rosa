import { injectable, inject } from "inversify";
import { Connection } from "sockjs";

// Modules
import { ConnectionWrapperFactoryService } from "./wrapper-factory";
import { ConnectionWrapper } from "./wrapper";

// Types
import { ConnectionId } from "../../types/connection";
import { TConnectionWrapperFactory } from "../../types/di";

@injectable()
export class ConnectionStoreService {
  private connections: { [key: string]: ConnectionWrapper } = {};

  @inject(TConnectionWrapperFactory)
  private connectionWrapperFactory!: ConnectionWrapperFactoryService;

  registerConnection(connection: Connection): ConnectionWrapper {
    const wrapper = this.connectionWrapperFactory.create(connection);
    this.connections[connection.id] = wrapper;

    // TODO: multiple disconnect subscriptions?
    connection.on("disconnect", () => {
      this.forgetConnection(connection);
    });

    // TODO: close disconnect subscriptions?
    connection.on("close", () => {
      this.forgetConnection(connection);
    });

    return wrapper;
  }

  /**
   * Return the ConnectionWrapper identified by connectionId.
   * @param connectionId
   */
  getConnectionById(connectionId: ConnectionId): ConnectionWrapper {
    return this.connections[connectionId];
  }

  /**
   * Unregister connection
   * @param connection
   */
  forgetConnection(connection: Connection) {
    delete this.connections[connection.id];
  }

  /**
   * Return the count of the currently active connections.
   */
  connectionCount() {
    Object.keys(this.connections).length;
  }
}
