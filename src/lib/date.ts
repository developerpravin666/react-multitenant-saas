/**
 * Global Date Formatting and Parsing Utility
 *
 * Single Source of Truth for Date Formatting throughout the application.
 * Display Format: DD-MM-YYYY (e.g., 15-10-2026)
 * Database / API / Native Input Format: YYYY-MM-DD (ISO DateOnly)
 */

export const APP_DATE_FORMAT = "DD-MM-YYYY";

/**
 * Formats any date value (ISO string "YYYY-MM-DD", Date object, or timestamp)
 * into standard display format "DD-MM-YYYY".
 *
 * Direct string parsing is used for "YYYY-MM-DD" to avoid timezone-shift
 * bugs inherent to `new Date("YYYY-MM-DD")` in browser environments.
 */
export function formatDate(
  value?: string | Date | number | null,
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  // If already a Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return fallback;
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // If numeric timestamp
  if (typeof value === "number") {
    const d = new Date(value);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    // Already in DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // Standard date string starting with YYYY-MM-DD
    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch && isoDateMatch[1] && isoDateMatch[2] && isoDateMatch[3]) {
      const year = isoDateMatch[1];
      const month = isoDateMatch[2];
      const day = isoDateMatch[3];
      return `${day}-${month}-${year}`;
    }

    // Slash format DD/MM/YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch && slashMatch[1] && slashMatch[2] && slashMatch[3]) {
      const day = slashMatch[1];
      const month = slashMatch[2];
      const year = slashMatch[3];
      return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
    }

    // Fallback: try parsing with Date
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, "0");
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const year = parsed.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  return fallback;
}

/**
 * Formats a date with time into "DD-MM-YYYY hh:mm A"
 */
export function formatDateTime(
  value?: string | Date | number | null,
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return fallback;

  const datePart = formatDate(date, fallback);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hourStr = String(hours).padStart(2, "0");

  return `${datePart} ${hourStr}:${minutes} ${ampm}`;
}

/**
 * Converts a date into "YYYY-MM-DD" for API requests and Database persistence.
 * Guarantees that saving data to the backend database is never impacted.
 */
export function formatDateForApi(value?: string | Date | null): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    // Already in YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // If in DD-MM-YYYY format, convert to YYYY-MM-DD
    const ddmmyyyyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyyMatch && ddmmyyyyMatch[1] && ddmmyyyyMatch[2] && ddmmyyyyMatch[3]) {
      const day = ddmmyyyyMatch[1];
      const month = ddmmyyyyMatch[2];
      const year = ddmmyyyyMatch[3];
      return `${year}-${month}-${day}`;
    }
    // If in ISO timestamp format, extract YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return isoMatch[0];
    }
  }

  return "";
}

/**
 * Returns today's date formatted as "YYYY-MM-DD"
 * (Required for HTML `<input type="date">` values)
 */
export function todayForInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns today's date formatted as "DD-MM-YYYY" for display
 */
export function todayDisplay(): string {
  return formatDate(new Date());
}

/**
 * Check if a string looks like an ISO date or DateOnly string
 */
export function isIsoDateString(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(value.trim());
}
