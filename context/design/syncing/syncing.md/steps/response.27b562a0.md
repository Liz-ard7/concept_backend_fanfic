---
timestamp: 'Fri Nov 07 2025 22:47:17 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_224717.5cd41b1b.md]]'
content_id: 27b562a092595165ec9fe2ecbc2decc87e10bc875506a39bbe381291a10e8383
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
