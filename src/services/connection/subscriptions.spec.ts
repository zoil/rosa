import { Container } from "inversify";
import { expect } from "chai";
import "chai-spies";
import "mocha";

// Types
import { TConnectionSubscriptions } from "../../types/di";

// Modules
import ConnectionSubscriptionsService from "./subscriptions";

// Helpers
function getConnectionSubscriptionsService() {
  const container = new Container();
  container.bind(TConnectionSubscriptions).to(ConnectionSubscriptionsService);
  return container.get<ConnectionSubscriptionsService>(
    TConnectionSubscriptions
  );
}

// Tests
describe("ConnectionSubscriptionsService", () => {
  it("should update inner Sets on bind()", () => {
    const service = getConnectionSubscriptionsService();
    const connectionId = "connection11";
    const queryId = "query1";
    service.bind(connectionId, queryId);

    expect(service["queryIdsByConnectionIds"][connectionId]).to.not.be
      .undefined;
    expect(service["queryIdsByConnectionIds"][connectionId].has(queryId)).to.be
      .true;
    expect(service["connectionIdsByQueryIds"][queryId]).to.not.be.undefined;
    expect(service["connectionIdsByQueryIds"][queryId].has(connectionId)).to.be
      .true;
  });

  it("should update inner Sets on unbind()", () => {
    const service = getConnectionSubscriptionsService();
    const connectionId1 = "connection1";
    const queryId1 = "query1";
    service.bind(connectionId1, queryId1);
    const connectionId2 = "connection2";
    const queryId2 = "query2";
    service.bind(connectionId2, queryId2);
    service.unbind(connectionId2, queryId2);

    expect(service["queryIdsByConnectionIds"][connectionId2]).to.not.be
      .undefined;
    expect(service["queryIdsByConnectionIds"][connectionId1].has(queryId1)).to
      .be.true;
    expect(service["queryIdsByConnectionIds"][connectionId2].has(queryId2)).to
      .be.false;

    expect(service["connectionIdsByQueryIds"][queryId2]).to.not.be.undefined;
    expect(service["connectionIdsByQueryIds"][queryId1].has(connectionId1)).to
      .be.true;
    expect(service["connectionIdsByQueryIds"][queryId2].has(connectionId2)).to
      .be.false;
  });

  it("should return queryIds on getQueryIdsConnection()", () => {
    const dummyQueryIds = ["a", "b", "c"];
    const service = getConnectionSubscriptionsService();
    const connectionId = "connection1";
    dummyQueryIds.forEach(queryId => service.bind(connectionId, queryId));
    const queryIds = service.getQueryIdsForConnection(connectionId);
    expect(queryIds).to.deep.equal(dummyQueryIds);
  });

  it("should return connectionIds on getConnectionsForQueryId()", () => {
    const dummyConnectionIds = ["a", "b", "c"];
    const service = getConnectionSubscriptionsService();
    const queryId = "query1";
    dummyConnectionIds.forEach(connectionId =>
      service.bind(connectionId, queryId)
    );
    const connectionIds = service.getConnectionIdsForQueryId(queryId);
    expect(connectionIds).to.deep.equal(dummyConnectionIds);
  });

  it("should fetch 1 connectionId on getOneConnectionForQueryId()", () => {
    const dummyConnectionId = "connection1";
    const service = getConnectionSubscriptionsService();
    const queryId = "query1";
    service.bind(dummyConnectionId, queryId);
    const identityId = service.getOneConnectionForQueryId(queryId);
    expect(identityId).to.equal(dummyConnectionId);
  });

  // it("should remove a connections's queries and remove the connection from those queries when calling cleanupConnection()", async () => {
  //   const queryIds = ["a", "b", "c"];
  //   const connectionId = "connection1";
  //   const service = getConnectionSubscriptionsService();
  // });
});
