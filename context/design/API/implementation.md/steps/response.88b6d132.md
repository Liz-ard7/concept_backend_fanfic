---
timestamp: 'Mon Oct 20 2025 21:25:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_212559.e3abf157.md]]'
content_id: 88b6d132a4b587cc232ce258fd0c38527884e9a1c94da68621e240af19a17089
---

# response:

To initialize a Vue.js 3 frontend with TypeScript, Axios for API calls, and local storage for session management, follow these steps.

First, you'd typically start by creating a new Vue project.

**1. Create a new Vue.js project (if you haven't already):**

Open your terminal and run:

```bash
npm create vue@latest
```

Follow the prompts. Make sure to select **"Yes" for TypeScript** and **Pinia** for state management (it simplifies handling local storage and global state). You can also add Vue Router, ESLint, and Prettier if desired.

```
✔ Project name: my-concept-frontend
✔ Add TypeScript? … Yes
✔ Add JSX Support? … No
✔ Add Vue Router for Single Page Application development? … Yes
✔ Add Pinia for state management? … Yes
✔ Add Vitest for Unit Testing? … No
✔ Add an End-to-End Testing Solution? … No
✔ Add ESLint for code quality? … Yes
✔ Add Prettier for code formatting? … Yes

Scaffolding project in /Users/youruser/my-concept-frontend...

Done. Now run:

  cd my-concept-frontend
  npm install
  npm run dev
```

**2. Install Axios:**

Navigate into your project directory and install Axios:

```bash
cd my-concept-frontend
npm install axios
```

**3. Project Structure Overview:**

Your project structure will look something like this. We'll be focusing on `src/api/`, `src/stores/`, `src/views/`, `src/App.vue`, and `src/main.ts`.

```
my-concept-frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── api/
│   │   ├── types.ts          // Custom types for API
│   │   └── index.ts          // Axios client and API calls
│   ├── router/
│   │   └── index.ts          // Vue Router setup
│   ├── stores/
│   │   └── auth.ts           // Pinia store for authentication
│   ├── views/
│   │   └── HomeView.vue      // Main view demonstrating API interaction
│   ├── App.vue               // Main Vue component
│   └── main.ts               // Entry point
├── .env                      // Environment variables (e.g., VITE_API_BASE_URL)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**4. Core Files Implementation:**

Below are the contents for the key files to set up the frontend with the API integration.

### `package.json`

Ensure `axios` and `pinia` are in your dependencies:

```json
{
  "name": "my-concept-frontend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --build --emptyOutDir && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix --ignore-path .gitignore",
    "format": "prettier --write src/"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "pinia": "^2.1.7",
    "vue": "^3.4.21",
    "vue-router": "^4.3.0"
  },
  "devDependencies": {
    "@rushstack/eslint-patch": "^1.3.3",
    "@tsconfig/node20": "^20.1.4",
    "@types/node": "^20.12.5",
    "@vitejs/plugin-vue": "^5.0.4",
    "@vue/eslint-config-prettier": "^9.0.0",
    "@vue/eslint-config-typescript": "^12.0.0",
    "@vue/tsconfig": "^0.5.1",
    "eslint": "^8.49.0",
    "eslint-plugin-vue": "^9.17.0",
    "prettier": "^3.0.3",
    "typescript": "~5.4.0",
    "vite": "^5.2.8",
    "vue-tsc": "^2.0.11"
  }
}
```

### `src/main.ts`

This is your application's entry point.

```typescript
import './assets/main.css' // Basic CSS

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
```

### `src/router/index.ts`

A basic Vue Router setup.

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    // You can add more routes here
  ]
})

export default router
```

### `src/stores/auth.ts` (Pinia Store for Authentication)

