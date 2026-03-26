import { describe, expect, it, vi } from "vitest";

const getReleaseInfo = vi.fn(() => ({
  version: "0.1.0-test",
  channel: "test",
  commitSha: "abc123",
  buildId: "BUILD_TEST",
}));

vi.mock("../../../../lib/release", () => ({
  getReleaseInfo,
}));

const { GET } = await import("../route.js");

describe("GET /api/health", () => {
  it("returns the minimal football-scores health contract", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      service: "sports",
      scope: "football-scores",
      release: {
        version: "0.1.0-test",
        channel: "test",
      },
    });
    expect(typeof payload.timestamp).toBe("string");
  });
});
