import * as Promise from "bluebird";

import { ActionName, ActionParams, QueryId } from "rosa-shared";

import { SessionDataAccessor } from "./session";
import { QueryTag } from "./query";

export type ActionExecResults = {
  affectedTags: QueryTag[];
  payload: any;
};

export interface Action {
  /**
   * The unique name to identify the Action.
   * Clients will be able to address this Action by using it.
   */
  name: ActionName;

  /**
   * Return true or false depending on whether `session` may access this
   * Action by passing `params`.
   */
  authorize?(
    params: ActionParams,
    session: SessionDataAccessor
  ): Promise<boolean> | boolean;

  /**
   * Execute the Action in the backend for `params` and `session`.
   * This only will be called if `authorize()` returns `true`.
   */
  exec(
    params: ActionParams,
    session: SessionDataAccessor
  ): Promise<ActionExecResults> | ActionExecResults;
}

/**
 * A prediction made by a PredictableAction.predict().
 */
export interface Prediction {
  hash: QueryId;
  predictedValue: any;
}

export interface PredictableAction extends Action {
  /**
   * Predict changes that would happen when exec() is called.
   */
  predict(
    currentValue: any,
    params: ActionParams,
    session: SessionDataAccessor
  ): Prediction[] | Promise<Prediction[]>;
}
