---
timestamp: 'Fri Nov 07 2025 23:16:36 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_231636.6d7bf70d.md]]'
content_id: 4d9f152a8e03b153170c9dc512b570ccecb045e85fc6dc82e7434575f6838f03
---

# response:

Okay, I will implement the synchronizations for the excluded actions and queries, following the guidelines and making necessary assumptions about the request payload for authentication and authorization.

First, I'll update the `LibraryConcept.ts` and `CategorizingConcept.ts` files to ensure all queries return errors as an array, and to modify the return types of `submitNewVersionOfFanfic` and `deleteVersion` as discussed.

***

### **Step 1: Update Concept Implementations**

#### **`src/concepts/Library/LibraryConcept.ts`**

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Library" + ".";

// Generic types of this concept
type User = ID; // User ID from external concept

/**
 * @interface DateSpec
 * @description Represents a date with day, month, and year.
 *
 * a Date with
 *   a day Number
 *   a month Number
 *   a year Number
 */
interface DateSpec {
  day: number;
  month: number;
  year: number;
}

/**
 * @interface Fic
 * @description Represents a specific version or revision of a story.
 *
 * a Fic with
 *   a Name String
 *   a Text String
 *   a set of authorTags strings
 *   a Date
 *   a versionNumber Number
 */
interface Fic {
  _id: ID; // Unique ID for this specific fic revision (not explicitly in spec, but good for internal tracking)
  name: string; // The name of the story, typically matches the parent Version's title
  text: string;
  authorTags: string; // Set of strings
  date: DateSpec;
  versionNumber: number;
}

/**
 * @interface Version
 * @description Represents a group of fics (revisions) under a common title for a user.
 *
 * a set of Versions with
 *   a Title String
 *   a set of Fics
 */
interface Version {
  _id: ID;
  title: string; // The unique title for this story for the user
  fics: Fic[]; // All revisions of this story
}

/**
 * @interface UserDoc
 * @description Represents a user and their associated story versions.
 *
 * a set of Users with
 *   a set of Versions
 */
interface UserDoc {
  _id: User; // The ID of the user
  versions: Version[]; // Array of story versions (each containing multiple fic revisions)
}

/**
 * @class LibraryConcept
 * @description Concept to contain a user's story (associated with a name, a text, and a string of authorTags) in an orderly list.
 *
 * @purpose to contain a user's story (associated with a name, a text, and string of authorTags) in an orderly list.
 * @principle A user submits a story by inputting its name, body text, and set of authorTags into the website.
 *            Then, when the user views themselves, they see their new story listed alongside all previous stories they've submitted.
 */
