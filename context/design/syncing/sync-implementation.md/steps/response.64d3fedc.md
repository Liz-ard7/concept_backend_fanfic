---
timestamp: 'Fri Nov 07 2025 22:28:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_222848.d807dcd3.md]]'
content_id: 64d3fedc35a072b647a8a5dfb8be8b46ddf018ae5a1de43f9b0d1e6c13f22057
---

# response:

Here are the implementations for the excluded actions and queries as TypeScript synchronizations (`.sync.ts` files), along with the necessary concept files to define their structure and basic behavior.

First, let's establish the concept files themselves. These will reside in `src/concepts/{ConceptName}/{ConceptName}Concept.ts`.

***

### File: `src/concepts/Sessioning/SessioningConcept.ts`

This concept is essential for handling user sessions and linking requests to authenticated users.

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Sessioning" + ".";

type User = ID;
type Session = ID;

interface Sessions {
  _id: Session;
  user: User;
  createdAt: Date;
  expiresAt: Date;
}

export default class SessioningConcept {
  sessions: Collection<Sessions>;
  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * createSession (user: User): (session: Session) | (error: String)
   *
   * **requires** user exists (this check would typically be done by an external sync using UserAuthentication)
   *
   * **effects** creates a new session for the user, returns session ID
   */
  async createSession({ user }: { user: User }): Promise<{ session: Session } | { error: string }> {
    const newSessionId = freshID();
    const now = new Date();
    const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours validity
    try {
      await this.sessions.insertOne({ _id: newSessionId, user, createdAt: now, expiresAt: expires });
      return { session: newSessionId };
    } catch (e: any) {
      return { error: `Failed to create session: ${e.message}` };
    }
  }

  /**
   * _getUser (session: Session): (user: User)[]
   *
   * **requires** session exists and is not expired
   *
   * **effects** returns the user associated with the session
   */
  async _getUser({ session }: { session: Session }): Promise<{ user: User }[]> {
    const sessionDoc = await this.sessions.findOne({ _id: session, expiresAt: { $gt: new Date() } });
    if (sessionDoc) {
      return [{ user: sessionDoc.user }];
    }
    return []; // No user if session not found or expired
  }

  /**
   * deleteSession (session: Session): (session: Session) | (error: String)
   *
   * **requires** session exists
   *
   * **effects** deletes the session
   */
  async deleteSession({ session }: { session: Session }): Promise<{ session: Session } | { error: string }> {
    const result = await this.sessions.deleteOne({ _id: session });
    if (result.deletedCount === 1) {
      return { session };
    }
    return { error: "Session not found or already deleted." };
  }

  /**
   * _getSessionsByUser (user: User): (session: Session)[]
   *
   * **requires** user exists
   *
   * **effects** returns all active session IDs for a user
   */
  async _getSessionsByUser({ user }: { user: User }): Promise<{ session: Session }[]> {
    const sessions = await this.sessions.find({ user, expiresAt: { $gt: new Date() } }).toArray();
    return sessions.map(s => ({ session: s._id }));
  }
}
```

***

### File: `src/concepts/UserAuthentication/UserAuthenticationConcept.ts`

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "UserAuthentication" + ".";

type User = ID;

interface Users {
  _id: User;
  username: string;
  password: string; // In a real app, this should be hashed!
}

export default class UserAuthenticationConcept {
  users: Collection<Users>;
  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * register (username: String, password: String): (user: User) | (error: String)
   *
   * **requires** the username does not exist
   *
   * **effects** creates a new User with the username username and password password, adds it to the set of Users, then returns it
   */
  async register({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }
    const newUser: Users = {
      _id: freshID(),
      username,
      password, // In reality, hash this!
    };
    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * authenticate (username: String, password: String): (user: User) | (error: String)
   *
   * **requires** requires the username to exist in the set of Users and for said user to have a matching username and password
   *
   * **effects** returns the User associated with the username and password
   */
  async authenticate({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username, password }); // Compare plain passwords for this example
    if (user) {
      return { user: user._id };
    }
    return { error: "Invalid username or password." };
  }

  /**
   * deleteUser (username: String, password: String): (user: User) | (error: String)
   *
   * **requires** the username and the password must match for a user in the set of Users
   *
   * **effects** finds the user that matches with the username and password removes the user from the set of Users and returns it
   */
  async deleteUser({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const userToDelete = await this.users.findOne({ username, password });
    if (!userToDelete) {
      return { error: "User not found or credentials do not match." };
    }
    const result = await this.users.deleteOne({ _id: userToDelete._id });
    if (result.deletedCount === 1) {
      return { user: userToDelete._id };
    }
    return { error: "Failed to delete user." };
  }

  /**
   * _getUserByUsername (username: String): (user: User)[]
   *
   * **requires** username exists
   *
   * **effects** returns user ID
   */
  async _getUserByUsername({ username }: { username: string }): Promise<{ user: User }[]> {
    const user = await this.users.findOne({ username });
    if (user) {
      return [{ user: user._id }];
    }
    return [];
  }
}
```

***

### File: `src/concepts/Library/LibraryConcept.ts`

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Library" + ".";

type User = ID;
type Version = ID;
type Fic = ID;
type DateType = { day: number; month: number; year: number };

interface Fics {
  _id: Fic;
  name: string;
  text: string;
  authorTags: string; // Stored as a string, perhaps comma-separated or JSON string
  date: DateType;
  versionNumber: number;
  versionId: Version; // Link back to its version
}

