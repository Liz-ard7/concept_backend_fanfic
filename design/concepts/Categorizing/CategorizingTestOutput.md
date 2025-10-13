running 6 tests from ./concepts/Categorizing/CategorizingConcept.test.ts
Principle: User submits story, gets categorization, and can view it ...
------- output -------

--- Trace: Operational Principle ---
Action: categorizeFic for fic:StoryAlpha
Output: {"suggestedTags":[],"tagsToRemove":[]}
Action: viewFicCategory for fic:StoryAlpha
Output: {"_id":"fic:StoryAlpha","suggestedTags":[],"tagsToRemove":[]}
Query: _getAllFicCategories
Output: (count: 1)
----- output end -----
Principle: User submits story, gets categorization, and can view it ... ok (1s)
Scenario 1: Updating an existing fic's categorization ...
------- output -------

--- Scenario 1: Update Existing Fic Category ---
Action: Initial categorizeFic for fic:StoryBeta
Output: {"suggestedTags":[],"tagsToRemove":[]}
Action: categorizeFic (update) for fic:StoryBeta
Output: {"suggestedTags":[],"tagsToRemove":[]}
Query: viewFicCategory for fic:StoryBeta after update
Output: {"_id":"fic:StoryBeta","suggestedTags":[],"tagsToRemove":[]}
----- output end -----
Scenario 1: Updating an existing fic's categorization ... ok (2s)
Scenario 2: categorizeFic action - error handling for missing inputs ...
------- output -------

--- Scenario 2: categorizeFic Missing Inputs ---
Action: categorizeFic with missing ficId
Output: {"error":"Fic ID, text, and author tags are required."}
Action: categorizeFic with missing ficText
Output: {"error":"Fic ID, text, and author tags are required."}
Action: categorizeFic with undefined authorTags
Output: {"error":"Fic ID, text, and author tags are required."}
----- output end -----
Scenario 2: categorizeFic action - error handling for missing inputs ... ok (921ms)
Scenario 3: viewFicCategory - checking for non-existent fic and invalid input ...
------- output -------

--- Scenario 3: viewFicCategory Error Cases ---
Action: viewFicCategory for non-existent fic: fic:NonExistentStory
Output: {"error":"FicCategory for fic ID 'fic:NonExistentStory' not found."}
Action: viewFicCategory with empty ficId
Output: {"error":"Fic ID is required."}
----- output end -----
Scenario 3: viewFicCategory - checking for non-existent fic and invalid input ... ok (480ms)
Scenario 4: deleteFicCategory - successful deletion and error cases ...
------- output -------

--- Scenario 4: deleteFicCategory ---
Action: categorizeFic to create fic:EphemeralStory
Output: {"suggestedTags":[],"tagsToRemove":[]}
Action: deleteFicCategory for fic:EphemeralStory
Output: {"_id":"fic:EphemeralStory","suggestedTags":[],"tagsToRemove":[]}
Query: viewFicCategory for fic:EphemeralStory after deletion
Output: {"error":"FicCategory for fic ID 'fic:EphemeralStory' not found."}
Action: deleteFicCategory for non-existent fic:GhostStory
Output: {"error":"FicCategory for fic ID 'fic:GhostStory' not found."}
Action: deleteFicCategory with empty ficId
Output: {"error":"Fic ID is required."}
----- output end -----
Scenario 4: deleteFicCategory - successful deletion and error cases ... ok (1s)
Scenario 5: deleteFicCategories - multiple deletions and edge cases ...
------- output -------

--- Scenario 5: deleteFicCategories (Multiple Deletion) ---
Action: Create fic:MultiStory1, fic:MultiStory2, fic:MultiStory3
Action: deleteFicCategories for [fic:MultiStory1, fic:MultiNonExistentStory]
Output: {"deletedCount":1}
Action: deleteFicCategories for [fic:MultiStory2, fic:MultiStory3]
Output: {"deletedCount":2}
Action: deleteFicCategories with empty ficIds array
Output: {"error":"Fic IDs list cannot be empty."}
Action: deleteFicCategories for non-existent IDs when DB is empty
Output: {"error":"No FicCategories found or deleted for the provided IDs."}
----- output end -----
Scenario 5: deleteFicCategories - multiple deletions and edge cases ... ok (3s)
ok | 17 passed (5 steps) | 0 failed (19s)
