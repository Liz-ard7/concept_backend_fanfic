---
timestamp: 'Fri Nov 07 2025 22:52:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_225257.8bd81f0d.md]]'
content_id: 0691925840d8f87505f2e91d077c14c2409772a6e4d54a9d2d59f36b6759c829
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

Do not implement passthrough-- that has already been completed.

Here is code for my concepts.
