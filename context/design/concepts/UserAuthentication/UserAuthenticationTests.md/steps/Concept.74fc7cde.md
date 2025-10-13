---
timestamp: 'Sun Oct 12 2025 22:32:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_223229.fd7333d6.md]]'
content_id: 74fc7cdee35ddc7c00c336e9b55851cf689471c305c8a4a643710fe247871581
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

Remember: findOne returns a WithID<ID>, NOT an ID.
