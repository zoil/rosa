import { Container } from "typedi";
import * as Promise from "bluebird";
import * as ejson from "ejson";

// Types
import {
  ProtocolType,
  Message,
  ProtocolConnectionInterface
} from "../types/websocket";
import { QueryId } from "rosa-shared";

// Services
import QueryPublishService from "../services/query/publish";

// Others
import { Protocols } from "rosa-shared";

import PublicationSubscribeService from "../services/publication/subscribe";
import QueryUnwatchService from "../services/query/unsubscribe";
// import ActionStoreService from "../services/action/store";
import ExecuteAction from "../services/action/execute";

/**
 * Protocol Version 1.
 * This is a Strategy class for Connections.
 */
export default class ProtocolV1 implements ProtocolType {
  /**
   * The Connection this is linked with.
   */
  private connection!: ProtocolConnectionInterface;

  /**
   * Create a new session and send back a ConnectResponse about it.
   */
  private createNewSession(request: Protocols.V1.Client.SessionNewRequest) {
    return this.connection.createNewSession().then(result => {
      const payload: Protocols.V1.Server.SessionNewPayload = {
        version: Protocols.V1.ID,
        session: result.id,
        secret: result.secret
      };
      const response = Protocols.V1.Server.messageFactory(
        Protocols.V1.Server.Tokens.SessionNew,
        payload,
        request.requestId
      );
      this.connection.sendMessage(response);
    });
  }

  /**
   * Try and re-use the session specified in `request`.
   * If successful, send back a ConnectionResponse with the details and return
   * true. Otherwise return false.
   */
  private reuseSession(
    request: Protocols.V1.Client.SessionReuseRequest
  ): Promise<boolean> {
    return Promise.try(() => {
      if (request.payload.session) {
        const { session, signature = "", timestamp = 0 } = request.payload;
        return this.connection
          .reuseSession(session, signature, timestamp)
          .then(() => {
            const payload: Protocols.V1.Server.SessionReusePayload = {
              session: session
            };
            const response = Protocols.V1.Server.messageFactory(
              Protocols.V1.Server.Tokens.SessionReuse,
              payload,
              request.requestId
            );
            this.connection.sendMessage(response);
            return true;
          });
      }
      return false;
    });
  }

  private requestSessionNew(request: Protocols.V1.Client.SessionNewRequest) {
    return this.createNewSession(request);
  }

  private requestSessionReuse(
    request: Protocols.V1.Client.SessionReuseRequest
  ) {
    return this.reuseSession(request);
  }

  /**
   * WatchRequest
   */
  private requestWatch(
    request: Protocols.V1.Client.WatchRequest
  ): Promise<any> {
    return Promise.try(() => {
      this.connection.ensureSessionIsSet();
      const watchPublicationService = Container.get(
        PublicationSubscribeService
      );
      const session = this.connection.getSession();
      if (!session) {
        throw new Error("unauthorised");
      }
      return watchPublicationService.subscribe(
        session,
        request.payload.name,
        request.payload.params
      );
    }).then((queryId: QueryId) => {
      const queryPublishService = Container.get(QueryPublishService);
      // TODO: what is this?????
      // this sends down the initial payload in the pipe
      const sessionId = this.connection.getSessionId();
      if (sessionId)
        queryPublishService.queryIdForSessionId(queryId, sessionId);

      if (!request.requestId) {
        throw new Error("No Request Id");
      }
      const payload: Protocols.V1.Server.WatchPayload = {
        id: queryId
      };
      const response = Protocols.V1.Server.messageFactory(
        Protocols.V1.Server.Tokens.Watch,
        payload,
        request.requestId
      );
      this.connection.sendMessage(response);
    });
  }

