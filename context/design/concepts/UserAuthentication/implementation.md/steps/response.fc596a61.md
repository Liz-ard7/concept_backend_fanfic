---
timestamp: 'Sun Oct 12 2025 21:43:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_214324.c5e8e4d8.md]]'
content_id: fc596a614061e47ecca3d930244ace09049ee144340cae5e4a94ed4bad38c1ff
---

# response:

```typescript
// file: src/UserAuthentication/UserAuthenticationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * @concept UserAuthentication
 * @purpose limit access to stories to known users
 * @principle after a user registers with a username and a password,
 * they can authenticate with that same username and password
 * and be treated each time as the same user
 */
export default class UserAuthenticationConcept {
  // Declare collection prefix, use concept name
  static readonly PREFIX = "UserAuthentication" + ".";

  /**
   * Represents a User entity in the system.
   *
   * a set of Users with
   *   a username
   *   a password
   */
  users: Collection<User>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(UserAuthenticationConcept.PREFIX + "users");
  }

  /**
   * Registers a new user with a unique username and password.
   *
   * @action register
   * @requires the username does not exist
   * @effects creates a new User with the username username and password password,
   * adds it to the set of Users, then returns its ID.
   *
   * @param {string} username - The desired username.
   * @param {string} password - The desired password.
   * @returns {{ user: User } | { error: string }} The ID of the newly registered user, or an error message if the username already exists.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check if the username already exists
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already exists." };
    }

    const newUser: User = {
      _id: freshID() as User, // Override _id with a fresh ID
      username,
      password,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * Authenticates a user with a given username and password.
   *
   * @action authenticate
   * @requires the username to exist in the set of Users and for said user
   * to have a matching username and password
   * @effects returns the User associated with the username and password.
   *
   * @param {string} username - The username to authenticate.
   * @param {string} password - The password to authenticate.
   * @returns {{ user: User } | { error: string }} The ID of the authenticated user, or an error message if credentials are invalid.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const foundUser = await this.users.findOne({ username, password });
    if (!foundUser) {
      return { error: "Invalid username or password." };
    }
    return { user: foundUser._id };
  }

  /**
   * Deletes a user from the system.
   *
   * @action deleteUser
   * @requires the username and the password must match for a user in the set of Users
   * @effects finds the user that matches with the username and password,
   * removes the user from the set of Users and returns its ID.
   *
   * @param {string} username - The username of the user to delete.
   * @param {string} password - The password of the user to delete.
   * @returns {{ user: User } | { error: string }} The ID of the deleted user, or an error message if credentials are invalid.
   */
  async deleteUser(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const foundUser = await this.users.findOne({ username, password });
    if (!foundUser) {
      return { error: "Invalid username or password." };
    }

    await this.users.deleteOne({ _id: foundUser._id });
    return { user: foundUser._id };
  }

  /**
   * Finds a user by their ID.
   * @query _findUserById
   * @param {User} userId - The ID of the user to find.
   * @returns {{ user: UserDocument | null }} The user document, or null if not found.
   */
  async _findUserById(
    { userId }: { userId: User },
  ): Promise<{ user: UserDocument | null }> {
    const user = await this.users.findOne({ _id: userId });
    return { user };
  }
}

// Generic types for this concept
// User is an ID because it's created externally (concept creates its ID)
// and it's treated polymorphically by the concept.
type User = ID;

/**
 * Interface for the user document stored in MongoDB.
 * The _id field is branded as 'User' to ensure type safety.
 */
interface UserDocument {
  _id: User;
  username: string;
  password: string;
}
```
