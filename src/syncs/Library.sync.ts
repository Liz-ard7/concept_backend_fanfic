import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Library, Categorizing, Requesting } from "@concepts";
import { ID } from "@utils/types.ts";
import { Fic, Version } from "@concepts/Library/LibraryConcept.ts"; // Import specific types if needed

// Define Symbols for variables used in frames
const userSym = Symbol("user");
const usernameSym = Symbol("username");
const passwordSym = Symbol("password");
const ficIdSym = Symbol("ficId"); // For a single fic ID
const ficIdsSym = Symbol("ficIds"); // For multiple fic IDs (e.g., from a version)
const ficNameSym = Symbol("ficName");
const versionTitleSym = Symbol("versionTitle");
const versionNumberSym = Symbol("versionNumber");
const versionIdSym = Symbol("versionId");
const errorSym = Symbol("error"); // For propagating errors
// Removed dedicated versionsSym; we'll bind directly to the parameter symbol 'versions'

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
 * NOTE: Currently disabled in favor of SubmitNewFicRequestByUserId
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
// export const SubmitNewFicRequest: Sync = (
//   { request, username, password, ficText, ficName, authorTags, date, user, ficId },
// ) => ({
//   when: actions(
//     [
//       Requesting.request,
//       {
//         path: "/Library/submitNewFic",
//         username,
//         password,
//         ficText,
//         ficName,
//         authorTags,
//         date,
//       },
//       { request },
//     ],
//   ),
//   where: async (inputFrames) => {
//     const outputFrames: Frames = new Frames();
//     for (const frame of inputFrames) {
//       const authResult = await authenticateUserInFrame(frame);
//       if (authResult.error || !authResult.user) {
//         outputFrames.push({ ...frame, [errorSym]: authResult.error });
//         continue;
//       }
//       outputFrames.push({ ...frame, [userSym]: authResult.user });
//     }
//     return outputFrames;
//   },
//   then: actions(
//     // 1. Submit the new fic
//     [
//       Library.submitNewFic,
//       { user, ficText, ficName, authorTags, date },
//       { ficId }, // Library.submitNewFic returns { ficId: ID }
//     ],
//     // 2. Trigger categorization for the new fic
//     [Categorizing.categorizeFic, { ficId, ficText, authorTags }],
//     // 3. Respond to the original request
//     [Requesting.respond, { request, ficId }],
//   ),
// });

/**
 * Sync: SubmitNewFicRequestByUserId
 * Purpose: Handles request to submit a new fic when the frontend sends a user id
 *          instead of username/password. This matches the existing frontend API
 *          that posts { user, ficText, ficName, authorTags, date }.
 *
 * Expected HTTP endpoint: POST /api/Library/submitNewFic
 */
export const SubmitNewFicRequestByUserId: Sync = (
  { request, user, ficText, ficName, authorTags, date },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/submitNewFic", user, ficText, ficName, authorTags, date },
      { request },
    ],
  ),
  then: actions(
    // Submit the new fic
    [Library.submitNewFic, { user, ficText, ficName, authorTags, date }],
  ),
});

/**
 * Sync: SubmitNewFicResponse
 * Purpose: After the fic is created, categorize it and respond to the request.
 */
export const SubmitNewFicResponse: Sync = (
  { request, ficId, ficText, authorTags },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic", ficText, authorTags }, { request }],
    [Library.submitNewFic, {}, { ficId }],
  ),
  then: actions(
    // Trigger categorization for the new fic
    [Categorizing.categorizeFic, { ficId, ficText, authorTags }],
    // Respond to the original request
    [Requesting.respond, { request, ficId }],
  ),
});

/**
 * Sync: SubmitNewFicError
 * Purpose: Handle errors from submitNewFic (e.g., duplicate fic name)
 */