  /**
   * UnwatchRequest
   */
  private requestUnwatch(request: Protocols.V1.Client.UnwatchRequest) {
    return Promise.try(() => {
      this.connection.ensureSessionIsSet();
      const queryUnwatchService = Container.get(QueryUnwatchService);
      const session = this.connection.getSession();
      if (!session) {
        throw new Error("No session");
      }
      return queryUnwatchService.unwatch(session, request.payload.id);
    }).then(() => {
      const payload: Protocols.V1.Server.UnwatchPayload = {
        handle: request.payload.id
      };
      if (!request.requestId) {
        throw new Error("No Request Id");
      }
      const response = Protocols.V1.Server.messageFactory(
        Protocols.V1.Server.Tokens.Unwatch,
        payload,
        request.requestId
      );
      this.connection.sendMessage(response);
    });
  }

  /**
   * ExecRequest
   */
  private requestExec(request: Protocols.V1.Client.ExecRequest) {
    console.log("// exec", request.payload.name, request.payload.params);
    //   return Promise.try(() => {
    //     this.ensureSessionIsSet();
    //     console.log("Exec", actionName, params);
    //     const executeActionService = Container.get(ExecuteActionService);
    //     return executeActionService.execute(actionName, params, this.session);
    //   });
    return Promise.try(() => {
      this.connection.ensureSessionIsSet();
      const executeActionService = Container.get(ExecuteAction);
      const session = this.connection.getSession();
      if (!session) {
        throw new Error("No session");
      }
      return executeActionService
        .execute(request.payload.name, request.payload.params, session)
        .then((result: any) => {
          // const payload: Protocols.V1.Server.ExecResponse
          // console.log(result);
          const response = Protocols.V1.Server.messageFactory(
            Protocols.V1.Server.Tokens.Exec,
            result,
            request.requestId ? request.requestId : 0
          );
          this.connection.sendMessage(response);
        })
        .catch(() => {
          this.sendError(request, 0);
        });
      // return executeActionService.execute(actionName, params, this.session);
      // const payload: Protocols.V1.Server.ExecResponse = {
      //   handle: request.payload.id
      // };
      // const { endpoint, params } = payload;
      // return this.connection.execAction(endpoint, params);
    });
  }

  init(connection: ProtocolConnectionInterface) {
    // Link `connection` with `this`
    this.connection = connection;
  }

  getVersion() {
    return Protocols.V1.ID;
  }

  /**
   * Handle any incoming `payload` from a Connection.
   */
  onData(request: Message) {
    switch (request.type) {
      case Protocols.V1.Client.Tokens.SessionNew:
        return this.requestSessionNew(request);
      case Protocols.V1.Client.Tokens.SessionReuse:
        return this.requestSessionReuse(request);
      case Protocols.V1.Client.Tokens.Watch:
        return this.requestWatch(request);
      case Protocols.V1.Client.Tokens.Unwatch:
        return this.requestUnwatch(request);
      case Protocols.V1.Client.Tokens.Exec:
        return this.requestExec(request);
      default:
        return this.sendError(request, 0);
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
  onSubscriptionData(queryId: QueryId, data: any) {
    const dataEJson = ejson.stringify(data);
    const chunkSize = 100; // TODO: from config
    const chunksCount = Math.ceil(dataEJson.length / chunkSize);
    for (let i = 0; i < chunksCount; i++) {
      const payload: Protocols.V1.Server.WatchDataPayload = {
        id: queryId,
        total: chunksCount,
        part: 0,
        stream: ""
      };
      const message = Protocols.V1.Server.messageFactory(
        Protocols.V1.Server.Tokens.WatchData,
        payload
      );
      message.payload.part = i + 1;
      message.payload.stream = dataEJson.substr(i * chunkSize, chunkSize);

      this.connection.sendMessage(message);
    }
  }

  /**
   * Handle delta data transmit events from Subscriptions.
   */
  onSubscriptionChanges(queryId: QueryId, changeset: any) {
    console.log("??", queryId, changeset);
  }

  sendError(message: Message, code: number) {
    const payload: Protocols.V1.Server.ErrorPayload = { error: code };
    const response = Protocols.V1.Server.messageFactory(
      Protocols.V1.Server.Tokens.Error,
      payload,
      message.requestId ? message.requestId : 0
    );
    this.connection.sendMessage(response);
  }
}