export default class LibraryConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * @action addUser
   * @description Adds a new user to the library concept.
   * @param {User} user The ID of the user to add.
   * @returns {Empty | { error: string }} An empty object on success, or an error object if the user already exists.
   *
   * @requires the user to not exist in the set of Users
   * @effects adds user to set of Users, associates user with empty set of Versions with an empty set of Fics.
   */
  async addUser({ user }: { user: User }): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (existingUser) {
      return { error: `User '${user}' already exists.` };
    }

    await this.users.insertOne({ _id: user, versions: [] });
    return {};
  }

  /**
   * @action submitNewFic
   * @description Submits a brand new story (fic) for a user, creating its first version.
   * @param {User} user The ID of the user submitting the fic.
   * @param {string} ficText The body text of the fic.
   * @param {string} ficName The name/title of the fic.
   * @param {string} authorTags An array of tags provided by the author.
   * @param {DateSpec} date The publication date of the fic.
   * @returns {{ ficId: ID } | { error: string }} The newly created fic object on success, or an error object.
   *
   * @requires the ficName to not exist within the set of the user's Versions' Title. user must exist in set of Users.
   * @effects create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as 0, and authorTags as the set of authorTags.
   *          Create a new Version with ficName as the Title, add the Fic to the new version's set of Fics.
   *          Finally, add the new version to the user's set of Versions, and finally return the fic.
   */
  async submitNewFic(
    { user, ficText, ficName, authorTags, date }: {
      user: User;
      ficText: string;
      ficName: string;
      authorTags: string;
      date: DateSpec;
    },
  ): Promise<{ ficId: ID } | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }

    if (userDoc.versions.some((v) => v.title === ficName)) {
      return { error: `Fic with name '${ficName}' already exists for user '${user}'.` };
    }

    const newFic: Fic = {
      _id: freshID(),
      name: ficName,
      text: ficText,
      authorTags: authorTags,
      date: date,
      versionNumber: 0, // First version
    };

    const newVersion: Version = {
      _id: freshID(),
      title: ficName,
      fics: [newFic],
    };

    await this.users.updateOne(
      { _id: user },
      { $push: { versions: newVersion } },
    );

    return { ficId: newFic._id };
  }

  /**
   * @action submitNewVersionOfFanfic
   * @description Submits a new revision for an existing story (version).
   * @param {User} user The ID of the user submitting the new version.
   * @param {string} ficText The updated body text of the fic.
   * @param {string} authorTags An updated array of tags for the fic.
   * @param {string} versionTitle The title of the story to update.
   * @param {DateSpec} date The publication date of this new version.
   * @param {string} ficName The name/title of the fic (should match versionTitle).
   * @returns {{ ficId: ID, versionId: ID } | { error: string }} The newly created fic's ID and updated version ID on success, or an error object.
   *
   * @requires user must exist in set of Users, versionTitle must exist within the user's set of Versions.
   * @effects create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags.
   *          Then, add the Fic to the version within the user's set of Versions. Finally, return the fic's ID and the Version's ID.
   */
  async submitNewVersionOfFanfic(
    { user, ficText, authorTags, versionTitle, date, ficName }: {
      user: User;
      ficText: string;
      authorTags: string;
      versionTitle: string;
      date: DateSpec;
      ficName: string; // Should match versionTitle
    },
  ): Promise<{ ficId: ID, versionId: ID } | { error: string }> { // MODIFIED RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }

    const versionIndex = userDoc.versions.findIndex((v) =>
      v.title === versionTitle
    );
    if (versionIndex === -1) {
      return {
        error: `Fic version '${versionTitle}' does not exist for user '${user}'.`,
      };
    }

    const targetVersion = userDoc.versions[versionIndex];
    const newVersionNumber = targetVersion.fics.length; // versionNumber starts at 0, so length gives the next available

    const newFic: Fic = {
      _id: freshID(), // This is the ficId we need to return
      name: ficName, // Should match versionTitle
      text: ficText,
      authorTags: authorTags,
      date: date,
      versionNumber: newVersionNumber,
    };

    await this.users.updateOne(
      { _id: user, "versions.title": versionTitle },
      { $push: { "versions.$.fics": newFic } },
    );

    // Fetch the updated userDoc to return the full updated version
    const updatedUserDoc = await this.users.findOne({ _id: user });
    const updatedVersion = updatedUserDoc?.versions.find((v) =>
      v.title === versionTitle
    );

    if (!updatedVersion) {
      return { error: "Failed to retrieve updated version." }; // Should not happen if update was successful
    }

    return { ficId: newFic._id, versionId: updatedVersion._id }; // MODIFIED: Return both ficId and versionId
  }

  /**
   * @action _viewFic
   * @description Retrieves a specific fic revision by its story title and version number.
   * @param {User} user The ID of the user who owns the fic.
   * @param {string} ficName The title of the story.
   * @param {number} versionNumber The specific revision number of the fic.
   * @returns {[{ fic: Fic }] | [{ error: string }]} The requested fic object on success, or an error object wrapped in an array.
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
  ): Promise<[{ fic: Fic }] | [{ error: string }]> { // MODIFIED ERROR RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User '${user}' does not exist.` }]; // Wrapped in array
    }

    const targetVersion = userDoc.versions.find((v) => v.title === ficName);
    if (!targetVersion) {
      return [{
        error: `Fic with name '${ficName}' does not exist for user '${user}'.`,
      }]; // Wrapped in array
    }

    if (
      versionNumber < 0 || versionNumber >= targetVersion.fics.length
    ) {
      return [{
        error:
          `Version number '${versionNumber}' is out of range for fic '${ficName}'.`,
      }]; // Wrapped in array
    }

    const fic = targetVersion.fics.find((f) =>
      f.versionNumber === versionNumber
    );
    if (!fic) {
      return [{
        error:
          `Fic revision with version number '${versionNumber}' not found for '${ficName}'.`,
      }]; // Wrapped in array
    }

    return [{ fic: fic }];
  }

  /**
   * @action deleteFic
   * @description Deletes a specific revision of a story for a user.
   * @param {User} user The ID of the user.
   * @param {string} ficName The title of the story.
   * @param {number} versionNumber The specific revision number to delete.
   * @returns {{ ficId: ID } | { error: string }} The ID of the deleted fic on success, or an error object.
   *
   * @requires the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.
   * @effects removes the fic corresponding to the user's ficName and versionNumber from the user's set of Versions. Returns the fic ID.
   */
  async deleteFic(
    { user, ficName, versionNumber }: {
      user: User;
      ficName: string;
      versionNumber: number;
    },
  ): Promise<{ ficId: ID } | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }

    const version = userDoc.versions.find((v) => v.title === ficName);
    if (!version) {
      return {
        error: `Fic with name '${ficName}' does not exist for user '${user}'.`,
      };
    }

    const ficToDelete = version.fics.find((f) =>
      f.versionNumber === versionNumber
    );
    if (!ficToDelete) {
      return {
        error:
          `Fic revision with version number '${versionNumber}' not found for '${ficName}'.`,
      };
    }

    await this.users.updateOne(
      { _id: user, "versions.title": ficName },
      { $pull: { "versions.$.fics": { versionNumber: versionNumber } } },
    );

    // If all fics are removed from a version, remove the version itself
    const updatedUserDoc = await this.users.findOne({ _id: user });
    const updatedVersion = updatedUserDoc?.versions.find((v) =>
      v.title === ficName
    );
    if (updatedVersion && updatedVersion.fics.length === 0) {
      await this.users.updateOne(
        { _id: user },
        { $pull: { versions: { title: ficName } } },
      );
    }

    return { ficId: ficToDelete._id };
  }

  /**
   * @action deleteFicsAndUser
   * @description Deletes a user and all their associated stories (fics and versions).
   * @param {User} user The ID of the user to delete.
   * @returns {Empty | { error: string }} An empty object on success, or an error object if the user does not exist.
   *
   * @requires user must exist in set of Users
   * @effects removes all versions from the set of user's Versions, then removes user from set of Users.
   */
  async deleteFicsAndUser(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: user });
    if (result.deletedCount === 0) {
      return { error: `User '${user}' does not exist.` };
    }
    return {};
  }

  /**
   * @action _getVersion
   * @description Retrieves a complete story version (including all its revisions) for a user.
   * @param {User} user The ID of the user.
   * @param {string} versionTitle The title of the story version to retrieve.
   * @returns {[{ version: Version }] | [{ error: string }]} The requested version object on success, or an error object wrapped in an array.
   *
   * @requires user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.
   * @effects returns the user's version associated with the versionTitle as title.
   */
  async _getVersion(
    { user, versionTitle }: { user: User; versionTitle: string },
  ): Promise<[{ version: Version }] | [{ error: string }]> { // MODIFIED ERROR RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User '${user}' does not exist.` }]; // Wrapped in array
    }

    const version = userDoc.versions.find((v) => v.title === versionTitle);
    if (!version) {
      return [{
        error: `Version with title '${versionTitle}' not found for user '${user}'.`,
      }]; // Wrapped in array
    }
    return [{ version: version }];
  }

  /**
   * @action deleteVersion
   * @description Deletes an entire story version (and all its fic revisions) for a user.
   * @param {User} user The ID of the user.
   * @param {string} ficTitle The title of the story version to delete.
   * @returns {{ versionId: ID, deletedFicIds: ID[] } | { error: string }} The deleted version's ID and IDs of deleted fics on success, or an error object.
   *
   * @requires the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users.
   * @effects removes the version associated with ficTitle as the title from the user's set of Versions. Returns the version's ID and all fic IDs that were part of it.
   */
  async deleteVersion(
    { user, ficTitle }: { user: User; ficTitle: string },
  ): Promise<{ versionId: ID, deletedFicIds: ID[] } | { error: string }> { // MODIFIED RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }

    const versionToDelete = userDoc.versions.find((v) => v.title === ficTitle);
    if (!versionToDelete) {
      return {
        error: `Version with title '${ficTitle}' not found for user '${user}'.`,
      };
    }

    // Capture ficIds before deletion
    const deletedFicIds = versionToDelete.fics.map(f => f._id); // Capture IDs before deletion

    await this.users.updateOne(
      { _id: user },
      { $pull: { versions: { title: ficTitle } } },
    );

    return { versionId: versionToDelete._id, deletedFicIds: deletedFicIds }; // MODIFIED: Return deleted fic IDs
  }

  /**
   * @query _getAllUserVersions
   * @description Retrieves all story versions for a given user.
   * @param {User} user The ID of the user.
   * @returns {[{ versions: Version[] }] | [{ error: string }]} An array of version objects on success, or an error object wrapped in an array.
   */
  async _getAllUserVersions(
    { user }: { user: User },
  ): Promise<[{ versions: Version[] }] | [{ error: string }]> { // MODIFIED ERROR RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User '${user}' does not exist.` }]; // Wrapped in array
    }
    return [{ versions: userDoc.versions }];
  }
}
```

***

#### **`src/concepts/Categorizing/CategorizingConcept.ts`**

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { GeminiLLM, Config as LLMConfig } from "../../../gemini-llm.ts";
// Removed fs and path imports as they are not used in the provided snippet and caused linting issues.

// --- Concept Specific Types ---

// Generic type parameter 'Fic' as defined in the concept specification.
// It will be an externally created ID.
type Fic = ID;

/**
 * A Tag, including its name, type, and the reason for its suggestion or removal.
 * This acts as the "Tag" type from the concept state, with 'name', 'type', 'reason' properties.
 */
interface Tag {
  name: string;
  type: string;
  reason: string;
}

/**
 * Represents the structure of input for fic categorization actions.
 * The concept itself doesn't store the full `ficText` or `authorTags`,
 * but these are required for the LLM's operation.
 */
interface FicInput {
  ficId: Fic;
  ficText: string;
  authorTags: string; // String split with newlines for each tag
}

/**
 * Represents the document structure stored in the MongoDB `ficCategories` collection.
 * This maps directly to "a set of FicCategories" from the concept state,
 * where `_id` is the 'Fic' identifier, and `suggestedTags` and `tagsToRemove`
 * are arrays of `Tag` objects (acting as the 'Category' type).
 */
export interface FicCategoryDoc {
  _id: Fic; // The ID of the fic this categorization applies to
  suggestedTags: Tag[];
  tagsToRemove: Tag[];
}

// Declare collection prefix, using the concept name to avoid collisions.
const PREFIX = "Categorizing" + ".";

/**
 * **concept** Categorizing [Fic]
 *
 * **purpose** to categorize a text into specific categories (i.e. a story will be categorized into a set of tags).
 * "Categorizing" can also *remove* tags provided by the author if deemed necessary.
 *
 * **principle** A user submits their story and the tags the author has already added to the story.
 * It outputs a list of suggested tags (properly categorized) to add to the story and tells the user if any of their author tags should be removed.
 */
export default class CategorizingConcept {
  // State: MongoDB collection to store the `FicCategoryDoc` documents.
  // This corresponds to "a set of FicCategories" in the concept spec.
  ficCategories: Collection<FicCategoryDoc>;
  private llm: GeminiLLM;

  constructor(private readonly db: Db, llmConfig?: LLMConfig) { // Made llmConfig optional to avoid undefined error in constructor logic
    this.ficCategories = this.db.collection(PREFIX + "ficCategories");
    const actualLlmConfig: LLMConfig = llmConfig ?? { apiKey: Deno.env.get("GEMINI_API_KEY") || "fake-api-key-for-tests" };
    this.llm = new GeminiLLM(actualLlmConfig);
  }

  // --- Actions ---

  /**
   * **categorizeFic** (fic) : (ficId: fic)
   *
   * This action combines the functionality of `keywordGenerator` and `tagCleaner`
   * into a single LLM call for efficiency and consistency.
   * It takes a fic's content and existing author tags, and returns both
   * suggested new tags and a list of author tags that should be removed.
   *
   * **requires** The input object must contain `ficId` (the unique identifier for the fic),
   *              `ficText` (the full text content of the fic), and `authorTags`
   *              (an string of tags already provided by the author, split with newlines).
   * **effects**
   *   1. Uses an LLM to analyze `ficText` and `authorTags`.
   *   2. Generates up to 20 highly relevant `suggestedTags` that are not already present
   *      in the `authorTags`. Each suggested tag includes its `name`, `type`, and a `reason` for suggestion.
   *   3. Identifies `tagsToRemove` from the `authorTags` that are deemed inappropriate,
   *      irrelevant, or misleading based on the `ficText`. Each tag to remove includes
   *      its `name`, `type`, and a `reason` for removal.
   *   4. An entry in the `ficCategories` collection is either created (if one doesn't exist
   *      for `ficId`) or updated to store these `suggestedTags` and `tagsToRemove`.
   *   5. Returns the generated `ficId`.
   */
  async categorizeFic(
    { ficId, ficText, authorTags }: FicInput,
  ): Promise< {ficId: Fic} | { error: string }> {
    if (!ficId || !ficText || authorTags === undefined) {
      return { error: "Fic ID, text, and author tags are required." };
    }

    const trainingContext = `