export const SubmitNewFicError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Library.submitNewFic, {}, { error }],
  ),
  then: actions(
    // Map the response 'error' field to the bound errorSym
    [Requesting.respond, { request, error: errorSym }],
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
 * Sync: SubmitNewVersionRequestByUserId
 * Purpose: Handles request to submit a new version when the frontend sends a user id.
 *
 * Expected HTTP endpoint: POST /api/Library/submitNewVersionOfFanfic
 */
export const SubmitNewVersionRequestByUserId: Sync = (
  { request, user, ficText, authorTags, versionTitle, date, ficName },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/submitNewVersionOfFanfic", user, ficText, authorTags, versionTitle, date, ficName },
      { request },
    ],
  ),
  then: actions(
    [Library.submitNewVersionOfFanfic, { user, ficText, authorTags, versionTitle, date, ficName }],
  ),
});

/**
 * Sync: SubmitNewVersionResponse
 * Purpose: After the new version is created, categorize it and respond to the request.
 */
export const SubmitNewVersionResponse: Sync = (
  { request, versionId, ficText, authorTags },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic", ficText, authorTags }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { versionId }],
  ),
  then: actions(
    // versionId is the ID of the newly created fic (not the version container)
    [Categorizing.categorizeFic, { ficId: versionId, ficText, authorTags }],
    [Requesting.respond, { request, versionId }],
  ),
});

/**
 * Sync: SubmitNewVersionError
 * Purpose: Handle errors from submitNewVersionOfFanfic
 */
export const SubmitNewVersionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error: errorSym }],
  ),
});

/**
 * Sync: ViewFicRequest
 * Purpose: Handles request to view a specific fic revision.
 *
 * Request Payload Example:
 * {
 *   "user": "user_id_123",
 *   "ficName": "My First Story",
 *   "versionNumber": 0
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/_viewFic
 */
export const ViewFicRequest: Sync = (
  { request, user, ficName, versionNumber, fic },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/_viewFic", user, ficName, versionNumber },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      // Access values bound by the 'when' clause via their variable symbols
      const userId = frame[user] as ID;
      const ficNameVal = frame[ficName] as string;
      const versionNumberVal = frame[versionNumber] as number;

      // Query the fic
      const ficResult = await Library._viewFic({
        user: userId,
        ficName: ficNameVal,
        versionNumber: versionNumberVal,
      });

      if ("error" in ficResult) {
        outputFrames.push({ ...frame, [errorSym]: ficResult.error });
        continue;
      }

      // Extract fic from array result
      const ficData = (ficResult[0] as { fic: Fic }).fic;

      // Bind fic data under the same variable symbol used in then/respond
      outputFrames.push({ ...frame, [fic]: ficData });
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, fic }],
  ),
});

/**
 * Sync: DeleteFicByUserIdSuccess
 * Purpose: Handles deletion when user ID is provided directly (user already authenticated in frontend).
 *
 * Request Payload Example:
 * {
 *   "user": "user_id_123",
 *   "ficName": "My First Story",
 *   "versionNumber": 0
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/deleteFic
 */
export const DeleteFicByUserIdSuccess: Sync = (
  { request, user, ficName, versionNumber, ficId },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/Library/deleteFic",
        user,
        ficName,
        versionNumber,
      },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const userVal = frame[user] as ID;
      const ficNameVal = frame[ficName] as string;
      const versionNumberVal = frame[versionNumber] as number;

      // Get the fic to get its ID before deletion
      const viewFicResult = await Library._viewFic({
        user: userVal,
        ficName: ficNameVal,
        versionNumber: versionNumberVal,
      });

      if ("error" in viewFicResult) {
        // Skip error frames (let DeleteFicByUserIdError handle them)
        continue;
      }

      const fic = (viewFicResult[0] as { fic: Fic }).fic;

      // Only pass through successful frames
      outputFrames.push({
        ...frame,
        [ficId]: fic._id,  // Use ficId symbol from parameters, not ficIdSym
      });
    }
    return outputFrames;
  },
  then: actions(
    // 1. Delete the fic from Library
    [Library.deleteFic, { user, ficName, versionNumber }],
    // 2. Cascade delete in Categorizing
  [Categorizing.deleteFicCategory, { ficId }, {}],
    // 3. Respond to the original request
    [Requesting.respond, { request, ficId }],
  ),
});

