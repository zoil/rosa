import { expect, spy } from "chai";
import "chai-spies";
import "mocha";

// Modules
import { IdentityData } from "./data";
import { IPromiseRedisClient } from "../../types/redis";

// Helpers
function getIdentityData(
  identityId: string,
  redisMethods: { [key: string]: any } = {}
) {
  return new IdentityData(redisMethods as IPromiseRedisClient, identityId);
}

// Tests
describe("IdentityData", () => {
  it("should create a new IdentityData", () => {
    const identityId = "foo";
    const identityData = getIdentityData(identityId);
    const newIdentityId = identityData.getIdentityId();
    expect(newIdentityId).to.equal(identityId);
  });

  it("should get data from Redis", () => {
    const identityId = "foo";
    const testField = "testKey";
    const fn = spy(() => Promise.resolve);
    const identityData = getIdentityData(identityId, {
      hget: fn
    });
    identityData.get(testField);
    expect(fn).to.have.been.called.with(identityData["dataKey"], testField);
  });

  it("should set data in Redis", () => {
    const identityId = "foo";
    const testField = "testKey";
    const testValue = "testValue";
    const fn = spy(() => Promise.resolve);
    const identityData = getIdentityData(identityId, {
      hset: fn
    });
    identityData.set(testField, testValue);
    expect(fn).to.have.been.called.with(
      identityData["dataKey"],
      testField,
      JSON.stringify(testValue)
    );
  });

  it("should delete a key in Redis", () => {
    const identityId = "foo";
    const testField = "testKey";
    const fn = spy(() => Promise.resolve);
    const identityData = getIdentityData(identityId, {
      hdel: fn
    });
    identityData.del(testField);
    expect(fn).to.have.been.called.with(identityData["dataKey"], testField);
  });

  it("should increment a key in Redis", () => {
    const identityId = "foo";
    const testField = "testKey";
    const testValue = 1;
    const fn = spy(() => Promise.resolve);
    const identityData = getIdentityData(identityId, {
      hincrby: fn
    });
    identityData.incr(testField, testValue);
    expect(fn).to.have.been.called.with(
      identityData["dataKey"],
      testField,
      testValue
    );
  });

  it("should delete all data from Redis on flush()", () => {
    const identityId = "foo";
    const fn = spy(() => Promise.resolve);
    const identityData = getIdentityData(identityId, {
      del: fn
    });
    identityData.flush().then(() => {
      expect(identityData["identityId"]).to.undefined;
      expect(identityData["dataKey"]).to.undefined;
    });
    expect(fn).to.have.been.called.with(identityData["dataKey"]);
  });
});
