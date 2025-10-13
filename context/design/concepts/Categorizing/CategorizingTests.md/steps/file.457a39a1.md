---
timestamp: 'Mon Oct 13 2025 13:09:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251013_130921.75738a17.md]]'
content_id: 457a39a1b86a50bfb5e479e3d3884400f847d0a1280eb7b8c6c96f5fe006c3b8
---

# file: src/Categorizing/CategorizingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { v4 } from "https://deno.land/std@0.224.0/uuid/mod.ts"; // For freshID mock in the concept file itself
import { GeminiLLM } from "../../../gemini-llm.ts"; // Path to the provided LLM integration file

// Mock ID and Empty types for the concept's internal use as per instructions
export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;

// Mock freshID from @utils/database.ts, in a real project use the provided utility
function freshID(): ID {
  return v4.generate() as ID;
}

/**
 * # concept: Categorizing [Fic]
 *
 * # purpose: to categorize a text into specific categories (i.e. a story will be categorized into a set of tags).
 * "Categorizing" can also *remove* tags provided by the author if deemed necessary.
 *
 * # principle: A user submits their story (text content and existing author tags) and the system uses an LLM to
 * output a list of suggested tags (properly categorized) to add to the story and tells the user if any of their
 * author tags should be removed.
 */

// Declare collection prefix, use concept name
const PREFIX = "Categorizing" + ".";

// Generic types of this concept
type Fic = ID;
type Category = string[]; // A category is a set of strings

/**
 * # state:
 *   a set of FicCategories with
 *     an Fic (identifier for the fiction)
 *     a suggestedTags Category
 *     a tagsToRemove Category
 */
interface FicCategoryDoc {
  _id: Fic; // The Fic ID serves as the document ID
  suggestedTags: Category;
  tagsToRemove: Category;
}

export default class CategorizingConcept {
  // MongoDB collection for FicCategories
  private ficCategories: Collection<FicCategoryDoc>;
  private llm: GeminiLLM;
  private commonTags: string[]; // From @tagsEdited2021.csv

  /**
   * Initializes the CategorizingConcept.
   * @param db The MongoDB database instance.
   * @param llm An instance of the GeminiLLM for AI operations.
   * @param commonTags An array of common tags loaded from the @tagsEdited2021.csv file,
   *                   used to guide the LLM. For production, this would be loaded from a file/service.
   */
  constructor(private readonly db: Db, llm: GeminiLLM, commonTags: string[]) {
    this.ficCategories = this.db.collection(PREFIX + "ficCategories");
    this.llm = llm;
    this.commonTags = commonTags;
  }

