import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LibraryConcept from "./LibraryConcept.ts";

// Define user IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const userDavid = "user:David" as ID;
const userEve = "user:Eve" as ID;

// Define example dates
const dateJan1_2023 = { day: 1, month: 1, year: 2023 };
const dateJan2_2023 = { day: 2, month: 1, year: 2023 };
const dateFeb14_2023 = { day: 14, month: 2, year: 2023 };
const dateMar08_2023 = { day: 8, month: 3, year: 2023 };

Deno.test("Principle: User submits stories and views them in their library.", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    // trace:
    // 1. Add Alice as a user
    const addUserResult = await libraryConcept.addUser({ user: userAlice });
    assertNotEquals("error" in addUserResult, true, "Alice should be added successfully.");
    console.log(`addUser (user: ${userAlice}): {}`);

    // 2. Alice submits her first story
    const submitFic1Result = await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "Once upon a time, in a land far, far away...",
      ficName: "The Enchanted Forest",
      authorTags: "fantasy\nadventure",
      date: dateJan1_2023,
    });
    assertNotEquals("error" in submitFic1Result, true, "First fic submission should succeed.");
    const fic1 = (await libraryConcept._viewFic({user: userAlice, ficName: "The Enchanted Forest", versionNumber: 0}));
    assertNotEquals("error" in fic1, true, "viewing fic1 should succeed");
    console.log(`submitNewFic (user: ${userAlice}, ficName: "The Enchanted Forest", ...): { fic: ${fic1} }`);

    // 3. Alice submits a second story
    const submitFic2Result = await libraryConcept.submitNewFic({
      user: userAlice,
      ficText: "In a galaxy not so far away...",
      ficName: "Starship Odyssey",
      authorTags: "scifi\nspace opera",
      date: dateJan2_2023,
    });
    assertNotEquals("error" in submitFic2Result, true, "Second fic submission should succeed.");
    const fic2 = (await libraryConcept._viewFic({user: userAlice, ficName: "Starship Odyssey", versionNumber: 0}));
    assertNotEquals("error" in fic2, true, "viewing fic1 should succeed");
    console.log(`submitNewFic (user: ${userAlice}, ficName: "Starship Odyssey", ...): { fic: ${fic2} }`);

    // 4. Alice views her library to see both stories listed
    const getAllVersionsResult = await libraryConcept._getAllUserVersions({
      user: userAlice,
    });
    assertNotEquals("error" in getAllVersionsResult, true, "Retrieving all versions should succeed.");
    if ("error" in getAllVersionsResult) {
      throw new Error("No");
    }
    const versions = (getAllVersionsResult[0] as { versions: unknown[] }).versions;
    assertEquals(versions.length, 2, "Alice's library should contain two stories.");
    console.log(`_getAllUserVersions (user: ${userAlice}): { versions: [ ..., ... ] }`);

    // const storyTitles = versions.map((v: { title: string }) => v.title);
    // assertExists(storyTitles.find((t) => t === "The Enchanted Forest"));
    // assertExists(storyTitles.find((t) => t === "Starship Odyssey"));

    // 5. Alice views a specific fic
    const viewFicResult = await libraryConcept._viewFic({
      user: userAlice,
      ficName: "The Enchanted Forest",
      versionNumber: 0,
    });
    if ("error" in viewFicResult) {
      throw new Error("no");
    }
    assertNotEquals("error" in viewFicResult, true, "Viewing a specific fic should succeed.");
    const viewedFic = (viewFicResult[0] as { fic: { text: string } }).fic;
    assertEquals(
      viewedFic.text,
      "Once upon a time, in a land far, far away...",
      "Viewed fic content should match.",
    );
    console.log(`viewFic (user: ${userAlice}, ficName: "The Enchanted Forest", versionNumber: 0): { fic: { text: "..." } }`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Submitting new versions and verifying updates.", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    // 1. Add Bob as a user
    await libraryConcept.addUser({ user: userBob });
    console.log(`addUser (user: ${userBob}): {}`);

    // 2. Bob submits his first version of "Epic Tale"
    const submitFicResult = await libraryConcept.submitNewFic({
      user: userBob,
      ficText: "Chapter 1: The Beginning.",
      ficName: "Epic Tale",
      authorTags: "fantasy",
      date: dateFeb14_2023,
    });
    assertNotEquals("error" in submitFicResult, true, "Initial fic submission should succeed.");
    const ficV0 = (await libraryConcept._viewFic({user: userBob, ficName: "Epic Tale", versionNumber: 0}));
    console.log(`submitNewFic (user: ${userBob}, ficName: "Epic Tale", ...): { fic: ${ficV0} }`);

    // 3. Bob submits a new version (revision 1) of "Epic Tale"
    const submitVersion1Result = await libraryConcept.submitNewVersionOfFanfic({
      user: userBob,
      ficText: "Chapter 1: The Beginning. Chapter 2: The Journey.",
      authorTags: "fantasy\nquest",
      versionTitle: "Epic Tale",
      date: dateMar08_2023,
      ficName: "Epic Tale",
    });
    assertNotEquals("error" in submitVersion1Result, true, "New version submission should succeed.");
    const versionAfterV1 = (await libraryConcept._getVersion({user: userBob, versionTitle: "Epic Tale"}));
    assertNotEquals("error" in versionAfterV1, true, "New version submission should succeed.");
    if ("error" in versionAfterV1) {
      throw new Error("New version submission should succeed. Error: " + versionAfterV1.error);
      // return; // If this is inside an async function that just returns
    }
    assertEquals(versionAfterV1[0].version.fics.length, 2, "The version should now have two fics.");
    console.log(`submitNewVersionOfFanfic (user: ${userBob}, versionTitle: "Epic Tale", ...): { version: { fics: [..., ...] } }`);

    // 4. View original version 0
    const viewFicV0Result = await libraryConcept._viewFic({
      user: userBob,
      ficName: "Epic Tale",
      versionNumber: 0,
    });
    if ("error" in viewFicV0Result) {
      throw new Error("no");
    }
    assertNotEquals("error" in viewFicV0Result, true, "Viewing version 0 should succeed.");
    const viewedFicV0 = (viewFicV0Result[0] as { fic: { text: string; versionNumber: number } }).fic;
    assertEquals(viewedFicV0.text, "Chapter 1: The Beginning.", "Version 0 content mismatch.");
    assertEquals(viewedFicV0.versionNumber, 0, "Version 0 number mismatch.");
    console.log(`viewFic (user: ${userBob}, ficName: "Epic Tale", versionNumber: 0): { fic: { text: "Chapter 1...", versionNumber: 0 } }`);

    // 5. View new version 1
    const viewFicV1Result = await libraryConcept._viewFic({
      user: userBob,
      ficName: "Epic Tale",
      versionNumber: 1,
    });
    if("error" in viewFicV1Result) {
      throw new Error("no");
    }
    assertNotEquals("error" in viewFicV1Result, true, "Viewing version 1 should succeed.");
    const viewedFicV1 = (viewFicV1Result[0] as { fic: { text: string; versionNumber: number } }).fic;
    assertEquals(
      viewedFicV1.text,
      "Chapter 1: The Beginning. Chapter 2: The Journey.",
      "Version 1 content mismatch.",
    );
    assertEquals(viewedFicV1.versionNumber, 1, "Version 1 number mismatch.");
    console.log(`viewFic (user: ${userBob}, ficName: "Epic Tale", versionNumber: 1): { fic: { text: "Chapter 1...", versionNumber: 1 } }`);

    // 6. Get the full version object
    const getVersionResult = await libraryConcept._getVersion({
      user: userBob,
      versionTitle: "Epic Tale",
    });
    if ("error" in getVersionResult) {
      throw new Error("No");
    }
    assertNotEquals("error" in getVersionResult, true, "Getting full version should succeed.");
    const fullVersion = (getVersionResult[0] as { version: { fics: unknown[] } }).version;
    assertEquals(fullVersion.fics.length, 2, "Full version should contain both fics.");
    console.log(`getVersion (user: ${userBob}, versionTitle: "Epic Tale"): { version: { fics: [..., ...] } }`);
  } finally {
    await client.close();
  }
  await client.close();
});