This store manages the `userId` (our session token) and persists it in `localStorage`.

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // Try to load userId from local storage on initialization
  const userId = ref<string | null>(localStorage.getItem('userId'))

  function setUserId(id: string | null) {
    userId.value = id
    if (id) {
      localStorage.setItem('userId', id) // Store in local storage
    } else {
      localStorage.removeItem('userId') // Remove from local storage on logout
    }
  }

  const isAuthenticated = computed(() => !!userId.value)

  return { userId, setUserId, isAuthenticated }
})
```

### `src/api/types.ts` (API Types)

Define the types for your API requests and responses based on the generated API spec.

```typescript
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

// --- UserAuthentication Concept Types ---
// No specific types needed beyond ID for user
```

### `src/api/index.ts` (Axios Client and API Calls)

This file will house your Axios instance and functions for each concept's API endpoints.

```typescript
import axios from 'axios';
import type { ID, FicCategoryDoc, DateSpec, Fic, Version } from './types';

// Base URL for your API backend
const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for consistent error handling
async function callApi<T, R>(
  conceptName: string,
  actionName: string,
  data: T,
): Promise<R | { error: string }> {
  try {
    const response = await apiClient.post(`/${conceptName}/${actionName}`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // The backend returns { error: "message" } for expected errors
      return error.response.data as { error: string };
    }
    // For unexpected errors, return a generic error message
    console.error(`API Call Error (${conceptName}/${actionName}):`, error);
    return { error: `An unexpected error occurred: ${String(error)}` };
  }
}

// --- UserAuthentication Concept API ---
export const UserAuthAPI = {
  async register(username: string, password: string): Promise<{ user: ID } | { error: string }> {
    return callApi('UserAuthentication', 'register', { username, password });
  },

  async authenticate(username: string, password: string): Promise<{ user: ID } | { error: string }> {
    return callApi('UserAuthentication', 'authenticate', { username, password });
  },

  async deleteUser(username: string, password: string): Promise<{ user: ID } | { error: string }> {
    return callApi('UserAuthentication', 'deleteUser', { username, password });
  },
};

// --- Library Concept API ---
export const LibraryAPI = {
  async addUser(user: ID): Promise<{} | { error: string }> {
    return callApi('Library', 'addUser', { user });
  },

  async submitNewFic(
    user: ID,
    ficText: string,
    ficName: string,
    authorTags: string,
    date: DateSpec,
  ): Promise<{ ficId: ID } | { error: string }> {
    return callApi('Library', 'submitNewFic', { user, ficText, ficName, authorTags, date });
  },

  async submitNewVersionOfFanfic(
    user: ID,
    ficText: string,
    authorTags: string,
    versionTitle: string,
    date: DateSpec,
    ficName: string,
  ): Promise<{ versionId: ID } | { error: string }> {
    return callApi('Library', 'submitNewVersionOfFanfic', { user, ficText, authorTags, versionTitle, date, ficName });
  },

  async viewFic(
    user: ID,
    ficName: string,
    versionNumber: number,
  ): Promise<{ fic: Fic } | { error: string }> {
    // Query returns an array, but our spec says it returns { fic: Fic }, so we adapt.
    // The API spec for queries returns an array, but the example given in the prompt for _viewFic returns { fic: Fic }.
    // I will assume the API returns [{ fic: Fic }] for a single result query.
    const result = await callApi<{ user: ID, ficName: string, versionNumber: number }, [{ fic: Fic }] | { error: string }>(
      'Library',
      '_viewFic',
      { user, ficName, versionNumber },
    );

    if ('error' in result) {
      return result;
    }
    // Assuming a single item array for single-result queries
    return result[0];
  },

  async deleteFic(
    user: ID,
    ficName: string,
    versionNumber: number,
  ): Promise<{ ficId: ID } | { error: string }> {
    return callApi('Library', 'deleteFic', { user, ficName, versionNumber });
  },

  async deleteFicsAndUser(user: ID): Promise<{} | { error: string }> {
    return callApi('Library', 'deleteFicsAndUser', { user });
  },

  async findFicWithDate(
    user: ID,
    date: DateSpec,
  ): Promise<[{ fics: Fic[] }] | { error: string }> {
    return callApi('Library', '_findFicWithDate', { user, date });
  },

  async getVersion(
    user: ID,
    versionTitle: string,
  ): Promise<[{ version: Version }] | { error: string }> {
    return callApi('Library', '_getVersion', { user, versionTitle });
  },

  async deleteVersion(
    user: ID,
    ficTitle: string,
  ): Promise<{ versionId: ID } | { error: string }> {
    return callApi('Library', 'deleteVersion', { user, ficTitle });
  },

  async getAllUserVersions(
    user: ID,
  ): Promise<[{ versions: Version[] }] | { error: string }> {
    return callApi('Library', '_getAllUserVersions', { user });
  },
};

