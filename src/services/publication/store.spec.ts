import { expect } from "chai";
import "mocha";

// Modules
import PublicationStoreService from "./store";

// Types
import {
  PublicationShared,
  PublicationExecResult,
  PublicationPrivate
} from "../../types/publication";
import { QueryParams } from "rosa-shared";

// Tests
function createSharedPublication(name: string): PublicationShared {
  return {
    name: name,
    exec(
      params: QueryParams
    ): Promise<PublicationExecResult> | PublicationExecResult {
      return params.test;
    }
  };
}

function createPrivatePublication(name: string): PublicationPrivate {
  return {
    name: name,
    execWithSessionData(
      params: QueryParams
    ): Promise<PublicationExecResult> | PublicationExecResult {
      return params.test;
    }
  };
}

describe("PublicationStoreService", () => {
  const store = new PublicationStoreService();

  it("should accept new Publications", () => {
    const pub = createSharedPublication("pub1");
    store.addPublication(pub);
  });

  it("should throw Exception when an invalid Publication was asked for", () => {
    const fn = () => store.findPublication("foo");
    expect(fn).to.throw();
  });

  it("should return a Publication by its name", () => {
    const pub = createSharedPublication("pub2");
    store.addPublication(pub);

    const returnedPublication = store.findPublication(
      pub.name
    ) as PublicationShared;

    expect(pub.name).to.equal(returnedPublication.name);
    expect(pub.exec).to.equal(returnedPublication.exec);
  });

  it("should take a copy of added Publications", () => {
    const pub = createSharedPublication("pub3");
    store.addPublication(pub);
    const returnedPublication = store.findPublication(
      pub.name
    ) as PublicationShared;
    expect(pub).to.not.equal(returnedPublication);
  });

  it("should be able to recognize Shared publications", () => {
    const pub = createSharedPublication("pub4");
    const isPrivate = store.isPrivatePublication(pub);
    expect(isPrivate).to.be.false;
  });

  it("should be able to recognize Private publications", () => {
    const pub = createPrivatePublication("pub5");
    const isPrivate = store.isPrivatePublication(pub);
    expect(isPrivate).to.be.true;
  });

  it("should not be able to add the 2 Publications sharing the same name", () => {
    const pub1 = createSharedPublication("pub6");
    const pub2 = createSharedPublication("pub6");
    const fn = () => {
      store.addPublication(pub1);
      store.addPublication(pub2);
    };
    expect(fn).to.throw();
  });
});