  /**
   * # action: keywordGenerator (fic: Fic, ficText: String, authorTags: set of String) : (suggestedTags: Category)
   * # effect: Using an LLM, the LLM will examine the `ficText`'s contents. It then suggests up to 20 most relevant tags
   *           for the content, explicitly excluding any tags already present in the `authorTags` set. These suggested
   *           tags are stored in a `suggestedTags` Category associated with the `Fic`. If no `FicCategory` is currently
   *           associated with the `fic`, a new one is created with these suggested tags (and an empty `tagsToRemove` set).
   *           If an `FicCategory` already exists for the `fic`, its `suggestedTags` are updated. Finally, the generated
   *           `suggestedTags` are returned.
   */
  async keywordGenerator(
    { fic, ficText, authorTags }: { fic: Fic; ficText: string; authorTags: string[] },
  ): Promise<{ suggestedTags?: Category; error?: string }> {
    try {
      console.log(
        `[CategorizingConcept] KeywordGenerator for fic ${fic} starting.`,
      );
      // Construct the prompt for the LLM
      const prompt = `
        You are an expert fanfiction tagger. Your goal is to suggest relevant tags for a given fanfiction text.
        Based on the provided fanfiction text, suggest up to 20 highly relevant tags.
        DO NOT suggest any tags that are already present in the 'Author Tags' list.
        Prioritize tags from the 'Common Tags' list if they are relevant.
        Output the suggested tags as a comma-separated list. If no tags are suggested, output "None".

        Common Tags: [${this.commonTags.join(", ")}]
        Author Tags: [${authorTags.join(", ")}]
        Fic Text: "${ficText}"

        Suggested Tags:
      `;

      const llmResponse = await this.llm.executeLLM(prompt);
      const suggestedTags = llmResponse
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => tag !== "None"); // Remove "None" if LLM returns it

      // Ensure suggested tags do not include author tags, and limit to top 20
      const finalSuggestedTags = Array.from(
        new Set(suggestedTags.filter((tag) => !authorTags.includes(tag))),
      ).slice(0, 20);

      const existingFicCategory = await this.ficCategories.findOne({ _id: fic });

      if (existingFicCategory) {
        // Update existing FicCategory
        await this.ficCategories.updateOne(
          { _id: fic },
          { $set: { suggestedTags: finalSuggestedTags } },
        );
      } else {
        // Create new FicCategory
        await this.ficCategories.insertOne({
          _id: fic,
          suggestedTags: finalSuggestedTags,
          tagsToRemove: [], // Initialize empty
        });
      }
      console.log(
        `[CategorizingConcept] KeywordGenerator for fic ${fic} succeeded. Suggested: ${
          finalSuggestedTags.join(", ")
        }`,
      );
      return { suggestedTags: finalSuggestedTags };
    } catch (error) {
      console.error(`[CategorizingConcept] Error in keywordGenerator for fic ${fic}:`, error);
      return { error: (error as Error).message };
    }
  }

  /**
   * # action: tagCleaner (fic: Fic, ficText: String, authorTags: set of String) : (tagsToRemove: Category)
   * # effect: Using an LLM, the LLM will analyze the `ficText`'s contents and compare it against each tag in the
   *           `authorTags` set. Any `authorTag` deemed inappropriate, irrelevant, or misleading for the `fic` is
   *           added to a `tagsToRemove` Category. If an `FicCategory` already exists for the `fic`, its `tagsToRemove`
   *           are updated. If not, a new `FicCategory` is created for the `fic` with these tags (and an empty
   *           `suggestedTags` set). Finally, the identified `tagsToRemove` are returned.
   */
  async tagCleaner(
    { fic, ficText, authorTags }: { fic: Fic; ficText: string; authorTags: string[] },
  ): Promise<{ tagsToRemove?: Category; error?: string }> {
    try {
      console.log(`[CategorizingConcept] TagCleaner for fic ${fic} starting.`);
      // Construct the prompt for the LLM
      const prompt = `
        You are an expert fanfiction tag cleaner. Your goal is to identify inappropriate author tags for a given fanfiction text.
        Based on the provided fanfiction text, review each tag in 'Author Tags'.
        If an author tag seems completely irrelevant, misleading, or inappropriate for the 'Fic Text', add it to a list of 'Tags to Remove'.
        Output the tags to remove as a comma-separated list. If no tags should be removed, output "None".

        Author Tags: [${authorTags.join(", ")}]
        Fic Text: "${ficText}"

        Tags to Remove:
      `;

      const llmResponse = await this.llm.executeLLM(prompt);
      const tagsToRemove = llmResponse
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => tag !== "None"); // Remove "None" if LLM returns it

      const existingFicCategory = await this.ficCategories.findOne({ _id: fic });

      if (existingFicCategory) {
        // Update existing FicCategory
        await this.ficCategories.updateOne(
          { _id: fic },
          { $set: { tagsToRemove: tagsToRemove } },
        );
      } else {
        // Create new FicCategory
        await this.ficCategories.insertOne({
          _id: fic,
          suggestedTags: [], // Initialize empty
          tagsToRemove: tagsToRemove,
        });
      }
      console.log(
        `[CategorizingConcept] TagCleaner for fic ${fic} succeeded. To remove: ${
          tagsToRemove.join(", ")
        }`,
      );
      return { tagsToRemove: tagsToRemove };
    } catch (error) {
      console.error(`[CategorizingConcept] Error in tagCleaner for fic ${fic}:`, error);
      return { error: (error as Error).message };
    }
  }

  /**
   * # query: viewFicCategory (fic: Fic) : (ficCategory: FicCategory)
   * # requires: the `fic` to be associated with an `FicCategory` within the concept's state.
   * # effect: Returns the `FicCategory` document associated with the given `fic`.
   */
  async _viewFicCategory(
    { fic }: { fic: Fic },
  ): Promise<{ ficCategory?: FicCategoryDoc; error?: string }> {
    console.log(`[CategorizingConcept] Viewing FicCategory for fic ${fic}.`);
    const ficCategory = await this.ficCategories.findOne({ _id: fic });
    if (!ficCategory) {
      console.log(`[CategorizingConcept] No FicCategory found for fic: ${fic}`);
      return { error: `No FicCategory found for fic: ${fic}` };
    }
    console.log(`[CategorizingConcept] Found FicCategory for fic ${fic}.`);
    return { ficCategory: ficCategory };
  }

  /**
   * # action: deleteFicCategory (fic: Fic) : (deleted: Boolean)
   * # requires: the `fic` to be associated with an `FicCategory` within the concept's state.
   * # effect: Removes the `FicCategory` associated with the `fic` from the concept's state.
   *           Returns `true` if a category was successfully deleted, `false` otherwise.
   */
  async deleteFicCategory(
    { fic }: { fic: Fic },
  ): Promise<{ deleted?: boolean; error?: string }> {
    console.log(`[CategorizingConcept] Deleting FicCategory for fic ${fic}.`);
    // Precondition check
    const existingFicCategory = await this.ficCategories.findOne({ _id: fic });
    if (!existingFicCategory) {
      console.log(`[CategorizingConcept] Cannot delete: No FicCategory found for fic: ${fic}`);
      return { error: `Cannot delete: No FicCategory found for fic: ${fic}` };
    }

    const result = await this.ficCategories.deleteOne({ _id: fic });
    if (result.deletedCount === 1) {
      console.log(`[CategorizingConcept] Successfully deleted FicCategory for fic ${fic}.`);
      return { deleted: true };
    } else {
      console.log(`[CategorizingConcept] Failed to delete FicCategory for fic ${fic}.`);
      return { deleted: false, error: `Failed to delete FicCategory for fic: ${fic}` };
    }
  }

  /**
   * # action: deleteFicCategories (fics: set of Fic) : (deletedCount: Number)
   * # requires: all `fics` in the provided set to be associated with an `FicCategory` within the concept's state.
   * # effect: Iterates through the provided set of `fics` and removes all associated `FicCategory` entries
   *           from the concept's state. Returns the total count of `FicCategory` entries that were deleted.
   */
  async deleteFicCategories(
    { fics }: { fics: Fic[] },
  ): Promise<{ deletedCount?: number; error?: string }> {
    console.log(
      `[CategorizingConcept] Deleting FicCategories for fics: ${fics.join(", ")}.`,
    );
    // Precondition check: Ensure all fics have associated FicCategories
    const existingCategories = await this.ficCategories.find({ _id: { $in: fics } }).toArray();
    if (existingCategories.length !== fics.length) {
      const foundFicIds = new Set(existingCategories.map((c) => c._id));
      const missingFics = fics.filter((fic) => !foundFicIds.has(fic));
      const errorMessage =
        `Cannot delete: Some FicCategories not found for fics: ${missingFics.join(", ")}`;
      console.log(`[CategorizingConcept] ${errorMessage}`);
      return { error: errorMessage };
    }

    const result = await this.ficCategories.deleteMany({ _id: { $in: fics } });
    console.log(
      `[CategorizingConcept] Deleted ${result.deletedCount} FicCategories for fics: ${
        fics.join(", ")
      }.`,
    );
    return { deletedCount: result.deletedCount };
  }
}
```