// --- Categorizing Concept API ---
export const CategorizingAPI = {
  async categorizeFic(
    ficId: ID,
    ficText: string,
    authorTags: string,
  ): Promise<{ ficId: ID } | { error: string }> {
    return callApi('Categorizing', 'categorizeFic', { ficId, ficText, authorTags });
  },

  async viewFicCategory(
    ficId: ID,
  ): Promise<FicCategoryDoc[] | { error: string }> {
    // Query returns an array of objects
    return callApi('Categorizing', '_viewFicCategory', { ficId });
  },

  async deleteFicCategory(ficId: ID): Promise<{ ficCategoryId: ID } | { error: string }> {
    return callApi('Categorizing', 'deleteFicCategory', { ficId });
  },

  async deleteFicCategories(
    ficIds: ID[],
  ): Promise<{ deletedCount: number } | { error: string }> {
    return callApi('Categorizing', 'deleteFicCategories', { ficIds });
  },

  async getAllFicCategories(): Promise<FicCategoryDoc[] | { error: string }> {
    // Query returns an array of objects, and takes no arguments
    return callApi('Categorizing', '_getAllFicCategories', {});
  },
};
```

**Note on Query Responses:**
The API Structure Rules state: "Queries: A successful call to a query (a method name starting with `_`) returns a JSON **array** of objects."
However, some of your query *comments* in the backend code (e.g., `_viewFic` in `LibraryConcept`) imply a single object result (e.g., `returns: { fic: Fic }`). For consistency with the API Structure Rules, I've designed the frontend `callApi` helper to expect an array for queries (`R` in `callApi` could be `T[]`), and then the individual API functions adapt if they expect a single item from that array (e.g., `result[0]`). If a query is truly meant to return a single structured object (not in an array), the backend implementation or the API rules should be adjusted for clarity. I've assumed the array wrapper as per the rule.

### `src/App.vue` (Main Vue Component)

This component will be the entry point for your application's UI, using `vue-router`.

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();

const logout = () => {
  authStore.setUserId(null);
  // Optionally redirect to login or home page
  // router.push('/');
};
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <span v-if="authStore.isAuthenticated">
        | Welcome, User: {{ authStore.userId }} |
        <button @click="logout">Logout</button>
      </span>
      <span v-else>
        | Please log in or register.
      </span>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

nav {
  width: 100%;
  font-size: 1rem;
  text-align: center;
  margin-top: 2rem;
  padding: 1rem 0;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

button {
  padding: 0.5rem 1rem;
  margin-left: 1rem;
  cursor: pointer;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
}
button:hover {
  background-color: #c82333;
}
</style>
```

### `src/views/HomeView.vue` (Example Usage)

This component demonstrates how to use the authentication store and make API calls.

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { UserAuthAPI, LibraryAPI } from '../api';
import type { ID, Fic, Version } from '../api/types';

const authStore = useAuthStore();

// --- Auth Forms ---
const registerUsername = ref('');
const registerPassword = ref('');
const registerError = ref<string | null>(null);

const loginUsername = ref('');
const loginPassword = ref('');
const loginError = ref<string | null>(null);

