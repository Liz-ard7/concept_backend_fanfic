---
timestamp: 'Fri Nov 07 2025 18:44:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_184439.f0f0e9cb.md]]'
content_id: 4f97a26d534a79e4727bccb8a2c6c823525e7b0f288951382008d734c953869e
---

# Concept: UserAuthentication

**concept** UserAuthentication

**purpose** limit access to stories to known users

**principle** after a user registers with a username and a password,
they can authenticate with that same username and password
and be treated each time as the same user

**state**

     a set of Users with

         a username

         a password

**actions**

     **register** (username: String, password: String): (user)

         **requires** the username does not exist

         **effects** creates a new User with the username username and password password, adds it to the set of Users, then returns it

     **authenticate** (username: String, password: String): (user)

         **requires** requires the username to exist in the set of Users and for said user to have a matching username and password

         **effects** returns the User associated with the username and password

     **deleteUser** (username: String, password: String): (user)

         **requires** the username and the password must match for a user in the set of Users

         **effects** finds the user that matches with the username and password removes the user from the set of Users and returns it

Why exclude actions? Excluding a concept action means that calling /api/concept\_c/action\_a no longer directly causes Concept\_c.action\_a to occur. There are primarily two reasons for wanting this. One is that the action should only be permitted under certain conditions (such as when the user has been authenticated); you would implement this with a sync saying that when the request occurs and where some condition holds, then the action itself occurs. Note that in this case the call to /api/concept\_c/action\_a would likely have to be modified because the request action would include parameters (such as a session token) that the bare concept action does not.

A second reason is that the action is to be handled only by the back end and no longer be available to the front end at all. For example, in a social media app, a notification action might be excluded so that it can be executed automatically in response to a comment being added to a user’s post. Note that in this case the only likely change to the front end (if it was previously executing the notification explicitly) is that some calls are removed.
