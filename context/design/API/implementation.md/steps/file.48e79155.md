---
timestamp: 'Mon Oct 20 2025 20:02:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_200215.27d70a9e.md]]'
content_id: 48e79155b00c71636030de879d52b7f394ebcace042e805ba6eee5f82a26d5cc
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}

```
