import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isDataAccessTimeoutError,
  safeDataRead,
  withDataAccessTimeout,
} from "../data-access";

describe("data access timeouts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects slow reads with a timeout error", async () => {
    const pending = withDataAccessTimeout(() => new Promise(() => {}), {
      label: "Fixture read",
      timeoutMs: 50,
    });
    const rejection = expect(pending).rejects.toMatchObject({
      code: "DATA_ACCESS_TIMEOUT",
      name: "DataAccessTimeoutError",
    });

    await vi.advanceTimersByTimeAsync(50);
    await rejection;

    await pending.catch((error) => {
      expect(isDataAccessTimeoutError(error)).toBe(true);
    });
  });

  it("returns the fallback when a read times out", async () => {
    const pending = safeDataRead(() => new Promise(() => {}), ["fallback"], {
      label: "League read",
      timeoutMs: 25,
    });

    await vi.advanceTimersByTimeAsync(25);

    await expect(pending).resolves.toEqual(["fallback"]);
  });

  it("preserves successful reads", async () => {
    await expect(
      safeDataRead(() => Promise.resolve({ ok: true }), { ok: false }, { timeoutMs: 25 })
    ).resolves.toEqual({ ok: true });
  });
});
