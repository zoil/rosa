import { injectable } from "inversify";
import * as invariant from "invariant";

// Types
import { Action } from "../../types/action";

/**
 * Singleton Service to catalogise and look up Actions,
 * identifying them by their unique names.
 */
@injectable()
export default class ActionStoreService {
  actions: { [name: string]: Action } = {};

  addAction(action: Action): void {
    invariant(
      this.actions[action.name] === undefined,
      `Action '${action.name}' has already been registered.`
    );

    this.actions[action.name] = { ...action };
  }

  /**
   * Find a Publication for `name`.
   */
  findAction(name: string): Action {
    invariant(
      this.actions[name] !== undefined,
      `Action '${name}' was not found.`
    );
    return this.actions[name];
  }
}
