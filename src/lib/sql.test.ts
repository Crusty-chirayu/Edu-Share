import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  RESOURCE_ORDER_BY,
  buildBookmarkVisibilityQuery,
  buildResourceDeleteQuery,
  buildResourceDetailQuery,
  buildResourceInsertQuery,
  buildResourceListQuery,
  buildResourceUpdateQuery,
  buildAdminResourceDeleteQuery,
  buildListReportsQuery,
  buildReportResolveQuery,
  buildModerationActionInsertQuery,
  buildResourceVisibilitySetQuery,
  buildInstitutionInsertQuery,
  buildSubjectInsertQuery,
  buildSubjectDeleteQuery,
  orderByFragment,
} from "@/lib/sql";
import { parseOrThrow, searchParamsSchema } from "@/lib/validation";

/**
 * Regression suite for the SQL-interpolation defect.
 *
 * The previous revision built its column list with
 * `sql.unsafe(LIST_COLUMNS.replace("@VIEWER", viewerId))` — a runtime value spliced
 * into SQL text. These tests assert the opposite property for every builder: the
 * text contains only fixed fragments and `$n` placeholders, and every value supplied
 * by a caller (or by the server on the caller's behalf) appears in the `values`
 * array instead.
 */

const VIEWER = "3f0c1a2e-4b5d-4a1e-9c3f-8d2b7e6a5c4d";
const OWNER = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";
const RESOURCE = "11111111-2222-4333-8444-555555555555";
const SUBJECT = "66666666-7777-4888-8999-aaaaaaaaaaaa";

const params = (input: Record<string, unknown> = {}) => parseOrThrow(searchParamsSchema, input);

describe("buildResourceListQuery", () => {
  it("binds search text, pagination and offset instead of inlining them", () => {
    const { list, count } = buildResourceListQuery(params({ q: "operating systems", page: "3" }));

    expect(list.text).not.toContain("operating systems");
    expect(list.values).toContain("operating systems");
    // WHERE(q) + LIMIT + OFFSET
    expect(list.values).toHaveLength(3);
    expect(list.values[1]).toBe(12); // pageSize
    expect(list.values[2]).toBe(24); // offsetOf(3, 12)
    expect(list.text).toContain("LIMIT $2 OFFSET $3");
    // The count statement shares the WHERE text but must not carry LIMIT/OFFSET.
    expect(count.text).not.toContain("LIMIT");
    expect(count.values).toEqual(["operating systems"]);
  });

  it("binds the filter UUIDs rather than splicing them", () => {
    const { list } = buildResourceListQuery(params({ subjectId: SUBJECT, ownerId: OWNER }));
    expect(list.text).not.toContain(SUBJECT);
    expect(list.text).not.toContain(OWNER);
    expect(list.values).toEqual([OWNER, SUBJECT, 12, 0]);
  });

  it("never puts a viewer UUID into the query text (defect regression)", () => {
    const { list } = buildResourceListQuery(params(), { mine: true });
    expect(list.text).not.toContain(VIEWER);
    expect(list.values).toEqual([12, 0]);
    // Identity reaches PostgreSQL as transaction state, not as SQL text.
    expect(list.text).toContain("public.app_current_user_id()");
  });

  it("applies the visibility predicate to every listing, including 'mine'", () => {
    const { list } = buildResourceListQuery(params());
    expect(list.text).toContain(
      "r.visibility = 'public' OR r.owner_id = public.app_current_user_id()",
    );
  });

  it("ignores a client-supplied ownerId when the owner filter is 'mine'", () => {
    const { list } = buildResourceListQuery(params({ ownerId: OWNER }), { mine: true });
    expect(list.text).not.toContain(OWNER);
    expect(list.values).not.toContain(OWNER);
  });

  it("restricts the saved list to the transaction identity and binds nothing extra", () => {
    const { list, count } = buildResourceListQuery(params(), { saved: true });
    expect(list.text).toContain("FROM bookmarks sb");
    expect(list.text).toContain("sb.user_id = public.app_current_user_id()");
    expect(list.text).not.toContain(VIEWER);
    // Identity only — no placeholder is added for a saved list, so there is no value
    // a caller could supply to widen it.
    expect(list.values).toEqual([12, 0]);
    expect(count.values).toEqual([]);
  });
});

