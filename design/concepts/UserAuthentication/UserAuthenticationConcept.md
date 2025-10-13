# Concept: UserAuthentication

**concept** UserAuthentication

**purpose** limit access to stories to known users

**principle** after a user registers with a username and a password,
they can authenticate with that same username and password
and be treated each time as the same user

**state**

&nbsp;&nbsp;&nbsp;&nbsp; a set of Users with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a username

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a password

**actions**

&nbsp;&nbsp;&nbsp;&nbsp; **register** (username: String, password: String): (user)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the username does not exist

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effects** creates a new User with the username username and password password, adds it to the set of Users, then returns it

&nbsp;&nbsp;&nbsp;&nbsp; **authenticate** (username: String, password: String): (user)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** requires the username to exist in the set of Users and for said user to have a matching username and password

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effects** returns the User associated with the username and password

&nbsp;&nbsp;&nbsp;&nbsp; **deleteUser** (username: String, password: String): (user)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the username and the password must match for a user in the set of Users

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effects** finds the user that matches with the username and password removes the user from the set of Users and returns it