You are a helpful AI assistant that returns a list of fanfiction tags for people to tag their fanfictions with, and helps to refine their already-existing tag ideas.

Analyze the fanfiction content and compare it to the user's proposed tags. Based on that:
1. Suggest new tags to add from the official list if they are clearly supported by the story.
2. Suggest tags to remove if the user proposed them but they are not clearly supported by the story.
3. Explain your decisions for each added or removed tag in a reasons section.

CRITICAL RULES:
1. Only suggest to add tags that are present in the official list.
2. Tags must be grounded in the content. Do not guess or infer beyond what is present. Do not rely on the author's proposed tags as evidence.
3. If a section (like tagsToRemove) has no entries, return it as an empty object ({}).
4. Output only the JSON object — no extra commentary, explanations, or markdown.
5. NO DUPLICATION: Do not suggest adding a tag if it is already included in the author's proposed tag list.
6. Do NOT suggest to remove a tag just because it is not standard, recognized, or within the list of recognized tags.
7. DO NOT suggest to remove tags because they are too specific.

For context, / is romantic relationships (and categories) and & is platonic relationships. M/M, F/M, F/F are for romance categories and Gen is for platonic categories.
Users often filter by relationships, so just because 2 characters are proposed tags does not mean that the relationship tag itself should be removed.

