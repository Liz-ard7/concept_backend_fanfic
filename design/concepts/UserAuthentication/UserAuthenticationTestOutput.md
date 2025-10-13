running 1 test from ./concepts/UserAuthentication/UserAuthenticationConcept.test.ts
UserAuthentication Concept Testing ...
  trace: Operational Principle ...
------- post-test output -------

--- Operational Principle: Register and Authenticate ---
Registering "alice": { user: "0199db6f-547e-7a70-9aa3-a56f3a00b396" }
Authenticating "alice" (1st time): { user: "0199db6f-547e-7a70-9aa3-a56f3a00b396" }
Authenticating "alice" (2nd time): { user: "0199db6f-547e-7a70-9aa3-a56f3a00b396" }
Operational Principle trace completed successfully.
----- post-test output end -----
  trace: Operational Principle ... ok (94ms)
  Interesting Scenario 1: Register with existing username ...
------- post-test output -------

--- Scenario 1: Register with existing username ---
Registering "bob" (1st time): { user: "0199db6f-54de-7f0e-b894-e53bb611f7bb" }
Registering "bob" (2nd time): { error: "Username already exists." }
Authenticating "bob" with original pass: { user: "0199db6f-54de-7f0e-b894-e53bb611f7bb" }
----- post-test output end -----
  Interesting Scenario 1: Register with existing username ... ok (74ms)
  Interesting Scenario 2: Authentication failure cases ...
------- post-test output -------

--- Scenario 2: Authentication failure cases ---
Registering "charlie": { user: "0199db6f-5526-797e-a87f-b1f29550656a" }
Authenticating "charlie" with wrong password: { error: "Invalid username or password." }
Authenticating "nonexistent" with correct password (for Charlie): { error: "Invalid username or password." }
Authenticating "charlie" with correct password: { user: "0199db6f-5526-797e-a87f-b1f29550656a" }
----- post-test output end -----
  Interesting Scenario 2: Authentication failure cases ... ok (91ms)
  Interesting Scenario 3: Delete user successfully ...
------- post-test output -------

--- Scenario 3: Delete user successfully ---
Registering "diana": { user: "0199db6f-5581-7fc3-9634-48d680b1ca67" }
Authenticating "diana" before deletion: { user: "0199db6f-5581-7fc3-9634-48d680b1ca67" }
Deleting "diana": { user: "0199db6f-5581-7fc3-9634-48d680b1ca67" }
Authenticating "diana" after deletion: { error: "Invalid username or password." }
Deleting "diana" again: { error: "Invalid username or password." }
----- post-test output end -----
  Interesting Scenario 3: Delete user successfully ... ok (132ms)
  Interesting Scenario 4: Delete user with incorrect credentials ...
------- post-test output -------

--- Scenario 4: Delete user with incorrect credentials ---
Registering "eve": { user: "0199db6f-5606-7cbf-b918-0568364dff79" }
Attempting to delete "eve" with wrong password: { error: "Invalid username or password." }
Authenticating "eve" with correct password: { user: "0199db6f-5606-7cbf-b918-0568364dff79" }
----- post-test output end -----
  Interesting Scenario 4: Delete user with incorrect credentials ... ok (67ms)
UserAuthentication Concept Testing ... ok (1s)

ok | 11 passed (5 steps) | 0 failed (10s)
