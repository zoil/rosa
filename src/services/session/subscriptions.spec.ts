import { Container } from "inversify";
import { expect, spy } from "chai";
import "chai-spies";
import "mocha";

// Types
import { TRedisClient, TConfig, TSessionSubscriptions } from "../../types/di";

// Modules
import SessionSubscriptionsService from "./subscriptions";

// Helpers
function getSessionSubscriptionsService(
  redisMethods: { [key: string]: any } = {},
  config: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TConfig).toConstantValue(config);
  container.bind(TSessionSubscriptions).to(SessionSubscriptionsService);
  return container.get<SessionSubscriptionsService>(TSessionSubscriptions);
}

// Tests
describe("SessionMetaService", () => {
  it("should update Redis on bind()", () => {
    const fnSadd = spy(() => {});
    const fnExec = spy(() => Promise.resolve);
    const fnMulti = spy(() => ({
      sadd: fnSadd,
      exec: fnExec
    }));
    const service = getSessionSubscriptionsService({
      multi: fnMulti
    });
    const sessionId = "session1";
    const queryId = "query1";
    service.bind(sessionId, queryId);
    expect(fnMulti).to.have.been.called;

    const sessionKey = service["getKeyForSession"](sessionId);
    expect(fnSadd).to.have.been.called.with(sessionKey, queryId);
    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSadd).to.have.been.called.with(queryKey, sessionId);
    expect(fnExec).to.have.been.called;
  });

  it("should update Redis on unbind()", () => {
    const fnSrem = spy(() => {});
    const fnExec = spy(() => Promise.resolve);
    const fnMulti = spy(() => ({
      srem: fnSrem,
      exec: fnExec
    }));
    const service = getSessionSubscriptionsService({
      multi: fnMulti
    });
    const sessionId = "session1";
    const queryId = "query1";
    service.unbind(sessionId, queryId);
    expect(fnMulti).to.have.been.called;

    const sessionKey = service["getKeyForSession"](sessionId);
    expect(fnSrem).to.have.been.called.with(sessionKey, queryId);
    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSrem).to.have.been.called.with(queryKey, sessionId);
    expect(fnExec).to.have.been.called;
  });

  it("should fetch queryIds on getQueryIdsSession()", () => {
    const dummyQueryIds = ["a", "b", "c"];
    const fnSmembers = spy(() => Promise.resolve(dummyQueryIds));
    const service = getSessionSubscriptionsService({
      smembers: fnSmembers
    });
    const sessionId = "session1";
    service
      .getQueryIdsSession(sessionId)
      .then(queryIds => expect(queryIds).to.equal(dummyQueryIds));

    const sessionKey = service["getKeyForSession"](sessionId);
    expect(fnSmembers).to.have.been.called.with(sessionKey);
  });

  it("should fetch sessionIds on getSessionsForQueryId()", () => {
    const dummySessionIds = ["a", "b", "c"];
    const fnSmembers = spy(() => Promise.resolve(dummySessionIds));
    const service = getSessionSubscriptionsService({
      smembers: fnSmembers
    });
    const queryId = "query1";
    service
      .getSessionsForQueryId(queryId)
      .then(queryIds => expect(queryIds).to.equal(dummySessionIds));

    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSmembers).to.have.been.called.with(queryKey);
  });

  it("should fetch 1 sessionId on getOneSessionForQueryId()", () => {
    const dummySessionId = "session1";
    const fnSrandmember = spy(() => Promise.resolve(dummySessionId));
    const service = getSessionSubscriptionsService({
      srandmember: fnSrandmember
    });
    const queryId = "query1";
    service
      .getOneSessionForQueryId(queryId)
      .then(sessionId => expect(sessionId).to.equal(dummySessionId));

    const queryKey = service["getKeyForQueryId"](queryId);
    expect(fnSrandmember).to.have.been.called.with(queryKey);
  });

  it("should remove a session's queries and remove the session from those queries when calling cleanupSession()", async () => {
    const queryIds = ["a", "b", "c"];
    const sessionId = "session1";
    const fnDel = spy(() => false);
    const fnExec = spy(() => false);
    const fnMulti = spy(() => ({
      del: fnDel,
      // srem: fnSrem,
      exec: fnExec
    }));
    const service = getSessionSubscriptionsService({
      multi: fnMulti
    });
    const fnGetQueryIdsSession = () => Promise.resolve(queryIds);
    service["getQueryIdsSession"] = fnGetQueryIdsSession;
    await service.cleanupSession(sessionId);
    const sessionKey = service["getKeyForSession"](sessionId);
    queryIds.forEach(queryId => {
      const queryKey = service["getKeyForQueryId"](queryId);
      expect(fnDel).to.have.been.called.with(queryKey);
    });
    expect(fnDel).to.have.been.called.with(sessionKey);
    expect(fnExec).to.have.been.called;
  });
});