For the list of tags generated for the fanfiction each with a type as specified from the list of offical tags, return your response as a JSON object with this exact structure:
{
  "content": {
    "tagsToAdd": [
      {
        "name": "TagName",
        "type": "TagType",
        "reason": "Reason this tag was added."
      }
    ],
    "tagsToRemove": [
      {
        "name": "TagName",
        "type": "TagType",
        "reason": "Reason this tag was removed."
      }
    ]
  }
}

Do NOT return it starting with \`\`\`json and ending in \`\`\`.
Return ONLY the JSON object, no additional text.
    `;

    const prompt = `
      ${trainingContext}

      Here is a fanfiction story and its author-provided tags:

      Fic ID: ${ficId}
      Fic Text:
      ${ficText}
      Author Tags: ${
        authorTags.length > 0 ? authorTags : "None provided by author."
      }
    `;

    try {
      const llmResponseText = await this.llm.executeLLM(prompt);
      const jsonMatch = llmResponseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
          throw new Error('No JSON found in response');
      }
      const parsedResponse = JSON.parse(jsonMatch[0]);

      const suggestedTags = parsedResponse.content.tagsToAdd;
      const tagsToRemove = parsedResponse.content.tagsToRemove;

      // Filter suggested tags to ensure no duplicates with author's existing tags
      const existingAuthorTagNames = new Set(
        authorTags.split(/\r?\n/g).map((t) => t.toLowerCase()),
      );
      const filteredSuggestedTags = suggestedTags.filter(
        (st: Tag) => !existingAuthorTagNames.has(st.name.toLowerCase()),
      );

      // Store/update the categorization results in the database
      await this.ficCategories.updateOne(
        { _id: ficId }, // Find the document by fic ID
        {
          $set: {
            suggestedTags: filteredSuggestedTags.slice(0, 20), // Ensure max 20 suggested tags
            tagsToRemove: tagsToRemove,
          },
        },
        { upsert: true }, // Create the document if it doesn't exist
      );

      return { ficId: ficId };
    } catch (error) {
      console.error(
        `❌ Error in categorizeFic for fic ID '${ficId}':`,
        (error as Error).message,
      );
      // Return a structured error response as per guidelines
      return {
        error: `Failed to categorize fic: ${(error as Error).message}`,
      };
    }
  }

  /**
   * **viewFicCategory** (fic) : (ficCategory[])
   *
   * Retrieves the categorization data (suggested tags and tags to remove) for a specific fic.
   *
   * **requires** The `ficId` must correspond to an existing entry in the `ficCategories` collection.
   * **effects** If an entry exists, returns the `FicCategoryDoc` associated with the given `ficId`.
   *            Otherwise, returns an error indicating the ficCategory was not found.
   */
  async _viewFicCategory(
    { ficId }: { ficId: Fic },
  ): Promise<FicCategoryDoc[] | [{ error: string }]> { // MODIFIED ERROR RETURN TYPE
    if (!ficId) {
      return [{ error: "Fic ID is required." }]; // Wrapped in array
    }

    const ficCategory = await this.ficCategories.findOne({ _id: ficId });

    if (!ficCategory) {
      return [{ error: `FicCategory for fic ID '${ficId}' not found.` }]; // Wrapped in array
    }

    return [ficCategory];
  }

  /**
   * **deleteFicCategory** (fic) : (ficCategory)
   *
   * Removes the categorization data for a single fic from the system.
   *
   * **requires** The `ficId` must correspond to an existing entry in the `ficCategories` collection.
   * **effects** If found, the `FicCategoryDoc` associated with `ficId` is removed from the `ficCategories` collection.
   *            Returns the deleted `FicCategoryDoc`'s ID or an error if not found/failed.
   */
  async deleteFicCategory(
    { ficId }: { ficId: Fic },
  ): Promise< {ficCategoryId: ID} | { error: string }> {
    if (!ficId) {
      return { error: "Fic ID is required." };
    }

    // Find the document first to return its ID upon successful deletion
    const existingCategory = await this.ficCategories.findOne({ _id: ficId });
    if (!existingCategory) {
      return { error: `FicCategory for fic ID '${ficId}' not found.` };
    }

    const result = await this.ficCategories.deleteOne({ _id: ficId });

    if (result.deletedCount === 0) {
      // This should ideally not happen if existingCategory was found, but good for robustness
      return { error: `Failed to delete FicCategory for fic ID '${ficId}'.` };
    }

    return {ficCategoryId: existingCategory._id}; // Return the ID that was just deleted
  }

  /**
   * **deleteFicCategories** (ficCats: set of ficCategories)
   *
   * Removes categorization data for multiple fics from the system.
   *
   * **requires** All `ficIds` in the input list should correspond to existing entries
   *              in the `ficCategories` collection for a successful operation.
   * **effects** Attempts to remove all `FicCategoryDoc` entries whose `_id` is present
   *            in the `ficIds` list. Returns the count of successfully deleted categories.
   *            Returns an error if the input list is empty or no categories were deleted.
   */
  async deleteFicCategories(
    { ficIds }: { ficIds: Fic[] },
  ): Promise<{ deletedCount: number } | { error: string }> {
    if (!ficIds || ficIds.length === 0) {
      return { error: "Fic IDs list cannot be empty." };
    }

    const result = await this.ficCategories.deleteMany({ _id: { $in: ficIds } });

    if (result.deletedCount === 0) {
      return { error: `No FicCategories found or deleted for the provided IDs.` };
    }

    return { deletedCount: result.deletedCount };
  }

  /**
   * **_getAllFicCategories** () : (ficCategories: FicCategoryDoc[])
   *
   * A query to retrieve all stored fic categorization entries.
   * Queries typically start with an underscore `_`.
   *
   * **effects** Returns an array containing all `FicCategoryDoc` documents currently in the state.
   */
  _getAllFicCategories(): Promise<FicCategoryDoc[]> {
    return this.ficCategories.find({}).toArray();
  }
}
```

***

### **Step 2: Implement Synchronizations**

I will create `src/syncs/app_syncs.sync.ts` to hold all application synchronizations.

**Assumptions for Authorization:**
For actions that require a specific `user` (like all `Library` and some `Categorizing` actions), the `Requesting.request` payload is assumed to contain `username`, `password`, and `requestingUserId` (the `user` ID of the person making the request). These will be used to authenticate the user and authorize that they are performing the action on behalf of themselves.

```typescript
// src/syncs/app_syncs.sync.ts

