import { Container } from "inversify";
import { expect } from "chai";
import "chai-spies";
import "mocha";

// Types
import { TRedisClient, TIdentityDataFactory } from "../../types/di";

// Modules
import { IdentityDataFactoryService } from "./data-factory";

// Helpers
function getIdentityData(
  identityId: string,
  redisMethods: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TIdentityDataFactory).to(IdentityDataFactoryService);
  const identityDataFactory = container.get<IdentityDataFactoryService>(
    TIdentityDataFactory
  );
  return identityDataFactory.create(identityId);
}

// Tests
describe("IdentityDataFactory", () => {
  it("should create a new IdentityData", () => {
    const identityId = "foo";
    const identityData = getIdentityData(identityId);
    const newidentityId = identityData.getIdentityId();
    expect(newidentityId).to.equal(identityId);
  });
});