interface Versions {
  _id: Version;
  title: string;
  fics: Fic[]; // Array of fic IDs
  owner: User; // The user who owns this version
}

interface UsersWithVersions {
  _id: User;
  versions: Version[]; // Array of version IDs
}

export default class LibraryConcept {
  usersWithVersions: Collection<UsersWithVersions>;
  versions: Collection<Versions>;
  fics: Collection<Fics>;

  constructor(private readonly db: Db) {
    this.usersWithVersions = this.db.collection(PREFIX + "usersWithVersions");
    this.versions = this.db.collection(PREFIX + "versions");
    this.fics = this.db.collection(PREFIX + "fics");
  }

  /**
   * addUser (user: User): Empty | (error: String)
   *
   * **requires** the user to not exist in the set of Users
   *
   * **effect** adds user to set of Users, associates user with empty set of Versions with an empty set of Fics.
   */
  async addUser({ user }: { user: User }): Promise<Empty | { error: string }> {
    const existingUser = await this.usersWithVersions.findOne({ _id: user });
    if (existingUser) {
      return { error: `User '${user}' already has a library entry.` };
    }
    await this.usersWithVersions.insertOne({ _id: user, versions: [] });
    return {};
  }

  /**
   * submitNewFic (user: User, ficText: string, ficName: string, authorTags: String, date: DateType) : (fic: Fic) | (error: String)
   *
   * **requires** the ficName to not exist within the set of the user's Versions' Title. user must exist in set of Users
   *
   * **effect** create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as 0, and authorTags as the set of authorTags. Create a new Version with ficName as the Title, add the Fic to the new version's set of Fics. Finally, add the new version to the user's set of Versions, and finally return the fic.
   */
  async submitNewFic(
    { user, ficText, ficName, authorTags, date }: {
      user: User;
      ficText: string;
      ficName: string;
      authorTags: string;
      date: DateType;
    },
  ): Promise<{ fic: Fic } | { error: string }> {
    const userEntry = await this.usersWithVersions.findOne({ _id: user });
    if (!userEntry) {
      return { error: `User '${user}' not found in Library concept.` };
    }

    const existingVersion = await this.versions.findOne({ owner: user, title: ficName });
    if (existingVersion) {
      return { error: `Fic with name '${ficName}' already exists for user '${user}'.` };
    }

    const newVersionId = freshID();
    const newFicId = freshID();

    const newFic: Fics = {
      _id: newFicId,
      name: ficName,
      text: ficText,
      authorTags: authorTags,
      date: date,
      versionNumber: 0,
      versionId: newVersionId,
    };
    await this.fics.insertOne(newFic);

    const newVersion: Versions = {
      _id: newVersionId,
      title: ficName,
      fics: [newFicId],
      owner: user,
    };
    await this.versions.insertOne(newVersion);

    await this.usersWithVersions.updateOne(
      { _id: user },
      { $push: { versions: newVersionId } },
    );

    return { fic: newFicId };
  }

  /**
   * submitNewVersionOfFanfic (user: User, ficText: string, authorTags: string, versionId: Version, date: DateType, ficName: string) : (version: Version, fic: Fic) | (error: String)
   *
   * **requires** user must exist in set of Users, versionId must exist within the user's set of Versions
   *
   * **effect** create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags. Then, add the Fic to the version within the user's set of Versions. Finally, return the Version AND the new Fic.
   */
  async submitNewVersionOfFanfic(
    { user, ficText, authorTags, versionId, date, ficName }: {
      user: User;
      ficText: string;
      authorTags: string;
      versionId: Version;
      date: DateType;
      ficName: string;
    },
  ): Promise<{ version: Version; fic: Fic } | { error: string }> {
    const userEntry = await this.usersWithVersions.findOne({ _id: user });
    if (!userEntry) {
      return { error: `User '${user}' not found in Library concept.` };
    }

    const version = await this.versions.findOne({ _id: versionId, owner: user });
    if (!version) {
      return { error: `Version '${versionId}' not found for user '${user}'.` };
    }

    const newFicId = freshID();
    const newVersionNumber = version.fics.length + 1;

    const newFic: Fics = {
      _id: newFicId,
      name: ficName,
      text: ficText,
      authorTags: authorTags,
      date: date,
      versionNumber: newVersionNumber,
      versionId: versionId,
    };
    await this.fics.insertOne(newFic);

    await this.versions.updateOne(
      { _id: versionId },
      { $push: { fics: newFicId } },
    );

    return { version: versionId, fic: newFicId };
  }

  /**
   * _viewFic (user: User, ficName: string, versionNumber: Number): (fic: Fics)[] | (error: String)
   *
   * **requires** the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.
   *
   * **effect** displays the fic's contents corresponding to the user's Version's ficName as Title and versionNumber from the user's Version's set of Fics, then returns the fic.
   */
  async _viewFic(
    { user, ficName, versionNumber }: { user: User; ficName: string; versionNumber: number },
  ): Promise<{ fic: Fics }[] | { error: string }> {
    const version = await this.versions.findOne({ owner: user, title: ficName });
    if (!version) {
      return { error: `Version with title '${ficName}' not found for user '${user}'.` };
    }

    const fic = await this.fics.findOne({ versionId: version._id, versionNumber: versionNumber });
    if (!fic) {
      return { error: `Fic with version number '${versionNumber}' not found for version '${ficName}'.` };
    }

    return [{ fic }];
  }

