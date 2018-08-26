import chalk from "chalk";
import * as ejson from "ejson";
import { injectable } from "inversify";
import { Message, Protocols } from "rosa-shared";

// Modules
import { ConnectionWrapper } from "../../connection/wrapper";

// Types
import { IProtocolMessageEmitter } from "../../../types/protocols";

@injectable()
export class ProtocolsEmitMessageV1 implements IProtocolMessageEmitter {
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
    const response = Protocols.V1.Server.messageFactory(
      Protocols.V1.Server.Tokens.Error,
      payload,
      requestId ? requestId : 0
    );
    return this.emitMessage(connection, response);
  }
}
