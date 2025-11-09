---
timestamp: 'Fri Nov 07 2025 23:14:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_231456.83adf59d.md]]'
content_id: 9ce276fee1343058b809afaa434ec0856c2af62eaf3c2359234e1f086c9fb183
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

authenticatedFrames = await authenticatedFrames.query(
Library.\_getAllUserVersions,
{ user },
{ versions: Symbol('userVersions') },
);

No overload matches this call.
Overload 1 of 2, '(f: (...args: never\[]) => unknown\[], input: { user: symbol; }, output: { versions: symbol; }): Frames\<Frame & ExtractSymbolMappings<{ user: symbol; }, unknown>>', gave the following error.
Argument of type '({ user }: { user: ID; }) => Promise<\[{ versions: Version\[]; }] | { error: string; }>' is not assignable to parameter of type '(...args: never\[]) => unknown\[]'.
Type 'Promise<\[{ versions: Version\[]; }] | { error: string; }>' is missing the following properties from type 'unknown\[]': length, pop, push, concat, and 35 more.
Overload 2 of 2, '(f: (...args: never\[]) => Promise\<unknown\[]>, input: { user: symbol; }, output: { versions: symbol; }): Promise\<Frames\<Frame & ExtractSymbolMappings<{ user: symbol; }, unknown>>>', gave the following error.
Argument of type '({ user }: { user: ID; }) => Promise<\[{ versions: Version\[]; }] | { error: string; }>' is not assignable to parameter of type '(...args: never\[]) => Promise\<unknown\[]>'.
Type 'Promise<\[{ versions: Version\[]; }] | { error: string; }>' is not assignable to type 'Promise\<unknown\[]>'.
Type '\[{ versions: Version\[]; }] | { error: string; }' is not assignable to type 'unknown\[]'.
Type '{ error: string; }' is missing the following properties from type 'unknown\[]': length, pop, push, concat, and 35 more.deno-ts(2769)

Do not use Frames.query. Do not use Frames.
