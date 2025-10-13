---
timestamp: 'Mon Oct 13 2025 14:03:57 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251013_140357.826de5a5.md]]'
content_id: b6f09795c15e3510f8d4cab32b5b830e6f7987211160141182cfb90a0351c7d7
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // freshID is used for generating new IDs if needed
import { GeminiLLM, Config as LLMConfig } from "../../gemini-llm.ts"; // Path to the provided LLM integration

// --- Concept Specific Types ---

// Generic type parameter 'Fic' as defined in the concept specification.
// It will be an externally created ID.
type Fic = ID;

/**
 * A Tag, including its name, type, and the reason for its suggestion or removal.
 * This acts as the "Tag" type from the concept state, with 'name', 'type', 'reason' properties.
 */
interface Tag {
  name: string;
  type: string;
  reason: string;
}

/**
 * Represents the structure of input for fic categorization actions.
 * The concept itself doesn't store the full `ficText` or `authorTags`,
 * but these are required for the LLM's operation.
 */
interface FicInput {
  ficId: Fic;
  ficText: string;
  authorTags: { name: string; type: string }[]; // Author tags for LLM, can be simpler
}

/**
 * Represents the document structure stored in the MongoDB `ficCategories` collection.
 * This maps directly to "a set of FicCategories" from the concept state,
 * where `_id` is the 'Fic' identifier, and `suggestedTags` and `tagsToRemove`
 * are arrays of `Tag` objects (acting as the 'Category' type).
 */
interface FicCategoryDoc {
  _id: Fic; // The ID of the fic this categorization applies to
  suggestedTags: Tag[];
  tagsToRemove: Tag[];
}

/**
 * Defines the expected JSON output structure from the LLM.
 * This is crucial for parsing the LLM's response into structured data.
 */
interface LLMOutput {
  suggestedTags: Tag[];
  tagsToRemove: Tag[];
}

// Declare collection prefix, using the concept name to avoid collisions.
const PREFIX = "Categorizing" + ".";

/**
 * **concept** Categorizing [Fic]
 *
 * **purpose** to categorize a text into specific categories (i.e. a story will be categorized into a set of tags).
 * "Categorizing" can also *remove* tags provided by the author if deemed necessary.
 *
 * **principle** A user submits their story and the tags the author has already added to the story.
 * It outputs a list of suggested tags (properly categorized) to add to the story and tells the user if any of their author tags should be removed.
 */
export default class CategorizingConcept {
  // State: MongoDB collection to store the `FicCategoryDoc` documents.
  // This corresponds to "a set of FicCategories" in the concept spec.
  ficCategories: Collection<FicCategoryDoc>;
  private llm: GeminiLLM;

  constructor(private readonly db: Db, llmConfig: LLMConfig) {
    this.ficCategories = this.db.collection(PREFIX + "ficCategories");
    this.llm = new GeminiLLM(llmConfig);
  }

  // --- Actions ---

