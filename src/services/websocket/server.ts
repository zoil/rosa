import { Service, Container, Inject } from "typedi";
import * as SockJS from "sockjs";

// Types
import { ConnectionState } from "rosa-shared";

// Services
import Config from "../../config";
import WebsocketConnectionFactory, { WebsocketConnection } from "./connection";
import { SessionId } from "rosa-shared";

/**
 * Singleton Service providing a SockJS server.
 */
@Service()
export class WebsocketServer {
  /**
   * App config.
   */
  @Inject() private config!: Config;

  /**
   * The actual SockJS server instance.
   */
  private server!: SockJS.Server;

  /**
   * Map of SockJS.id & Connection instances
   * Connections initially are being registered in this
   */
  private lobby: WebsocketConnection[] = [];

  /**
   * Map of SessionID & Connection instances
   * Connection instances from the lobby will be moved in here,
   * once they have a SessionID.
   */
  private sessions: {
    [SessionID: string]: WebsocketConnection;
  } = Object.create(null);

  /**
   * Update any internals when the state of a Connection changes.
   */
  private onConnectionStateChange(conn: WebsocketConnection) {
    switch (conn.state) {
      case ConnectionState.Ready:
        // take it out of the lobby, if it's there
        this.lobby = this.lobby.filter(obj => obj !== conn);

        // register it in the sessions map
        this.sessions[conn.sessionId] = conn;
        break;
      case ConnectionState.HandshakePending:
      case ConnectionState.ProtocolSet:
      default:
        if (this.lobby.indexOf(conn) === -1) {
          this.lobby.push(conn);
        }
    }
  }

  /**
   * Cleanup after a Connection was disconnected.
   */
  private onConnectionDisconnect(conn: WebsocketConnection) {
    // delete `conn` from the lobby
    this.lobby = this.lobby.filter(obj => obj !== conn);

    // delete `conn` from the known sessions
    if (this.sessions[conn.sessionId]) {
      delete this.sessions[conn.sessionId];
    }
  }

  /**
   * Creates an instance of Connection from an instance of
   * SockJS.Connection.
   */
  private createConnection(sockjsConnection: SockJS.Connection) {
    const connectionFactory = Container.get(WebsocketConnectionFactory);
    const connection = connectionFactory.create(sockjsConnection);
    connection.on("stateChange", this.onConnectionStateChange.bind(this));
    connection.on("disconnect", this.onConnectionDisconnect.bind(this));
    // connection.init(sockjsConnection);

    this.lobby.push(connection);
  }

  /**
   * Set up and wire up the SockJS server.
   */
  init() {
    this.server = SockJS.createServer(this.config.sockjs);
    this.server.on("connection", this.createConnection.bind(this));
    this.server.installHandlers(this.config.httpServer);
  }

  /**
   * Return the count of the currently active connections.
   */
  connectionCount() {
    return {
      lobby: this.lobby.length,
      sessions: Object.keys(this.sessions).length
    };
  }

  /**
   * Force close all live connections.
   */
  closeAll() {
    // TODO: iterate all connections and close them
  }

  getConnectionForSessionId(sessionId: SessionId): WebsocketConnection {
    return this.sessions[sessionId];
  }
}

export default WebsocketServer;
