import { QueryId, SessionId, Protocols } from "rosa-shared";
import { IdentityData } from "../services/identity/data";
import { Connection } from "../../node_modules/@types/sockjs";

export class ConnectionWrapper1 {
  private protocol!: string;

  constructor(private connection: Connection) {
    this.protocol = Protocols.Handshake.ID;
  }

  getConnection() {
    return this.connection;
  }

  getConnectionId() {
    return this.connection.id;
  }

  getProtocol() {
    return this.protocol;
  }

  setProtocol(protocol: string) {
    this.protocol = protocol;
  }
}

// export enum ConnectionState {
//   handshakePending,
//   protocolSet,
//   sessionSet,
//   disconnected
// }

// TODO: move this to rosa-shared
export enum ProtocolIds {
  Handshake = "H",
  V1 = "1"
}
// --
export class ConnectionOld {
  public protocol: ProtocolIds;
  public identity: string | false = false;

  constructor(private connectionId: string) {
    this.protocol = ProtocolIds.Handshake;
  }

  getConnectionId() {
    return this.connectionId;
  }
}

export type WebsocketPayload = { [key: string]: any };
export type WebsocketMessage = [string, WebsocketPayload];

export interface Message<T = any, P = any> {
  type: T;
  payload: P;
  requestId?: number;
}

export interface ProtocolConnectionInterface {
  disconnect(): void;
  sendMessage(message: Message): void;
  queueIncomingMessage(message: Message): void;
  setProtocolForVersion(requestedVersion: string): boolean;
  createNewSession(): Promise<any>;
  reuseSession(
    sessionId: SessionId,
    signature: string,
    timestamp: number
  ): Promise<any>;
  ensureSessionIsSet(): void;
  getSessionId(): SessionId | null;
  getSession(): IdentityData; // | null;
}

export interface ProtocolTypeNew {
  /**
   * Handle an incoming `payload` from a Connection.
   */
  onData(connection: Connection, payload: Message): any;

  /**
   * Handle the disconnection of `connection`.
   */
  onEnd(connection: Connection): void;

  /**
   * Handle full data transmit events from Subscriptions.
   */
  onSubscriptionData(
    connection: Connection,
    queryId: QueryId,
    payload: any
  ): void;

  /**
   * Handle delta data transmit events from Subscriptions.
   */
  onSubscriptionChanges(
    connection: Connection,
    queryId: QueryId,
    changeset: any
  ): void;
}

export interface ProtocolType {
  /**
   * Initialize this.
   */
  init(callbackInterface: ProtocolConnectionInterface): void;

  /**
   * Handle any incoming `payload` from a Connection.
   */
  onData(request: Message): any;

  /**
   * Handle Socket disconnections.
   */
  onEnd(): void;

  /**
   * Handle full data transmit events from Subscriptions.
   */
  onSubscriptionData(queryId: QueryId, payload: any): void;

  /**
   * Handle delta data transmit events from Subscriptions.
   */
  onSubscriptionChanges(queryId: QueryId, changeset: any): void;

  /**
   * Return the version identifier.
   */
  getVersion(): string;

  sendError(message: Message, code: number): void;
}
