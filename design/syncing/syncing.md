# Syncing

[@sync-background](../tools/sync-background.md)

[@CategorizingConcept](../concepts/Categorizing/CategorizingConcept.md)

[@LibraryConcept](../concepts/Library/LibraryConcept.md)

[@UserAuthenticationConcept](../concepts/UserAuthentication/UserAuthenticationConcept.md)

Why exclude actions? Excluding a concept action means that calling /api/concept_c/action_a no longer directly causes Concept_c.action_a to occur. There are primarily two reasons for wanting this. One is that the action should only be permitted under certain conditions (such as when the user has been authenticated); you would implement this with a sync saying that when the request occurs and where some condition holds, then the action itself occurs. Note that in this case the call to /api/concept_c/action_a would likely have to be modified because the request action would include parameters (such as a session token) that the bare concept action does not.

A second reason is that the action is to be handled only by the back end and no longer be available to the front end at all. For example, in a social media app, a notification action might be excluded so that it can be executed automatically in response to a comment being added to a user’s post. Note that in this case the only likely change to the front end (if it was previously executing the notification explicitly) is that some calls are removed.

**Keep in mind that libraries are NOT publicly visible-- a user's fics, versions, and tags should remain hidden to all but the user who created them.**

# Prompt: For these concepts, which actions do you think should be included/excluded?

# response:

Okay, let's go through the actions for `UserAuthentication` and `Library`, considering the principles of concept design (separation of concerns, independence, reusability, completeness, and especially the stated privacy requirement for `Library` content).

### Concept: UserAuthentication

**Purpose**: limit access to stories to known users

*   **`register (username: String, password: String): (user)`**
    *   **Decision:** Included
    *   **Reasoning:** This is typically a public-facing action, as new users need a way to create an account. It doesn't inherently rely on prior authentication. Any subsequent actions that might happen after registration (e.g., creating an empty library entry for the new user) would be handled by synchronizations.

*   **`authenticate (username: String, password: String): (user)`**
    *   **Decision:** Included
    *   **Reasoning:** This is the core login mechanism. Users directly interact with this to prove their identity. It's a foundational check, and the result (a user ID, which would typically be used to establish a session in another concept) is then used by syncs to authorize further actions in other concepts.

*   **`deleteUser (username: String, password: String): (user)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** Deleting a user is a highly sensitive action with significant downstream consequences across all concepts that store user-related data (like `Library`, `Categorizing`, `Sessioning`, etc.). It should not be directly accessible. Instead, a `Requesting.request` for user deletion would trigger a synchronization. This sync would first `authenticate` the user, then trigger `UserAuthentication.deleteUser`, and then *cascade* to delete all associated data in other concepts (e.g., calling `Library.deleteFicsAndUser`).

### Concept: Library

**Purpose**: to contain a user's story (associated with a name, a text, and a set of authorTags) in an orderly list.
**Crucial Constraint**: "Keep in mind that libraries are NOT publicly visible-- a user's fics, versions, and tags should remain hidden to all but the user who created them."

Given this constraint, **all actions in the `Library` concept should be excluded**. They all operate on user-specific, private data and thus require prior authentication and authorization checks. These checks would be performed by synchronizations before allowing the `Library` actions to fire.

*   **`addUser (user)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** This action should be a consequence of a user successfully registering with `UserAuthentication`. A synchronization would ensure that when `UserAuthentication.register` creates a new user, `Library.addUser` is also called to initialize their empty library. It should not be directly callable from the outside.

*   **`submitNewFic (user, ficText: string, ficName: string, authorTags: String, date) : (fic)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** This action requires that the `user` performing the action is the same as the `user` provided in the argument, and that `user` is authenticated. A direct passthrough would allow any authenticated user to create a fic for *any* user ID. A synchronization would take the authenticated `user` from a session and pass it to this action.

*   **`submitNewVersionOfFanfic (user, ficText: string, authorTags: string, version, date, ficName: string) : (version)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** Same reasoning as `submitNewFic`. It modifies a specific user's private content and requires authentication and authorization.

*   **`_viewFic (user, ficName: string, versionNumber: Number): (fic)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** Even though it's a query, the explicit constraint "libraries are NOT publicly visible" means this information is private. It requires authentication and verification that the requesting user matches the `user` argument.

*   **`deleteFic (user, ficName: string, versionNumber: Number): (fic)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** This is a destructive action on private user content. It requires strict authentication and authorization, and may trigger cascading effects (e.g., removing associated `Categorizing` data).

*   **`deleteFicsAndUser (user)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** This is a highly destructive action, typically triggered as part of a comprehensive user account deletion process, orchestrated by a synchronization that starts from `UserAuthentication.deleteUser`. It absolutely requires strong authorization.

*   **`_getVersion (user, versionTitle: string): (version)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** Similar to `_viewFic`, this is a query for private user data and must be protected by authentication and authorization.