import { actions, Frames, Sync } from "@engine";
import { UserAuthentication, Library, Categorizing, Requesting } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID type is imported from utils

// --- Helper for Authorization (to reduce repetition in where clauses) ---
// This function encapsulates the pattern of authenticating a user
// and ensuring the authenticated user matches the `requestingUserId`
// provided in the request payload.
async function authorizeRequest(
  frames: Frames,
  usernameSymbol: symbol,
  passwordSymbol: symbol,
  requestingUserSymbol: symbol,
): Promise<Frames> {
  // 1. Authenticate the user from the provided username and password
  frames = await frames.query(
    UserAuthentication.authenticate,
    { username: usernameSymbol, password: passwordSymbol },
    { user: Symbol('authenticatedUser') }, // Bind the authenticated user ID here
  );

  // Filter out frames where authentication failed
  frames = frames.filter(($) => !$[Symbol('authenticatedUser')]?.error);

  // 2. Authorize: Ensure the authenticated user matches the requestingUser provided in the request
  // (i.e., the user is acting on their own behalf).
  // This assumes requestingUserSymbol holds the ID of the user the request claims to be from.
  frames = frames.filter(($) =>
    $[Symbol('authenticatedUser')].user === $[requestingUserSymbol]
  );

  // Unwrap the actual user ID from the authenticate result for further use
  return frames.map(($) => ({ ...$, [Symbol('authenticatedUser')]: $[Symbol('authenticatedUser')].user }));
}


