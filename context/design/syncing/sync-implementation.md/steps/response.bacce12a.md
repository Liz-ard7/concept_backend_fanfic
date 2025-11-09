---
timestamp: 'Fri Nov 07 2025 22:54:44 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_225444.0b8c3ab9.md]]'
content_id: bacce12aba01f1ceed4c224e22de23dda099ab9ef5e3d679dc0acbe03cb9ee3e
---

# response:

```typescript
// file: src/syncs/fic_management.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Categorizing, Library, UserAuthentication, Requesting } from "@concepts"; // Assuming @concepts imports all these

// --- Utility types for clarity and consistency with concept specs ---
type ID = string; // Assuming ID type is string as per provided instructions
interface DateSpec {
  day: number;
  month: number;
  year: number;
}

// -----------------------------------------------------------------------------
// USER MANAGEMENT SYNCS (UserAuthentication, Library, Categorizing)
// -----------------------------------------------------------------------------

/**
 * Sync 1: OnRegisterCreateLibrary
 * Purpose: Automatically create an empty Library entry for a user after successful registration.
 *
 * When: UserAuthentication.register completes successfully.
 * Then: Library.addUser is called to initialize the user's library.
 */
export const OnRegisterCreateLibrary: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }], // When a user is successfully registered
  ),
  then: actions(
    [Library.addUser, { user }], // Add an empty library for them
  ),
});

/**
 * Sync 2a: UserDeleteRequestAuthAndCollect
 * Purpose: Handles a user deletion request by authenticating the user,
 *          collecting all their associated fic IDs, and then triggering
 *          the cascaded deletion across concepts.
 *
 * When: A Requesting.request for "/UserAuthentication/deleteUser" is received.
 * Where: Authenticates the user. If successful, queries Library to get all fic IDs
 *        associated with that user, to prepare for cascading Categorizing deletions.
 * Then: Triggers cascade deletion: Categorizing.deleteFicCategories,
 *       Library.deleteFicsAndUser, and UserAuthentication.deleteUser.
 *       (Order is important: dependent data deleted before main entities).
 */
export const UserDeleteRequestAuthAndCollect: Sync = (
  { request, username, password, user, allFicIdsToDelete, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser", username, password }, { request }],
  ),
  where: async (frames) => {
    // 1. Attempt to authenticate the user for deletion
    let authenticatedFrames = await frames.query(
      UserAuthentication.authenticate,
      { username, password },
      { user },
    );

    if (authenticatedFrames.length === 0) {
      // If authentication fails, create a frame to signal an error response.
      // We explicitly return a new Frames instance with an error binding.
      return new Frames([{ [request]: frames[0][request], [error]: "Invalid username or password for deletion." }]);
    }

    // 2. Authentication succeeded, now collect all fic IDs for cascade deletion.
    // Get all versions for the authenticated user.
    authenticatedFrames = await authenticatedFrames.query(
      Library._getAllUserVersions,
      { user },
      { versions: Symbol('userVersions') },
    );

    // Collect all fic IDs from all versions into a single array for `Categorizing.deleteFicCategories`.
    return authenticatedFrames.map((frame) => {
      const versions = frame[Symbol('userVersions')] as { fics: { _id: ID }[] }[];
      const ficIds: ID[] = [];
      versions.forEach((version) => {
        version.fics.forEach((fic) => ficIds.push(fic._id));
      });
      return { ...frame, [allFicIdsToDelete]: ficIds }; // Bind collected fic IDs to a new variable
    });
  },
  then: actions(
    // These actions are triggered only if authentication succeeded and fic IDs were collected.
    // 1. Delete categorizations for all user's fics.
    [Categorizing.deleteFicCategories, { ficIds: allFicIdsToDelete }],
    // 2. Delete user's fics and user from Library.
    [Library.deleteFicsAndUser, { user }],
    // 3. Delete user from UserAuthentication.
    [UserAuthentication.deleteUser, { username, password }],
  ),
});

/**
 * Sync 2b: UserDeleteResponseSuccess
 * Purpose: Responds to the client after a successful user deletion.
 *
 * When: The initial delete request fires AND UserAuthentication.deleteUser completes.
 * Then: Requesting.respond sends a success message.
 */
export const UserDeleteResponseSuccess: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
    [UserAuthentication.deleteUser, {}, { user }], // UserAuthentication.deleteUser completed successfully
  ),
  then: actions(
    [Requesting.respond, { request, message: `User ${user} and all associated data deleted successfully.` }],
  ),
});

/**
 * Sync 2c: UserDeleteResponseAuthError
 * Purpose: Responds to the client when a user deletion request fails due to authentication.
 *
 * When: The initial delete request fires.
 * Where: An 'error' variable was bound, indicating an authentication failure.
 * Then: Requesting.respond sends the error message.
 */
export const UserDeleteResponseAuthError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
  ),
  where: (frames) => {
    // Filter for frames where the 'error' variable was bound (from UserDeleteRequestAuthAndCollect)
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});

// -----------------------------------------------------------------------------
// LIBRARY MANAGEMENT SYNCS (Library, Categorizing)
// -----------------------------------------------------------------------------

/**
 * Sync 3a: SubmitNewFicRequest
 * Purpose: Handles a request to submit a brand new fic.
 *
 * When: A Requesting.request for "/Library/submitNewFic" is received.
 * Where: Ensures the specified user exists in the Library (authorization check).
 * Then: Triggers Library.submitNewFic and Categorizing.categorizeFic.
 */
export const SubmitNewFicRequest: Sync = (
  { request, user, ficText, ficName, authorTags, date, ficId, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic", user, ficText, ficName, authorTags, date }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Ensure the user exists in the Library concept.
    // Library._getAllUserVersions returns an array, even if empty. An error is a distinct return.
    const userExistsCheck = await Library._getAllUserVersions({ user: frames[0][user] });
    if ('error' in userExistsCheck) {
      return new Frames([{ [request]: frames[0][request], [error]: userExistsCheck.error }]);
    }
    // If the user exists (even with no versions), proceed.
    return frames;
  },
  then: actions(
    // 1. Submit the new fic to Library
    [Library.submitNewFic, { user, ficText, ficName, authorTags, date }, { ficId }],
    // 2. Trigger categorization for the new fic
    [Categorizing.categorizeFic, { ficId, ficText, authorTags }],
  ),
});

/**
 * Sync 3b: SubmitNewFicResponseSuccess
 * Purpose: Responds to the client after a successful new fic submission and categorization.
 *
 * When: The initial request, Library.submitNewFic, and Categorizing.categorizeFic all complete.
 * Then: Requesting.respond sends a success message.
 */
export const SubmitNewFicResponseSuccess: Sync = ({ request, ficId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Library.submitNewFic, {}, { ficId }], // Library.submitNewFic completed
    [Categorizing.categorizeFic, { ficId }, {}], // Categorization completed for this ficId
  ),
  then: actions(
    [Requesting.respond, { request, message: "Fic submitted and categorized successfully.", ficId }],
  ),
});

/**
 * Sync 3c: SubmitNewFicResponseError
 * Purpose: Responds to the client when a new fic submission fails.
 *
 * When: The initial new fic request fires.
 * Where: An 'error' variable was bound, indicating a failure during authorization or Library.submitNewFic.
 * Then: Requesting.respond sends the error message.
 */
export const SubmitNewFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});


/**
 * Sync 4a: SubmitNewVersionFicRequest
 * Purpose: Handles a request to submit a new version of an existing fic.
 *
 * When: A Requesting.request for "/Library/submitNewVersionOfFanfic" is received.
 * Where: Ensures the specified user exists and owns the target version (authorization).
 * Then: Triggers Library.submitNewVersionOfFanfic.
 */
export const SubmitNewVersionFicRequest: Sync = (
  { request, user, ficText, authorTags, versionTitle, date, ficName, versionId, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic", user, ficText, authorTags, versionTitle, date, ficName }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Ensure the user exists and owns the version.
    let validatedFrames = await frames.query(Library._getVersion, { user, versionTitle }, { version: Symbol('targetVersion') });
    if (validatedFrames.length === 0) {
      return new Frames([{ [request]: frames[0][request], [error]: `User '${frames[0][user]}' does not own version '${frames[0][versionTitle]}' or version does not exist.` }]);
    }
    return validatedFrames;
  },
  then: actions(
    // Submit the new version to Library.
    // The `Library.submitNewVersionOfFanfic` implementation returns `versionId` (ID of the updated container)
    // and `ficId` (ID of the newly created fic revision within that version).
    [Library.submitNewVersionOfFanfic, { user, ficText, authorTags, versionTitle, date, ficName }, { versionId, ficId: Symbol('newFicId') }],
  ),
});

/**
 * Sync 4b: CategorizeNewVersionFic
 * Purpose: Triggers categorization for the newly created fic revision after a new version is submitted.
 *
 * When: Library.submitNewVersionOfFanfic completes.
 * Then: Categorizing.categorizeFic is called with the details of the new fic revision.
 */
export const CategorizeNewVersionFic: Sync = ({ user, ficText, authorTags, versionId, newFicId }) => ({
    when: actions(
        // Capture inputs needed for categorization from the flow.
        [Library.submitNewVersionOfFanfic, { user, ficText, authorTags }, { versionId, ficId: newFicId }],
    ),
    then: actions(
        // Trigger categorization for the latest fic of this version
        [Categorizing.categorizeFic, { ficId: newFicId, ficText, authorTags }],
    ),
});

/**
 * Sync 4c: SubmitNewVersionFicResponseSuccess
 * Purpose: Responds to the client after a successful new version submission and categorization.
 *
 * When: The initial request, Library.submitNewVersionOfFanfic, and Categorizing.categorizeFic all complete.
 * Then: Requesting.respond sends a success message.
 */
export const SubmitNewVersionFicResponseSuccess: Sync = ({ request, versionId, newFicId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { versionId, ficId: newFicId }], // Ensure Library action completed
    [Categorizing.categorizeFic, { ficId: newFicId }, {}], // Ensure Categorizing action completed for the new fic
  ),
  then: actions(
    [Requesting.respond, { request, message: "New fic version submitted and categorized.", versionId, newFicId }],
  ),
});

/**
 * Sync 4d: SubmitNewVersionFicResponseError
 * Purpose: Responds to the client when a new version submission fails.
 *
 * When: The initial new version request fires.
 * Where: An 'error' variable was bound, indicating a failure.
 * Then: Requesting.respond sends the error message.
 */
export const SubmitNewVersionFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});


/**
 * Sync 5a: ViewFicRequest
 * Purpose: Handles a request to view a specific fic revision.
 *
 * When: A Requesting.request for "/Library/_viewFic" is received.
 * Where: Uses Library._viewFic to check user ownership and retrieve the fic.
 * Then: Requesting.respond sends the fic data.
 */
export const ViewFicRequest: Sync = ({ request, user, ficName, versionNumber, fic, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic", user, ficName, versionNumber }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Library._viewFic implicitly checks user existence and ownership.
    let ficFrames = await frames.query(Library._viewFic, { user, ficName, versionNumber }, { fic });
    if (ficFrames.length === 0) {
      // If _viewFic returns no results (due to not found or not owned), construct an error frame.
      return new Frames([{ [request]: frames[0][request], [error]: `Fic '${frames[0][ficName]}' version '${frames[0][versionNumber]}' not found or not owned by user '${frames[0][user]}'.` }]);
    }
    return ficFrames;
  },
  then: actions(
    [Requesting.respond, { request, fic }],
  ),
});

/**
 * Sync 5b: ViewFicResponseError
 * Purpose: Responds to the client when a request to view a fic fails.
 *
 * When: The initial view fic request fires.
 * Where: An 'error' variable was bound.
 * Then: Requesting.respond sends the error message.
 */
export const ViewFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});


/**
 * Sync 6a: DeleteFicRequest
 * Purpose: Handles a request to delete a specific fic revision.
 *
 * When: A Requesting.request for "/Library/deleteFic" is received.
 * Where: Ensures the specified user exists and owns the target fic, and retrieves its ID for cascading deletion.
 * Then: Triggers Library.deleteFic and Categorizing.deleteFicCategory.
 */
export const DeleteFicRequest: Sync = (
  { request, user, ficName, versionNumber, ficIdToDelete, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic", user, ficName, versionNumber }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Use _viewFic to confirm existence and ownership, and to get the ficId.
    let validatedFrames = await frames.query(
      Library._viewFic,
      { user, ficName, versionNumber },
      { fic: Symbol('ficDetails') },
    );
    if (validatedFrames.length === 0) {
      return new Frames([{ [request]: frames[0][request], [error]: `Fic '${frames[0][ficName]}' version '${frames[0][versionNumber]}' not found or not owned by user '${frames[0][user]}'.` }]);
    }
    // Extract ficId from the retrieved fic details for cascading deletion
    return validatedFrames.map(frame => ({ ...frame, [ficIdToDelete]: (frame[Symbol('ficDetails')] as { _id: ID })._id }));
  },
  then: actions(
    // 1. Delete fic from Library. `ficId` is returned by action and captured into `ficIdToDelete`.
    [Library.deleteFic, { user, ficName, versionNumber }, { ficId: ficIdToDelete }],
    // 2. Cascade delete categorization for this fic.
    [Categorizing.deleteFicCategory, { ficId: ficIdToDelete }],
  ),
});

/**
 * Sync 6b: DeleteFicResponseSuccess
 * Purpose: Responds to the client after a successful fic deletion and cascading categorization deletion.
 *
 * When: The initial delete request fires AND Library.deleteFic completes.
 * Then: Requesting.respond sends a success message.
 */
export const DeleteFicResponseSuccess: Sync = ({ request, ficIdToDelete }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
    [Library.deleteFic, {}, { ficId: ficIdToDelete }], // Library.deleteFic completed
  ),
  then: actions(
    [Requesting.respond, { request, message: `Fic ${ficIdToDelete} deleted successfully.`, ficId: ficIdToDelete }],
  ),
});

/**
 * Sync 6c: DeleteFicResponseError
 * Purpose: Responds to the client when a fic deletion request fails.
 *
 * When: The initial delete fic request fires.
 * Where: An 'error' variable was bound.
 * Then: Requesting.respond sends the error message.
 */
export const DeleteFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});


/**
 * Sync 7a: GetVersionRequest
 * Purpose: Handles a request to retrieve a complete story version.
 *
 * When: A Requesting.request for "/Library/_getVersion" is received.
 * Where: Uses Library._getVersion to ensure user ownership and retrieve the version.
 * Then: Requesting.respond sends the version data.
 */
export const GetVersionRequest: Sync = ({ request, user, versionTitle, version, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion", user, versionTitle }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Ensure user exists and owns the version. Library._getVersion handles this.
    let validatedFrames = await frames.query(Library._getVersion, { user, versionTitle }, { version });
    if (validatedFrames.length === 0) {
      return new Frames([{ [request]: frames[0][request], [error]: `Version '${frames[0][versionTitle]}' not found or not owned by user '${frames[0][user]}'.` }]);
    }
    return validatedFrames;
  },
  then: actions(
    [Requesting.respond, { request, version }],
  ),
});

/**
 * Sync 7b: GetVersionResponseError
 * Purpose: Responds to the client when a request to get a version fails.
 *
 * When: The initial get version request fires.
 * Where: An 'error' variable was bound.
 * Then: Requesting.respond sends the error message.
 */
export const GetVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});


/**
 * Sync 8a: DeleteVersionRequest
 * Purpose: Handles a request to delete an entire story version.
 *
 * When: A Requesting.request for "/Library/deleteVersion" is received.
 * Where: Ensures the user owns the version, and collects all fic IDs within it for cascading deletion.
 * Then: Triggers Categorizing.deleteFicCategories and Library.deleteVersion.
 */
export const DeleteVersionRequest: Sync = (
  { request, user, ficTitle, versionIdToDelete, allFicIdsInVersion, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion", user, ficTitle }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Ensure user exists and owns the version, and get all fic IDs for cascading delete.
    let validatedFrames = await frames.query(
      Library._getVersion,
      { user, versionTitle: ficTitle },
      { version: Symbol('targetVersionDetails') },
    );
    if (validatedFrames.length === 0) {
      return new Frames([{ [request]: frames[0][request], [error]: `Version '${frames[0][ficTitle]}' not found or not owned by user '${frames[0][user]}'.` }]);
    }

    // Collect all fic IDs from the version for cascading categorization deletion
    return validatedFrames.map((frame) => {
      const versionDetails = frame[Symbol('targetVersionDetails')] as { fics: { _id: ID }[] };
      const ficIds: ID[] = versionDetails.fics.map((fic) => fic._id);
      return { ...frame, [allFicIdsInVersion]: ficIds };
    });
  },
  then: actions(
    // 1. Delete categorizations for all fics in the version.
    [Categorizing.deleteFicCategories, { ficIds: allFicIdsInVersion }],
    // 2. Delete the version from Library. `versionId` is returned by action and captured into `versionIdToDelete`.
    [Library.deleteVersion, { user, ficTitle }, { versionId: versionIdToDelete }],
  ),
});

/**
 * Sync 8b: DeleteVersionResponseSuccess
 * Purpose: Responds to the client after a successful version deletion and cascading categorization deletion.
 *
 * When: The initial delete request fires AND Library.deleteVersion completes.
 * Then: Requesting.respond sends a success message.
 */
export const DeleteVersionResponseSuccess: Sync = ({ request, versionIdToDelete }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
    [Library.deleteVersion, {}, { versionId: versionIdToDelete }], // Library.deleteVersion completed
  ),
  then: actions(
    [Requesting.respond, { request, message: `Version ${versionIdToDelete} and its categorizations deleted successfully.`, versionId: versionIdToDelete }],
  ),
});

/**
 * Sync 8c: DeleteVersionResponseError
 * Purpose: Responds to the client when a version deletion request fails.
 *
 * When: The initial delete version request fires.
 * Where: An 'error' variable was bound.
 * Then: Requesting.respond sends the error message.
 */
export const DeleteVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});


/**
 * Sync 9a: GetAllUserVersionsRequest
 * Purpose: Handles a request to retrieve all story versions for a user.
 *
 * When: A Requesting.request for "/Library/_getAllUserVersions" is received.
 * Where: Ensures the user exists (authorization) and retrieves their versions.
 * Then: Requesting.respond sends the versions data.
 */
export const GetAllUserVersionsRequest: Sync = ({ request, user, userVersions, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getAllUserVersions", user }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Ensure user exists. Library._getAllUserVersions handles this.
    // Query returns [{ versions: Version[] }] or { error: string }
    const queryResult = await Library._getAllUserVersions({ user: frames[0][user] });

    if ('error' in queryResult) {
      return new Frames([{ [request]: frames[0][request], [error]: queryResult.error }]);
    }
    // If successful, extract the inner `versions` array and bind it to `userVersions`
    return frames.map(frame => ({ ...frame, [userVersions]: queryResult[0].versions }));
  },
  then: actions(
    [Requesting.respond, { request, versions: userVersions }], // Respond with the extracted array
  ),
});

/**
 * Sync 9b: GetAllUserVersionsResponseError
 * Purpose: Responds to the client when a request to get all user versions fails.
 *
 * When: The initial get all user versions request fires.
 * Where: An 'error' variable was bound.
 * Then: Requesting.respond sends the error message.
 */
export const GetAllUserVersionsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getAllUserVersions" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});


// -----------------------------------------------------------------------------
// CATEGORIZING MANAGEMENT SYNCS (Categorizing)
// -----------------------------------------------------------------------------

/**
 * Sync 10a: ViewFicCategoryRequest
 * Purpose: Handles a request to view a fic's categorization data.
 *
 * When: A Requesting.request for "/Categorizing/_viewFicCategory" is received.
 * Where: Authorizes by ensuring the requesting user owns the fic, then retrieves the categorization.
 * Then: Requesting.respond sends the categorization data.
 */
export const ViewFicCategoryRequest: Sync = ({ request, user, ficId, ficCategory, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory", user, ficId }, { request }],
  ),
  where: async (frames) => {
    // Authorization: Ensure the requesting 'user' owns the 'ficId'.
    // We query Library._getAllUserVersions and then check if the ficId exists within them.
    let userFicsCheckFrames = await frames.query(
        Library._getAllUserVersions,
        { user },
        { versions: Symbol('allUserVersionsCheck') }
    );

    if (userFicsCheckFrames.length === 0 || ('error' in userFicsCheckFrames[0] && userFicsCheckFrames[0][error])) {
        // User not found or Library returned an error
        return new Frames([{ [request]: frames[0][request], [error]: `User '${frames[0][user]}' not found.` }]);
    }

    const hasFic = userFicsCheckFrames[0][Symbol('allUserVersionsCheck')].some((version: { fics: { _id: ID }[] }) =>
        version.fics.some(fic => fic._id === frames[0][ficId])
    );

    if (!hasFic) {
      return new Frames([{ [request]: frames[0][request], [error]: `Fic ID '${frames[0][ficId]}' not found or not owned by user '${frames[0][user]}'.` }]);
    }

    // Now query Categorizing for the fic's category.
    let categoryFrames = await frames.query(Categorizing._viewFicCategory, { ficId }, { ficCategory });
    if (categoryFrames.length === 0) {
      // If categorization not found, it's not an authorization error, but data absence.
      return new Frames([{ [request]: frames[0][request], [error]: `Fic category for fic ID '${frames[0][ficId]}' not found.` }]);
    }
    return categoryFrames;
  },
  then: actions(
    [Requesting.respond, { request, ficCategory }],
  ),
});

/**
 * Sync 10b: ViewFicCategoryResponseError
 * Purpose: Responds to the client when a request to view a fic category fails.
 *
 * When: The initial view fic category request fires.
 * Where: An 'error' variable was bound.
 * Then: Requesting.respond sends the error message.
 */
export const ViewFicCategoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory" }, { request }],
  ),
  where: (frames) => frames.filter(($) => $[error] !== undefined),
  then: actions(
    [Requesting.respond, { request, error: error }],
  ),
});
```

