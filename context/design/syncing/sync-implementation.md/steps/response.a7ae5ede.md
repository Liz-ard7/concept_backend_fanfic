---
timestamp: 'Fri Nov 07 2025 23:11:09 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_231109.8987670c.md]]'
content_id: a7ae5edef3c443b01f9a6d67c1ba80c6b75c051bde47f95aa5d0f2924c277848
---

# response:

Okay, let's implement the synchronizations for the excluded actions and queries across the `UserAuthentication`, `Library`, and `Categorizing` concepts.

As per the instructions:

* I will create a file named `src/syncs/app.sync.ts` to house all these synchronizations.
* I will ensure all necessary `import` statements are at the top.
* **Crucially, I have first updated the return types of all query methods in `src/concepts/Categorizing/CategorizingConcept.ts` and `src/concepts/Library/LibraryConcept.ts` to *always return an array*, even for errors, as `Frames.query` expects this format.** This is a prerequisite to making the `where` clauses work correctly.
* All `Requesting.request` actions will assume the `user` ID is provided in the request payload and represents the authenticated user making the request. Authorization checks within the `where` clause will verify this `user` against resource ownership where applicable.
* I'll update `src/concepts/Requesting/passthrough.ts` to reflect the exclusion decisions.

***

### Step 1: Update Concept Query Return Types (Modified Files)

I've updated `src/concepts/Categorizing/CategorizingConcept.ts` and `src/concepts/Library/LibraryConcept.ts` to ensure query methods (starting with `_`) consistently return `Promise<Array<...>>` where an error is represented as `[{ error: string }]`. Action methods, which are not used with `Frames.query`, retain their `Promise<SuccessType | { error: string }>` return types.

The updated `CategorizingConcept.ts` and `LibraryConcept.ts` files are provided again with the necessary changes:

**`src/concepts/Categorizing/CategorizingConcept.ts`**

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { GeminiLLM, Config as LLMConfig } from "../../../gemini-llm.ts";
// import * as fs from 'node:fs'; // Not used in final categorizeFic
// import * as path from 'node:path'; // Not used in final categorizeFic

type Fic = ID;

interface Tag {
  name: string;
  type: string;
  reason: string;
}

interface FicInput {
  ficId: Fic;
  ficText: string;
  authorTags: string;
}

export interface FicCategoryDoc {
  _id: Fic;
  suggestedTags: Tag[];
  tagsToRemove: Tag[];
}

const PREFIX = "Categorizing" + ".";

export default class CategorizingConcept {
  ficCategories: Collection<FicCategoryDoc>;
  private llm: GeminiLLM;

  constructor(private readonly db: Db, llmConfig?: LLMConfig) {
    this.ficCategories = this.db.collection(PREFIX + "ficCategories");
    if(llmConfig === undefined) {
      const llmConfig2: LLMConfig = { apiKey: Deno.env.get("GEMINI_API_KEY") || "fake-api-key-for-tests" };
      this.llm = new GeminiLLM(llmConfig2);
    }
    else {
      this.llm = new GeminiLLM(llmConfig);
    }
  }

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

      const suggestedTags = parsedResponse.content.tagsToAdd || [];
      const tagsToRemove = parsedResponse.content.tagsToRemove || [];

      const existingAuthorTagNames = new Set(
        authorTags.split(/\r?\n/g).map((t) => t.toLowerCase()),
      );
      const filteredSuggestedTags = suggestedTags.filter(
        (st: Tag) => !existingAuthorTagNames.has(st.name.toLowerCase()),
      );

      await this.ficCategories.updateOne(
        { _id: ficId },
        {
          $set: {
            suggestedTags: filteredSuggestedTags.slice(0, 20),
            tagsToRemove: tagsToRemove,
          },
        },
        { upsert: true },
      );