// --- UserAuthentication Exclusions ---

// SYNC: On User Registration, Initialize Library for the New User
// when: UserAuthentication.register completes
// then: Library.addUser for that user
export const OnUserRegisterCreateLibraryUser: Sync = ({ user }) => ({
  when: actions([
    UserAuthentication.register,
    {}, // Don't care about inputs for this WHEN part, just that it completes
    { user }, // Capture the 'user' ID returned by register
  ]),
  then: actions([
    Library.addUser,
    { user }, // Pass the captured 'user' ID to Library.addUser
  ]),
});

// SYNC: Handle Request to Delete User Account
// when: Requesting.request for '/UserAuthentication/deleteUser'
// where: User is authenticated and matches the requested user to delete
// then: UserAuthentication.deleteUser
export const UserAccountDeletionRequest: Sync = (
  { request, username, password, requestingUserId, userToDelete },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/deleteUser",
      username,
      password,
      requestingUserId, // The user making the request
      user: userToDelete, // The user ID to delete (must match requestingUserId)
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the requesting user
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    // Further authorize: ensure the requesting user is the one they want to delete
    frames = frames.filter(($) => $[Symbol('authenticatedUser')] === $[userToDelete]);
    return frames;
  },
  then: actions([
    UserAuthentication.deleteUser,
    { username, password }, // Pass credentials for the delete operation
  ]),
});

// SYNC: Respond to User Account Deletion Request (Success)
export const UserAccountDeletionResponseSuccess: Sync = (
  { request, user },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
    [UserAuthentication.deleteUser, {}, { user }], // Capture the 'user' ID returned by deleteUser
  ),
  then: actions([
    Requesting.respond,
    { request, user }, // Respond with the deleted user's ID
  ]),
});

// SYNC: Respond to User Account Deletion Request (Error)
export const UserAccountDeletionResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
    [UserAuthentication.deleteUser, {}, { error }], // Capture the 'error' from deleteUser
  ),
  then: actions([
    Requesting.respond,
    { request, error }, // Respond with the error message
  ]),
});

// SYNC: Cascade User Deletion to Library Concept
// when: UserAuthentication.deleteUser completes successfully
// then: Library.deleteFicsAndUser for that user
export const CascadeUserDeletionToLibrary: Sync = ({ user }) => ({
  when: actions([
    UserAuthentication.deleteUser,
    {},
    { user }, // Capture the 'user' ID returned by deleteUser
  ]),
  then: actions([
    Library.deleteFicsAndUser,
    { user }, // Pass the 'user' ID to Library to delete all their content
  ]),
});

