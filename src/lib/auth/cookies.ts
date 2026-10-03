import type { NextResponse } from "next/server";

/**
 * Cookie plumbing for cookie-based sessions.
 *
 * `@supabase/supabase-js` requires a **synchronous** key/value storage adapter, while
 * Next.js exposes cookies asynchronously (`cookies()`) or through a request object.
 * This module bridges the two the same way the official SSR helpers do: reads come
 * from the incoming request, writes are buffered, and the buffer is flushed onto the
 * outgoing response exactly once.
 *
 * Values are base64url-encoded before they are split into chunks, because a Supabase
 * session is JSON — `,`, `"`, `{` and `}` are not safe raw cookie bytes — and because
 * a real session can exceed the ~4 KB per-cookie limit.
 */

export const AUTH_COOKIE_PREFIX = "edu-share-auth";

interface CookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
}

export interface SyncCookieStore {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  remove(name: string, options?: CookieOptions): void;
}

export interface CookieChange {
  name: string;
  value: string | null;
  options: CookieOptions;
}

const CHUNK_SIZE = 3000;
const MAX_CHUNKS = 6;

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  // 30 days, matching the Supabase refresh-token window.
  maxAge: 60 * 60 * 24 * 30,
};

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const normalised = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * A store backed by an in-memory map seeded from the incoming request. Writes are
 * recorded so they can be replayed onto the response.
 */
export class BufferedCookieStore implements SyncCookieStore {
  private readonly initial: Map<string, string>;
  private readonly changes = new Map<string, CookieChange>();

  constructor(entries: Iterable<{ name: string; value: string }>) {
    this.initial = new Map();
    for (const entry of entries) this.initial.set(entry.name, entry.value);
  }

  get(name: string): string | undefined {
    const change = this.changes.get(name);
    if (change) return change.value ?? undefined;
    return this.initial.get(name);
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    this.changes.set(name, { name, value, options: { ...AUTH_COOKIE_OPTIONS, ...options } });
  }

  remove(name: string, options: CookieOptions = {}): void {
    const merged: CookieOptions = { ...AUTH_COOKIE_OPTIONS, ...options, maxAge: 0 };
    this.changes.set(name, { name, value: null, options: merged });
  }

  /** Pending writes, in insertion order. */
  drain(): CookieChange[] {
    return [...this.changes.values()];
  }
}

/** Read-only variant for Server Components, which may not set cookies. */
export class ReadOnlyCookieStore implements SyncCookieStore {
  private readonly values: Map<string, string>;

  constructor(entries: Iterable<{ name: string; value: string }>) {
    this.values = new Map();
    for (const entry of entries) this.values.set(entry.name, entry.value);
  }

  get(name: string): string | undefined {
    return this.values.get(name);
  }

  /** No-op: middleware performs token refreshes, where a response exists. */
  set(_name: string, _value: string, _options?: CookieOptions): void {}

  /** No-op, for the same reason as `set`. */
  remove(_name: string, _options?: CookieOptions): void {}
}

/**
 * Chunked, base64url session storage. The namespace is prefixed so the application
 * can distinguish its own session cookies from anything else on the origin.
 */
export class ChunkedCookieStorage {
  private readonly store: SyncCookieStore;
  private readonly namespace: string;

  constructor(store: SyncCookieStore, namespace: string = AUTH_COOKIE_PREFIX) {
    this.store = store;
    this.namespace = namespace;
  }

  private chunkName(key: string, index: number): string {
    return `${this.namespace}-${key}-${index}`;
  }

  getItem(key: string): string | null {
    let encoded = "";
    for (let index = 0; index < MAX_CHUNKS; index += 1) {
      const part = this.store.get(this.chunkName(key, index));
      if (part === undefined) break;
      encoded += part;
    }
    if (encoded === "") return null;
    try {
      return fromBase64Url(encoded);
    } catch {
      // A truncated or tampered cookie means "no session", never a thrown error.
      return null;
    }
  }

  setItem(key: string, value: string): void {
    const encoded = toBase64Url(value);
    const chunks: string[] = [];
    for (let offset = 0; offset < encoded.length; offset += CHUNK_SIZE) {
      chunks.push(encoded.slice(offset, offset + CHUNK_SIZE));
    }
    if (chunks.length > MAX_CHUNKS) {
      throw new Error("Session is too large to store in cookies");
    }
    for (let index = 0; index < MAX_CHUNKS; index += 1) {
      const chunk = chunks[index];
      if (chunk === undefined) {
        this.store.remove(this.chunkName(key, index), AUTH_COOKIE_OPTIONS);
      } else {
        this.store.set(this.chunkName(key, index), chunk, AUTH_COOKIE_OPTIONS);
      }
    }
  }

  removeItem(key: string): void {
    for (let index = 0; index < MAX_CHUNKS; index += 1) {
      this.store.remove(this.chunkName(key, index), AUTH_COOKIE_OPTIONS);
    }
  }
}

/** Replay buffered writes onto an outgoing response. */
export function applyCookieChanges(changes: CookieChange[], response: NextResponse): void {
  for (const change of changes) {
    if (change.value === null) {
      response.cookies.set({ name: change.name, value: "", ...change.options, maxAge: 0 });
    } else {
      response.cookies.set({ name: change.name, value: change.value, ...change.options });
    }
  }
}
