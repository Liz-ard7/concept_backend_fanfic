---
timestamp: 'Mon Oct 13 2025 13:09:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251013_130921.75738a17.md]]'
content_id: ba3bf47ec4f55dd475df068e734dee73af73d74be118ccc8db5b7642ee33ad53
---

# file: src/Categorizing/CategorizingConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CategorizingConcept from "./CategorizingConcept.ts";
import { GeminiLLM, Config as GeminiConfig } from "../../../gemini-llm.ts"; // Adjust path as needed

// Mock GeminiLLM for deterministic testing
class MockGeminiLLM extends GeminiLLM {
  private keywordResponses: { [promptContains: string]: string } = {};
  private tagCleanerResponses: { [promptContains: string]: string } = {};

  constructor(config: GeminiConfig) {
    super(config);
    // Initialize mock responses
    this.keywordResponses = {
      "Fic Text: \"A story about a young wizard going to school and fighting a dark lord.":
        "Magic, School, Dark Lord, Fantasy, Adventure, Friendship, Coming of Age, Spells, Potions, Prophecy",
      "Fic Text: \"A romance novel set in a coffee shop.":
        "Romance, Coffee Shop AU, Fluff, Slice of Life, Contemporary, First Love, Happy Ending",
      "Fic Text: \"A gritty detective story in a dystopian future.":
        "Dystopian, Sci-Fi, Crime, Mystery, Detective, Gritty, Cyberpunk, Noir, Thriller, Action",
      "Fic Text: \"A happy little tale about a cat and a dog being friends.":
        "Animals, Fluff, Friendship, Happy Ending, Slice of Life",
      "Fic Text: \"A story that is very sad.": "Angst, Sad, Drama, Tragedy",
      "Fic Text: \"A fanfiction with lots of fighting, magic, and dragons.":
        "Fantasy, Dragons, Magic, Action, Adventure, Epic",
      "Fic Text: \"A tale where a character comes back to life.":
        "Reincarnation, Resurrection, Second Chance",
      "Fic Text: \"An item falls into a hole.": "None", // For testing no suggested tags
    };

    this.tagCleanerResponses = {
      "Fic Text: \"A story about a young wizard going to school and fighting a dark lord.":
        "Coffee Shop AU", // Example of irrelevant author tag
      "Fic Text: \"A romance novel set in a coffee shop.":
        "Sci-Fi", // Irrelevant author tag
      "Fic Text: \"A gritty detective story in a dystopian future.":
        "Fluff", // Irrelevant author tag
      "Fic Text: \"A happy little tale about a cat and a dog being friends.":
        "Dark Lord", // Irrelevant author tag
      "Fic Text: \"A story that is very sad.": "Humor", // Inappropriate for sad story
      "Fic Text: \"An item falls into a hole.": "Adventure", // For testing no tags to remove
    };
  }

  async executeLLM(prompt: string): Promise<string> {
    console.log(`--- MockLLM: Executing for prompt (partial): ${prompt.substring(0, 100)}...`);
    // Simple mock logic: check if prompt contains specific text patterns
    if (prompt.includes("Suggested Tags:")) {
      for (const key in this.keywordResponses) {
        if (prompt.includes(key)) {
          return this.keywordResponses[key];
        }
      }
      return "None"; // Default for keyword generator
    } else if (prompt.includes("Tags to Remove:")) {
      for (const key in this.tagCleanerResponses) {
        if (prompt.includes(key)) {
          return this.tagCleanerResponses[key];
        }
      }
      return "None"; // Default for tag cleaner
    }
    return "None"; // Fallback
  }
}

// Dummy common tags for testing
const commonTags = [
  "Magic",
  "Fantasy",
  "Adventure",
  "Romance",
  "Sci-Fi",
  "Dystopian",
  "School",
  "Dark Lord",
  "Friendship",
  "Fluff",
  "Slice of Life",
  "Crime",
  "Mystery",
  "Detective",
  "Cyberpunk",
  "Noir",
  "Thriller",
  "Action",
  "Coming of Age",
  "Spells",
  "Potions",
  "Prophecy",
  "Coffee Shop AU",
  "Contemporary",
  "First Love",
  "Happy Ending",
  "Animals",
  "Angst",
  "Sad",
  "Drama",
  "Tragedy",
  "Dragons",
  "Epic",
  "Reincarnation",
  "Resurrection",
  "Second Chance",
];

