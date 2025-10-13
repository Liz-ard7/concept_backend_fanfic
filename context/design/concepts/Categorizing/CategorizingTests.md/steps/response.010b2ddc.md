---
timestamp: 'Mon Oct 13 2025 15:23:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251013_152336.7168c060.md]]'
content_id: 010b2ddcac15b5ffafe5141d410bc2a10165c5b1179eede3bc314807bb864cd1
---

# response:

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CategorizingConcept from "./CategorizingConcept.ts";
import { Config as LLMConfig } from "../../gemini-llm.ts"; // Assuming relative path is correct

// For testing purposes, please set your Gemini API key in your environment variables:
// e.g., export GEMINI_API_KEY="YOUR_API_KEY"
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "dummy-api-key-for-testing";

// Dummy LLM config for testing
const llmConfig: LLMConfig = { apiKey: GEMINI_API_KEY };

// Define a few mock Fic IDs for testing
const ficA = "fic:StoryOfAlice" as ID;
const ficB = "fic:JourneyOfBob" as ID;
const ficC = "fic:MysteryOfCharlie" as ID;
const ficD = "fic:UnseenFic" as ID; // For non-existent cases

// Sample fic data, keeping text concise to manage LLM token limits during testing
const sampleFic1 = {
  ficId: ficA,
  ficText: `Alice, a young witch, discovered an ancient spellbook hidden in her grandmother's attic.
            The book detailed rituals for summoning forest spirits, but warned of dark consequences.
            She decided to try the simplest charm first, a levitation spell, and watched her cat float.
            Excited, she planned her next magical adventure.`,
  authorTags: [
    { name: "Magic", type: "Genre" },
    { name: "Witches", type: "Character" },
    { name: "Cats", type: "Animal" },
    { name: "Dark Arts", type: "Genre" }, // This might be suggested for removal
  ],
};

const sampleFic2 = {
  ficId: ficB,
  ficText: `Bob, a seasoned detective, was called to a peculiar crime scene: a jewel heist with no entry points.
            The only clue was a faint smell of ozone. He suspected an old rival, known for their unusual methods.
            His investigation led him to a secret society operating beneath the city.`,
  authorTags: [
    { name: "Detective", type: "Character" },
    { name: "Mystery", type: "Genre" },
    { name: "Police Procedural", type: "Genre" },
  ],
};

// # file: src/concepts/Categorizing/CategorizingConcept.test.ts

