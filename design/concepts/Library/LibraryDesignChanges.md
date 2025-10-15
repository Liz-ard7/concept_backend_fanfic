# Design Changes to Library

1. From feedback to this, I saw my concept was far too "database"-like, and strove to add more capabilities to Library, such as date created and different versions of the same story.
[OriginalFeedback](../../../context/design/concepts/Library/LibraryConcept.md/20251012_142909.7e643fde.md)

2. After realizing certain things in Library don't return IDs, I made sure they returned IDs. For the actions which couldn't return IDs, I made them into queries instead.

3. I made it so that it only takes in primitives and IDs too, changing authorTags from a set of strings to just a string. That string will be parsed in Categorizing by splitting on newlines.