```typescript
// file: src/concepts/Library/LibraryConcept.ts (Adjusted for `submitNewVersionOfFanfic` return)

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
   * @returns {{ versionId: ID, ficId: ID } | { error: string }} The updated version's ID and the newly created fic's ID on success, or an error object.
   *
   * @requires user must exist in set of Users, versionTitle must exist within the user's set of Versions.
   * @effects create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags.
   *          Then, add the Fic to the version within the user's set of Versions. Finally, return the Version.
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
  ): Promise<{ versionId: ID, ficId: ID } | { error: string }> { // MODIFIED RETURN TYPE
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
      _id: freshID(), // This is the ID of the new fic revision
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

    return { versionId: updatedVersion._id, ficId: newFic._id }; // MODIFIED RETURN VALUE
  }

  /**
   * @action viewFic
   * @description Retrieves a specific fic revision by its story title and version number.
   * @param {User} user The ID of the user who owns the fic.
   * @param {string} ficName The title of the story.
   * @param {number} versionNumber The specific revision number of the fic.
   * @returns {[{ fic: Fic }] | { error: string }} The requested fic object on success, or an error object.
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
  ): Promise<[{ fic: Fic }] | { error: string }> {
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

    return [{ fic: fic }];
  }

  /**
   * @action deleteFic
   * @description Deletes a specific revision of a story for a user.
   * @param {User} user The ID of the user.
   * @param {string} ficName The title of the story.
   * @param {number} versionNumber The specific revision number to delete.
   * @returns {{ ficId: ID } | { error: string }} The deleted fic object on success, or an error object.
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
   * @action getVersion
   * @description Retrieves a complete story version (including all its revisions) for a user.
   * @param {User} user The ID of the user.
   * @param {string} versionTitle The title of the story version to retrieve.
   * @returns {[{ version: Version }] | { error: string }} The requested version object on success, or an error object.
   *
   * @requires user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.
   * @effects returns the user's version associated with the versionTitle as title.
   */
  async _getVersion(
    { user, versionTitle }: { user: User; versionTitle: string },
  ): Promise<[{ version: Version }] | { error: string }> {
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
    return [{ version: version }];
  }

  /**
   * @action deleteVersion
   * @description Deletes an entire story version (and all its fic revisions) for a user.
   * @param {User} user The ID of the user.
   * @param {string} ficTitle The title of the story version to delete.
   * @returns {{ versionId: ID } | { error: string }} The deleted version object on success, or an error object.
   *
   * @requires the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users.
   * @effects removes the version associated with ficTitle as the title from the user's set of Versions, then returns the version.
   */
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

  /**
   * @query _getAllUserVersions
   * @description Retrieves all story versions for a given user.
   * @param {User} user The ID of the user.
   * @returns {[{ versions: Version[] }] | { error: string }} An array of version objects on success, or an error object.
   */
  async _getAllUserVersions(
    { user }: { user: User },
  ): Promise<[{ versions: Version[] }] | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' does not exist.` };
    }
    return [{ versions: userDoc.versions }];
  }
}
```

```typescript
// file: src/concepts/Requesting/passthrough.ts

