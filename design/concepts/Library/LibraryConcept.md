# concept: Library

**concept** Library [User]

**purpose** to contain a user's story (associated with a name, a text, and a set of authorTags) in an orderly list.

**principle** A user submits a story by inputting its name, body text, and set of authorTags into the website. Then, when the user views themselves, they see their new story listed alongside all previous stories they've submitted.

**state**

&nbsp;&nbsp;&nbsp;&nbsp; a set of Users with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a set of Versions with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Title String

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a set of Fics

&nbsp;&nbsp;&nbsp;&nbsp; a Fic with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Name String

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Text String

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; an authorTags string

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Date

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a versionNumber Number

&nbsp;&nbsp;&nbsp;&nbsp; a Date with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a day Number

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a month Number

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a year Number

**actions**

&nbsp;&nbsp;&nbsp;&nbsp; **addUser** (user)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the user to not exist in the set of Users

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** adds user to set of Users, associates user with empty set of Versions with an empty set of Fics.


&nbsp;&nbsp;&nbsp;&nbsp; **submitNewFic** (user, ficText: string, ficName: string, authorTags: String, date) : (fic)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the ficName to not exist within the set of the user's Versions' Title. user must exist in set of Users

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as 0, and authorTags as the set of authorTags. Create a new Version with ficName as the Title, add the Fic to the new version's set of Fics. Finally, add the new version to the user's set of Versions, and finally return the fic.


&nbsp;&nbsp;&nbsp;&nbsp; **submitNewVersionOfFanfic** (user, ficText: string, authorTags: string, version, date, ficName: string) : (version)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** user must exist in set of Users, version must exist within the user's set of Versions

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** create a Fic containing the fic's ficName as Name, ficText as Text, date as date, versionNumber as the length of the set of Fics within the version + 1, and authorTags as the set of authorTags. Then, add the Fic to the version within the user's set of Versions. Finally, return the Version.


&nbsp;&nbsp;&nbsp;&nbsp; **deleteFic** (user, ficName: string, versionNumber: Number): (fic)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the ficName to exist within the set of the user's Fic's Names. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** removes the fic corresponding to the user's ficName and versionNumber from the user's set of Versions, then returns the fic.


&nbsp;&nbsp;&nbsp;&nbsp; **deleteFicsAndUser** (user)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** user must exist in set of Users

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** removes all versions from the set of user's Versions, then removes user from set of Users.


&nbsp;&nbsp;&nbsp;&nbsp; **deleteVersion** (user, ficTitle: string): (version)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the ficTitle to exist within the set of the user's Versions' Titles. user must exist in set of Users

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** removes the version associated with ficTitle as the title from the user's set of Versions, then returns the version.


**queries**

&nbsp;&nbsp;&nbsp;&nbsp; **_viewFic** (user, ficName: string, versionNumber: Number): (fic)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the ficName to exist within the set of the user's Versions' Title. user must exist in set of Users, versionNumber must exist within the range from 0 to the length of the set of Fics in version.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** displays the fic's contents corresponding to the user's Version's ficName as Title and versionNumber from the user's Version's set of Fics, then returns the fic.


&nbsp;&nbsp;&nbsp;&nbsp; **_getVersion** (user, versionTitle: string): (version)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** user must exist in set of Users, versionTitle must exist within the user's set of Versions' Titles.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** returns the user's version associated with the versionTitle as title.
