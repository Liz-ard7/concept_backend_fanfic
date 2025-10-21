---
timestamp: 'Mon Oct 20 2025 17:46:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174645.02fe20aa.md]]'
content_id: 6b302e9d48b44de4fafa9a865f60874c13ac20b1b9e39c5292765714e3670ed4
---

# API Specification: UserAuthentication Concept

**Purpose:** limit access to stories to known users

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with the given username and password. If the username already exists, an error is returned.

**Requirements:**

* the username does not exist

**Effects:**

* creates a new User with the username username and password password,
* adds it to the set of Users, then returns it

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

***

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user with the given username and password. Returns the user's ID if credentials are valid, otherwise returns an error.

**Requirements:**

* requires the username to exist in the set of Users
* and for said user to have a matching username and password

**Effects:**

* returns the User associated with the username and password

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

***

### POST /api/UserAuthentication/deleteUser

**Description:** Deletes a user from the system. Requires valid username and password for confirmation. Returns the ID of the deleted user, or an error if credentials are invalid.

**Requirements:**

* the username and the password must match for a user in the set of Users

**Effects:**

* finds the user that matches with the username and password,
* removes the user from the set of Users and returns it

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

***
