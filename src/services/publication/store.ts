import { Service } from "typedi";
import * as invariant from "invariant";

// Types
import { Publication } from "../../types/publication";

/**
 * Singleton Service to catalogise and look up Publications,
 * identifying them by their unique names.
 */
@Service()
export default class PublicationStoreService {
  /**
   * Map of available Publications.
   */
  private publications: { [endpointName: string]: Publication } = Object.create(
    null
  );

  /**
   * Register `publication` for future use.
   */
  addPublication(publication: Publication): void {
    invariant(
      this.publications[publication.name] === undefined,
      `Publication '${publication.name}' has already been registered.`
    );
    this.publications[publication.name] = { ...publication };
  }

  /**
   * Find a Publication for `name`.
   */
  findPublication(name: string): Publication {
    invariant(
      this.publications[name] !== undefined,
      `Publication '${name}' was not found.`
    );
    return this.publications[name];
  }

  /**
   * Determines whether publication is Shared or Private.
   * Returns `true` if it's Private.
   */
  isPrivatePublication(publication: Object): boolean {
    return publication.hasOwnProperty("execWithSessionData");
  }
}
