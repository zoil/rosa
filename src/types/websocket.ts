import { QueryId, SessionId } from "rosa-shared";
import { SessionData } from "../services/session/data";
import * as Promise from "bluebird";

// export enum ConnectionState {
//   handshakePending,
//   protocolSet,
//   sessionSet,
//   disconnected
// }

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
  getSession(): SessionData | null;
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