const handleRegister = async () => {
  registerError.value = null;
  const result = await UserAuthAPI.register(registerUsername.value, registerPassword.value);
  if ('error' in result) {
    registerError.value = result.error;
  } else {
    alert(`User registered! ID: ${result.user}`);
    registerUsername.value = '';
    registerPassword.value = '';
    // Optionally log in the user immediately
    // authStore.setUserId(result.user);
  }
};

const handleLogin = async () => {
  loginError.value = null;
  const result = await UserAuthAPI.authenticate(loginUsername.value, loginPassword.value);
  if ('error' in result) {
    loginError.value = result.error;
  } else {
    authStore.setUserId(result.user);
    alert(`Logged in as User ID: ${result.user}`);
    loginUsername.value = '';
    loginPassword.value = '';
    // After login, ensure the user exists in Library concept
    await LibraryAPI.addUser(result.user); // Add user to Library concept
    fetchUserVersions(); // Fetch their fics
  }
};

// --- Library Interaction (only if authenticated) ---
const ficName = ref('');
const ficText = ref('');
const authorTags = ref(''); // Assuming comma-separated for input, but API wants newline-separated
const ficDateDay = ref(1);
const ficDateMonth = ref(1);
const ficDateYear = ref(2023);
const ficSubmitError = ref<string | null>(null);
const userVersions = ref<Version[]>([]);
const selectedVersionTitle = ref<string | null>(null);
const selectedFic = ref<Fic | null>(null);

const fetchUserVersions = async () => {
  userVersions.value = [];
  if (!authStore.userId) return;

  const result = await LibraryAPI.getAllUserVersions(authStore.userId);
  if ('error' in result) {
    console.error('Error fetching versions:', result.error);
    alert('Error fetching versions: ' + result.error);
  } else {
    userVersions.value = result[0]?.versions || [];
  }
};

const handleSubmitFic = async () => {
  ficSubmitError.value = null;
  if (!authStore.userId) {
    ficSubmitError.value = 'Please log in to submit a fic.';
    return;
  }

  const date = {
    day: ficDateDay.value,
    month: ficDateMonth.value,
    year: ficDateYear.value,
  };

  const result = await LibraryAPI.submitNewFic(
    authStore.userId,
    ficText.value,
    ficName.value,
    authorTags.value.split(',').map(tag => tag.trim()).join('\n'), // Convert to newline separated
    date,
  );

  if ('error' in result) {
    ficSubmitError.value = result.error;
  } else {
    alert(`Fic submitted! Fic ID: ${result.ficId}`);
    ficName.value = '';
    ficText.value = '';
    authorTags.value = '';
    fetchUserVersions(); // Refresh the list of fics
  }
};

const viewFicDetails = async (ficId: ID, ficTitle: string, versionNumber: number) => {
  selectedFic.value = null;
  if (!authStore.userId) return;

  const result = await LibraryAPI.viewFic(authStore.userId, ficTitle, versionNumber);
  if ('error' in result) {
    console.error('Error viewing fic:', result.error);
    alert('Error viewing fic: ' + result.error);
  } else {
    selectedFic.value = result.fic;
  }
};


// Watch for changes in authentication status to fetch user's fics
watch(() => authStore.isAuthenticated, (newVal) => {
  if (newVal) {
    fetchUserVersions();
  } else {
    userVersions.value = [];
    selectedVersionTitle.value = null;
    selectedFic.value = null;
  }
}, { immediate: true });
</script>

