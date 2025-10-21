---
timestamp: 'Mon Oct 20 2025 22:03:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_220305.b0cc6829.md]]'
content_id: 37f5a68c34a685890dec62155ab24677c7ba81f6b65df726fff9b28bc7f05734
---

# response:

It sounds like there's a mismatch between how the backend's query methods are structured and what the frontend (based on the API spec) is expecting.

The API spec clearly states:

> **Queries:** A successful call to a query (a method name starting with `_`) returns a JSON **array** of objects.

However, examining your backend code (`CategorizingConcept.ts` and `LibraryConcept.ts`), several query methods (`_viewFicCategory`, `_viewFic`, `_findFicWithDate`, `_getVersion`, `_getAllUserVersions`) are returning a single JSON object (e.g., `{ fic: Fic }` or `{ versions: Version[] }`) instead of wrapping that object in an array (e.g., `[{ fic: Fic }]` or `[{ versions: Version[] }]`).

The frontend's `src/api/index.ts` client is correctly typed to expect arrays for these queries, and attempts to access `result[0]` where appropriate. When the backend returns a plain object, `result[0]` will be `undefined`, causing the data not to render.

Let's fix the backend concept implementations to correctly return arrays for all query methods.

***

### **Step 1: Update `src/concepts/Categorizing/CategorizingConcept.ts`**

Modify the `_viewFicCategory` method:

```typescript
// file: src\concepts\Categorizing\CategorizingConcept.ts

// ... (existing imports and types) ...

export default class CategorizingConcept {
  // ... (existing constructor and methods) ...

  /**
   * **viewFicCategory** (fic) : (ficCategory)
   *
   * Retrieves the categorization data (suggested tags and tags to remove) for a specific fic.
   *
   * **requires** The `ficId` must correspond to an existing entry in the `ficCategories` collection.
   * **effects** If an entry exists, returns the `FicCategoryDoc` associated with the given `ficId`.
   *            Otherwise, returns an error indicating the ficCategory was not found.
   */
  async _viewFicCategory(
    { ficId }: { ficId: Fic },
  ): Promise<FicCategoryDoc[] | { error: string }> { // <--- CHANGE RETURN TYPE HERE
    if (!ficId) {
      return { error: "Fic ID is required." };
    }

    const ficCategory = await this.ficCategories.findOne({ _id: ficId });

    if (!ficCategory) {
      return { error: `FicCategory for fic ID '${ficId}' not found.` };
    }

    return [ficCategory]; // <--- WRAP THE RESULT IN AN ARRAY
  }

  // ... (rest of the class) ...
}
```

***

### **Step 2: Update `src/concepts/Library/LibraryConcept.ts`**

Modify the following query methods: `_viewFic`, `_findFicWithDate`, `_getVersion`, and `_getAllUserVersions`.

```typescript
// file: src\concepts\Library\LibraryConcept.ts

// ... (existing imports and types) ...

export default class LibraryConcept {
  // ... (existing constructor and actions) ...

  /**
   * @action viewFic
   * @description Retrieves a specific fic revision by its story title and version number.
   * @param {User} user The ID of the user who owns the fic.
   * @param {string} ficName The title of the story.
   * @param {number} versionNumber The specific revision number of the fic.
   * @returns {{ fic: Fic } | { error: string }} The requested fic object on success, or an error object.
   *
   * @requires the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.
   * @effects displays the fic's contents corresponding to the user's Version's ficName as Title and versionNumber from the user's Version's set of Fics, then returns the fic.
   */
  async _viewFic(
    { user, ficName, versionNumber }: {
      user: User;
      ficName: string;
      versionNumber: number;
    },
  ): Promise<[{ fic: Fic }] | { error: string }> { // <--- CHANGE RETURN TYPE HERE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }

    const targetVersion = userDoc.versions.find((v) => v.title === ficName);
    if (!targetVersion) {
      return {
        error: `Fic with name '${ficName}' does not exist for user '${user}'.`,
      };
    }

    if (
      versionNumber < 0 || versionNumber >= targetVersion.fics.length
    ) {
      return {
        error:
          `Version number '${versionNumber}' is out of range for fic '${ficName}'.`,
      };
    }

    const fic = targetVersion.fics.find((f) =>
      f.versionNumber === versionNumber
    );
    if (!fic) {
      return {
        error:
          `Fic revision with version number '${versionNumber}' not found for '${ficName}'.`,
      };
    }

    return [{ fic: fic }]; // <--- WRAP THE RESULT IN AN ARRAY
  }

  // ... (other actions) ...

  /**
   * @action findFicWithDate
   * @description Finds all fic revisions for a user that match a specific date.
   * @param {User} user The ID of the user.
   * @param {DateSpec} date The date to search for.
   * @returns {{ fics: Fic[] } | { error: string }} An array of matching fic objects on success, or an error object.
   *
   * @requires user must exist in set of Users
   * @effects returns a set of Fics with dates matching the provided date. If there are no such fics, it returns an empty set.
   */
  async _findFicWithDate(
    { user, date }: { user: User; date: DateSpec },
  ): Promise<[{ fics: Fic[] }] | { error: string }> { // <--- CHANGE RETURN TYPE HERE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }

    const matchingFics: Fic[] = [];
    for (const version of userDoc.versions) {
      for (const fic of version.fics) {
        if (
          fic.date.day === date.day &&
          fic.date.month === date.month &&
          fic.date.year === date.year
        ) {
          matchingFics.push(fic);
        }
      }
    }
    return [{ fics: matchingFics }]; // <--- WRAP THE RESULT IN AN ARRAY
  }

  /**
   * @action getVersion
   * @description Retrieves a complete story version (including all its revisions) for a user.
   * @param {User} user The ID of the user.
   * @param {string} versionTitle The title of the story version to retrieve.
   * @returns {{ version: Version } | { error: string }} The requested version object on success, or an error object.
   *
   * @requires user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.
   * @effects returns the user's version associated with the versionTitle as title.
   */
  async _getVersion(
    { user, versionTitle }: { user: User; versionTitle: string },
  ): Promise<[{ version: Version }] | { error: string }> { // <--- CHANGE RETURN TYPE HERE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }

    const version = userDoc.versions.find((v) => v.title === versionTitle);
    if (!version) {
      return {
        error: `Version with title '${versionTitle}' not found for user '${user}'.`,
      };
    }
    return [{ version: version }]; // <--- WRAP THE RESULT IN AN ARRAY
  }

  // ... (other actions) ...

  /**
   * @query _getAllUserVersions
   * @description Retrieves all story versions for a given user.
   * @param {User} user The ID of the user.
   * @returns {{ versions: Version[] } | { error: string }} An array of version objects on success, or an error object.
   */
  async _getAllUserVersions(
    { user }: { user: User },
  ): Promise<[{ versions: Version[] }] | { error: string }> { // <--- CHANGE RETURN TYPE HERE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }
    return [{ versions: userDoc.versions }]; // <--- WRAP THE RESULT IN AN ARRAY
  }
}
```

***

### **Step 3: Restart Your Deno Backend**

After making these changes, save the files and restart your Deno concept server:

```bash
deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api
```

### **Step 4: Test Your Frontend**

With the backend now returning query results as arrays (even for single objects), your Vue.js frontend should correctly parse the responses and display the fics under "Your Fics" after submission and refresh.

This adjustment ensures that your backend adheres to the API specification rules regarding query responses, resolving the data display issue in your frontend.