  /**
   * deleteFic (user: User, ficName: string, versionNumber: Number): (fic: Fic) | (error: String)
   *
   * **requires** the ficName to exist within the set of the user's Fic's Names. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.
   *
   * **effect** removes the fic corresponding to the user's ficName and versionNumber from the user's set of Versions, then returns the fic.
   */
  async deleteFic(
    { user, ficName, versionNumber }: { user: User; ficName: string; versionNumber: number },
  ): Promise<{ fic: Fic } | { error: string }> {
    const version = await this.versions.findOne({ owner: user, title: ficName });
    if (!version) {
      return { error: `Version with title '${ficName}' not found for user '${user}'.` };
    }

    const ficToDelete = await this.fics.findOne({ versionId: version._id, versionNumber: versionNumber });
    if (!ficToDelete) {
      return { error: `Fic with version number '${versionNumber}' not found for version '${ficName}'.` };
    }

    await this.fics.deleteOne({ _id: ficToDelete._id });
    await this.versions.updateOne(
      { _id: version._id },
      { $pull: { fics: ficToDelete._id } },
    );

    return { fic: ficToDelete._id };
  }

  /**
   * deleteFicsAndUser (user: User): Empty | (error: String)
   *
   * **requires** user must exist in set of Users
   *
   * **effect** removes all versions from the set of user's Versions, then removes user from set of Users.
   */
  async deleteFicsAndUser({ user }: { user: User }): Promise<Empty | { error: string }> {
    const userEntry = await this.usersWithVersions.findOne({ _id: user });
    if (!userEntry) {
      return { error: `User '${user}' not found in Library concept.` };
    }

    // Delete all fics associated with this user's versions
    await this.fics.deleteMany({ versionId: { $in: userEntry.versions } });
    // Delete all versions owned by this user
    await this.versions.deleteMany({ owner: user });
    // Delete the user's entry from the library concept
    await this.usersWithVersions.deleteOne({ _id: user });

    return {};
  }

  /**
   * _getVersion (user: User, versionTitle: string): (version: Versions)[] | (error: String)
   *
   * **requires** user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.
   *
   * **effect** returns the user's version associated with the versionTitle as title.
   */
  async _getVersion(
    { user, versionTitle }: { user: User; versionTitle: string },
  ): Promise<{ version: Versions }[] | { error: string }> {
    const version = await this.versions.findOne({ owner: user, title: versionTitle });
    if (!version) {
      return { error: `Version with title '${versionTitle}' not found for user '${user}'.` };
    }
    return [{ version }];
  }

  /**
   * deleteVersion (user: User, ficTitle: string): (version: Version) | (error: String)
   *
   * **requires** the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users
   *
   * **effect** removes the version associated with ficTitle as the title from the user's set of Versions, then returns the version.
   */
  async deleteVersion(
    { user, ficTitle }: { user: User; ficTitle: string },
  ): Promise<{ version: Version } | { error: string }> {
    const versionToDelete = await this.versions.findOne({ owner: user, title: ficTitle });
    if (!versionToDelete) {
      return { error: `Version with title '${ficTitle}' not found for user '${user}'.` };
    }

    // Delete all fics associated with this version
    await this.fics.deleteMany({ versionId: versionToDelete._id });
    // Remove the version from the user's list
    await this.usersWithVersions.updateOne(
      { _id: user },
      { $pull: { versions: versionToDelete._id } },
    );
    // Delete the version itself
    await this.versions.deleteOne({ _id: versionToDelete._id });

    return { version: versionToDelete._id };
  }

  /**
   * _getFicDetails (fic: Fic): (ficText: String, authorTags: String)[]
   *
   * **requires** fic exists
   *
   * **effects** returns the fic's text and author tags.
   */
  async _getFicDetails({ fic }: { fic: Fic }): Promise<{ ficText: string; authorTags: string }[]> {
    const ficDoc = await this.fics.findOne({ _id: fic });
    if (ficDoc) {
      return [{ ficText: ficDoc.text, authorTags: ficDoc.authorTags }];
    }
    return [];
  }

  /**
   * _getFicOwner (fic: Fic): (owner: User)[]
   *
   * **requires** fic exists
   *
   * **effects** returns the user who owns the fic.
   */
  async _getFicOwner({ fic }: { fic: Fic }): Promise<{ owner: User }[]> {
    const ficDoc = await this.fics.findOne({ _id: fic });
    if (ficDoc) {
      const versionDoc = await this.versions.findOne({ _id: ficDoc.versionId });
      if (versionDoc) {
        return [{ owner: versionDoc.owner }];
      }
    }
    return [];
  }

  /**
   * _getVersionOwnerByTitle (user: User, versionTitle: string): (owner: User)[]
   *
   * **requires** user and versionTitle exist for a version
   *
   * **effects** returns the owner of that version.
   */
  async _getVersionOwnerByTitle({ user, versionTitle }: { user: User; versionTitle: string }): Promise<{ owner: User }[]> {
    const version = await this.versions.findOne({ owner: user, title: versionTitle });
    if (version) {
      return [{ owner: version.owner }];
    }
    return [];
  }

