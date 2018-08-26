import { Connection } from "sockjs";
import * as Async from "async";
import * as ejson from "ejson";
import chalk from "chalk";
import { Protocols, Message } from "rosa-shared";

// Types
import { IdentityId } from "../../types/identity";

// Modules
import { IdentityData } from "../identity/data";
import { IdentityDataFactoryService } from "../identity/data-factory";
import { ProtocolReceiveMessageService } from "../protocols/receive-message";

export class ConnectionWrapper {
  private protocol!: string;
  private identityId!: IdentityId;
  private identityData!: IdentityData;

  /**
   * Unprocessed outgoing Messages.
   */
  private outgoingMessagesQueue: Async.AsyncQueue<Message>;

  /**
   * Unprocessed incoming Messages.
   */
  private incomingMessagesQueue: Async.AsyncQueue<Message>;

  private onDisconnect() {
    this.outgoingMessagesQueue.kill(); // drain?
    this.incomingMessagesQueue.kill();
    // todo: onDisconnect Callback
  }

  /**
   * Async queue worker for incoming messages.
   */
  private async processIncomingMessage(
    data: string,
    callback: (err?: Error, msg?: string) => void
  ) {
    try {
      await this.messageReceiver.receiveRawData(this, data);
    } finally {
      callback();
    }
  }

  /**
   * Async queue worker for outgoing messages.
   */
  private processOutgoingMessage(
    message: Message,
    callback: (err?: Error, msg?: string) => void
  ) {
    try {
      console.log(chalk.blue("->"), this.getProtocolId(), message.type);
      const payload = [
        message.requestId ? message.requestId : 0,
        message.type,
        message.payload
      ];
      const stringPayload = ejson.stringify(payload);
      this.connection.emit(stringPayload);
    } catch (err) {
      console.log("Error sending message");
    } finally {
      callback();
    }
  }

  constructor(
    private connection: Connection,
    private messageReceiver: ProtocolReceiveMessageService,
    private identityDataFactory: IdentityDataFactoryService
  ) {
    // Set the initial protocol
    this.protocol = Protocols.Handshake.ID;

    // set up incoming & outgoing tubes
    this.incomingMessagesQueue = Async.queue(
      this.processIncomingMessage.bind(this),
      1
    );
    this.outgoingMessagesQueue = Async.queue(
      this.processOutgoingMessage.bind(this),
      1
    );

    // wire up SockJS
    connection.on("data", this.incomingMessagesQueue.push);
    connection.on("close", this.onDisconnect.bind(this));
  }

  getConnection() {
    return this.connection;
  }

  getConnectionId() {
    return this.connection.id;
  }

  getProtocolId() {
    return this.protocol;
  }

  setProtocol(protocol: string) {
    this.protocol = protocol;
  }

  getIdentityData() {
    return this.identityData;
  }

  getIdentityId() {
    return this.identityId;
  }

  setIdentityId(identityId: IdentityId) {
    this.identityId = identityId;
    if (identityId) {
      this.identityData = this.identityDataFactory.create(identityId);
    } else {
      delete this.identityData;
    }
  }
}
