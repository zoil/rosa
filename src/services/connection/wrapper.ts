import { Protocols, QueryId } from "rosa-shared";
import { Connection } from "../../../node_modules/@types/sockjs";
import { IdentityId } from "../../types/identity";

export class ConnectionWrapper {
  private protocol!: string;
  private identityId!: IdentityId;

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

  getIdentityId() {
    return this.identityId;
  }

  setIdentityId(identityId: IdentityId) {
    this.identityId = identityId;
  }

  async onSubscriptionData(queryId: QueryId, result: any): Promise<void> {
    return Promise.resolve();
  }
}
