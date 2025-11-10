import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Library, Categorizing as _Categorizing, Requesting } from "@concepts";
import { ID } from "@utils/types.ts";
import { Version } from "@concepts/Library/LibraryConcept.ts"; // Import types for manual query processing

// Define Symbols for variables used in frames
const userSym = Symbol("user");
const ficIdsSym = Symbol("ficIds"); // To collect all fic IDs for cascading delete
const errorSym = Symbol("error"); // For propagating errors

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
/**
 * Sync: DeleteUserSuccess
 * Purpose: Authenticates the user, collects all ficIds, deletes the user and their library,
 *          triggers categorizing cleanup, and responds.
 */
export const DeleteUserSuccess: Sync = (
  { request, username, password },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser", username, password }, { request }],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      // Extract username and password using the symbols created by the parameters
      const usernameValue = frame[username] as string;
      const passwordValue = frame[password] as string;

      if (!usernameValue || !passwordValue) {
        // Skip frames without credentials
        continue;
      }

      // Authenticate directly with the values
      const authResult = await UserAuthentication.authenticate({ username: usernameValue, password: passwordValue });
      if ("error" in authResult) {
        // Skip error frames; handled by DeleteUserError
        continue;
      }

      const authenticatedUser = authResult.user;
      // Collect fic IDs before deletion
      const getAllVersionsResult = await Library._getAllUserVersions({ user: authenticatedUser });
      const userFicIds: ID[] = [];
      if (!("error" in getAllVersionsResult)) {
        const versions: Version[] = (getAllVersionsResult[0] as { versions: Version[] }).versions;
        for (const version of versions) {
          for (const fic of version.fics) {
            userFicIds.push(fic._id);
          }
        }
      }

      outputFrames.push({ ...frame, [userSym]: authenticatedUser, [ficIdsSym]: userFicIds });
    }
    return outputFrames;
  },
  then: actions(
    [UserAuthentication.deleteUser, { username, password }, { user: userSym }],
      [Library.deleteFicsAndUser, { user: userSym }, {}],
      [_Categorizing.deleteFicCategories, { ficIds: ficIdsSym }, {}],
    [Requesting.respond, { request, user: userSym }],
  ),
});/**
 * Sync: DeleteUserError
 * Purpose: Returns an error immediately when authentication fails.
 */
export const DeleteUserError: Sync = (
  { request, username, password },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser", username, password }, { request }],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      // Extract username and password using the symbols created by the parameters
      const usernameValue = frame[username] as string;
      const passwordValue = frame[password] as string;

      if (!usernameValue || !passwordValue) {
        outputFrames.push({ ...frame, [errorSym]: "Username and password are required for authentication." });
        continue;
      }

      // Authenticate directly with the values
      const authResult = await UserAuthentication.authenticate({ username: usernameValue, password: passwordValue });
      if ("error" in authResult) {
        outputFrames.push({ ...frame, [errorSym]: `Authentication failed: ${authResult.error}` });
        continue;
      }
      // Skip successful frames; handled by DeleteUserSuccess
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, error: errorSym }],
  ),
});
