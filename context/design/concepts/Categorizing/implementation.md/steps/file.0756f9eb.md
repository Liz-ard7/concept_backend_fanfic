---
timestamp: 'Sun Oct 12 2025 23:23:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_232350.d5aebc41.md]]'
content_id: 0756f9eb839bac1ff716273382062d598f2b9e0bf5a90d03add58a96f328d8ea
---

# file: src/Categorizing/CategorizingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "../../utils/types.ts"; // Adjust path as needed for your project structure
import { freshID } from "../../utils/database.ts"; // Adjust path as needed for your project structure

/**
 * @concept Categorizing [Fic]
 * @purpose to categorize a text into specific categories (i.e. a story will be categorized into a set of tags).
 * "Categorizing" can also *remove* tags provided by the author if deemed necessary.
 *
 * @principle A user submits their story and the tags the author has already added to the story.
 * It outputs a list of suggested tags (properly categorized) to add to the story and tells the user
 * if any of their author tags should be removed.
 */

// Declare collection prefix, use concept name
const PREFIX = "Categorizing" + ".";

// Generic type parameters of this concept
/**
 * @typeparam Fic Represents the ID of a fanfiction object.
 * As per concept guidelines, this is an external object's identifier and
 * CategorizingConcept assumes no properties of a Fic other than its ID.
 */
type Fic = ID;

/**
 * @type Tag Represents a single tag string.
 */
type Tag = string;

/**
 * @type Category Represents a collection of tags.
 * This corresponds to the "a set of Type strings" definition in the state.
 */
type Category = Tag[];

/**
 * @state
 * A document in the 'ficCategories' collection.
 * This represents the categorization data for a specific fanfiction (`Fic`).
 *
 * a set of FicCategories with
 *   an Fic
 *   a suggestedTags Category
 *   a tagsToRemove Category
 */
interface FicCategoryDoc {
  _id: Fic; // The ID of the fanfiction, serves as the primary key for this categorization document
  suggestedTags: Category; // A list of tags suggested by the LLM
  tagsToRemove: Category; // A list of author-provided tags identified for removal by the LLM
}

// --- Action Input/Output Interfaces ---

/**
 * Input for the `keywordGenerator` action.
 * @param ficId The ID of the fanfiction to categorize.
 * @param ficText The full text content of the fanfiction.
 * @param authorTags Tags already provided by the author.
 */
interface KeywordGeneratorInput {
  ficId: Fic;
  ficText: string;
  authorTags: Tag[];
}

/**
 * Output for the `keywordGenerator` action.
 * @param suggestedTags A list of tags suggested by the LLM for the fic.
 */
interface KeywordGeneratorOutput {
  suggestedTags: Category;
}

/**
 * Input for the `tagCleaner` action.
 * @param ficId The ID of the fanfiction to clean tags for.
 * @param ficText The full text content of the fanfiction.
 * @param authorTags Tags currently associated with the fanfiction by the author.
 */
interface TagCleanerInput {
  ficId: Fic;
  ficText: string;
  authorTags: Tag[];
}

/**
 * Output for the `tagCleaner` action.
 * @param tagsToRemove A list of author-provided tags that should be removed.
 */
interface TagCleanerOutput {
  tagsToRemove: Category;
}

/**
 * Input for the `viewFicCategory` action.
 * @param ficId The ID of the fanfiction whose categorization to view.
 */
interface ViewFicCategoryInput {
  ficId: Fic;
}

/**
 * Output for the `viewFicCategory` action.
 * @param ficCategory The full categorization document for the fic.
 */
interface ViewFicCategoryOutput {
  ficCategory: FicCategoryDoc;
}

/**
 * Input for the `deleteFicCategory` action.
 * @param ficId The ID of the fanfiction whose categorization to delete.
 */
interface DeleteFicCategoryInput {
  ficId: Fic;
}

/**
 * Output for the `deleteFicCategory` action.
 * @param ficCategory The FicCategory document that was successfully deleted.
 */
interface DeleteFicCategoryOutput {
  ficCategory: FicCategoryDoc;
}

/**
 * Input for the `deleteFicCategories` action.
 * @param ficIds A list of fanfiction IDs whose categorizations to delete.
 */
interface DeleteFicCategoriesInput {
  ficIds: Fic[];
}

/**
 * Helper function to simulate LLM tag generation based on fic text and existing tags.
 * This is a mock implementation. In a real scenario, this would involve
 * calling an actual LLM service and processing its response, potentially
 * using the `@tagsEdited2021.csv` file for fine-tuning or contextual awareness.
 * The output will contain at most 20 unique tags not present in `authorTags`.
 */
