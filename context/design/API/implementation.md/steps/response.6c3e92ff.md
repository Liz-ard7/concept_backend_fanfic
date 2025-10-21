---
timestamp: 'Mon Oct 20 2025 23:12:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_231243.33a557af.md]]'
content_id: 6c3e92ffd6179ec26385d25c6e2334d70f016005ddbfcce2592544da68e01b2d
---

# response:

You're encountering a `500 Internal Server Error` from your backend, which means something went wrong within the `categorizeFic` method in your `CategorizingConcept.ts`. The frontend's `console.error` message "Error during automatic categorization: An internal server error occurred." confirms that the backend's catch block is being hit and returning a generic error.

The most common reason for this type of error in the `CategorizingConcept` is related to **file access** for `tagsEdited2021.csv` or **LLM API key/network issues**.

Let's debug this systematically.

### **Step 1: Check your Backend Console Output (Crucial!)**

When you run your Deno backend, it prints its own `console.error` messages if an exception occurs. Look for the Deno terminal where you executed `deno run ... concept_server.ts`. You should find a more specific error message there, likely from:

* `Error reading CSV file: ...` (from `readCsvFileAsString`)
* `❌ Error in categorizeFic for fic ID ...` (from `categorizeFic`'s main catch block)
* Or potentially an uncaught Deno error if something very unexpected happened.

The exact message from your backend console will tell us precisely what went wrong.

### **Step 2: Probable Cause & Fix - CSV File Path**

Based on common Deno project setups and relative paths, the most likely culprit is the `csvFilePath` in your `CategorizingConcept.ts`.

Your `CategorizingConcept.ts` is located at `src/concepts/Categorizing/CategorizingConcept.ts`.
The line `const csvFilePath = '../tagsEdited2021.csv';` means it's looking for the CSV file one directory *up* from `src/concepts/Categorizing/`, which would be `src/concepts/tagsEdited2021.csv`.

However, the `gemini-llm.ts` import (`../../../gemini-llm.ts`) implies that `gemini-llm.ts` is in your **project root**. It's highly probable that `tagsEdited2021.csv` is *also* intended to be in the project root, alongside `gemini-llm.ts`.

If `tagsEdited2021.csv` is in the project root, the correct path from `src/concepts/Categorizing/CategorizingConcept.ts` would be `../../../tagsEdited2021.csv`.

**Action:** Update the `csvFilePath` in `src/concepts/Categorizing/CategorizingConcept.ts`.

```typescript
// file: src\concepts\Categorizing\CategorizingConcept.ts

// ... (existing imports and types) ...

export default class CategorizingConcept {
  // ... (constructor and other methods) ...

  private getTagsCsvContext(): string {
    // FIX: Correct the relative path to the CSV file
    // Assuming tagsEdited2021.csv is in the project root (same level as deno.json)
    // Current file is at: src/concepts/Categorizing/CategorizingConcept.ts
    // To reach the root: go up 3 levels.
    const csvFilePath = '../../../tagsEdited2021.csv'; // <--- CORRECTED PATH

    return this.readCsvFileAsString(csvFilePath);
  }

  // ... (rest of the class) ...
}
```

### **Step 3: Secondary Check - Gemini API Key**

If correcting the CSV path doesn't resolve the issue, the next most likely problem is with the Gemini LLM call.

**Action:** Ensure your `GEMINI_API_KEY` environment variable is correctly set for your Deno process.

* You should have a `.env` file in the **root of your Deno project** (where `deno.json` is located).
* Inside `.env`, make sure you have a line like:
  ```
  GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY
  ```
* Replace `YOUR_ACTUAL_GEMINI_API_KEY` with a valid API key obtained from Google AI Studio.
* If you're using Deno, ensure your `deno run` command allows environment variables (e.g., `--allow-env`). Your provided command `deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts ...` already includes `--allow-env`, which is good.
* Restart the Deno backend after modifying the `.env` file.

### **Step 4: Restart Backend and Test**

1. **Save** the changes to `src/concepts/Categorizing/CategorizingConcept.ts`.
2. **Restart your Deno backend server.**
   * Stop the currently running Deno process (usually `Ctrl+C`).
   * Start it again: `deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api`
3. **Refresh your Vue.js frontend** (or just retry the fic submission).
4. Submit a new fic and check the details.

One of these steps, especially the CSV path correction or the API key check, should resolve the 500 error. If not, the *exact* error message from your Deno backend console is critical for further diagnosis.