/**
 * Sync: DeleteFicByUserIdError
 * Purpose: Handles errors when deleting by user ID fails.
 */
export const DeleteFicByUserIdError: Sync = (
  { request, user, ficName, versionNumber, error: _error },
) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/Library/deleteFic",
        user,
        ficName,
        versionNumber,
      },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const userVal = frame[user] as ID;
      const ficNameVal = frame[ficName] as string;
      const versionNumberVal = frame[versionNumber] as number;

      // Get the fic to check if it exists
      const viewFicResult = await Library._viewFic({
        user: userVal,
        ficName: ficNameVal,
        versionNumber: versionNumberVal,
      });

      if ("error" in viewFicResult) {
        // Pass through error frames
        outputFrames.push({ ...frame, [errorSym]: viewFicResult.error });
        continue;
      }

      // Skip successful frames (let DeleteFicByUserIdSuccess handle them)
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, error: errorSym }],
  ),
});

// /**
//  * Sync: DeleteFicSuccess
//  * Purpose: Handles successful deletion of a fic after authentication and ownership verification.
//  *
//  * Request Payload Example:
//  * {
//  *   "username": "testuser",
//  *   "password": "password123",
//  *   "ficName": "My First Story",
//  *   "versionNumber": 0
//  * }
//  *
//  * Expected HTTP endpoint: POST /api/Library/deleteFic
//  */
// export const DeleteFicSuccess: Sync = (
//   { request, username, password, ficName, versionNumber, user, ficId },
// ) => ({
//   when: actions(
//     [
//       Requesting.request,
//       {
//         path: "/Library/deleteFic",
//         username,
//         password,
//         ficName,
//         versionNumber,
//       },
//       { request },
//     ],
//   ),
//   where: async (inputFrames) => {
//     const outputFrames: Frames = new Frames();
//     for (const frame of inputFrames) {
//       const authResult = await authenticateUserInFrame(frame);
//       if (authResult.error || !authResult.user) {
//         // Skip frames with auth errors (let DeleteFicError handle them)
//         continue;
//       }
//       const authenticatedUser = authResult.user;

//       // Get the fic to ensure ownership and get its ID before deletion
//       const ficResult = await getOwnedFic(frame, authenticatedUser);
//       if (ficResult.error || !ficResult.fic) {
//         // Skip frames with ownership errors (let DeleteFicError handle them)
//         continue;
//       }

//       // Only pass through successful frames
//       outputFrames.push({
//         ...frame,
//         [userSym]: authenticatedUser,
//         [ficIdSym]: ficResult.fic._id, // Bind ficId of the one to be deleted
//       });
//     }
//     return outputFrames;
//   },
//   then: actions(
//     // 1. Delete the fic from Library (use ficId from where clause, not from action output)
//     [Library.deleteFic, { user, ficName, versionNumber }],
//     // 2. Cascade delete in Categorizing
//   [Categorizing.deleteFicCategory, { ficId }, {}],
//     // 3. Respond to the original request
//     [Requesting.respond, { request, ficId }],
//   ),
// });

// /**
//  * Sync: DeleteFicError
//  * Purpose: Handles errors when deleting a fic fails (authentication or ownership issues).
//  */
// export const DeleteFicError: Sync = (
//   { request, username, password, ficName, versionNumber, error: _error },
// ) => ({
//   when: actions(
//     [
//       Requesting.request,
//       {
//         path: "/Library/deleteFic",
//         username,
//         password,
//         ficName,
//         versionNumber,
//       },
//       { request },
//     ],
//   ),
//   where: async (inputFrames) => {
//     const outputFrames: Frames = new Frames();
//     for (const frame of inputFrames) {
//       const authResult = await authenticateUserInFrame(frame);
//       if (authResult.error || !authResult.user) {
//         // Pass through auth errors
//         outputFrames.push({ ...frame, [errorSym]: authResult.error });
//         continue;
//       }
//       const authenticatedUser = authResult.user;

