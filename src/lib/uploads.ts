import { AppError } from "@/lib/errors";
import { createStorageKey } from "@/lib/storage";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  type FileMetadata,
  fileExtension,
  safeDisplayName,
} from "@/lib/validation";

/**
 * Server-side upload validation.
 *
 * Three independent checks, all of which must pass, because each catches a different
 * mistake:
 *
 *  1. **Size** — before anything is written, and against the documented 25 MB cap.
 *  2. **Declared agreement** — the browser-declared MIME type must be one of the
 *     types the extension is allowed to carry (`ALLOWED_UPLOAD_TYPES`).
 *  3. **Content agreement** — the first bytes are sniffed. A `.php` file renamed to
 *     `.pdf` fails here, not at the database.
 *
 * Extension and content are matched through a *category* rather than an exact MIME
 * string, because the `docx`/`pptx`/`xlsx` family are all ZIP containers: sniffing
 * can prove "this is a ZIP", and the declared type narrows *which* Office format it
 * claims to be.
 */

export type ContentCategory = "pdf" | "png" | "jpeg" | "zip" | "text" | "binary";

/** What each accepted extension must actually contain. */
const EXPECTED_CATEGORY: Readonly<Record<string, ContentCategory>> = Object.freeze({
  pdf: "pdf",
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  docx: "zip",
  pptx: "zip",
  xlsx: "zip",
  zip: "zip",
  txt: "text",
  md: "text",
  csv: "text",
});

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/** Identifies the container format from the leading bytes alone. */
export function sniffCategory(bytes: Uint8Array): ContentCategory {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "zip"; // local file header
  if (startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) return "zip"; // empty archive

  // Text: no NUL in the first kilobyte and no other binary control characters.
  const sample = bytes.subarray(0, 1024);
  const hasControlByte = sample.some(
    (byte) => byte === 0x00 || byte < 0x09 || (byte > 0x0d && byte < 0x20),
  );
  return hasControlByte ? "binary" : "text";
}

function reject(message: string): never {
  throw AppError.invalid({ file: message });
}

/**
 * Validates a submitted file and returns the metadata to persist.
 *
 * `key` is generated here, server-side: the client's file name influences only the
 * human-readable `name`, never the storage path.
 */
export function acceptUpload(
  input: { fileName: string; declaredType: string; bytes: Uint8Array },
  ownerId: string,
): FileMetadata {
  if (input.bytes.length === 0) reject("That file is empty.");
  if (input.bytes.length > MAX_UPLOAD_BYTES) {
    reject(
      `That file is larger than the ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit.`,
    );
  }

  // `safeDisplayName` strips any directory component, so `../../etc/passwd` becomes
  // `passwd` and the value can never be read as a path.
  const name = safeDisplayName(input.fileName);
  if (name.length === 0) reject("That file needs a usable name.");

  const extension = fileExtension(name);
  const allowedTypes = ALLOWED_UPLOAD_TYPES[extension];
  if (!allowedTypes) {
    const accepted = Object.keys(ALLOWED_UPLOAD_TYPES).sort().join(", ");
    reject(`.${extension} files are not accepted. Accepted formats: ${accepted}.`);
  }

  const declaredType = input.declaredType.trim().toLowerCase();
  if (!allowedTypes.includes(declaredType)) {
    reject(
      `The file is declared as ${declaredType || "an unknown type"}, which does not match .${extension}.`,
    );
  }

  const expected = EXPECTED_CATEGORY[extension] ?? "binary";
  const actual = sniffCategory(input.bytes);
  if (actual !== expected) {
    reject(
      `The contents of that file do not look like .${extension} (found ${actual}). ` +
        `Rename it to match its real format, or upload the correct file.`,
    );
  }

  return {
    key: createStorageKey(ownerId, extension),
    name,
    sizeBytes: input.bytes.length,
    mimeType: declaredType,
  };
}

/** Reads `File` objects out of a form without trusting anything else about them. */
export async function readUploadedFile(
  value: FormDataEntryValue | null,
): Promise<Uint8Array | null> {
  if (!(value instanceof File)) return null;
  const buffer = await value.arrayBuffer();
  return new Uint8Array(buffer);
}
