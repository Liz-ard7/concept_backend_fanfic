---
timestamp: 'Fri Nov 07 2025 22:52:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_225223.a47289f1.md]]'
content_id: 325459fa261bbaa7f746356b75950d1de02db551707d61936d48f714d5eb3df2
---

# response:

Based on the "Implementing Synchronizations" section of the document:

You should put your synchronization files in the `src/syncs/` directory.

The document states:
"To include them as part of your application, simply write them using a file name of `filename.sync.ts`, and store them anywhere under `src/syncs/` where you may have any number of directories and nesting."

For example:

* `src/syncs/auth.sync.ts`
* `src/syncs/posts.sync.ts`
* `src/syncs/library_categorization.sync.ts` (for syncs orchestrating `Library` and `Categorizing`)

Remember to run `deno run build` after creating new concepts or sync files to ensure the `@concepts` import is properly generated.

syncing provides the decisions of which actions/queries should be included and which should be excluded.

Do not define new concepts. Do not write code to implement these concepts-- they are already implemented.

Requesting is provided for me by my instructors to implement syncs-- it isn't something needed to be put into the app.

Sessioning doesn't exist and is not a concept!!

Here is code for my concepts.