      return { ficId: ficId };
    } catch (error) {
      console.error(
        `❌ Error in categorizeFic for fic ID '${ficId}':`,
        (error as Error).message,
      );
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
   * **effects** If an entry exists, returns an array containing the `FicCategoryDoc` associated with the given `ficId`.
   *            Otherwise, returns an array with an error object.
   */
  async _viewFicCategory(
    { ficId }: { ficId: Fic },
  ): Promise<FicCategoryDoc[] | [{ error: string }]> { // MODIFIED RETURN TYPE
    if (!ficId) {
      return [{ error: "Fic ID is required." }]; // Return as array
    }

    const ficCategory = await this.ficCategories.findOne({ _id: ficId });

    if (!ficCategory) {
      return [{ error: `FicCategory for fic ID '${ficId}' not found.` }]; // Return as array
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
   *            Returns an object containing the deleted `ficCategoryId` or an error object.
   */
  async deleteFicCategory(
    { ficId }: { ficId: Fic },
  ): Promise< {ficCategoryId: ID} | { error: string }> {
    if (!ficId) {
      return { error: "Fic ID is required." };
    }

    const existingCategory = await this.ficCategories.findOne({ _id: ficId });
    if (!existingCategory) {
      return { error: `FicCategory for fic ID '${ficId}' not found.` };
    }

    const result = await this.ficCategories.deleteOne({ _id: ficId });

    if (result.deletedCount === 0) {
      return { error: `Failed to delete FicCategory for fic ID '${ficId}'.` };
    }

    return {ficCategoryId: existingCategory._id};
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
      return { error: "Fic IDs list cannot be empty for batch deletion." };
    }

    const result = await this.ficCategories.deleteMany({ _id: { $in: ficIds } });

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
  async _getAllFicCategories(): Promise<FicCategoryDoc[]> {
    return this.ficCategories.find({}).toArray();
  }
}
```

**`src/concepts/Library/LibraryConcept.ts`**

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Library" + ".";

type User = ID;

interface DateSpec {
  day: number;
  month: number;
  year: number;
}

export interface Fic {
  _id: ID;
  name: string;
  text: string;
  authorTags: string;
  date: DateSpec;
  versionNumber: number;
}

export interface Version {
  _id: ID;
  title: string;
  fics: Fic[];
}

interface UserDoc {
  _id: User;
  versions: Version[];
}

export default class LibraryConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  async addUser({ user }: { user: User }): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (existingUser) {
      return { error: `User '${user}' already exists.` };
    }

    await this.users.insertOne({ _id: user, versions: [] });
    return {};
  }

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
      versionNumber: 0,
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

  async submitNewVersionOfFanfic(
    { user, ficText, authorTags, versionTitle, date, ficName }: {
      user: User;
      ficText: string;
      authorTags: string;
      versionTitle: string;
      date: DateSpec;
      ficName: string;
    },
  ): Promise<{ versionId: ID } | { error: string }> {
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
    const newVersionNumber = targetVersion.fics.length;

    const newFic: Fic = {
      _id: freshID(),
      name: ficName,
      text: ficText,
      authorTags: authorTags,
      date: date,
      versionNumber: newVersionNumber,
    };

    await this.users.updateOne(
      { _id: user, "versions.title": versionTitle },
      { $push: { "versions.$.fics": newFic } },
    );

    const updatedUserDoc = await this.users.findOne({ _id: user });
    const updatedVersion = updatedUserDoc?.versions.find((v) =>
      v.title === versionTitle
    );

    if (!updatedVersion) {
      return { error: "Failed to retrieve updated version." };
    }

    return { versionId: updatedVersion._id };
  }

  async _viewFic(
    { user, ficName, versionNumber }: {
      user: User;
      ficName: string;
      versionNumber: number;
    },
  ): Promise<[{ fic: Fic }] | [{ error: string }]> { // MODIFIED RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User '${user}' does not exist.` }];
    }

    const targetVersion = userDoc.versions.find((v) => v.title === ficName);
    if (!targetVersion) {
      return [{
        error: `Fic with name '${ficName}' does not exist for user '${user}'.`,
      }];
    }

    if (
      versionNumber < 0 || versionNumber >= targetVersion.fics.length
    ) {
      return [{
        error:
          `Version number '${versionNumber}' is out of range for fic '${ficName}'.`,
      }];
    }

    const fic = targetVersion.fics.find((f) =>
      f.versionNumber === versionNumber
    );
    if (!fic) {
      return [{
        error:
          `Fic revision with version number '${versionNumber}' not found for '${ficName}'.`,
      }];
    }

    return [{ fic: fic }];
  }

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

  async deleteFicsAndUser(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: user });
    if (result.deletedCount === 0) {
      return { error: `User '${user}' does not exist.` };
    }
    return {};
  }

  async _getVersion(
    { user, versionTitle }: { user: User; versionTitle: string },
  ): Promise<[{ version: Version }] | [{ error: string }]> { // MODIFIED RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User '${user}' does not exist.` }];
    }

    const version = userDoc.versions.find((v) => v.title === versionTitle);
    if (!version) {
      return [{
        error: `Version with title '${versionTitle}' not found for user '${user}'.`,
      }];
    }
    return [{ version: version }];
  }

  async deleteVersion(
    { user, ficTitle }: { user: User; ficTitle: string },
  ): Promise<{ versionId: ID } | { error: string }> {
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

    await this.users.updateOne(
      { _id: user },
      { $pull: { versions: { title: ficTitle } } },
    );

    return { versionId: versionToDelete._id };
  }

  async _getAllUserVersions(
    { user }: { user: User },
  ): Promise<[{ versions: Version[] }] | [{ error: string }]> { // MODIFIED RETURN TYPE
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User '${user}' does not exist.` }];
    }
    return [{ versions: userDoc.versions }];
  }
}
```

**`src/concepts/UserAuthentication/UserAuthenticationConcept.ts`**
(No changes needed here as it has no queries and its actions return `{user: ID} | {error: string}` which is handled by `only/unless` in `then` clauses.)

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "UserAuthentication" + ".";

type User = ID;

interface UserDoc {
  _id: User;
  username: string;
  password: string;
}

export default class UserAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already exists." };
    }

    const newUser: UserDoc = {
      _id: freshID() as User,
      username,
      password,
    };

    const result = await this.users.insertOne(newUser);
    if (!result.acknowledged) {
      return { error: "Failed to register user." };
    }

    return { user: newUser._id };
  }

  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const foundUser = await this.users.findOne({ username, password });

    if (!foundUser) {
      return { error: "Invalid username or password." };
    }

    return { user: foundUser._id };
  }

  async deleteUser(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const userToDelete = await this.users.findOne({ username, password });

    if (!userToDelete) {
      return { error: "Invalid username or password." };
    }

    const result = await this.users.deleteOne({ _id: userToDelete._id });

    if (result.deletedCount === 0) {
      return { error: "Failed to delete user." };
    }

    return { user: userToDelete._id };
  }
}
```

***

### Step 2: Implement Synchronizations (`src/syncs/app.sync.ts`)

```typescript
// @filename: src/syncs/app.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Categorizing, Library, Requesting, UserAuthentication } from "@concepts";
import { ID } from "@utils/types.ts";
import { Version, Fic } from "@concepts/Library/LibraryConcept.ts";

