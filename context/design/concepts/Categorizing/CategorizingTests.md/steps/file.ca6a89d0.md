---
timestamp: 'Mon Oct 13 2025 14:21:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251013_142146.48a0ca0a.md]]'
content_id: ca6a89d09a68d85c4f6ed44123feacfef50d1e0a984ebd15828c539565ca989a
---

# file: gemini-llm.ts

```typescript
/**
 * LLM Integration for DayPlanner
 *
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai";

/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
}

export class GeminiLLM {
    private apiKey: string;

    constructor(config: Config) {
        this.apiKey = config.apiKey;
    }

    async executeLLM (prompt: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                generationConfig: {
                    maxOutputTokens: 1000,
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text;
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }    }
}

```

Do not define new concepts, all you should be doing is implementing Categorizing.