  /**
   * **keywordGenerator** (fic) : (suggestedTags: Category)
   * **tagCleaner** (fic) : (tagsToRemove: Category)
   *
   * This action combines the functionality of `keywordGenerator` and `tagCleaner`
   * into a single LLM call for efficiency and consistency, as suggested.
   * It takes a fic's content and existing author tags, and returns both
   * suggested new tags and a list of author tags that should be removed.
   *
   * **requires** The input object must contain `ficId` (the unique identifier for the fic),
   *              `ficText` (the full text content of the fic), and `authorTags`
   *              (an array of tags already provided by the author).
   * **effects**
   *   1. Uses an LLM to analyze `ficText` and `authorTags`.
   *   2. Generates up to 20 highly relevant `suggestedTags` that are not already present
   *      in the `authorTags`. Each suggested tag includes its `name`, `type`, and a `reason` for suggestion.
   *   3. Identifies `tagsToRemove` from the `authorTags` that are deemed inappropriate,
   *      irrelevant, or misleading based on the `ficText`. Each tag to remove includes
   *      its `name`, `type`, and a `reason` for removal.
   *   4. An entry in the `ficCategories` collection is either created (if one doesn't exist
   *      for `ficId`) or updated to store these `suggestedTags` and `tagsToRemove`.
   *   5. Returns the generated `suggestedTags` and `tagsToRemove`.
   */
  async categorizeFic(
    { ficId, ficText, authorTags }: FicInput,
  ): Promise<{ suggestedTags: Tag[]; tagsToRemove: Tag[] } | { error: string }> {
    if (!ficId || !ficText || authorTags === undefined) {
      return { error: "Fic ID, text, and author tags are required." };
    }

    // Prepare author tags for embedding into the LLM prompt.
    const authorTagStrings = authorTags
      .map((tag) => `${tag.name} (type: ${tag.type})`)
      .join(", ");

    // Context for the LLM to guide its expertise and output format.
    // This simulates training on the @tagsEdited2021.csv file by instructing the LLM
    // to act as if it's knowledgeable about AO3 tagging conventions.
    const trainingContext = `
      You are an expert in fanfiction tagging on ArchiveOfOurOwn (AO3).
      You are familiar with common tag types (e.g., 'character', 'relationship', 'setting', 'genre', 'warning', 'freeform', 'trope', 'mood', 'pairing')
      and popular tags from a comprehensive dataset of AO3 tags (like tagsEdited2021.csv).
      Your goal is to help an author categorize their fic by suggesting new relevant tags and identifying inappropriate existing tags.
      When suggesting tags, prioritize relevance to the fic's content and avoid duplicating existing author tags.
      Provide a concise 'reason' (1-2 sentences) for each suggested tag and each tag to be removed.
      Ensure suggested tags are distinct from the author's provided tags.
      Limit suggested tags to the top 20 most relevant.
    `;

    const prompt = `
      ${trainingContext}

      Here is a fanfiction story and its author-provided tags:

      Fic ID: ${ficId}
      Fic Text:
      \`\`\`
      ${ficText}
      \`\`\`

      Author Tags: ${
        authorTagStrings.length > 0 ? authorTagStrings : "None provided by author."
      }

      Based on the fic text and considering the author's existing tags, please perform two tasks:
      1. Suggest up to 20 new, highly relevant tags that are *not* already in the author's tags. For each suggested tag, provide its name (string), a type (string, from common fanfiction tag types), and a brief reason (string) for suggestion.
      2. Review the author's provided tags. For any tag that seems inappropriate, irrelevant, or misleading given the fic's content, identify it as a tag to remove. For each tag to remove, provide its name (string), type (string, as originally provided by author if possible), and a brief reason (string) for removal.

      Your output MUST be a JSON object with two fields: "suggestedTags" and "tagsToRemove". Each field should be an array of objects, where each object has "name", "type", and "reason" as string properties.
      Example format:
      {
        "suggestedTags": [
          {"name": "Fantasy AU", "type": "Genre", "reason": "Story features elements of a fantasy alternate universe, suggesting this genre tag."},
          {"name": "Enemies to Lovers", "type": "Relationship", "reason": "The narrative clearly follows the 'enemies to lovers' trope, making this a relevant relationship tag."}
        ],
        "tagsToRemove": [
          {"name": "Slice of Life", "type": "Genre", "reason": "The plot contains significant dramatic conflict and a major arc, which is not typical of a 'slice of life' story."}
        ]
      }
      Strictly follow this JSON format and ensure all fields ('name', 'type', 'reason') are present for every tag.
    `;

    try {
      const llmResponseText = await this.llm.executeLLM(prompt);
      const parsedResponse: LLMOutput = JSON.parse(llmResponseText);

      let suggestedTags = parsedResponse.suggestedTags || [];
      const tagsToRemove = parsedResponse.tagsToRemove || [];

      // Filter suggested tags to ensure no duplicates with author's existing tags
      const existingAuthorTagNames = new Set(
        authorTags.map((t) => t.name.toLowerCase()),
      );
      const filteredSuggestedTags = suggestedTags.filter(
        (st) => !existingAuthorTagNames.has(st.name.toLowerCase()),
      );

      // Store/update the categorization results in the database
      await this.ficCategories.updateOne(
        { _id: ficId }, // Find the document by fic ID
        {
          $set: {
            suggestedTags: filteredSuggestedTags.slice(0, 20), // Ensure max 20 suggested tags
            tagsToRemove: tagsToRemove,
          },
        },
        { upsert: true }, // Create the document if it doesn't exist
      );

      return {
        suggestedTags: filteredSuggestedTags.slice(0, 20),
        tagsToRemove: tagsToRemove,
      };
    } catch (error) {
      console.error(
        `❌ Error in categorizeFic for fic ID '${ficId}':`,
        (error as Error).message,
      );
      // Return a structured error response as per guidelines
      return {
        error: `Failed to categorize fic: ${(error as Error).message}`,
      };
    }
  }