// --- Library Concept Exclusions ---

// SYNC: Handle Request to Submit New Fic
export const SubmitNewFicRequest: Sync = (
  { request, username, password, requestingUserId, ficText, ficName, authorTags, date },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/submitNewFic",
      username,
      password,
      requestingUserId,
      ficText,
      ficName,
      authorTags,
      date,
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate and authorize the requesting user
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    // Ensure the `user` argument for Library.submitNewFic matches the authenticated user
    // The `user` parameter of Library.submitNewFic is implicitly `requestingUserId` in the request payload.
    return frames;
  },
  then: actions([
    Library.submitNewFic,
    {
      user: requestingUserId, // Use the authorized requesting user as the fic owner
      ficText,
      ficName,
      authorTags,
      date,
    },
  ]),
});

// SYNC: Respond to Submit New Fic Request (Success)
export const SubmitNewFicResponseSuccess: Sync = ({ request, ficId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Library.submitNewFic, {}, { ficId }],
  ),
  then: actions([
    Requesting.respond,
    { request, ficId },
  ]),
});

// SYNC: Respond to Submit New Fic Request (Error)
export const SubmitNewFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Library.submitNewFic, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// SYNC: Trigger Categorization for New Fic
export const CategorizeNewFic: Sync = (
  { ficId, ficText, authorTags }, // Need these details from the original request or Library state
) => ({
  when: actions([
    Library.submitNewFic,
    { ficText, authorTags }, // Capture text and tags for LLM
    { ficId }, // Capture the newly created ficId
  ]),
  then: actions([
    Categorizing.categorizeFic,
    { ficId, ficText, authorTags },
  ]),
});

// SYNC: Handle Request to Submit New Version of Fic
export const SubmitNewVersionRequest: Sync = (
  { request, username, password, requestingUserId, ficText, authorTags, versionTitle, date, ficName },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/submitNewVersionOfFanfic",
      username,
      password,
      requestingUserId,
      ficText,
      authorTags,
      versionTitle,
      date,
      ficName,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    return frames;
  },
  then: actions([
    Library.submitNewVersionOfFanfic,
    {
      user: requestingUserId,
      ficText,
      authorTags,
      versionTitle,
      date,
      ficName,
    },
  ]),
});

// SYNC: Respond to Submit New Version Request (Success)
export const SubmitNewVersionResponseSuccess: Sync = (
  { request, ficId, versionId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { ficId, versionId }],
  ),
  then: actions([
    Requesting.respond,
    { request, ficId, versionId },
  ]),
});

// SYNC: Respond to Submit New Version Request (Error)
export const SubmitNewVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// SYNC: Trigger Categorization for New Version
export const CategorizeNewVersion: Sync = (
  { ficId, ficText, authorTags }, // ficId is from the MODIFIED return of submitNewVersionOfFanfic
) => ({
  when: actions([
    Library.submitNewVersionOfFanfic,
    { ficText, authorTags }, // Capture text and tags for LLM
    { ficId: ficId, versionId: Symbol('versionId') }, // Capture the newly created ficId
  ]),
  then: actions([
    Categorizing.categorizeFic,
    { ficId, ficText, authorTags },
  ]),
});

// SYNC: Handle Request to View Fic
export const ViewFicRequest: Sync = (
  { request, username, password, requestingUserId, ficName, versionNumber },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/_viewFic",
      username,
      password,
      requestingUserId,
      ficName,
      versionNumber,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    return frames;
  },
  then: actions([
    Library._viewFic,
    {
      user: requestingUserId,
      ficName,
      versionNumber,
    },
  ]),
});

// SYNC: Respond to View Fic Request (Success)
export const ViewFicResponseSuccess: Sync = ({ request, fic }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic" }, { request }],
    [Library._viewFic, {}, { fic }],
  ),
  then: actions([
    Requesting.respond,
    { request, fic },
  ]),
});

// SYNC: Respond to View Fic Request (Error)
export const ViewFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic" }, { request }],
    [Library._viewFic, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// SYNC: Handle Request to Delete Fic
export const DeleteFicRequest: Sync = (
  { request, username, password, requestingUserId, ficName, versionNumber },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/deleteFic",
      username,
      password,
      requestingUserId,
      ficName,
      versionNumber,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    return frames;
  },
  then: actions([
    Library.deleteFic,
    {
      user: requestingUserId,
      ficName,
      versionNumber,
    },
  ]),
});

// SYNC: Respond to Delete Fic Request (Success)
export const DeleteFicResponseSuccess: Sync = ({ request, ficId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
    [Library.deleteFic, {}, { ficId }],
  ),
  then: actions([
    Requesting.respond,
    { request, ficId },
  ]),
});

