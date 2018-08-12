import { Container } from "inversify";
import { expect, spy } from "chai";
import "chai-spies";
import "mocha";

// Types
import {
  TRedisClient,
  TConfig,
  TConnectionSubscriptions
} from "../../types/di";

// Modules
import ConnectionSubscriptionsService from "./subscriptions";

// Helpers
function getConnectionSubscriptionsService(
  redisMethods: { [key: string]: any } = {},
  config: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TConfig).toConstantValue(config);
  container.bind(TConnectionSubscriptions).to(ConnectionSubscriptionsService);
  return container.get<ConnectionSubscriptionsService>(
    TConnectionSubscriptions
  );
}

// Tests
describe("ConnectionSubscriptionsService", () => {
  it("should update Redis on bind()", () => {
    const fnSadd = spy(() => {});
    const fnExec = spy(() => Promise.resolve);
    const fnMulti = spy(() => ({
      sadd: fnSadd,
      exec: fnExec
    }));
    const service = getConnectionSubscriptionsService({
      multi: fnMulti
    });
    const connectionId = "connection11";
    const queryId = "query1";
    service.bind(connectionId, queryId);
    expect(fnMulti).to.have.been.called;

    const connectionKey = service["getKeyForConnection"](connectionId);
    expect(fnSadd).to.have.been.called.with(connectionKey, queryId);
    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSadd).to.have.been.called.with(queryKey, connectionId);
    expect(fnExec).to.have.been.called;
  });

  it("should update Redis on unbind()", () => {
    const fnSrem = spy(() => {});
    const fnExec = spy(() => Promise.resolve);
    const fnMulti = spy(() => ({
      srem: fnSrem,
      exec: fnExec
    }));
    const service = getConnectionSubscriptionsService({
      multi: fnMulti
    });
    const connectionId = "connection1";
    const queryId = "query1";
    service.unbind(connectionId, queryId);
    expect(fnMulti).to.have.been.called;

    const identityKey = service["getKeyForConnection"](connectionId);
    expect(fnSrem).to.have.been.called.with(identityKey, queryId);
    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSrem).to.have.been.called.with(queryKey, connectionId);
    expect(fnExec).to.have.been.called;
  });

  it("should fetch queryIds on getQueryIdsConnection()", () => {
    const dummyQueryIds = ["a", "b", "c"];
    const fnSmembers = spy(() => Promise.resolve(dummyQueryIds));
    const service = getConnectionSubscriptionsService({
      smembers: fnSmembers
    });
    const connectionId = "connection1";
    service
      .getQueryIdsForConnection(connectionId)
      .then(queryIds => expect(queryIds).to.equal(dummyQueryIds));

    const connectionKey = service["getKeyForConnection"](connectionId);
    expect(fnSmembers).to.have.been.called.with(connectionKey);
  });

  it("should fetch identityIds on getConnectionsForQueryId()", () => {
    const dummyConnectionIds = ["a", "b", "c"];
    const fnSmembers = spy(() => Promise.resolve(dummyConnectionIds));
    const service = getConnectionSubscriptionsService({
      smembers: fnSmembers
    });
    const queryId = "query1";
    service
      .getConnectionsForQueryId(queryId)
      .then(queryIds => expect(queryIds).to.equal(dummyConnectionIds));

    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSmembers).to.have.been.called.with(queryKey);
  });

  it("should fetch 1 connectionId on getOneConnectionForQueryId()", () => {
    const dummyConnectionId = "connection1";
    const fnSrandmember = spy(() => Promise.resolve(dummyConnectionId));
    const service = getConnectionSubscriptionsService({
      srandmember: fnSrandmember
    });
    const queryId = "query1";
    service
      .getOneConnectionForQueryId(queryId)
      .then(identityId => expect(identityId).to.equal(dummyConnectionId));

    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSrandmember).to.have.been.called.with(queryKey);
  });

  it("should remove a connections's queries and remove the connection from those queries when calling cleanupConnection()", async () => {
    const queryIds = ["a", "b", "c"];
    const connectionId = "connection1";
    const fnDel = spy(() => false);
    const fnExec = spy(() => false);
    const fnMulti = spy(() => ({
      del: fnDel,
      exec: fnExec
    }));
    const service = getConnectionSubscriptionsService({
      multi: fnMulti
    });
    const fnGetQueryIdsConnection = () => Promise.resolve(queryIds);
    service["getQueryIdsForConnection"] = fnGetQueryIdsConnection;
    await service.cleanupConnection(connectionId);
    const connectionKey = service["getKeyForConnection"](connectionId);
    queryIds.forEach(queryId => {
      const queryKey = service["getKeyForQueryId"](queryId);
      expect(fnDel).to.have.been.called.with(queryKey);
    });
    expect(fnDel).to.have.been.called.with(connectionKey);
    expect(fnExec).to.have.been.called;
  });
});
