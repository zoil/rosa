import { ConnectionWrapper } from "../services/connection/wrapper-factory";
import { Message, QueryId } from "rosa-shared";

export interface IProtocolMessageReceiver {
  receiveMessage(connection: ConnectionWrapper, message: Message): Promise<any>;
}

export interface IProtocolSubscriptionsEmitter {
  emitDataToConnectionIds(
    connections: ConnectionWrapper[],
    queryId: QueryId,
    data: any
  ): Promise<any>;
}

export interface IProtocolMessageEmitter {
  emitMessage(connection: ConnectionWrapper, message: Message): void;
  emitError(
    connection: ConnectionWrapper,
    payload: any,
    requestId?: number
  ): void;
}
