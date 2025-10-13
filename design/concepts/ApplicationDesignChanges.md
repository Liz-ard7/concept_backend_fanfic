# Changes made to the design of the application as a whole
1. From feedback, I changed the concept design to be more general, not specifically about fanfiction.

# 5-10 pointers to interesting moments (explained below) in your development, each with a couple of sentences explaining it.

Interesting moments. As you work on your implementation, some moments will be worth recording. For example, you might discover that your concept specification was wrong in some way; a test run might expose a subtle bug in a concept implementation; the LLM might generate some code that is unexpectedly good or bad in some way; you might discover a way to simplify your design; and so on. When any such moment arises, you should save a link to the relevant file and place it in your design document. Make sure to save a link to a snapshot in the context area, not a link to a file in the design or source code areas (since those are mutable). If this moment did not arise from running the LLM, you should save the relevant files by creating a little design document to record your observations, and then run the tool with the save option to snapshot the files first.

1. The LLM doesn't realize that when it returns {fic} | {error : string}, it needs to make sure before using response.fic that error isn't a possibility.
Bugfixed by adding
```typescript
if('error' in result) {
    throw new AssertionError();
}
```
It's interesting-- I wouldn't have thought to do that either at first. It's like they said in lecture, AIs and humans share a lot of failure points.
[Interesting Moment: Example Line 156](../../context/design/concepts/Library/LibraryTests.md/steps/response.25cbe77e.md)

2. The LLM assumed that when I deleted a fic, I would want to re-index every other part of the version, but I don't think that's quite right. I hadn't quite thought of that yet, but if you had 3 versions of something, version 1, 2, and 3, and you deleted 1, you wouldn't necessarily want version 2 to become version 1, I think that would cause more confusion. Thus, I removed that part of the test, and changed it slightly so it would look to see if index 1 is still in the test, not index 0.
[Interesting Moment Line 357](../../context/design/concepts/Library/LibraryTests.md/steps/response.d2b6e457.md)

3. In another interesting moment that reflects the concepts of confusion vs hallucination, the AI forgot that it had defined User as an ID and UserDocument as the thing it actually wanted to assign newUser as-- another reflection of how AIs can be quite human.
[Line 140 vs Line 61](../../context/design/concepts/UserAuthentication/implementation.md/steps/response.fc596a61.md)
