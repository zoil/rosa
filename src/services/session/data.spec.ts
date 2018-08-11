import { expect, spy } from "chai";
import "chai-spies";
import "mocha";

// Modules
import { SessionData } from "./data";
import { IPromiseRedisClient } from "../../types/redis";

// Helpers
function getSessionData(
  sessionId: string,
  redisMethods: { [key: string]: any } = {}
) {
  return new SessionData(redisMethods as IPromiseRedisClient, sessionId);
}

// Tests
describe("SessionDataFactory", () => {
  it("should create a new SessionData", () => {
    const sessionId = "foo";
    const sessionData = getSessionData(sessionId);
    const newSessionId = sessionData.getSessionId();
    expect(newSessionId).to.equal(sessionId);
  });

  it("should get data from Redis", () => {
    const sessionId = "foo";
    const testField = "testKey";
    const fn = spy(() => Promise.resolve);
    const sessionData = getSessionData(sessionId, {
      hget: fn
    });
    sessionData.get(testField);
    expect(fn).to.have.been.called.with(sessionData["dataKey"], testField);
  });

  it("should set data in Redis", () => {
    const sessionId = "foo";
    const testField = "testKey";
    const testValue = "testValue";
    const fn = spy(() => Promise.resolve);
    const sessionData = getSessionData(sessionId, {
      hset: fn
    });
    sessionData.set(testField, testValue);
    expect(fn).to.have.been.called.with(
      sessionData["dataKey"],
      testField,
      JSON.stringify(testValue)
    );
  });

  it("should delete a key in Redis", () => {
    const sessionId = "foo";
    const testField = "testKey";
    const fn = spy(() => Promise.resolve);
    const sessionData = getSessionData(sessionId, {
      hdel: fn
    });
    sessionData.del(testField);
    expect(fn).to.have.been.called.with(sessionData["dataKey"], testField);
  });

  it("should increment a key in Redis", () => {
    const sessionId = "foo";
    const testField = "testKey";
    const testValue = 1;
    const fn = spy(() => Promise.resolve);
    const sessionData = getSessionData(sessionId, {
      hincrby: fn
    });
    sessionData.incr(testField, testValue);
    expect(fn).to.have.been.called.with(
      sessionData["dataKey"],
      testField,
      testValue
    );
  });

  it("should delete all data from Redis on flush()", () => {
    const sessionId = "foo";
    const fn = spy(() => Promise.resolve);
    const sessionData = getSessionData(sessionId, {
      del: fn
    });
    sessionData.flush().then(() => {
      expect(sessionData["sessionId"]).to.undefined;
      expect(sessionData["dataKey"]).to.undefined;
    });
    expect(fn).to.have.been.called.with(sessionData["dataKey"]);
  });
});