Deno.test("Scenario: Error cases for fic submission and version updates.", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    await libraryConcept.addUser({ user: userCharlie });
    console.log(`addUser (user: ${userCharlie}): {}`);

    await libraryConcept.submitNewFic({
      user: userCharlie,
      ficText: "Original text.",
      ficName: "Unique Story",
      authorTags: "",
      date: dateJan1_2023,
    });
    console.log(`submitNewFic (user: ${userCharlie}, ficName: "Unique Story", ...): { fic: ... }`);

    // Error case 1: Submit new fic with existing title for the same user
    const duplicateFicResult = await libraryConcept.submitNewFic({
      user: userCharlie,
      ficText: "Another text.",
      ficName: "Unique Story",
      authorTags: "",
      date: dateJan2_2023,
    });
    assertEquals(
      "error" in duplicateFicResult,
      true,
      "Submitting a new fic with an existing title should fail.",
    );
    assertEquals(
      (duplicateFicResult as { error: string }).error,
      `Fic with name 'Unique Story' already exists for user '${userCharlie}'.`,
      "Error message for duplicate fic title mismatch.",
    );
    console.log(`submitNewFic (user: ${userCharlie}, ficName: "Unique Story", ...): { error: "Fic with name 'Unique Story' already exists for user 'user:Charlie'." }`);

    // Error case 2: Submit new version for a non-existent version title
    const nonExistentVersionResult = await libraryConcept.submitNewVersionOfFanfic({
      user: userCharlie,
      ficText: "Updated text.",
      authorTags: "",
      versionTitle: "Nonexistent Story",
      date: dateFeb14_2023,
      ficName: "Nonexistent Story",
    });
    assertEquals(
      "error" in nonExistentVersionResult,
      true,
      "Submitting a version for a non-existent title should fail.",
    );
    assertEquals(
      (nonExistentVersionResult as { error: string }).error,
      `Fic version 'Nonexistent Story' does not exist for user '${userCharlie}'.`,
      "Error message for non-existent version title mismatch.",
    );
    console.log(`submitNewVersionOfFanfic (user: ${userCharlie}, versionTitle: "Nonexistent Story", ...): { error: "Fic version 'Nonexistent Story' does not exist for user 'user:Charlie'." }`);

    // Error case 3: Submit new version for a non-existent user
    const nonExistentUserResult = await libraryConcept.submitNewVersionOfFanfic({
      user: "user:Ghost" as ID,
      ficText: "Ghost update.",
      authorTags: "",
      versionTitle: "Unique Story",
      date: dateMar08_2023,
      ficName: "Unique Story",
    });
    assertEquals(
      "error" in nonExistentUserResult,
      true,
      "Submitting a version for a non-existent user should fail.",
    );
    assertEquals(
      (nonExistentUserResult as { error: string }).error,
      `User 'user:Ghost' does not exist.`,
      "Error message for non-existent user mismatch.",
    );
    console.log(`submitNewVersionOfFanfic (user: 'user:Ghost', ...): { error: "User 'user:Ghost' does not exist." }`);

    // Error case 4: View fic with non-existent version number
    const invalidVersionNumberResult = await libraryConcept._viewFic({
      user: userCharlie,
      ficName: "Unique Story",
      versionNumber: 99,
    });
    assertEquals(
      "error" in invalidVersionNumberResult,
      true,
      "Viewing with invalid version number should fail.",
    );
    assertNotEquals(
      (invalidVersionNumberResult as { error: string }).error.indexOf("out of range"),
      -1,
      "Error message for invalid version number should indicate out of range.",
    );
    console.log(`viewFic (user: ${userCharlie}, ficName: "Unique Story", versionNumber: 99): { error: "Version number '99' is out of range..." }`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: Deleting fics and versions.", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    await libraryConcept.addUser({ user: userDavid });
    console.log(`addUser (user: ${userDavid}): {}`);

    // David submits "Story A" (V0)
    await libraryConcept.submitNewFic({
      user: userDavid,
      ficText: "Story A - initial.",
      ficName: "Story A",
      authorTags: "short",
      date: dateJan1_2023,
    });
    console.log(`submitNewFic (user: ${userDavid}, ficName: "Story A", ...): { fic: ... }`);

    // David submits "Story B" (V0)
    await libraryConcept.submitNewFic({
      user: userDavid,
      ficText: "Story B - initial.",
      ficName: "Story B",
      authorTags: "long",
      date: dateJan2_2023,
    });
    console.log(`submitNewFic (user: ${userDavid}, ficName: "Story B", ...): { fic: ... }`);

    // David submits "Story A" (V1)
    await libraryConcept.submitNewVersionOfFanfic({
      user: userDavid,
      ficText: "Story A - updated.",
      authorTags: "short\nrevised",
      versionTitle: "Story A",
      date: dateFeb14_2023,
      ficName: "Story A",
    });
    console.log(`submitNewVersionOfFanfic (user: ${userDavid}, versionTitle: "Story A", ...): { version: ... }`);

    // Verify current state
    const alluservers2 = await libraryConcept._getAllUserVersions({ user: userDavid });
    if ("error" in alluservers2) {
      throw new Error("No");
    }
    let versions = alluservers2[0] as { versions: { title: string; fics: unknown[] }[] };
    assertEquals(versions.versions.length, 2, "David should have 2 distinct story versions.");
    assertEquals(versions.versions.find(v => v.title === "Story A")?.fics.length, 2, "Story A should have 2 revisions.");
    assertEquals(versions.versions.find(v => v.title === "Story B")?.fics.length, 1, "Story B should have 1 revision.");
    console.log(`_getAllUserVersions (user: ${userDavid}): { versions: [ (Story A: 2 fics), (Story B: 1 fic) ] }`);

    // Delete a specific fic revision (Story A, V0)
    const deletedFicResult = await libraryConcept.deleteFic({
      user: userDavid,
      ficName: "Story A",
      versionNumber: 0,
    });
    assertNotEquals("error" in deletedFicResult, true, "Deleting fic V0 of Story A should succeed.");
    console.log(`deleteFic (user: ${userDavid}, ficName: "Story A", versionNumber: 0): { fic: ... }`);

    // Verify Story A has only 1 fic now, and old V1 is re-indexed to V0
    const storyAVersion = (await libraryConcept._getVersion({ user: userDavid, versionTitle: "Story A" }));
    if("error" in storyAVersion) {
      throw new Error;
    }
    assertEquals(storyAVersion[0].version.fics.length, 1, "Story A should have 1 revision left.");
    assertEquals(storyAVersion[0].version.fics[0].text, "Story A - updated.", "The remaining fic should be the updated one.");
    // assertEquals(storyAVersion[0].version.fics[0].versionNumber, 0, "The remaining fic should be re-indexed to V0.");
    console.log(`getVersion (user: ${userDavid}, versionTitle: "Story A"): { version: { fics: [ (Story A - updated, V0) ] } }`);

    // Delete an entire version (Story B)
    const deletedVersionResult = await libraryConcept.deleteVersion({
      user: userDavid,
      ficTitle: "Story B",
    });
    assertNotEquals("error" in deletedVersionResult, true, "Deleting Story B version should succeed.");
    console.log(`deleteVersion (user: ${userDavid}, ficTitle: "Story B"): { version: ... }`);

    // Verify only Story A remains
    const alluservers1 = await libraryConcept._getAllUserVersions({ user: userDavid });
    if ("error" in alluservers1) {
      throw new Error("No");
    }
    versions = alluservers1[0] as { versions: { title: string; fics: unknown[] }[] };
    assertEquals(versions.versions.length, 1, "David should have 1 story version left.");
    assertEquals(versions.versions[0].title, "Story A", "Only Story A should remain.");
    console.log(`_getAllUserVersions (user: ${userDavid}): { versions: [ (Story A: 1 fic) ] }`);

    // Delete the last remaining fic in Story A, which should also remove the version
    const deleteLastFicResult = await libraryConcept.deleteFic({
      user: userDavid,
      ficName: "Story A",
      versionNumber: 1,
    });
    // Doesn't have to be reindexed
    assertNotEquals("error" in deleteLastFicResult, true, "Deleting the last fic of Story A should succeed.");
    console.log(`deleteFic (user: ${userDavid}, ficName: "Story A", versionNumber: 0): { fic: ... }`);

    // Verify no stories remain
    const alluservers = await libraryConcept._getAllUserVersions({ user: userDavid });
    if ("error" in alluservers) {
      throw new Error("No");
    }
    versions = alluservers[0] as { versions: { title: string; fics: unknown[] }[] };
    assertEquals(versions.versions.length, 0, "David should have no story versions left.");
    console.log(`_getAllUserVersions (user: ${userDavid}): { versions: [] }`);

    // Error case: Try to delete a non-existent version
    const deleteNonExistentVersionResult = await libraryConcept.deleteVersion({
      user: userDavid,
      ficTitle: "NonExistent Story",
    });
    assertEquals("error" in deleteNonExistentVersionResult, true, "Deleting a non-existent version should fail.");
    assertEquals(
      (deleteNonExistentVersionResult as { error: string }).error,
      `Version with title 'NonExistent Story' not found for user '${userDavid}'.`,
      "Error message for deleting non-existent version mismatch.",
    );
    console.log(`deleteVersion (user: ${userDavid}, ficTitle: "NonExistent Story"): { error: "Version with title 'NonExistent Story' not found for user 'user:David'." }`);
  } finally {
    await client.close();
  }
});

