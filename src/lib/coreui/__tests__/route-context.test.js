import { describe, expect, it } from "vitest";
import {
  appendRouteContext,
  getGeoLabel,
  isGeoAllowed,
  normalizeGeo,
  parseGeoCsv,
} from "../route-context";

describe("route context helpers", () => {
  it("normalizes supported and unsupported geos safely", () => {
    expect(normalizeGeo("ug")).toBe("UG");
    expect(normalizeGeo("GLOBAL")).toBe("INTL");
    expect(normalizeGeo("us")).toBe("INTL");
  });

  it("parses geo CSV values with deduping", () => {
    expect(parseGeoCsv("ug,ke,ug")).toEqual(["UG", "KE"]);
  });

  it("adds the geo query parameter to relative and absolute hrefs", () => {
    expect(appendRouteContext("/en/leagues/EPL", { geo: "KE" })).toBe(
      "/en/leagues/EPL?geo=KE"
    );
    expect(
      appendRouteContext("https://sports.example/en/funnels?auth=required", {
        geo: "UG",
      })
    ).toBe("https://sports.example/en/funnels?auth=required&geo=UG");
  });

  it("checks geo allowlists and labels", () => {
    expect(isGeoAllowed("UG", ["UG", "KE"])).toBe(true);
    expect(isGeoAllowed("NG", ["UG", "KE"])).toBe(false);
    expect(getGeoLabel("INTL")).toBe("International");
  });
});
