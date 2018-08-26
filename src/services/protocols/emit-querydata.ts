import { injectable, inject, Container } from "inversify";
import { ConnectionId } from "../../types/connection";
import { ConnectionWrapper } from "../connection/wrapper";
import {
  TConnectionStore,
  TProtocolQueryResultEmitter,
  TContainer
} from "../../types/di";
import { ConnectionStoreService } from "../connection/store";
import { Protocols, QueryId } from "rosa-shared";
import { IProtocolSubscriptionsEmitter } from "../../types/protocols";

@injectable()
export class ProtocolsSubscriptionsEmitterService {
  /**
   * Inject dependencies
   */
  @inject(TContainer)
  private container!: Container;
  @inject(TConnectionStore)
  private connectionStore!: ConnectionStoreService;

  private protocols: { [key: string]: IProtocolSubscriptionsEmitter };

  /**
   * Return a map of ConnectionWrappers with having their protocol as the key.
   */
  private groupConnectionIdsByProtocol(connectionIds: ConnectionId[]) {
    const result: { [key: string]: ConnectionWrapper[] } = Object.create(null);
    connectionIds.forEach(connectionId => {
      const connection = this.connectionStore.getConnectionById(connectionId);
      if (!connection) return;
      const protocol = connection.getProtocolId();

      if (result[protocol] === undefined) {
        result[protocol] = [];
      }

      result[protocol].push(connection);
    });
    return result;
  }

  constructor() {
    this.protocols = Object.create(null);
    const supportedProtocols = [Protocols.V1.ID];
    supportedProtocols.forEach(
      protocol =>
        (this.protocols[protocol] = this.container.getNamed(
          TProtocolQueryResultEmitter,
          protocol
        ))
    );
  }

  /**
   * Emit `data` of `queryId` to all `connectionIds`.
   */
  emitDataToConnectionIds(
    connectionIds: ConnectionId[],
    queryId: QueryId,
    data: any
  ) {
    // Group `connectionIds` by their protocol version.
    const connectionIdsByProtocolIds = this.groupConnectionIdsByProtocol(
      connectionIds
    );

    // Iterate through protocols and use the protocol strategies to emit `data`.
    const protocols = Object.keys(connectionIdsByProtocolIds);
    const promises: Promise<void>[] = [];
    protocols.forEach(protocolId => {
      const connectionIds = connectionIdsByProtocolIds[protocolId];
      const protocol = this.protocols[protocolId];
      if (protocol === undefined) {
        throw new Error(
          `Trying to send query data updates with an unsupported protocol "${protocolId}".`
        );
      }
      const promise = protocol.emitDataToConnectionIds(
        connectionIds,
        queryId,
        data
      );
      promises.push(promise);
    });

    // Return an umbrella promise of all emit operations.
    return Promise.all(promises);
  }
}