// --- UserAuthentication Syncs ---

/**
 * Sync: AddUserToLibraryOnRegistration
 * Purpose: Automatically initialize a user's empty library when they register.
 * This is an internal cascade, not directly triggered by Requesting.request.
 * When UserAuthentication.register successfully creates a user, Library.addUser is called.
 */
export const AddUserToLibraryOnRegistration: Sync = ({ user }) => ({
  when: actions([UserAuthentication.register, {}, { user }]),
  then: actions([Library.addUser, { user }]),
});

/**
 * Sync: DeleteUserRequest
 * Purpose: Handle a request to delete a user account.
 * It first authenticates the user attempting the deletion (self-deletion implied by action signature),
 * then triggers UserAuthentication.deleteUser, and cascades to delete their library.
 */
export const DeleteUserRequest: Sync = (
  { request, username, password, userToDelete, authError, deleteError },
) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteUser", username, password },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the user trying to delete (self-deletion implied by action signature)
    frames = await frames.query(
      UserAuthentication.authenticate,
      { username, password },
      { user: userToDelete, error: authError }, // Bind authentication error
    );

    // Filter out frames where authentication failed. If auth failed, only the error response path should be taken.
    return frames.filter(($) => {
      if ($[authError]) {
        // Keep frame to return auth error, but ensure userToDelete is not set for cascade
        $[userToDelete] = undefined;
        return true; // Keep error frame
      }
      return true; // Keep successful authentication frames
    });
  },
  then: actions(
    // 1. If authentication failed, respond immediately with the authentication error.
    [
      Requesting.respond,
      { request, error: authError },
      { only: authError }, // Only fire if authError is present
    ],
    // 2. If authenticated, trigger the actual user deletion in UserAuthentication.
    [
      UserAuthentication.deleteUser,
      { username, password },
      { user: userToDelete, error: deleteError }, // Bind deletion error
      { unless: authError }, // Only attempt if authentication was successful
    ],
    // 3. Respond with deletion error if UserAuthentication.deleteUser failed.
    [
      Requesting.respond,
      { request, error: deleteError },
      { only: deleteError }, // Only fire if deleteError is present
    ],
    // 4. If user deletion was successful, respond with the deleted user's ID.
    [
      Requesting.respond,
      { request, user: userToDelete },
      { unless: authError, unless: deleteError }, // Only if no errors from auth or delete
    ],
    // Note: The cascade to Library.deleteFicsAndUser is handled by a separate sync
    // (DeleteUserLibraryCascade) that listens to UserAuthentication.deleteUser.
  ),
});