<template>
  <main>
    <h1>Welcome to the Concept App</h1>

    <div v-if="!authStore.isAuthenticated" class="auth-section">
      <section class="auth-form">
        <h2>Register</h2>
        <form @submit.prevent="handleRegister">
          <label for="reg-username">Username:</label>
          <input id="reg-username" v-model="registerUsername" type="text" required />
          <label for="reg-password">Password:</label>
          <input id="reg-password" v-model="registerPassword" type="password" required />
          <button type="submit">Register</button>
        </form>
        <p v-if="registerError" class="error">{{ registerError }}</p>
      </section>

      <section class="auth-form">
        <h2>Login</h2>
        <form @submit.prevent="handleLogin">
          <label for="login-username">Username:</label>
          <input id="login-username" v-model="loginUsername" type="text" required />
          <label for="login-password">Password:</label>
          <input id="login-password" v-model="loginPassword" type="password" required />
          <button type="submit">Login</button>
        </form>
        <p v-if="loginError" class="error">{{ loginError }}</p>
      </section>
    </div>

    <div v-else class="authenticated-section">
      <section class="fic-submission">
        <h2>Submit New Fic</h2>
        <form @submit.prevent="handleSubmitFic">
          <label for="fic-name">Fic Title:</label>
          <input id="fic-name" v-model="ficName" type="text" required />

          <label for="fic-text">Fic Content:</label>
          <textarea id="fic-text" v-model="ficText" rows="10" required></textarea>

          <label for="author-tags">Author Tags (comma-separated):</label>
          <input id="author-tags" v-model="authorTags" type="text" placeholder="fantasy, romance, magic" />

          <fieldset>
            <legend>Publication Date:</legend>
            <label for="date-day">Day:</label>
            <input id="date-day" v-model.number="ficDateDay" type="number" min="1" max="31" required />
            <label for="date-month">Month:</label>
            <input id="date-month" v-model.number="ficDateMonth" type="number" min="1" max="12" required />
            <label for="date-year">Year:</label>
            <input id="date-year" v-model.number="ficDateYear" type="number" min="1900" max="2100" required />
          </fieldset>

          <button type="submit">Submit Fic</button>
        </form>
        <p v-if="ficSubmitError" class="error">{{ ficSubmitError }}</p>
      </section>

      <section class="user-library">
        <h2>Your Fics</h2>
        <p v-if="userVersions.length === 0">No fics submitted yet.</p>
        <ul v-else>
          <li v-for="version in userVersions" :key="version._id">
            <h3>{{ version.title }}</h3>
            <p>Versions: ({{ version.fics.length }})</p>
            <ul>
              <li v-for="fic in version.fics" :key="fic._id">
                Version #{{ fic.versionNumber }} ({{ fic.date.day }}/{{ fic.date.month }}/{{ fic.date.year }})
                <button @click="viewFicDetails(fic._id, version.title, fic.versionNumber)">View Details</button>
              </li>
            </ul>
          </li>
        </ul>

        <div v-if="selectedFic" class="fic-details">
          <h3>Details for {{ selectedFic.name }} (Version #{{ selectedFic.versionNumber }})</h3>
          <p><strong>Fic ID:</strong> {{ selectedFic._id }}</p>
          <p><strong>Author Tags:</strong> {{ selectedFic.authorTags.split('\n').join(', ') }}</p>
          <h4>Content:</h4>
          <p class="fic-content">{{ selectedFic.text }}</p>
          <button @click="selectedFic = null">Close Details</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

h1, h2 {
  text-align: center;
  color: #333;
  margin-bottom: 1.5rem;
}

.auth-section {
  display: flex;
  justify-content: space-around;
  gap: 2rem;
  margin-bottom: 2rem;
}

.auth-form, .fic-submission, .user-library, .fic-details {
  flex: 1;
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 6px;
  background-color: #f9f9f9;
}

.auth-form {
  max-width: 400px;
  margin: 0 auto;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

label {
  font-weight: bold;
  margin-top: 0.5rem;
}

input[type="text"],
input[type="password"],
textarea {
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

textarea {
  resize: vertical;
}

fieldset {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 1rem;
}

legend {
  font-weight: bold;
  padding: 0 0.5rem;
  color: #555;
}

fieldset input {
  width: auto;
  margin-right: 0.5rem;
}

button[type="submit"] {
  padding: 0.8rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

button[type="submit"]:hover {
  background-color: #0056b3;
}

.error {
  color: #dc3545;
  margin-top: 1rem;
  text-align: center;
}

.authenticated-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.user-library ul {
  list-style-type: none;
  padding: 0;
}

.user-library li {
  background-color: #fff;
  border: 1px solid #ddd;
  padding: 1rem;
  margin-bottom: 0.8rem;
  border-radius: 5px;
}

.user-library li h3 {
  margin-top: 0;
  color: #007bff;
}

.user-library li ul {
  margin-top: 0.5rem;
  padding-left: 1.5rem;
  list-style-type: disc;
}
.user-library li ul li {
  background-color: #f0f8ff;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border: 1px dashed #a8d6ff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.fic-details {
  grid-column: span 2; /* Spans across both columns */
  background-color: #e9f7ef;
  border-color: #28a745;
  margin-top: 2rem;
}
.fic-details h3 {
  color: #28a745;
}
.fic-content {
  white-space: pre-wrap; /* Preserves whitespace and line breaks */
  background-color: #ffffff;
  padding: 1rem;
  border: 1px dashed #b8e0c9;
  border-radius: 4px;
}
</style>
```

***

### **To Run the Frontend:**

1. Make sure your Deno backend server is running on `http://localhost:8000`. The prompt indicates: `deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api`.
2. In your `my-concept-frontend` directory, install dependencies:
   ```bash
   npm install
   ```
3. Start the Vue development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the address indicated by `npm run dev` (usually `http://localhost:5173`).

You should now have a basic Vue.js frontend that can register users, log them in (storing the user ID in local storage), and then allow logged-in users to submit new "fics" to their library.

***

Here is concept\_server.ts-- as provided by my teachers.
[@Concept\_Server](../../src/concept_server.ts)

This is what happened when I filled out the boxes and clicked register!
Access to XMLHttpRequest at 'http://localhost:8000/api/UserAuthentication/register' from origin 'http://localhost:5173' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.

API Call Error (UserAuthentication/register):
AxiosError {message: 'Network Error', name: 'AxiosError', code: 'ERR\_NETWORK', config: {…}, request: XMLHttpRequest, …}
code
:
"ERR\_NETWORK"
config
:
{transitional: {…}, adapter: Array(3), transformRequest: Array(1), transformResponse: Array(1), timeout: 0, …}
event
:
ProgressEvent {isTrusted: true, lengthComputable: false, loaded: 0, total: 0, type: 'error', …}
message
:
"Network Error"
name
:
"AxiosError"
request
:
XMLHttpRequest {onreadystatechange: null, readyState: 4, timeout: 0, withCredentials: false, upload: XMLHttpRequestUpload, …}
stack
:
"AxiosError: Network Error\n    at XMLHttpRequest.handleError (http://localhost:5173/node\_modules/.vite/deps/axios.js?v=1eeb8bd4:1624:19)\n    at Axios.request (http://localhost:5173/node\_modules/.vite/deps/axios.js?v=1eeb8bd4:2201:41)\n    at async callApi (http://localhost:5173/@fs/C:/Users/elat9/OneDrive/Desktop/MIT/6.1040/concept\_frontend\_fanfic/my-concept-frontend/src/api/index.ts:11:22)\n    at async handleRegister (http://localhost:5173/@fs/C:/Users/elat9/OneDrive/Desktop/MIT/6.1040/concept\_frontend\_fanfic/my-concept-frontend/src/views/HomeView.vue:31:22)"
\[\[Prototype]]
:
Error
callApi	@	index.ts:29
await in callApi
register	@	index.ts:37
handleRegister	@	HomeView.vue:20

index.ts:21
POST http://localhost:8000/api/UserAuthentication/register net::ERR\_FAILED
callApi	@	index.ts:21
register	@	index.ts:37
handleRegister	@	HomeView.vue:20
