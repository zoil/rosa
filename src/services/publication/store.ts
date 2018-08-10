import { injectable } from "inversify";
import * as invariant from "invariant";

// Types
import { Publication } from "../../types/publication";

/**
 * Singleton Service that provides access to the known Publications of this
 * Rosa instance.
 */
@injectable()
export default class PublicationStoreService {
  /**
   * Map of available Publications.
   */
  private publications: { [endpointName: string]: Publication } = Object.create(
    null
  );

  /**
   * Add `publication` to the list of known publications.
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
   * Determine whether `publication` is Shared or Private.
   * Returns `true` if it's Private.
   */
  isPrivatePublication(publication: Object): boolean {
    return publication.hasOwnProperty("execWithSessionData");
  }
}