  /**
   * _getFicsInVersion (user: User, versionTitle: string): (fic: Fic)[]
   *
   * **requires** user and versionTitle exist
   *
   * **effects** returns all fic IDs within a given version for a user.
   */
  async _getFicsInVersion({ user, versionTitle }: { user: User; versionTitle: string }): Promise<{ fic: Fic }[]> {
    const version = await this.versions.findOne({ owner: user, title: versionTitle });
    if (version) {
      return version.fics.map(ficId => ({ fic: ficId }));
    }
    return [];
  }
}
```

***

### File: `src/concepts/Categorizing/CategorizingConcept.ts`

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Categorizing" + ".";

type Fic = ID;
type Category = ID;
type Tag = ID;

interface Tags {
  _id: Tag;
  name: string;
  type: string;
  reason: string;
}

interface Categories {
  _id: Category;
  tags: Tag[];
}

interface FicCategories {
  _id: ID; // This ID could be the Fic ID itself, or a new ID linking to Fic
  fic: Fic;
  suggestedTagsCategory: Category;
  tagsToRemoveCategory: Category;
}

export default class CategorizingConcept {
  ficCategories: Collection<FicCategories>;
  categories: Collection<Categories>;
  tags: Collection<Tags>;

  constructor(private readonly db: Db) {
    this.ficCategories = this.db.collection(PREFIX + "ficCategories");
    this.categories = this.db.collection(PREFIX + "categories");
    this.tags = this.db.collection(PREFIX + "tags");
  }

  /**
   * categorizeFic (fic: Fic, ficText: String, authorTags: String) : (suggestedTags: Category, tagsToRemove: Category) | (error: String)
   *
   * **effect** using an LLM, the LLM will examine the fic's ficText's contents, and associates the top 20 most relevant tags (WITHOUT suggesting tags already included in the fic's authorTags) (the tags having a name, type, and reason for why they are being suggested) to the content in a suggestedTags Category to the Fic and (if there is not an FicCategory already associated with fic) creates a new FicCategory out of those and adds the FicCategory to the set of FicCategories, or (if there is a FicCategory associated with the fic) adds the suggestedTags to said ficCategory. Finally, it returns the suggestedTags.
   * Type of tags includes: ArchiveWarning, fandom, character, relationship, freeform, rating, category. using an LLM, the LLM will examine the fic's ficText's contents, then compare it to each authorTag in the foc's set of authorTags. If an authorTag seems inappropriate for the fic, it will add it to a Category of tags to remove (including its name, type, and reason for removal). At the very end, if there is already a ficCategory associated with fic, it will add the tagsToRemove Category to the ficCategory. If not, it'll create a new ficCategory and associate the fic and tagsToRemovewith it, and add it to the set of ficCategories. Finally, it returns the tagsToRemove.
   */
  async categorizeFic(
    { fic, ficText, authorTags }: { fic: Fic; ficText: string; authorTags: string },
  ): Promise<{ suggestedTags: Category; tagsToRemove: Category } | { error: string }> {
    // --- Simulate LLM interaction ---
    const suggestedTagNames = ["Sci-Fi", "Adventure", "Action", "Romance", "Fantasy", "Mystery", "Drama", "Slice of Life"];
    const authorTagList = authorTags.split(',').map(tag => tag.trim());

    const dummySuggestedTags: { name: string; type: string; reason: string }[] = [];
    const dummyTagsToRemove: { name: string; type: string; reason: string }[] = [];

    // Simulate suggesting tags
    for (let i = 0; i < 5; i++) { // Suggest 5 random tags
      const tagName = suggestedTagNames[Math.floor(Math.random() * suggestedTagNames.length)];
      if (!authorTagList.includes(tagName) && !dummySuggestedTags.some(t => t.name === tagName)) {
        dummySuggestedTags.push({
          name: tagName,
          type: "freeform",
          reason: `LLM identified '${tagName}' as relevant to fic content.`,
        });
      }
    }

    // Simulate identifying tags to remove
    if (ficText.includes("Controversial") && authorTagList.includes("Fluff")) {
      dummyTagsToRemove.push({
        name: "Fluff",
        type: "freeform",
        reason: "LLM deemed 'Fluff' contradictory to fic content, which contains 'Controversial' themes.",
      });
    }
    // --- End LLM simulation ---

    const newSuggestedCategory = freshID();
    const newRemoveCategory = freshID();

    // Insert new tags
    const suggestedTagIds: Tag[] = [];
    for (const tagData of dummySuggestedTags) {
      const newTagId = freshID();
      await this.tags.insertOne({ _id: newTagId, ...tagData });
      suggestedTagIds.push(newTagId);
    }

    const removeTagIds: Tag[] = [];
    for (const tagData of dummyTagsToRemove) {
      const newTagId = freshID();
      await this.tags.insertOne({ _id: newTagId, ...tagData });
      removeTagIds.push(newTagId);
    }

    // Insert new categories
    await this.categories.insertOne({ _id: newSuggestedCategory, tags: suggestedTagIds });
    await this.categories.insertOne({ _id: newRemoveCategory, tags: removeTagIds });

    // Update or create FicCategory
    const existingFicCategory = await this.ficCategories.findOne({ fic });
    if (existingFicCategory) {
      await this.ficCategories.updateOne(
        { fic },
        {
          $set: {
            suggestedTagsCategory: newSuggestedCategory,
            tagsToRemoveCategory: newRemoveCategory,
          },
        },
      );
    } else {
      await this.ficCategories.insertOne({
        _id: freshID(), // New ID for the FicCategory document
        fic,
        suggestedTagsCategory: newSuggestedCategory,
        tagsToRemoveCategory: newRemoveCategory,
      });
    }

    return { suggestedTags: newSuggestedCategory, tagsToRemove: newRemoveCategory };
  }

  /**
   * _viewFicCategory (fic: Fic): (ficCategory: FicCategories)[] | (error: String)
   *
   * **requires** the fic to be associated with a ficCategory in the set of ficCategories
   *
   * **effect** returns the ficCategory.
   */
  async _viewFicCategory({ fic }: { fic: Fic }): Promise<{ ficCategory: FicCategories }[] | { error: string }> {
    const ficCategory = await this.ficCategories.findOne({ fic });
    if (!ficCategory) {
      return { error: `FicCategory for fic '${fic}' not found.` };
    }
    return [{ ficCategory }];
  }

  /**
   * deleteFicCategory (fic: Fic): (ficCategory: ID) | (error: String)
   *
   * **requires** the fic to be associated with a ficCategory in the set of ficCategories
   *
   * **effect** removes the ficCategory associated with the fic from the set of FicCategories.
   */
  async deleteFicCategory({ fic }: { fic: Fic }): Promise<{ ficCategory: ID } | { error: string }> {
    const ficCategoryToDelete = await this.ficCategories.findOne({ fic });
    if (!ficCategoryToDelete) {
      return { error: `FicCategory for fic '${fic}' not found.` };
    }

    // Delete associated categories and tags as well
    if (ficCategoryToDelete.suggestedTagsCategory) {
      const suggestedCategory = await this.categories.findOne({ _id: ficCategoryToDelete.suggestedTagsCategory });
      if (suggestedCategory) {
        await this.tags.deleteMany({ _id: { $in: suggestedCategory.tags } });
        await this.categories.deleteOne({ _id: suggestedCategory._id });
      }
    }
    if (ficCategoryToDelete.tagsToRemoveCategory) {
      const removeCategory = await this.categories.findOne({ _id: ficCategoryToDelete.tagsToRemoveCategory });
      if (removeCategory) {
        await this.tags.deleteMany({ _id: { $in: removeCategory.tags } });
        await this.categories.deleteOne({ _id: removeCategory._id });
      }
    }

    await this.ficCategories.deleteOne({ _id: ficCategoryToDelete._id });
    return { ficCategory: ficCategoryToDelete._id };
  }

  /**
   * deleteFicCategories (): (deletedCount: Number) | (error: String)
   *
   * **requires** all ficCategories to exist within the set of FicCategories. (Implicitly means at least one exists)
   *
   * **effect** runs deleteFicCategory on all ficCategories in the set of ficCategories. Returns number of ficCats deleted
   */
  async deleteFicCategories(): Promise<{ deletedCount: number } | { error: string }> {
    const allFicCategories = await this.ficCategories.find().toArray();
    let count = 0;
    for (const ficCategory of allFicCategories) {
      const result = await this.deleteFicCategory({ fic: ficCategory.fic }); // Re-use individual deletion logic
      if ("ficCategory" in result) { // Check for success
        count++;
      } else {
        console.error(`Failed to delete fic category for fic ${ficCategory.fic}: ${result.error}`);
      }
    }
    return { deletedCount: count };
  }
}
```

