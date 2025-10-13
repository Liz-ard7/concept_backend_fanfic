---
timestamp: 'Sun Oct 12 2025 23:11:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_231130.91461db6.md]]'
content_id: 193290e78f262073570c61e50bd76e881a3991abcfe459cba1e0ddc56ece4c60
---

# concept: Categorizing

## Concept name and type parameters

**concept** Categorizing \[Fic]

## Concept purpose

**purpose** to categorize a text into specific categories (i.e. a story will be categorized into a set of tags). "Categorizing" can also *remove* tags provided by the author if deemed necessary.

## Concept principle

**principle** A user submits their story and the tags the author has already added to the story. It outputs a list of suggested tags (properly categorized) to add to the story and tells the user if any of their author tags should be removed.

## Concept state

**state**

     a set of FicCategories with

         an Fic

         a suggestedTags Category

         a tagsToRemove Category

     a Category with

         a set of Type strings

## Concept actions

     **keywordGenerator** (fic: Fic, ficText: String, authorTags: set of String) : (suggestedTags: Category)

         **effect** using an LLM, the LLM will examine the fic's ficText's contents, and associates the top 20 most relevant tags (WITHOUT suggesting tags already included in the fic's authorTags) to the content in a suggestedTags Category to the Fic and (if there is not an FicCategory already associated with fic) creates a new FicCategory out of those and adds the FicCategory to the set of FicCategories, or (if there is an FicCategory associated with the fic) adds the suggestedTags to said ficCategory. Finally, it returns the suggestedTags.

     **tagCleaner** (fic: Fic, ficText: String, authorTags: set of String) : (tagsToRemove: Category)

         **effect** using an LLM, the LLM will examine the fic's ficText's contents, then compare it to each authorTag in the foc's set of authorTags. If an authorTag seems inappropriate for the fic, it will add it to a Category of tags to remove. At the very end, if there is already an ficCategory associated with fic, it will add the tagsToRemove Category to the ficCategory. If not, it'll create a new ficCategory and associate the fic and tagsToRemovewith it, and add it to the set of ficCategories. Finally, it returns the tagsToRemove.

     **viewFicCategory** (fic: Fic) : (ficCategory: FicCategory)

         **requires** the fic to be associated with an ficCategory in the set of ficCategories

         **effect** returns the ficCategory.

     **deleteFicCategory** (fic: Fic) : Empty

         **requires** the fic to be associated with an ficCategory in the set of ficCategories

         **effect** removes the ficCategory associated with the fic from the set of FicCategories.

     **deleteFicCategories** (ficIds: set of Fic) : Empty

         **requires** all ficCategories to exist within the set of FicCategories.

         **effect** runs deleteFicCategory on all ficCategories in the set of ficCategories.

***
