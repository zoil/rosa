import * as Promise from "bluebird";
import { Service, Inject } from "typedi";

// Types
import { QueryId, QueryParams } from "rosa-shared";
import {
  PublicationPrivate,
  PublicationShared,
  PublicationExecResult,
  Publication
} from "../../types/publication";
import { SessionId } from "rosa-shared";

// Services
import QueryMetaService from "./meta";
import PublicationStoreService from "../publication/store";
import SessionSubscriptionsService from "../session/subscriptions";
import { SessionDataFactory } from "../session/data";
import QueryTagsService from "./tags";

/**
 * Singleton Service to execute Queries identified by their Id.
 * After executing a Query, its results will be stored in a cache,
 * and its tags will be maintained in Redis.
 */
@Service()
export default class ExecuteQueryService {
  /**
   * Inject Dependencies.
   */
  @Inject() private queryMetaService!: QueryMetaService;
  @Inject() private publicationStoreService!: PublicationStoreService;
  @Inject() private sessionSubscriptionsService!: SessionSubscriptionsService;
  @Inject() private sessionDataFactory!: SessionDataFactory;
  @Inject() private queryTagsService!: QueryTagsService;

  /**
   * Resolve `queryId` into its Publication and QueryParams.
   */
  private resolveQueryId(
    queryId: QueryId
  ): Promise<{ publication: Publication; queryParams: QueryParams }> {
    return this.queryMetaService
      .getPublicationIdAndParams(queryId)
      .then(({ publicationId, queryParams }) => {
        const publication = this.publicationStoreService.findPublication(
          publicationId
        );
        return { publication, queryParams };
      });
  }

  /**
   * Executes `publication` with the attribs passed and returns the result
   * of it.
   */
  private executePublication(
    publication: Publication,
    queryId: QueryId,
    queryParams: QueryParams
  ) {
    // Is it a Private Query?
    if (this.publicationStoreService.isPrivatePublication(publication)) {
      // ...yes - then get the SessionId for queryId
      return this.sessionSubscriptionsService
        .getOneSessionForQueryId(queryId)
        .then((sessionId: SessionId) => {
          if (!sessionId) {
            throw new Error("No sessions");
          }
          // And pass it to the Publication alongside the params.
          const session = this.sessionDataFactory.create(sessionId);
          return (<PublicationPrivate>publication).execWithSessionData(
            queryParams,
            session
          );
        });
    }

    // It's a shared query
    return (<PublicationShared>publication).exec(queryParams);
  }

  /**
   * Processes the response.
   */
  private processResponse(queryId: QueryId, result: PublicationExecResult) {
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
   * Execute the Query identified by queryId and return its results.
   */
  executeQueryId(queryId: QueryId): Promise<any> {
    return this.resolveQueryId(queryId)
      .then(({ publication, queryParams }) =>
        this.executePublication(publication, queryId, queryParams)
      )
      .then((result: PublicationExecResult) =>
        this.processResponse(queryId, result).then(() => result.result)
      );
  }
}
