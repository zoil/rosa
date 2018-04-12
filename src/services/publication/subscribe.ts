import * as Promise from "bluebird";
import { Service, Inject } from "typedi";
const sha1 = require("sha1");

// Types
import { Publication } from "../../types/publication";
import { QueryParams, QueryId } from "rosa-shared";
import { SessionDataAccessor } from "../../types/session";

// Services
import SessionSubscriptionsService from "../session/subscriptions";
import PublicationStoreService from "./store";
import QueryMetaService from "../query/meta";
import { PublicationName } from "rosa-shared";

/**
 * Singleton Service to let WebsocketConnections watching Publications.
 */
@Service()
export default class PublicationSubscribeService {
  /**
   * Inject Dependencies.
   */
  @Inject() private sessionSubscriptionsService!: SessionSubscriptionsService;
  @Inject() private publicationStoreService!: PublicationStoreService;
  @Inject() private queryMetaService!: QueryMetaService;

  /**
   * Determines whether `session` is allowed to use `publication`
   * with `params`. Throws an Error if it's not allowed.
   */
  private authorize(
    publication: Publication,
    params: QueryParams,
    session: SessionDataAccessor
  ): Promise<void> {
    return Promise.try(() => {
      if (!publication.authorize) {
        return true;
      }
      return publication.authorize(params, session);
    }).then((authResult: boolean) => {
      if (!authResult) {
        throw new Error("Unauthorized");
      }
    });
  }

  /**
   * Calculate the QueryId for the input params.
   */
  private calculateQueryId(
    publication: Publication,
    params: QueryParams,
    session: SessionDataAccessor
  ): QueryId {
    let hashBase = JSON.stringify(params);
    if (this.publicationStoreService.isPrivatePublication(publication)) {
      hashBase = hashBase + "\n" + session.getSessionId();
    }
    return sha1(hashBase);
  }

  /**
   * Return the QueryId for the input params.
   */
  private getQuery(
    publication: Publication,
    params: QueryParams,
    session: SessionDataAccessor
  ): Promise<QueryId> {
    const queryId = this.calculateQueryId(publication, params, session);
    return this.sessionSubscriptionsService
      .bind(session.getSessionId(), queryId)
      .then(() => this.queryMetaService.exists(queryId))
      .then(exists => {
        if (exists) {
          return;
        }
        return this.queryMetaService.create(queryId, publication.name, params);
      })
      .then(() => queryId);
  }

  /**
   * Subscribe `session` to Publication with `name` using `params`.
   */
  subscribe(
    session: SessionDataAccessor,
    publicationName: PublicationName,
    params?: QueryParams
  ): Promise<QueryId> {
    /**
     * TODO:
     * 1) create queryId if not exists yet
     * 2) exec if needed
     * 3) emit new, full data
     */
    const publication = this.publicationStoreService.findPublication(
      publicationName
    );

    // Try and authorize the `session` first for the request.
    return this.authorize(publication, params || {}, session)
      .then(() => this.getQuery(publication, params || {}, session))
      .then(queryId => queryId);
  }
}