describe("orderByFragment", () => {
  it("returns the fixed fragment for every validated sort key", () => {
    expect(orderByFragment("newest")).toBe(RESOURCE_ORDER_BY.newest);
    expect(orderByFragment("oldest")).toBe(RESOURCE_ORDER_BY.oldest);
    expect(orderByFragment("title")).toBe(RESOURCE_ORDER_BY.title);
  });

  it("falls back to the default for anything outside the allow-list", () => {
    expect(orderByFragment("r.created_at DESC; DROP TABLE resources")).toBe(
      RESOURCE_ORDER_BY.newest,
    );
    expect(orderByFragment("")).toBe(RESOURCE_ORDER_BY.newest);
    // A prototype key must not be mistaken for a member of the allow-list.
    expect(orderByFragment("constructor")).toBe(RESOURCE_ORDER_BY.newest);
    expect(orderByFragment("toString")).toBe(RESOURCE_ORDER_BY.newest);
  });
});

describe("buildResourceDetailQuery", () => {
  it("binds the id and keeps the visibility predicate", () => {
    const query = buildResourceDetailQuery(RESOURCE);
    expect(query.text).not.toContain(RESOURCE);
    expect(query.text).toContain("$1::uuid");
    expect(query.text).toContain("r.visibility = 'public'");
    expect(query.values).toEqual([RESOURCE]);
  });
});

describe("buildResourceInsertQuery", () => {
  it("binds owner, metadata and file fields", () => {
    const query = buildResourceInsertQuery(OWNER, {
      title: "Operating Systems — Unit 3",
      description: null,
      subjectId: SUBJECT,
      visibility: "private",
      file: {
        key: "resources/ab/notes.pdf",
        name: "notes.pdf",
        sizeBytes: 2048,
        mimeType: "application/pdf",
      },
    });
    expect(query.text).not.toContain("Operating Systems");
    expect(query.text).not.toContain("notes.pdf");
    expect(query.values).toContain(OWNER);
    expect(query.values).toContain("Operating Systems — Unit 3");
    expect(query.values).toContain("private");
    expect(query.values).toContain("resources/ab/notes.pdf");
    expect(query.values).toContain(2048);
  });
});

describe("buildResourceUpdateQuery", () => {
  it("writes only the supplied columns and always scopes to the owner", () => {
    const query = buildResourceUpdateQuery(RESOURCE, OWNER, { title: "New title" });
    expect(query.text).toContain("title = $1::text");
    expect(query.text).not.toContain("visibility");
    expect(query.text).toContain("owner_id = $3::uuid");
    expect(query.text).toContain("updated_at = now()");
    expect(query.values).toEqual(["New title", RESOURCE, OWNER]);
  });

  it("clears a nullable column when the field is explicitly null", () => {
    const query = buildResourceUpdateQuery(RESOURCE, OWNER, {
      description: null,
      subjectId: null,
    });
    expect(query.text).toContain("description = $1::text");
    expect(query.text).toContain("subject_id = $2::uuid");
    expect(query.values.slice(0, 2)).toEqual([null, null]);
  });

  it("exposes no writable ownership or role column", () => {
    const query = buildResourceUpdateQuery(RESOURCE, OWNER, { visibility: "public" });
    // `owner_id` appears only in the WHERE scope, never in the SET list, and `role`
    // is not part of this table's allow-list at all.
    const setClause = query.text.slice(query.text.indexOf("SET") + 3, query.text.indexOf("WHERE"));
    expect(setClause).not.toMatch(/\bowner_id\b/);
    expect(setClause).not.toMatch(/\brole\b/);
    expect(query.text).toContain("owner_id = $3::uuid");
  });

  it("rejects an empty patch rather than emitting a broken statement", () => {
    expect(() => buildResourceUpdateQuery(RESOURCE, OWNER, {})).toThrow(AppError);
  });
});

