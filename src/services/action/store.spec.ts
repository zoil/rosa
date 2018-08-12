import { expect } from "chai";
import "mocha";

// Modules
import ActionStoreService from "./store";

// Types
import { Action, ActionExecResults } from "../../types/action";
import { ActionParams } from "rosa-shared";
import { IdentityDataAccessor } from "../../types/identity";

// Tests
function createAction(name: string): Action {
  return {
    name: name,
    exec(
      params: ActionParams,
      identity: IdentityDataAccessor
    ): Promise<ActionExecResults> | ActionExecResults {
      return {
        affectedTags: [],
        payload: [params, identity, name]
      };
    }
  };
}

describe("ActionStoreService", () => {
  const store = new ActionStoreService();

  it("should accept new Actions", () => {
    const action = createAction("action1");
    store.addAction(action);
  });

  it("should throw Exception when an invalid Action was asked for", () => {
    const fn = () => store.findAction("foo");
    expect(fn).to.throw();
  });

  it("should return an Action by its name", () => {
    const action = createAction("action2");
    store.addAction(action);

    const returnedAction = store.findAction(action.name);

    expect(action.name).to.equal(returnedAction.name);
    expect(action.exec).to.equal(returnedAction.exec);
  });

  it("should take a copy of added Actions", () => {
    const action = createAction("action3");
    store.addAction(action);
    const returnedAction = store.findAction(action.name);
    expect(action).to.not.equal(returnedAction);
  });

  it("should not be able to add the 2 Actions sharing the same name", () => {
    const action1 = createAction("action4");
    const action2 = createAction("action4");
    const fn = () => {
      store.addAction(action1);
      store.addAction(action2);
    };
    expect(fn).to.throw();
  });
});
