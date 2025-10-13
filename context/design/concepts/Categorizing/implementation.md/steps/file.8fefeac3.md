---
timestamp: 'Sun Oct 12 2025 23:11:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_231130.91461db6.md]]'
content_id: 8fefeac3ad110e507bad5a358591fab46a141916adc9c98e1fa3b0dd463ef4b2
---

# file: src/Categorizing/CategorizingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID and Empty
import { freshID } from "@utils/database.ts"; // Assuming @utils/database.ts provides freshID

// Declare collection prefix, use concept name
const PREFIX = "Categorizing" + ".";

/**
 * Generic type for the 'Fic' (fiction item) that this concept categorizes.
 * This should be treated as an opaque identifier.
 */
type Fic = ID;

/**
 * Represents a collection of tags (strings).
 * In this concept, 'Category' is interpreted as an array of strings.
 * The state definition "a Category with a set of Type strings" implies
 * that a Category *is* the set of strings itself.
 */
type Category = string[];

/**
 * Represents the state stored for a single Fic in the Categorizing concept.
 * It associates a Fic ID with suggested tags and tags to be removed.
 *
 * This interface maps to the 'FicCategories' collection in MongoDB.
 * A document in this collection represents an entry for a specific Fic.
 *
 * State:
 *   a set of FicCategories with
 *     an Fic (represented by _id)
 *     a suggestedTags Category (array of strings)
 *     a tagsToRemove Category (array of strings)
 */
interface FicCategoryDoc {
  _id: Fic; // The ID of the Fic item being categorized
  suggestedTags: Category; // Tags suggested by the LLM
  tagsToRemove: Category; // Tags identified by the LLM as inappropriate
}

export default class CategorizingConcept {
  // Collection to store the categorization data for Fics
  private ficCategories: Collection<FicCategoryDoc>;

  /**
   * **concept** Categorizing [Fic]
   *
   * **purpose** to categorize a text into specific categories (i.e. a story will be categorized into a set of tags).
   * "Categorizing" can also *remove* tags provided by the author if deemed necessary.
   */
  constructor(private readonly db: Db) {
    this.ficCategories = this.db.collection(PREFIX + "ficCategories");
  }

