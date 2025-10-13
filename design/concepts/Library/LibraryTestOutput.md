running 0 tests from ./concepts/Categorizing/LibraryConcept.test.ts
running 5 tests from ./concepts/Library/LibraryConcept.test.ts
Principle: User submits stories and views them in their library. ...
------- post-test output -------
addUser (user: user:Alice): {}
submitNewFic (user: user:Alice, ficName: "The Enchanted Forest", ...): { fic: 0199da9c-1806-7fba-b59f-f71c799d47b2 }
submitNewFic (user: user:Alice, ficName: "Starship Odyssey", ...): { fic: 0199da9c-182e-7de5-99cf-8de610828e05 }
_getAllUserVersions (user: user:Alice): { versions: [ ..., ... ] }
viewFic (user: user:Alice, ficName: "The Enchanted Forest", versionNumber: 0): { fic: { text: "..." } }
----- post-test output end -----
Principle: User submits stories and views them in their library. ... ok (895ms)
Scenario: Submitting new versions and verifying updates. ...
------- post-test output -------
addUser (user: user:Bob): {}
submitNewFic (user: user:Bob, ficName: "Epic Tale", ...): { fic: 0199da9c-1aae-73ca-b7bf-81f8ecb86a01 }
submitNewVersionOfFanfic (user: user:Bob, versionTitle: "Epic Tale", ...): { version: { fics: [..., ...] } }
viewFic (user: user:Bob, ficName: "Epic Tale", versionNumber: 0): { fic: { text: "Chapter 1...", versionNumber: 0 } }
viewFic (user: user:Bob, ficName: "Epic Tale", versionNumber: 1): { fic: { text: "Chapter 1...", versionNumber: 1 } }
getVersion (user: user:Bob, versionTitle: "Epic Tale"): { version: { fics: [..., ...] } }
----- post-test output end -----
Scenario: Submitting new versions and verifying updates. ... ok (707ms)
Scenario: Error cases for fic submission and version updates. ...
------- post-test output -------
addUser (user: user:Charlie): {}
submitNewFic (user: user:Charlie, ficName: "Unique Story", ...): { fic: ... }
submitNewFic (user: user:Charlie, ficName: "Unique Story", ...): { error: "Fic with name 'Unique Story' already exists for user 'user:Charlie'." }
submitNewVersionOfFanfic (user: user:Charlie, versionTitle: "Nonexistent Story", ...): { error: "Fic version 'Nonexistent Story' does not exist for user 'user:Charlie'." }
submitNewVersionOfFanfic (user: 'user:Ghost', ...): { error: "User 'user:Ghost' does not exist." }
viewFic (user: user:Charlie, ficName: "Unique Story", versionNumber: 99): { error: "Version number '99' is out of range..." }
----- post-test output end -----
Scenario: Error cases for fic submission and version updates. ... ok (720ms)
Scenario: Deleting fics and versions. ...
------- post-test output -------
addUser (user: user:David): {}
submitNewFic (user: user:David, ficName: "Story A", ...): { fic: ... }
submitNewFic (user: user:David, ficName: "Story B", ...): { fic: ... }
submitNewVersionOfFanfic (user: user:David, versionTitle: "Story A", ...): { version: ... }
_getAllUserVersions (user: user:David): { versions: [ (Story A: 2 fics), (Story B: 1 fic) ] }
deleteFic (user: user:David, ficName: "Story A", versionNumber: 0): { fic: ... }
getVersion (user: user:David, versionTitle: "Story A"): { version: { fics: [ (Story A - updated, V0) ] } }
deleteVersion (user: user:David, ficTitle: "Story B"): { version: ... }
_getAllUserVersions (user: user:David): { versions: [ (Story A: 1 fic) ] }
deleteFic (user: user:David, ficName: "Story A", versionNumber: 0): { fic: ... }
_getAllUserVersions (user: user:David): { versions: [] }
deleteVersion (user: user:David, ficTitle: "NonExistent Story"): { error: "Version with title 'NonExistent Story' not found for user 'user:David'." }
----- post-test output end -----
Scenario: Deleting fics and versions. ... ok (1s)
Scenario: findFicWithDate and deleteFicsAndUser. ...
------- post-test output -------
addUser (user: user:Eve): {}
submitNewFic (user: user:Eve, ficName: "First Day", ...): { fic: ... }
submitNewFic (user: user:Eve, ficName: "Second Day", ...): { fic: ... }
submitNewVersionOfFanfic (user: user:Eve, versionTitle: "First Day", ...): { version: ... }
findFicWithDate (user: user:Eve, date: Jan 1, 2023): { fics: [..., ...] }
findFicWithDate (user: user:Eve, date: Jan 2, 2023): { fics: [...] }
findFicWithDate (user: user:Eve, date: Jan 3, 2023): { fics: [] }
deleteFicsAndUser (user: user:Eve): {}
_getAllUserVersions (user: user:Eve): { error: "User 'user:Eve' does not exist." }
deleteFicsAndUser (user: 'user:Zoe'): { error: "User 'user:Zoe' does not exist." }
----- post-test output end -----
Scenario: findFicWithDate and deleteFicsAndUser. ... ok (1s)

ok | 10 passed | 0 failed (9s)
