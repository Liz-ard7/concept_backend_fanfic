---
timestamp: 'Fri Nov 07 2025 23:03:34 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_230334.de5b1ea6.md]]'
content_id: fc41973bceeaa5f96f38038918672603f4ba059cdd5e5677b0775a71fc18e549
---

# response:

Okay, let's implement the synchronizations for the excluded actions and queries, following the established concept design principles and the provided constraints (no new concepts, no code modification for existing concepts, `Requesting` for entry points, no `Sessioning` concept).

Given the privacy constraint ("libraries are NOT publicly visible-- a user's fics, versions, and tags should remain hidden to all but the user who created them"), all `Library` and `Categorizing` actions that deal with user data will require authorization. Since no `Sessioning` concept is available, we will assume that the `Requesting.request` action provides a `userId` parameter in its payload, which represents the currently authenticated user. We will then use this `userId` to verify ownership or apply actions.

I will put all synchronizations in a single file `src/syncs/app_syncs.sync.ts` for clarity in this response.

***

### `src/concepts/Requesting/passthrough.ts` (Update)

First, based on our decisions, we need to update the `passthrough.ts` file to explicitly exclude the chosen routes and include the ones that remain.

```typescript
// file: src/concepts/Requesting/passthrough.ts

export const exclusions = [
  // UserAuthentication
  "/UserAuthentication/deleteUser", // Excluded: requires cascades

  // Library - ALL ACTIONS/QUERIES EXCLUDED DUE TO PRIVACY
  "/Library/addUser",
  "/Library/submitNewFic",
  "/Library/submitNewVersionOfFanfic",
  "/Library/_viewFic",
  "/Library/deleteFic",
  "/Library/deleteFicsAndUser",
  "/Library/_getVersion",
  "/Library/deleteVersion",
  "/Library/_getAllUserVersions",

  // Categorizing - ALL ACTIONS/QUERIES EXCLUDED DUE TO PRIVACY / INTERNAL NATURE
  "/Categorizing/categorizeFic",
  "/Categorizing/_viewFicCategory",
  "/Categorizing/deleteFicCategory",
  "/Categorizing/deleteFicCategories",
  "/Categorizing/_getAllFicCategories", // This is a system-level query, should not be exposed via HTTP.
];

export const inclusions = {
  // UserAuthentication - Publicly accessible for login/registration
  "/UserAuthentication/register": "Allows new users to create an account.",
  "/UserAuthentication/authenticate": "Allows existing users to log in.",
  // Add other intentionally public/passthrough routes here if any
};
```

***

### `src/syncs/app_syncs.sync.ts` (New File)