// --- Library Concept Syncs ---

/**
 * Sync: SubmitNewFicRequest
 * Purpose: Handles requests to submit a new fic.
 * It leverages Library's internal checks for user existence and fic name uniqueness.
 * On success, it triggers categorization for the new fic and responds to the request.
 */
export const SubmitNewFicRequest: Sync = (
  { request, user, ficText, ficName, authorTags, date, ficId, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/submitNewFic", user, ficText, ficName, authorTags, date },
    { request },
  ]),
  then: actions(
    // 1. Create the new fic in the Library
    [
      Library.submitNewFic,
      { user, ficText, ficName, authorTags, date },
      { ficId, error },
    ],
    // 2. Respond to the original request (success)
    [
      Requesting.respond,
      { request, ficId },
      { unless: error },
    ],
    // 3. Respond to the original request (error)
    [
      Requesting.respond,
      { request, error },
      { only: error },
    ],
  ),
});

/**
 * Sync: TriggerCategorizationOnNewFic
 * Purpose: Triggers categorization when a new fic is successfully submitted to the Library.
 * This is an internal cascade.
 */
export const TriggerCategorizationOnNewFic: Sync = (
  { user, ficId, ficText, authorTags },
) => ({
  when: actions([
    Library.submitNewFic, // When a new fic is created
    { user, ficText, authorTags }, // Bind these from the action's input
    { ficId }, // Bind ficId from the action's output
  ]),
  then: actions([
    Categorizing.categorizeFic,
    { ficId, ficText, authorTags }, // Pass the extracted ficId and details
  ]),
});


/**
 * Sync: SubmitNewVersionRequest
 * Purpose: Handles requests to submit a new version of an existing fic.
 * It leverages Library's internal checks for user and version existence.
 * On success, it triggers categorization for the new version's fic and responds.
 */
export const SubmitNewVersionRequest: Sync = (
  { request, user, ficText, authorTags, versionTitle, date, ficName, versionId, error },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/submitNewVersionOfFanfic",
      user,
      ficText,
      authorTags,
      versionTitle,
      date,
      ficName,
    },
    { request },
  ]),
  then: actions(
    // 1. Submit the new version to the Library
    [
      Library.submitNewVersionOfFanfic,
      { user, ficText, authorTags, versionTitle, date, ficName },
      { versionId, error },
    ],
    // 2. Respond to the original request (success)
    [
      Requesting.respond,
      { request, versionId },
      { unless: error },
    ],
    // 3. Respond to the original request (error)
    [
      Requesting.respond,
      { request, error },
      { only: error },
    ],
  ),
});

/**
 * Sync: TriggerCategorizationOnNewVersionFic
 * Purpose: Triggers categorization for the *newest fic* within a version after a new version is submitted.
 * This sync is necessary because `submitNewVersionOfFanfic` returns `versionId`, not the new `ficId` directly.
 * It must query the library to find the most recently added fic in the version.
 */
