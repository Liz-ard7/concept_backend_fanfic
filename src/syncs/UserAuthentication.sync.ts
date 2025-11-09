import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Library, Categorizing, Requesting } from "@concepts";
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
        outputFrames.push({ ...frame, [errorSym]: authResult.error });
        continue;
      }
      const authenticatedUser = authResult.user;

      // 2. Collect all fic IDs for this user from Library BEFORE deleting
      const getAllVersionsResult = await Library._getAllUserVersions({
        user: authenticatedUser,
      });

      const userFicIds: ID[] = [];
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
