[@testing-concepts](../../background/testing-concepts.md)

[@UserAuthenticationImplementation](implementation.md)

[@Testing-concepts-rubric](../../background/Testing-concepts-rubric.md)

# test: UserAuthentication

# response:

```typescript
// file: src/UserAuthentication/UserAuthenticationConcept.test.ts
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication Concept Testing", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // Helper to assert for successful user return
  const assertSuccess = (
    result: { user: ID } | { error: string },
    expectedUsername: string,
  ): ID => {
    if ("error" in result) {
      throw new Error(
        `Expected success for ${expectedUsername}, but got error: ${result.error}`,
      );
    }
    return result.user;
  };

  // Helper to assert for error return
  const assertError = (
    result: { user: ID } | { error: string },
    expectedError: string,
  ) => {
    if (!("error" in result)) {
      throw new Error(
        `Expected error "${expectedError}", but got success with user: ${result.user}`,
      );
    }
    assertEquals(result.error, expectedError);
  };

  await t.step("trace: Operational Principle", async () => {
    console.log(
      "\n--- Operational Principle: Register and Authenticate ---",
    );
    // principle: after a user registers with a username and a password,
    // they can authenticate with that same username and password
    // and be treated each time as the same user

    const username = "alice";
    const password = "password123";

    // Action: register
    const registerResult = await concept.register({ username, password });
    console.log(`Registering "${username}":`, registerResult);
    const userAlice = assertSuccess(registerResult, username);

    // Action: authenticate (first time)
    const authResult1 = await concept.authenticate({ username, password });
    console.log(`Authenticating "${username}" (1st time):`, authResult1);
    assertEquals(assertSuccess(authResult1, username), userAlice); // Should return the same user ID

    // Action: authenticate (second time)
    const authResult2 = await concept.authenticate({ username, password });
    console.log(`Authenticating "${username}" (2nd time):`, authResult2);
    assertEquals(assertSuccess(authResult2, username), userAlice); // Should return the same user ID

    console.log("Operational Principle trace completed successfully.");
  });

  await t.step("Interesting Scenario 1: Register with existing username", async () => {
    console.log("\n--- Scenario 1: Register with existing username ---");
    const username = "bob";
    const password = "bobpass";
    const duplicatePassword = "newbobpass";
    const expectedError = "Username already exists.";

    // Action: Register Bob for the first time (successful)
    const registerResult1 = await concept.register({ username, password });
    console.log(`Registering "${username}" (1st time):`, registerResult1);
    assertSuccess(registerResult1, username);

    // Action: Attempt to register Bob again with a different password (should fail)
    const registerResult2 = await concept.register({
      username,
      password: duplicatePassword,
    });
    console.log(`Registering "${username}" (2nd time):`, registerResult2);
    assertError(registerResult2, expectedError);

    // Verify Bob can still authenticate with his original password
    const authResult = await concept.authenticate({ username, password });
    console.log(`Authenticating "${username}" with original pass:`, authResult);
    assertSuccess(authResult, username);
  });

  await t.step("Interesting Scenario 2: Authentication failure cases", async () => {
    console.log("\n--- Scenario 2: Authentication failure cases ---");
    const username = "charlie";
    const password = "charliepass";
    const wrongPassword = "wrongcharliepass";
    const nonExistentUsername = "nonexistent";
    const expectedError = "Invalid username or password.";

    // Action: Register Charlie
    const registerResult = await concept.register({ username, password });
    console.log(`Registering "${username}":`, registerResult);
    assertSuccess(registerResult, username);

    // Action: Attempt to authenticate with wrong password (should fail)
    const authResult1 = await concept.authenticate({
      username,
      password: wrongPassword,
    });
    console.log(
      `Authenticating "${username}" with wrong password:`,
      authResult1,
    );
    assertError(authResult1, expectedError);

    // Action: Attempt to authenticate with a non-existent username (should fail)
    const authResult2 = await concept.authenticate({
      username: nonExistentUsername,
      password,
    });
    console.log(
      `Authenticating "${nonExistentUsername}" with correct password (for Charlie):`,
      authResult2,
    );
    assertError(authResult2, expectedError);

    // Verify Charlie can still authenticate with correct credentials
    const authResult3 = await concept.authenticate({ username, password });
    console.log(`Authenticating "${username}" with correct password:`, authResult3);
    assertSuccess(authResult3, username);
  });

  await t.step("Interesting Scenario 3: Delete user successfully", async () => {
    console.log("\n--- Scenario 3: Delete user successfully ---");
    const username = "diana";
    const password = "dianapass";
    const expectedAuthError = "Invalid username or password.";

    // Action: Register Diana
    const registerResult = await concept.register({ username, password });
    console.log(`Registering "${username}":`, registerResult);
    const userDiana = assertSuccess(registerResult, username);

    // Action: Authenticate Diana to confirm existence
    const authResult1 = await concept.authenticate({ username, password });
    console.log(`Authenticating "${username}" before deletion:`, authResult1);
    assertEquals(assertSuccess(authResult1, username), userDiana);

    // Action: Delete Diana with correct credentials
    const deleteResult = await concept.deleteUser({ username, password });
    console.log(`Deleting "${username}":`, deleteResult);
    assertEquals(assertSuccess(deleteResult, username), userDiana); // Should return the ID of the deleted user

    // Action: Attempt to authenticate Diana after deletion (should fail)
    const authResult2 = await concept.authenticate({ username, password });
    console.log(`Authenticating "${username}" after deletion:`, authResult2);
    assertError(authResult2, expectedAuthError);

    // Action: Attempt to delete Diana again (should fail as user no longer exists)
    const deleteResult2 = await concept.deleteUser({ username, password });
    console.log(`Deleting "${username}" again:`, deleteResult2);
    assertError(deleteResult2, expectedAuthError);
  });

  await t.step("Interesting Scenario 4: Delete user with incorrect credentials", async () => {
    console.log(
      "\n--- Scenario 4: Delete user with incorrect credentials ---",
    );
    const username = "eve";
    const password = "evepass";
    const wrongPassword = "wrongpass";
    const expectedError = "Invalid username or password.";

    // Action: Register Eve
    const registerResult = await concept.register({ username, password });
    console.log(`Registering "${username}":`, registerResult);
    const userEve = assertSuccess(registerResult, username);

    // Action: Attempt to delete Eve with wrong password (should fail)
    const deleteResult = await concept.deleteUser({
      username,
      password: wrongPassword,
    });
    console.log(
      `Attempting to delete "${username}" with wrong password:`,
      deleteResult,
    );
    assertError(deleteResult, expectedError);

    // Verify Eve can still authenticate with correct credentials (user was not deleted)
    const authResult = await concept.authenticate({ username, password });
    console.log(`Authenticating "${username}" with correct password:`, authResult);
    assertEquals(assertSuccess(authResult, username), userEve);
  });

  await client.close();
});
```
