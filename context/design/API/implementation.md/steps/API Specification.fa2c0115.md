---
timestamp: 'Mon Oct 20 2025 20:02:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_200215.27d70a9e.md]]'
content_id: fa2c011544a557714ecfdbfea75047c7b4a58a246fca29f36337430bacbeb68f
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

Here is where my backend is running: http://localhost:8000/api