Deno.test("Categorizing Concept Tests", async (test) => {
  const [db, client] = await testDb();
  const categorizingConcept = new CategorizingConcept(db, llmConfig);

  try {
    // # trace: Operational principle: User submits story, gets tags, views results
    await test.step(
      "Principle: categorizeFic, then viewFicCategory",
      async () => {
        console.log("\n--- Principle Trace: Categorize Fic and View ---");

        // 1. A user submits their story and the tags the author has already added to the story.
        // It outputs a list of suggested tags and tells the user if any of their author tags should be removed.
        const categorizeResult = await categorizingConcept.categorizeFic(
          sampleFic1,
        );
        console.log("categorizeFic output:", categorizeResult);

        assertNotEquals(
          "error" in categorizeResult,
          true,
          "categorizeFic should succeed for sampleFic1.",
        );
        const { suggestedTags, tagsToRemove } = categorizeResult as {
          suggestedTags: { name: string; type: string; reason: string }[];
          tagsToRemove: { name: string; type: string; reason: string }[];
        };

        assertExists(suggestedTags, "Suggested tags should be present.");
        assertExists(tagsToRemove, "Tags to remove should be present.");
        assertEquals(
          Array.isArray(suggestedTags),
          true,
          "suggestedTags should be an array.",
        );
        assertEquals(
          Array.isArray(tagsToRemove),
          true,
          "tagsToRemove should be an array.",
        );
        // Expect at least some suggested tags, LLM dependent
        assertNotEquals(
          suggestedTags.length,
          0,
          "Expected suggested tags from LLM.",
        );

        // Verify that "Dark Arts" might be in tagsToRemove if the story doesn't justify it
        if (tagsToRemove.length > 0) {
          const darkArtsTag = tagsToRemove.find((t) =>
            t.name === "Dark Arts"
          );
          if (darkArtsTag) {
            console.log(
              `"Dark Arts" was suggested for removal: ${darkArtsTag.reason}`,
            );
          } else {
            console.log("Dark Arts was not suggested for removal.");
          }
        } else {
          console.log("No tags were suggested for removal.");
        }

        // 2. The author (or system) can view the stored categorization for the fic.
        const viewResult = await categorizingConcept.viewFicCategory({
          ficId: sampleFic1.ficId,
        });
        console.log("viewFicCategory output:", viewResult);

        assertNotEquals(
          "error" in viewResult,
          true,
          "viewFicCategory should find the categorized fic.",
        );
        const storedFicCategory = viewResult as {
          _id: ID;
          suggestedTags: unknown[];
          tagsToRemove: unknown[];
        };

        assertEquals(
          storedFicCategory._id,
          sampleFic1.ficId,
          "Stored fic ID should match.",
        );
        assertEquals(
          storedFicCategory.suggestedTags.length,
          suggestedTags.length,
          "Stored suggested tags count should match.",
        );
        assertEquals(
          storedFicCategory.tagsToRemove.length,
          tagsToRemove.length,
          "Stored tags to remove count should match.",
        );
      },
    );

    await test.step("Action: categorizeFic - Invalid Inputs (requires)", async () => {
      console.log("\n--- categorizeFic: Invalid Inputs ---");

      // Test missing ficId
      const noFicIdResult = await categorizingConcept.categorizeFic({
        ficId: "" as ID, // Intentionally empty ID
        ficText: "Some text",
        authorTags: [],
      });
      console.log("categorizeFic (no ficId) output:", noFicIdResult);
      assertEquals(
        "error" in noFicIdResult,
        true,
        "Should return error for missing ficId.",
      );
      assertEquals(
        (noFicIdResult as { error: string }).error,
        "Fic ID, text, and author tags are required.",
      );

      // Test missing ficText
      const noFicTextResult = await categorizingConcept.categorizeFic({
        ficId: ficD,
        ficText: "", // Intentionally empty text
        authorTags: [],
      });
      console.log("categorizeFic (no ficText) output:", noFicTextResult);
      assertEquals(
        "error" in noFicTextResult,
        true,
        "Should return error for missing ficText.",
      );
      assertEquals(
        (noFicTextResult as { error: string }).error,
        "Fic ID, text, and author tags are required.",
      );

      // Test missing authorTags (or undefined)
      const noAuthorTagsResult = await categorizingConcept.categorizeFic({
        ficId: ficD,
        ficText: "Some text",
        authorTags: undefined as unknown as { name: string; type: string }[], // Intentionally undefined
      });
      console.log("categorizeFic (no authorTags) output:", noAuthorTagsResult);
      assertEquals(
        "error" in noAuthorTagsResult,
        true,
        "Should return error for missing authorTags.",
      );
      assertEquals(
        (noAuthorTagsResult as { error: string }).error,
        "Fic ID, text, and author tags are required.",
      );
    });

    await test.step("Action: viewFicCategory - Non-existent FicCategory (requires)", async () => {
      console.log("\n--- viewFicCategory: Non-existent Fic ---");
      const nonExistentFicId = "fic:NonExistent" as ID;
      const viewResult = await categorizingConcept.viewFicCategory({
        ficId: nonExistentFicId,
      });
      console.log(
        "viewFicCategory (non-existent) output:",
        viewResult,
      );
      assertEquals(
        "error" in viewResult,
        true,
        "Viewing a non-existent fic category should return an error.",
      );
      assertEquals(
        (viewResult as { error: string }).error,
        `FicCategory for fic ID '${nonExistentFicId}' not found.`,
      );
    });

    await test.step("Action: deleteFicCategory - Success and Non-existent", async () => {
      console.log("\n--- deleteFicCategory: Success and Non-existent ---");

      // First, categorize a fic to have something to delete
      const categorizeResult = await categorizingConcept.categorizeFic(
        sampleFic2,
      );
      console.log("categorizeFic for deletion:", categorizeResult);
      assertNotEquals(
        "error" in categorizeResult,
        true,
        "categorizeFic should succeed for sampleFic2.",
      );

      // Successfully delete the ficCategory
      const deleteResult = await categorizingConcept.deleteFicCategory({
        ficId: sampleFic2.ficId,
      });
      console.log("deleteFicCategory (success) output:", deleteResult);
      assertNotEquals(
        "error" in deleteResult,
        true,
        "deleteFicCategory should succeed.",
      );
      assertEquals(
        (deleteResult as { _id: ID })._id,
        sampleFic2.ficId,
        "Deleted fic ID should match.",
      );

      // Verify it's gone
      const verifyDeleted = await categorizingConcept.viewFicCategory({
        ficId: sampleFic2.ficId,
      });
      console.log("viewFicCategory (after deletion) output:", verifyDeleted);
      assertEquals(
        "error" in verifyDeleted,
        true,
        "Fic category should no longer be found after deletion.",
      );

      // Attempt to delete a non-existent ficCategory
      const deleteNonExistentResult =
        await categorizingConcept.deleteFicCategory({ ficId: ficD });
      console.log(
        "deleteFicCategory (non-existent) output:",
        deleteNonExistentResult,
      );
      assertEquals(
        "error" in deleteNonExistentResult,
        true,
        "Deleting a non-existent fic category should return an error.",
      );
    });

    await test.step("Action: deleteFicCategories - Success, Empty List, and Non-existent", async () => {
      console.log("\n--- deleteFicCategories: Multiple Scenarios ---");

      // Categorize two fics to prepare for batch deletion
      const categorizeRes1 = await categorizingConcept.categorizeFic({
        ficId: ficC,
        ficText: "A story about three friends finding a treasure map.",
        authorTags: [{ name: "Adventure", type: "Genre" }],
      });
      assertNotEquals(
        "error" in categorizeRes1,
        true,
        "categorizeFic should succeed for ficC.",
      );

      const categorizeRes2 = await categorizingConcept.categorizeFic({
        ficId: ficD,
        ficText: "A cozy mystery in a small town.",
        authorTags: [{ name: "Cozy Mystery", type: "Genre" }],
      });
      assertNotEquals(
        "error" in categorizeRes2,
        true,
        "categorizeFic should succeed for ficD.",
      );

      // Verify they exist
      const viewC = await categorizingConcept.viewFicCategory({ ficId: ficC });
      assertNotEquals("error" in viewC, true, "FicC should exist before batch delete.");
      const viewD = await categorizingConcept.viewFicCategory({ ficId: ficD });
      assertNotEquals("error" in viewD, true, "FicD should exist before batch delete.");

      // Successfully delete multiple ficCategories
      const deleteManyResult = await categorizingConcept.deleteFicCategories({
        ficIds: [ficC, ficD],
      });
      console.log("deleteFicCategories (success) output:", deleteManyResult);
      assertNotEquals(
        "error" in deleteManyResult,
        true,
        "deleteFicCategories should succeed.",
      );
      assertEquals(
        (deleteManyResult as { deletedCount: number }).deletedCount,
        2,
        "Should delete 2 fic categories.",
      );

      // Verify both are gone
      const verifyDeletedC = await categorizingConcept.viewFicCategory({
        ficId: ficC,
      });
      assertEquals(
        "error" in verifyDeletedC,
        true,
        "FicC should no longer be found after batch deletion.",
      );
      const verifyDeletedD = await categorizingConcept.viewFicCategory({
        ficId: ficD,
      });
      assertEquals(
        "error" in verifyDeletedD,
        true,
        "FicD should no longer be found after batch deletion.",
      );

      // Attempt to delete with an empty list (requires)
      const deleteEmptyResult = await categorizingConcept.deleteFicCategories({
        ficIds: [],
      });
      console.log(
        "deleteFicCategories (empty list) output:",
        deleteEmptyResult,
      );
      assertEquals(
        "error" in deleteEmptyResult,
        true,
        "Should return error for empty ficIds list.",
      );

      // Attempt to delete non-existent IDs (should return 0 deleted, but not an error unless all were non-existent)
      const deleteNonExisting = await categorizingConcept.deleteFicCategories({
        ficIds: ["fic:DoesNotExist1" as ID, "fic:DoesNotExist2" as ID],
      });
      console.log(
        "deleteFicCategories (non-existing) output:",
        deleteNonExisting,
      );
      assertEquals(
        "error" in deleteNonExisting,
        true, // Current implementation returns error if 0 deleted.
        "Should return error if no categories are found/deleted.",
      );
      assertEquals(
        (deleteNonExisting as { error: string }).error,
        "No FicCategories found or deleted for the provided IDs.",
      );
    });

    await test.step("Edge Case: Author tags filtered from suggested tags", async () => {
      console.log("\n--- Edge Case: Author Tags Filtered ---");
      const ficE = "fic:FilterTest" as ID;
      const ficWithOverlap = {
        ficId: ficE,
        ficText: `A dragon hoarded gold and a knight sought to slay it. The dragon, however, was quite fond of riddles.
                  The knight, known for his bravery, solved the first riddle: "What has an eye but cannot see?"`,
        authorTags: [
          { name: "Dragons", type: "Creature" },
          { name: "Knights", type: "Character" },
          { name: "Riddles", type: "Plot Device" },
          { name: "Fantasy", type: "Genre" }, // This is very likely to be suggested by LLM
        ],
      };

      const categorizeResult = await categorizingConcept.categorizeFic(
        ficWithOverlap,
      );
      console.log("categorizeFic (overlap test) output:", categorizeResult);

      assertNotEquals(
        "error" in categorizeResult,
        true,
        "categorizeFic should succeed for ficWithOverlap.",
      );
      const { suggestedTags } = categorizeResult as {
        suggestedTags: { name: string; type: string; reason: string }[];
        tagsToRemove: unknown[];
      };

      const hasFantasyTag = suggestedTags.some((tag) =>
        tag.name.toLowerCase() === "fantasy"
      );
      assertEquals(
        hasFantasyTag,
        false,
        "Suggested tags should NOT include 'Fantasy' as it's an author tag.",
      );

      const viewResult = await categorizingConcept.viewFicCategory({
        ficId: ficWithOverlap.ficId,
      });
      const storedSuggestedTags = (viewResult as { suggestedTags: unknown[] })
        .suggestedTags;
      const storedHasFantasyTag = storedSuggestedTags.some((tag: {name: string}) =>
        tag.name.toLowerCase() === "fantasy"
      );
      assertEquals(
        storedHasFantasyTag,
        false,
        "Stored suggested tags should NOT include 'Fantasy'.",
      );
    });
  } finally {
    await client.close(); // Ensure the database client is closed after all tests
  }
});
```
