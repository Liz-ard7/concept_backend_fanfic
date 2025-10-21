# API Spec

[@Concept-Design-Overview](../background/concept-design-overview.md)

[@Concept-Specifications](../background/concept-specifications.md)

[@API-Extraction-From-Code](../tools/api-extraction-from-code.md)

[@API-Extraction-From-Spec](../tools/api-extraction-from-spec.md)

[@CategorizingConcept](../../src/concepts/Categorizing/CategorizingConcept.ts)

[@LibraryConcept](../../src/concepts/Library/LibraryConcept.ts)

[@UserAuthenticationConcept](../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)

# prompt: extract an API from the Categorizing Concept, Library Concept, and UserAuthentication Concept

# response:

Here is the API documentation generated from the provided Concept Specifications:

---

# API Specification: Categorizing Concept

**Purpose:** to categorize a text into specific categories (i.e. a story will be categorized into a set of tags). "Categorizing" can also *remove* tags provided by the author if deemed necessary.

---

## API Endpoints

### POST /api/Categorizing/categorizeFic

**Description:** This action combines the functionality of `keywordGenerator` and `tagCleaner` into a single LLM call for efficiency and consistency, as suggested. It takes a fic's content and existing author tags, and returns both suggested new tags and a list of author tags that should be removed.

**Requirements:**
- The input object must contain `ficId` (the unique identifier for the fic),
- `ficText` (the full text content of the fic), and `authorTags`
- (an string of tags already provided by the author, split with newlines).