***

Now for the synchronizations (`.sync.ts` files).

### File: `src/syncs/user_auth.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Requesting, Library, Sessioning } from "@concepts";

// 1. Handle incoming request to delete user
export const HandleDeleteUserRequest: Sync = ({ request, username, password, authenticatedUser, errorMessage }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteUser", username, password },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    // Attempt to authenticate the user to ensure credentials are correct.
    // If successful, 'authenticatedUser' is bound. If error, 'errorMessage' is bound.
    frames = await frames.query(
      UserAuthentication.authenticate,
      { username, password },
      { user: authenticatedUser, error: errorMessage },
    );

    // If authentication failed (no frames or error present), propagate the error
    if (frames.length === 0 || frames[0][errorMessage]) {
      return new Frames({ ...originalRequestFrame, error: frames[0][errorMessage] || "Authentication failed." });
    }
    return frames; // Propagate frames (which contains the authenticatedUser)
  },
  then: actions(
    // These actions will only fire if 'authenticatedUser' was successfully bound in the 'where' clause,
    // meaning authentication succeeded and 'errorMessage' is not present.
    [UserAuthentication.deleteUser, { username, password }, { user: authenticatedUser }], // Trigger actual user deletion
    [Library.deleteFicsAndUser, { user: authenticatedUser }], // Cascade deletion to Library
    // A separate sync (DeleteUserSessionsOnUserDelete) will handle session cleanup
  ),
});

// Sync to clean up user sessions after UserAuthentication.deleteUser
export const DeleteUserSessionsOnUserDelete: Sync = ({ deletedUserId, session }) => ({
  when: actions(
    [UserAuthentication.deleteUser, {}, { user: deletedUserId }],
  ),
  where: async (frames) => {
    // Get all active sessions for the user being deleted
    frames = await frames.query(Sessioning._getSessionsByUser, { user: deletedUserId }, { session });
    return frames;
  },
  then: actions(
    [Sessioning.deleteSession, { session }],
  ),
});

// 2. Respond to successful user deletion
export const RespondToDeleteUserSuccess: Sync = ({ request, deletedUserId }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
    [UserAuthentication.deleteUser, {}, { user: deletedUserId }], // Match successful deletion output
  ),
  then: actions([
    Requesting.respond, { request, user: deletedUserId }, // Respond with the ID of the deleted user
  ]),
});

