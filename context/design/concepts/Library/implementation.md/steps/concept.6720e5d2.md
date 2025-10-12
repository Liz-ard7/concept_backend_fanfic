---
timestamp: 'Sun Oct 12 2025 16:43:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_164332.2827eb04.md]]'
content_id: 6720e5d2640bab59ef4a37c936cbea4bc47fbe4eeb3bf43a217e0ed2b76fa9ab
---

# concept: Library

**concept** Library \[User]

**purpose** to contain a user's story (associated with a name, a text, and a set of authorTags) in an orderly list.

**principle** A user submits a story by inputting its name, body text, and set of authorTags into the website. Then, when the user views themselves, they see their new story listed alongside all previous stories they've submitted.

**state**

     a set of Users with

         a set of Versions with

             a Title String

             a set of Fics

     a Fic with

         a Name String

         a Text String

         a set of authorTags strings

         a Date

         a versionNumber Number

     a Date with

         a day Number

         a month Number

         a year Number

**actions**

     **addUser** (user)

         **requires** the user to not exist in the set of Users

         **effect** adds user to set of Users, associates user with empty set of Versions with an empty set of Fics.

     **submitNewFic** (user, ficText: string, ficName: string, authorTags: set of Strings, date) : (fic)

         **requires** the ficName to not exist within the set of the user's Versions' Title. user must exist in set of Users

         **effect** create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as 0, and authorTags as the set of authorTags. Create a new Version with ficName as the Title, add the Fic to the new version's set of Fics. Finally, add the new version to the user's set of Versions, and finally return the fic.

     **submitNewVersionOfFanfic** (user, ficText: string, authorTags: set of Strings, version, date, ficName: string) : (version)

         **requires** user must exist in set of Users, version must exist within the user's set of Versions

         **effect** create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags. Then, add the Fic to the version within the user's set of Versions. Finally, return the Version.

     **viewFic** (user, ficName: string, versionNumber: Number): (fic)

         **requires** the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

         **effect** displays the fic's contents corresponding to the user's Version's ficName as Title and versionNumber from the user's Version's set of Fics, then returns the fic.

     **deleteFic** (user, ficName: string, versionNumber: Number): (fic)

         **requires** the ficName to exist within the set of the user's Fic's Names. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

         **effect** removes the fic corresponding to the user's ficName and versionNumber from the user's set of Versions, then returns the fic.

     **deleteFicsAndUser** (user)

         **requires** user must exist in set of Users

         **effect** removes all versions from the set of user's Versions, then removes user from set of Users.

     **findFicWithDate** (user, date: Date): (set of Fics)

         **requires** user must exist in set of Users

         **effect** returns a set of Fics with dates matching the provided date. If there are no such fics, it returns an empty set.

     **getVersion** (user, versionTitle: string): (version)

         **requires** user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.

         **effect** returns the user's version associated with the versionTitle as title.

     **deleteVersion** (user, ficTitle: string): (version)

         **requires** the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users

         **effect** removes the version associated with ficTitle as the title from the user's set of Versions, then returns the version.