import { Inclusions, Exclusions } from "../../engine/types.ts";

/**
 * Configure passthrough routes here.
 *
 * `inclusions`: Routes that are intentionally exposed directly via HTTP.
 * `exclusions`: Routes that should NOT be exposed directly via HTTP and instead
 *               trigger a `Requesting.request` action for synchronization.
 *
 * Unlisted routes will default to being included, but will generate a WARNING.
 * Please explicitly list all routes.
 */

export const inclusions: Inclusions = {
  "/api/UserAuthentication/register": "Allows new users to create an account.",
  "/api/UserAuthentication/authenticate": "Allows users to log in.",
};

export const exclusions: Exclusions = [
  // UserAuthentication
  "/api/UserAuthentication/deleteUser",

  // Library
  "/api/Library/addUser",
  "/api/Library/submitNewFic",
  "/api/Library/submitNewVersionOfFanfic",
  "/api/Library/_viewFic",
  "/api/Library/deleteFic",
  "/api/Library/deleteFicsAndUser",
  "/api/Library/_getVersion",
  "/api/Library/deleteVersion",
  "/api/Library/_getAllUserVersions",

  // Categorizing
  "/api/Categorizing/categorizeFic",
  "/api/Categorizing/_viewFicCategory",
  "/api/Categorizing/deleteFicCategory",
  "/api/Categorizing/deleteFicCategories",
  "/api/Categorizing/_getAllFicCategories", // Added as this query was implicitly implemented
];
```
