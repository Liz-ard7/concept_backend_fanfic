# Sync Implementation

[@sync-background](../tools/sync-background.md)

[@CategorizingConcept](../concepts/Categorizing/CategorizingConcept.md)

[@LibraryConcept](../concepts/Library/LibraryConcept.md)

[@UserAuthenticationConcept](../concepts/UserAuthentication/UserAuthenticationConcept.md)

[@sample.sync](../../src/syncs/sample.sync.ts)

A new action server. In this assignment, we’re providing you with a similar server, this time embodied in a special concept called Requesting. When this concept is instantiated, it starts up a server that takes requests and either passes them through (like the old server) directly to concepts, or turns them into request actions to be used in syncs. By default, requests are passed through (or “included”), so if you use the action server out of the box it will behave exactly like the old action server. For example, an HTTP request coming into the back end with the route /api/concept_c/action_a will by default call action action_a of concept concept_c.

Alternatively you can list an action as “excluded,” and it will then be turned into a request action. For example, if /api/concept_c/action_a is excluded, an HTTP request coming into the back end with that route will generate the action Requesting.request (that is, the request action of the special Requesting concept) with an argument (called path) set to the string concept_c/action_a. You can then write a sync on this action. If you don’t write a sync, there will be no reaction to the request and it will eventually time out and return an error.

You can also list an action as “included,” which doesn’t affect the behavior (since that’s the default) but records the fact that you intend it to be included so it will stop printing a warning message telling you that it’s been included by default.

**Introducing a sync without affecting the API format**. Suppose you exclude /api/concept_c/action_a and write one or more syncs against the generated request action. For example, in addition to calling concept_c.action_a you might call Notification.notify with some appropriate arguments. Now the same HTTP request will have a new effect, due to the call of the additional action. The back end API has actually changed, but the format of the HTTP request is the same. You may need to update the front end (in this case, perhaps to no longer call an additional notification action) but you won’t need to change the code that makes the original call.

**Introducing a sync that affects the API format**. Some of your changes will change the API format, however, and for those you will need to adjust the front-end calls accordingly. The typical case of this will be for authentication. Suppose you want to ensure that the user is authenticated when attempting to execute concept_c.action_a. To do that you might add a session field to the JSON record that is passed in the body of the /api/concept_c/action_a request. Then your sync can read that as the session argument of the Requesting.request action. This time the front-end call will need to be modified, since the back-end API format has changed, and now requires the session token to be passed in the body of the request.

[@syncing](syncing.md)
syncing provides the decisions of which actions/queries should be included and which should be excluded.

# Prompt: Implement syncs for actions/queries that are excluded.
