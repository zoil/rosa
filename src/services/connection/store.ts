import { injectable } from "../../../node_modules/inversify";
import { Connection } from "../../../node_modules/@types/sockjs";
import { ConnectionId } from "../../types/connection";
import { ConnectionWrapper } from "../../types/websocket";

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
