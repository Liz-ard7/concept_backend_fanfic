---
timestamp: 'Sun Oct 12 2025 14:29:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_142909.7e643fde.md]]'
content_id: d397f92740a9745324cc0565363c0a60668ce06a951da8004a102d44d8b1a50e
---

# concept: Library

**concept** Library \[User]

**purpose** to contain a user's story (associated with a name, a text, and a set of authorTags) in an orderly list.

**principle** A user submits a story by inputting its name, body text, and set of authorTags into the website. Then, when the user views themselves, they see their new story listed alongside all previous stories they've submitted.

**state**

     a set of Users with

         a set of Fics

     an Fic with

         a Name String

         a Text String

         a set of authorTags strings

**actions**

     **addUser** (user)

         **requires** the user to not exist in the set of Users

         **effect** adds user to set of Users

     **submitFic** (user, ficText: string, ficName: string, authorTags: set of Strings) : (fic)

         **requires** the ficName to not exist within the set of the user's Fic's Names. user must exist in set of Users

         **effect** create an Fic containing the fic's ficName as Name, ficText as Text, and authorTags as the set of authorTags. Then, add this fic to the user's set of Fics, and finally returns the fic.

     **viewFic** (user, ficName: string): (fic)

         **requires** the ficName to exist within the set of the user's Fic's Names. user must exist in set of Users

         **effect** displays the fic's contents corresponding to the user's ficName from the user's set of Fics, then returns the fic.

     **deleteFic** (user, ficName: string): (fic)

         **requires** the ficName to exist within the set of the user's Fic's Names. user must exist in set of Users

         **effect** removes the fic corresponding to the user's ficName from the user's set of Fics, then returns the fic.

     **deleteFicsAndUser** (user)

         **requires** user must exist in set of Users

         **effect** removes all fics from the set of user's Fics, then removes user from set of Users.