```typescript
// file: src/syncs/app_syncs.sync.ts

import { actions, Frames, Sync } from "@engine";
import { UserAuthentication, Library, Categorizing, Requesting } from "@concepts";
import { ID } from "@utils/types.ts";

// --- Helper for Authorization: Check Fic Ownership ---
// Since Library does not have a direct _getFicOwner(ficId) query,
// we need to implement a "where" clause pattern to verify fic ownership.
// This function encapsulates that logic.
const checkFicOwnership = async (
  frames: Frames,
  ficIdSymbol: symbol, // The symbol for the ficId variable in the frame
  userIdSymbol: symbol, // The symbol for the userId variable in the frame
): Promise<Frames> => {
  // Ensure we have a ficId and userId to work with
  if (!frames.every(($) => $[ficIdSymbol] && $[userIdSymbol])) {
    return new Frames(); // If any frame is missing necessary IDs, filter it out
  }

  // To check ownership of a ficId, we need to:
  // 1. Get all versions for the given userId.
  // 2. Iterate through all fics in those versions to find if the ficId matches.
  frames = await frames.query(
    Library._getAllUserVersions,
    { user: userIdSymbol },
    { versions: "userVersions" }, // Alias to avoid collision with any other 'versions' variable
  );

  return frames.filter(($) => {
    const targetFicId = $[ficIdSymbol];
    const userVersions = ($["userVersions"] as { versions: any[] }).versions; // Cast to access 'versions' array
    if (!userVersions) return false;

    // Check if any fic within the user's versions matches the target ficId
    return userVersions.some((version) =>
      version.fics.some((fic: { _id: ID }) => fic._id === targetFicId)
    );
  });
};

// --- UserAuthentication Syncs ---

// 1. DeleteUser Request
export const DeleteUserRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuthentication/deleteUser", username, password },
    { request },
  ]),
  then: actions([UserAuthentication.deleteUser, { username, password }]),
});

// 2. DeleteUser Response (Success)
export const DeleteUserResponse: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
    [UserAuthentication.deleteUser, {}, { user }],
  ),
  then: actions([Requesting.respond, { request, user }]),
});

// 3. DeleteUser Response (Error)
export const DeleteUserResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/deleteUser" }, { request }],
    [UserAuthentication.deleteUser, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// 4. Cascade: Initialize Library for New User
// Triggered when a new user registers. No external HTTP request for this.
export const InitializeLibraryForNewUser: Sync = ({ user }) => ({
  when: actions([UserAuthentication.register, {}, { user }]),
  then: actions([Library.addUser, { user }]),
});

// 5. Cascade: Delete Library for User
// Triggered when a user is deleted. This deletes all their fics and versions.
export const CascadeLibraryDeletionOnUserDelete: Sync = ({ user }) => ({
  when: actions([UserAuthentication.deleteUser, {}, { user }]),
  then: actions([Library.deleteFicsAndUser, { user }]),
});

// --- Library Syncs ---

// Since 'Library.addUser' is only triggered internally (by UserAuthentication.register),
// it doesn't need external Requesting syncs.

// 6. SubmitNewFic Request (with Authorization)
export const SubmitNewFicRequest: Sync = (
  { request, userId, ficText, ficName, authorTags, date },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/submitNewFic",
      userId,
      ficText,
      ficName,
      authorTags,
      date,
    },
    { request },
  ]),
  // Authorization is implicit here: assume userId in the request is the authenticated user.
  // The 'user: userId' mapping ensures action is for *this* user.
  then: actions([
    Library.submitNewFic,
    { user: userId, ficText, ficName, authorTags, date },
  ]),
});

// 7. SubmitNewFic Response (Success)
export const SubmitNewFicResponse: Sync = ({ request, ficId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Library.submitNewFic, {}, { ficId }],
  ),
  then: actions([Requesting.respond, { request, ficId }]),
});

// 8. SubmitNewFic Response (Error)
export const SubmitNewFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewFic" }, { request }],
    [Library.submitNewFic, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// 9. Cascade: Categorize New Fic
export const CategorizeNewFic: Sync = (
  { userId, ficId, ficText, authorTags },
) => ({
  when: actions(
    // Capture necessary data from the initial request for Categorizing.categorizeFic
    [Requesting.request, { path: "/Library/submitNewFic", ficText, authorTags }, {}],
    [Library.submitNewFic, { user: userId }, { ficId }], // Trigger after fic is successfully submitted
  ),
  then: actions([
    Categorizing.categorizeFic,
    { ficId, ficText, authorTags },
  ]),
});

// 10. SubmitNewVersionOfFanfic Request (with Authorization)
export const SubmitNewVersionRequest: Sync = (
  { request, userId, ficText, authorTags, versionTitle, date, ficName },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Library/submitNewVersionOfFanfic",
      userId,
      ficText,
      authorTags,
      versionTitle,
      date,
      ficName,
    },
    { request },
  ]),
  then: actions([
    Library.submitNewVersionOfFanfic,
    {
      user: userId,
      ficText,
      authorTags,
      versionTitle,
      date,
      ficName,
    },
  ]),
});

// 11. SubmitNewVersionOfFanfic Response (Success)
export const SubmitNewVersionResponse: Sync = ({ request, versionId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { versionId }],
  ),
  then: actions([Requesting.respond, { request, versionId }]),
});

// 12. SubmitNewVersionOfFanfic Response (Error)
export const SubmitNewVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/submitNewVersionOfFanfic" }, { request }],
    [Library.submitNewVersionOfFanfic, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// 13. Cascade: Categorize Updated Fic
export const CategorizeUpdatedFic: Sync = (
  { request, userId, versionTitle, ficText, authorTags, ficId },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/submitNewVersionOfFanfic", userId, versionTitle, ficText, authorTags },
      { request },
    ],
    [Library.submitNewVersionOfFanfic, { user: userId, versionTitle }, {}], // Action completion provides versionId implicitly in original frame
  ),
  where: async (frames) => {
    // Get the updated version to find the latest fic's ID, text, and authorTags
    // Use the userId and versionTitle from the 'when' clause to query the library
    frames = await frames.query(
      Library._getVersion,
      { user: userId, versionTitle },
      { version: "fullVersion" }, // Get the full version object
    );
    // Extract the latest fic from the retrieved version
    return frames.map(($) => {
      const fullVersion = ($["fullVersion"] as { version: any }).version;
      const latestFic = fullVersion?.fics.at(-1); // Assuming the last fic is the newest revision
      if (latestFic) {
        // Bind the ficId, ficText, and authorTags of the latest fic
        return {
          ...$,
          [ficId]: latestFic._id,
          [ficText]: latestFic.text, // Overwrite if needed, or ensure it matches the request
          [authorTags]: latestFic.authorTags, // Overwrite if needed, or ensure it matches the request
        };
      }
      return null;
    }).filter(Boolean) as Frames;
  },
  then: actions([
    Categorizing.categorizeFic,
    { ficId, ficText, authorTags },
  ]),
});

// 14. ViewFic Request (with Authorization)
export const ViewFicRequest: Sync = (
  { request, userId, ficName, versionNumber },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/_viewFic", userId, ficName, versionNumber },
    { request },
  ]),
  // Authorization is implicit here: userId from request matches user param.
  // Further checks can be added in `where` if needed, e.g., if ficName maps to a different owner.
  // For this scenario, we assume userId in request is the owner.
  then: actions([
    Library._viewFic,
    { user: userId, ficName, versionNumber },
  ]),
});

// 15. ViewFic Response (Success)
export const ViewFicResponse: Sync = ({ request, fic }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic" }, { request }],
    [Library._viewFic, {}, { fic }],
  ),
  then: actions([Requesting.respond, { request, fic }]),
});

// 16. ViewFic Response (Error)
export const ViewFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_viewFic" }, { request }],
    [Library._viewFic, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// 17. DeleteFic Request (with Authorization)
export const DeleteFicRequest: Sync = (
  { request, userId, ficName, versionNumber },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/deleteFic", userId, ficName, versionNumber },
    { request },
  ]),
  then: actions([
    Library.deleteFic,
    { user: userId, ficName, versionNumber },
  ]),
});

// 18. DeleteFic Response (Success)
export const DeleteFicResponse: Sync = ({ request, ficId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
    [Library.deleteFic, {}, { ficId }],
  ),
  then: actions([Requesting.respond, { request, ficId }]),
});

// 19. DeleteFic Response (Error)
export const DeleteFicResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteFic" }, { request }],
    [Library.deleteFic, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// 20. Cascade: Delete Categorization for Fic on Fic Deletion
export const CascadeCategorizationDeletionOnFicDelete: Sync = ({ ficId }) => ({
  when: actions([Library.deleteFic, {}, { ficId }]),
  then: actions([Categorizing.deleteFicCategory, { ficId }]),
});

// 21. GetVersion Request (with Authorization)
export const GetVersionRequest: Sync = (
  { request, userId, versionTitle },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/_getVersion", userId, versionTitle },
    { request },
  ]),
  then: actions([Library._getVersion, { user: userId, versionTitle }]),
});

// 22. GetVersion Response (Success)
export const GetVersionResponse: Sync = ({ request, version }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion" }, { request }],
    [Library._getVersion, {}, { version }],
  ),
  then: actions([Requesting.respond, { request, version }]),
});

// 23. GetVersion Response (Error)
export const GetVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getVersion" }, { request }],
    [Library._getVersion, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// 24. DeleteVersion Request (with Authorization)
export const DeleteVersionRequest: Sync = (
  { request, userId, ficTitle },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/deleteVersion", userId, ficTitle },
    { request },
  ]),
  // The actual deletion of the version happens AFTER the categorization cleanup, in the 'then' of the cascade sync below.
  // This sync only triggers the process.
  then: actions([]), // No direct action here, it's orchestrated by the cascade below.
});

// 25. DeleteVersion Response (Success)
export const DeleteVersionResponse: Sync = ({ request, versionId }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
    // This is tricky: we respond *after* the cascade completes.
    // The `Library.deleteVersion` action itself returns `versionId`.
    // The previous sync for `DeleteVersionRequest` doesn't call `Library.deleteVersion` directly.
    // So the `versionId` will come from `CascadeCategorizationDeletionAndVersionDelete`'s `then` clause.
    [Library.deleteVersion, {}, { versionId }],
  ),
  then: actions([Requesting.respond, { request, versionId }]),
});

// 26. DeleteVersion Response (Error)
export const DeleteVersionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/deleteVersion" }, { request }],
    [Library.deleteVersion, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// 27. Cascade: Delete Categorization for all Fics in Version, then delete Version
// This sync is complex because it needs to get fic IDs *before* the version is deleted.
export const CascadeCategorizationDeletionAndVersionDelete: Sync = (
  { request, userId, ficTitle, ficIdsToDelete },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/deleteVersion", userId, ficTitle },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the version object to extract all fic IDs *before* deletion
    frames = await frames.query(
      Library._getVersion,
      { user: userId, versionTitle: ficTitle },
      { version: "fullVersion" },
    );

    // If no version found (e.g., already deleted or never existed), filter out this frame
    if (frames.length === 0) {
      return new Frames();
    }

    // 2. Extract all fic IDs from the 'fullVersion' for the first (and likely only) frame.
    //    We need to collect these IDs into an array for `Categorizing.deleteFicCategories`.
    const ficIds: ID[] = [];
    const firstFrame = frames[0];
    const versionData = (firstFrame["fullVersion"] as { version: any }).version;
    if (versionData?.fics) {
      versionData.fics.forEach((fic: { _id: ID }) => ficIds.push(fic._id));
    }

    // Return a single frame with the `ficIdsToDelete` bound as an array.
    return new Frames({ ...firstFrame, [ficIdsToDelete]: ficIds });
  },
  then: actions(
    // First, delete categorizations for all fics in the version
    [Categorizing.deleteFicCategories, { ficIds: ficIdsToDelete }],
    // Then, delete the version itself
    [Library.deleteVersion, { user: userId, ficTitle }],
  ),
});

// 28. GetAllUserVersions Request (with Authorization)
export const GetAllUserVersionsRequest: Sync = ({ request, userId }) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/_getAllUserVersions", userId },
    { request },
  ]),
  then: actions([Library._getAllUserVersions, { user: userId }]),
});

// 29. GetAllUserVersions Response (Success)
export const GetAllUserVersionsResponse: Sync = ({ request, versions }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getAllUserVersions" }, { request }],
    [Library._getAllUserVersions, {}, { versions }],
  ),
  then: actions([Requesting.respond, { request, versions }]),
});

// 30. GetAllUserVersions Response (Error)
export const GetAllUserVersionsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/_getAllUserVersions" }, { request }],
    [Library._getAllUserVersions, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Categorizing Syncs ---

// Since 'categorizeFic', 'deleteFicCategory', 'deleteFicCategories' are only triggered internally (cascades),
// they don't need external Requesting syncs.
// As discussed, '_getAllFicCategories' is a system-level query and will not have Requesting syncs.

// 31. ViewFicCategory Request (with Authorization)
export const ViewFicCategoryRequest: Sync = (
  { request, userId, ficId },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Categorizing/_viewFicCategory", userId, ficId },
    { request },
  ]),
  where: async (frames) => {
    // Authorization: Verify that the requesting userId owns the ficId
    return await checkFicOwnership(frames, ficId, userId);
  },
  then: actions([Categorizing._viewFicCategory, { ficId }]),
});

// 32. ViewFicCategory Response (Success)
export const ViewFicCategoryResponse: Sync = ({ request, ficCategory }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory" }, { request }],
    [Categorizing._viewFicCategory, {}, { ficCategory }],
  ),
  then: actions([Requesting.respond, { request, ficCategory }]),
});

// 33. ViewFicCategory Response (Error)
export const ViewFicCategoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Categorizing/_viewFicCategory" }, { request }],
    [Categorizing._viewFicCategory, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

```
