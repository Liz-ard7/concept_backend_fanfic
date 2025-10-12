---
timestamp: 'Sun Oct 12 2025 17:24:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_172413.f045a7fc.md]]'
content_id: 6f33cb1ee68eec1344f9d6a2e206067777aef155c864588c998528655473f8f1
---

# response:

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LibraryConcept from "./LibraryConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;

const today = { day: 15, month: 7, year: 2024 };
const tomorrow = { day: 16, month: 7, year: 2024 };
const dayAfterTomorrow = { day: 17, month: 7, year: 2024 };

Deno.test("Principle: User submits a story and views it", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    console.log("--- Principle Test: User submits a story and views it ---");

    // Action: addUser (user)
    console.log(`Action: addUser (user: ${userAlice})`);
    const addUserResult = await libraryConcept.addUser({ user: userAlice });
    assertNotEquals("error" in addUserResult, true, `Expected user ${userAlice} to be added successfully.`);
    console.log(`  -> User ${userAlice} added.`);

    // Action: submitNewFic (user, ficText, ficName, authorTags, date)
    const ficName1 = "The Adventures of Deno";
    const ficText1 = "Chapter 1: The First Commit.";
    const authorTags1 = ["programming", "adventure"];
    console.log(
      `Action: submitNewFic (user: ${userAlice}, ficName: "${ficName1}", ...)`
    );
    const submitFicResult1 = await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: ficText1,
      ficName: ficName1,
      authorTags: authorTags1,
      date: today,
    });
    assertNotEquals("error" in submitFicResult1, true, `Expected new fic "${ficName1}" to be submitted successfully.`);
    const { fic: fic1 } = submitFicResult1 as { fic: typeof submitFicResult1 extends { fic: infer T } ? T : never };
    assertExists(fic1);
    assertEquals(fic1.name, ficName1);
    assertEquals(fic1.text, ficText1);
    console.log(`  -> Fic "${ficName1}" (ID: ${fic1._id}) submitted.`);

    const ficName2 = "A Journey Through Async/Await";
    const ficText2 = "Part 1: Understanding Promises.";
    const authorTags2 = ["tech", "tutorial"];
    console.log(
      `Action: submitNewFic (user: ${userAlice}, ficName: "${ficName2}", ...)`
    );
    const submitFicResult2 = await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: ficText2,
      ficName: ficName2,
      authorTags: authorTags2,
      date: tomorrow,
    });
    assertNotEquals("error" in submitFicResult2, true, `Expected new fic "${ficName2}" to be submitted successfully.`);
    const { fic: fic2 } = submitFicResult2 as { fic: typeof submitFicResult2 extends { fic: infer T } ? T : never };
    assertExists(fic2);
    assertEquals(fic2.name, ficName2);
    console.log(`  -> Fic "${ficName2}" (ID: ${fic2._id}) submitted.`);

    // Query: _getAllUserVersions (user) - to verify all stories are listed
    console.log(`Query: _getAllUserVersions (user: ${userAlice})`);
    const allVersionsResult = await libraryConcept._getAllUserVersions({ user: userAlice });
    assertNotEquals("error" in allVersionsResult, true, `Expected to retrieve all versions for user ${userAlice}.`);
    const { versions } = allVersionsResult as { versions: unknown[] };
    assertEquals(versions.length, 2, "Expected user to have 2 story versions.");
    assertEquals(versions[0].title, ficName1);
    assertEquals(versions[1].title, ficName2);
    console.log(`  -> User ${userAlice} has ${versions.length} versions.`);

    // Action: viewFic (user, ficName, versionNumber)
    console.log(
      `Action: viewFic (user: ${userAlice}, ficName: "${ficName1}", versionNumber: 0)`
    );
    const viewFicResult = await libraryConcept.viewFic({
      user: userAlice,
      ficName: ficName1,
      versionNumber: 0,
    });
    assertNotEquals("error" in viewFicResult, true, `Expected to view fic "${ficName1}" version 0 successfully.`);
    const { fic: viewedFic } = viewFicResult as { fic: typeof viewFicResult extends { fic: infer T } ? T : never };
    assertEquals(viewedFic.text, ficText1, "Viewed fic content should match submitted content.");
    assertEquals(viewedFic.authorTags, authorTags1, "Viewed fic author tags should match submitted tags.");
    console.log(`  -> Viewed fic "${viewedFic.name}" (version: ${viewedFic.versionNumber}). Content matches.`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 1: Adding users and duplicate story names", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    console.log("--- Scenario 1: Adding users and duplicate story names ---");

    // Action: addUser (user) - success
    console.log(`Action: addUser (user: ${userAlice})`);
    let result = await libraryConcept.addUser({ user: userAlice });
    assertNotEquals("error" in result, true, `Expected user ${userAlice} to be added successfully.`);
    console.log(`  -> User ${userAlice} added.`);

    // Action: addUser (user) - fail (already exists)
    console.log(`Action: addUser (user: ${userAlice}) - expecting error`);
    result = await libraryConcept.addUser({ user: userAlice });
    assertEquals("error" in result, true, `Expected error when adding existing user ${userAlice}.`);
    assertEquals(
      (result as { error: string }).error,
      `User '${userAlice}' already exists.`,
      "Error message should indicate user already exists."
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);

    // Action: submitNewFic (user, ...) - success
    const ficNameA = "Story Alpha";
    console.log(`Action: submitNewFic (user: ${userAlice}, ficName: "${ficNameA}", ...)`);
    result = await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Text A",
      ficName: ficNameA,
      authorTags: [],
      date: today,
    });
    assertNotEquals("error" in result, true, `Expected new fic "${ficNameA}" to be submitted successfully.`);
    console.log(`  -> Fic "${ficNameA}" submitted.`);

    // Action: submitNewFic (user, ...) - fail (duplicate title for same user)
    console.log(`Action: submitNewFic (user: ${userAlice}, ficName: "${ficNameA}", ...) - expecting error`);
    result = await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Text B",
      ficName: ficNameA, // Duplicate
      authorTags: [],
      date: tomorrow,
    });
    assertEquals("error" in result, true, `Expected error when submitting duplicate fic name "${ficNameA}" for user ${userAlice}.`);
    assertEquals(
      (result as { error: string }).error,
      `Fic with name '${ficNameA}' already exists for user '${userAlice}'.`,
      "Error message should indicate duplicate fic name."
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);

    // Action: submitNewFic (user, ...) - fail (user does not exist)
    const ficNameB = "Story Beta";
    console.log(`Action: submitNewFic (user: ${userBob}, ficName: "${ficNameB}", ...) - expecting error`);
    result = await libraryConcept.submitNewFic({
      user: userBob, // User Bob does not exist
      ficText: "Text C",
      ficName: ficNameB,
      authorTags: [],
      date: today,
    });
    assertEquals("error" in result, true, `Expected error when submitting fic for non-existent user ${userBob}.`);
    assertEquals(
      (result as { error: string }).error,
      `User '${userBob}' does not exist.`,
      "Error message should indicate user not found."
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 2: Submitting new versions and viewing specific versions", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    console.log("--- Scenario 2: Submitting new versions and viewing specific versions ---");

    await libraryConcept.addUser({ user: userAlice });
    console.log(`  -> User ${userAlice} added.`);

    const ficNameX = "Story X";
    const ficTextXv0 = "Text X - Version 0";
    const ficTextXv1 = "Text X - Version 1 (Updated)";
    const ficTextXv2 = "Text X - Version 2 (Further Updates)";

    // Submit initial fic (Version 0)
    console.log(`Action: submitNewFic (user: ${userAlice}, ficName: "${ficNameX}", ...)`);
    let result = await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: ficTextXv0,
      ficName: ficNameX,
      authorTags: ["initial"],
      date: today,
    });
    assertNotEquals("error" in result, true, `Expected to submit initial fic "${ficNameX}".`);
    console.log(`  -> Fic "${ficNameX}" v0 submitted.`);

    // Submit new version (Version 1)
    console.log(`Action: submitNewVersionOfFanfic (user: ${userAlice}, versionTitle: "${ficNameX}", ...)`);
    result = await libraryConcept.submitNewVersionOfFanfic({
      user: userAlice,
      ficText: ficTextXv1,
      authorTags: ["updated", "tag1"],
      versionTitle: ficNameX,
      date: tomorrow,
      ficName: ficNameX,
    });
    assertNotEquals("error" in result, true, `Expected to submit new version of "${ficNameX}".`);
    const { version: versionX_v1 } = result as { version: typeof result extends { version: infer T } ? T : never };
    assertEquals(versionX_v1.fics.length, 2, "Expected version to now have 2 fics.");
    assertEquals(versionX_v1.fics[1].versionNumber, 1, "Expected new fic to be version 1.");
    console.log(`  -> Fic "${ficNameX}" v1 submitted.`);

    // Submit another new version (Version 2)
    console.log(`Action: submitNewVersionOfFanfic (user: ${userAlice}, versionTitle: "${ficNameX}", ...)`);
    result = await libraryConcept.submitNewVersionOfFanfic({
      user: userAlice,
      ficText: ficTextXv2,
      authorTags: ["final", "tag2"],
      versionTitle: ficNameX,
      date: dayAfterTomorrow,
      ficName: ficNameX,
    });
    assertNotEquals("error" in result, true, `Expected to submit another new version of "${ficNameX}".`);
    const { version: versionX_v2 } = result as { version: typeof result extends { version: infer T } ? T : never };
    assertEquals(versionX_v2.fics.length, 3, "Expected version to now have 3 fics.");
    assertEquals(versionX_v2.fics[2].versionNumber, 2, "Expected new fic to be version 2.");
    console.log(`  -> Fic "${ficNameX}" v2 submitted.`);

    // Query: getVersion (user, versionTitle) - check all fics in version
    console.log(`Query: getVersion (user: ${userAlice}, versionTitle: "${ficNameX}")`);
    const getVersionResult = await libraryConcept.getVersion({ user: userAlice, versionTitle: ficNameX });
    assertNotEquals("error" in getVersionResult, true, `Expected to get version "${ficNameX}".`);
    const { version: fetchedVersion } = getVersionResult as { version: typeof getVersionResult extends { version: infer T } ? T : never };
    assertEquals(fetchedVersion.fics.length, 3, "Fetched version should contain all 3 fics.");
    console.log(`  -> Fetched version "${ficNameX}" contains ${fetchedVersion.fics.length} revisions.`);

    // Action: viewFic (user, ficName, versionNumber) - view version 0
    console.log(`Action: viewFic (user: ${userAlice}, ficName: "${ficNameX}", versionNumber: 0)`);
    result = await libraryConcept.viewFic({ user: userAlice, ficName: ficNameX, versionNumber: 0 });
    assertNotEquals("error" in result, true, "Expected to view version 0 successfully.");
    assertEquals((result as { fic: { text: string } }).fic.text, ficTextXv0, "Version 0 text should match.");
    console.log(`  -> Viewed v0. Text matches.`);

    // Action: viewFic (user, ficName, versionNumber) - view version 1
    console.log(`Action: viewFic (user: ${userAlice}, ficName: "${ficNameX}", versionNumber: 1)`);
    result = await libraryConcept.viewFic({ user: userAlice, ficName: ficNameX, versionNumber: 1 });
    assertNotEquals("error" in result, true, "Expected to view version 1 successfully.");
    assertEquals((result as { fic: { text: string } }).fic.text, ficTextXv1, "Version 1 text should match.");
    console.log(`  -> Viewed v1. Text matches.`);

    // Action: viewFic (user, ficName, versionNumber) - view version 2
    console.log(`Action: viewFic (user: ${userAlice}, ficName: "${ficNameX}", versionNumber: 2)`);
    result = await libraryConcept.viewFic({ user: userAlice, ficName: ficNameX, versionNumber: 2 });
    assertNotEquals("error" in result, true, "Expected to view version 2 successfully.");
    assertEquals((result as { fic: { text: string } }).fic.text, ficTextXv2, "Version 2 text should match.");
    console.log(`  -> Viewed v2. Text matches.`);

    // Action: viewFic (user, ficName, versionNumber) - fail (out of range)
    console.log(`Action: viewFic (user: ${userAlice}, ficName: "${ficNameX}", versionNumber: 3) - expecting error`);
    result = await libraryConcept.viewFic({ user: userAlice, ficName: ficNameX, versionNumber: 3 });
    assertEquals("error" in result, true, "Expected error when viewing out-of-range version.");
    assertEquals(
      (result as { error: string }).error,
      `Version number '3' is out of range for fic '${ficNameX}'. Valid range is 0 to 2.`,
      "Error message should indicate out of range."
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 3: Deleting fics, versions, and users", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    console.log("--- Scenario 3: Deleting fics, versions, and users ---");

    await libraryConcept.addUser({ user: userAlice });
    console.log(`  -> User ${userAlice} added.`);

    const ficNameDel1 = "Story For Deletion 1";
    const ficNameDel2 = "Story For Deletion 2";

    // Add two stories
    await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Text Del1 v0",
      ficName: ficNameDel1,
      authorTags: [],
      date: today,
    });
    await libraryConcept.submitNewVersionOfFanfic({
      user: userAlice,
      ficText: "Text Del1 v1",
      authorTags: [],
      versionTitle: ficNameDel1,
      date: tomorrow,
      ficName: ficNameDel1,
    });
    await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Text Del2 v0",
      ficName: ficNameDel2,
      authorTags: [],
      date: today,
    });
    console.log(`  -> Two stories "${ficNameDel1}" (2 versions) and "${ficNameDel2}" (1 version) submitted for ${userAlice}.`);

    // Get version of Story Del1 to confirm 2 fics
    console.log(`Query: getVersion (user: ${userAlice}, versionTitle: "${ficNameDel1}")`);
    let getVersionResult = await libraryConcept.getVersion({ user: userAlice, versionTitle: ficNameDel1 });
    assertNotEquals("error" in getVersionResult, true);
    let { version: del1Version } = getVersionResult as { version: typeof getVersionResult extends { version: infer T } ? T : never };
    assertEquals(del1Version.fics.length, 2, `Expected "${ficNameDel1}" to have 2 fics.`);
    console.log(`  -> "${ficNameDel1}" has ${del1Version.fics.length} fics.`);

    // Action: deleteFic (user, ficName, versionNumber) - delete v0 of Story Del1
    console.log(`Action: deleteFic (user: ${userAlice}, ficName: "${ficNameDel1}", versionNumber: 0)`);
    let result = await libraryConcept.deleteFic({ user: userAlice, ficName: ficNameDel1, versionNumber: 0 });
    assertNotEquals("error" in result, true, `Expected to delete fic v0 of "${ficNameDel1}".`);
    console.log(`  -> Deleted v0 of "${ficNameDel1}".`);

    // Get version of Story Del1 to confirm 1 fic and re-indexing
    console.log(`Query: getVersion (user: ${userAlice}, versionTitle: "${ficNameDel1}")`);
    getVersionResult = await libraryConcept.getVersion({ user: userAlice, versionTitle: ficNameDel1 });
    assertNotEquals("error" in getVersionResult, true);
    del1Version = getVersionResult as { version: typeof getVersionResult extends { version: infer T } ? T : never };
    assertEquals(del1Version.version.fics.length, 1, `Expected "${ficNameDel1}" to have 1 fic remaining.`);
    assertEquals(del1Version.version.fics[0].versionNumber, 0, "Remaining fic should be re-indexed to version 0.");
    assertEquals(del1Version.version.fics[0].text, "Text Del1 v1", "Remaining fic should be the original v1.");
    console.log(`  -> "${ficNameDel1}" now has 1 fic, re-indexed to v0.`);

    // Action: deleteFic (user, ficName, versionNumber) - delete last fic of Story Del1, causing version deletion
    console.log(`Action: deleteFic (user: ${userAlice}, ficName: "${ficNameDel1}", versionNumber: 0)`);
    result = await libraryConcept.deleteFic({ user: userAlice, ficName: ficNameDel1, versionNumber: 0 });
    assertNotEquals("error" in result, true, `Expected to delete last fic v0 of "${ficNameDel1}".`);
    console.log(`  -> Deleted last fic v0 of "${ficNameDel1}".`);

    // Verify Story Del1 version is gone
    console.log(`Query: getVersion (user: ${userAlice}, versionTitle: "${ficNameDel1}") - expecting error`);
    getVersionResult = await libraryConcept.getVersion({ user: userAlice, versionTitle: ficNameDel1 });
    assertEquals("error" in getVersionResult, true, `Expected error as "${ficNameDel1}" version should be deleted.`);
    assertEquals(
      (getVersionResult as { error: string }).error,
      `Version with title '${ficNameDel1}' not found for user '${userAlice}'.`,
      "Error message should indicate version not found."
    );
    console.log(`  -> Error: "${ficNameDel1}" version is gone.`);

    // Verify only Story Del2 remains
    console.log(`Query: _getAllUserVersions (user: ${userAlice})`);
    const allVersionsResult = await libraryConcept._getAllUserVersions({ user: userAlice });
    assertNotEquals("error" in allVersionsResult, true);
    assertEquals(allVersionsResult.versions.length, 1, "Expected only 1 version remaining.");
    assertEquals(allVersionsResult.versions[0].title, ficNameDel2, `Expected remaining version to be "${ficNameDel2}".`);
    console.log(`  -> Only "${ficNameDel2}" version remains for ${userAlice}.`);

    // Action: deleteVersion (user, ficTitle) - delete Story Del2
    console.log(`Action: deleteVersion (user: ${userAlice}, ficTitle: "${ficNameDel2}")`);
    result = await libraryConcept.deleteVersion({ user: userAlice, ficTitle: ficNameDel2 });
    assertNotEquals("error" in result, true, `Expected to delete version "${ficNameDel2}".`);
    console.log(`  -> Deleted version "${ficNameDel2}".`);

    // Verify no versions remain
    console.log(`Query: _getAllUserVersions (user: ${userAlice})`);
    const noVersionsResult = await libraryConcept._getAllUserVersions({ user: userAlice });
    assertNotEquals("error" in noVersionsResult, true);
    assertEquals(noVersionsResult.versions.length, 0, "Expected no versions remaining after deleting all.");
    console.log(`  -> User ${userAlice} now has no versions.`);

    // Action: deleteFicsAndUser (user) - delete Alice
    console.log(`Action: deleteFicsAndUser (user: ${userAlice})`);
    result = await libraryConcept.deleteFicsAndUser({ user: userAlice });
    assertNotEquals("error" in result, true, `Expected to delete user ${userAlice}.`);
    console.log(`  -> User ${userAlice} deleted.`);

    // Verify Alice is gone
    console.log(`Action: addUser (user: ${userAlice}) - expecting success as Alice was deleted`);
    result = await libraryConcept.addUser({ user: userAlice });
    assertNotEquals("error" in result, true, `Expected user ${userAlice} to be re-addable (was deleted).`);
    console.log(`  -> User ${userAlice} can be re-added (confirms deletion).`);

    // Action: deleteFicsAndUser (user) - fail (Bob does not exist)
    console.log(`Action: deleteFicsAndUser (user: ${userBob}) - expecting error`);
    result = await libraryConcept.deleteFicsAndUser({ user: userBob });
    assertEquals("error" in result, true, `Expected error when deleting non-existent user ${userBob}.`);
    assertEquals(
      (result as { error: string }).error,
      `User '${userBob}' does not exist.`,
      "Error message should indicate user not found."
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 4: Date-based search for fics", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    console.log("--- Scenario 4: Date-based search for fics ---");

    await libraryConcept.addUser({ user: userAlice });
    console.log(`  -> User ${userAlice} added.`);

    const date1 = { day: 1, month: 1, year: 2023 };
    const date2 = { day: 2, month: 1, year: 2023 };
    const date3 = { day: 3, month: 1, year: 2023 };

    // Submit fics with different dates
    await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Fic A v0 text",
      ficName: "Fic A",
      authorTags: [],
      date: date1,
    });
    await libraryConcept.submitNewVersionOfFanfic({
      user: userAlice,
      ficText: "Fic A v1 text",
      authorTags: [],
      versionTitle: "Fic A",
      date: date1, // Same date as v0
      ficName: "Fic A",
    });
    await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Fic B v0 text",
      ficName: "Fic B",
      authorTags: [],
      date: date2,
    });
    console.log(`  -> Fics submitted: "Fic A" (v0, v1) on ${date1.day}/${date1.month}/${date1.year}, "Fic B" (v0) on ${date2.day}/${date2.month}/${date2.year}.`);

    // Action: findFicWithDate (user, date) - expect 2 fics for date1
    console.log(`Action: findFicWithDate (user: ${userAlice}, date: ${date1.day}/${date1.month}/${date1.year})`);
    let result = await libraryConcept.findFicWithDate({ user: userAlice, date: date1 });
    assertNotEquals("error" in result, true, "Expected to find fics for date1.");
    const { fics: ficsDate1 } = result as { fics: unknown[] };
    assertEquals(ficsDate1.length, 2, "Expected 2 fics for date1.");
    assertExists(ficsDate1.find((f: { name: string; versionNumber: number }) => f.name === "Fic A" && f.versionNumber === 0));
    assertExists(ficsDate1.find((f: { name: string; versionNumber: number }) => f.name === "Fic A" && f.versionNumber === 1));
    console.log(`  -> Found ${ficsDate1.length} fics for date ${date1.day}/${date1.month}/${date1.year}.`);

    // Action: findFicWithDate (user, date) - expect 1 fic for date2
    console.log(`Action: findFicWithDate (user: ${userAlice}, date: ${date2.day}/${date2.month}/${date2.year})`);
    result = await libraryConcept.findFicWithDate({ user: userAlice, date: date2 });
    assertNotEquals("error" in result, true, "Expected to find fics for date2.");
    const { fics: ficsDate2 } = result as { fics: unknown[] };
    assertEquals(ficsDate2.length, 1, "Expected 1 fic for date2.");
    assertExists(ficsDate2.find((f: { name: string; versionNumber: number }) => f.name === "Fic B" && f.versionNumber === 0));
    console.log(`  -> Found ${ficsDate2.length} fics for date ${date2.day}/${date2.month}/${date2.year}.`);

    // Action: findFicWithDate (user, date) - expect 0 fics for date3
    console.log(`Action: findFicWithDate (user: ${userAlice}, date: ${date3.day}/${date3.month}/${date3.year})`);
    result = await libraryConcept.findFicWithDate({ user: userAlice, date: date3 });
    assertNotEquals("error" in result, true, "Expected to find no fics for date3.");
    const { fics: ficsDate3 } = result as { fics: unknown[] };
    assertEquals(ficsDate3.length, 0, "Expected 0 fics for date3.");
    console.log(`  -> Found ${ficsDate3.length} fics for date ${date3.day}/${date3.month}/${date3.year}.`);

    // Action: findFicWithDate (user, date) - fail (user does not exist)
    console.log(`Action: findFicWithDate (user: ${userBob}, date: ${date1.day}/${date1.month}/${date1.year}) - expecting error`);
    result = await libraryConcept.findFicWithDate({ user: userBob, date: date1 });
    assertEquals("error" in result, true, `Expected error when searching for fics for non-existent user ${userBob}.`);
    assertEquals(
      (result as { error: string }).error,
      `User '${userBob}' does not exist.`,
      "Error message should indicate user not found."
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 5: submitNewVersionOfFanfic and viewFic requirements", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    console.log("--- Scenario 5: submitNewVersionOfFanfic and viewFic requirements ---");

    await libraryConcept.addUser({ user: userAlice });
    console.log(`  -> User ${userAlice} added.`);

    const ficName = "Existing Story";
    const nonExistentFicName = "Nonexistent Story";

    await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Initial Text",
      ficName: ficName,
      authorTags: [],
      date: today,
    });
    console.log(`  -> Fic "${ficName}" submitted for ${userAlice}.`);

    // submitNewVersionOfFanfic: Requires user to exist
    console.log(`Action: submitNewVersionOfFanfic (user: ${userBob}, versionTitle: "${ficName}") - expecting error`);
    let result = await libraryConcept.submitNewVersionOfFanfic({
      user: userBob,
      ficText: "New Text",
      authorTags: [],
      versionTitle: ficName,
      date: tomorrow,
      ficName: ficName,
    });
    assertEquals("error" in result, true, "Expected error when user does not exist.");
    assertEquals((result as { error: string }).error, `User '${userBob}' does not exist.`);
    console.log(`  -> Error: ${(result as { error: string }).error}`);

    // submitNewVersionOfFanfic: Requires versionTitle to exist for user
    console.log(`Action: submitNewVersionOfFanfic (user: ${userAlice}, versionTitle: "${nonExistentFicName}") - expecting error`);
    result = await libraryConcept.submitNewVersionOfFanfic({
      user: userAlice,
      ficText: "New Text",
      authorTags: [],
      versionTitle: nonExistentFicName,
      date: tomorrow,
      ficName: nonExistentFicName,
    });
    assertEquals("error" in result, true, "Expected error when versionTitle does not exist.");
    assertEquals(
      (result as { error: string }).error,
      `Fic version '${nonExistentFicName}' does not exist for user '${userAlice}'.`
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);

    // viewFic: Requires user to exist
    console.log(`Action: viewFic (user: ${userBob}, ficName: "${ficName}", versionNumber: 0) - expecting error`);
    result = await libraryConcept.viewFic({
      user: userBob,
      ficName: ficName,
      versionNumber: 0,
    });
    assertEquals("error" in result, true, "Expected error when user does not exist.");
    assertEquals((result as { error: string }).error, `User '${userBob}' does not exist.`);
    console.log(`  -> Error: ${(result as { error: string }).error}`);

    // viewFic: Requires ficName to exist for user
    console.log(`Action: viewFic (user: ${userAlice}, ficName: "${nonExistentFicName}", versionNumber: 0) - expecting error`);
    result = await libraryConcept.viewFic({
      user: userAlice,
      ficName: nonExistentFicName,
      versionNumber: 0,
    });
    assertEquals("error" in result, true, "Expected error when ficName does not exist.");
    assertEquals(
      (result as { error: string }).error,
      `Fic with name '${nonExistentFicName}' does not exist for user '${userAlice}'.`
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);

    // viewFic: Requires versionNumber to exist for fic
    console.log(`Action: viewFic (user: ${userAlice}, ficName: "${ficName}", versionNumber: 1) - expecting error`);
    result = await libraryConcept.viewFic({
      user: userAlice,
      ficName: ficName,
      versionNumber: 1,
    });
    assertEquals("error" in result, true, "Expected error when versionNumber is out of range.");
    assertEquals(
      (result as { error: string }).error,
      `Version number '1' is out of range for fic '${ficName}'. Valid range is 0 to 0.`
    );
    console.log(`  -> Error: ${(result as { error: string }).error}`);
  } finally {
    await client.close();
  }
});
```
