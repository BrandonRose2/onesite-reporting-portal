const PACIFIC_TIME_ZONE = "America/Los_Angeles";

export const afterHoursWorkMessage = "It is outside your work hours. Please do not start, save, or authorize report work after 6:00 PM Pacific Time or on weekends.";

function pacificParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}

export function isOutsideWorkHours(now = new Date()) {
  const parts = pacificParts(now);
  const hour = Number(parts.hour ?? "0");
  return parts.weekday === "Sat" || parts.weekday === "Sun" || hour >= 18;
}

export function getAfterHoursWorkMessage(now = new Date()) {
  return isOutsideWorkHours(now) ? afterHoursWorkMessage : null;
}

export function assertWithinWorkHours(now = new Date()) {
  const message = getAfterHoursWorkMessage(now);
  if (message) throw new Error(message);
}
