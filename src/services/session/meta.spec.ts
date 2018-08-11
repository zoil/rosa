import { Container } from "inversify";
import { expect, spy } from "chai";
import "chai-spies";
import "mocha";
import { TRedisClient, TSessionMeta, TConfig } from "../../types/di";
import SessionMetaService, { KEY_SESSION_SECRET } from "./meta";

// Modules

// Helpers
function getSessionMetaService(
  redisMethods: { [key: string]: any } = {},
  config: { [key: string]: any } = {}
) {
  const container = new Container();
  const redisClient = redisMethods;
  container.bind(TRedisClient).toConstantValue(redisClient);
  container.bind(TConfig).toConstantValue(config);
  container.bind(TSessionMeta).to(SessionMetaService);
  return container.get<SessionMetaService>(TSessionMeta);
}

async function authenticate(
  trigger: {
    invalidSessionId?: boolean;
    badSecret?: boolean;
    timeout?: boolean;
  } = {
    invalidSessionId: false,
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
  const meta = getSessionMetaService(
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
  const newSession = await meta.createNewSession();
  const timestamp = new Date().getTime();
  const signature = meta.generateSignature(
    trigger.invalidSessionId ? "invalidSessionId" : newSession.id,
    trigger.badSecret ? "badSecret" : newSession.secret,
    trigger.timeout ? timestamp - timeout - 1 : timestamp
  );
  meta.authenticate(newSession.id, signature, timestamp);
}

// Tests
describe("SessionMetaService", () => {
  it("should return the correct Redis key", () => {
    const meta = getSessionMetaService({}, {});
    const sessionId = "foo";
    const result = meta["getKey"](sessionId);
    expect(result).to.equal(`session:${sessionId}`);
  });

  it("should set the session secret", () => {
    const sessionId = "foo";
    const secret = "secret123";
    const fn = spy(() => Promise.resolve);
    const meta = getSessionMetaService(
      {
        hset: fn
      },
      {}
    );
    meta["setSecret"](sessionId, secret);
    const redisKey = meta["getKey"](sessionId);
    expect(fn).to.have.been.called.with(redisKey, KEY_SESSION_SECRET, secret);
  });

  it("should get the session secret", () => {
    const sessionId = "foo";
    const fn = spy(() => Promise.resolve);
    const meta = getSessionMetaService(
      {
        hget: fn
      },
      {}
    );
    meta["getSecret"](sessionId);
    const redisKey = meta["getKey"](sessionId);
    expect(fn).to.have.been.called.with(redisKey, KEY_SESSION_SECRET);
  });

  it("should create new session with", () => {
    const fn = spy(() => Promise.resolve);
    const meta = getSessionMetaService(
      {
        hset: fn
      },
      {}
    );
    meta.createNewSession().then(result => {
      const redisKey = meta["getKey"](result.id);
      expect(fn).to.have.been.called.with(
        redisKey,
        KEY_SESSION_SECRET,
        result.secret
      );
    });
  });

  it("should be able to authenticate an existing session", () => {
    authenticate();
  });

  it("should fail to authenticate when using an invalid session id", async () => {
    const fn = () =>
      authenticate({
        invalidSessionId: true
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

  it("should delete session from Redis on cleanup()", () => {
    const sessionId = "foo";
    const fn = spy(() => Promise.resolve);
    const meta = getSessionMetaService(
      {
        del: fn
      },
      {}
    );
    meta.cleanup(sessionId);
    const redisKey = meta["getKey"](sessionId);
    expect(fn).to.have.been.called.with(redisKey);
  });
});
