import { injectable, inject, Container } from "inversify";
import * as ejson from "ejson";
import chalk from "chalk";

// Modules
import { ConnectionWrapper } from "../connection/wrapper";

// Types
import { Protocols, Message } from "rosa-shared";
import { IProtocolMessageReceiver } from "../../types/protocols";
import { TProtocolMessageReceiver, TContainer } from "../../types/di";

@injectable()
export class ProtocolReceiveMessageService {
  /**
   * Inject dependencies
   */
  @inject(TContainer)
  private container!: Container;

  private protocols: { [key: string]: IProtocolMessageReceiver };

  /**
   * Try to parse `data` and turn it into a `Message`.
   */
  private stringToMessage(data: string): Message {
    // Parse `data`.
    const payload = ejson.parse(data);

    // assemble the message based on the ejson payload
    const message: Message = Object.create(null);
    const [requestId, messageType, messagePayload] = payload;
    message.type = messageType;
    message.payload = messagePayload;
    message.requestId = requestId;
    return message;
  }

  constructor() {
    this.protocols = Object.create(null);
    const supportedProtocols = [Protocols.Handshake.ID, Protocols.V1.ID];
    supportedProtocols.forEach(
      protocol =>
        (this.protocols[protocol] = this.container.getNamed(
          TProtocolMessageReceiver,
          protocol
        ))
    );
  }

  /**
   * Return an IProtocol for `connection` and `version`.
   */
  getProtocolForConnection(connection: ConnectionWrapper) {
    const protocolId = connection.getProtocolId();
    const protocol = this.protocols[protocolId];
    if (protocol === undefined) {
      throw new Error(
        `Unknown protocol ${protocolId} for receiving a message.`
      );
    }

    return protocol;
  }

  /**
   * Receive `message` from `connection`.
   */
  async receiveMessage(connection: ConnectionWrapper, message: Message) {
    const protocol = this.getProtocolForConnection(connection);
    return protocol.receiveMessage(connection, message);
  }

  /**
   * Receive `data` from `connection`.
   */
  async receiveRawData(connection: ConnectionWrapper, data: string) {
    let messageType = "";
    try {
      // Parse `data`
      const message = this.stringToMessage(data);
      messageType = message.type;

      // and receive it
      return this.receiveMessage(connection, message);
    } catch (err) {
      const errorMessage =
        messageType === ""
          ? "Failed parsing message"
          : `Failed receiving ${messageType}`;
      console.log(
        chalk.red("<-"),
        connection.getProtocolId(),
        connection.getIdentityId(),
        errorMessage
      );
    }
  }
}
