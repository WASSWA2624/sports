import { formatFavoriteItemId, normalizeFavoritePayload, parseFavoriteItemId } from "./favorites";

export const ALERT_NOTIFICATION_TYPES = [
  "KICKOFF",
  "GOAL",
  "CARD",
  "PERIOD_CHANGE",
  "FINAL_RESULT",
];

const ALERT_TYPE_ALIASES = {
  kickoff: "KICKOFF",
  KICKOFF: "KICKOFF",
  goal: "GOAL",
  goals: "GOAL",
  GOAL: "GOAL",
  card: "CARD",
  cards: "CARD",
  CARD: "CARD",
  periodchange: "PERIOD_CHANGE",
  period_change: "PERIOD_CHANGE",
  periodChange: "PERIOD_CHANGE",
  PERIOD_CHANGE: "PERIOD_CHANGE",
  finalresult: "FINAL_RESULT",
  final_result: "FINAL_RESULT",
  finalResult: "FINAL_RESULT",
  FINAL_RESULT: "FINAL_RESULT",
};

export function normalizeAlertType(value) {
  const normalized = ALERT_TYPE_ALIASES[String(value || "").trim()];
  return ALERT_NOTIFICATION_TYPES.includes(normalized) ? normalized : null;
}

export function normalizeAlertTypes(values = []) {
  const list = Array.isArray(values) ? values : [values];

  return [
    ...new Set(
      list
        .map((value) => normalizeAlertType(value))
        .filter(Boolean)
    ),
  ];
}

export function normalizeAlertSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(settings)
      .map(([itemId, notificationTypes]) => {
        try {
          const normalizedItemId = formatFavoriteItemId(parseFavoriteItemId(itemId));
          const normalizedTypes = normalizeAlertTypes(notificationTypes);

          if (!normalizedItemId || !normalizedTypes.length) {
            return null;
          }

          return [normalizedItemId, normalizedTypes];
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean)
  );
}

export function mergeAlertSettings(...settingsEntries) {
  return settingsEntries.reduce((accumulator, entry) => {
    const normalized = normalizeAlertSettings(entry);

    Object.entries(normalized).forEach(([itemId, notificationTypes]) => {
      const existing = accumulator[itemId] || [];
      accumulator[itemId] = [...new Set([...existing, ...notificationTypes])];
    });

    return accumulator;
  }, {});
}

export function formatAlertSubscriptionItem(itemId, notificationTypes) {
  const normalizedTypes = normalizeAlertTypes(notificationTypes);

  if (!itemId || !normalizedTypes.length) {
    return null;
  }

  const favorite = normalizeFavoritePayload({ itemId });

  return {
    ...favorite,
    itemId: formatFavoriteItemId(favorite),
    notificationTypes: normalizedTypes,
  };
}

export function buildAlertSettingsMap(items = []) {
  return items.reduce((accumulator, item) => {
    const itemId = formatFavoriteItemId(item);
    const notificationType = normalizeAlertType(item.notificationType);

    if (!itemId || !notificationType || item.isEnabled === false) {
      return accumulator;
    }

    accumulator[itemId] = [...new Set([...(accumulator[itemId] || []), notificationType])];
    return accumulator;
  }, {});
}
