import { z } from "zod";
import { AppError } from "@/lib/errors";

/**
 * M4 request validation — the single boundary where untrusted input becomes
 * typed domain input.
 *
 * Conventions:
 *  - every schema is bounded (length / range / enum) so no single field can be
 *    used as a denial-of-service lever;
 *  - query-string schemas coerce because URLs are strings: every one of them is
 *    given an explicit default, because `Number(undefined)` is `NaN`, not 1;
 *  - `role` is deliberately absent from every writable schema (inherited
 *    AUD-002: a user must not be able to promote themselves);
 *  - nothing here touches the database, so this file is unit-testable without
 *    infrastructure.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 25 MiB. Explicit rather than unbounded. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 12;

/**
 * extension -> accepted MIME types. Keyed by extension, because the file's
 * declared type is a browser hint; the name is what the server can reason about
 * before a real content sniff exists. A mismatch is rejected, never "corrected".
 */
export const ALLOWED_UPLOAD_TYPES: Readonly<Record<string, readonly string[]>> = {
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain"],
  csv: ["text/csv", "application/csv", "text/plain"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  zip: ["application/zip"],
};

export function fileExtension(name: string): string {
  return name.toLowerCase().split(".").pop() ?? "";
}

/**
 * Strips any directory component and rejects traversal. Callers pass a
 * client-supplied display name, never a client-supplied path.
 */
export function safeDisplayName(input: string): string {
  const withoutPath = input.split(/[\\/]/).pop() ?? "";
  return (
    withoutPath
      // Strip C0 control characters and DEL from a client-supplied file name.
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[^A-Za-z0-9._()\- ]/g, "_")
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 180)
  );
}

/**
 * Opaque storage keys are generated server-side (`resources/<owner>/<uuid>.<ext>`),
 * so a `.` must be allowed — an earlier revision forbade it, which rejected every
 * key that carried a file extension. Safety is preserved by an *allow-list* of
 * characters plus an explicit rejection of `.`/`..` path segments and a trailing
 * `/`, so a key can never traverse out of its prefix.
 */
export const storageKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/,
    "storage key may only contain letters, digits, ., _, / and -",
  )
  .refine((key) => !key.endsWith("/"), "storage key must not end with /")
  .refine(
    (key) => !key.split("/").some((segment) => segment === "." || segment === ".."),
    "storage key must not contain . or .. path segments",
  );

export const resourceIdSchema = z
  .string()
  .trim()
  .regex(UUID_RE, "must be a UUID")
  .refine((v) => v === v.toLowerCase(), "must be a lowercase UUID");

export const visibilitySchema = z.enum(["public", "private"]);

export const fileMetadataSchema = z
  .object({
    key: storageKeySchema,
    name: z.string().trim().min(1).max(180),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_UPLOAD_BYTES, "file is larger than the 25 MB limit"),
    mimeType: z.string().trim().max(120),
  })
  .superRefine((file, ctx) => {
    const ext = fileExtension(file.name);
    const allowed = ALLOWED_UPLOAD_TYPES[ext];
    if (!allowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: `file type .${ext} is not accepted`,
      });
      return;
    }
    if (!allowed.includes(file.mimeType.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mimeType"],
        message: `declared type ${file.mimeType} does not match .${ext}`,
      });
    }
  });

const optionalUuid = z
  .string()
  .trim()
  .regex(UUID_RE, "must be a UUID")
  .optional()
  .or(z.literal("").transform(() => undefined));

/** Coerced integer with a default: URLs are strings, and `Number("")` is 0. */
const intFromQuery = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (raw) => (raw === undefined || raw === null || raw === "" ? fallback : raw),
    z.coerce.number().int().min(min).max(max),
  );

/** Trimmed query text; "" and whitespace-only collapse to undefined. */
const optionalQueryText = (max: number) =>
  z.preprocess((raw) => {
    if (raw === undefined || raw === null) return undefined;
    const text = String(raw).trim();
    return text === "" ? undefined : text.slice(0, max);
  }, z.string().max(max).optional());

/** Text that a form can also *clear*: `""` and `null` both mean "no value". */
const clearableText = (max: number, min = 0) =>
  z
    .union([z.string().trim().min(min).max(max), z.null()])
    .transform((value) => (typeof value === "string" && value === "" ? null : value))
    .optional();

/** UUID that a form can also *clear*: `""` and `null` both mean "unset". */
const clearableUuid = z
  .union([z.string().trim().regex(UUID_RE, "must be a UUID"), z.literal(""), z.null()])
  .transform((value) => (value === "" || value === null ? null : value))
  .optional();

