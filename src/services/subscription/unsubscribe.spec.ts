import { Container } from "inversify";
import { expect, spy } from "chai";
import "chai-spies";
import "mocha";

// Modules
import QueryUnsubscribeService from "./unsubscribe";
import { TConnectionSubscriptions, TQueryUnsubscribe } from "../../types/di";
import { ConnectionId } from "../../types/connection";
import { QueryId } from "rosa-shared";

// Helpers
function getQueryUnsubscribeService(
  subscriptionServiceMethods: { [key: string]: any } = {}
) {
  const container = new Container();
  container
    .bind(TConnectionSubscriptions)
    .toConstantValue(subscriptionServiceMethods);
  container.bind(TQueryUnsubscribe).to(QueryUnsubscribeService);
  return container.get<QueryUnsubscribeService>(TQueryUnsubscribe);
}

describe("QueryUnsubscribeService", () => {
  it("should unsubscribe a single connection from a single query", async () => {
    const fnUnbind = spy(() => Promise.resolve());
    const service = getQueryUnsubscribeService({
      unbind: fnUnbind
    });
    const connectionId: ConnectionId = "conn1";
    const queryId: QueryId = "query1";
    await service.unsubscribe(connectionId, queryId);
    expect(fnUnbind).to.have.been.called.with(connectionId, queryId);
  });

  it("should unsubscribe a single connection from all its queries", async () => {
    const dummyQueryIds = ["q1", "q2", "q3"];
    const fnGetQueryIdsForConnection = spy(() =>
      Promise.resolve(dummyQueryIds)
    );
    const service = getQueryUnsubscribeService({
      getQueryIdsForConnection: fnGetQueryIdsForConnection
    });
    const fnUnsubscribe = spy(() => Promise.resolve());
    service.unsubscribe = fnUnsubscribe;
    const connectionId: ConnectionId = "conn1";
    await service.unsubscribeAll(connectionId);
    expect(fnGetQueryIdsForConnection).to.have.been.called.with(connectionId);
    dummyQueryIds.forEach(dummyQueryId =>
      expect(fnUnsubscribe).to.have.been.called.with(connectionId, dummyQueryId)
    );
  });
});
