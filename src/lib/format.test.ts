import { describe, expect, it } from "vitest";
import { formatTone } from "@/lib/category";
import { extensionLabel, formatBytes, formatDate } from "@/lib/format";

describe("formatBytes", () => {
  it("renders each magnitude with the right unit", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1.0 kB");
    expect(formatBytes(1536)).toBe("1.5 kB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes("2097152")).toBe("2.0 MB");
  });

  it("returns an em dash for anything it cannot read", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes("not a number")).toBe("—");
    expect(formatBytes(-5)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats an ISO string as a short date", () => {
    expect(formatDate("2026-03-12T09:30:00.000Z")).toMatch(/2026/);
  });

  it("returns an em dash for missing or invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("yesterday")).toBe("—");
    expect(formatDate(new Date("nope"))).toBe("—");
  });
});

describe("extensionLabel", () => {
  it("upper-cases the extension", () => {
    expect(extensionLabel("report.pdf")).toBe("PDF");
    expect(extensionLabel("notes.DOCX")).toBe("DOCX");
  });

  it("falls back to FILE when there is no extension", () => {
    expect(extensionLabel("README")).toBe("FILE");
    expect(extensionLabel("trailing.")).toBe("FILE");
    expect(extensionLabel(null)).toBe("FILE");
  });
});

describe("formatTone", () => {
  it("assigns a rule colour per recognised format", () => {
    expect(formatTone("a.pdf")).toEqual({ varName: "--cat-lecture", label: "PDF" });
    expect(formatTone("b.pptx").label).toBe("PPTX");
    expect(formatTone("c.docx").label).toBe("DOCX");
    expect(formatTone("d.png").label).toBe("PNG");
  });

  it("falls back without inventing a format", () => {
    expect(formatTone("archive.xyz").label).toBe("XYZ");
    expect(formatTone("noextension").label).toBe("FILE");
    expect(formatTone(null).label).toBe("FILE");
  });
});