export const RESOURCE_TYPES = [
  "lecture_notes",
  "study_notes",
  "past_paper",
  "summary",
  "lab_material",
  "assignment",
  "reference",
  "other",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const resourceTypeSchema = z.enum(RESOURCE_TYPES);

export const resourceCreateSchema = z.object({
  title: z.string().trim().min(3, "title needs at least 3 characters").max(160),
  description: clearableText(4000),
  subjectId: clearableUuid,
  resourceType: resourceTypeSchema.default("other"),
  visibility: visibilitySchema.default("public"),
  file: fileMetadataSchema.optional(),
});

/**
 * Update is its own schema rather than `create.partial()`: only a field that is
 * actually present is written, and `null`/`""` explicitly clears an optional
 * column. A single-field edit therefore cannot silently blank the other columns.
 */
export const resourceUpdateSchema = z
  .object({
    title: z.string().trim().min(3, "title needs at least 3 characters").max(160).optional(),
    description: clearableText(4000),
    subjectId: clearableUuid,
    resourceType: resourceTypeSchema.optional(),
    visibility: visibilitySchema.optional(),
    file: fileMetadataSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "provide at least one field to update",
  });

export const searchParamsSchema = z.object({
  q: optionalQueryText(120),
  subjectId: optionalUuid,
  institutionId: optionalUuid,
  ownerId: optionalUuid,
  resourceType: resourceTypeSchema.optional(),
  sort: z.enum(["newest", "oldest", "title"]).default("newest"),
  page: intFromQuery(1, 1, 1000),
  pageSize: intFromQuery(DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
});

export const REPORT_CATEGORIES = [
  "copyright",
  "academic_integrity",
  "spam",
  "incorrect_content",
  "other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const reportCategorySchema = z.enum(REPORT_CATEGORIES);

export const reportCreateSchema = z.object({
  category: reportCategorySchema,
  details: z
    .string()
    .trim()
    .max(2000, "details may not exceed 2000 characters")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

/* ------------------------------------------------------------------ *
 * M9 Moderation & Governance Schemas
 * ------------------------------------------------------------------ */

export const MODERATION_ACTIONS = ["dismiss", "hide", "restore", "delete"] as const;
export type ModerationActionType = (typeof MODERATION_ACTIONS)[number];
export const moderationActionSchema = z.enum(MODERATION_ACTIONS);

export const moderationDecisionSchema = z.object({
  action: moderationActionSchema,
  reason: z
    .string()
    .trim()
    .min(2, "reason must be at least 2 characters")
    .max(1000, "reason may not exceed 1000 characters"),
});
export type ModerationDecisionInput = z.infer<typeof moderationDecisionSchema>;

/* ------------------------------------------------------------------ *
 * M6 Taxonomy Administration Schemas
 * ------------------------------------------------------------------ */

export const institutionCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "institution name must be at least 2 characters")
    .max(120, "institution name may not exceed 120 characters"),
});
export type InstitutionCreateInput = z.infer<typeof institutionCreateSchema>;

export const subjectCreateSchema = z.object({
  institutionId: resourceIdSchema,
  name: z
    .string()
    .trim()
    .min(2, "subject name must be at least 2 characters")
    .max(120, "subject name may not exceed 120 characters"),
  code: z
    .string()
    .trim()
    .max(24, "code may not exceed 24 characters")
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  department: z
    .string()
    .trim()
    .max(120, "department may not exceed 120 characters")
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  semester: z.number().int().min(1).max(12).optional().nullable(),
});
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;

export const subjectUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "subject name must be at least 2 characters")
    .max(120, "subject name may not exceed 120 characters")
    .optional(),
  code: z
    .string()
    .trim()
    .max(24)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  department: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  semester: z.number().int().min(1).max(12).optional().nullable(),
});
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;

export const bookmarkRequestSchema = z.object({ resourceId: resourceIdSchema });

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email("must be a valid email address").max(254).optional(),
});

/**
 * Password policy for Supabase email/password sign-up.
 *
 * Length only. A complexity rule ("one uppercase, one symbol") reliably pushes users
 * toward shorter, guessable passwords, so 8 characters is the floor and there is no
 * maximum below Supabase's own. Sign-in does not re-apply it: a user who signed up
 * before a policy change must still be able to authenticate.
 */
export const passwordSchema = z
  .string()
  .min(8, "password needs at least 8 characters")
  .max(72, "password must be 72 characters or fewer");

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "display name needs at least 2 characters")
    .max(80, "display name must be 80 characters or fewer"),
  email: z.string().trim().email("enter a valid email address").max(254),
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: z.string().trim().email("enter a valid email address").max(254),
  password: z.string().min(1, "enter your password").max(72),
});

/**
 * The development adapter has no password by design (see `auth/development.ts`),
 * so it validates only the two values it actually stores.
 */
export const devSignInSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "display name needs at least 2 characters")
    .max(80, "display name must be 80 characters or fewer"),
  email: z.string().trim().email("enter a valid email address").max(254),
});

export type ResourceCreateInput = z.input<typeof resourceCreateSchema>;
export type ResourceUpdateInput = z.infer<typeof resourceUpdateSchema>;
export type SearchParams = z.infer<typeof searchParamsSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;

/** Zod issues -> field map, so a form can render messages inline. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Parse or throw an `invalid_input` AppError.
 *
 * The schema is the generic parameter (not its output type): `z.ZodType<T>` would
 * pin the input and output to the same `T`, which is not true for a schema using
 * `preprocess`/`default`/`transform`.
 */
export function parseOrThrow<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) throw AppError.invalid(fieldErrors(result.error));
  return result.data;
}

export function parseOrNull<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> | null {
  const result = schema.safeParse(input);
  return result.success ? result.data : null;
}

/** OFFSET for an already-validated (page, pageSize) pair. */
export function offsetOf(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
