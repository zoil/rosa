import { Container } from "typedi";

// Types
import {
  ProtocolType,
  Message,
  ProtocolConnectionInterface
} from "../types/websocket";

// Services
import Config from "../config";

// Others
import { isArray } from "util";

import { Protocols } from "rosa-shared";

/**
 * Handshake Protocol.
 * This is a Strategy class for Connections.
 * This is the default protocol when a new Websocket client connects
 * to the server. Its only responsibility is to determine the best
 * Protocol version which both sides support and once that's known,
 * update the Connection Wrapper to use that new protocol.
 */
export default class ProtocolHandshake implements ProtocolType {
  /**
   * The Connection this is linked with.
   */
  private connection!: ProtocolConnectionInterface;

  /**
   * When instantiating, this class starts a timer to close the connection if
   * the client does not do a successful handshake withing a certain amout of
   * time.
   */
  private disconnectTimer!: number;

  /**
   * Called when the handshake timeout elapses.
   */
  private onDisconnectTimeout() {
    clearInterval(this.disconnectTimer);
    delete this.disconnectTimer;
    this.connection.disconnect();
    delete this.connection;
  }

  /**
   * Clear the handshake Timeout.
   */
  private clearDisconnectTimeout() {
    if (this.disconnectTimer !== undefined) {
      clearTimeout(this.disconnectTimer);
      delete this.disconnectTimer;
    }
  }

  /**
   * Find the best matching protocol between the ones supported by this server
   * and the ones that the Client has provided in `versions`.
   */
  private findMatchingProtocolForVersions(versions: string[]): boolean {
    let matchedProtocol: boolean = false;
    if (isArray(versions)) {
      versions.some((requestedVersion: any): boolean => {
        matchedProtocol = this.connection.setProtocolForVersion(
          requestedVersion
        );
        return !!matchedProtocol;
      });
    }

    return matchedProtocol;
  }

  /**
   * Handle an incoming ConnectionRequest.
   * Select a protocol for the Client.
   */
  private connectRequest(request: Protocols.Handshake.Client.ConnectRequest) {
    // stop the timer to disconnect
    this.clearDisconnectTimeout();

    // try to use the offered version from the client
    const protocol = this.findMatchingProtocolForVersions(
      request.payload.versions
    );

    if (!protocol) {
      // We don't support any versions that the client is asking for
      const payload: Protocols.Handshake.Server.ErrorPayload = {
        error: 1
      };
      const response = Protocols.Handshake.Server.messageFactory(
        Protocols.Handshake.Server.Tokens.Error,
        payload,
        request.requestId ? request.requestId : 0
      );
      this.connection.sendMessage(response);
    }
  }

  init(connection: ProtocolConnectionInterface) {
    // Link `connection` with `this`
    this.connection = connection;

    // Start a timer to disconnect if there's no successful handshake
    // within a certain amout of time
    const config: Config = Container.get(Config);
    this.disconnectTimer = setTimeout(
      this.onDisconnectTimeout.bind(this),
      config.authentication.handshakeTimeout
    );
  }

  getVersion() {
    return Protocols.Handshake.ID;
  }

  /**
   * Handle any incoming `payload` from a Connection.
   */
  onData(request: Message) {
    switch (request.type) {
      case Protocols.Handshake.Client.Tokens.Connect:
        this.connectRequest(request);
        break;
      default:
        // unknown message, try to queue for later, perhaps another
        // WebsocketProtocol will support this in the future
        this.connection.queueIncomingMessage(request);
    }
  }

  /**
   * Callback for handling Socket disconnections.
   */
  onEnd() {
    // no action
  }

  /**
   * Handle full data transmit events from Subscriptions.
   */
  onSubscriptionData() {
    // no action
  }

  /**
   * Handle delta data transmit events from Subscriptions.
   */
  onSubscriptionChanges() {
    // no action
  }

  sendError(message: Message, code: number) {
    const payload: Protocols.Handshake.Server.ErrorPayload = { error: code };
    const response = Protocols.Handshake.Server.messageFactory(
      Protocols.Handshake.Server.Tokens.Error,
      payload,
      message.requestId ? message.requestId : 0
    );
    this.connection.sendMessage(response);
  }
}
