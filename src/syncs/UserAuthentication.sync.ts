import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Library, Categorizing as _Categorizing, Requesting } from "@concepts";
import { ID } from "@utils/types.ts";
import { Version } from "@concepts/Library/LibraryConcept.ts"; // Import types for manual query processing

// Define Symbols for variables used in frames
const userSym = Symbol("user");
const usernameSym = Symbol("username");
const passwordSym = Symbol("password");
const _requestSym = Symbol("request");
const ficIdsSym = Symbol("ficIds"); // To collect all fic IDs for cascading delete
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
  { request, username, password, user, ficIds },
) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser", username, password }, { request }],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
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
    [UserAuthentication.deleteUser, { username, password }, { user }],
    [Library.deleteFicsAndUser, { user }],
    [_Categorizing.deleteFicCategories, { ficIds }],
    [Requesting.respond, { request, user }],
  ),
});

/**
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
      const authResult = await authenticateUserInFrame(frame);
      if (authResult.error || !authResult.user) {
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
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
