import { getEnv } from "@/lib/env";

export type LogLevel = "debug" | "info" | "warn" | "error";

const order: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function level(): LogLevel {
  try {
    return getEnv().LOG_LEVEL;
  } catch {
    return "info";
  }
}

/** Minimal structured logger — JSON lines to stdout/stderr, no secrets. */
export function log(
  levelName: LogLevel,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  if (order[levelName] < order[level()]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: levelName,
    msg: message,
    ...fields,
  });
  if (levelName === "error" || levelName === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => log("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => log("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => log("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => log("error", msg, fields),
};
