---
timestamp: 'Fri Nov 07 2025 23:25:00 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_232500.fdafc945.md]]'
content_id: 8ac824956596d92b26e91cee4cf14b0d65762f10849bfa6ae5563e060cc10c9e
---

# response:

Here's the implementation of the synchronizations based on your concept specifications and the inclusion/exclusion decisions, carefully adhering to the constraints provided.

We'll create three `.sync.ts` files under `src/syncs/`:

1. `authentication.sync.ts`: Handles `UserAuthentication.deleteUser` and the cascade to `Library.addUser` on registration.
2. `library.sync.ts`: Handles all `Library` actions and their cascades to `Categorizing`.
3. `categorization.sync.ts`: Handles the direct `Categorizing._viewFicCategory` request.

**Key Constraints Adhered To:**

* **No concept file modification.**
* **No `Sessioning` concept usage.** Authentication will rely on passing `username` and `password` with `Requesting.request` for private actions.
* **No `frames.query` usage.** All queries and action calls within the `where` clause will be direct `await Concept.action/query(...)` calls, with manual `Frames` manipulation.
* Query methods from concepts return `Array<Record<string, unknown>>` or `Record<string, unknown>` (potentially with an `error` field), which needs careful unwrapping.
* The `where` clause *must* return a `Frames` object.

***

First, ensure your `src/concepts/Requesting/passthrough.ts` is configured according to your decisions:

```typescript
// file: src/concepts/Requesting/passthrough.ts
import { Inclusions, Exclusions } from "./types.ts";

export const inclusions: Inclusions = {
  "/UserAuthentication/register": "Allows new users to create accounts.",
  "/UserAuthentication/authenticate": "Allows users to log in and get their user ID.",
  // All other routes will be handled by Requesting.request as they are excluded by default
  // or explicitly via the exclusions array if they match a passthrough pattern.
};

export const exclusions: Exclusions = [
  // UserAuthentication
  "/UserAuthentication/deleteUser",

  // Library - All actions are excluded due to privacy requirements
  "/Library/addUser",
  "/Library/submitNewFic",
  "/Library/submitNewVersionOfFanfic",
  "/Library/_viewFic",
  "/Library/deleteFic",
  "/Library/deleteFicsAndUser",
  "/Library/_getVersion",
  "/Library/deleteVersion",
  "/Library/_getAllUserVersions", // Query, but also excluded for direct access

  // Categorizing - All actions are excluded due to resource management and privacy
  "/Categorizing/categorizeFic",
  "/Categorizing/_viewFicCategory",
  "/Categorizing/deleteFicCategory",
  "/Categorizing/deleteFicCategories",
  "/Categorizing/_getAllFicCategories", // Query, but also excluded for direct access
];
```

***

Now for the synchronization files:

**1. `src/syncs/authentication.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Library, Categorizing } from "@concepts";
import { ID } from "@utils/types.ts";
import { Version, Fic } from "@concepts/Library/LibraryConcept.ts"; // Import types for manual query processing

// Define Symbols for variables used in frames
const userSym = Symbol("user");
const usernameSym = Symbol("username");
const passwordSym = Symbol("password");
const requestSym = Symbol("request");
const ficIdsSym = Symbol("ficIds"); // To collect all fic IDs for cascading delete

/**
 * Helper to authenticate a user given username and password from a frame.
 * Returns the user ID or an error.
 */
async function authenticateUserInFrame(
  frame: Record<symbol, unknown>,
): Promise<{ user?: ID; error?: string }> {
  const username = frame[usernameSym] as string;
  const password = frame[passwordSym] as string;

  if (!username || !password) {
    return { error: "Username and password are required for authentication." };
  }

  const authResult = await UserAuthentication.authenticate({ username, password });
  if ("error" in authResult) {
    return { error: `Authentication failed: ${authResult.error}` };
  }
  return { user: authResult.user };
}

/**
 * Sync: AuthRegisterAddUser
 * Purpose: Automatically adds an empty library entry for a new user upon registration.
 */
export const AuthRegisterAddUser: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }], // When a user is successfully registered
  ),
  then: actions(
    [Library.addUser, { user }], // Add them to the Library concept
  ),
});

/**
 * Sync: DeleteUserRequest
 * Purpose: Handles a request to delete a user account, authenticates,
 *          then triggers cascade deletion across UserAuthentication, Library, and Categorizing.
 *
 * Request Payload Example:
 * {
 *   "username": "someuser",
 *   "password": "somepassword"
 * }
 *
 * Expected HTTP endpoint: POST /api/UserAuthentication/deleteUser
 */
export const DeleteUserRequest: Sync = (
  { request, username, password, user, ficIds },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/UserAuthentication/deleteUser", username, password },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();

    for (const frame of inputFrames) {
      // 1. Authenticate the user
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, error: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      // 2. Collect all fic IDs for this user from Library BEFORE deleting
      const getAllVersionsResult = await Library._getAllUserVersions({
        user: authenticatedUser,
      });

      let userFicIds: ID[] = [];
      if ("error" in getAllVersionsResult) {
        // If no versions, it's not an error to continue with user deletion
        console.warn(
          `No library versions found for user ${authenticatedUser} during deletion cascade.`,
        );
      } else {
        const versions: Version[] = (getAllVersionsResult[0] as {
          versions: Version[];
        }).versions;
        for (const version of versions) {
          for (const fic of version.fics) {
            userFicIds.push(fic._id);
          }
        }
      }

      // If all successful, bind `user` and `ficIds` to the frame
      outputFrames.push({
        ...frame,
        [userSym]: authenticatedUser,
        [ficIdsSym]: userFicIds,
      });
    }
    return outputFrames;
  },
  then: actions(
    // Deleting the user
    [
      UserAuthentication.deleteUser,
      { username, password }, // Use username/password from the request for the action itself
      { user }, // Bind the deleted user ID
    ],
    // Cascade delete in Library
    [Library.deleteFicsAndUser, { user }],
    // Cascade delete in Categorizing
    [Categorizing.deleteFicCategories, { ficIds }],
    // Respond to the original request
    [Requesting.respond, { request, user }],
  ),
});
```