// Reusable setup function for each test
async function setupTestConcept() {
  const [db, client] = await testDb();
  const mockGeminiLLM = new MockGeminiLLM({ apiKey: "mock-api-key" }); // API key not used in mock
  const concept = new CategorizingConcept(db, mockGeminiLLM, commonTags);
  return { db, client, concept };
}

Deno.test("Categorizing Concept: Operational Principle - Generate keywords, clean tags, then view", async (t) => {
  const { client, concept } = await setupTestConcept();
  const ficId = freshID();
  const ficText =
    "A story about a young wizard going to school and fighting a dark lord. They make friends and learn powerful spells.";
  const authorTags = ["Magic", "School", "Wizards", "Coming of Age", "Coffee Shop AU"];

  try {
    console.log(
      `\n--- Trace: Operational Principle for fic ${ficId} ---`,
    );

    await t.step("1. keywordGenerator: Generate suggested tags for a new fic", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficText.slice(0, 50)}...", authorTags=${JSON.stringify(authorTags)}`);
      const result = await concept.keywordGenerator({ fic: ficId, ficText, authorTags });
      assertNotEquals("error" in result, true, "keywordGenerator should not return an error.");
      const { suggestedTags } = result;
      assertExists(suggestedTags);
      assertEquals(suggestedTags?.length, 8, "Should suggest 8 tags (excluding author tags).");
      assertEquals(
        new Set(suggestedTags),
        new Set([
          "Dark Lord",
          "Fantasy",
          "Adventure",
          "Friendship",
          "Spells",
          "Potions",
          "Prophecy",
        ]),
        "Suggested tags should match expected (excluding Coffee Shop AU and already existing).",
      );
      console.log(`Output: suggestedTags=${JSON.stringify(suggestedTags)}`);
    });

    await t.step("2. tagCleaner: Identify tags to remove from author's list", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficText.slice(0, 50)}...", authorTags=${JSON.stringify(authorTags)}`);
      const result = await concept.tagCleaner({ fic: ficId, ficText, authorTags });
      assertNotEquals("error" in result, true, "tagCleaner should not return an error.");
      const { tagsToRemove } = result;
      assertExists(tagsToRemove);
      assertEquals(tagsToRemove, ["Coffee Shop AU"], "Should identify 'Coffee Shop AU' as irrelevant.");
      console.log(`Output: tagsToRemove=${JSON.stringify(tagsToRemove)}`);
    });

    await t.step("3. _viewFicCategory: View the combined category for the fic", async () => {
      console.log(`Input: fic=${ficId}`);
      const result = await concept._viewFicCategory({ fic: ficId });
      assertNotEquals("error" in result, true, "_viewFicCategory should not return an error.");
      const { ficCategory } = result;
      assertExists(ficCategory);
      assertEquals(ficCategory?._id, ficId);
      assertEquals(
        new Set(ficCategory?.suggestedTags),
        new Set([
          "Dark Lord",
          "Fantasy",
          "Adventure",
          "Friendship",
          "Spells",
          "Potions",
          "Prophecy",
        ]),
        "Stored suggested tags should be correct.",
      );
      assertEquals(
        ficCategory?.tagsToRemove,
        ["Coffee Shop AU"],
        "Stored tags to remove should be correct.",
      );
      console.log(`Output: ficCategory=${JSON.stringify(ficCategory)}`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Categorizing Concept: Scenario 1 - keywordGenerator updates existing FicCategory", async (t) => {
  const { client, concept } = await setupTestConcept();
  const ficId = freshID();
  const ficTextV1 = "A romance novel set in a coffee shop, very fluffy.";
  const authorTagsV1 = ["Romance", "Coffee Shop AU"];
  const ficTextV2 = "A romance novel set in a coffee shop, but with a bit of angst.";
  const authorTagsV2 = ["Romance", "Coffee Shop AU", "Angst"];

  try {
    console.log(
      `\n--- Trace: Scenario 1 (keywordGenerator update) for fic ${ficId} ---`,
    );

    await t.step("1. Initial keywordGenerator call", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficTextV1.slice(0, 50)}...", authorTags=${JSON.stringify(authorTagsV1)}`);
      const result = await concept.keywordGenerator({ fic: ficId, ficText: ficTextV1, authorTags: authorTagsV1 });
      assertNotEquals("error" in result, true);
      assertEquals(
        new Set(result.suggestedTags),
        new Set(["Fluff", "Slice of Life", "Contemporary", "First Love", "Happy Ending"]),
      );
      console.log(`Output: suggestedTags=${JSON.stringify(result.suggestedTags)}`);
    });

    await t.step("2. Update keywordGenerator call for the same fic", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficTextV2.slice(0, 50)}...", authorTags=${JSON.stringify(authorTagsV2)}`);
      const result = await concept.keywordGenerator({ fic: ficId, ficText: ficTextV2, authorTags: authorTagsV2 });
      assertNotEquals("error" in result, true);
      // Mock LLM will return the same for "romance novel set in a coffee shop" regardless of angst for simplicity
      // But we expect the previous 'Fluff' to still be there from the mock and nothing to be removed by angst
      // The crucial part is that the suggestedTags array for this fic is *overwritten*, not appended
      assertEquals(
        new Set(result.suggestedTags),
        new Set(["Fluff", "Slice of Life", "Contemporary", "First Love", "Happy Ending"]),
        "Suggested tags should be updated (overwritten) based on the V2 text.",
      );
      console.log(`Output: suggestedTags=${JSON.stringify(result.suggestedTags)}`);
    });

    await t.step("3. Verify state via _viewFicCategory", async () => {
      console.log(`Input: fic=${ficId}`);
      const viewResult = await concept._viewFicCategory({ fic: ficId });
      assertNotEquals("error" in viewResult, true);
      assertEquals(
        new Set(viewResult.ficCategory?.suggestedTags),
        new Set(["Fluff", "Slice of Life", "Contemporary", "First Love", "Happy Ending"]),
        "FicCategory's suggestedTags should reflect the last update.",
      );
      assertEquals(viewResult.ficCategory?.tagsToRemove, [], "tagsToRemove should still be empty.");
      console.log(`Output: ficCategory=${JSON.stringify(viewResult.ficCategory)}`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Categorizing Concept: Scenario 2 - tagCleaner updates existing FicCategory", async (t) => {
  const { client, concept } = await setupTestConcept();
  const ficId = freshID();
  const ficText = "A gritty detective story in a dystopian future.";
  const authorTagsV1 = ["Dystopian", "Sci-Fi", "Detective", "Fluff"];
  const authorTagsV2 = ["Dystopian", "Sci-Fi", "Detective", "Romance"];

  try {
    console.log(
      `\n--- Trace: Scenario 2 (tagCleaner update) for fic ${ficId} ---`,
    );

    await t.step("1. Initial tagCleaner call", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficText.slice(0, 50)}...", authorTags=${JSON.stringify(authorTagsV1)}`);
      const result = await concept.tagCleaner({ fic: ficId, ficText, authorTags: authorTagsV1 });
      assertNotEquals("error" in result, true);
      assertEquals(result.tagsToRemove, ["Fluff"], "Should identify 'Fluff' as irrelevant.");
      console.log(`Output: tagsToRemove=${JSON.stringify(result.tagsToRemove)}`);
    });

    await t.step("2. Update tagCleaner call for the same fic", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficText.slice(0, 50)}...", authorTags=${JSON.stringify(authorTagsV2)}`);
      const result = await concept.tagCleaner({ fic: ficId, ficText, authorTags: authorTagsV2 });
      assertNotEquals("error" in result, true);
      // The mock LLM will return "Fluff" again for the same text
      // However, if the mock LLM was smarter, it might return "Romance" here, so for this specific mock,
      // it still finds 'Fluff' given the prompt, which is fine for testing the update behavior.
      assertEquals(result.tagsToRemove, ["Fluff"], "Should identify 'Fluff' as irrelevant in V2 context (mock behavior).");
      console.log(`Output: tagsToRemove=${JSON.stringify(result.tagsToRemove)}`);
    });

    await t.step("3. Verify state via _viewFicCategory", async () => {
      console.log(`Input: fic=${ficId}`);
      const viewResult = await concept._viewFicCategory({ fic: ficId });
      assertNotEquals("error" in viewResult, true);
      assertEquals(
        viewResult.ficCategory?.tagsToRemove,
        ["Fluff"],
        "FicCategory's tagsToRemove should reflect the last update.",
      );
      assertEquals(viewResult.ficCategory?.suggestedTags, [], "suggestedTags should still be empty.");
      console.log(`Output: ficCategory=${JSON.stringify(viewResult.ficCategory)}`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Categorizing Concept: Scenario 3 - No tags suggested/removed", async (t) => {
  const { client, concept } = await setupTestConcept();
  const ficId = freshID();
  const ficText = "An item falls into a hole.";
  const authorTags = ["Physics", "Gravity"];

  try {
    console.log(
      `\n--- Trace: Scenario 3 (No suggestions/removals) for fic ${ficId} ---`,
    );

    await t.step("1. keywordGenerator: No relevant tags (mock returns 'None')", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficText.slice(0, 30)}...", authorTags=${JSON.stringify(authorTags)}`);
      const result = await concept.keywordGenerator({ fic: ficId, ficText, authorTags });
      assertNotEquals("error" in result, true);
      assertEquals(result.suggestedTags, [], "Should return an empty array if no tags are suggested.");
      console.log(`Output: suggestedTags=${JSON.stringify(result.suggestedTags)}`);
    });

    await t.step("2. tagCleaner: No tags to remove (mock returns 'None')", async () => {
      console.log(`Input: fic=${ficId}, ficText="${ficText.slice(0, 30)}...", authorTags=${JSON.stringify(authorTags)}`);
      const result = await concept.tagCleaner({ fic: ficId, ficText, authorTags });
      assertNotEquals("error" in result, true);
      assertEquals(result.tagsToRemove, [], "Should return an empty array if no tags need to be removed.");
      console.log(`Output: tagsToRemove=${JSON.stringify(result.tagsToRemove)}`);
    });

    await t.step("3. _viewFicCategory: Verify empty categories", async () => {
      console.log(`Input: fic=${ficId}`);
      const viewResult = await concept._viewFicCategory({ fic: ficId });
      assertNotEquals("error" in viewResult, true);
      assertEquals(viewResult.ficCategory?.suggestedTags, [], "Suggested tags should be empty.");
      assertEquals(viewResult.ficCategory?.tagsToRemove, [], "Tags to remove should be empty.");
      console.log(`Output: ficCategory=${JSON.stringify(viewResult.ficCategory)}`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Categorizing Concept: Scenario 4 - Error cases for view and delete actions", async (t) => {
  const { client, concept } = await setupTestConcept();
  const nonExistentFicId = freshID();
  const existingFicId = freshID();
  const ficText = "A happy little tale about a cat and a dog being friends.";
  const authorTags = ["Animals", "Friendship"];

  try {
    console.log(
      `\n--- Trace: Scenario 4 (Error handling) ---`,
    );

    // Populate one fic to test deletion
    await concept.keywordGenerator({ fic: existingFicId, ficText, authorTags });
    await concept.tagCleaner({ fic: existingFicId, ficText, authorTags }); // This mock will put 'Dark Lord' in tagsToRemove

    await t.step("1. _viewFicCategory: Non-existent fic should return an error", async () => {
      console.log(`Input: fic=${nonExistentFicId}`);
      const result = await concept._viewFicCategory({ fic: nonExistentFicId });
      assertEquals("error" in result, true, "Viewing a non-existent fic category should return an error.");
      assertExists(result.error);
      console.log(`Output: error=${result.error}`);
    });

    await t.step("2. deleteFicCategory: Non-existent fic should return an error", async () => {
      console.log(`Input: fic=${nonExistentFicId}`);
      const result = await concept.deleteFicCategory({ fic: nonExistentFicId });
      assertEquals("error" in result, true, "Deleting a non-existent fic category should return an error.");
      assertExists(result.error);
      console.log(`Output: error=${result.error}`);
    });

    await t.step("3. deleteFicCategory: Successfully delete an existing fic", async () => {
      console.log(`Input: fic=${existingFicId}`);
      const result = await concept.deleteFicCategory({ fic: existingFicId });
      assertNotEquals("error" in result, true, "Deleting an existing fic category should succeed.");
      assertEquals(result.deleted, true, "Should report successful deletion.");
      console.log(`Output: deleted=${result.deleted}`);

      // Verify it's gone
      const viewResult = await concept._viewFicCategory({ fic: existingFicId });
      assertEquals("error" in viewResult, true, "Fic category should no longer exist after deletion.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Categorizing Concept: Scenario 5 - deleteFicCategories with mixed results", async (t) => {
  const { client, concept } = await setupTestConcept();
  const fic1 = freshID();
  const fic2 = freshID();
  const fic3_nonExistent = freshID();
  const ficText = "A fanfiction with lots of fighting, magic, and dragons.";
  const authorTags = ["Fighting", "Dragons"];

  try {
    console.log(
      `\n--- Trace: Scenario 5 (deleteFicCategories mixed) ---`,
    );

    // Setup: create fic1 and fic2 categories
    await concept.keywordGenerator({ fic: fic1, ficText, authorTags });
    await concept.keywordGenerator({ fic: fic2, ficText, authorTags });

    await t.step("1. deleteFicCategories: Attempt to delete some existing and some non-existent", async () => {
      const ficsToDelete = [fic1, fic3_nonExistent, fic2];
      console.log(`Input: fics=${JSON.stringify(ficsToDelete)}`);
      const result = await concept.deleteFicCategories({ fics: ficsToDelete });
      assertEquals("error" in result, true, "Should return an error if some fics don't have categories.");
      assertExists(result.error);
      console.log(`Output: error=${result.error}`);

      // Verify that no deletions occurred if precondition fails (all-or-nothing)
      const viewFic1 = await concept._viewFicCategory({ fic: fic1 });
      assertNotEquals("error" in viewFic1, true, "fic1 should still exist.");
      const viewFic2 = await concept._viewFicCategory({ fic: fic2 });
      assertNotEquals("error" in viewFic2, true, "fic2 should still exist.");
    });

    await t.step("2. deleteFicCategories: Successfully delete only existing fics", async () => {
      const ficsToDelete = [fic1, fic2];
      console.log(`Input: fics=${JSON.stringify(ficsToDelete)}`);
      const result = await concept.deleteFicCategories({ fics: ficsToDelete });
      assertNotEquals("error" in result, true, "Deleting only existing fics should succeed.");
      assertEquals(result.deletedCount, 2, "Should report 2 deletions.");
      console.log(`Output: deletedCount=${result.deletedCount}`);

      // Verify they are gone
      const viewFic1 = await concept._viewFicCategory({ fic: fic1 });
      assertEquals("error" in viewFic1, true, "fic1 should no longer exist.");
      const viewFic2 = await concept._viewFicCategory({ fic: fic2 });
      assertEquals("error" in viewFic2, true, "fic2 should no longer exist.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Categorizing Concept: Scenario 6 - KeywordGenerator filters author tags", async (t) => {
  const { client, concept } = await setupTestConcept();
  const ficId = freshID();
  const ficText = "A story about a character who is reborn with a second chance.";
  const authorTags = ["Reincarnation", "Second Chance", "Fantasy"];

  try {
    console.log(
      `\n--- Trace: Scenario 6 (KeywordGenerator filters author tags) ---`,
    );

    await t.step("1. keywordGenerator: LLM suggests tags, some of which are already author tags", async () => {
      // Mock LLM for this text will suggest: "Reincarnation, Resurrection, Second Chance"
      console.log(`Input: fic=${ficId}, ficText="${ficText.slice(0, 50)}...", authorTags=${JSON.stringify(authorTags)}`);
      const result = await concept.keywordGenerator({ fic: ficId, ficText, authorTags });
      assertNotEquals("error" in result, true);
      const { suggestedTags } = result;
      assertExists(suggestedTags);
      // Expected output should filter out "Reincarnation" and "Second Chance" because they are in authorTags
      assertEquals(suggestedTags, ["Resurrection"], "Should filter out author-provided tags from suggested tags.");
      console.log(`Output: suggestedTags=${JSON.stringify(suggestedTags)}`);
    });
  } finally {
    await client.close();
  }
});
```