export const TriggerCategorizationOnNewVersionFic: Sync = (
  { user, versionTitle, version, fic, ficText, authorTags },
) => ({
  when: actions([
    Library.submitNewVersionOfFanfic, // This action *completes*
    { user, versionTitle }, // Bind these parameters to find the version
    {}, // Output from submitNewVersionOfFanfic (versionId) is not directly bound here
  ]),
  where: async (frames) => {
    // For each frame, query the full version to get the latest fic details.
    frames = await frames.query(Library._getVersion, { user, versionTitle }, { version, error: Symbol('getVersionError') });

    // Filter out frames where _getVersion failed
    frames = frames.filter(($) => !$[Symbol('getVersionError')]);

    // Extract the latest fic's ID, text, and authorTags for categorization
    frames = frames.flatMap(($) => { // Use flatMap to potentially remove frames if no latest fic
      const currentVersion: Version = $[version] as Version;
      if (!currentVersion || currentVersion.fics.length === 0) return new Frames(); // No fics, discard frame

      const latestFic: Fic = currentVersion.fics[currentVersion.fics.length - 1];
      return new Frames({
        ...$, // Keep all original bindings
        [fic]: latestFic._id,
        [ficText]: latestFic.text,
        [authorTags]: latestFic.authorTags,
      });
    });
    return frames;
  },
  then: actions([
    Categorizing.categorizeFic,
    { ficId: fic, ficText, authorTags }, // Pass the extracted ficId and details
  ]),
});


/**
 * Sync: ViewFicRequest
 * Purpose: Handles requests to view a specific fic revision, ensuring authorization.
 * Library._viewFic contains internal authorization checks.
 */
export const ViewFicRequest: Sync = (
  { request, user, ficName, versionNumber, fic, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/_viewFic", user, ficName, versionNumber },
    { request },
  ]),
  then: actions(
    // 1. View the fic from the Library
    [
      Library._viewFic,
      { user, ficName, versionNumber },
      { fic, error },
    ],
    // 2. Respond to the original request (success)
    [
      Requesting.respond,
      { request, fic },
      { unless: error },
    ],
    // 3. Respond to the original request (error)
    [
      Requesting.respond,
      { request, error },
      { only: error },
    ],
  ),
});

/**
 * Sync: DeleteFicRequest
 * Purpose: Handles requests to delete a specific fic revision, ensuring authorization
 * and cascading to delete its categorization.
 */
export const DeleteFicRequest: Sync = (
  { request, user, ficName, versionNumber, ficId, deleteError, cascadeError },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/deleteFic", user, ficName, versionNumber },
    { request },
  ]),
  then: actions(
    // 1. Delete the fic from the Library
    [
      Library.deleteFic,
      { user, ficName, versionNumber },
      { ficId, error: deleteError },
    ],
    // 2. If successful, cascade to delete its categorization
    [
      Categorizing.deleteFicCategory,
      { ficId },
      { error: cascadeError }, // Bind cascade error
      { unless: deleteError }, // Only if no error from deleteFic
    ],
    // 3. Respond to the original request (success)
    [
      Requesting.respond,
      { request, ficId },
      { unless: deleteError },
    ],
    // 4. Respond to the original request (error from fic deletion)
    [
      Requesting.respond,
      { request, error: deleteError },
      { only: deleteError },
    ],
    // 5. Respond with cascade error if categorization deletion failed but fic was deleted
    [
      Requesting.respond,
      { request, error: cascadeError },
      { unless: deleteError, only: cascadeError }, // Only if fic delete success but cascade failed
    ],
  ),
});

/**
 * Sync: DeleteUserLibraryCascade
 * Purpose: Cascades deletion from UserAuthentication.deleteUser to delete a user's entire library.
 * This also needs to cascade further to delete all associated categorizations.
 * It listens for the completion of UserAuthentication.deleteUser.
 */