**2. `src/syncs/library.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Library, Categorizing } from "@concepts";
import { ID } from "@utils/types.ts";
import { Fic } from "@concepts/Library/LibraryConcept.ts"; // Import specific types if needed

// Define Symbols for variables used in frames
const userSym = Symbol("user");
const usernameSym = Symbol("username");
const passwordSym = Symbol("password");
const requestSym = Symbol("request");
const ficIdSym = Symbol("ficId"); // For a single fic ID
const ficIdsSym = Symbol("ficIds"); // For multiple fic IDs (e.g., from a version)
const ficTextSym = Symbol("ficText");
const ficNameSym = Symbol("ficName");
const authorTagsSym = Symbol("authorTags");
const dateSym = Symbol("date");
const versionTitleSym = Symbol("versionTitle");
const versionNumberSym = Symbol("versionNumber");
const versionIdSym = Symbol("versionId");
const errorSym = Symbol("error"); // For propagating errors

/**
 * Helper to authenticate a user given username and password from a frame.
 * Returns the user ID or an error.
 */
async function authenticateUserInFrame(
  frame: Record<symbol, unknown>,
): Promise<{ user?: ID; error?: string }> {
  const username = frame[usernameSym] as string;
  const password = frame[passwordSym] as string;

  if (!username || !password) {
    return { error: "Username and password are required for authentication." };
  }

  const authResult = await UserAuthentication.authenticate({ username, password });
  if ("error" in authResult) {
    return { error: `Authentication failed: ${authResult.error}` };
  }
  return { user: authResult.user };
}

/**
 * Helper to check if a user owns a specific fic (by ficName/versionNumber)
 * and returns the fic object, or an error.
 */
async function getOwnedFic(
  frame: Record<symbol, unknown>,
  authenticatedUser: ID,
): Promise<{ fic?: Fic; error?: string }> {
  const ficName = frame[ficNameSym] as string;
  const versionNumber = frame[versionNumberSym] as number;

  const viewFicResult = await Library._viewFic({
    user: authenticatedUser,
    ficName: ficName,
    versionNumber: versionNumber,
  });

  if ("error" in viewFicResult) {
    return { error: viewFicResult.error };
  }
  // _viewFic returns [{ fic: Fic }]
  return { fic: (viewFicResult[0] as { fic: Fic }).fic };
}

/**
 * Helper to check if a user owns a specific version (by versionTitle)
 * and returns the version object, or an error.
 */
async function getOwnedVersion(
  frame: Record<symbol, unknown>,
  authenticatedUser: ID,
): Promise<{ version?: Version; error?: string }> {
  const versionTitle = frame[versionTitleSym] as string;

  const getVersionResult = await Library._getVersion({
    user: authenticatedUser,
    versionTitle: versionTitle,
  });

  if ("error" in getVersionResult) {
    return { error: getVersionResult.error };
  }
  // _getVersion returns [{ version: Version }]
  return { version: (getVersionResult[0] as { version: Version }).version };
}

/**
 * Sync: SubmitNewFicRequest
 * Purpose: Handles request to submit a new fic, authenticates user,
 *          creates the fic, and triggers categorization.
 *
 * Request Payload Example:
 * {
 *   "username": "testuser",
 *   "password": "password123",
 *   "ficText": "Once upon a time...",
 *   "ficName": "My First Story",
 *   "authorTags": "Fantasy, Short Story",
 *   "date": { "day": 1, "month": 1, "year": 2023 }
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/submitNewFic
 */
export const SubmitNewFicRequest: Sync = (
  { request, username, password, ficText, ficName, authorTags, date, user, ficId },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/Library/submitNewFic",
        username,
        password,
        ficText,
        ficName,
        authorTags,
        date,
      },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      outputFrames.push({ ...frame, [userSym]: authResult.user });
    }
    return outputFrames;
  },
  then: actions(
    // 1. Submit the new fic
    [
      Library.submitNewFic,
      { user, ficText, ficName, authorTags, date },
      { ficId }, // Library.submitNewFic returns { ficId: ID }
    ],
    // 2. Trigger categorization for the new fic
    [Categorizing.categorizeFic, { ficId, ficText, authorTags }],
    // 3. Respond to the original request
    [Requesting.respond, { request, ficId }],
  ),
});

/**
 * Sync: SubmitNewVersionRequest
 * Purpose: Handles request to submit a new version of an existing fic,
 *          authenticates user, creates the new fic revision, and triggers categorization.
 *
 * Request Payload Example:
 * {
 *   "username": "testuser",
 *   "password": "password123",
 *   "ficText": "Once upon a time, revised...",
 *   "authorTags": "Fantasy, Short Story, Revised",
 *   "versionTitle": "My First Story",
 *   "ficName": "My First Story", // Should match versionTitle
 *   "date": { "day": 1, "month": 2, "year": 2023 }
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/submitNewVersionOfFanfic
 */
export const SubmitNewVersionRequest: Sync = (
  {
    request,
    username,
    password,
    ficText,
    authorTags,
    versionTitle,
    date,
    ficName,
    user,
    ficId, // Alias versionId for Categorizing.categorizeFic
  },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/Library/submitNewVersionOfFanfic",
        username,
        password,
        ficText,
        authorTags,
        versionTitle,
        date,
        ficName,
      },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      // Ensure the user owns the version
      const versionResult = await getOwnedVersion(frame, authenticatedUser);
      if (versionResult.error || !versionResult.version) {
        outputFrames.push({ ...frame, [errorSym]: versionResult.error });
        continue;
      }

      outputFrames.push({ ...frame, [userSym]: authenticatedUser });
    }
    return outputFrames;
  },
  then: actions(
    // 1. Submit the new version
    [
      Library.submitNewVersionOfFanfic,
      { user, ficText, authorTags, versionTitle, date, ficName },
      { versionId: ficId }, // Alias `versionId` returned by action to `ficId` for Categorizing
    ],
    // 2. Trigger categorization for the new fic revision
    [Categorizing.categorizeFic, { ficId, ficText, authorTags }],
    // 3. Respond to the original request
    [Requesting.respond, { request, ficId }],
  ),
});

/**
 * Sync: ViewFicRequest
 * Purpose: Handles request to view a specific fic revision, authenticates user,
 *          and ensures they own the fic before returning it.
 *
 * Request Payload Example:
 * {
 *   "username": "testuser",
 *   "password": "password123",
 *   "ficName": "My First Story",
 *   "versionNumber": 0
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/_viewFic
 */
export const ViewFicRequest: Sync = (
  { request, username, password, ficName, versionNumber, user, fic },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/_viewFic", username, password, ficName, versionNumber },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      const ficResult = await getOwnedFic(frame, authenticatedUser);
      if (ficResult.error || !ficResult.fic) {
        outputFrames.push({ ...frame, [errorSym]: ficResult.error });
        continue;
      }

      outputFrames.push({
        ...frame,
        [userSym]: authenticatedUser,
        [ficIdSym]: ficResult.fic._id, // Add ficId for potential future use or consistency
        [Symbol("fic")]: ficResult.fic, // Bind the fic object itself for the `then` clause
      });
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, fic }],
  ),
});

/**
 * Sync: DeleteFicRequest
 * Purpose: Handles request to delete a specific fic revision, authenticates user,
 *          ensures ownership, then deletes the fic and cascades to Categorizing.
 *
 * Request Payload Example:
 * {
 *   "username": "testuser",
 *   "password": "password123",
 *   "ficName": "My First Story",
 *   "versionNumber": 0
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/deleteFic
 */
export const DeleteFicRequest: Sync = (
  { request, username, password, ficName, versionNumber, user, ficId },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/Library/deleteFic",
        username,
        password,
        ficName,
        versionNumber,
      },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      // Get the fic to ensure ownership and get its ID before deletion
      const ficResult = await getOwnedFic(frame, authenticatedUser);
      if (ficResult.error || !ficResult.fic) {
        outputFrames.push({ ...frame, [errorSym]: ficResult.error });
        continue;
      }

      outputFrames.push({
        ...frame,
        [userSym]: authenticatedUser,
        [ficIdSym]: ficResult.fic._id, // Bind ficId of the one to be deleted
      });
    }
    return outputFrames;
  },
  then: actions(
    // 1. Delete the fic from Library
    [Library.deleteFic, { user, ficName, versionNumber }, { ficId }], // ficId is returned from Library.deleteFic
    // 2. Cascade delete in Categorizing
    [Categorizing.deleteFicCategory, { ficId }],
    // 3. Respond to the original request
    [Requesting.respond, { request, ficId }],
  ),
});

/**
 * Sync: DeleteFicsAndUserCascadingDeleteCategorizing
 * Purpose: Ensures that when `Library.deleteFicsAndUser` is called (which is
 *          already a cascade from `UserAuthentication.deleteUser`), it further
 *          cascades to delete relevant categorization data.
 *
 * Note: This sync is triggered *after* UserAuthentication.deleteUser and Library.deleteFicsAndUser
 *       have already fired, but needs the `ficIds` that were gathered *before*
 *       Library.deleteFicsAndUser. This is handled by the `DeleteUserRequest` sync.
 */
export const DeleteFicsAndUserCascadingDeleteCategorizing: Sync = (
  { user, ficIds },
) => ({
  when: actions(
    [UserAuthentication.deleteUser, {}, { user }], // When user is deleted from auth
    [Library.deleteFicsAndUser, { user }], // And their library is deleted
  ),
  where: async (inputFrames) => {
    // The ficIds should have been bound by the DeleteUserRequest sync
    // This sync ensures Categorizing.deleteFicCategories is called for each user's ficIds
    return inputFrames.filter((frame) => frame[ficIdsSym] !== undefined);
  },
  then: actions(
    [Categorizing.deleteFicCategories, { ficIds }],
  ),
});

/**
 * Sync: ViewVersionRequest
 * Purpose: Handles request to view a specific fic version (all revisions),
 *          authenticates user, and ensures they own the version.
 *
 * Request Payload Example:
 * {
 *   "username": "testuser",
 *   "password": "password123",
 *   "versionTitle": "My First Story"
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/_getVersion
 */
export const ViewVersionRequest: Sync = (
  { request, username, password, versionTitle, user, version },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/_getVersion", username, password, versionTitle },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      const versionResult = await getOwnedVersion(frame, authenticatedUser);
      if (versionResult.error || !versionResult.version) {
        outputFrames.push({ ...frame, [errorSym]: versionResult.error });
        continue;
      }

      outputFrames.push({
        ...frame,
        [userSym]: authenticatedUser,
        [versionIdSym]: versionResult.version._id, // Bind versionId for consistency
        [Symbol("version")]: versionResult.version, // Bind the version object itself for the `then` clause
      });
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, version }],
  ),
});

/**
 * Sync: DeleteVersionRequest
 * Purpose: Handles request to delete an entire fic version, authenticates user,
 *          ensures ownership, then deletes the version and cascades to Categorizing.
 *
 * Request Payload Example:
 * {
 *   "username": "testuser",
 *   "password": "password123",
 *   "ficTitle": "My First Story"
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/deleteVersion
 */
export const DeleteVersionRequest: Sync = (
  { request, username, password, ficTitle, user, versionId, ficIds },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/deleteVersion", username, password, ficTitle },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      // Get the version to ensure ownership and collect all fic IDs within it
      const versionResult = await getOwnedVersion(
        { [versionTitleSym]: ficTitle }, // Pass ficTitle as versionTitle for the helper
        authenticatedUser,
      );
      if (versionResult.error || !versionResult.version) {
        outputFrames.push({ ...frame, [errorSym]: versionResult.error });
        continue;
      }

      const versionToDelete = versionResult.version;
      const ficsInVersion = versionToDelete.fics.map((fic) => fic._id);

      outputFrames.push({
        ...frame,
        [userSym]: authenticatedUser,
        [versionIdSym]: versionToDelete._id,
        [ficIdsSym]: ficsInVersion, // Bind all fic IDs from this version
      });
    }
    return outputFrames;
  },
  then: actions(
    // 1. Delete the version from Library
    [Library.deleteVersion, { user, ficTitle }, { versionId }],
    // 2. Cascade delete in Categorizing for all fics in that version
    [Categorizing.deleteFicCategories, { ficIds }],
    // 3. Respond to the original request
    [Requesting.respond, { request, versionId }],
  ),
});
```