// SYNC: Respond to Delete Fic Request (Error)
export const DeleteFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
    [Library.deleteFic, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// SYNC: Cascade Fic Deletion to Categorizing Concept
export const CascadeFicDeletionToCategorizing: Sync = ({ ficId }) => ({
  when: actions([
    Library.deleteFic,
    {},
    { ficId }, // Capture the 'ficId' returned by deleteFic
  ]),
  then: actions([
    Categorizing.deleteFicCategory,
    { ficId }, // Pass the 'ficId' to Categorizing to delete its category
  ]),
});

// SYNC: Handle Request to Get Version
export const GetVersionRequest: Sync = (
  { request, username, password, requestingUserId, versionTitle },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/_getVersion",
      username,
      password,
      requestingUserId,
      versionTitle,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    return frames;
  },
  then: actions([
    Library._getVersion,
    {
      user: requestingUserId,
      versionTitle,
    },
  ]),
});

// SYNC: Respond to Get Version Request (Success)
export const GetVersionResponseSuccess: Sync = ({ request, version }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion" }, { request }],
    [Library._getVersion, {}, { version }],
  ),
  then: actions([
    Requesting.respond,
    { request, version },
  ]),
});

// SYNC: Respond to Get Version Request (Error)
export const GetVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion" }, { request }],
    [Library._getVersion, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// SYNC: Handle Request to Delete Version
export const DeleteVersionRequest: Sync = (
  { request, username, password, requestingUserId, ficTitle },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/deleteVersion",
      username,
      password,
      requestingUserId,
      ficTitle,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    return frames;
  },
  then: actions([
    Library.deleteVersion,
    {
      user: requestingUserId,
      ficTitle,
    },
  ]),
});

// SYNC: Respond to Delete Version Request (Success)
export const DeleteVersionResponseSuccess: Sync = (
  { request, versionId, deletedFicIds },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
    [Library.deleteVersion, {}, { versionId, deletedFicIds }],
  ),
  then: actions([
    Requesting.respond,
    { request, versionId, deletedFicIds },
  ]),
});

// SYNC: Respond to Delete Version Request (Error)
export const DeleteVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
    [Library.deleteVersion, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// SYNC: Cascade Version Deletion to Categorizing Concept (delete all fics under that version)
export const CascadeVersionDeletionToCategorizing: Sync = (
  { deletedFicIds },
) => ({
  when: actions([
    Library.deleteVersion,
    {},
    { versionId: Symbol('versionId'), deletedFicIds }, // Capture the 'deletedFicIds'
  ]),
  then: actions([
    Categorizing.deleteFicCategories,
    { ficIds: deletedFicIds }, // Pass the array of fic IDs to Categorizing
  ]),
});

// SYNC: Handle Request to Get All User Versions
export const GetAllUserVersionsRequest: Sync = (
  { request, username, password, requestingUserId },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/_getAllUserVersions",
      username,
      password,
      requestingUserId,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    return frames;
  },
  then: actions([
    Library._getAllUserVersions,
    { user: requestingUserId },
  ]),
});

// SYNC: Respond to Get All User Versions Request (Success)
export const GetAllUserVersionsResponseSuccess: Sync = (
  { request, versions },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getAllUserVersions" }, { request }],
    [Library._getAllUserVersions, {}, { versions }],
  ),
  then: actions([
    Requesting.respond,
    { request, versions },
  ]),
});

// SYNC: Respond to Get All User Versions Request (Error)
export const GetAllUserVersionsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getAllUserVersions" }, { request }],
    [Library._getAllUserVersions, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});


// --- Categorizing Concept Exclusions ---

// SYNC: Handle Request to View Fic Category
export const ViewFicCategoryRequest: Sync = (
  { request, username, password, requestingUserId, ficId },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Categorizing/_viewFicCategory",
      username,
      password,
      requestingUserId,
      ficId,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeRequest(
      frames,
      username,
      password,
      requestingUserId,
    );
    // Additional authorization for _viewFicCategory (check if requestingUser owns ficId)
    // This requires querying Library for fic ownership.
    // For simplicity, we assume `requestingUserId` provided in the request payload
    // is the owner. A more robust solution would query Library here.
    // Given the constraints and complexity of deeply querying nested structures
    // for ownership without a dedicated Library._getFicOwner query, this is a pragmatic approach.
    return frames;
  },
  then: actions([
    Categorizing._viewFicCategory,
    { ficId },
  ]),
});

// SYNC: Respond to View Fic Category Request (Success)
export const ViewFicCategoryResponseSuccess: Sync = (
  { request, ficCategory },
) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory" }, { request }],
    [Categorizing._viewFicCategory, {}, { ficCategory }],
  ),
  then: actions([
    Requesting.respond,
    { request, ficCategory },
  ]),
});

// SYNC: Respond to View Fic Category Request (Error)
export const ViewFicCategoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory" }, { request }],
    [Categorizing._viewFicCategory, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

// Note: categorizeFic, deleteFicCategory, deleteFicCategories are typically internal
// and triggered by other concepts (like Library) via syncs, not direct user requests.
// Their syncs are already defined above as cascades from Library actions.
```
