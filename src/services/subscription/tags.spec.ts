import { Container } from "inversify";
import { expect, spy } from "chai";
import "chai-spies";
import "mocha";

// Types
import { TRedisClient, TConfig, TQueryTagsService } from "../../types/di";

// Modules
import QueryTagsService from "./tags";
import { RedisClient } from "redis";

// Helpers
function getQueryTagsService(
  redisMethods: { [key: string]: any } = {},
  config: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TConfig).toConstantValue(config);
  container.bind(TQueryTagsService).to(QueryTagsService);
  return container.get<QueryTagsService>(TQueryTagsService);
}

// Tests
describe("QueryTagsService", () => {
  it("should return tags for a queryId", async () => {
    const dummyTags = ["a", "b", "c"];
    const dummyQueryId = "query1";
    const fnSmembers = spy(() => Promise.resolve(dummyTags));
    const service = getQueryTagsService({
      smembers: fnSmembers
    });
    const tags = await service.getTagsForQueryId(dummyQueryId);
    const queryKey = service["getKeyForQueryId"](dummyQueryId);
    expect(fnSmembers).to.have.been.called.with(queryKey);
    expect(tags).to.deep.equal(dummyTags);
  });

  it("should return queryIds for a tag", async () => {
    const dummyQueryIds = ["a", "b", "c"];
    const dummyTag = "tag1";
    const fnSmembers = spy(() => Promise.resolve(dummyQueryIds));
    const service = getQueryTagsService({
      smembers: fnSmembers
    });
    const queryIds = await service.getQueryIdsForTag(dummyTag);
    const tagKey = service["getKeyForTag"](dummyTag);
    expect(fnSmembers).to.have.been.called.with(tagKey);
    expect(queryIds).to.deep.equal(dummyQueryIds);
  });

  it("should return queryIds for a tags", async () => {
    const dummyQueryIds = ["a", "b", "c"];
    const dummyTags = ["tag1", "tag2"];
    const fnSunion = spy(() => Promise.resolve(dummyQueryIds));
    const service = getQueryTagsService({
      sunion: fnSunion
    });
    const queryIds = await service.getQueryIdsForTags(dummyTags);
    const tagKeys = dummyTags.map(tag => service["getKeyForTag"](tag));
    expect(fnSunion).to.have.been.called.with(tagKeys);
    expect(queryIds).to.deep.equal(dummyQueryIds);
  });

  it("should add missing tags", async () => {
    const service = getQueryTagsService();
    const fnSadd = spy(() => false);
    const redis: RedisClient = Object.create(null);
    redis.sadd = fnSadd;
    const tagKeys: { [key: string]: string } = {
      t1: "tk1",
      t2: "tk2",
      t3: "tk3"
    };
    const queryKey = "query1Key";
    const queryId = "query1";
    const newTags = ["t1", "t2", "t3"];
    const oldTags = ["t2"];
    const options = {
      redis,
      tagKeys,
      queryKey,
      queryId,
      newTags,
      oldTags
    };

    // add missing tags
    service["update_addMissingTags"](options);

    const addedTags = ["t1", "t3"];
    addedTags.forEach(tag => {
      expect(fnSadd).to.have.been.called.with(options.queryKey, tag);
      const addedTagKey = options.tagKeys[tag];
      expect(fnSadd).to.have.been.called.with(addedTagKey, options.queryId);
    });
  });

  it("should remove obsolete tags", async () => {
    const service = getQueryTagsService();
    const fnSrem = spy(() => false);
    const redis: RedisClient = Object.create(null);
    redis.srem = fnSrem;
    const tagKeys: { [key: string]: string } = {
      t1: "tk1",
      t2: "tk2",
      t3: "tk3"
    };
    const queryKey = "query1Key";
    const queryId = "query1";
    const newTags = ["t2"];
    const oldTags = ["t1", "t2", "t3"];
    const options = {
      redis,
      tagKeys,
      queryKey,
      queryId,
      newTags,
      oldTags
    };

    // add missing tags
    service["update_removeObsoleteTags"](options);

    const removedTags = ["t1", "t3"];
    removedTags.forEach(tag => {
      expect(fnSrem).to.have.been.called.with(options.queryKey, tag);
      const addedTagKey = options.tagKeys[tag];
      expect(fnSrem).to.have.been.called.with(addedTagKey, options.queryId);
    });
  });

  it("should generate tag keys", async () => {
    const service = getQueryTagsService();
    const dummyTags = ["t1", "t2", "t3"];
    const expectedTagKeys: { [key: string]: string } = {};
    dummyTags.forEach(tag => {
      expectedTagKeys[tag] = service["getKeyForTag"](tag);
    });
    const tagKeys = service["update_getTagKeys"](dummyTags);
    expect(tagKeys).to.deep.equal(expectedTagKeys);
  });

  it("should update a queryId with newTags", async () => {
    const fnExec = spy(() => Promise.resolve());
    const fnMultiResult = {
      exec: fnExec
    };
    const fnMulti = spy(() => fnMultiResult);
    const service = getQueryTagsService({
      multi: fnMulti
    });
    const dummyQueryId = "q1";
    const dummyQueryKey = service["getKeyForQueryId"](dummyQueryId);
    const dummyOldTags = ["t1"];
    const dummyNewTags = ["t2", "t3"];
    const dummyTagKeys = { t1: "tk1", t2: "tk2", t3: "tk3" };

    const fnGetTagsForQueryId = spy(() => Promise.resolve(dummyOldTags));
    service.getTagsForQueryId = fnGetTagsForQueryId;
    const fnUpdate_getTagKeys = spy(() => dummyTagKeys);
    service["update_getTagKeys"] = fnUpdate_getTagKeys;

    const expectedOptions = {
      redis: fnMultiResult,
      tagKeys: dummyTagKeys,
      queryKey: dummyQueryKey,
      queryId: dummyQueryId,
      newTags: dummyNewTags,
      oldTags: dummyOldTags
    };

    const fnUpdate_addMissingTags = spy(() => false);
    service["update_addMissingTags"] = fnUpdate_addMissingTags;
    const fnUpdate_removeObsoleteTags = spy(() => false);
    service["update_removeObsoleteTags"] = fnUpdate_removeObsoleteTags;

    await service.update(dummyQueryId, dummyNewTags);

    expect(fnMulti).to.have.been.called;
    expect(fnUpdate_addMissingTags).to.have.been.called.with(expectedOptions);
    expect(fnUpdate_removeObsoleteTags).to.have.been.called.with(
      expectedOptions
    );
    expect(fnExec).to.have.been.called;
  });

  it("should clean up by a queryId", async () => {
    const fnDel = spy(() => Promise.resolve());
    const fnUpdate = spy(() => Promise.resolve());
    const service = getQueryTagsService({
      del: fnDel
    });
    const dummyQueryId = "q1";
    const dummyQueryKey = service["getKeyForQueryId"](dummyQueryId);
    service.update = fnUpdate;
    await service.cleanupQueryId(dummyQueryId);
    expect(fnUpdate).to.have.been.called.with(dummyQueryId, []);
    expect(fnDel).to.have.been.called.with(dummyQueryKey);
  });
});
