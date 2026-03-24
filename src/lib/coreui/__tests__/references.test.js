import { describe, expect, it } from "vitest";
import { buildReferenceCandidates, buildReferenceWhere } from "../references";

describe("coreui references", () => {
  it("keeps both encoded and decoded candidates for route params", () => {
    expect(buildReferenceCandidates("DNK%20SL")).toEqual(["DNK%20SL", "DNK SL"]);
  });

  it("dedupes already-decoded references", () => {
    expect(buildReferenceCandidates("EPL")).toEqual(["EPL"]);
  });

  it("builds an OR lookup for each candidate and field", () => {
    expect(buildReferenceWhere("DNK%20SL", ["id", "code", "externalRef"])).toEqual({
      OR: [
        { id: "DNK%20SL" },
        { code: "DNK%20SL" },
        { externalRef: "DNK%20SL" },
        { id: "DNK SL" },
        { code: "DNK SL" },
        { externalRef: "DNK SL" },
      ],
    });
  });
});