//       // Get the fic to ensure ownership
//       const ficResult = await getOwnedFic(frame, authenticatedUser);
//       if (ficResult.error || !ficResult.fic) {
//         // Pass through ownership errors
//         outputFrames.push({ ...frame, [errorSym]: ficResult.error });
//         continue;
//       }

//       // Skip successful frames (let DeleteFicSuccess handle them)
//     }
//     return outputFrames;
//   },
//   then: actions(
//     [Requesting.respond, { request, error: errorSym }],
//   ),
// });

/**
 * Sync: DeleteFicsAndUserCascadingDeleteCategorizing
 * Purpose: Ensures that when `Library.deleteFicsAndUser` is called (which is
 *          already a cascade from `UserAuthentication.deleteUser`), it further
 *          cascades to delete relevant categorization data.
 *
 * Note: This sync is triggered *after* UserAuthentication.deleteUser and Library.deleteFicsAndUser
 *       have already fired. The `ficIds` are gathered in the DeleteUserSuccess sync's where clause.
 */
export const DeleteFicsAndUserCascadingDeleteCategorizing: Sync = (
  { user, ficIds },
) => ({
  when: actions(
    [UserAuthentication.deleteUser, {}, { user }], // When user is deleted from auth
    [Library.deleteFicsAndUser, { user }, {}], // And their library is deleted (explicit empty output)
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const userId = frame[userSym] as ID;

      // Collect all fic IDs for this user BEFORE they're deleted
      // Note: This might fail if Library already deleted, but we try anyway
      const getAllVersionsResult = await Library._getAllUserVersions({ user: userId });

      const userFicIds: ID[] = [];
      if (!("error" in getAllVersionsResult)) {
        const versions: Version[] = (getAllVersionsResult[0] as { versions: Version[] }).versions;
        for (const version of versions) {
          for (const fic of version.fics) {
            userFicIds.push(fic._id);
          }
        }
      }

      // Only push frames that have ficIds to delete
      if (userFicIds.length > 0) {
        outputFrames.push({ ...frame, [ficIdsSym]: userFicIds });
      }
    }
    return outputFrames;
  },
  then: actions(
    [Categorizing.deleteFicCategories, { ficIds }, {}],
  ),
});

/**
 * Sync: ViewVersionRequest
 * Purpose: Handles request to view a specific fic version (all revisions).
 *
 * Request Payload Example:
 * {
 *   "user": "user_id_123",
 *   "versionTitle": "My First Story"
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/_getVersion
 */
export const ViewVersionRequest: Sync = (
  { request, user, versionTitle, version },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/_getVersion", user, versionTitle },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const userId = frame[user] as ID;
      const versionTitleVal = frame[versionTitle] as string;

      const versionResult = await Library._getVersion({
        user: userId,
        versionTitle: versionTitleVal,
      });

      if ("error" in versionResult) {
        outputFrames.push({ ...frame, [errorSym]: versionResult.error });
        continue;
      }

      // Extract version from array result
      const versionData = (versionResult[0] as { version: Version }).version;

      outputFrames.push({ ...frame, [version]: versionData });
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, version }],
  ),
});

/**
 * Sync: DeleteVersionByUserIdSuccess
 * Purpose: Handles deletion of an entire version when user ID is provided directly.
 *
 * Request Payload Example:
 * {
 *   "user": "user_id_123",
 *   "ficTitle": "My First Story"
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/deleteVersion
 */
