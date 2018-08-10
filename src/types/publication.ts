import { PublicationName, QueryParams } from "rosa-shared";

import { SessionDataAccessor } from "./session";
import { QueryTag } from "./query";

export type PublicationExecResult = {
  result: any;
  tags: QueryTag[];
};

export interface PublicationBasics {
  /**
   * The unique name to identify the Publication.
   * Clients will be able to address this Publication by using it.
   */
  name: PublicationName;

  /**
   * Return true or false depending on whether `session` may access this
   * Publication by passing `params`.
   */
  authorize?(
    params: QueryParams,
    session: SessionDataAccessor
  ): Promise<boolean> | boolean;

  /**
   * Callback that will be called after `exec` or `execWithSessionData`
   * are called.
   */
  onExec?(
    params: QueryParams,
    session: SessionDataAccessor,
    results: PublicationExecResult
  ): Promise<void> | void;

  /**
   * Callback that will be called once `session` successfully subscribed
   * to this Publication with `params`.
   */
  onSubscribe?(
    params: QueryParams,
    session: SessionDataAccessor
  ): Promise<void> | void;

  /**
   * Callback that will be called once `session` has unsubscribed
   * this Publication with `params`.
   */
  onUnsubscribe?(
    params: QueryParams,
    session: SessionDataAccessor
  ): Promise<void> | void;
}

/**
 * This class should be used for creating a Publication which
 * uses Session Data as condition when requesting the backend.
 * An example for this would be new messages for the current user.
 */
export interface PublicationPrivate extends PublicationBasics {
  /**
   * Return the results for this Publication with `params` and `session`.
   * Session data should be a condition for the actual data query.
   */
  execWithSessionData(
    params: QueryParams,
    session: SessionDataAccessor
  ): Promise<PublicationExecResult> | PublicationExecResult;
}

/**
 * This class should be used for creating a Publication which
 * does not use the Session Data as condition when requesting
 * the backend.
 * The `authorize` method may use the Session Data to determine
 * whether the requester has access.
 *
 * An example for this would be messages in a chat room.
 */
export interface PublicationShared extends PublicationBasics {
  /**
   * Return the results for this Publication with `params`.
   */
  exec(
    params: QueryParams
  ): Promise<PublicationExecResult> | PublicationExecResult;
}

export type Publication = PublicationPrivate | PublicationBasics;