// 3. Respond to user deletion errors (either auth failure or the deletion itself)
export const RespondToDeleteUserError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
    // Catch errors originating from the authentication check in HandleDeleteUserRequest's where clause
    [UserAuthentication.authenticate, {}, { error: errorMessage }],
    // Catch errors originating from the UserAuthentication.deleteUser concept action
    [UserAuthentication.deleteUser, {}, { error: errorMessage }],
  ),
  // Filter ensures we only respond if an error was actually bound
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([
    Requesting.respond, { request, error: errorMessage },
  ]),
});
```

***

### File: `src/syncs/library.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, UserAuthentication, Library, Sessioning, Categorizing } from "@concepts";

// Helper for authentication and error propagation
const authorizeUser = async (
  frames: Frames,
  requestVar: symbol, // The symbol bound to the original request ID
  sessionVar: symbol,
  userVar: symbol,
) => {
  const originalRequestFrame = frames[0];
  frames = await frames.query(Sessioning._getUser, { session: sessionVar }, { user: userVar, error: 'auth_error' });
  if (frames.length === 0 || frames[0]['auth_error']) {
    return new Frames({ ...originalRequestFrame, error: frames[0]['auth_error'] || "Authentication required or session expired" });
  }
  return frames;
};


// --- Library.addUser ---
// This action is exclusively internally triggered by UserAuthentication.register, not a direct API request.
export const InitializeUserLibrary: Sync = ({ newUser }) => ({
  when: actions([
    UserAuthentication.register, {}, { user: newUser } // When a user is successfully registered
  ]),
  then: actions([
    Library.addUser, { user: newUser } // Initialize their library
  ]),
});


// --- Library.submitNewFic ---
export const SubmitNewFicRequest: Sync = (
  { request, session, ficText, ficName, authorTags, date, user, fic, errorMessage }
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/submitNewFic", session, ficText, ficName, authorTags, date },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user);
    if (frames[0] && frames[0][errorMessage]) return frames; // Propagate error if auth failed
    return frames;
  },
  then: actions(
    [Library.submitNewFic, { user, ficText, ficName, authorTags, date }, { fic }],
    [Categorizing.categorizeFic, { fic, ficText, authorTags }], // Trigger categorization
  ),
});

export const SubmitNewFicResponseSuccess: Sync = ({ request, fic }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Library.submitNewFic, {}, { fic }],
  ),
  then: actions([Requesting.respond, { request, fic }]),
});

export const SubmitNewFicResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }], // Catch auth errors
    [Library.submitNewFic, {}, { error: errorMessage }], // Catch concept action errors
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});


// --- Library.submitNewVersionOfFanfic ---
export const SubmitNewVersionOfFanficRequest: Sync = (
  { request, session, ficText, authorTags, versionId, date, ficName, user, newVersion, fic, errorMessage }
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/submitNewVersionOfFanfic", session, ficText, authorTags, versionId, date, ficName },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    // Check ownership of the version being updated
    let ownerFrames = await frames.query(Library._getVersionOwnerByTitle, { user, versionTitle: ficName }, { owner: 'version_owner' });
    ownerFrames = ownerFrames.filter(($) => $[user] === $['version_owner']);
    if (ownerFrames.length === 0) {
      return new Frames({ ...frames[0], error: "Unauthorized: You do not own this version." });
    }
    return ownerFrames;
  },
  then: actions(
    [Library.submitNewVersionOfFanfic, { user, ficText, authorTags, versionId, date, ficName }, { version: newVersion, fic }],
    [Categorizing.categorizeFic, { fic, ficText, authorTags }], // Re-categorize the fic
  ),
});

export const SubmitNewVersionOfFanficResponseSuccess: Sync = ({ request, newVersion, fic }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { version: newVersion, fic }],
  ),
  then: actions([Requesting.respond, { request, version: newVersion, fic }]),
});

export const SubmitNewVersionOfFanficResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Library._getVersionOwnerByTitle, {}, { error: errorMessage }], // Catch owner check errors
    [Library.submitNewVersionOfFanfic, {}, { error: errorMessage }],
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});


// --- Library._viewFic ---
export const ViewFicRequest: Sync = (
  { request, session, ficName, versionNumber, user, fic, errorMessage }
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/_viewFic", session, ficName, versionNumber },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    // Check ownership of the version containing the fic
    let ownerFrames = await frames.query(Library._getVersionOwnerByTitle, { user, versionTitle: ficName }, { owner: 'version_owner' });
    ownerFrames = ownerFrames.filter(($) => $[user] === $['version_owner']);
    if (ownerFrames.length === 0) {
      return new Frames({ ...frames[0], error: "Unauthorized: You do not own the version containing this fic." });
    }
    return ownerFrames;
  },
  then: actions([
    Library._viewFic, { user, ficName, versionNumber }, { fic }
  ]),
});

export const ViewFicResponseSuccess: Sync = ({ request, fic }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic" }, { request }],
    [Library._viewFic, {}, { fic }],
  ),
  then: actions([Requesting.respond, { request, fic }]),
});

export const ViewFicResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Library._getVersionOwnerByTitle, {}, { error: errorMessage }], // Catch owner check errors
    [Library._viewFic, {}, { error: errorMessage }],
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});


// --- Library.deleteFic ---
export const DeleteFicRequest: Sync = (
  { request, session, ficName, versionNumber, user, fic, errorMessage }
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/deleteFic", session, ficName, versionNumber },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    // Check ownership of the version containing the fic
    let ownerFrames = await frames.query(Library._getVersionOwnerByTitle, { user, versionTitle: ficName }, { owner: 'version_owner' });
    ownerFrames = ownerFrames.filter(($) => $[user] === $['version_owner']);
    if (ownerFrames.length === 0) {
      return new Frames({ ...frames[0], error: "Unauthorized: You do not own the version containing this fic." });
    }
    return ownerFrames;
  },
  then: actions(
    [Library.deleteFic, { user, ficName, versionNumber }, { fic }],
    [Categorizing.deleteFicCategory, { fic }], // Cascade deletion to Categorizing
  ),
});

