import { describe, expect, it } from "vitest";
import {
  AUTH_COOKIE_PREFIX,
  BufferedCookieStore,
  ChunkedCookieStorage,
  ReadOnlyCookieStore,
} from "@/lib/auth/cookies";

describe("BufferedCookieStore", () => {
  it("reads what the incoming request carried", () => {
    const store = new BufferedCookieStore([
      { name: "a", value: "1" },
      { name: "b", value: "2" },
    ]);
    expect(store.get("a")).toBe("1");
    expect(store.get("b")).toBe("2");
    expect(store.get("missing")).toBeUndefined();
  });

  it("buffers writes instead of touching the response directly", () => {
    const store = new BufferedCookieStore([{ name: "a", value: "old" }]);
    expect(store.drain()).toHaveLength(0);

    store.set("a", "new");
    store.remove("b");

    // Reads see the pending state immediately, so a read-your-writes helper works.
    expect(store.get("a")).toBe("new");
    expect(store.get("b")).toBeUndefined();

    const changes = store.drain();
    expect(changes).toHaveLength(2);
    expect(changes[0]?.name).toBe("a");
    expect(changes[0]?.value).toBe("new");
    expect(changes[1]?.name).toBe("b");
    expect(changes[1]?.value).toBeNull();
    // Removals carry an expired max-age, so browsers drop the cookie.
    expect(changes[1]?.options.maxAge).toBe(0);
  });

  it("applies the shared defaults: httpOnly, sameSite=lax, path=/", () => {
    const store = new BufferedCookieStore([]);
    store.set("session", "value");
    const [change] = store.drain();
    expect(change?.options.httpOnly).toBe(true);
    expect(change?.options.sameSite).toBe("lax");
    expect(change?.options.path).toBe("/");
  });

  it("keeps reads in insertion order and never mutates the input", () => {
    const incoming = [{ name: "a", value: "1" }];
    const store = new BufferedCookieStore(incoming);
    store.set("a", "2");
    expect(incoming[0]?.value).toBe("1");
  });
});

describe("ReadOnlyCookieStore", () => {
  it("reads values and silently ignores writes", () => {
    const store = new ReadOnlyCookieStore([{ name: "a", value: "1" }]);
    store.set("a", "tampered");
    store.remove("a");
    expect(store.get("a")).toBe("1");
  });
});

describe("ChunkedCookieStorage", () => {
  it("returns null when nothing has been written", () => {
    const storage = new ChunkedCookieStorage(new BufferedCookieStore([]));
    expect(storage.getItem("sb-1-token")).toBeNull();
  });

  it("round-trips a value", () => {
    const store = new BufferedCookieStore([]);
    const storage = new ChunkedCookieStorage(store, AUTH_COOKIE_PREFIX);
    const session = JSON.stringify({ access_token: "abc", user: { sub: "42" } });

    storage.setItem("sb-1-token", session);
    expect(storage.getItem("sb-1-token")).toBe(session);
    expect(store.get(`${AUTH_COOKIE_PREFIX}-sb-1-token-0`)).toBeTruthy();
  });

  it("splits a session larger than one cookie across chunks", () => {
    const store = new BufferedCookieStore([]);
    const storage = new ChunkedCookieStorage(store, AUTH_COOKIE_PREFIX);
    const large = JSON.stringify({ access_token: "x".repeat(9000) });

    storage.setItem("sb-1-token", large);

    const first = store.get(`${AUTH_COOKIE_PREFIX}-sb-1-token-0`);
    const second = store.get(`${AUTH_COOKIE_PREFIX}-sb-1-token-1`);
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    // No single chunk may reach the ~4 KB per-cookie ceiling.
    expect((first ?? "").length).toBeLessThan(3100);
    expect(storage.getItem("sb-1-token")).toBe(large);
  });

  it("treats a truncated or tampered cookie as no session", () => {
    const store = new BufferedCookieStore([
      { name: `${AUTH_COOKIE_PREFIX}-sb-1-token-0`, value: "not-base64url-!!!" },
    ]);
    const storage = new ChunkedCookieStorage(store, AUTH_COOKIE_PREFIX);
    expect(storage.getItem("sb-1-token")).toBeNull();
  });

  it("removes every chunk, not just the first", () => {
    const store = new BufferedCookieStore([]);
    const storage = new ChunkedCookieStorage(store, AUTH_COOKIE_PREFIX);
    storage.setItem("sb-1-token", JSON.stringify({ access_token: "y".repeat(9000) }));

    storage.removeItem("sb-1-token");

    for (let index = 0; index < 6; index += 1) {
      expect(store.get(`${AUTH_COOKIE_PREFIX}-sb-1-token-${index}`)).toBeUndefined();
    }
  });
});
