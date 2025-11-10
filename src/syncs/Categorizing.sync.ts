import { actions, Sync, Frames } from "@engine";
import { Categorizing, Requesting } from "@concepts";
// import { UserAuthentication, Library, Categorizing, Requesting } from "@concepts";
import { ID } from "@utils/types.ts";
// import { Fic } from "@concepts/Library/LibraryConcept.ts"; // Import Fic type for helper

// Define Symbols for variables used in frames
// const _userSym = Symbol("user");
// const _usernameSym = Symbol("username");
// const _passwordSym = Symbol("password");
// const _requestSym = Symbol("request");
// const _ficIdSym = Symbol("ficId");
// const ficNameSym = Symbol("ficName");
// const versionNumberSym = Symbol("versionNumber");
// const _ficCategorySym = Symbol("ficCategory");

// /**
//  * Helper to authenticate a user given username and password from a frame.
//  * Returns the user ID or an error.
//  */
// async function _authenticateUserInFrame(
//   frame: Record<symbol, unknown>,
// ): Promise<{ user?: ID; error?: string }> {
//   const username = frame[_usernameSym] as string;
//   const password = frame[_passwordSym] as string;

//   if (!username || !password) {
//     return { error: "Username and password are required for authentication." };
//   }

//   const authResult = await UserAuthentication.authenticate({ username, password });
//   if ("error" in authResult) {
//     return { error: `Authentication failed: ${authResult.error}` };
//   }
//   return { user: authResult.user };
// }

// /**
//  * Helper to check if a user owns a specific fic (by ficName/versionNumber)
//  * and returns the fic object, or an error.
//  */
// async function _getOwnedFic(
//   frame: Record<symbol, unknown>,
//   authenticatedUser: ID,
// ): Promise<{ fic?: Fic; error?: string }> {
//   const ficName = frame[ficNameSym] as string;
//   const versionNumber = frame[versionNumberSym] as number;

//   const viewFicResult = await Library._viewFic({
//     user: authenticatedUser,
//     ficName: ficName,
//     versionNumber: versionNumber,
//   });

//   if ("error" in viewFicResult) {
//     return { error: viewFicResult.error };
//   }
//   // _viewFic returns [{ fic: Fic }]
//   return { fic: (viewFicResult[0] as { fic: Fic }).fic };
// }

/**
 * Sync: ViewFicCategorySuccess
 * Purpose: Handles request to view a fic's categorization and responds with the category data on success.
 *
 * Request Payload Example:
 * {
 *   "ficId": "fic_id_123"
 * }
 *
 * Expected HTTP endpoint: POST /api/Categorizing/_viewFicCategory
 */
export const ViewFicCategorySuccess: Sync = (
  { request, ficId, ficCategory },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Categorizing/_viewFicCategory", ficId },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const ficIdVal = frame[ficId] as ID;

      try {
        // Query Categorizing for the fic's category
        const ficCategoryResult = await Categorizing._viewFicCategory({
          ficId: ficIdVal,
        });

        // Only pass through frames where query succeeded
        if (!("error" in ficCategoryResult)) {
          outputFrames.push({
            ...frame,
            [ficCategory]: ficCategoryResult,
          });
        }
      } catch (_err) {
        // Don't pass through frames with exceptions (let Error sync handle it)
      }
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, ficCategory }],
  ),
});

/**
 * Sync: ViewFicCategoryError
 * Purpose: Handles request to view a fic's categorization and responds with an error on failure.
 *
 * Expected HTTP endpoint: POST /api/Categorizing/_viewFicCategory
 */
export const ViewFicCategoryError: Sync = (
  { request, ficId, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Categorizing/_viewFicCategory", ficId },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      const ficIdVal = frame[ficId] as ID;

      try {
        // Query Categorizing for the fic's category
        const ficCategoryResult = await Categorizing._viewFicCategory({
          ficId: ficIdVal,
        });

        // Only pass through frames where query failed
        if ("error" in ficCategoryResult) {
          outputFrames.push({ ...frame, [error]: ficCategoryResult.error });
        }
      } catch (err) {
        // Handle unexpected errors
        const errorMessage = err instanceof Error ? err.message : String(err);
        outputFrames.push({ ...frame, [error]: errorMessage });
      }
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Sync: GetAllFicCategoriesRequest
 * Purpose: Handles request to retrieve all fic categorizations.
 *
 * Request Payload Example:
 * {}
 *
 * Expected HTTP endpoint: POST /api/Categorizing/_getAllFicCategories
 */
export const GetAllFicCategoriesRequest: Sync = (
  { request, ficCategories },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Categorizing/_getAllFicCategories" },
      { request },
    ],
  ),
  where: async (inputFrames) => {
    const outputFrames: Frames = new Frames();
    for (const frame of inputFrames) {
      // Query all fic categories
      const allCategories = await Categorizing._getAllFicCategories();

      // _getAllFicCategories returns FicCategoryDoc[] directly (not wrapped)
      outputFrames.push({
        ...frame,
        [ficCategories]: allCategories,
      });
    }
    return outputFrames;
  },
  then: actions(
    [Requesting.respond, { request, ficCategories }],
  ),
});
