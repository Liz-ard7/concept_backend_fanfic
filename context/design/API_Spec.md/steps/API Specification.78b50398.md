---
timestamp: 'Mon Oct 20 2025 17:46:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174645.02fe20aa.md]]'
content_id: 78b50398a9f2f908b9a6b0d5da786d910d789b0f21917307dc73b030d6e71f1b
---

# API Specification: Library Concept

**Purpose:** to contain a user's story (associated with a name, a text, and string of authorTags) in an orderly list.

***

## API Endpoints

### POST /api/Library/addUser

**Description:** Adds a new user to the library concept.

**Requirements:**

* the user to not exist in the set of Users

**Effects:**

* adds user to set of Users, associates user with empty set of Versions with an empty set of Fics.

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

***

### POST /api/Library/submitNewFic

**Description:** Submits a brand new story (fic) for a user, creating its first version.

**Requirements:**

* the ficName to not exist within the set of the user's Versions' Title. user must exist in set of Users.

**Effects:**

* create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as 0, and authorTags as the set of authorTags.
* Create a new Version with ficName as the Title, add the Fic to the new version's set of Fics.
* Finally, add the new version to the user's set of Versions, and finally return the fic.

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

***

### POST /api/Library/submitNewVersionOfFanfic

**Description:** Submits a new revision for an existing story (version).

**Requirements:**

* user must exist in set of Users, versionTitle must exist within the user's set of Versions.

**Effects:**

* create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags.
* Then, add the Fic to the version within the user's set of Versions. Finally, return the Version.

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

***

### POST /api/Library/\_viewFic

**Description:** Retrieves a specific fic revision by its story title and version number.

**Requirements:**

* the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

**Effects:**

* displays the fic's contents corresponding to the user's Version's ficName as Title and versionNumber from the user's Version's set of Fics, then returns the fic.

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

***

### POST /api/Library/deleteFic

**Description:** Deletes a specific revision of a story for a user.

**Requirements:**

* the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

**Effects:**

* removes the fic corresponding to the user's ficName and versionNumber from the user's set of Versions, then returns the fic.

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

***

### POST /api/Library/deleteFicsAndUser

**Description:** Deletes a user and all their associated stories (fics and versions).

**Requirements:**

* user must exist in set of Users

**Effects:**

* removes all versions from the set of user's Versions, then removes user from set of Users.

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

***

### POST /api/Library/\_findFicWithDate

**Description:** Finds all fic revisions for a user that match a specific date.

**Requirements:**

* user must exist in set of Users

**Effects:**

* returns a set of Fics with dates matching the provided date. If there are no such fics, it returns an empty set.

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

***

### POST /api/Library/\_getVersion

**Description:** Retrieves a complete story version (including all its revisions) for a user.

**Requirements:**

* user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.

**Effects:**

* returns the user's version associated with the versionTitle as title.

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

***

### POST /api/Library/deleteVersion

**Description:** Deletes an entire story version (and all its fic revisions) for a user.

**Requirements:**

* the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users.

**Effects:**

* removes the version associated with ficTitle as the title from the user's set of Versions, then returns the version.

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

***

### POST /api/Library/\_getAllUserVersions

**Description:** Retrieves all story versions for a given user.

**Requirements:**

* None

**Effects:**

* Returns an array of version objects on success, or an error object.

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

***
