---
timestamp: 'Sun Oct 12 2025 17:21:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_172102.2723a023.md]]'
content_id: b8d8beb8df47b62d4a4e4e884d4d9be67001c57af2c9123d81ba8389aa02714b
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
      console.log("--- Trace: Starting Principle Test ---");

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
        `Action: submitNewFic({ user: ${userAlice}, ficName: "${fic1Name}", ficText: "${fic1Text.substring(0, 15)}...", authorTags: [${fic1Tags.join(",")}], date: ${JSON.stringify(date1)} })`,
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
        `Action: submitNewFic({ user: ${userAlice}, ficName: "${fic2Name}", ficText: "${fic2Text.substring(0, 15)}...", authorTags: [${fic2Tags.join(",")}], date: ${JSON.stringify(date2)} })`,
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
      console.log("--- Principle Test finished. ---");
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
          `Action: submitNewFic({ user: ${userAlice}, ficName: "${ficName}", ficText: "${ficText.substring(0, 15)}...", authorTags: [${authorTags.join(",")}], date: ${JSON.stringify(date1)} })`,
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
          `Action: submitNewVersionOfFanfic({ user: ${userAlice}, versionTitle: "${ficName}", ficText: "${updatedText.substring(0, 20)}...", ... })`,
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
          `Action: submitNewVersionOfFanfic({ user: ${userBob} (non-existent), versionTitle: "${ficName}", ... })`,
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
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });

      st.step("should return an error if version title does not exist for the user", async () => {
        const nonExistentFicName = "NonExistentFic";
        console.log(
          `Action: submitNewVersionOfFanfic({ user: ${userAlice}, versionTitle: "${nonExistentFicName}", ... })`,
        );
        const result = await concept.submitNewVersionOfFanfic({
          user: userAlice,
          ficName: nonExistentFicName,
          ficText: updatedText,
          authorTags: tags,
          versionTitle: nonExistentFicName,
          date: date2,
        });
        assertEquals(result, {
          error:
            `Fic version '${nonExistentFicName}' does not exist for user '${userAlice}'.`,
        });
        console.log(
          `Output: Expected error for non-existent version title: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("viewFic action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);
    const ficName = "Viewable Story";
    const ficTextV0 = "Initial draft.";
    const ficTextV1 = "Revised version.";

    try {
      await concept.addUser({ user: userAlice });
      const submitNewFicResult = await concept.submitNewFic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV0,
        authorTags: ["scifi"],
        date: date1,
      });
      if ("error" in submitNewFicResult) throw new Error(submitNewFicResult.error);
      const submitNewVersionResult = await concept.submitNewVersionOfFanfic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV1,
        authorTags: ["scifi"],
        versionTitle: ficName,
        date: date2,
      });
      if ("error" in submitNewVersionResult) {
        throw new Error(submitNewVersionResult.error);
      }

      st.step("should view a specific fic version successfully", async () => {
        console.log(
          `Action: viewFic({ user: ${userAlice}, ficName: "${ficName}", versionNumber: 0 })`,
        );
        const resultV0 = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 0,
        });
        if ("error" in resultV0) throw new Error(resultV0.error);
        assertExists(resultV0.fic);
        assertEquals(resultV0.fic.text, ficTextV0);
        assertEquals(resultV0.fic.versionNumber, 0);
        console.log(
          `Output: Viewed fic "${ficName}" v0: "${resultV0.fic.text.substring(0, 15)}..."`,
        );

        console.log(
          `Action: viewFic({ user: ${userAlice}, ficName: "${ficName}", versionNumber: 1 })`,
        );
        const resultV1 = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 1,
        });
        if ("error" in resultV1) throw new Error(resultV1.error);
        assertExists(resultV1.fic);
        assertEquals(resultV1.fic.text, ficTextV1);
        assertEquals(resultV1.fic.versionNumber, 1);
        console.log(
          `Output: Viewed fic "${ficName}" v1: "${resultV1.fic.text.substring(0, 15)}..."`,
        );
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: viewFic({ user: ${userBob} (non-existent), ficName: "${ficName}", versionNumber: 0 })`,
        );
        const result = await concept.viewFic({
          user: userBob,
          ficName: ficName,
          versionNumber: 0,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });

      st.step("should return an error if fic name does not exist", async () => {
        const nonExistentFicName = "NonExistent";
        console.log(
          `Action: viewFic({ user: ${userAlice}, ficName: "${nonExistentFicName}", versionNumber: 0 })`,
        );
        const result = await concept.viewFic({
          user: userAlice,
          ficName: nonExistentFicName,
          versionNumber: 0,
        });
        assertEquals(result, {
          error: `Fic with name '${nonExistentFicName}' does not exist for user '${userAlice}'.`,
        });
        console.log(
          `Output: Expected error for non-existent fic name: ${result.error}`,
        );
      });

      st.step("should return an error if version number is out of range", async () => {
        console.log(
          `Action: viewFic({ user: ${userAlice}, ficName: "${ficName}", versionNumber: 2 (too high) })`,
        );
        const resultTooHigh = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 2,
        });
        assertEquals(resultTooHigh, {
          error: `Version number '2' is out of range for fic '${ficName}'.`,
        });
        console.log(
          `Output: Expected error for version number too high: ${resultTooHigh.error}`,
        );

        console.log(
          `Action: viewFic({ user: ${userAlice}, ficName: "${ficName}", versionNumber: -1 (too low) })`,
        );
        const resultTooLow = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: -1,
        });
        assertEquals(resultTooLow, {
          error: `Version number '-1' is out of range for fic '${ficName}'.`,
        });
        console.log(
          `Output: Expected error for version number too low: ${resultTooLow.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("deleteFic action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);
    const ficName = "Deletable Story";
    const ficTextV0 = "V0.";
    const ficTextV1 = "V1.";
    const ficTextV2 = "V2.";

    try {
      await concept.addUser({ user: userAlice });
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV0,
        authorTags: [],
        date: date1,
      });
      await concept.submitNewVersionOfFanfic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV1,
        authorTags: [],
        versionTitle: ficName,
        date: date2,
      });
      await concept.submitNewVersionOfFanfic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV2,
        authorTags: [],
        versionTitle: ficName,
        date: date3,
      });

      st.step("should delete a specific fic version successfully", async () => {
        const ficToDeleteResult = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 1,
        });
        if ("error" in ficToDeleteResult) throw new Error(ficToDeleteResult.error);
        const ficToDelete = ficToDeleteResult.fic;
        assertExists(ficToDelete);
        console.log(
          `Precondition: About to delete fic "${ficName}" v1. Original: ${JSON.stringify(ficToDelete)}`,
        );

        console.log(
          `Action: deleteFic({ user: ${userAlice}, ficName: "${ficName}", versionNumber: 1 })`,
        );
        const result = await concept.deleteFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 1,
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.fic);
        assertEquals(result.fic.versionNumber, 1);
        assertEquals(result.fic.text, ficTextV1);
        console.log(
          `Output: Deleted fic "${ficName}" v1. Returned: ${JSON.stringify(result.fic)}`,
        );

        // Verify the update: fetch the updated version
        console.log(
          `Verification: getVersion({ user: ${userAlice}, versionTitle: "${ficName}" })`,
        );
        const updatedVersionResult = await concept.getVersion({
          user: userAlice,
          versionTitle: ficName,
        });
        if ("error" in updatedVersionResult) throw new Error(updatedVersionResult.error);
        assertExists(updatedVersionResult.version);
        assertEquals(updatedVersionResult.version.fics.length, 2);
        assertEquals(
          updatedVersionResult.version.fics.find((f) => f.versionNumber === 1),
          undefined,
          "V1 should be gone",
        );
        assertExists(
          updatedVersionResult.version.fics.find((f) => f.versionNumber === 0),
        );
        assertExists(
          updatedVersionResult.version.fics.find((f) => f.versionNumber === 2),
        );
        console.log(
          `Assertion: Version "${ficName}" now has 2 fics (v0 and v2), v1 is confirmed deleted.`,
        );
      });

      st.step("should delete the version if the last fic is removed", async () => {
        const ficNameSolo = "Solo Fic";
        console.log(
          `Setup: submitNewFic({ user: ${userAlice}, ficName: "${ficNameSolo}", ... })`,
        );
        await concept.submitNewFic({
          user: userAlice,
          ficName: ficNameSolo,
          ficText: "Only fic",
          authorTags: [],
          date: date1,
        });

        let versionsResult = await concept._getAllUserVersions({ user: userAlice });
        if ("error" in versionsResult) throw new Error(versionsResult.error);
        assertExists(versionsResult.versions.find((v) => v.title === ficNameSolo));
        console.log(`Precondition: User has version "${ficNameSolo}".`);

        console.log(
          `Action: deleteFic({ user: ${userAlice}, ficName: "${ficNameSolo}", versionNumber: 0 }) (last fic)`,
        );
        await concept.deleteFic({
          user: userAlice,
          ficName: ficNameSolo,
          versionNumber: 0,
        });
        console.log(
          `Output: Deleted last fic (v0) from "${ficNameSolo}".`,
        );

        versionsResult = await concept._getAllUserVersions({ user: userAlice });
        if ("error" in versionsResult) throw new Error(versionsResult.error);
        assertEquals(
          versionsResult.versions.find((v) => v.title === ficNameSolo),
          undefined,
          "Solo fic version should be deleted",
        );
        console.log(`Assertion: Version "${ficNameSolo}" is now deleted.`);
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: deleteFic({ user: ${userBob} (non-existent), ficName: "${ficName}", versionNumber: 0 })`,
        );
        const result = await concept.deleteFic({
          user: userBob,
          ficName: ficName,
          versionNumber: 0,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });

      st.step("should return an error if fic name does not exist", async () => {
        const nonExistentFicName = "NonExistent";
        console.log(
          `Action: deleteFic({ user: ${userAlice}, ficName: "${nonExistentFicName}", versionNumber: 0 })`,
        );
        const result = await concept.deleteFic({
          user: userAlice,
          ficName: nonExistentFicName,
          versionNumber: 0,
        });
        assertEquals(result, {
          error: `Fic with name '${nonExistentFicName}' does not exist for user '${userAlice}'.`,
        });
        console.log(
          `Output: Expected error for non-existent fic name: ${result.error}`,
        );
      });

      st.step("should return an error if version number is out of range or not found", async () => {
        console.log(
          `Action: deleteFic({ user: ${userAlice}, ficName: "${ficName}", versionNumber: 99 (not found) })`,
        );
        const result = await concept.deleteFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 99,
        });
        assertEquals(result, {
          error:
            `Fic revision with version number '99' not found for '${ficName}'.`,
        });
        console.log(
          `Output: Expected error for non-existent version number: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("deleteVersion action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);
    const ficName1 = "Story One";
    const ficName2 = "Story Two";

    try {
      await concept.addUser({ user: userAlice });
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName1,
        ficText: "Text 1",
        authorTags: [],
        date: date1,
      });
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName2,
        ficText: "Text 2",
        authorTags: [],
        date: date2,
      });
      await concept.submitNewVersionOfFanfic({
        user: userAlice,
        ficName: ficName1,
        ficText: "Text 1.1",
        authorTags: [],
        versionTitle: ficName1,
        date: date3,
      });

      st.step("should delete an entire version successfully", async () => {
        const versionToDeleteResult = await concept.getVersion({
          user: userAlice,
          versionTitle: ficName1,
        });
        if ("error" in versionToDeleteResult) throw new Error(versionToDeleteResult.error);
        const versionToDelete = versionToDeleteResult.version;
        assertExists(versionToDelete);
        assertEquals(versionToDelete.fics.length, 2);
        console.log(`Precondition: User has version "${ficName1}" with 2 fics.`);

        console.log(
          `Action: deleteVersion({ user: ${userAlice}, ficTitle: "${ficName1}" })`,
        );
        const result = await concept.deleteVersion({
          user: userAlice,
          ficTitle: ficName1,
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.version);
        assertEquals(result.version.title, ficName1);
        assertEquals(result.version.fics.length, 2); // Returns the *deleted* version, before the actual removal effect
        console.log(
          `Output: Deleted version "${ficName1}". Returned deleted version details.`,
        );

        const versionsResult = await concept._getAllUserVersions({ user: userAlice });
        if ("error" in versionsResult) throw new Error(versionsResult.error);
        assertEquals(versionsResult.versions.length, 1);
        assertEquals(versionsResult.versions[0]?.title, ficName2);
        console.log(
          `Assertion: User ${userAlice} now has 1 version, "${ficName2}". "${ficName1}" is gone.`,
        );
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: deleteVersion({ user: ${userBob} (non-existent), ficTitle: "${ficName1}" })`,
        );
        const result = await concept.deleteVersion({
          user: userBob,
          ficTitle: ficName1,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });

      st.step("should return an error if fic title does not exist", async () => {
        const nonExistentFicTitle = "NonExistentFic";
        console.log(
          `Action: deleteVersion({ user: ${userAlice}, ficTitle: "${nonExistentFicTitle}" })`,
        );
        const result = await concept.deleteVersion({
          user: userAlice,
          ficTitle: nonExistentFicTitle,
        });
        assertEquals(result, {
          error:
            `Version with title '${nonExistentFicTitle}' not found for user '${userAlice}'.`,
        });
        console.log(
          `Output: Expected error for non-existent fic title: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("deleteFicsAndUser action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);

    try {
      await concept.addUser({ user: userAlice });
      await concept.submitNewFic({
        user: userAlice,
        ficName: "FicA",
        ficText: "A",
        authorTags: [],
        date: date1,
      });
      await concept.submitNewFic({
        user: userAlice,
        ficName: "FicB",
        ficText: "B",
        authorTags: [],
        date: date2,
      });
      console.log(`Precondition: User ${userAlice} exists with two fics.`);

      st.step("should delete user and all their fics successfully", async () => {
        console.log(`Action: deleteFicsAndUser({ user: ${userAlice} })`);
        const result = await concept.deleteFicsAndUser({ user: userAlice });
        assertEquals(result, {});
        console.log(`Output: User ${userAlice} and all their fics deleted.`);

        const versions = await concept._getAllUserVersions({ user: userAlice });
        assertEquals(versions.error, `User '${userAlice}' does not exist.`);
        console.log(
          `Assertion: Attempting to get versions for ${userAlice} correctly returns error.`,
        );
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: deleteFicsAndUser({ user: ${userBob} (non-existent) })`,
        );
        const result = await concept.deleteFicsAndUser({ user: userBob });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("findFicWithDate action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);
    const ficName1 = "Day 1 Fic";
    const ficName2 = "Day 15 Fic";
    const ficName3 = "Day 1 Fic (second)"; // same day as ficName1

    try {
      await concept.addUser({ user: userAlice });
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName1,
        ficText: "Text1",
        authorTags: [],
        date: date1,
      });
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName2,
        ficText: "Text2",
        authorTags: [],
        date: date2,
      });
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName3,
        ficText: "Text3",
        authorTags: [],
        date: date1,
      }); // Another fic on date1
      console.log(`Precondition: User ${userAlice} has fics on ${JSON.stringify(date1)} and ${JSON.stringify(date2)}.`);

      st.step("should find fics matching a specific date", async () => {
        console.log(
          `Action: findFicWithDate({ user: ${userAlice}, date: ${JSON.stringify(date1)} })`,
        );
        const result = await concept.findFicWithDate({
          user: userAlice,
          date: date1,
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.fics);
        assertEquals(result.fics.length, 2);
        assertExists(result.fics.find((f) => f.name === ficName1));
        assertExists(result.fics.find((f) => f.name === ficName3));
        console.log(
          `Output: Found ${result.fics.length} fics matching date ${JSON.stringify(date1)}.`,
        );
      });

      st.step("should return an empty set if no fics match the date", async () => {
        console.log(
          `Action: findFicWithDate({ user: ${userAlice}, date: ${JSON.stringify(date3)} })`,
        );
        const result = await concept.findFicWithDate({
          user: userAlice,
          date: date3,
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.fics);
        assertEquals(result.fics.length, 0);
        console.log(
          `Output: Found ${result.fics.length} fics matching date ${JSON.stringify(date3)} (expected 0).`,
        );
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: findFicWithDate({ user: ${userBob} (non-existent), date: ${JSON.stringify(date1)} })`,
        );
        const result = await concept.findFicWithDate({
          user: userBob,
          date: date1,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("getVersion action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);
    const ficName = "Masterpiece";
    const ficTextV0 = "V0.";
    const ficTextV1 = "V1.";

    try {
      await concept.addUser({ user: userAlice });
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV0,
        authorTags: [],
        date: date1,
      });
      await concept.submitNewVersionOfFanfic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV1,
        authorTags: [],
        versionTitle: ficName,
        date: date2,
      });
      console.log(`Precondition: User ${userAlice} has version "${ficName}" with 2 fics.`);

      st.step("should retrieve a version successfully", async () => {
        console.log(
          `Action: getVersion({ user: ${userAlice}, versionTitle: "${ficName}" })`,
        );
        const result = await concept.getVersion({
          user: userAlice,
          versionTitle: ficName,
        });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.version);
        assertEquals(result.version.title, ficName);
        assertEquals(result.version.fics.length, 2);
        assertObjectMatch(result.version.fics[0]!, {
          text: ficTextV0,
          versionNumber: 0,
        });
        assertObjectMatch(result.version.fics[1]!, {
          text: ficTextV1,
          versionNumber: 1,
        });
        console.log(
          `Output: Retrieved version "${ficName}" with ${result.version.fics.length} fics.`,
        );
      });

      st.step("should return an error if user does not exist", async () => {
        console.log(
          `Action: getVersion({ user: ${userBob} (non-existent), versionTitle: "${ficName}" })`,
        );
        const result = await concept.getVersion({
          user: userBob,
          versionTitle: ficName,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });

      st.step("should return an error if version title does not exist", async () => {
        const unknownTitle = "Unknown Title";
        console.log(
          `Action: getVersion({ user: ${userAlice}, versionTitle: "${unknownTitle}" })`,
        );
        const result = await concept.getVersion({
          user: userAlice,
          versionTitle: unknownTitle,
        });
        assertEquals(result, {
          error: `Version with title '${unknownTitle}' not found for user '${userAlice}'.`,
        });
        console.log(
          `Output: Expected error for non-existent version title: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });

  await t.step("_getAllUserVersions query", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);

    try {
      await concept.addUser({ user: userAlice });
      await concept.submitNewFic({
        user: userAlice,
        ficName: "FicA",
        ficText: "A",
        authorTags: [],
        date: date1,
      });
      await concept.submitNewFic({
        user: userAlice,
        ficName: "FicB",
        ficText: "B",
        authorTags: [],
        date: date2,
      });
      console.log(`Precondition: User ${userAlice} exists with two versions.`);

      st.step("should retrieve all versions for an existing user", async () => {
        console.log(`Query: _getAllUserVersions({ user: ${userAlice} })`);
        const result = await concept._getAllUserVersions({ user: userAlice });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.versions);
        assertEquals(result.versions.length, 2);
        assertExists(result.versions.find((v) => v.title === "FicA"));
        assertExists(result.versions.find((v) => v.title === "FicB"));
        console.log(
          `Output: Retrieved ${result.versions.length} versions for ${userAlice}: ${JSON.stringify(result.versions.map((v) => v.title))}`,
        );
      });

      st.step("should return an empty array if user has no versions", async () => {
        await concept.addUser({ user: userBob }); // Add Bob, but no fics
        console.log(
          `Query: _getAllUserVersions({ user: ${userBob} (no fics) })`,
        );
        const result = await concept._getAllUserVersions({ user: userBob });
        if ("error" in result) throw new Error(result.error);
        assertExists(result.versions);
        assertEquals(result.versions.length, 0);
        console.log(
          `Output: Retrieved ${result.versions.length} versions for ${userBob} (expected 0).`,
        );
      });

      st.step("should return an error if user does not exist", async () => {
        const nonExistentUser = "nonExistentUser" as ID;
        console.log(`Query: _getAllUserVersions({ user: ${nonExistentUser} })`);
        const result = await concept._getAllUserVersions({
          user: nonExistentUser,
        });
        assertEquals(result, { error: `User '${nonExistentUser}' does not exist.` });
        console.log(
          `Output: Expected error for non-existent user: ${result.error}`,
        );
      });
    } finally {
      await client.close();
    }
  });
});
```