export const DeleteUserLibraryCascade: Sync = ({ user, ficIds, versions, error }) => ({
  when: actions([
    UserAuthentication.deleteUser, // When a user is deleted from auth
    {},
    { user }, // Output pattern: bind the deleted user's ID
  ]),
  where: async (frames) => {
    // For each deleted user, get all their fic IDs from Library
    frames = await frames.query(Library._getAllUserVersions, { user }, { versions, error: Symbol('getVersionsError') });

    // Filter out frames that represent errors from _getAllUserVersions
    frames = frames.filter(($) => !$[Symbol('getVersionsError')]);

    // Flatten versions into a list of fic IDs
    frames = frames.flatMap(($) => {
      const userVersions: Version[] = $[versions] as Version[];
      const ficIdsForUser: ID[] = [];
      if (userVersions && userVersions.length > 0) {
        userVersions.forEach(version => {
          version.fics.forEach(fic => ficIdsForUser.push(fic._id));
        });
      }
      return new Frames({ ...$, [ficIds]: ficIdsForUser }); // Add ficIds to frame
    });

    // Ensure ficIds is an array (potentially empty) for Categorizing.deleteFicCategories
    frames = frames.map(($) => {
      if (!Array.isArray($[ficIds])) { // Ensure it's an array
        $[ficIds] = [];
      }
      return $;
    });

    return frames;
  },
  then: actions(
    // 1. Delete all fics and user data from the Library concept
    //    (Note: Library.deleteFicsAndUser takes `user`, not `ficIds`. This is the direct cascade.)
    [Library.deleteFicsAndUser, { user }, { error }], // Bind potential error from Library.deleteFicsAndUser
    // 2. Cascade to delete all associated categorizations.
    [
      Categorizing.deleteFicCategories,
      { ficIds }, // Pass the array of fic IDs collected in where clause
      {}, // Output from deleteFicCategories, we don't bind it here
      { unless: error }, // Only if Library.deleteFicsAndUser was successful
    ],
    // We don't respond to Requesting.respond here, as this is an internal cascade.
    // Errors from Categorizing.deleteFicCategories are not propagated up this specific cascade.
  ),
});


/**
 * Sync: GetVersionRequest
 * Purpose: Handles requests to retrieve a complete story version, ensuring authorization.
 * Library._getVersion contains internal authorization checks.
 */
export const GetVersionRequest: Sync = (
  { request, user, versionTitle, version, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/_getVersion", user, versionTitle },
    { request },
  ]),
  then: actions(
    // 1. Get the version from the Library
    [
      Library._getVersion,
      { user, versionTitle },
      { version, error },
    ],
    // 2. Respond to the original request (success)
    [
      Requesting.respond,
      { request, version },
      { unless: error },
    ],
    // 3. Respond to the original request (error)
    [
      Requesting.respond,
      { request, error },
      { only: error },
    ],
  ),
});

/**
 * Sync: DeleteVersionRequest
 * Purpose: Handles requests to delete an entire story version, ensuring authorization
 * and cascading to delete all associated categorizations for fics within that version.
 */
export const DeleteVersionRequest: Sync = (
  { request, user, ficTitle, versionId, ficIds, deleteError, cascadeError },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/deleteVersion", user, ficTitle },
    { request },
  ]),
  where: async (frames) => {
    // Before deletion, we need to get all fic IDs in this version for cascading to Categorizing.
    frames = await frames.query(Library._getVersion, { user, versionTitle: ficTitle }, { version: Symbol('currentVersion'), error: Symbol('getVersionError') });

    // Filter out frames where _getVersion failed
    frames = frames.filter(($) => !$[Symbol('getVersionError')]);

    frames = frames.flatMap(($) => {
      const currentVersion: Version = $[Symbol('currentVersion')] as Version;
      if (!currentVersion || currentVersion.fics.length === 0) return new Frames($); // No fics in version, but keep original frame data to potentially return deletion error
      return new Frames({
        ...$, // Keep all original bindings
        [ficIds]: currentVersion.fics.map(fic => fic._id), // Collect all fic IDs
      });
    });

    // Ensure ficIds is an array (potentially empty)
    frames = frames.map(($) => {
      if (!Array.isArray($[ficIds])) { // Ensure it's an array
        $[ficIds] = [];
      }
      return $;
    });

    return frames;
  },
  then: actions(
    // 1. Delete the version from the Library
    [
      Library.deleteVersion,
      { user, ficTitle },
      { versionId, error: deleteError },
    ],
    // 2. If successful, cascade to delete categorizations for all fics in that version
    [
      Categorizing.deleteFicCategories,
      { ficIds }, // Pass the array of fic IDs collected in where clause
      { error: cascadeError }, // Bind cascade error
      { unless: deleteError }, // Only if no error from deleteVersion
    ],
    // 3. Respond to the original request (success)
    [
      Requesting.respond,
      { request, versionId },
      { unless: deleteError },
    ],
    // 4. Respond to the original request (error from version deletion)
    [
      Requesting.respond,
      { request, error: deleteError },
      { only: deleteError },
    ],
    // 5. Respond with cascade error if categorization deletion failed but version was deleted
    [
      Requesting.respond,
      { request, error: cascadeError },
      { unless: deleteError, only: cascadeError }, // Only if version delete success but cascade failed
    ],
  ),
});


