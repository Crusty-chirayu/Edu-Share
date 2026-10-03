import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { acceptUpload, sniffCategory } from "@/lib/uploads";
import { MAX_UPLOAD_BYTES } from "@/lib/validation";

const OWNER = "11111111-1111-4111-8111-111111111111";

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function pdfBytes(): Uint8Array {
  return bytes("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n");
}

function zipBytes(): Uint8Array {
  return new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00]);
}

/** Accepts a throw, and asserts it is a *field* error about the file itself. */
function expectFileRejection(fn: () => unknown): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("invalid_input");
    expect((error as AppError).fields.file).toBeTruthy();
    return;
  }
  throw new Error("expected the upload to be rejected");
}

describe("sniffCategory", () => {
  it("identifies containers from their leading bytes", () => {
    expect(sniffCategory(pdfBytes())).toBe("pdf");
    expect(sniffCategory(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "png",
    );
    expect(sniffCategory(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(sniffCategory(zipBytes())).toBe("zip");
  });

  it("separates plain text from binary", () => {
    expect(sniffCategory(bytes("name,mark\nalice,7\n"))).toBe("text");
    // A NUL byte in the first kilobyte is the classic binary tell.
    expect(sniffCategory(new Uint8Array([0x68, 0x00, 0x69]))).toBe("binary");
    expect(sniffCategory(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]))).toBe("binary");
  });

  it("treats an empty buffer as text — there are no control bytes in it", () => {
    expect(sniffCategory(new Uint8Array(0))).toBe("text");
  });
});

describe("acceptUpload", () => {
  it("accepts a well-formed PDF and mints a server-side key", () => {
    const file = acceptUpload(
      { fileName: "week-4-notes.pdf", declaredType: "application/pdf", bytes: pdfBytes() },
      OWNER,
    );

    expect(file.key.startsWith(`resources/${OWNER}/`)).toBe(true);
    expect(file.key.endsWith(".pdf")).toBe(true);
    expect(file.name).toBe("week-4-notes.pdf");
    expect(file.mimeType).toBe("application/pdf");
    expect(file.sizeBytes).toBeGreaterThan(0);
  });

  it("mints a different key for every upload", () => {
    const first = acceptUpload(
      { fileName: "a.pdf", declaredType: "application/pdf", bytes: pdfBytes() },
      OWNER,
    );
    const second = acceptUpload(
      { fileName: "a.pdf", declaredType: "application/pdf", bytes: pdfBytes() },
      OWNER,
    );
    expect(first.key).not.toBe(second.key);
  });

  it("strips any directory component from the display name", () => {
    const file = acceptUpload(
      { fileName: "../../../etc/passwd.pdf", declaredType: "application/pdf", bytes: pdfBytes() },
      OWNER,
    );
    expect(file.name).toBe("passwd.pdf");
    expect(file.name).not.toContain("/");
    // The key never saw the client's name at all.
    expect(file.key).not.toContain("passwd");
  });

  it("rejects an empty file", () => {
    expectFileRejection(() =>
      acceptUpload(
        { fileName: "empty.pdf", declaredType: "application/pdf", bytes: new Uint8Array(0) },
        OWNER,
      ),
    );
  });

  it(`rejects a file larger than ${MAX_UPLOAD_BYTES} bytes`, () => {
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    oversized.set(pdfBytes());
    expectFileRejection(() =>
      acceptUpload(
        { fileName: "huge.pdf", declaredType: "application/pdf", bytes: oversized },
        OWNER,
      ),
    );
  });

  it("rejects an extension that is not on the allow-list", () => {
    expectFileRejection(() =>
      acceptUpload(
        { fileName: "payload.exe", declaredType: "application/octet-stream", bytes: bytes("MZ") },
        OWNER,
      ),
    );
  });

  it("rejects a declared type that does not match the extension", () => {
    expectFileRejection(() =>
      acceptUpload({ fileName: "notes.pdf", declaredType: "text/plain", bytes: pdfBytes() }, OWNER),
    );
  });

  it("rejects contents that do not match the extension", () => {
    // Right name, right declared type, wrong bytes: the sniffer is what catches this.
    expectFileRejection(() =>
      acceptUpload(
        {
          fileName: "notes.pdf",
          declaredType: "application/pdf",
          bytes: bytes("#!/bin/sh\nrm -rf /\n"),
        },
        OWNER,
      ),
    );
  });

  it("accepts an Office document because it is a ZIP container", () => {
    const file = acceptUpload(
      {
        fileName: "seminar.pptx",
        declaredType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        bytes: zipBytes(),
      },
      OWNER,
    );
    expect(file.key.endsWith(".pptx")).toBe(true);
    expect(file.mimeType).toContain("presentation");
  });
});
