---
timestamp: 'Sun Oct 12 2025 17:20:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_172013.15b42c9d.md]]'
content_id: 8541713cb3ea10b969e270195064ec13bdb7ae40edb2b73e1b7d162679911af4
---

# response:

```typescript
// file: src/Library/LibraryConcept.test.ts

import {
  assertEquals,
  assertExists,
  assertObjectMatch,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import LibraryConcept from "./LibraryConcept.ts"; // Assuming relative path
import { ID } from "@utils/types.ts";

// Helper type for DateSpec for convenience in tests
interface DateSpec {
  day: number;
  month: number;
  year: number;
}

Deno.test("LibraryConcept", async (t) => {
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;

  const date1: DateSpec = { day: 1, month: 1, year: 2023 };
  const date2: DateSpec = { day: 15, month: 1, year: 2023 };
  const date3: DateSpec = { day: 1, month: 2, year: 2023 };

  // # trace: Principle fulfillment
  // A user submits a story by inputting its name, body text, and set of authorTags into the website.
  // Then, when the user views themselves, they see their new story listed alongside all previous stories they've submitted.
  await t.step("should fulfill the principle: submit and view stories", async () => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);

    try {
      console.log("Trace: Starting Principle Test");

      // 1. Add user
      console.log(`Action: addUser({ user: ${userAlice} })`);
      const addUserResult = await concept.addUser({ user: userAlice });
      assertEquals(addUserResult, {}, "addUser should succeed for Alice");
      console.log("Output: User Alice added successfully.");

      // 2. Submit first story
      const fic1Name = "The First Fic";
      const fic1Text = "This is the text of the first story.";
      const fic1Tags = ["fantasy", "magic"];
      console.log(
        `Action: submitNewFic({ user: ${userAlice}, ficName: "${fic1Name}", ... })`,
      );
      const submitFic1Result = await concept.submitNewFic({
        user: userAlice,
        ficName: fic1Name,
        ficText: fic1Text,
        authorTags: fic1Tags,
        date: date1,
      });
      // Type guard to access `fic` property safely
      if ("error" in submitFic1Result) {
        throw new Error(`submitNewFic failed: ${submitFic1Result.error}`);
      }
      assertExists(submitFic1Result.fic, "submitFic1Result should return a fic");
      assertEquals(submitFic1Result.fic.name, fic1Name);
      assertEquals(submitFic1Result.fic.versionNumber, 0);
      console.log(
        `Output: Fic "${fic1Name}" (v0) submitted successfully. ID: ${submitFic1Result.fic._id}`,
      );

      // 3. Submit second story
      const fic2Name = "Another Adventure";
      const fic2Text = "Exploring new lands.";
      const fic2Tags = ["adventure"];
      console.log(
        `Action: submitNewFic({ user: ${userAlice}, ficName: "${fic2Name}", ... })`,
      );
      const submitFic2Result = await concept.submitNewFic({
        user: userAlice,
        ficName: fic2Name,
        ficText: fic2Text,
        authorTags: fic2Tags,
        date: date2,
      });
      // Type guard
      if ("error" in submitFic2Result) {
        throw new Error(`submitNewFic failed: ${submitFic2Result.error}`);
      }
      assertExists(submitFic2Result.fic, "submitFic2Result should return a fic");
      assertEquals(submitFic2Result.fic.name, fic2Name);
      assertEquals(submitFic2Result.fic.versionNumber, 0);
      console.log(
        `Output: Fic "${fic2Name}" (v0) submitted successfully. ID: ${submitFic2Result.fic._id}`,
      );

      // 4. User views themselves (their library) using the _getAllUserVersions query
      console.log(`Query: _getAllUserVersions({ user: ${userAlice} })`);
      const viewUserVersionsResult = await concept._getAllUserVersions({ user: userAlice });
      // Type guard
      if ("error" in viewUserVersionsResult) {
        throw new Error(
          `_getAllUserVersions failed: ${viewUserVersionsResult.error}`,
        );
      }
      assertExists(viewUserVersionsResult.versions, "_getAllUserVersions should return versions");
      assertEquals(viewUserVersionsResult.versions.length, 2, "Alice should have 2 versions");
      console.log(
        `Output: Alice's versions: ${JSON.stringify(viewUserVersionsResult.versions.map((v) => v.title))}`,
      );

      const version1 = viewUserVersionsResult.versions.find((v) =>
        v.title === fic1Name
      );
      const version2 = viewUserVersionsResult.versions.find((v) =>
        v.title === fic2Name
      );

      assertExists(version1, `Version '${fic1Name}' should exist`);
      assertExists(version2, `Version '${fic2Name}' should exist`);

      assertEquals(version1.fics.length, 1, `Version '${fic1Name}' should have 1 fic`);
      assertEquals(version2.fics.length, 1, `Version '${fic2Name}' should have 1 fic`);

      assertObjectMatch(version1.fics[0]!, {
        name: fic1Name,
        text: fic1Text,
        authorTags: fic1Tags,
        date: date1,
        versionNumber: 0,
      });
      assertObjectMatch(version2.fics[0]!, {
        name: fic2Name,
        text: fic2Text,
        authorTags: fic2Tags,
        date: date2,
        versionNumber: 0,
      });
      console.log(
        `Assertion: Content of "${fic1Name}" and "${fic2Name}" verified. Principle fulfilled.`,
      );
    } finally {
      await client.close();
      console.log("Trace: Principle Test finished.");
    }
  });

  await t.step("addUser action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);

    try {
      st.step("should add a user successfully", async () => {
        console.log(`Action: addUser({ user: ${userAlice} })`);
        const result = await concept.addUser({ user: userAlice });
        assertEquals(result, {});
        console.log(`Output: User ${userAlice} added.`);

        const versions = await concept._getAllUserVersions({ user: userAlice });
        if ("error" in versions) throw new Error(versions.error);
        assertEquals(versions.versions.length, 0, "New user should have no versions");
        console.log(`Assertion: User ${userAlice} has 0 versions.`);
      });

      st.step("should return an error if user already exists", async () => {
        await concept.addUser({ user: userAlice }); // Add first for precondition
        console.log(`Action: addUser({ user: ${userAlice} }) (duplicate)`);
        const result = await concept.addUser({ user: userAlice }); // Try to add again
        assertEquals(result, { error: `User '${userAlice}' already exists.` });
        console.log(
          `Output: Expected error for duplicate user: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("submitNewFic action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);
    const ficName = "A New Tale";
    const ficText = "The story begins here.";
    const authorTags = ["fantasy"];

    try {
      await concept.addUser({ user: userAlice }); // Ensure user exists for successful test cases

      st.step("should submit a new fic successfully (first version)", async () => {
        console.log(
          `Action: submitNewFic({ user: ${userAlice}, ficName: "${ficName}", ... })`,
        );
        const result = await concept.submitNewFic({
          user: userAlice,
          ficName: ficName,
          ficText: ficText,
          authorTags: authorTags,
          date: date1,
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.fic, "Fic should be returned");
        assertEquals(result.fic.name, ficName);
        assertEquals(result.fic.text, ficText);
        assertEquals(result.fic.authorTags, authorTags);
        assertEquals(result.fic.date, date1);
        assertEquals(result.fic.versionNumber, 0);
        console.log(
          `Output: Fic "${ficName}" (v0) submitted successfully. ID: ${result.fic._id}`,
        );

        const versions = await concept._getAllUserVersions({ user: userAlice });
        if ("error" in versions) throw new Error(versions.error);
        assertEquals(versions.versions.length, 1);
        assertEquals(versions.versions[0]?.title, ficName);
        assertEquals(versions.versions[0]?.fics.length, 1);
        assertObjectMatch(versions.versions[0]?.fics[0]!, {
          name: ficName,
          versionNumber: 0,
        });
        console.log(
          `Assertion: User ${userAlice} now has 1 version, containing the new fic.`,
        );
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: submitNewFic({ user: ${userBob} (non-existent), ficName: "${ficName}", ... })`,
        );
        const result = await concept.submitNewFic({
          user: userBob, // Bob does not exist
          ficName: ficName,
          ficText: ficText,
          authorTags: authorTags,
          date: date1,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });

      st.step("should return an error if fic name already exists for the user", async () => {
        // First submission for precondition
        await concept.submitNewFic({
          user: userAlice,
          ficName: ficName,
          ficText: "Original text",
          authorTags: authorTags,
          date: date1,
        });
        console.log(
          `Action: submitNewFic({ user: ${userAlice}, ficName: "${ficName}" (duplicate), ... })`,
        );
        const result = await concept.submitNewFic({ // Duplicate submission
          user: userAlice,
          ficName: ficName,
          ficText: "New text, same name",
          authorTags: authorTags,
          date: date2,
        });
        assertEquals(result, {
          error: `Fic with name '${ficName}' already exists for user '${userAlice}'.`,
        });
        console.log(
          `Output: Expected error for duplicate fic name: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("submitNewVersionOfFanfic action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);
    const ficName = "Updating Story";
    const originalText = "Chapter 1.";
    const updatedText = "Chapter 1. Chapter 2.";
    const tags = ["fantasy"];

    try {
      await concept.addUser({ user: userAlice });
      const submitNewFicResult = await concept.submitNewFic({
        user: userAlice,
        ficName: ficName,
        ficText: originalText,
        authorTags: tags,
        date: date1,
      });
      if ("error" in submitNewFicResult) throw new Error(submitNewFicResult.error);

      st.step("should submit a new version successfully", async () => {
        console.log(
          `Action: submitNewVersionOfFanfic({ user: ${userAlice}, versionTitle: "${ficName}", ficText: "${updatedText}", ... })`,
        );
        const result = await concept.submitNewVersionOfFanfic({
          user: userAlice,
          ficName: ficName,
          ficText: updatedText,
          authorTags: tags,
          versionTitle: ficName,
          date: date2,
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.version, "Version should be returned");
        assertEquals(result.version.title, ficName);
        assertEquals(result.version.fics.length, 2);
        assertObjectMatch(result.version.fics[0]!, {
          text: originalText,
          versionNumber: 0,
        });
        assertObjectMatch(result.version.fics[1]!, {
          text: updatedText,
          versionNumber: 1,
          date: date2,
        });
        console.log(
          `Output: New version (v1) for "${ficName}" submitted successfully.`,
        );

        const versions = await concept._getAllUserVersions({ user: userAlice });
        if ("error" in versions) throw new Error(versions.error);
        assertEquals(versions.versions[0]?.fics.length, 2);
        console.log(`Assertion: Version now has 2 fics.`);
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: submitNewVersionOfFanfic({ user: ${userBob} (non-existent), ... })`,
        );
        const result = await concept.submitNewVersionOfFanfic({
          user: userBob,
          ficName: ficName,
          ficText: updatedText,
          authorTags: tags,
          versionTitle: ficName,
          date: date2,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
```