export const DeleteFicResponseSuccess: Sync = ({ request, fic }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
    [Library.deleteFic, {}, { fic }],
  ),
  then: actions([Requesting.respond, { request, fic }]),
});

export const DeleteFicResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Library._getVersionOwnerByTitle, {}, { error: errorMessage }],
    [Library.deleteFic, {}, { error: errorMessage }],
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});


// --- Library.deleteFicsAndUser ---
// This is triggered by UserAuthentication.deleteUser, not a direct Requesting.request,
// and is handled in user_auth.sync.ts


// --- Library._getVersion ---
export const GetVersionRequest: Sync = (
  { request, session, versionTitle, user, version, errorMessage }
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/_getVersion", session, versionTitle },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    // Check ownership of the version
    let ownerFrames = await frames.query(Library._getVersionOwnerByTitle, { user, versionTitle }, { owner: 'version_owner' });
    ownerFrames = ownerFrames.filter(($) => $[user] === $['version_owner']);
    if (ownerFrames.length === 0) {
      return new Frames({ ...frames[0], error: "Unauthorized: You do not own this version." });
    }
    return ownerFrames;
  },
  then: actions([
    Library._getVersion, { user, versionTitle }, { version }
  ]),
});

export const GetVersionResponseSuccess: Sync = ({ request, version }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion" }, { request }],
    [Library._getVersion, {}, { version }],
  ),
  then: actions([Requesting.respond, { request, version }]),
});

export const GetVersionResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Library._getVersionOwnerByTitle, {}, { error: errorMessage }],
    [Library._getVersion, {}, { error: errorMessage }],
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});


// --- Library.deleteVersion ---
export const DeleteVersionRequest: Sync = (
  { request, session, ficTitle, user, version, ficId, errorMessage } // ficTitle here refers to versionTitle
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/deleteVersion", session, ficTitle },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    // Check ownership of the version
    let ownerFrames = await frames.query(Library._getVersionOwnerByTitle, { user, versionTitle: ficTitle }, { owner: 'version_owner' });
    ownerFrames = ownerFrames.filter(($) => $[user] === $['version_owner']);
    if (ownerFrames.length === 0) {
      return new Frames({ ...frames[0], error: "Unauthorized: You do not own this version." });
    }

    // Get all fic IDs in the version to cascade delete their categories
    // This query will create multiple frames if there are multiple fics in the version
    frames = await ownerFrames.query(Library._getFicsInVersion, { user, versionTitle: ficTitle }, { fic: ficId });
    // If no fics in version, this will result in 0 frames. It's okay, deleteVersion should still proceed.
    // However, if we want to ensure deleteVersion still fires even if no fics to categorize, we need to handle 0 frames.
    // For now, if no fics, no cascade to Categorizing.deleteFicCategory. Library.deleteVersion will still run.
    return frames;
  },
  then: actions(
    // Calls deleteVersion, which handles deleting internal Fics and the version itself.
    [Library.deleteVersion, { user, ficTitle }, { version }], // This runs once per initial frame
    // This action will fire for EACH ficId bound by _getFicsInVersion, cascading deletion to Categorizing
    [Categorizing.deleteFicCategory, { fic: ficId }], 
  ),
});

export const DeleteVersionResponseSuccess: Sync = ({ request, version }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
    [Library.deleteVersion, {}, { version }],
  ),
  then: actions([Requesting.respond, { request, version }]),
});

export const DeleteVersionResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Library._getVersionOwnerByTitle, {}, { error: errorMessage }],
    [Library.deleteVersion, {}, { error: errorMessage }],
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});
```

***

### File: `src/syncs/categorizing.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Sessioning, Categorizing } from "@concepts";

// Helper for authentication
const authorizeUser = async (
  frames: Frames,
  requestVar: symbol,
  sessionVar: symbol,
  userVar: symbol,
) => {
  const originalRequestFrame = frames[0];
  frames = await frames.query(Sessioning._getUser, { session: sessionVar }, { user: userVar, error: 'auth_error' });
  if (frames.length === 0 || frames[0]['auth_error']) {
    return new Frames({ ...originalRequestFrame, error: frames[0]['auth_error'] || "Authentication required or session expired" });
  }
  return frames;
};

// Helper for resource ownership check
const checkFicOwnership = async (
  frames: Frames,
  requestVar: symbol,
  userVar: symbol,
  ficVar: symbol,
) => {
  const originalRequestFrame = frames[0];
  // Get the fic owner via Library query
  let ownerFrames = await frames.query(Library._getFicOwner, { fic: ficVar }, { owner: 'fic_owner' });
  ownerFrames = ownerFrames.filter(($) => $[userVar] === $['fic_owner']); // Filter to ensure authenticated user is the owner

  if (ownerFrames.length === 0) {
    return new Frames({ ...originalRequestFrame, error: "Unauthorized: You do not own this fic." });
  }
  return ownerFrames;
};