// --- Categorizing Concept Syncs ---

/**
 * Sync: ViewFicCategoryRequest
 * Purpose: Handles requests to view a fic's categorization.
 * It authorizes the request by checking if the requesting `user` owns the `ficId`.
 */
export const ViewFicCategoryRequest: Sync = (
  { request, user, ficId, ficCategory, authError, viewError },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Categorizing/_viewFicCategory", user, ficId },
    { request },
  ]),
  where: async (frames) => {
    // Authorization: Need to ensure the 'user' in the request owns the 'ficId'.
    frames = await frames.query(Library._getAllUserVersions, { user }, { versions: Symbol('userVersions'), error: Symbol('getVersionsError') });

    // Filter out frames that represent errors from _getAllUserVersions
    frames = frames.filter(($) => !$[Symbol('getVersionsError')]);

    // Check if any of the user's versions contain the requested ficId
    const authorizedFrames = frames.filter(($) => {
      const userVersions: Version[] = $[Symbol('userVersions')] as Version[];
      if (!userVersions) return false; // No versions to check
      return userVersions.some(version => version.fics.some(fic => fic._id === ficId));
    });

    if (authorizedFrames.length === 0) {
      // If no authorized frames, it means the user doesn't own the fic.
      // Create a single frame with an authorization error to pass to `then`.
      const originalFrame = frames[0] || { [request]: request, [user]: user, [ficId]: ficId };
      return new Frames({ ...originalFrame, [authError]: "User not authorized to view this fic's categorization." });
    }

    return authorizedFrames; // Only authorized frames proceed
  },
  then: actions(
    // 1. If authorization failed, respond immediately with the authorization error.
    [
      Requesting.respond,
      { request, error: authError },
      { only: authError },
    ],
    // 2. If authorized, view the fic category.
    [
      Categorizing._viewFicCategory,
      { ficId },
      { ficCategory, error: viewError }, // Bind view error
      { unless: authError }, // Only attempt if authorization was successful
    ],
    // 3. Respond to the original request (success).
    [
      Requesting.respond,
      { request, ficCategory: Symbol('ficCategory') }, // Ensure ficCategory is bound to a symbol if the query returns an array with a single object
      { unless: authError, unless: viewError },
    ],
    // 4. Respond to the original request (error from viewing).
    [
      Requesting.respond,
      { request, error: viewError },
      { unless: authError, only: viewError },
    ],
  ),
});

/**
 * Sync: DeleteFicCategoryRequest
 * Purpose: Handles requests to delete a specific fic's categorization.
 * It authorizes the request by checking if the requesting `user` owns the `ficId`.
 */