export const DeleteVersionByUserIdSuccess: Sync = (
  { request, user, ficTitle, versionId, ficIds },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/deleteVersion", user, ficTitle },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const userVal = frame[user] as ID;
      const ficTitleVal = frame[ficTitle] as string;

      // Get all versions for the user
      const allVersionsResult = await Library._getAllUserVersions({ user: userVal });

      if ("error" in allVersionsResult) {
        // Skip error frames
        continue;
      }

      const versions = (allVersionsResult[0] as { versions: Version[] }).versions;
      const versionToDelete = versions.find((v: Version) => v.title === ficTitleVal);

      if (!versionToDelete) {
        // Skip if version not found
        continue;
      }

      const ficsInVersion = versionToDelete.fics.map((fic: Fic) => fic._id);

      outputFrames.push({
        ...frame,
        [versionId]: versionToDelete._id,
        [ficIds]: ficsInVersion,
      });
    }
    return outputFrames;
  },
  then: actions(
    // 1. Delete the version from Library
    [Library.deleteVersion, { user, ficTitle }],
    // 2. Cascade delete in Categorizing for all fics in that version
  [Categorizing.deleteFicCategories, { ficIds }, {}],
    // 3. Respond to the original request
    [Requesting.respond, { request, versionId }],
  ),
});

/**
 * Sync: DeleteVersionByUserIdError
 * Purpose: Handles errors when deleting version by user ID fails.
 */
export const DeleteVersionByUserIdError: Sync = (
  { request, user, ficTitle, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/deleteVersion", user, ficTitle },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const userVal = frame[user] as ID;
      const ficTitleVal = frame[ficTitle] as string;

      // Get all versions for the user
      const allVersionsResult = await Library._getAllUserVersions({ user: userVal });

      if ("error" in allVersionsResult) {
        outputFrames.push({ ...frame, [error]: allVersionsResult.error });
        continue;
      }

      const versions = (allVersionsResult[0] as { versions: Version[] }).versions;
      const versionToDelete = versions.find((v: Version) => v.title === ficTitleVal);

      if (!versionToDelete) {
        outputFrames.push({ ...frame, [error]: `Version with title '${ficTitleVal}' not found.` });
        continue;
      }

      // Skip successful frames
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, error: errorSym }],
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
      const ficsInVersion = versionToDelete.fics.map((fic: Fic) => fic._id);

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
  [Categorizing.deleteFicCategories, { ficIds }, {}],
    // 3. Respond to the original request
    [Requesting.respond, { request, versionId }],
  ),
});

/**
 * Sync: GetAllUserVersionsRequest
 * Purpose: Handles request to get all versions for a user.
 *
 * Request Payload Example:
 * {
 *   "user": "user_id_123"
 * }
 *
 * Expected HTTP endpoint: POST /api/Library/_getAllUserVersions
 */
export const GetAllUserVersionsRequest: Sync = (
  { request, user, versions },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/_getAllUserVersions", user },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
  const userId = frame[user] as ID;

      // Query all versions for the user
      const versionsResult = await Library._getAllUserVersions({
        user: userId,
      });

      if ("error" in versionsResult) {
        // Skip error frames; handled by GetAllUserVersionsError
        continue;
      }

      // Extract versions from array result
      const versionsData = (versionsResult[0] as { versions: Version[] }).versions;

  // Bind directly to the 'versions' parameter symbol so respond won't miss it
  outputFrames.push({ ...frame, [versions]: versionsData });
    }
    return outputFrames;
  },
  then: actions(
  [Requesting.respond, { request, versions }],
  ),
});

/**
 * Sync: GetAllUserVersionsError
 * Purpose: Handles error responses for _getAllUserVersions.
 */
export const GetAllUserVersionsError: Sync = (
  { request, user, error: _error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getAllUserVersions", user }, { request }],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const userId = frame[user] as ID;
      const versionsResult = await Library._getAllUserVersions({ user: userId });
      if ("error" in versionsResult) {
        outputFrames.push({ ...frame, [errorSym]: versionsResult.error });
        continue;
      }
      // Skip successful frames; handled by GetAllUserVersionsRequest
    }
    return outputFrames;
  },
  then: actions(
    // Map error field to bound errorSym to prevent missing binding
    [Requesting.respond, { request, error: errorSym }],
  ),
});