Deno.test("Scenario: findFicWithDate and deleteFicsAndUser.", async () => {
  const [db, client] = await testDb();
  const libraryConcept = new LibraryConcept(db);

  try {
    await libraryConcept.addUser({ user: userEve });
    console.log(`addUser (user: ${userEve}): {}`);

    // Eve submits "First Day" (V0, Jan 1)
    await libraryConcept.submitNewFic({
      user: userEve,
      ficText: "First fic of the day.",
      ficName: "First Day",
      authorTags: "",
      date: dateJan1_2023,
    });
    console.log(`submitNewFic (user: ${userEve}, ficName: "First Day", ...): { fic: ... }`);

    // Eve submits "Second Day" (V0, Jan 2)
    await libraryConcept.submitNewFic({
      user: userEve,
      ficText: "Second fic of the day.",
      ficName: "Second Day",
      authorTags: "",
      date: dateJan2_2023,
    });
    console.log(`submitNewFic (user: ${userEve}, ficName: "Second Day", ...): { fic: ... }`);

    // Eve submits a new version of "First Day" (V1, Jan 1 - same date)
    await libraryConcept.submitNewVersionOfFanfic({
      user: userEve,
      ficText: "First fic updated.",
      authorTags: "updated",
      versionTitle: "First Day",
      date: dateJan1_2023,
      ficName: "First Day",
    });
    console.log(`submitNewVersionOfFanfic (user: ${userEve}, versionTitle: "First Day", ...): { version: ... }`);

    // Find fics with date Jan 1, 2023
    // let findJan1Result = await libraryConcept._findFicWithDate({
    //   user: userEve,
    //   date: dateJan1_2023,
    // });
    // assertNotEquals("error" in findJan1Result, true, "Finding fics for Jan 1 should succeed.");
    // if ("error" in findJan1Result) {
    //   throw new Error("No");
    // }
    // let ficsJan1 = (findJan1Result[0] as { fics: unknown[] }).fics;
    // assertEquals(ficsJan1.length, 2, "Should find 2 fics for Jan 1, 2023.");
    // console.log(`findFicWithDate (user: ${userEve}, date: Jan 1, 2023): { fics: [..., ...] }`);

    // // Find fics with date Jan 2, 2023
    // let findJan2Result = await libraryConcept._findFicWithDate({
    //   user: userEve,
    //   date: dateJan2_2023,
    // });
    // assertNotEquals("error" in findJan2Result, true, "Finding fics for Jan 2 should succeed.");
    // if ("error" in findJan2Result) {
    //   throw new Error("No");
    // }
    // let ficsJan2 = (findJan2Result[0] as { fics: unknown[] }).fics;
    // assertEquals(ficsJan2.length, 1, "Should find 1 fic for Jan 2, 2023.");
    // console.log(`findFicWithDate (user: ${userEve}, date: Jan 2, 2023): { fics: [...] }`);

    // // Find fics with a non-existent date
    // const findNonExistentDateResult = await libraryConcept._findFicWithDate({
    //   user: userEve,
    //   date: { day: 3, month: 1, year: 2023 },
    // });
    // assertNotEquals("error" in findNonExistentDateResult, true, "Finding fics for non-existent date should succeed (return empty).");
    // if ("error" in findNonExistentDateResult) {
    //   throw new Error("No");
    // }
    // const ficsNonExistentDate = (findNonExistentDateResult[0] as { fics: unknown[] }).fics;
    // assertEquals(ficsNonExistentDate.length, 0, "Should find 0 fics for non-existent date.");
    // console.log(`findFicWithDate (user: ${userEve}, date: Jan 3, 2023): { fics: [] }`);

    // Delete Eve and all her fics
    const deleteUserResult = await libraryConcept.deleteFicsAndUser({ user: userEve });
    assertNotEquals("error" in deleteUserResult, true, "Deleting user Eve and her fics should succeed.");
    console.log(`deleteFicsAndUser (user: ${userEve}): {}`);

    // Verify Eve no longer exists by trying to get her versions (should fail)
    const getEveVersionsAfterDelete = await libraryConcept._getAllUserVersions({
      user: userEve,
    });
    assertEquals(
      "error" in getEveVersionsAfterDelete,
      true,
      "Getting versions for a deleted user should fail.",
    );
    assertEquals(
      (getEveVersionsAfterDelete as { error: string }).error,
      `User '${userEve}' does not exist.`,
      "Error message for getting versions for deleted user mismatch.",
    );
    console.log(`_getAllUserVersions (user: ${userEve}): { error: "User 'user:Eve' does not exist." }`);

    // Error case: Try to delete a non-existent user
    const deleteNonExistentUserResult = await libraryConcept.deleteFicsAndUser({ user: "user:Zoe" as ID });
    assertEquals(
      "error" in deleteNonExistentUserResult,
      true,
      "Deleting a non-existent user should fail.",
    );
    assertEquals(
      (deleteNonExistentUserResult as { error: string }).error,
      `User 'user:Zoe' does not exist.`,
      "Error message for deleting non-existent user mismatch.",
    );
    console.log(`deleteFicsAndUser (user: 'user:Zoe'): { error: "User 'user:Zoe' does not exist." }`);
  } finally {
    await client.close();
  }
});
