# Design Changes for Categorization

1. I got rid of the LLM classifying tags in separate functions and as a whole separate aspect of the function itself, as I realized it could all be simplified down into keywordGenerator. Furthermore, as my database contained tag types, I wouldn't need to train it separately either. Just asking the AI to suggest a tag with a type is good enough for it to do that on its own.

2. I added reasons for tag suggestions as it's both a helpful debugging tool for prompt engineering (like when the AI removes a tag unfoundedly, I can see its thought process on doing so and adjust the prompt to avoid such a thing), and because it's helpful to the user on learning more about tagging, like if the user can't understand why to remove a tag and just ends up frusturated because of it.

3. I added a new type called Tag which contains a name, a type, and a reason, for the LLM to implement in its implementation.

4. In the actual implementation, I realized that combining keywordGenerator and tagCleaner would
probably be for the best, as both can be done at the same time and it is way simpler to do them
at the same time than to do them separately and then have to combine them awkwardly.

5. I realized that categorizeFic wasn't returning an ID, it was returning a composite object, so I slightly edited the concept, implementation, and test. Same for deleteFicCategories, so I made it return the count instead of a set.
