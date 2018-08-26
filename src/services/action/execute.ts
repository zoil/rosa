import { injectable, inject } from "inversify";

// Types
import { ActionParams, QueryId } from "rosa-shared";
import { ActionExecResults } from "../../types/action";
import { IdentityDataAccessor } from "../../types/identity";

// Services
import ActionStoreService from "./store";
import QueryTagsService from "../subscription/tags";
import QueryPublishService from "../subscription/publish";
import {
  TActionStore,
  TQueryTagsService,
  TQueryPublishService
} from "../../types/di";

/**
 * Singleton Service to execute an Action.
 */
@injectable()
export default class ActionExecuteService {
  @inject(TActionStore)
  private actionStoreService!: ActionStoreService;
  @inject(TQueryTagsService)
  private queryTagsService!: QueryTagsService;
  @inject(TQueryPublishService)
  private queryPublishService!: QueryPublishService;

  async execute(
    actionName: string,
    actionParams: ActionParams,
    identityData: IdentityDataAccessor
  ): Promise<ActionExecResults> {
    const action = this.actionStoreService.findAction(actionName);
    if (action.authorize && !action.authorize(actionParams, identityData)) {
      throw Error("Unauthorized");
    }
    const result = await action.exec(actionParams, identityData);

    // update tags
    result.affectedTags.forEach((tag: string) =>
      this.queryTagsService
        .getQueryIdsForTag(tag)
        .then((queryIds: QueryId[]) =>
          queryIds.forEach((queryId: QueryId) =>
            this.queryPublishService.publishById(queryId)
          )
        )
    );
    // return exec result
    return result.payload;
  }
}
