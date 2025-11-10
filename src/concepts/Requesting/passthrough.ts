/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  "/api/UserAuthentication/register": "anyone should be able to register",
  "/api/UserAuthentication/authenticate": "anyone should be able to authenticate",
  "/api/UserAuthentication/_userExists": "you need to be able to check if a user exists before creating an account",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  "/api/UserAuthentication/deleteUser",
  "/api/Library/addUser",
  "/api/Library/submitNewFic",
  "/api/Library/submitNewVersionOfFanfic",
  "/api/Library/_viewFic",
  "/api/Library/deleteFic",
  "/api/Library/deleteFicsAndUser",
  "/api/Library/_getVersion",
  "/api/Library/deleteVersion",
  "/api/Categorizing/categorizeFic",
  "/api/Categorizing/_viewFicCategory",
  "/api/Categorizing/deleteFicCategory",
  "/api/Categorizing/deleteFicCategories",
  "/api/Categorizing/_getAllFicCategories",
  "/api/Library/_getAllUserVersions",
  "/api/Categorizing/getTagsCsvContext",
  "/api/Categorizing/readCsvFileAsString"
];