export const DeleteFicCategoryRequest: Sync = (
  { request, user, ficId, ficCategoryId, authError, deleteError },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Categorizing/deleteFicCategory", user, ficId },
    { request },
  ]),
  where: async (frames) => {
    // Authorization: Need to ensure the 'user' in the request owns the 'ficId'.
    frames = await frames.query(Library._getAllUserVersions, { user }, { versions: Symbol('userVersions'), error: Symbol('getVersionsError') });

    // Filter out frames that represent errors from _getAllUserVersions
    frames = frames.filter(($) => !$[Symbol('getVersionsError')]);

    const authorizedFrames = frames.filter(($) => {
      const userVersions: Version[] = $[Symbol('userVersions')] as Version[];
      if (!userVersions) return false;
      return userVersions.some(version => version.fics.some(fic => fic._id === ficId));
    });

    if (authorizedFrames.length === 0) {
      const originalFrame = frames[0] || { [request]: request, [user]: user, [ficId]: ficId };
      return new Frames({ ...originalFrame, [authError]: "User not authorized to delete this fic's categorization." });
    }

    return authorizedFrames;
  },
  then: actions(
    // 1. If authorization failed, respond immediately with the authorization error.
    [
      Requesting.respond,
      { request, error: authError },
      { only: authError },
    ],
    // 2. If authorized, delete the fic category.
    [
      Categorizing.deleteFicCategory,
      { ficId },
      { ficCategoryId, error: deleteError }, // Bind deletion error
      { unless: authError },
    ],
    // 3. Respond to the original request (success).
    [
      Requesting.respond,
      { request, ficCategoryId },
      { unless: authError, unless: deleteError },
    ],
    // 4. Respond to the original request (error from deletion).
    [
      Requesting.respond,
      { request, error: deleteError },
      { unless: authError, only: deleteError },
    ],
  ),
});

/**
 * Sync: DeleteAllFicCategoriesRequest
 * Purpose: Handles requests to delete multiple fic categorizations.
 * Assumes the `user` in the request is implicitly authorized for this admin-like operation.
 * `ficIds` must be provided in the request payload.
 */
export const DeleteAllFicCategoriesRequest: Sync = (
  { request, user, ficIds, deletedCount, requestError, deleteError },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Categorizing/deleteFicCategories", user, ficIds }, // `user` for implicit authorization/logging
    { request },
  ]),
  where: async (frames) => {
    // Basic validation for ficIds in the request.
    return frames.flatMap(($) => {
      if (!Array.isArray($[ficIds]) || $[ficIds].length === 0) {
        return new Frames({ ...$, [requestError]: "Missing or invalid 'ficIds' array in request body." });
      }
      return new Frames($);
    });
  },
  then: actions(
    // 1. If request was invalid, respond immediately.
    [
      Requesting.respond,
      { request, error: requestError },
      { only: requestError },
    ],
    // 2. If valid, trigger mass deletion.
    [
      Categorizing.deleteFicCategories,
      { ficIds },
      { deletedCount, error: deleteError }, // Bind deletion error
      { unless: requestError }, // Only if request was valid
    ],
    // 3. Respond to the original request (success).
    [
      Requesting.respond,
      { request, deletedCount },
      { unless: requestError, unless: deleteError },
    ],
    // 4. Respond to the original request (error from deletion).
    [
      Requesting.respond,
      { request, error: deleteError },
      { unless: requestError, only: deleteError },
    ],
  ),
});
```

***

### Step 3: Update `src/concepts/Requesting/passthrough.ts`

This file needs to list which routes are included (directly accessible) and which are excluded (handled by syncs).

```typescript
// @filename: src/concepts/Requesting/passthrough.ts
/**
 * Inclusions specify passthrough routes that are intentionally public or handled directly.
 * The value should be a brief justification for why it's included.
 */
export const inclusions = {
  "/api/UserAuthentication/register": "Public endpoint for new user registration.",
  "/api/UserAuthentication/authenticate": "Public endpoint for user login.",
};

/**
 * Exclusions specify routes that should be reified into Requesting.request actions
 * and handled by synchronizations, rather than being passed directly to concepts.
 */
export const exclusions = [
  // UserAuthentication
  "/api/UserAuthentication/deleteUser",

  // Library
  // addUser is an internal cascade from UserAuthentication.register, not a direct API call
  "/api/Library/submitNewFic",
  "/api/Library/submitNewVersionOfFanfic",
  "/api/Library/_viewFic",
  "/api/Library/deleteFic",
  // deleteFicsAndUser is an internal cascade from UserAuthentication.deleteUser
  "/api/Library/_getVersion",
  "/api/Library/deleteVersion",

  // Categorizing
  // categorizeFic is an internal cascade from Library actions
  "/api/Categorizing/_viewFicCategory",
  "/api/Categorizing/deleteFicCategory",
  "/api/Categorizing/deleteFicCategories", // Admin-like action
];
```
