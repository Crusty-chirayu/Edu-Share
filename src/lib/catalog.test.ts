import { describe, expect, it } from "vitest";
import { toSearchParams } from "@/lib/catalog";

/**
 * These are the pure parts of the read layer: everything here is about how raw URL
 * input is normalised before it can reach a query builder. No database is touched.
 */
describe("toSearchParams", () => {
  it("fills in every default for an empty query", () => {
    const params = toSearchParams({});
    expect(params.sort).toBe("newest");
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(12);
    expect(params.q).toBeUndefined();
    expect(params.subjectId).toBeUndefined();
    expect(params.institutionId).toBeUndefined();
    expect(params.ownerId).toBeUndefined();
  });

  it("coerces numeric query strings", () => {
    const params = toSearchParams({ page: "3", pageSize: "10" });
    expect(params.page).toBe(3);
    expect(params.pageSize).toBe(10);
  });

  it("never throws on nonsense — it falls back to the defaults", () => {
    const params = toSearchParams({ page: "banana", pageSize: "-40", sort: "sideways" });
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(12);
    expect(params.sort).toBe("newest");
  });

  it("trims search text and collapses whitespace-only input to undefined", () => {
    expect(toSearchParams({ q: "  organic chemistry  " }).q).toBe("organic chemistry");
    expect(toSearchParams({ q: "   " }).q).toBeUndefined();
  });

  it("drops a non-UUID taxonomy id rather than passing it through", () => {
    expect(toSearchParams({ subjectId: "'; DROP TABLE resources; --" }).subjectId).toBeUndefined();
  });

  it("keeps the first value when a key is repeated", () => {
    expect(toSearchParams({ q: ["first", "second"] }).q).toBe("first");
  });

  it("bounds the page size to the documented maximum", () => {
    // Above MAX_PAGE_SIZE the whole parse fails, so the defaults apply — a request
    // can never ask for an unbounded page.
    expect(toSearchParams({ pageSize: "5000" }).pageSize).toBe(12);
    expect(toSearchParams({ pageSize: "50" }).pageSize).toBe(50);
  });
});
