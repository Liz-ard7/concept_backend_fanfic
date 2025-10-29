# Changes made to the design of the application as a whole

1. From feedback, I changed the concept design to be more general, not specifically about fanfiction, so that it may be reused later as it is more generalized.

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

4. Fascinating! Without being given specific use of an AI, the AI opts instead to try and create a manual version of tags. This wouldn't work, of course, as there are millions of tags and this only encompasses about 4, but still. A good effort from the AI. Something particularly clever is that it tries to establish certain tags as mutually exclusive-- war and pain cannot coexist with fluff, for instance. Is this true for stories? Could there be a "fluffy" piece about war, if romanticized enough? Should we consider these mutually exclusive? Interesting to ponder! Moreover it implements "MOCK AI" usage.
[Lines 351 and 312](../../context/design/concepts/Categorizing/implementation.md/steps/file.8fefeac3.md)

5. Even with a list of tags provided to it, it still wants to code its own tags, such as "fantasy" or "romance", even though these are not widely used. Moreover, for some reason it keeps splitting these up into two separate typescript files, despite the fact it has never done that before. [Line 159](../../context/design/concepts/Categorizing/implementation.md/steps/file.0756f9eb.md)

6. Even with the CSV provided to the AI, it instead tells the model to find the CSV, without actually telling it where that is located in my code. Thus, I shall be editing the code slightly to include my CSV parser from Assignment 3, and will be changing the getTags function to utilize that instead.
[Line 73](../../context/design/concepts/Categorizing/implementation.md/steps/response.f39d99a0.md)

# For assignment 4b I did not change anything within the design in the backend
