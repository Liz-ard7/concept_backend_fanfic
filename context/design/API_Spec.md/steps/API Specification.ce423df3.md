---
timestamp: 'Mon Oct 20 2025 17:46:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174645.02fe20aa.md]]'
content_id: ce423df33e5e3d254da8459c3eb06824784cdd369d0b91bb644701a38ab9b7f5
---

# API Specification: Categorizing Concept

**Purpose:** to categorize a text into specific categories (i.e. a story will be categorized into a set of tags). "Categorizing" can also *remove* tags provided by the author if deemed necessary.

***

## API Endpoints

### POST /api/Categorizing/categorizeFic

**Description:** This action combines the functionality of `keywordGenerator` and `tagCleaner` into a single LLM call for efficiency and consistency, as suggested. It takes a fic's content and existing author tags, and returns both suggested new tags and a list of author tags that should be removed.

**Requirements:**

* The input object must contain `ficId` (the unique identifier for the fic),
* `ficText` (the full text content of the fic), and `authorTags`
* (an string of tags already provided by the author, split with newlines).

**Effects:**

* 1. Uses an LLM to analyze `ficText` and `authorTags`.
* 2. Generates up to 20 highly relevant `suggestedTags` that are not already present in the `authorTags`. Each suggested tag includes its `name`, `type`, and a `reason` for suggestion.
* 3. Identifies `tagsToRemove` from the `authorTags` that are deemed inappropriate, irrelevant, or misleading based on the `ficText`. Each tag to remove includes its `name`, `type`, and a `reason` for removal.
* 4. An entry in the `ficCategories` collection is either created (if one doesn't exist for `ficId`) or updated to store these `suggestedTags` and `tagsToRemove`.
* 5. Returns the generated `suggestedTags` and `tagsToRemove`.

**Request Body:**

```json
{
  "ficId": "string",
  "ficText": "string",
  "authorTags": "string"
}
```

**Success Response Body (Action):**

```json
{
  "ficId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Categorizing/\_viewFicCategory

**Description:** Retrieves the categorization data (suggested tags and tags to remove) for a specific fic.

**Requirements:**

* The `ficId` must correspond to an existing entry in the `ficCategories` collection.

**Effects:**

* If an entry exists, returns the `FicCategoryDoc` associated with the given `ficId`.
* Otherwise, returns an error indicating the ficCategory was not found.

**Request Body:**

```json
{
  "ficId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "suggestedTags": [
      {
        "name": "string",
        "type": "string",
        "reason": "string"
      }
    ],
    "tagsToRemove": [
      {
        "name": "string",
        "type": "string",
        "reason": "string"
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Categorizing/deleteFicCategory

**Description:** Removes the categorization data for a single fic from the system.

**Requirements:**

* The `ficId` must correspond to an existing entry in the `ficCategories` collection.

**Effects:**

* If found, the `FicCategoryDoc` associated with `ficId` is removed from the `ficCategories` collection.
* Returns the deleted `FicCategoryDoc` or an error if not found/failed.

**Request Body:**

```json
{
  "ficId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "ficCategoryId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Categorizing/deleteFicCategories

**Description:** Removes categorization data for multiple fics from the system.

**Requirements:**

* All `ficIds` in the input list should correspond to existing entries in the `ficCategories` collection for a successful operation.

**Effects:**

* Attempts to remove all `FicCategoryDoc` entries whose `_id` is present in the `ficIds` list. Returns the count of successfully deleted categories.
* Returns an error if the input list is empty or no categories were deleted.

**Request Body:**

```json
{
  "ficIds": [
    "string"
  ]
}
```

**Success Response Body (Action):**

```json
{
  "deletedCount": "number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Categorizing/\_getAllFicCategories

**Description:** A query to retrieve all stored fic categorization entries. Queries typically start with an underscore `_`.

**Requirements:**

* None

**Effects:**

* Returns an array containing all `FicCategoryDoc` documents currently in the state.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "suggestedTags": [
      {
        "name": "string",
        "type": "string",
        "reason": "string"
      }
    ],
    "tagsToRemove": [
      {
        "name": "string",
        "type": "string",
        "reason": "string"
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
