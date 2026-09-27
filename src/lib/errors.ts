/**
 * Domain errors — the only error vocabulary that leaves the service layer.
 *
 * Rules enforced here:
 *  - a domain error carries a `status` the HTTP layer can use verbatim;
 *  - `toPublicMessage` is what may reach a browser: never a raw driver message,
 *    never a connection string, never a stack. `AppError.safe` is the single
 *    source of those user-facing strings;
 *  - `DatabaseError` deliberately swallows the original cause behind a flag, so
 *    a `console.error` of the object cannot leak a DSN.
 */

export type DomainErrorCode =
  | "invalid_input"
  | "not_found"
  | "forbidden"
  | "conflict"
  | "unavailable";

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  invalid_input: 400,
  not_found: 404,
  forbidden: 403,
  conflict: 409,
  unavailable: 503,
};

const SAFE_MESSAGE_BY_CODE: Record<DomainErrorCode, string> = {
  invalid_input: "Some of the submitted values are not valid.",
  not_found: "That item could not be found.",
  forbidden: "You are not allowed to do that.",
  conflict: "That action conflicts with the current state.",
  unavailable: "The service is temporarily unavailable. Please try again.",
};

export class AppError extends Error {
  readonly code: DomainErrorCode;
  readonly status: number;
  /** Optional field-level detail, safe to show (e.g. per-field messages). */
  readonly fields: Record<string, string>;

  constructor(
    code: DomainErrorCode,
    options: { message?: string; fields?: Record<string, string>; cause?: unknown } = {},
  ) {
    super(options.message ?? SAFE_MESSAGE_BY_CODE[code]);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = options.fields ?? {};
    // Intentionally not assigned as `cause` when it could contain a DSN; the
    // original error is only ever logged server-side by the caller.
    void options.cause;
  }

  /** The only string from this error that is safe to render to a user. */
  get safe(): string {
    return SAFE_MESSAGE_BY_CODE[this.code];
  }

  static invalid(fields: Record<string, string>, message?: string): AppError {
    return new AppError("invalid_input", { fields, ...(message ? { message } : {}) });
  }

  static notFound(message?: string): AppError {
    return new AppError("not_found", message ? { message } : {});
  }

  static forbidden(message?: string): AppError {
    return new AppError("forbidden", message ? { message } : {});
  }

  static conflict(message?: string): AppError {
    return new AppError("conflict", message ? { message } : {});
  }

  /**
   * Wraps a driver failure. The original error is intentionally NOT retained on
   * the instance: PostgreSQL errors can contain the relation, the failing value,
   * or (in a DSN parse failure) the connection string.
   */
  static database(message = "Database error"): AppError {
    return new AppError("unavailable", { message });
  }
}

/** HTTP body for any thrown error. Never includes internals. */
export function toPublicError(error: unknown): {
  status: number;
  body: { error: { code: DomainErrorCode; message: string; fields?: Record<string, string> } };
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.safe,
          ...(Object.keys(error.fields).length > 0 ? { fields: error.fields } : {}),
        },
      },
    };
  }
  return { status: 500, body: { error: { code: "unavailable", message: SAFE_MESSAGE_BY_CODE.unavailable } } };
}
