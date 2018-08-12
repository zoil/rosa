import { Container } from "inversify";
import { expect, spy } from "chai";
import "chai-spies";
import "mocha";
import { TRedisClient, TIdentityMeta, TConfig } from "../../types/di";
import IdentityMetaService, { KEY_IDENTITY_SECRET } from "./meta";

// Modules

// Helpers
function getIdentityMetaService(
  redisMethods: { [key: string]: any } = {},
  config: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TConfig).toConstantValue(config);
  container.bind(TIdentityMeta).to(IdentityMetaService);
  return container.get<IdentityMetaService>(TIdentityMeta);
}

async function authenticate(
  trigger: {
    invalidIdentityId?: boolean;
    badSecret?: boolean;
    timeout?: boolean;
  } = {
    invalidIdentityId: false,
    badSecret: false,
    timeout: false
  }
) {
  let secret: any;
  const fnSet = (...args: string[]) => {
    secret = args[2];
    Promise.resolve();
  };
  const fnGet = () => secret;
  const timeout = 10;
  const meta = getIdentityMetaService(
    {
      hset: fnSet,
      hget: fnGet
    },
    {
      authentication: {
        requestSignatureTimeout: timeout
      }
    }
  );
  const newIdentity = await meta.createNewIdentity();
  const timestamp = new Date().getTime();
  const signature = meta.generateSignature(
    trigger.invalidIdentityId ? "invalidIdentityId" : newIdentity.id,
    trigger.badSecret ? "badSecret" : newIdentity.secret,
    trigger.timeout ? timestamp - timeout - 1 : timestamp
  );
  meta.authenticate(newIdentity.id, signature, timestamp);
}

// Tests
describe("IdentityMetaService", () => {
  it("should return the correct Redis key", () => {
    const meta = getIdentityMetaService({}, {});
    const identityId = "foo";
    const result = meta["getKey"](identityId);
    expect(result).to.equal(`identity:${identityId}`);
  });

  it("should set the identity secret", () => {
    const identityId = "foo";
    const secret = "secret123";
    const fn = spy(() => Promise.resolve);
    const meta = getIdentityMetaService(
      {
        hset: fn
      },
      {}
    );
    meta["setSecret"](identityId, secret);
    const redisKey = meta["getKey"](identityId);
    expect(fn).to.have.been.called.with(redisKey, KEY_IDENTITY_SECRET, secret);
  });

  it("should get the identity secret", () => {
    const identityId = "foo";
    const fn = spy(() => Promise.resolve);
    const meta = getIdentityMetaService(
      {
        hget: fn
      },
      {}
    );
    meta["getSecret"](identityId);
    const redisKey = meta["getKey"](identityId);
    expect(fn).to.have.been.called.with(redisKey, KEY_IDENTITY_SECRET);
  });

  it("should create new identity with", () => {
    const fn = spy(() => Promise.resolve);
    const meta = getIdentityMetaService(
      {
        hset: fn
      },
      {}
    );
    meta.createNewIdentity().then(result => {
      const redisKey = meta["getKey"](result.id);
      expect(fn).to.have.been.called.with(
        redisKey,
        KEY_IDENTITY_SECRET,
        result.secret
      );
    });
  });

  it("should be able to authenticate an existing identity", () => {
    authenticate();
  });

  it("should fail to authenticate when using an invalid identity id", async () => {
    const fn = () =>
      authenticate({
        invalidIdentityId: true
      });
    expect(fn).to.throw;
  });

  it("should fail to authenticate when the hash is wrong", async () => {
    const fn = () =>
      authenticate({
        badSecret: true
      });
    expect(fn).to.throw;
  });

  it("should fail to authenticate when the request times out", async () => {
    const fn = () => authenticate({ timeout: true });
    expect(fn).to.throw;
  });

  it("should delete identity from Redis on cleanup()", () => {
    const identityId = "foo";
    const fn = spy(() => Promise.resolve);
    const meta = getIdentityMetaService(
      {
        del: fn
      },
      {}
    );
    meta.cleanup(identityId);
    const redisKey = meta["getKey"](identityId);
    expect(fn).to.have.been.called.with(redisKey);
  });
});
