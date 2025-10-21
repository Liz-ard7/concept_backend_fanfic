---
timestamp: 'Mon Oct 20 2025 22:49:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_224930.56ed57f7.md]]'
content_id: d36ad41d8b3ec64caa6fc3b445bb55c6c0ea2477b7e4ef43336de493e06e894c
---

# response:

Okay, this is a great next step! The challenge involves combining information from two different concepts (`Library` and `Categorizing`) on the frontend, and also introducing an automatic action (triggering categorization on fic submission).

Here's how we'll implement these features:

**Part 1: Automatic Tag Categorization on Fic Submission (Frontend-driven Sync)**

Since we don't have a backend synchronization engine, the easiest way to achieve this is to make the frontend responsible. When a user successfully submits a new fic, we will immediately make another API call to the `Categorizing` concept to process that fic.

**Part 2: Display Categorization Results in Fic Details**

When you click "View Details" for a fic, the frontend currently fetches the fic data from the `Library` concept. To show categorization tags, we'll need to:

1. **Define a combined type** for a fic that includes its categorization data.
2. **Modify the `viewFicDetails` function** in the frontend to:
   * Fetch the base `Fic` object from `LibraryAPI._viewFic`.
   * Then, fetch the `FicCategoryDoc` from `CategorizingAPI._viewFicCategory` using the `ficId`.
   * Combine these two pieces of data into our new combined type.
3. **Update the template** to display these new categorization details.

Let's make these changes.

***

### **Step 1: Update `src/api/types.ts`**

We need a type that represents a `Fic` with its associated categorization details.

```typescript
// src/api/types.ts

export type ID = string; // Generic ID type

// --- Categorizing Concept Types ---
export interface Tag {
  name: string;
  type: string;
  reason: string;
}

export interface FicCategoryDoc {
  _id: ID;
  suggestedTags: Tag[];
  tagsToRemove: Tag[];
}

// --- Library Concept Types ---
export interface DateSpec {
  day: number;
  month: number;
  year: number;
}

export interface Fic {
  _id: ID;
  name: string;
  text: string;
  authorTags: string;
  date: DateSpec;
  versionNumber: number;
}

export interface Version {
  _id: ID;
  title: string;
  fics: Fic[];
}

// --- NEW TYPE: Combined Fic with Categorization Data ---
export interface FicWithCategorization extends Fic {
  suggestedTags?: Tag[]; // Optional, as categorization might not exist yet
  tagsToRemove?: Tag[]; // Optional
}
```

***
