import { injectable, inject } from "inversify";
import * as SockJS from "sockjs";

// Types
import * as Services from "../types/di";

// Services
import Config from "../config";
import { ConnectionStoreService } from "./connection/store";

/**
 * Singleton Service providing a SockJS server.
 */
@injectable()
export class WebsocketServer {
  /**
   * Inject Dependencies
   */
  @inject(Services.TConfig)
  private config!: Config;
  @inject(Services.TConnectionStore)
  private connectionStore!: ConnectionStoreService;

  /**
   * The actual SockJS server instance.
   */
  private server!: SockJS.Server;

  /**
   * Creates an instance of Connection from an instance of
   * SockJS.Connection.
   */
  private createConnection(sockjsConnection: SockJS.Connection) {
    this.connectionStore.registerConnection(sockjsConnection);
  }

  /**
   * Set up and wire up the SockJS server.
   */
  init() {
    this.server = SockJS.createServer(this.config.sockjs);
    this.server.on("connection", this.createConnection.bind(this));
    this.server.installHandlers(this.config.httpServer);
  }
}

export default WebsocketServer;
