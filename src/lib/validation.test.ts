import { describe, expect, it } from "vitest";
import { AppError, toPublicError } from "@/lib/errors";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_UPLOAD_BYTES,
  fileMetadataSchema,
  offsetOf,
  parseOrThrow,
  resourceCreateSchema,
  resourceIdSchema,
  resourceUpdateSchema,
  safeDisplayName,
  searchParamsSchema,
} from "@/lib/validation";

const PDF = { key: "resources/ab/notes.pdf", name: "notes.pdf", sizeBytes: 1024, mimeType: "application/pdf" };
const ID = "3f0c1a2e-4b5d-4a1e-9c3f-8d2b7e6a5c4d";

describe("safeDisplayName", () => {
  it("drops any directory component", () => {
    expect(safeDisplayName("C:\\Users\\me\\notes.pdf")).toBe("notes.pdf");
    expect(safeDisplayName("../../etc/passwd")).toBe("passwd");
  });

  it("strips traversal prefixes and leading dots", () => {
    expect(safeDisplayName("..\\..\\secret.pdf")).toBe("secret.pdf");
    expect(safeDisplayName(".hidden")).toBe("hidden");
  });

  it("replaces characters that have no business in a file name", () => {
    expect(safeDisplayName("re;port<1>.pdf")).toBe("re_port_1_.pdf");
  });
});

describe("fileMetadataSchema", () => {
  it("accepts an allowed type", () => {
    expect(fileMetadataSchema.parse(PDF)).toEqual(PDF);
  });

  it("rejects a disallowed extension", () => {
    const result = fileMetadataSchema.safeParse({ ...PDF, name: "payload.exe", mimeType: "application/octet-stream" });
    expect(result.success).toBe(false);
  });

  it("rejects a declared MIME type that contradicts the extension", () => {
    expect(fileMetadataSchema.safeParse({ ...PDF, mimeType: "text/html" }).success).toBe(false);
  });

  it("rejects a traversal-shaped storage key", () => {
    expect(fileMetadataSchema.safeParse({ ...PDF, key: "../secrets.pdf" }).success).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    expect(fileMetadataSchema.safeParse({ ...PDF, sizeBytes: MAX_UPLOAD_BYTES + 1 }).success).toBe(false);
  });

  it("rejects a zero-byte or negative size", () => {
    expect(fileMetadataSchema.safeParse({ ...PDF, sizeBytes: 0 }).success).toBe(false);
    expect(fileMetadataSchema.safeParse({ ...PDF, sizeBytes: -5 }).success).toBe(false);
  });
});

describe("resourceCreateSchema", () => {
  it("defaults visibility to public", () => {
    expect(resourceCreateSchema.parse({ title: "Calculus notes" }).visibility).toBe("public");
  });

  it("bounds the title", () => {
    expect(resourceCreateSchema.safeParse({ title: "ab" }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ title: "x".repeat(161) }).success).toBe(false);
  });

  it("strips a self-selected role instead of trusting it (AUD-002)", () => {
    const parsed = resourceCreateSchema.parse({ title: "Lecture slides", role: "admin" }) as Record<string, unknown>;
    expect(parsed.role).toBeUndefined();
  });

  it("rejects a malformed subject id", () => {
    expect(resourceCreateSchema.safeParse({ title: "Notes", subjectId: "1" }).success).toBe(false);
  });
});

describe("resourceUpdateSchema", () => {
  it("requires at least one field", () => {
    expect(resourceUpdateSchema.safeParse({}).success).toBe(false);
    expect(resourceUpdateSchema.safeParse({ title: "New title" }).success).toBe(true);
  });
});

describe("resourceIdSchema", () => {
  it("accepts a lowercase UUID and rejects anything else", () => {
    expect(resourceIdSchema.safeParse(ID).success).toBe(true);
    expect(resourceIdSchema.safeParse(ID.toUpperCase()).success).toBe(false);
    expect(resourceIdSchema.safeParse("1; DROP TABLE resources").success).toBe(false);
  });
});

describe("searchParamsSchema", () => {
  it("fills defaults for an empty query string", () => {
    const parsed = searchParamsSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parsed.sort).toBe("newest");
    expect(parsed.q).toBeUndefined();
  });

  it("coerces numeric strings from the URL", () => {
    const parsed = searchParamsSchema.parse({ page: "3", pageSize: "20" });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(20);
  });

  it("rejects out-of-range pagination instead of clamping silently", () => {
    expect(searchParamsSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ pageSize: String(MAX_PAGE_SIZE + 1) }).success).toBe(false);
  });

  it("treats a blank query as no query", () => {
    expect(searchParamsSchema.parse({ q: "   " }).q).toBeUndefined();
  });

  it("caps the search text length", () => {
    expect(searchParamsSchema.parse({ q: "a".repeat(500) }).q?.length).toBe(120);
  });

  it("rejects an unknown sort key", () => {
    expect(searchParamsSchema.safeParse({ sort: "cheapest" }).success).toBe(false);
  });
});

describe("offsetOf", () => {
  it("maps page and size to an offset", () => {
    expect(offsetOf(1, 12)).toBe(0);
    expect(offsetOf(3, 12)).toBe(24);
  });
});

describe("parseOrThrow", () => {
  it("raises invalid_input with per-field messages", () => {
    expect(() => parseOrThrow(resourceCreateSchema, { title: "" })).toThrow(AppError);
    try {
      parseOrThrow(resourceCreateSchema, { title: "" });
    } catch (error) {
      const appError = error as AppError;
      expect(appError.code).toBe("invalid_input");
      expect(appError.status).toBe(400);
      expect(Object.keys(appError.fields)).toContain("title");
    }
  });
});

describe("error exposure", () => {
  it("never returns a custom internal message to the caller", () => {
    const error = new AppError("not_found", { message: "resource 3f0c belongs to another user" });
    const { status, body } = toPublicError(error);
    expect(status).toBe(404);
    expect(body.error.message).toBe("That item could not be found.");
    expect(JSON.stringify(body)).not.toContain("another user");
  });

  it("does not retain a driver error on the instance", () => {
    const error = AppError.database();
    expect(error.cause).toBeUndefined();
    expect(JSON.stringify(toPublicError(error))).not.toContain("ECONNREFUSED");
  });

  it("hides an unknown error behind a generic 500 body", () => {
    const { status, body } = toPublicError(new Error("boom: postgres://user:pw@127.0.0.1:5432/edushare"));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("pw@");
    expect(body.error.message).not.toContain("boom");
  });
});