  /**
   * **viewFicCategory** (fic) : (ficCategory)
   *
   * Retrieves the categorization data (suggested tags and tags to remove) for a specific fic.
   *
   * **requires** The `ficId` must correspond to an existing entry in the `ficCategories` collection.
   * **effects** If an entry exists, returns the `FicCategoryDoc` associated with the given `ficId`.
   *            Otherwise, returns an error indicating the ficCategory was not found.
   */
  async viewFicCategory(
    { ficId }: { ficId: Fic },
  ): Promise<FicCategoryDoc | { error: string }> {
    if (!ficId) {
      return { error: "Fic ID is required." };
    }

    const ficCategory = await this.ficCategories.findOne({ _id: ficId });

    if (!ficCategory) {
      return { error: `FicCategory for fic ID '${ficId}' not found.` };
    }

    return ficCategory;
  }

  /**
   * **deleteFicCategory** (fic) : (ficCategory)
   *
   * Removes the categorization data for a single fic from the system.
   *
   * **requires** The `ficId` must correspond to an existing entry in the `ficCategories` collection.
   * **effects** If found, the `FicCategoryDoc` associated with `ficId` is removed from the `ficCategories` collection.
   *            Returns the deleted `FicCategoryDoc` or an error if not found/failed.
   */
  async deleteFicCategory(
    { ficId }: { ficId: Fic },
  ): Promise<FicCategoryDoc | { error: string }> {
    if (!ficId) {
      return { error: "Fic ID is required." };
    }

    // Find the document first to return it upon successful deletion
    const existingCategory = await this.ficCategories.findOne({ _id: ficId });
    if (!existingCategory) {
      return { error: `FicCategory for fic ID '${ficId}' not found.` };
    }

    const result = await this.ficCategories.deleteOne({ _id: ficId });

    if (result.deletedCount === 0) {
      // This should ideally not happen if existingCategory was found, but good for robustness
      return { error: `Failed to delete FicCategory for fic ID '${ficId}'.` };
    }

    return existingCategory; // Return the document that was just deleted
  }

  /**
   * **deleteFicCategories** (ficCats: set of ficCategories)
   *
   * Removes categorization data for multiple fics from the system.
   *
   * **requires** All `ficIds` in the input list should correspond to existing entries
   *              in the `ficCategories` collection for a successful operation.
   * **effects** Attempts to remove all `FicCategoryDoc` entries whose `_id` is present
   *            in the `ficIds` list. Returns the count of successfully deleted categories.
   *            Returns an error if the input list is empty or no categories were deleted.
   */
  async deleteFicCategories(
    { ficIds }: { ficIds: Fic[] },
  ): Promise<{ deletedCount: number } | { error: string }> {
    if (!ficIds || ficIds.length === 0) {
      return { error: "Fic IDs list cannot be empty." };
    }

    const result = await this.ficCategories.deleteMany({ _id: { $in: ficIds } });

    if (result.deletedCount === 0) {
      return { error: `No FicCategories found or deleted for the provided IDs.` };
    }

    return { deletedCount: result.deletedCount };
  }

  /**
   * **_getAllFicCategories** () : (ficCategories: FicCategoryDoc[])
   *
   * A query to retrieve all stored fic categorization entries.
   * Queries typically start with an underscore `_`.
   *
   * **effects** Returns an array containing all `FicCategoryDoc` documents currently in the state.
   */
  async _getAllFicCategories(): Promise<FicCategoryDoc[]> {
    return this.ficCategories.find({}).toArray();
  }
}
```
