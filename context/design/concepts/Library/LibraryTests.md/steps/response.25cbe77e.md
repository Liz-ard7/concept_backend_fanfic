---
timestamp: 'Sun Oct 12 2025 15:29:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_152934.0f5cc730.md]]'
content_id: 25cbe77ebd8171d397981d72f619aa0357f6bafe205d330a4a108f243ab41020
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
      // 1. Add user
      const addUserResult = await concept.addUser({ user: userAlice });
      assertEquals(addUserResult, {}, "addUser should succeed for Alice");

      // 2. Submit first story
      const fic1Name = "The First Fic";
      const fic1Text = "This is the text of the first story.";
      const fic1Tags = ["fantasy", "magic"];
      const submitFic1Result = await concept.submitNewFic({
        user: userAlice,
        ficName: fic1Name,
        ficText: fic1Text,
        authorTags: fic1Tags,
        date: date1,
      });
      assertExists(submitFic1Result.fic, "submitFic1Result should return a fic");
      assertEquals(submitFic1Result.fic?.name, fic1Name);
      assertEquals(submitFic1Result.fic?.versionNumber, 0);

      // 3. Submit second story
      const fic2Name = "Another Adventure";
      const fic2Text = "Exploring new lands.";
      const fic2Tags = ["adventure"];
      const submitFic2Result = await concept.submitNewFic({
        user: userAlice,
        ficName: fic2Name,
        ficText: fic2Text,
        authorTags: fic2Tags,
        date: date2,
      });
      assertExists(submitFic2Result.fic, "submitFic2Result should return a fic");
      assertEquals(submitFic2Result.fic?.name, fic2Name);
      assertEquals(submitFic2Result.fic?.versionNumber, 0);

      // 4. User views themselves (their library) using the _getAllUserVersions query
      const viewUserVersionsResult = await concept._getAllUserVersions({ user: userAlice });
      assertExists(viewUserVersionsResult.versions, "_getAllUserVersions should return versions");
      assertEquals(viewUserVersionsResult.versions?.length, 2, "Alice should have 2 versions");

      const version1 = viewUserVersionsResult.versions?.find((v) =>
        v.title === fic1Name
      );
      const version2 = viewUserVersionsResult.versions?.find((v) =>
        v.title === fic2Name
      );

      assertExists(version1, `Version '${fic1Name}' should exist`);
      assertExists(version2, `Version '${fic2Name}' should exist`);

      assertEquals(version1?.fics.length, 1, `Version '${fic1Name}' should have 1 fic`);
      assertEquals(version2?.fics.length, 1, `Version '${fic2Name}' should have 1 fic`);

      assertObjectMatch(version1?.fics[0]!, {
        name: fic1Name,
        text: fic1Text,
        authorTags: fic1Tags,
        date: date1,
        versionNumber: 0,
      });
      assertObjectMatch(version2?.fics[0]!, {
        name: fic2Name,
        text: fic2Text,
        authorTags: fic2Tags,
        date: date2,
        versionNumber: 0,
      });
    } finally {
      await client.close();
    }
  });

  await t.step("addUser action", async (st) => {
    const [db, client] = await testDb();
    const concept = new LibraryConcept(db);

    try {
      st.step("should add a user successfully", async () => {
        const result = await concept.addUser({ user: userAlice });
        assertEquals(result, {});

        const versions = await concept._getAllUserVersions({ user: userAlice });
        assertEquals(versions.versions?.length, 0, "New user should have no versions");
      });

      st.step("should return an error if user already exists", async () => {
        await concept.addUser({ user: userAlice }); // Add first
        const result = await concept.addUser({ user: userAlice }); // Try to add again
        assertEquals(result, { error: `User '${userAlice}' already exists.` });
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
      await concept.addUser({ user: userAlice }); // Ensure user exists

      st.step("should submit a new fic successfully (first version)", async () => {
        const result = await concept.submitNewFic({
          user: userAlice,
          ficName: ficName,
          ficText: ficText,
          authorTags: authorTags,
          date: date1,
        });
        assertExists(result.fic, "Fic should be returned");
        assertEquals(result.fic?.name, ficName);
        assertEquals(result.fic?.text, ficText);
        assertEquals(result.fic?.authorTags, authorTags);
        assertEquals(result.fic?.date, date1);
        assertEquals(result.fic?.versionNumber, 0);

        const versions = await concept._getAllUserVersions({ user: userAlice });
        assertEquals(versions.versions?.length, 1);
        assertEquals(versions.versions?.[0]?.title, ficName);
        assertEquals(versions.versions?.[0]?.fics.length, 1);
        assertObjectMatch(versions.versions?.[0]?.fics[0]!, {
          name: ficName,
          versionNumber: 0,
        });
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.submitNewFic({
          user: userBob, // Bob does not exist
          ficName: ficName,
          ficText: ficText,
          authorTags: authorTags,
          date: date1,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
      });

      st.step("should return an error if fic name already exists for the user", async () => {
        await concept.submitNewFic({ // First submission
          user: userAlice,
          ficName: ficName,
          ficText: "Original text",
          authorTags: authorTags,
          date: date1,
        });
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
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName,
        ficText: originalText,
        authorTags: tags,
        date: date1,
      });

      st.step("should submit a new version successfully", async () => {
        const result = await concept.submitNewVersionOfFanfic({
          user: userAlice,
          ficName: ficName,
          ficText: updatedText,
          authorTags: tags,
          versionTitle: ficName,
          date: date2,
        });
        assertExists(result.version, "Version should be returned");
        assertEquals(result.version?.title, ficName);
        assertEquals(result.version?.fics.length, 2);
        assertObjectMatch(result.version?.fics[0]!, {
          text: originalText,
          versionNumber: 0,
        });
        assertObjectMatch(result.version?.fics[1]!, {
          text: updatedText,
          versionNumber: 1,
          date: date2,
        });

        const versions = await concept._getAllUserVersions({ user: userAlice });
        assertEquals(versions.versions?.[0]?.fics.length, 2);
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.submitNewVersionOfFanfic({
          user: userBob,
          ficName: ficName,
          ficText: updatedText,
          authorTags: tags,
          versionTitle: ficName,
          date: date2,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
      });

      st.step("should return an error if version title does not exist for the user", async () => {
        const result = await concept.submitNewVersionOfFanfic({
          user: userAlice,
          ficName: "NonExistentFic",
          ficText: updatedText,
          authorTags: tags,
          versionTitle: "NonExistentFic",
          date: date2,
        });
        assertEquals(result, {
          error:
            `Fic version 'NonExistentFic' does not exist for user '${userAlice}'.`,
        });
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
      await concept.submitNewFic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV0,
        authorTags: ["scifi"],
        date: date1,
      });
      await concept.submitNewVersionOfFanfic({
        user: userAlice,
        ficName: ficName,
        ficText: ficTextV1,
        authorTags: ["scifi"],
        versionTitle: ficName,
        date: date2,
      });

      st.step("should view a specific fic version successfully", async () => {
        const resultV0 = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 0,
        });
        assertExists(resultV0.fic);
        assertEquals(resultV0.fic?.text, ficTextV0);
        assertEquals(resultV0.fic?.versionNumber, 0);

        const resultV1 = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 1,
        });
        assertExists(resultV1.fic);
        assertEquals(resultV1.fic?.text, ficTextV1);
        assertEquals(resultV1.fic?.versionNumber, 1);
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.viewFic({
          user: userBob,
          ficName: ficName,
          versionNumber: 0,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
      });

      st.step("should return an error if fic name does not exist", async () => {
        const result = await concept.viewFic({
          user: userAlice,
          ficName: "NonExistent",
          versionNumber: 0,
        });
        assertEquals(result, {
          error: `Fic with name 'NonExistent' does not exist for user '${userAlice}'.`,
        });
      });

      st.step("should return an error if version number is out of range", async () => {
        const resultTooHigh = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 2,
        });
        assertEquals(resultTooHigh, {
          error: `Version number '2' is out of range for fic '${ficName}'.`,
        });

        const resultTooLow = await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: -1,
        });
        assertEquals(resultTooLow, {
          error: `Version number '-1' is out of range for fic '${ficName}'.`,
        });
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
        const ficToDelete = (await concept.viewFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 1,
        })).fic;
        assertExists(ficToDelete);

        const result = await concept.deleteFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 1,
        });
        assertExists(result.fic);
        assertEquals(result.fic?.versionNumber, 1);
        assertEquals(result.fic?.text, ficTextV1);

        // Fetch the updated version to verify the state change
        const updatedVersionResult = await concept.getVersion({
          user: userAlice,
          versionTitle: ficName,
        });
        assertExists(updatedVersionResult.version);
        assertEquals(updatedVersionResult.version?.fics.length, 2);
        assertEquals(
          updatedVersionResult.version?.fics.find((f) => f.versionNumber === 1),
          undefined,
          "V1 should be gone",
        );
        assertExists(
          updatedVersionResult.version?.fics.find((f) => f.versionNumber === 0),
        );
        assertExists(
          updatedVersionResult.version?.fics.find((f) => f.versionNumber === 2),
        );
      });

      st.step("should delete the version if the last fic is removed", async () => {
        const ficNameSolo = "Solo Fic";
        await concept.submitNewFic({
          user: userAlice,
          ficName: ficNameSolo,
          ficText: "Only fic",
          authorTags: [],
          date: date1,
        });

        let versions = (await concept._getAllUserVersions({ user: userAlice }))
          .versions;
        assertExists(versions?.find((v) => v.title === ficNameSolo));

        await concept.deleteFic({
          user: userAlice,
          ficName: ficNameSolo,
          versionNumber: 0,
        });

        versions = (await concept._getAllUserVersions({ user: userAlice }))
          .versions;
        assertEquals(
          versions?.find((v) => v.title === ficNameSolo),
          undefined,
          "Solo fic version should be deleted",
        );
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.deleteFic({
          user: userBob,
          ficName: ficName,
          versionNumber: 0,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
      });

      st.step("should return an error if fic name does not exist", async () => {
        const result = await concept.deleteFic({
          user: userAlice,
          ficName: "NonExistent",
          versionNumber: 0,
        });
        assertEquals(result, {
          error: `Fic with name 'NonExistent' does not exist for user '${userAlice}'.`,
        });
      });

      st.step("should return an error if version number is out of range or not found", async () => {
        const result = await concept.deleteFic({
          user: userAlice,
          ficName: ficName,
          versionNumber: 99,
        });
        assertEquals(result, {
          error:
            `Fic revision with version number '99' not found for '${ficName}'.`,
        });
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
        const versionToDelete = (await concept.getVersion({
          user: userAlice,
          versionTitle: ficName1,
        })).version;
        assertExists(versionToDelete);
        assertEquals(versionToDelete?.fics.length, 2);

        const result = await concept.deleteVersion({
          user: userAlice,
          ficTitle: ficName1,
        });
        assertExists(result.version);
        assertEquals(result.version?.title, ficName1);
        assertEquals(result.version?.fics.length, 2);

        const versions = await concept._getAllUserVersions({ user: userAlice });
        assertEquals(versions.versions?.length, 1);
        assertEquals(versions.versions?.[0]?.title, ficName2);
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.deleteVersion({
          user: userBob,
          ficTitle: ficName1,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
      });

      st.step("should return an error if fic title does not exist", async () => {
        const result = await concept.deleteVersion({
          user: userAlice,
          ficTitle: "NonExistentFic",
        });
        assertEquals(result, {
          error:
            `Version with title 'NonExistentFic' not found for user '${userAlice}'.`,
        });
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

      st.step("should delete user and all their fics successfully", async () => {
        const result = await concept.deleteFicsAndUser({ user: userAlice });
        assertEquals(result, {});

        const versions = await concept._getAllUserVersions({ user: userAlice });
        assertEquals(versions.error, `User '${userAlice}' does not exist.`);
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.deleteFicsAndUser({ user: userBob });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
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

      st.step("should find fics matching a specific date", async () => {
        const result = await concept.findFicWithDate({
          user: userAlice,
          date: date1,
        });
        assertExists(result.fics);
        assertEquals(result.fics?.length, 2);
        assertExists(result.fics?.find((f) => f.name === ficName1));
        assertExists(result.fics?.find((f) => f.name === ficName3));
      });

      st.step("should return an empty set if no fics match the date", async () => {
        const result = await concept.findFicWithDate({
          user: userAlice,
          date: date3,
        });
        assertExists(result.fics);
        assertEquals(result.fics?.length, 0);
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.findFicWithDate({
          user: userBob,
          date: date1,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
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

      st.step("should retrieve a version successfully", async () => {
        const result = await concept.getVersion({
          user: userAlice,
          versionTitle: ficName,
        });
        assertExists(result.version);
        assertEquals(result.version?.title, ficName);
        assertEquals(result.version?.fics.length, 2);
        assertObjectMatch(result.version?.fics[0]!, {
          text: ficTextV0,
          versionNumber: 0,
        });
        assertObjectMatch(result.version?.fics[1]!, {
          text: ficTextV1,
          versionNumber: 1,
        });
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept.getVersion({
          user: userBob,
          versionTitle: ficName,
        });
        assertEquals(result, { error: `User '${userBob}' does not exist.` });
      });

      st.step("should return an error if version title does not exist", async () => {
        const result = await concept.getVersion({
          user: userAlice,
          versionTitle: "Unknown Title",
        });
        assertEquals(result, {
          error: `Version with title 'Unknown Title' not found for user '${userAlice}'.`,
        });
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

      st.step("should retrieve all versions for an existing user", async () => {
        const result = await concept._getAllUserVersions({ user: userAlice });
        assertExists(result.versions);
        assertEquals(result.versions?.length, 2);
        assertExists(result.versions?.find((v) => v.title === "FicA"));
        assertExists(result.versions?.find((v) => v.title === "FicB"));
      });

      st.step("should return an empty array if user has no versions", async () => {
        await concept.addUser({ user: userBob }); // Add Bob, but no fics
        const result = await concept._getAllUserVersions({ user: userBob });
        assertExists(result.versions);
        assertEquals(result.versions?.length, 0);
      });

      st.step("should return an error if user does not exist", async () => {
        const result = await concept._getAllUserVersions({
          user: "nonExistentUser" as ID,
        });
        assertEquals(result, { error: `User 'nonExistentUser' does not exist.` });
      });
    } finally {
      await client.close();
    }
  });
});
```
