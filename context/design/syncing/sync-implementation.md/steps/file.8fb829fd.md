---
timestamp: 'Fri Nov 07 2025 22:26:10 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_222610.1cad41b3.md]]'
content_id: 8fb829fdd4e0332bf7f2a74e373e07f1a8f3490442bc6df71c278a2920a80bcb
---

# file: src\syncs\sample.sync.ts

```typescript
/**
 * Sample synchronizations: feel free to delete this entire file!
 */

import { LikertSurvey, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

export const CreateSurveyRequest: Sync = (
  { request, author, title, scaleMin, scaleMax },
) => ({
  when: actions([
    Requesting.request,
    { path: "/LikertSurvey/createSurvey", author, title, scaleMin, scaleMax },
    { request },
  ]),
  then: actions([LikertSurvey.createSurvey, {
    author,
    title,
    scaleMin,
    scaleMax,
  }]),
});

export const CreateSurveyResponse: Sync = ({ request, survey }) => ({
  when: actions(
    [Requesting.request, { path: "/LikertSurvey/createSurvey" }, { request }],
    [LikertSurvey.createSurvey, {}, { survey }],
  ),
  then: actions([Requesting.respond, { request, survey }]),
});

export const AddQuestionRequest: Sync = ({ request, survey, text }) => ({
  when: actions([
    Requesting.request,
    { path: "/LikertSurvey/addQuestion", survey, text },
    { request },
  ]),
  then: actions([LikertSurvey.addQuestion, { survey, text }]),
});

export const AddQuestionResponse: Sync = ({ request, question }) => ({
  when: actions(
    [Requesting.request, { path: "/LikertSurvey/addQuestion" }, { request }],
    [LikertSurvey.addQuestion, {}, { question }],
  ),
  then: actions([Requesting.respond, { request, question }]),
});

```

A new action server. In this assignment, we’re providing you with a similar server, this time embodied in a special concept called Requesting. When this concept is instantiated, it starts up a server that takes requests and either passes them through (like the old server) directly to concepts, or turns them into request actions to be used in syncs. By default, requests are passed through (or “included”), so if you use the action server out of the box it will behave exactly like the old action server. For example, an HTTP request coming into the back end with the route /api/concept\_c/action\_a will by default call action action\_a of concept concept\_c.

Alternatively you can list an action as “excluded,” and it will then be turned into a request action. For example, if /api/concept\_c/action\_a is excluded, an HTTP request coming into the back end with that route will generate the action Requesting.request (that is, the request action of the special Requesting concept) with an argument (called path) set to the string concept\_c/action\_a. You can then write a sync on this action. If you don’t write a sync, there will be no reaction to the request and it will eventually time out and return an error.

You can also list an action as “included,” which doesn’t affect the behavior (since that’s the default) but records the fact that you intend it to be included so it will stop printing a warning message telling you that it’s been included by default.

**Introducing a sync without affecting the API format**. Suppose you exclude /api/concept\_c/action\_a and write one or more syncs against the generated request action. For example, in addition to calling concept\_c.action\_a you might call Notification.notify with some appropriate arguments. Now the same HTTP request will have a new effect, due to the call of the additional action. The back end API has actually changed, but the format of the HTTP request is the same. You may need to update the front end (in this case, perhaps to no longer call an additional notification action) but you won’t need to change the code that makes the original call.

**Introducing a sync that affects the API format**. Some of your changes will change the API format, however, and for those you will need to adjust the front-end calls accordingly. The typical case of this will be for authentication. Suppose you want to ensure that the user is authenticated when attempting to execute concept\_c.action\_a. To do that you might add a session field to the JSON record that is passed in the body of the /api/concept\_c/action\_a request. Then your sync can read that as the session argument of the Requesting.request action. This time the front-end call will need to be modified, since the back-end API format has changed, and now requires the session token to be passed in the body of the request.
