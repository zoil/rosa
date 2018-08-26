import { injectable, inject } from "inversify";

// Types
import { QueryId, QueryParams } from "rosa-shared";
import {
  PublicationPrivate,
  PublicationShared,
  PublicationExecResult,
  Publication
} from "../../types/publication";

// Services
import QueryMetaService from "./meta";
import PublicationStoreService from "../publication/store";
import ConnectionSubscriptionsService from "../connection/subscriptions";
import { IdentityDataFactoryService } from "../identity/data-factory";
import QueryTagsService from "./tags";
import {
  TQueryMetaService,
  TConnectionSubscriptions,
  TPublicationStore,
  TIdentityDataFactory,
  TQueryTagsService
} from "../../types/di";

/**
 * Singleton Service to execute Queries identified by their Id.
 * After executing a Query, its results will be stored in a cache,
 * and its tags will be maintained in Redis.
 */
@injectable()
export default class QueryExecute {
  /**
   * Resolve `queryId` into its Publication and QueryParams.
   */
  private async resolveQueryId(
    queryId: QueryId
  ): Promise<{ publication: Publication; queryParams: QueryParams }> {
    // TODO: query?
    const {
      publicationId,
      queryParams
    } = await this.queryMetaService.getPublicationIdAndParams(queryId);
    const publication = this.publicationStoreService.findPublication(
      publicationId
    );
    return { publication, queryParams };
  }

  /**
   * Executes `publication` with the attribs passed and returns the result
   * of it.
   */
  private async executePublication(
    publication: Publication,
    queryId: QueryId,
    queryParams: QueryParams
  ): Promise<PublicationExecResult> {
    // Is it a Shared Query?
    if (!this.publicationStoreService.isPrivatePublication(publication)) {
      // It's a shared query
      return (<PublicationShared>publication).exec(queryParams);
    }

    // It's a shared query - get the SessionId for queryId
    const sessionId = await this.sessionSubscriptionsService.getOneConnectionForQueryId(
      queryId
    );
    if (!sessionId) {
      throw new Error("No sessions");
    }
    // And pass it to the Publication alongside the params.
    const session = this.sessionDataFactory.create(sessionId);
    return (<PublicationPrivate>publication).execWithSessionData(
      queryParams,
      session
    );
  }

  /**
   * Processes the response.
   */
  private async processResponse(
    queryId: QueryId,
    result: PublicationExecResult
  ) {
    /**
     * TODO:
     * Calculate diff compared to previous result, if Obj hash is different
     * Bump version
     * Cache results
     * Store the new Object hash
     * Reset version history if no previous value
     */
    console.log("??", result);
    return this.queryTagsService.update(queryId, result.tags);
  }

  /**
   * Inject Dependencies.
   */
  constructor(
    @inject(TQueryMetaService) private queryMetaService: QueryMetaService,
    @inject(TPublicationStore)
    private publicationStoreService: PublicationStoreService,
    @inject(TConnectionSubscriptions)
    private sessionSubscriptionsService: ConnectionSubscriptionsService,
    @inject(TIdentityDataFactory)
    private sessionDataFactory: IdentityDataFactoryService,
    @inject(TQueryTagsService) private queryTagsService: QueryTagsService
  ) {}

  /**
   * Execute the Query identified by queryId and return its results.
   */
  async executeQueryId(queryId: QueryId): Promise<any> {
    const { publication, queryParams } = await this.resolveQueryId(queryId);
    const result: PublicationExecResult = await this.executePublication(
      publication,
      queryId,
      queryParams
    );
    return this.processResponse(queryId, result).then(() => result.result);
  }
}