**3. `src/syncs/categorization.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Library, Categorizing } from "@concepts";
import { ID } from "@utils/types.ts";
import { Fic } from "@concepts/Library/LibraryConcept.ts"; // Import Fic type for helper

// Define Symbols for variables used in frames
const userSym = Symbol("user");
const usernameSym = Symbol("username");
const passwordSym = Symbol("password");
const requestSym = Symbol("request");
const ficIdSym = Symbol("ficId");
const ficNameSym = Symbol("ficName");
const versionNumberSym = Symbol("versionNumber");
const ficCategorySym = Symbol("ficCategory");
const errorSym = Symbol("error");

/**
 * Helper to authenticate a user given username and password from a frame.
 * Returns the user ID or an error.
 */
async function authenticateUserInFrame(
  frame: Record<symbol, unknown>,
): Promise<{ user?: ID; error?: string }> {
  const username = frame[usernameSym] as string;
  const password = frame[passwordSym] as string;

  if (!username || !password) {
    return { error: "Username and password are required for authentication." };
  }

  const authResult = await UserAuthentication.authenticate({ username, password });
  if ("error" in authResult) {
    return { error: `Authentication failed: ${authResult.error}` };
  }
  return { user: authResult.user };
}

/**
 * Helper to check if a user owns a specific fic (by ficName/versionNumber)
 * and returns the fic object, or an error.
 */
async function getOwnedFic(
  frame: Record<symbol, unknown>,
  authenticatedUser: ID,
): Promise<{ fic?: Fic; error?: string }> {
  const ficName = frame[ficNameSym] as string;
  const versionNumber = frame[versionNumberSym] as number;

  const viewFicResult = await Library._viewFic({
    user: authenticatedUser,
    ficName: ficName,
    versionNumber: versionNumber,
  });

  if ("error" in viewFicResult) {
    return { error: viewFicResult.error };
  }
  // _viewFic returns [{ fic: Fic }]
  return { fic: (viewFicResult[0] as { fic: Fic }).fic };
}

/**
 * Sync: ViewFicCategoryRequest
 * Purpose: Handles request to view a fic's categorization, authenticates user,
 *          ensures ownership of the fic, then returns the categorization data.
 *
 * Request Payload Example:
 * {
 *   "username": "testuser",
 *   "password": "password123",
 *   "ficName": "My First Story",
 *   "versionNumber": 0
 * }
 *
 * Expected HTTP endpoint: POST /api/Categorizing/_viewFicCategory
 */
export const ViewFicCategoryRequest: Sync = (
  { request, username, password, ficName, versionNumber, user, ficId, ficCategory },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/Categorizing/_viewFicCategory",
        username,
        password,
        ficName,
        versionNumber,
      },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      // Get the fic to ensure ownership and extract its ficId
      const ficResult = await getOwnedFic(frame, authenticatedUser);
      if (ficResult.error || !ficResult.fic) {
        outputFrames.push({ ...frame, [errorSym]: ficResult.error });
        continue;
      }
      const fic = ficResult.fic;

      // Now query Categorizing for the fic's category
      const ficCategoryResult = await Categorizing._viewFicCategory({
        ficId: fic._id,
      });

      if ("error" in ficCategoryResult) {
        outputFrames.push({ ...frame, [errorSym]: ficCategoryResult.error });
        continue;
      }
      // _viewFicCategory returns FicCategoryDoc[]
      // We expect one result if found
      const categoryDoc = (ficCategoryResult as Categorizing.FicCategoryDoc[])[0];

      outputFrames.push({
        ...frame,
        [userSym]: authenticatedUser,
        [ficIdSym]: fic._id,
        [ficCategorySym]: categoryDoc, // Bind the categorization object
      });
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, ficCategory }],
  ),
});
```

***

**Final Steps for Setup:**

1. Place these `.sync.ts` files into your `src/syncs/` directory.
2. Run `deno run build` from your project root to generate the `@concepts` and `@syncs` imports. This will ensure your new syncs are discovered by the engine.
3. Start your application with `deno run start`.

Now, when an HTTP POST request hits your server at the excluded paths (e.g., `/api/UserAuthentication/deleteUser` or `/api/Library/submitNewFic`), it will trigger `Requesting.request`, and these synchronizations will orchestrate the underlying concept actions, including authentication checks and cascading effects.
