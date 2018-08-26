import chalk from "chalk";
import * as ejson from "ejson";
import { IProtocolMessageEmitter } from "../../../types/protocols";
import { ConnectionWrapper } from "../../connection/wrapper";
import { Message, Protocols } from "rosa-shared";
import { injectable } from "inversify";

@injectable()
export class ProtocolsEmitMessageHandshake implements IProtocolMessageEmitter {
  emitMessage(connection: ConnectionWrapper, message: Message) {
    console.log(
      chalk.blue("->"),
      Protocols.V1.ID,
      connection.getConnectionId(),
      message.type
    );
    const payload = [
      message.requestId ? message.requestId : 0,
      message.type,
      message.payload
    ];
    const stringPayload = ejson.stringify(payload);
    connection.getConnection().emit(stringPayload);
  }

  emitError(
    connection: ConnectionWrapper,
    payload: Protocols.Handshake.Server.ErrorPayload,
    requestId?: number
  ) {
    const response = Protocols.Handshake.Server.messageFactory(
      Protocols.Handshake.Server.Tokens.Error,
      payload,
      requestId ? requestId : 0
    );
    return this.emitMessage(connection, response);
  }
}