// --- Categorizing.categorizeFic (triggered by Library.submitNewFic / Library.submitNewVersionOfFanfic) ---
// This sync is not directly tied to a Requesting.request.
export const TriggerFicCategorization: Sync = (
  { fic, ficText, authorTags, suggestedTags, tagsToRemove }
) => ({
  when: actions(
    [Library.submitNewFic, {}, { fic, ficText, authorTags }], // When a new fic is created (includes text and tags)
    // When a new version is created (assuming it returns fic, ficText, authorTags)
    [Library.submitNewVersionOfFanfic, {}, { fic, ficText, authorTags }], 
  ),
  where: async (frames) => {
    // ficText and authorTags are already bound in the 'when' clause from Library actions.
    // If for some reason they are missing (e.g., Library action spec changed), this filter helps.
    if (!frames[0][ficText] || !frames[0][authorTags]) {
      console.warn(`Categorizing: Cannot categorize fic ${frames[0][fic]}: ficText or authorTags missing.`);
      return new Frames(); // Stop processing if essential details are missing
    }
    return frames;
  },
  then: actions(
    [Categorizing.categorizeFic, { fic, ficText, authorTags }, { suggestedTags, tagsToRemove }],
  ),
});


// --- Categorizing._viewFicCategory ---
export const ViewFicCategoryRequest: Sync = (
  { request, session, fic, user, ficCategory, errorMessage }
) => ({
  when: actions([
    Requesting.request,
    { path: "/Categorizing/_viewFicCategory", session, fic },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    frames = await checkFicOwnership(frames, request, user, fic); // Check ownership
    if (frames[0] && frames[0][errorMessage]) return frames;
    
    return frames;
  },
  then: actions([
    Categorizing._viewFicCategory, { fic }, { ficCategory }
  ]),
});

export const ViewFicCategoryResponseSuccess: Sync = ({ request, ficCategory }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory" }, { request }],
    [Categorizing._viewFicCategory, {}, { ficCategory }],
  ),
  then: actions([Requesting.respond, { request, ficCategory }]),
});

export const ViewFicCategoryResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Library._getFicOwner, {}, { error: errorMessage }], // Catch owner query errors from checkFicOwnership
    [Categorizing._viewFicCategory, {}, { error: errorMessage }], // Catch errors from the concept action
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});


// --- Categorizing.deleteFicCategory ---
export const DeleteFicCategoryRequest: Sync = (
  { request, session, fic, user, deletedFicCategory, errorMessage }
) => ({
  when: actions([
    Requesting.request,
    { path: "/Categorizing/deleteFicCategory", session, fic },
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    frames = await checkFicOwnership(frames, request, user, fic); // Check ownership
    if (frames[0] && frames[0][errorMessage]) return frames;

    return frames;
  },
  then: actions([
    Categorizing.deleteFicCategory, { fic }, { ficCategory: deletedFicCategory }
  ]),
});

// Cascade deletion from Library.deleteFic
export const CascadeDeleteFicCategory: Sync = ({ deletedFicId, deletedFicCategory }) => ({
  when: actions(
    [Library.deleteFic, {}, { fic: deletedFicId }], // When a fic is deleted from Library
  ),
  then: actions([
    Categorizing.deleteFicCategory, { fic: deletedFicId }, { ficCategory: deletedFicCategory }
  ]),
});


export const DeleteFicCategoryResponseSuccess: Sync = ({ request, deletedFicCategory }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/deleteFicCategory" }, { request }],
    [Categorizing.deleteFicCategory, {}, { ficCategory: deletedFicCategory }],
  ),
  then: actions([Requesting.respond, { request, ficCategory: deletedFicCategory }]),
});

export const DeleteFicCategoryResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/deleteFicCategory" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Library._getFicOwner, {}, { error: errorMessage }],
    [Categorizing.deleteFicCategory, {}, { error: errorMessage }],
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});


// --- Categorizing.deleteFicCategories (Admin-only or system-triggered) ---
export const DeleteAllFicCategoriesRequest: Sync = (
  { request, session, user, deletedCount, errorMessage } // Admin session via regular session for simplicity
) => ({
  when: actions([
    Requesting.request,
    { path: "/Categorizing/deleteFicCategories", session }, // Expects a session
    { request },
  ]),
  where: async (frames) => {
    frames = await authorizeUser(frames, request, session, user); // Authenticate user
    if (frames[0] && frames[0][errorMessage]) return frames;

    // TODO: Implement an actual ADMIN role check here using a hypothetical `UserRoles` concept or similar.
    // For now, any authenticated user can trigger this.
    // Example:
    // frames = await frames.query(UserRoles._hasRole, { user, role: "admin" }, { hasRole: 'is_admin' });
    // frames = frames.filter(($) => $['is_admin'] === true);
    // if (frames.length === 0) return new Frames({ ...frames[0], error: "Admin privileges required." });
    
    return frames;
  },
  then: actions([
    Categorizing.deleteFicCategories, {}, { deletedCount }
  ]),
});

export const DeleteAllFicCategoriesResponseSuccess: Sync = ({ request, deletedCount }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/deleteFicCategories" }, { request }],
    [Categorizing.deleteFicCategories, {}, { deletedCount }],
  ),
  then: actions([Requesting.respond, { request, deletedCount }]),
});

export const DeleteAllFicCategoriesResponseError: Sync = ({ request, errorMessage }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/deleteFicCategories" }, { request }],
    [Sessioning._getUser, {}, { error: errorMessage }],
    [Categorizing.deleteFicCategories, {}, { error: errorMessage }],
  ),
  where: async (frames) => frames.filter(($) => $[errorMessage] !== undefined),
  then: actions([Requesting.respond, { request, error: errorMessage }]),
});
```
