export const PRIMARY_SPORT_CODE = "football";
export const PRIMARY_SPORT_SLUG = "football";

export function buildPrimarySportRelationFilter() {
  return {
    is: {
      code: PRIMARY_SPORT_CODE,
    },
  };
}

export function isPrimarySportReference(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === PRIMARY_SPORT_CODE || normalized === PRIMARY_SPORT_SLUG || normalized === "soccer";
}
