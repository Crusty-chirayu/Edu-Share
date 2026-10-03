import { describe, expect, it } from "vitest";
import { CREATOR, POLICIES, SITE, policyByHref, requirePolicy } from "@/lib/site";

/**
 * These assertions exist because the footer and the policy pages are the only
 * places a reader can check who is accountable for the site. A typo in a handle
 * or a link to a page that does not exist is not a cosmetic bug: it is a claim
 * the product cannot back up.
 */
describe("creator attribution", () => {
  it("names the creator and their actual role", () => {
    expect(CREATOR.name).toBe("Chirayu Babu Jaysawal");
    expect(CREATOR.role.length).toBeGreaterThan(0);
  });

  it("offers a GitHub, a portfolio and a blog link", () => {
    const labels = CREATOR.links.map((link) => link.label);
    expect(labels).toEqual(["GitHub", "Portfolio", "Blog"]);
  });

  it("uses unique labels, so two links cannot be confused in a screen reader", () => {
    const labels = CREATOR.links.map((link) => link.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("points every link at an absolute https URL", () => {
    for (const link of CREATOR.links) {
      const url = new URL(link.href);
      expect(url.protocol, link.label).toBe("https:");
      expect(url.host.length, link.label).toBeGreaterThan(0);
    }
  });

  it("points the GitHub link at the creator's own account", () => {
    const github = CREATOR.links.find((link) => link.label === "GitHub");
    expect(new URL(github?.href ?? "").pathname).toBe("/Crusty-chirayu");
  });
});

describe("policies", () => {
  it("declares the three documents the footer links to", () => {
    expect(POLICIES.map((policy) => policy.href)).toEqual([
      "/terms",
      "/privacy",
      "/acceptable-use",
    ]);
  });

  it("uses site-relative, slash-prefixed routes", () => {
    for (const policy of POLICIES) {
      expect(policy.href.startsWith("/"), policy.href).toBe(true);
      expect(policy.href.startsWith("//"), policy.href).toBe(false);
    }
  });

  it("gives each policy a title, a summary and a real review date", () => {
    for (const policy of POLICIES) {
      expect(policy.title.length, policy.href).toBeGreaterThan(0);
      expect(policy.summary.length, policy.href).toBeGreaterThan(20);
      // `YYYY-MM-DD` and a date the runtime can actually parse.
      expect(policy.reviewed, policy.href).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(policy.reviewed)), policy.href).toBe(false);
    }
  });

  it("looks a policy up by route and returns undefined for anything else", () => {
    expect(policyByHref("/privacy")?.title).toBe("Privacy notice");
    expect(policyByHref("/not-a-policy")).toBeUndefined();
  });

  it("returns the document or throws, so a page never renders without its text", () => {
    expect(requirePolicy("/terms").href).toBe("/terms");
    expect(() => requirePolicy("/not-a-policy")).toThrow(/No policy is registered/);
  });

  it("covers every policy the footer links to", () => {
    for (const policy of POLICIES) {
      expect(requirePolicy(policy.href).title, policy.href).toBe(policy.title);
    }
  });
});

describe("site identity", () => {
  it("keeps the brand name and the released tagline", () => {
    expect(SITE.name).toBe("EDU-SHARE");
    expect(SITE.tagline).toBe("Every subject. Every campus. The notes you actually need.");
  });

  it("describes the product without claiming features it does not have", () => {
    const description = SITE.description.toLowerCase();
    for (const absent of ["ai", "machine learning", "blockchain", "social network"]) {
      expect(description).not.toContain(absent);
    }
  });
});