async function _mockLLMGenerateKeywords(
  ficText: string,
  authorTags: Tag[],
): Promise<Tag[]> {
  console.log(`Mock LLM generating keywords for text: "${ficText.substring(0, Math.min(ficText.length, 50))}..."`);
  // Simple mock logic: suggest some generic tags not in authorTags
  const potentialTags = [
    "Fantasy", "Romance", "Adventure", "Humor", "Mystery", "Slice of Life",
    "Drama", "Action", "Sci-Fi", "Fanfiction", "Original Content",
    "Angst", "Fluff", "Smut", "Hurt/Comfort", "Found Family", "Alternate Universe",
    "Magic", "Supernatural", "Friendship", "Enemies to Lovers", "Slow Burn"
  ];
  const suggested: Tag[] = [];
  const existingTags = new Set(authorTags.map(tag => tag.toLowerCase()));

  for (const tag of potentialTags) {
    if (!existingTags.has(tag.toLowerCase()) && suggested.length < 20) {
      suggested.push(tag);
    }
  }
  return Promise.resolve(suggested);
}

/**
 * Helper function to simulate LLM tag cleaning based on fic text and author tags.
 * This is a mock implementation. In a real scenario, this would involve
 * calling an actual LLM service and processing its response, potentially
 * using the `@tagsEdited2021.csv` file for fine-tuning or contextual awareness.
 */
async function _mockLLMCleanTags(
  ficText: string,
  authorTags: Tag[],
): Promise<Tag[]> {
  console.log(`Mock LLM cleaning tags for text: "${ficText.substring(0, Math.min(ficText.length, 50))}..."`);
  // Simple mock logic: remove tags deemed "inappropriate" based on keywords or exact matches
  const tagsToRemove: Tag[] = [];
  const ficTextLower = ficText.toLowerCase();

  for (const tag of authorTags) {
    const tagLower = tag.toLowerCase();
    // Example rules for 'inappropriate' based on a very simple text analysis
    if (tagLower === "badtag" || tagLower.includes("inappropriate")) {
      tagsToRemove.push(tag);
    } else if (tagLower === "fluff" && ficTextLower.includes("tragic death")) {
      tagsToRemove.push(tag); // Mismatch between tag and content
    } else if (tagLower === "humor" && !ficTextLower.includes("laugh")) {
        // A very basic check, just for demonstration
        // tagsToRemove.push(tag);
    }
  }
  return Promise.resolve(tagsToRemove);
}


export default class CategorizingConcept {
  // MongoDB collection to store FicCategory documents
  private ficCategories: Collection<FicCategoryDoc>;

  constructor(private readonly db: Db) {
    this.ficCategories = this.db.collection(PREFIX + "ficCategories");
  }

  /**
   * @action keywordGenerator (ficId: Fic, ficText: string, authorTags: Tag[]): (suggestedTags: Category)
   * @effects using an LLM, the LLM will examine the fic's ficText's contents,
   *          and associates the top 20 most relevant tags (WITHOUT suggesting tags already included in the fic's authorTags)
   *          to the content in a suggestedTags Category to the Fic and
   *          (if there is not an FicCategory already associated with fic) creates a new FicCategory out of those and adds the FicCategory to the set of FicCategories,
   *          or (if there is an FicCategory associated with the fic) adds the suggestedTags to said ficCategory.
   *          Finally, it returns the suggestedTags.
   */
  async keywordGenerator(
    { ficId, ficText, authorTags }: KeywordGeneratorInput,
  ): Promise<KeywordGeneratorOutput | { error: string }> {
    try {
      // 1. Generate suggested tags using LLM (mocked)
      const newSuggestedTags = await _mockLLMGenerateKeywords(ficText, authorTags);
      const uniqueSuggestedTags = Array.from(new Set(newSuggestedTags)).slice(0, 20); // Ensure uniqueness and limit to 20

      // 2. Find and update/create FicCategory document
      // $set updates the suggestedTags field.
      // $setOnInsert initializes tagsToRemove to an empty array if a new document is created.
      const result = await this.ficCategories.findOneAndUpdate(
        { _id: ficId }, // Query for the document by ficId
        {
          $set: { suggestedTags: uniqueSuggestedTags },
          $setOnInsert: { tagsToRemove: [] }, // Initialize if this is the first update for this fic
        },
        { upsert: true, returnDocument: 'after' } // Creates if not exists, returns the updated document
      );

      if (!result.value) {
        // This case should ideally not be reached with upsert: true unless there's a serious DB issue.
        return { error: "Failed to update or create FicCategory document." };
      }

      return { suggestedTags: result.value.suggestedTags };
    } catch (e) {
      console.error("Error in keywordGenerator:", e);
      return { error: `Failed to generate keywords: ${e.message}` };
    }
  }

