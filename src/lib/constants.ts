/** AI requests each user may make per day (Istanbul time). */
export const AI_DAILY_LIMIT = 30;

/** Today's date in Istanbul (matches the server's daily AI counter). */
export function istanbulToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
