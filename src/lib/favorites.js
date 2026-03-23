const ENTITY_TYPE_BY_PREFIX = {
  fixture: "FIXTURE",
  team: "TEAM",
  competition: "COMPETITION",
};

const PREFIX_BY_ENTITY_TYPE = {
  FIXTURE: "fixture",
  TEAM: "team",
  COMPETITION: "competition",
};

export function parseFavoriteItemId(itemId) {
  const [prefix, entityId] = String(itemId || "").split(":");
  const entityType = ENTITY_TYPE_BY_PREFIX[prefix];

  if (!entityType || !entityId) {
    throw new Error("Invalid favorite item id.");
  }

  return {
    entityType,
    entityId,
  };
}

export function formatFavoriteItemId(input) {
  const entityType = input?.entityType || input?.type;
  const entityId = input?.entityId || input?.id;
  const prefix = PREFIX_BY_ENTITY_TYPE[entityType];

  if (!prefix || !entityId) {
    return null;
  }

  return `${prefix}:${entityId}`;
}

export function normalizeFavoritePayload(payload) {
  if (payload?.itemId) {
    return parseFavoriteItemId(payload.itemId);
  }

  if (payload?.entityType && payload?.entityId) {
    return {
      entityType: String(payload.entityType).toUpperCase(),
      entityId: String(payload.entityId),
    };
  }

  throw new Error("Favorite payload must include itemId or entityType/entityId.");
}

export function normalizeFavoriteItems(itemIds = []) {
  return [
    ...new Set(
      itemIds
        .map((itemId) => formatFavoriteItemId(parseFavoriteItemId(itemId)))
        .filter(Boolean)
    ),
  ];
}
