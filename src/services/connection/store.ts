import { injectable } from "inversify";
import { Connection } from "sockjs";

// Modules
import { ConnectionWrapper } from "./wrapper";

// Types
import { ConnectionId } from "../../types/connection";

@injectable()
export class ConnectionStoreService {
  private connections: { [key: string]: ConnectionWrapper } = {};

  registerConnection(connection: Connection): ConnectionWrapper {
    const wrapper = new ConnectionWrapper(connection);
    this.connections[connection.id] = wrapper;
    return wrapper;
  }

  getConnectionById(connectionId: ConnectionId): ConnectionWrapper {
    return this.connections[connectionId];
  }

  forgetConnection(connection: Connection) {
    delete this.connections[connection.id];
  }
}