describe("buildResourceDeleteQuery", () => {
  it("is owner-scoped and parameterised", () => {
    const query = buildResourceDeleteQuery(RESOURCE, OWNER);
    expect(query.text).not.toContain(RESOURCE);
    expect(query.text).toContain("owner_id = $2::uuid");
    expect(query.values).toEqual([RESOURCE, OWNER]);
  });
});

describe("buildBookmarkVisibilityQuery", () => {
  it("refuses a private resource belonging to someone else", () => {
    const query = buildBookmarkVisibilityQuery(RESOURCE, OWNER);
    expect(query.text).toContain("r.visibility = 'public' OR r.owner_id = $2::uuid");
    expect(query.values).toEqual([RESOURCE, OWNER]);
  });
});

describe("moderation queries (M9)", () => {
  it("binds filter parameters and limits in buildListReportsQuery", () => {
    const { list, count } = buildListReportsQuery(
      { status: "open", category: "spam" },
      { limit: 25, offset: 0 },
    );
    expect(list.text).not.toContain("'open'");
    expect(list.text).not.toContain("'spam'");
    expect(list.values).toContain("open");
    expect(list.values).toContain("spam");
    expect(list.values).toContain(25);
    expect(count.values).toEqual(["open", "spam"]);
  });

  it("binds report resolve values safely", () => {
    const query = buildReportResolveQuery("rep-123", OWNER, "resolved", "Content removed");
    expect(query.text).toContain("resolved_by = $3::uuid");
    expect(query.text).toContain("WHERE id = $4::uuid");
    expect(query.values).toEqual(["resolved", "Content removed", OWNER, "rep-123"]);
  });

  it("binds moderation action audit entries", () => {
    const query = buildModerationActionInsertQuery(
      OWNER,
      RESOURCE,
      "rep-123",
      "hide",
      "Violates academic integrity policy",
    );
    expect(query.text).toContain("INSERT INTO moderation_actions");
    expect(query.values).toContain(OWNER);
    expect(query.values).toContain(RESOURCE);
    expect(query.values).toContain("hide");
  });

  it("binds resource visibility toggle", () => {
    const query = buildResourceVisibilitySetQuery(RESOURCE, "private");
    expect(query.text).toContain("visibility = $1::text");
    expect(query.values).toEqual(["private", RESOURCE]);
  });

  it("binds admin resource delete query without owner check", () => {
    const query = buildAdminResourceDeleteQuery(RESOURCE);
    expect(query.text).not.toContain("owner_id");
    expect(query.text).toContain("WHERE id = $1::uuid");
    expect(query.values).toEqual([RESOURCE]);
  });
});

describe("taxonomy queries (M6)", () => {
  it("binds institution insert", () => {
    const query = buildInstitutionInsertQuery("Stanford University");
    expect(query.text).toContain("INSERT INTO institutions");
    expect(query.values).toEqual(["Stanford University"]);
  });

  it("binds subject insert with all parameters", () => {
    const query = buildSubjectInsertQuery({
      institutionId: OWNER,
      name: "Distributed Systems",
      code: "CS244B",
      department: "Computer Science",
      semester: 4,
    });
    expect(query.text).toContain("INSERT INTO subjects");
    expect(query.values).toEqual([OWNER, "Distributed Systems", "CS244B", "Computer Science", 4]);
  });

  it("builds safe delete query preventing deletion when resources exist", () => {
    const query = buildSubjectDeleteQuery(SUBJECT);
    expect(query.text).toContain("NOT EXISTS (SELECT 1 FROM resources");
    expect(query.values).toEqual([SUBJECT, SUBJECT]);
  });
});
