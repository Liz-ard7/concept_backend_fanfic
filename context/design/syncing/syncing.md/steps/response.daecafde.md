---
timestamp: 'Fri Nov 07 2025 18:44:58 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_184458.db111d5e.md]]'
content_id: daecafdec51372d68ff1858e4f9d19661d881aabbe2fc7d32e1a3668ba8b0c0f
---

# response:

The decision to include or exclude a concept action from direct passthrough routes (`/api/{concept}/{action}`) primarily depends on whether the action requires pre-conditions (like authentication, authorization, or other concept interactions) that should be enforced by synchronizations, or if it's a direct, self-contained operation.

Here's a breakdown for each concept:

***

## Concept: Categorizing \[Fic]

**Rationale for Exclusion:** This concept involves heavy backend processing (LLM calls), and its actions should typically be triggered *after* a fic has been submitted (from the `Library` concept) and by an authenticated user. The `Fic` itself is a generic parameter, meaning the actual `Fic` object will come from another concept (`Library`).

* **`categorizeFic (fic)`:**
  * **Exclude.** This action involves an LLM, which can be computationally expensive and may require rate limiting or specific permissions. It should be triggered by a sync, for example, when a new `Fic` is submitted to the `Library`, or when an admin explicitly requests categorization. It also requires the `fic` to exist first.
* **`_viewFicCategory (fic)`:**
  * **Include.** This is a read-only query. While the `fic` argument might come from an authenticated session (e.g., "view my fic's categorization"), the query itself is benign. Any authorization could be handled by a sync if needed, but for a public-facing system where fics are publicly viewable, their categorizations might also be.
* **`deleteFicCategory (fic)`:**
  * **Exclude.** This is a mutation that alters the state of categorization. It should only be allowed by the owner of the `fic` (as determined by the `Library` concept) or an administrator. This requires authorization via synchronizations.
* **`deleteFicCategories (deletedCount: number)`:**
  * **Exclude.** This is a mass deletion action. It should almost certainly be restricted to administrative roles and triggered by a very specific backend process, not a direct API call.

***

## Concept: Library \[User]

**Rationale for Exclusion:** Almost all actions in `Library` involve a `User` parameter, implying that these actions are specific to an authenticated user and their content. Direct passthrough would bypass necessary authentication and authorization checks. `addUser` is a prime example of an action that should be internally managed and triggered by `UserAuthentication`.

* **`addUser (user)`:**
  * **Exclude.** This action should *not* be directly callable from the frontend. It should be automatically triggered by a synchronization whenever a new user successfully registers with the `UserAuthentication` concept. This ensures that the `Library` state is consistent with `UserAuthentication`.
* **`submitNewFic (user, ficText: string, ficName: string, authorTags: String, date) : (fic)`:**
  * **Exclude.** This is a core user action, but it requires the `user` to be authenticated and authorized. A synchronization would first verify the session (e.g., from a `Sessioning` concept) to get the `user` ID, and *then* trigger this action.
* **`submitNewVersionOfFanfic (user, ficText: string, authorTags: string, version, date, ficName: string) : (version)`:**
  * **Exclude.** Similar to `submitNewFic`, this requires an authenticated and authorized user (the original author of the fic) to update their content.
* **`_viewFic (user, ficName: string, versionNumber: Number): (fic)`:**
  * **Exclude.** While a query, it takes a `user` parameter, implying it's used to view *a specific user's* fic. This typically requires the requesting user to be the `user` specified, or to have permission if the fic is private. Authentication and authorization via syncs are necessary.
* **`deleteFic (user, ficName: string, versionNumber: Number): (fic)`:**
  * **Exclude.** This is a destructive mutation. Only the authenticated and authorized owner of the fic should be able to delete it.
* **`deleteFicsAndUser (user)`:**
  * **Exclude.** This is a highly destructive action, deleting all content for a user and implying a user deletion. This should be an orchestrated process via synchronizations, likely in response to a `UserAuthentication.deleteUser` action, ensuring all related data is cleaned up and strong re-authentication is performed.
* **`_getVersion (user, versionTitle: string): (version)`:**
  * **Exclude.** Similar to `_viewFic`, it queries for a specific user's version and requires authorization.
* **`deleteVersion (user, ficTitle: string): (version)`:**
  * **Exclude.** Destructive mutation, requiring authorization.

***

## Concept: UserAuthentication

**Rationale for Inclusion:** These actions are the very entry points for establishing and verifying user identity. While requests for these actions might still go through the `Requesting` concept, the actions themselves are inherently designed to handle the initial authentication/registration logic without needing further authorization wraps (as they *are* the authorization).

* **`register (username: String, password: String): (user)`:**
  * **Include.** This is the primary way for new users to enter the system. It defines the core logic of creating a user account.
* **`authenticate (username: String, password: String): (user)`:**
  * **Include.** This is the primary way for existing users to prove their identity. It defines the core logic of logging in.
* **`deleteUser (username: String, password: String): (user)`:**
  * **Exclude.** While related to user identity, deleting a user is a significant and destructive action. It should involve re-authentication to confirm the deletion request (which the sync can handle) and also trigger cascade deletions in other concepts (like `Library`, `Sessioning`, `Categorizing`). Orchestrating these side effects and ensuring proper re-authentication before deletion makes it a strong candidate for exclusion and sync-mediation.

***

## Summary of Inclusions/Exclusions:

### `Categorizing` Concept:

* **Include:** `_viewFicCategory`
* **Exclude:** `categorizeFic`, `deleteFicCategory`, `deleteFicCategories`

### `Library` Concept:

* **Exclude:** `addUser`, `submitNewFic`, `submitNewVersionOfFanfic`, `_viewFic`, `deleteFic`, `deleteFicsAndUser`, `_getVersion`, `deleteVersion`

### `UserAuthentication` Concept:

* **Include:** `register`, `authenticate`
* **Exclude:** `deleteUser`
