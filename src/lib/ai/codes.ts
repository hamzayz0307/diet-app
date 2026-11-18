/** Error codes returned by /api/ai/* (shared by server and browser). */
export type AiErrorCode =
  | "unauthorized"
  | "bad_input"
  | "not_configured"
  | "limit"
  | "not_food"
  | "failed";