*   **`deleteVersion (user, ficTitle: string): (version)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:** A destructive action on private user content, requiring authentication and authorization.

---

### Summary of Inclusions/Exclusions:

**UserAuthentication Concept:**
*   `register`: **Included**
*   `authenticate`: **Included**
*   `deleteUser`: **Excluded**

**Library Concept:**
*   `addUser`: **Excluded**
*   `submitNewFic`: **Excluded**
*   `submitNewVersionOfFanfic`: **Excluded**
*   `_viewFic`: **Excluded**
*   `deleteFic`: **Excluded**
*   `deleteFicsAndUser`: **Excluded**
*   `_getVersion`: **Excluded**
*   `deleteVersion`: **Excluded**

The core idea here is that `UserAuthentication` provides the primitives for identity and login, which are generally public entry points. All actions that deal with *personal, private content* (`Library`) must be protected by synchronizations that leverage the authentication primitives and enforce authorization rules (e.g., "only the author can view/edit/delete their own fic").

# Prompt 2: What about Categorizing Concept?

# response:

Let's analyze the `Categorizing` concept's actions with the same principles, especially considering the privacy constraints and the nature of LLM interactions.

### Concept: Categorizing

**Purpose**: to categorize a text into specific categories (i.e. a story will be categorized into a set of tags). "Categorizing" can also *remove* tags provided by the author if deemed necessary.
**Principle**: A user submits their story and the tags the author has already added to the story. It outputs a list of suggested tags (properly categorized) to add to the story and tells the user if any of their author tags should be removed.
**Key Consideration**: This concept involves LLM calls, which can be resource-intensive and require context (which user's fic?). The output data (suggested tags, tags to remove) is directly related to a user's private fic.

*   **`categorizeFic (fic) : (fic)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:**
        *   **Resource Management:** Calling an LLM is a resource-intensive operation. Direct public access could lead to abuse or high costs. It should only be triggered under controlled circumstances.
        *   **Context and Authorization:** The `fic` parameter is an ID. Without a preceding authentication and authorization step, there's no way to know *whose* `fic` this is, or if the requester has permission to categorize it.
        *   **Triggering Event:** This action is a *consequence* of a user submitting or updating a fic in the `Library` concept. A synchronization would listen for `Library.submitNewFic` or `Library.submitNewVersionOfFanfic` (after authorization checks by other syncs) and then trigger `Categorizing.categorizeFic` with the appropriate `fic` ID. This decouples the AI processing from the initial user request, allowing for asynchronous processing if needed.

*   **`_viewFicCategory (fic) : (ficCategory)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:**
        *   **Privacy:** The categorization results are derived from a user's private fic. The overarching privacy constraint ("libraries are NOT publicly visible") extends to all associated data, including its categorization.
        *   **Authorization:** A direct passthrough would allow anyone to query the categorization for any `fic` ID, potentially exposing private information. A synchronization must ensure that the requesting user is authenticated and is the owner of the `fic` before allowing this query.

*   **`deleteFicCategory (fic) : (ficCategory)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:**
        *   **Privacy and Authorization:** This action deletes data associated with a private fic. It requires strict authentication and authorization to ensure only the owner (or an authorized administrator) can delete it.
        *   **Cascading Effect:** This action is a strong candidate for being triggered as a *cascade* when a fic is deleted from the `Library` (e.g., `Library.deleteFic` occurs, and a sync then calls `Categorizing.deleteFicCategory`). It shouldn't be a standalone, directly accessible action.

*   **`deleteFicCategories (deletedCount: number)`**
    *   **Decision:** **Excluded**
    *   **Reasoning:**
        *   **Mass Destruction:** This action deletes *all* fic categories in the system, irrespective of ownership. This is a highly privileged, administrative, or system-level operation.
        *   **No User Context:** It lacks a `user` parameter, indicating it's not meant for individual user interaction. It should absolutely not be exposed via a passthrough route. If needed, it would be behind heavily restricted administrative APIs or internal system processes.

---

### Summary of Inclusions/Exclusions for `Categorizing` Concept:

*   `categorizeFic`: **Excluded**
*   `_viewFicCategory`: **Excluded**
*   `deleteFicCategory`: **Excluded**
*   `deleteFicCategories`: **Excluded**

In summary, the `Categorizing` concept's actions are all internal-facing operations on sensitive, user-specific data, or powerful system-wide actions. They should be exclusively triggered and protected by synchronizations that manage authorization, resource usage, and orchestrate the flow with other concepts like `Library`.

# Where am I supposed to put the syncs?

# response:

Based on the "Implementing Synchronizations" section of the document:

You should put your synchronization files in the `src/syncs/` directory.

The document states:
"To include them as part of your application, simply write them using a file name of `filename.sync.ts`, and store them anywhere under `src/syncs/` where you may have any number of directories and nesting."

For example:
* `src/syncs/auth.sync.ts`
* `src/syncs/posts.sync.ts`
* `src/syncs/library_categorization.sync.ts` (for syncs orchestrating `Library` and `Categorizing`)

Remember to run `deno run build` after creating new concepts or sync files to ensure the `@concepts` import is properly generated.