  /**
   * **keywordGenerator** (ficId: Fic, ficText: String, authorTags: set of String) : (suggestedTags: Category)
   *
   * **effect** using an LLM, the LLM will examine the fic's ficText's contents,
   * and associates the top 20 most relevant tags (WITHOUT suggesting tags already included in the fic's authorTags)
   * to the content in a suggestedTags Category to the Fic and (if there is not an FicCategory already associated with fic)
   * creates a new FicCategory out of those and adds the FicCategory to the set of FicCategories,
   * or (if there is an FicCategory associated with the fic) adds the suggestedTags to said ficCategory.
   * Finally, it returns the suggestedTags.
   *
   * @param params.ficId The ID of the Fic to categorize.
   * @param params.ficText The full text content of the Fic.
   * @param params.authorTags The tags already provided by the author for this Fic.
   * @returns An object containing the suggested tags (as a string array) or an error message.
   */
  async keywordGenerator(
    params: {
      ficId: Fic;
      ficText: string;
      authorTags: string[];
    },
  ): Promise<{ suggestedTags?: Category; error?: string }> {
    const { ficId, ficText, authorTags } = params;

    // In a real implementation, this would involve an LLM call.
    // For now, we'll mock the LLM behavior.
    console.log(
      `[MOCK LLM] Generating keywords for Fic ID: ${ficId}, text length: ${ficText.length}`,
    );
    console.log(`[MOCK LLM] Existing author tags: ${authorTags.join(", ")}`);

    // Simulate LLM processing
    const mockSuggestedTags = this.mockLlmKeywordGeneration(ficText);

    // Filter out tags already in authorTags, as per spec
    const newSuggestedTags = mockSuggestedTags.filter(
      (tag) => !authorTags.includes(tag),
    );

    try {
      // Find or create the FicCategory document and add new suggested tags
      const updateResult = await this.ficCategories.updateOne(
        { _id: ficId }, // Find by Fic ID
        {
          $addToSet: { // Use $addToSet to add unique tags to the array
            suggestedTags: { $each: newSuggestedTags },
          },
          $setOnInsert: { // Initialize tagsToRemove if this is a new document creation
            tagsToRemove: [],
          },
        },
        { upsert: true }, // Create the document if it doesn't exist
      );

      // Check if the operation was successful (modified or inserted a document)
      if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0) {
        return { error: "Failed to update or create FicCategory for keyword generation." };
      }

      // The spec asks to return the `suggestedTags`. This implies the newly generated ones.
      return { suggestedTags: newSuggestedTags };

    } catch (e) {
      console.error(`Error in keywordGenerator for ficId ${ficId}:`, e);
      return { error: `Failed to generate keywords: ${e.message}` };
    }
  }

  /**
   * **tagCleaner** (ficId: Fic, ficText: String, authorTags: set of String) : (tagsToRemove: Category)
   *
   * **effect** using an LLM, the LLM will examine the fic's ficText's contents,
   * then compare it to each authorTag in the foc's set of authorTags.
   * If an authorTag seems inappropriate for the fic, it will add it to a Category of tags to remove.
   * At the very end, if there is already an ficCategory associated with fic, it will add the tagsToRemove Category to the ficCategory.
   * If not, it'll create a new ficCategory and associate the fic and tagsToRemovewith it, and add it to the set of ficCategories.
   * Finally, it returns the tagsToRemove.
   *
   * @param params.ficId The ID of the Fic to clean tags for.
   * @param params.ficText The full text content of the Fic.
   * @param params.authorTags The tags already provided by the author for this Fic.
   * @returns An object containing the tags to remove (as a string array) or an error message.
   */
  async tagCleaner(
    params: {
      ficId: Fic;
      ficText: string;
      authorTags: string[];
    },
  ): Promise<{ tagsToRemove?: Category; error?: string }> {
    const { ficId, ficText, authorTags } = params;

    // In a real implementation, this would involve an LLM call.
    // For now, we'll mock the LLM behavior.
    console.log(
      `[MOCK LLM] Cleaning tags for Fic ID: ${ficId}, text length: ${ficText.length}`,
    );
    console.log(`[MOCK LLM] Author tags to check: ${authorTags.join(", ")}`);

    // Simulate LLM processing to identify inappropriate tags
    const mockTagsToRemove = this.mockLlmTagCleaning(ficText, authorTags);

    try {
      // Find or create the FicCategory document and add new tags to remove
      const updateResult = await this.ficCategories.updateOne(
        { _id: ficId }, // Find by Fic ID
        {
          $addToSet: { // Use $addToSet to add unique tags to the array
            tagsToRemove: { $each: mockTagsToRemove },
          },
          $setOnInsert: { // Initialize suggestedTags if this is a new document creation
            suggestedTags: [],
          },
        },
        { upsert: true }, // Create the document if it doesn't exist
      );

      // Check if the operation was successful
      if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0) {
        return { error: "Failed to update or create FicCategory for cleaning tags." };
      }

      // Return the newly identified tags to remove
      return { tagsToRemove: mockTagsToRemove };

    } catch (e) {
      console.error(`Error in tagCleaner for ficId ${ficId}:`, e);
      return { error: `Failed to clean tags: ${e.message}` };
    }
  }

  /**
   * **viewFicCategory** (fic: Fic) : (ficCategory: FicCategory)
   *
   * **requires** the fic to be associated with an ficCategory in the set of ficCategories
   * **effect** returns the ficCategory.
   *
   * @param params.ficId The ID of the Fic whose category data is to be viewed.
   * @returns An object containing the FicCategory document or an error message if not found.
   */
  async viewFicCategory(
    params: { ficId: Fic },
  ): Promise<{ ficCategory?: FicCategoryDoc; error?: string }> {
    const { ficId } = params;

    // Precondition: the fic must be associated with an FicCategory
    const ficCategory = await this.ficCategories.findOne({ _id: ficId });

    if (!ficCategory) {
      return { error: `FicCategory for Fic ID '${ficId}' not found.` };
    }

    return { ficCategory };
  }

  /**
   * **deleteFicCategory** (fic: Fic) : Empty
   *
   * **requires** the fic to be associated with an ficCategory in the set of ficCategories
   * **effect** removes the ficCategory associated with the fic from the set of FicCategories.
   *
   * @param params.ficId The ID of the Fic whose category data is to be deleted.
   * @returns An empty object on successful deletion or an error message.
   */
  async deleteFicCategory(
    params: { ficId: Fic },
  ): Promise<Empty | { error: string }> {
    const { ficId } = params;

    // Precondition check: ensure the ficCategory exists
    const exists = await this.ficCategories.countDocuments({ _id: ficId });
    if (exists === 0) {
      return { error: `FicCategory for Fic ID '${ficId}' does not exist, cannot delete.` };
    }

    try {
      const deleteResult = await this.ficCategories.deleteOne({ _id: ficId });
      if (deleteResult.deletedCount === 0) {
        // This case should ideally not happen if countDocuments returned > 0
        return { error: `Failed to delete FicCategory for Fic ID '${ficId}'. No document deleted.` };
      }
      return {};
    } catch (e) {
      console.error(`Error deleting FicCategory for ficId ${ficId}:`, e);
      return { error: `Failed to delete FicCategory: ${e.message}` };
    }
  }

  /**
   * **deleteFicCategories** (ficIds: set of Fic) : Empty
   *
   * **requires** all ficCategories to exist within the set of FicCategories.
   * **effect** runs deleteFicCategory on all ficCategories in the set of ficCategories.
   *
   * @param params.ficIds An array of Fic IDs whose category data is to be deleted.
   * @returns An empty object on successful deletion of all specified categories or an error message.
   */
  async deleteFicCategories(
    params: { ficIds: Fic[] },
  ): Promise<Empty | { error: string }> {
    const { ficIds } = params;

    if (ficIds.length === 0) {
        return {}; // No IDs provided, nothing to delete, return success
    }

    // Precondition check: ensure all ficCategories exist
    const existingCount = await this.ficCategories.countDocuments({
      _id: { $in: ficIds },
    });
    if (existingCount !== ficIds.length) {
      // Identify which specific IDs are missing for a more informative error
      const existingDocs = await this.ficCategories.find(
        { _id: { $in: ficIds } },
        { projection: { _id: 1 } },
      ).toArray();
      const existingDocIds = new Set(existingDocs.map((doc) => doc._id));
      const missingIds: Fic[] = ficIds.filter((id) => !existingDocIds.has(id));

      return {
        error: `Not all specified FicCategories exist. Missing IDs: ${missingIds.join(", ")}`,
      };
    }

    try {
      const deleteResult = await this.ficCategories.deleteMany({
        _id: { $in: ficIds },
      });
      if (deleteResult.deletedCount !== ficIds.length) {
        // This indicates a partial failure if `existingCount` was equal to `ficIds.length`
        return {
          error:
            `Failed to delete all specified FicCategories. Deleted ${deleteResult.deletedCount} out of ${ficIds.length} expected.`,
        };
      }
      return {};
    } catch (e) {
      console.error(`Error deleting multiple FicCategories for IDs ${ficIds}:`, e);
      return { error: `Failed to delete multiple FicCategories: ${e.message}` };
    }
  }

  // --- Mock LLM Helper Functions ---
  // These functions simulate the behavior of an LLM for keyword generation and tag cleaning.
  // In a real application, these would make API calls to an actual LLM service.

  private mockLlmKeywordGeneration(ficText: string): string[] {
    const keywords: string[] = [];
    if (ficText.toLowerCase().includes("magic")) keywords.push("Fantasy");
    if (ficText.toLowerCase().includes("dragon")) keywords.push("Dragons");
    if (ficText.toLowerCase().includes("detective")) keywords.push("Mystery");
    if (ficText.toLowerCase().includes("murder")) keywords.push("Crime");
    if (ficText.toLowerCase().includes("love")) keywords.push("Romance");
    if (ficText.toLowerCase().includes("space")) keywords.push("Sci-Fi");
    if (ficText.toLowerCase().includes("future")) keywords.push("Dystopian");
    if (ficText.toLowerCase().includes("time travel")) keywords.push("TimeTravel");
    if (ficText.toLowerCase().includes("school")) keywords.push("SchoolLife");
    if (ficText.toLowerCase().includes("adventure")) keywords.push("Adventure");
    if (ficText.toLowerCase().includes("dark")) keywords.push("DarkFantasy");
    if (ficText.toLowerCase().includes("vampire")) keywords.push("Supernatural");
    if (ficText.toLowerCase().includes("werewolf")) keywords.push("Werewolves");
    if (ficText.toLowerCase().includes("historical")) keywords.push("Historical");
    if (ficText.toLowerCase().includes("comedy")) keywords.push("Comedy");
    if (ficText.toLowerCase().includes("tragedy")) keywords.push("Tragedy");
    if (ficText.toLowerCase().includes("war")) keywords.push("War");
    if (ficText.toLowerCase().includes("politics")) keywords.push("Political");
    if (ficText.toLowerCase().includes("family")) keywords.push("Family");
    if (ficText.toLowerCase().includes("friendship")) keywords.push("Friendship");

    // Add some basic tags for longer texts if not many specific keywords were found
    if (keywords.length < 5 && ficText.length > 100) {
      if (!keywords.includes("Story")) keywords.push("Story");
      if (!keywords.includes("CharacterDriven") && ficText.length > 500) keywords.push("CharacterDriven");
    }
    return keywords.slice(0, 20); // Limit to top 20 relevant tags
  }

  private mockLlmTagCleaning(ficText: string, authorTags: string[]): string[] {
    const tagsToRemove: string[] = [];
    const ficTextLower = ficText.toLowerCase();

    // Simulate identifying tags that seem inappropriate for the fic's content
    // This is a basic mock. An actual LLM would perform a more nuanced analysis.
    for (const tag of authorTags) {
      const tagLower = tag.toLowerCase();
      let inappropriate = false;

      if (tagLower === "horror" && !(ficTextLower.includes("scare") || ficTextLower.includes("fright") || ficTextLower.includes("terror"))) {
        inappropriate = true;
      } else if (tagLower === "humor" && !(ficTextLower.includes("laugh") || ficTextLower.includes("funny") || ficTextLower.includes("comedy"))) {
        inappropriate = true;
      } else if (tagLower === "angst" && !(ficTextLower.includes("sadness") || ficTextLower.includes("pain") || ficTextLower.includes("grief"))) {
        inappropriate = true;
      } else if (tagLower === "fluff" && !(ficTextLower.includes("cute") || ficTextLower.includes("sweet") || ficTextLower.includes("lighthearted"))) {
        inappropriate = true;
      }
      // Add more specific rules as necessary for mock behavior

      if (inappropriate) {
        tagsToRemove.push(tag);
      }
    }
    return tagsToRemove;
  }

  // --- Query: _getFicCategory (explicitly defined as per concept query examples) ---
  /**
   * _getFicCategory (ficId: Fic) : (ficCategory: FicCategoryDoc[])
   *
   * **effects** return the ficCategory document for the given ficId.
   * This is a query for internal use or explicit observation, following the pattern
   * of returning an array for query results.
   *
   * @param params.ficId The ID of the Fic to retrieve its category data.
   * @returns An object containing an array of FicCategory documents (will contain 0 or 1 element).
   */
  async _getFicCategory(
    params: { ficId: Fic },
  ): Promise<{ ficCategory: FicCategoryDoc[] }> {
    const { ficId } = params;
    const doc = await this.ficCategories.findOne({ _id: ficId });
    return { ficCategory: doc ? [doc] : [] };
  }
}
```
