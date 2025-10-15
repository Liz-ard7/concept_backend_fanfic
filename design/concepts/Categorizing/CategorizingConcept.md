## My original spec already had an AI augmentation

**concept** Categorizing [Fic]

**purpose** to categorize a text into specific categories (i.e. a story will be categorized into a set of tags). "Categorizing" can also *remove* tags provided by the author if deemed necessary.

**principle** A user submits their story and the tags the author has already added to the story. It outputs a list of suggested tags (properly categorized) to add to the story and tells the user if any of their author tags should be removed.

**state**

&nbsp;&nbsp;&nbsp;&nbsp; a set of FicCategories with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Fic

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a suggestedTags Category

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a tagsToRemove Category

&nbsp;&nbsp;&nbsp;&nbsp; a Category with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a set of Tags

&nbsp;&nbsp;&nbsp;&nbsp; a Tag with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Name string

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Type string

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a Reason string

**actions**

&nbsp;&nbsp;&nbsp;&nbsp; **categorizeFic** (fic) : (fic)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** using an LLM, the LLM will examine the fic's ficText's contents, and associates the top 20 most relevant tags (WITHOUT suggesting tags already included in the fic's authorTags) (the tags having a name, type, and reason for why they are being suggested) to the content in a suggestedTags Category to the Fic and (if there is not an FicCategory already associated with fic) creates a new FicCategory out of those and adds the FicCategory to the set of FicCategories, or (if there is a FicCategory associated with the fic) adds the suggestedTags to said ficCategory. Finally, it returns the suggestedTags.
Type of tags includes: ArchiveWarning, fandom, character, relationship, freeform, rating, category. using an LLM, the LLM will examine the fic's ficText's contents, then compare it to each authorTag in the foc's set of authorTags. If an authorTag seems inappropriate for the fic, it will add it to a Category of tags to remove (including its name, type, and reason for removal). At the very end, if there is already a ficCategory associated with fic, it will add the tagsToRemove Category to the ficCategory. If not, it'll create a new ficCategory and associate the fic and tagsToRemovewith it, and add it to the set of ficCategories. Finally, it returns the tagsToRemove.


&nbsp;&nbsp;&nbsp;&nbsp; **_viewFicCategory** (fic) : (ficCategory)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the fic to be associated with a ficCategory in the set of ficCategories

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** returns the ficCategory.


&nbsp;&nbsp;&nbsp;&nbsp; **deleteFicCategory** (fic) : (ficCategory)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the fic to be associated with a ficCategory in the set of ficCategories

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** removes the ficCategory associated with the fic from the set of FicCategories.


&nbsp;&nbsp;&nbsp;&nbsp; **deleteFicCategories** (deletedCount: number)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** all ficCategories to exist within the set of FicCategories.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** runs deleteFicCategory on all ficCategories in the set of ficCategories. Returns number of ficCats deleted
