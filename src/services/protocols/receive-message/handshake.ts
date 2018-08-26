import { isArray } from "util";

// Types
import {
  IProtocolMessageReceiver,
  IProtocolMessageEmitter
} from "../../../types/protocols";
import { Message, Protocols } from "rosa-shared";

// Modules
import { ConnectionWrapper } from "../../connection/wrapper";
import { inject, named } from "inversify";
import { TProtocolMessageEmitter } from "../../../types/di";

export class ProtocolReceiveHandshake implements IProtocolMessageReceiver {
  /**
   * Inject dependencies.
   */
  @inject(TProtocolMessageEmitter)
  @named(Protocols.Handshake.ID)
  private messageEmitter!: IProtocolMessageEmitter;

  /**
   * Find the best matching protocol between the ones supported by this server
   * and the ones that the Client has provided in `versions`.
   */
  private findMatchingProtocolForVersions(
    requestedVersions: string[]
  ): false | string {
    let matchedProtocol: false | string = false;
    if (!isArray(requestedVersions)) {
      throw new Error("Versions are undefined.");
    }

    const bestProtocols = [Protocols.V1.ID]; // TODO: move this in shared
    bestProtocols.some(suggestedProtocol => {
      if (requestedVersions.includes(suggestedProtocol)) {
        matchedProtocol = suggestedProtocol;
        return true;
      }

      return false;
    });

    return matchedProtocol;
  }

  /**
   * Initial request from the Client, it is only used to agree on the
   * protocol to use.
   */
  async connectRequest(
    connection: ConnectionWrapper,
    request: Protocols.Handshake.Client.ConnectRequest
  ) {
    // stop the timer to disconnect
    // this.clearDisconnectTimeout();

    // try to use the offered version from the client
    const version = this.findMatchingProtocolForVersions(
      request.payload.versions
    );

    if (version) {
      connection.setProtocol(version);
      const payload: Protocols.Handshake.Server.SwitchProtocolPayload = {
        version
      };
      const response = Protocols.Handshake.Server.messageFactory(
        Protocols.Handshake.Server.Tokens.SwitchProtocol,
        payload
      );
      this.messageEmitter.emitMessage(connection, response);
    }

    // We don't support any versions that the client is asking for
    const payload: Protocols.Handshake.Server.ErrorPayload = {
      error: 1
    };
    return this.messageEmitter.emitError(
      connection,
      payload,
      request.requestId
    );
  }

  /**
   * Receive `message` from `connection`.
   */
  async receiveMessage(connection: ConnectionWrapper, request: Message) {
    switch (request.type) {
      case Protocols.Handshake.Client.Tokens.Connect:
        return this.connectRequest(connection, request);
      default:
        // Unknown request.
        const payload: Protocols.Handshake.Server.ErrorPayload = {
          error: 1
        };
        return this.messageEmitter.emitError(
          connection,
          payload,
          request.requestId
        );
    }
  }
}
