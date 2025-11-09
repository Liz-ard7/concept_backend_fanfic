---
timestamp: 'Fri Nov 07 2025 22:26:10 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_222610.1cad41b3.md]]'
content_id: 5c21b73a5cc03eab23a0a019101acedc2248e7905eb8cbdc0cde42c101f1b7cc
---

# response:

Okay, let's go through the actions for `UserAuthentication` and `Library`, considering the principles of concept design (separation of concerns, independence, reusability, completeness, and especially the stated privacy requirement for `Library` content).

### Concept: UserAuthentication

**Purpose**: limit access to stories to known users

* **`register (username: String, password: String): (user)`**
  * **Decision:** Included
  * **Reasoning:** This is typically a public-facing action, as new users need a way to create an account. It doesn't inherently rely on prior authentication. Any subsequent actions that might happen after registration (e.g., creating an empty library entry for the new user) would be handled by synchronizations.

* **`authenticate (username: String, password: String): (user)`**
  * **Decision:** Included
  * **Reasoning:** This is the core login mechanism. Users directly interact with this to prove their identity. It's a foundational check, and the result (a user ID, which would typically be used to establish a session in another concept) is then used by syncs to authorize further actions in other concepts.

* **`deleteUser (username: String, password: String): (user)`**
  * **Decision:** **Excluded**
  * **Reasoning:** Deleting a user is a highly sensitive action with significant downstream consequences across all concepts that store user-related data (like `Library`, `Categorizing`, `Sessioning`, etc.). It should not be directly accessible. Instead, a `Requesting.request` for user deletion would trigger a synchronization. This sync would first `authenticate` the user, then trigger `UserAuthentication.deleteUser`, and then *cascade* to delete all associated data in other concepts (e.g., calling `Library.deleteFicsAndUser`).

### Concept: Library

**Purpose**: to contain a user's story (associated with a name, a text, and a set of authorTags) in an orderly list.
**Crucial Constraint**: "Keep in mind that libraries are NOT publicly visible-- a user's fics, versions, and tags should remain hidden to all but the user who created them."

Given this constraint, **all actions in the `Library` concept should be excluded**. They all operate on user-specific, private data and thus require prior authentication and authorization checks. These checks would be performed by synchronizations before allowing the `Library` actions to fire.

* **`addUser (user)`**
  * **Decision:** **Excluded**
  * **Reasoning:** This action should be a consequence of a user successfully registering with `UserAuthentication`. A synchronization would ensure that when `UserAuthentication.register` creates a new user, `Library.addUser` is also called to initialize their empty library. It should not be directly callable from the outside.

* **`submitNewFic (user, ficText: string, ficName: string, authorTags: String, date) : (fic)`**
  * **Decision:** **Excluded**
  * **Reasoning:** This action requires that the `user` performing the action is the same as the `user` provided in the argument, and that `user` is authenticated. A direct passthrough would allow any authenticated user to create a fic for *any* user ID. A synchronization would take the authenticated `user` from a session and pass it to this action.

* **`submitNewVersionOfFanfic (user, ficText: string, authorTags: string, version, date, ficName: string) : (version)`**
  * **Decision:** **Excluded**
  * **Reasoning:** Same reasoning as `submitNewFic`. It modifies a specific user's private content and requires authentication and authorization.

* **`_viewFic (user, ficName: string, versionNumber: Number): (fic)`**
  * **Decision:** **Excluded**
  * **Reasoning:** Even though it's a query, the explicit constraint "libraries are NOT publicly visible" means this information is private. It requires authentication and verification that the requesting user matches the `user` argument.

* **`deleteFic (user, ficName: string, versionNumber: Number): (fic)`**
  * **Decision:** **Excluded**
  * **Reasoning:** This is a destructive action on private user content. It requires strict authentication and authorization, and may trigger cascading effects (e.g., removing associated `Categorizing` data).

* **`deleteFicsAndUser (user)`**
  * **Decision:** **Excluded**
  * **Reasoning:** This is a highly destructive action, typically triggered as part of a comprehensive user account deletion process, orchestrated by a synchronization that starts from `UserAuthentication.deleteUser`. It absolutely requires strong authorization.

* **`_getVersion (user, versionTitle: string): (version)`**
  * **Decision:** **Excluded**
  * **Reasoning:** Similar to `_viewFic`, this is a query for private user data and must be protected by authentication and authorization.

* **`deleteVersion (user, ficTitle: string): (version)`**
  * **Decision:** **Excluded**
  * **Reasoning:** A destructive action on private user content, requiring authentication and authorization.

***

### Summary of Inclusions/Exclusions:

**UserAuthentication Concept:**

* `register`: **Included**
* `authenticate`: **Included**
* `deleteUser`: **Excluded**

**Library Concept:**

* `addUser`: **Excluded**
* `submitNewFic`: **Excluded**
* `submitNewVersionOfFanfic`: **Excluded**
* `_viewFic`: **Excluded**
* `deleteFic`: **Excluded**
* `deleteFicsAndUser`: **Excluded**
* `_getVersion`: **Excluded**
* `deleteVersion`: **Excluded**

The core idea here is that `UserAuthentication` provides the primitives for identity and login, which are generally public entry points. All actions that deal with *personal, private content* (`Library`) must be protected by synchronizations that leverage the authentication primitives and enforce authorization rules (e.g., "only the author can view/edit/delete their own fic").
