import { Container } from "inversify";
import { expect } from "chai";
import "chai-spies";
import "mocha";

// Types
import { TRedisClient, TSessionDataFactory } from "../../types/di";

// Modules
import { SessionDataFactory } from "./data-factory";

// Helpers
function getSessionData(
  sessionId: string,
  redisMethods: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TSessionDataFactory).to(SessionDataFactory);
  const sessionDataFactory = container.get<SessionDataFactory>(
    TSessionDataFactory
  );
  return sessionDataFactory.create(sessionId);
}

// Tests
describe("SessionDataFactory", () => {
  it("should create a new SessionData", () => {
    const sessionId = "foo";
    const sessionData = getSessionData(sessionId);
    const newSessionId = sessionData.getSessionId();
    expect(newSessionId).to.equal(sessionId);
  });
});
