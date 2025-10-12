---
timestamp: 'Sun Oct 12 2025 15:56:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_155619.07e2674b.md]]'
content_id: 09f1389612ae3ac43ab9eeb897c7a8ef0c22e236b322020495b15ed6b3e81f8c
---

# response:

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
  authorTags: string[]; // Set of strings
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
 * @description Concept to contain a user's story (associated with a name, a text, and a set of authorTags) in an orderly list.
 *
 * @purpose to contain a user's story (associated with a name, a text, and a set of authorTags) in an orderly list.
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
   * @param {string[]} authorTags An array of tags provided by the author.
   * @param {DateSpec} date The publication date of the fic.
   * @returns {{ fic: Fic } | { error: string }} The newly created fic object on success, or an error object.
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
      authorTags: string[];
      date: DateSpec;
    },
  ): Promise<{ fic: Fic } | { error: string }> {
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
      title: ficName,
      fics: [newFic],
    };

    await this.users.updateOne(
      { _id: user },
      { $push: { versions: newVersion } },
    );

    return { fic: newFic };
  }

  /**
   * @action submitNewVersionOfFanfic
   * @description Submits a new revision for an existing story (version).
   * @param {User} user The ID of the user submitting the new version.
   * @param {string} ficText The updated body text of the fic.
   * @param {string[]} authorTags An updated array of tags for the fic.
   * @param {string} versionTitle The title of the story to update.
   * @param {DateSpec} date The publication date of this new version.
   * @param {string} ficName The name/title of the fic (should match versionTitle).
   * @returns {{ version: Version } | { error: string }} The updated version object on success, or an error object.
   *
   * @requires user must exist in set of Users, versionTitle must exist within the user's set of Versions.
   * @effects create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags.
   *          Then, add the Fic to the version within the user's set of Versions. Finally, return the Version.
   */
  async submitNewVersionOfFanfic(
    { user, ficText, authorTags, versionTitle, date, ficName }: {
      user: User;
      ficText: string;
      authorTags: string[];
      versionTitle: string;
      date: DateSpec;
      ficName: string; // Should match versionTitle
    },
  ): Promise<{ version: Version } | { error: string }> {
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
      _id: freshID(),
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

    return { version: updatedVersion };
  }

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
  async viewFic(
    { user, ficName, versionNumber }: {
      user: User;
      ficName: string;
      versionNumber: number;
    },
  ): Promise<{ fic: Fic } | { error: string }> {
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

    return { fic: fic };
  }

  /**
   * @action deleteFic
   * @description Deletes a specific revision of a story for a user.
   * @param {User} user The ID of the user.
   * @param {string} ficName The title of the story.
   * @param {number} versionNumber The specific revision number to delete.
   * @returns {{ fic: Fic } | { error: string }} The deleted fic object on success, or an error object.
   *
   * @requires the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.
   * @effects removes the fic corresponding to the user's ficName and versionNumber from the user's set of Versions, then returns the fic.
   */
  async deleteFic(
    { user, ficName, versionNumber }: {
      user: User;
      ficName: string;
      versionNumber: number;
    },
  ): Promise<{ fic: Fic } | { error: string }> {
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

    return { fic: ficToDelete };
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
   * @action findFicWithDate
   * @description Finds all fic revisions for a user that match a specific date.
   * @param {User} user The ID of the user.
   * @param {DateSpec} date The date to search for.
   * @returns {{ fics: Fic[] } | { error: string }} An array of matching fic objects on success, or an error object.
   *
   * @requires user must exist in set of Users
   * @effects returns a set of Fics with dates matching the provided date. If there are no such fics, it returns an empty set.
   */
  async findFicWithDate(
    { user, date }: { user: User; date: DateSpec },
  ): Promise<{ fics: Fic[] } | { error: string }> {
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
    return { fics: matchingFics };
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
  async getVersion(
    { user, versionTitle }: { user: User; versionTitle: string },
  ): Promise<{ version: Version } | { error: string }> {
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
    return { version: version };
  }

  /**
   * @action deleteVersion
   * @description Deletes an entire story version (and all its fic revisions) for a user.
   * @param {User} user The ID of the user.
   * @param {string} ficTitle The title of the story version to delete.
   * @returns {{ version: Version } | { error: string }} The deleted version object on success, or an error object.
   *
   * @requires the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users.
   * @effects removes the version associated with ficTitle as the title from the user's set of Versions, then returns the version.
   */
  async deleteVersion(
    { user, ficTitle }: { user: User; ficTitle: string },
  ): Promise<{ version: Version } | { error: string }> {
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

    return { version: versionToDelete };
  }

  /**
   * @query _getAllUserVersions
   * @description Retrieves all story versions for a given user.
   * @param {User} user The ID of the user.
   * @returns {{ versions: Version[] } | { error: string }} An array of version objects on success, or an error object.
   */
  async _getAllUserVersions(
    { user }: { user: User },
  ): Promise<{ versions: Version[] } | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }
    return { versions: userDoc.versions };
  }
}
```

Testing concepts. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

1. Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
2. Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
3. Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
4. No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
5. Saving test execution output. Save the test execution output by copy-pasting from the console to a markdown file.

Remember: Property 'fic' does not exist on type '{ fic: Fic; } | { error: string; }'.
Property 'fic' does not exist on type '{ error: string; }' so you cannot do
const submitFic1Result = await concept.submitNewFic({
user: userAlice,
ficName: fic1Name,
ficText: fic1Text,
authorTags: fic1Tags,
date: date1,
});
followed by assertExists(submitFic1Result.fic, "submitFic1Result should return a fic");