  /**
   * @action tagCleaner (ficId: Fic, ficText: string, authorTags: Tag[]): (tagsToRemove: Category)
   * @effects using an LLM, the LLM will examine the fic's ficText's contents,
   *          then compare it to each authorTag in the foc's set of authorTags.
   *          If an authorTag seems inappropriate for the fic, it will add it to a Category of tags to remove.
   *          At the very end, if there is already an ficCategory associated with fic, it will add the tagsToRemove Category to the ficCategory.
   *          If not, it'll create a new ficCategory and associate the fic and tagsToRemove with it, and add it to the set of ficCategories.
   *          Finally, it returns the tagsToRemove.
   */
  async tagCleaner(
    { ficId, ficText, authorTags }: TagCleanerInput,
  ): Promise<TagCleanerOutput | { error: string }> {
    try {
      // 1. Identify tags to remove using LLM (mocked)
      const newTagsToRemove = await _mockLLMCleanTags(ficText, authorTags);
      const uniqueTagsToRemove = Array.from(new Set(newTagsToRemove)); // Ensure uniqueness

      // 2. Find and update/create FicCategory document
      // $set updates the tagsToRemove field.
      // $setOnInsert initializes suggestedTags to an empty array if a new document is created.
      const result = await this.ficCategories.findOneAndUpdate(
        { _id: ficId }, // Query for the document by ficId
        {
          $set: { tagsToRemove: uniqueTagsToRemove },
          $setOnInsert: { suggestedTags: [] }, // Initialize if this is the first update for this fic
        },
        { upsert: true, returnDocument: 'after' } // Creates if not exists, returns the updated document
      );

      if (!result.value) {
        // This case should ideally not be reached with upsert: true unless there's a serious DB issue.
        return { error: "Failed to update or create FicCategory document." };
      }

      return { tagsToRemove: result.value.tagsToRemove };
    } catch (e) {
      console.error("Error in tagCleaner:", e);
      return { error: `Failed to clean tags: ${e.message}` };
    }
  }

  /**
   * @action viewFicCategory (ficId: Fic): (ficCategory: FicCategoryDoc)
   * @requires the fic to be associated with an ficCategory in the set of ficCategories
   * @effects returns the ficCategory.
   */
  async viewFicCategory(
    { ficId }: ViewFicCategoryInput,
  ): Promise<ViewFicCategoryOutput | { error: string }> {
    const ficCategory = await this.ficCategories.findOne({ _id: ficId });

    // Precondition check: FicCategory must exist
    if (!ficCategory) {
      return { error: `Precondition failed: FicCategory for ficId '${ficId}' not found.` };
    }

    return { ficCategory };
  }

  /**
   * @action deleteFicCategory (ficId: Fic): (ficCategory: FicCategoryDoc)
   * @requires the fic to be associated with an ficCategory in the set of ficCategories
   * @effects removes the ficCategory associated with the fic from the set of FicCategories,
   *          and returns the deleted ficCategory.
   */
  async deleteFicCategory(
    { ficId }: DeleteFicCategoryInput,
  ): Promise<DeleteFicCategoryOutput | { error: string }> {
    // Check precondition first: find the document before attempting to delete
    const ficCategoryToDelete = await this.ficCategories.findOne({ _id: ficId });
    if (!ficCategoryToDelete) {
      return { error: `Precondition failed: FicCategory for ficId '${ficId}' does not exist.` };
    }

    const result = await this.ficCategories.deleteOne({ _id: ficId });

    if (result.deletedCount === 0) {
      // This should ideally not happen if findOne returned a document and no race condition.
      return { error: `Failed to delete FicCategory for ficId '${ficId}' despite it existing.` };
    }

    return { ficCategory: ficCategoryToDelete };
  }

  /**
   * @action deleteFicCategories (ficIds: Fic[]): Empty
   * @requires all ficCategories to exist within the set of FicCategories.
   * @effects runs deleteFicCategory on all ficCategories in the set of ficCategories.
   */
  async deleteFicCategories(
    { ficIds }: DeleteFicCategoriesInput,
  ): Promise<Empty | { error: string }> {
    if (ficIds.length === 0) {
      return {}; // No fics to delete, treat as successful completion
    }

    // Precondition check: ensure all specified FicCategories exist
    const existingFicCategories = await this.ficCategories.find({ _id: { $in: ficIds } })
                                                         .project({ _id: 1 })
                                                         .toArray();
    const existingIds = new Set(existingFicCategories.map(doc => doc._id));
    const missingIds = ficIds.filter(id => !existingIds.has(id));

    if (missingIds.length > 0) {
      return { error: `Precondition failed: FicCategories for ficIds '${missingIds.join(", ")}' do not exist.` };
    }

    const result = await this.ficCategories.deleteMany({ _id: { $in: ficIds } });

    if (result.deletedCount !== ficIds.length) {
      // This might indicate a race condition where some documents were deleted externally.
      return { error: `Failed to delete all specified FicCategories. Deleted ${result.deletedCount} out of ${ficIds.length}.` };
    }

    return {};
  }

  /**
   * @query _getFicCategory (ficId: Fic): (ficCategory: FicCategoryDoc)
   * A query to retrieve a specific FicCategory document directly.
   * This is similar to `viewFicCategory` but explicitly marked as a query
   * for internal concept use or direct state inspection without formal action semantics.
   * @param ficId The ID of the fanfiction to retrieve categorization for.
   * @returns The FicCategory document or `null` if not found.
   */
  async _getFicCategory(ficId: Fic): Promise<FicCategoryDoc | null> {
    return this.ficCategories.findOne({ _id: ficId });
  }
}
```
