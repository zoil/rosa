import { Service, Inject } from "typedi";
import * as Promise from "bluebird";

// Types
import { ActionParams, QueryId } from "rosa-shared";
import { ActionExecResults } from "../../types/action";
import { SessionDataAccessor } from "../../types/session";

// Services
import ActionStoreService from "./store";
import QueryTagsService from "../query/tags";
import QueryPublishService from "../query/publish";

/**
 * Singleton Service to execute an Action.
 */
@Service()
export default class ExecuteAction {
  @Inject() private actionStoreService!: ActionStoreService;
  @Inject() private queryTagsService!: QueryTagsService;
  @Inject() private queryPublishService!: QueryPublishService;

  execute(
    actionName: string,
    actionParams: ActionParams,
    session: SessionDataAccessor
  ): Promise<ActionExecResults> {
    return Promise.try(() => {
      // TODO: Update tags
      const action = this.actionStoreService.findAction(actionName);
      if (action.authorize && !action.authorize(actionParams, session)) {
        throw Error("Unauthorized");
      }
      return action.exec(actionParams, session);
    }).then((result: ActionExecResults) => {
      // update tags
      result.affectedTags.forEach((tag: string) =>
        this.queryTagsService
          .getQueryIdsForTag(tag)
          .then((queryIds: QueryId[]) =>
            queryIds.forEach((queryId: QueryId) =>
              this.queryPublishService.queryId(queryId)
            )
          )
      );
      // return exec result
      return result.payload;
    });
  }
}