**Effects:**
- 1. Uses an LLM to analyze `ficText` and `authorTags`.
- 2. Generates up to 20 highly relevant `suggestedTags` that are not already present in the `authorTags`. Each suggested tag includes its `name`, `type`, and a `reason` for suggestion.
- 3. Identifies `tagsToRemove` from the `authorTags` that are deemed inappropriate, irrelevant, or misleading based on the `ficText`. Each tag to remove includes its `name`, `type`, and a `reason` for removal.
- 4. An entry in the `ficCategories` collection is either created (if one doesn't exist for `ficId`) or updated to store these `suggestedTags` and `tagsToRemove`.
- 5. Returns the generated `suggestedTags` and `tagsToRemove`.

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

---

### POST /api/Categorizing/_viewFicCategory

**Description:** Retrieves the categorization data (suggested tags and tags to remove) for a specific fic.

**Requirements:**
- The `ficId` must correspond to an existing entry in the `ficCategories` collection.

**Effects:**
- If an entry exists, returns the `FicCategoryDoc` associated with the given `ficId`.
- Otherwise, returns an error indicating the ficCategory was not found.

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

---

### POST /api/Categorizing/deleteFicCategory

**Description:** Removes the categorization data for a single fic from the system.

**Requirements:**
- The `ficId` must correspond to an existing entry in the `ficCategories` collection.

**Effects:**
- If found, the `FicCategoryDoc` associated with `ficId` is removed from the `ficCategories` collection.
- Returns the deleted `FicCategoryDoc` or an error if not found/failed.

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

---

### POST /api/Categorizing/deleteFicCategories

**Description:** Removes categorization data for multiple fics from the system.

**Requirements:**
- All `ficIds` in the input list should correspond to existing entries in the `ficCategories` collection for a successful operation.

**Effects:**
- Attempts to remove all `FicCategoryDoc` entries whose `_id` is present in the `ficIds` list. Returns the count of successfully deleted categories.
- Returns an error if the input list is empty or no categories were deleted.

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

---

### POST /api/Categorizing/_getAllFicCategories

**Description:** A query to retrieve all stored fic categorization entries. Queries typically start with an underscore `_`.

**Requirements:**
- None

**Effects:**
- Returns an array containing all `FicCategoryDoc` documents currently in the state.

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

---

# API Specification: Library Concept

**Purpose:** to contain a user's story (associated with a name, a text, and string of authorTags) in an orderly list.

---

## API Endpoints

### POST /api/Library/addUser

**Description:** Adds a new user to the library concept.

**Requirements:**
- the user to not exist in the set of Users

**Effects:**
- adds user to set of Users, associates user with empty set of Versions with an empty set of Fics.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Library/submitNewFic

**Description:** Submits a brand new story (fic) for a user, creating its first version.

**Requirements:**
- the ficName to not exist within the set of the user's Versions' Title. user must exist in set of Users.

**Effects:**
- create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as 0, and authorTags as the set of authorTags.
- Create a new Version with ficName as the Title, add the Fic to the new version's set of Fics.
- Finally, add the new version to the user's set of Versions, and finally return the fic.

**Request Body:**
```json
{
  "user": "string",
  "ficText": "string",
  "ficName": "string",
  "authorTags": "string",
  "date": {
    "day": "number",
    "month": "number",
    "year": "number"
  }
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

---

### POST /api/Library/submitNewVersionOfFanfic

**Description:** Submits a new revision for an existing story (version).

**Requirements:**
- user must exist in set of Users, versionTitle must exist within the user's set of Versions.

**Effects:**
- create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags.
- Then, add the Fic to the version within the user's set of Versions. Finally, return the Version.

**Request Body:**
```json
{
  "user": "string",
  "ficText": "string",
  "authorTags": "string",
  "versionTitle": "string",
  "date": {
    "day": "number",
    "month": "number",
    "year": "number"
  },
  "ficName": "string"
}
```

**Success Response Body (Action):**
```json
{
  "versionId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Library/_viewFic

**Description:** Retrieves a specific fic revision by its story title and version number.

**Requirements:**
- the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

**Effects:**
- displays the fic's contents corresponding to the user's Version's ficName as Title and versionNumber from the user's Version's set of Fics, then returns the fic.

**Request Body:**
```json
{
  "user": "string",
  "ficName": "string",
  "versionNumber": "number"
}
```

**Success Response Body (Query):**
```json
[
  {
    "fic": {
      "_id": "string",
      "name": "string",
      "text": "string",
      "authorTags": "string",
      "date": {
        "day": "number",
        "month": "number",
        "year": "number"
      },
      "versionNumber": "number"
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Library/deleteFic

**Description:** Deletes a specific revision of a story for a user.

**Requirements:**
- the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

**Effects:**
- removes the fic corresponding to the user's ficName and versionNumber from the user's set of Versions, then returns the fic.

**Request Body:**
```json
{
  "user": "string",
  "ficName": "string",
  "versionNumber": "number"
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

---

### POST /api/Library/deleteFicsAndUser

**Description:** Deletes a user and all their associated stories (fics and versions).

**Requirements:**
- user must exist in set of Users

**Effects:**
- removes all versions from the set of user's Versions, then removes user from set of Users.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Library/_findFicWithDate

**Description:** Finds all fic revisions for a user that match a specific date.

**Requirements:**
- user must exist in set of Users

**Effects:**
- returns a set of Fics with dates matching the provided date. If there are no such fics, it returns an empty set.

**Request Body:**
```json
{
  "user": "string",
  "date": {
    "day": "number",
    "month": "number",
    "year": "number"
  }
}
```

**Success Response Body (Query):**
```json
[
  {
    "fics": [
      {
        "_id": "string",
        "name": "string",
        "text": "string",
        "authorTags": "string",
        "date": {
          "day": "number",
          "month": "number",
          "year": "number"
        },
        "versionNumber": "number"
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

---

### POST /api/Library/_getVersion

**Description:** Retrieves a complete story version (including all its revisions) for a user.

**Requirements:**
- user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.

**Effects:**
- returns the user's version associated with the versionTitle as title.

**Request Body:**
```json
{
  "user": "string",
  "versionTitle": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "version": {
      "_id": "string",
      "title": "string",
      "fics": [
        {
          "_id": "string",
          "name": "string",
          "text": "string",
          "authorTags": "string",
          "date": {
            "day": "number",
            "month": "number",
            "year": "number"
          },
          "versionNumber": "number"
        }
      ]
    }
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Library/deleteVersion

**Description:** Deletes an entire story version (and all its fic revisions) for a user.

**Requirements:**
- the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users.

**Effects:**
- removes the version associated with ficTitle as the title from the user's set of Versions, then returns the version.

**Request Body:**
```json
{
  "user": "string",
  "ficTitle": "string"
}
```

**Success Response Body (Action):**
```json
{
  "versionId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Library/_getAllUserVersions

**Description:** Retrieves all story versions for a given user.

**Requirements:**
- None

**Effects:**
- Returns an array of version objects on success, or an error object.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "versions": [
      {
        "_id": "string",
        "title": "string",
        "fics": [
          {
            "_id": "string",
            "name": "string",
            "text": "string",
            "authorTags": "string",
            "date": {
              "day": "number",
              "month": "number",
              "year": "number"
            },
            "versionNumber": "number"
          }
        ]
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

---

# API Specification: UserAuthentication Concept

**Purpose:** limit access to stories to known users

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with the given username and password. If the username already exists, an error is returned.

**Requirements:**
- the username does not exist

**Effects:**
- creates a new User with the username username and password password,
- adds it to the set of Users, then returns it

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user with the given username and password. Returns the user's ID if credentials are valid, otherwise returns an error.

**Requirements:**
- requires the username to exist in the set of Users
- and for said user to have a matching username and password

**Effects:**
- returns the User associated with the username and password

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserAuthentication/deleteUser

**Description:** Deletes a user from the system. Requires valid username and password for confirmation. Returns the ID of the deleted user, or an error if credentials are invalid.

**Requirements:**
- the username and the password must match for a user in the set of Users

**Effects:**
- finds the user that matches with the username and password,
- removes the user from the set of Users and returns it

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---
