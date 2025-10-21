running 7 tests from ./concepts/Categorizing/CategorizingConcept.test.ts
Principle: User submits story, gets categorization, and can view it ...
------- output -------

--- Trace: Operational Principle ---
Action: categorizeFic for fic:StoryAlpha
Output: {"ficId":"fic:StoryAlpha"}
Action: viewFicCategory for fic:StoryAlpha
Output: {"_id":"fic:StoryAlpha","suggestedTags":[{"name":"Magic","type":"General","reason":"The story explicitly mentions a 'young wizard' and learning to 'cast spells', indicating the presence of magic as a core element."},{"name":"Secret Society","type":"General","reason":"The story states the protagonist 'discovers a secret society'."},{"name":"Good vs Evil","type":"General","reason":"The story mentions the protagonist 'fights an evil sorcerer', clearly establishing a conflict between good and evil."},{"name":"Wizard","type":"General","reason":"The story refers to the protagonist as a 'young wizard'."},{"name":"Sorcerer","type":"General","reason":"The story mentions the protagonist fighting an 'evil sorcerer'."}],"tagsToRemove":[]}
Query: _getAllFicCategories
Output: (count: 1)
----- output end -----
Principle: User submits story, gets categorization, and can view it ... ok (1s)
ISATEST ...
------- output -------

--- ISATEST!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ---
Action: categorizeFic for fic:StoryEcho
Output: {"ficId":"fic:StoryEcho"}
SuggestedTags:
Werewolf Jax (type: Character): Jax transforms into a werewolf.,Werewolf (type: Content): Jax transforms into a werewolf.,Chaos (type: Content): Michael Distortion is described as a chaos god and distorts everything.,Multiverse (type: Content): Michael Distortion becomes an omnipotent, benevolent chaos god of the multiverse.,God (type: Content): Michael Distortion becomes an omnipotent, benevolent chaos god.,Friendship (type: Relationship): Pomni tries to comfort Jax and stop his transformation, indicating a platonic relationship.,Sans/Michael Distortion (type: Relationship): Sans realizes he has met his match with Michael Distortion, implying a significant interaction or conflict between them.
TagsToRemove:
Alpha/Beta/Omega Dynamics (type: Relationship): This is not supported by the text.,Evil Sans (type: Character): The text identifies the character as 'Sans Undertale' and does not describe him as 'Evil'.,Humor (type: Content): While there are some attempts at jokes (e.g., Sans' pun), the overall tone and events (rage, transformation, distortion, confrontation) do not clearly indicate humor as a primary content tag.,Alternate Universe-RPF (type: Genre): The story involves fictional characters from different universes and does not appear to be based on Real Person Fiction.,Destiel (type: Relationship): This ship is not present in the story.,There Was Only One Bed (type: Relationship): This trope is not present in the story.,No Beta We Die Like Michael Distortion (type: Relationship): This phrase appears to be a reference or inside joke and does not represent a relationship or trope supported by the narrative.
----- output end -----
ISATEST ... ok (2s)
Scenario 1: Updating an existing fic's categorization ...
------- output -------

--- Scenario 1: Update Existing Fic Category ---
Action: Initial categorizeFic for fic:StoryBeta
Output: {"ficId":"fic:StoryBeta"}
Action: categorizeFic (update) for fic:StoryBeta
Output: {"ficId":"fic:StoryBeta"}
Query: viewFicCategory for fic:StoryBeta after update
Output: {"_id":"fic:StoryBeta","suggestedTags":[{"name":"Space Opera","type":"Genre","reason":"The story is described as a space opera, which is a recognized genre tag."},{"name":"Aliens","type":"Fandom","reason":"The story explicitly mentions aliens fighting for control of a galaxy."},{"name":"War","type":"Genre","reason":"The story describes aliens fighting for control of a galaxy, which implies a war."},{"name":"Galaxy","type":"Setting","reason":"The story explicitly states that aliens fight for control of a galaxy."}],"tagsToRemove":[]}
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
Scenario 2: categorizeFic action - error handling for missing inputs ... ok (448ms)
Scenario 3: viewFicCategory - checking for non-existent fic and invalid input ...
------- output -------

--- Scenario 3: viewFicCategory Error Cases ---
Action: viewFicCategory for non-existent fic: fic:NonExistentStory
Output: {"error":"FicCategory for fic ID 'fic:NonExistentStory' not found."}
Action: viewFicCategory with empty ficId
Output: {"error":"Fic ID is required."}
----- output end -----
Scenario 3: viewFicCategory - checking for non-existent fic and invalid input ... ok (468ms)
Scenario 4: deleteFicCategory - successful deletion and error cases ...
------- output -------

--- Scenario 4: deleteFicCategory ---
Action: categorizeFic to create fic:EphemeralStory
Output: {"ficId":"fic:EphemeralStory"}
Action: deleteFicCategory for fic:EphemeralStory
Output: {"ficCategoryId":"fic:EphemeralStory"}
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
Scenario 5: deleteFicCategories - multiple deletions and edge cases ... ok (2s)
