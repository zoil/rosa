import { Container } from "inversify";
import { expect, spy } from "chai";
import "chai-spies";
import "mocha";
import { TRedisClient, TConfig, TQueryMetaService } from "../../types/di";
import QueryMetaService, { KEY_PARAMS, KEY_PUBLICATION } from "./meta";

// Helpers
function getQueryMetaService(
  redisMethods: { [key: string]: any } = {},
  config: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TConfig).toConstantValue(config);
  container.bind(TQueryMetaService).to(QueryMetaService);
  return container.get<QueryMetaService>(TQueryMetaService);
}

describe("QueryMetaService", () => {
  it("should be able to determine whether a query exists", async () => {
    const dummyQueryId = "query1";
    let dummyQueryKey: string;
    const fnExists = spy((queryKey: string) => {
      return Promise.resolve(queryKey === dummyQueryKey);
    });
    const service = getQueryMetaService({
      exists: fnExists
    });
    dummyQueryKey = service["getKey"](dummyQueryId);
    const doesItExist1 = await service.exists(dummyQueryId);
    expect(fnExists).to.have.been.called.with(dummyQueryKey);
    expect(doesItExist1).to.be.true;

    const doesItExist2 = await service.exists("foo");
    expect(doesItExist2).to.be.false;
  });

  it("should be able register a new query", async () => {
    const fnHset = spy(() => false);
    const fnExec = spy(() => false);
    const fnMulti = spy(() => ({
      hset: fnHset,
      exec: fnExec
    }));
    const service = getQueryMetaService({
      multi: fnMulti
    });
    const queryId = "query1";
    const publicationName = "publication1";
    const params = { test: true };
    const paramsJson = JSON.stringify(params);
    const queryKey = service["getKey"](queryId);

    await service.create(queryId, publicationName, params);
    expect(fnMulti).to.have.been.called;
    expect(fnHset).to.have.been.called.with(queryKey, KEY_PARAMS, paramsJson);
    expect(fnHset).to.have.been.called.with(
      queryKey,
      KEY_PUBLICATION,
      publicationName
    );
    expect(fnExec).to.have.been.called;
  });

  it("should return params of an existing query", async () => {
    const dummyParams = { test: true };
    const queryId = "query1";
    const fnHget = spy(() => Promise.resolve(JSON.stringify(dummyParams)));
    const service = getQueryMetaService({
      hget: fnHget
    });
    const queryParams = await service.getParams(queryId);
    const queryKey = service["getKey"](queryId);
    expect(fnHget).to.have.been.called.with(queryKey);
    expect(queryParams).to.deep.equal(dummyParams).deep;
  });

  it("should return the publication id and params of an existing query", async () => {
    const dummyParams = { test: true };
    const queryId = "query1";
    const publicationId = "publication1";
    const fnHmget = spy(() =>
      Promise.resolve([publicationId, JSON.stringify(dummyParams)])
    );
    const service = getQueryMetaService({
      hmget: fnHmget
    });
    const queryIdAndParams = await service.getPublicationIdAndParams(queryId);
    const queryKey = service["getKey"](queryId);
    expect(fnHmget).to.have.been.called.with(queryKey);
    expect(queryIdAndParams.publicationId).to.deep.equal(publicationId).deep;
    expect(queryIdAndParams.queryParams).to.deep.equal(dummyParams).deep;
  });

  it("should delete from redis on cleanup()", async () => {
    const queryId = "query1";
    const fnDel = spy(() => Promise.resolve());
    const service = getQueryMetaService({
      del: fnDel
    });
    await service.cleanup(queryId);
    const queryKey = service["getKey"](queryId);
    expect(fnDel).to.have.been.called.with(queryKey);
  });
});
