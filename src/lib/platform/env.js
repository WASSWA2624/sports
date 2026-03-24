import {
  DEFAULT_MARKET_GEO,
  GEO_LABELS,
  LAUNCH_MARKET_GEOS,
  normalizeGeo,
  parseGeoCsv,
} from "../coreui/route-context";
import { safeDataRead } from "../data-access";
import { db } from "../db";

function parseCsv(value) {
  return [...new Set(
    String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  )];
}

function parseBoolean(value, fallback = false) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value.trim().toLowerCase() !== "false";
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function pickString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseGeoKeyValueMap(value) {
  return String(value || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((map, entry) => {
      const [rawGeo, rawValues] = entry.split(":");
      const geo = parseGeoCsv(rawGeo, [DEFAULT_MARKET_GEO])[0] || DEFAULT_MARKET_GEO;
      const values = parseCsv(rawValues);

      if (!values.length) {
        return map;
      }

      map[geo] = values;
      return map;
    }, {});
}

function dedupeStrings(values) {
  return [...new Set(
    (values || [])
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
  )];
}

function normalizeGeoList(value, fallback = []) {
  if (Array.isArray(value)) {
    return dedupeStrings(value.map((entry) => normalizeGeo(entry, DEFAULT_MARKET_GEO)));
  }

  if (typeof value === "string") {
    return parseGeoCsv(value, fallback);
  }

  return [...fallback];
}

function toChannelLabel(value, fallback = "Action") {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "telegram") {
    return "Telegram";
  }

  if (normalized === "whatsapp") {
    return "WhatsApp";
  }

  if (!normalized) {
    return fallback;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getPlatformBootstrapConfig() {
  const launchGeos = parseGeoCsv(
    process.env.BOOKMAKER_LAUNCH_GEOS,
    [...LAUNCH_MARKET_GEOS]
  ).filter((geo) => geo !== DEFAULT_MARKET_GEO);
  const defaultGeo = parseGeoCsv(
    process.env.DEFAULT_MARKET_GEO,
    [launchGeos[0] || DEFAULT_MARKET_GEO]
  )[0] || DEFAULT_MARKET_GEO;
  const affiliatePartnerCodes = parseCsv(process.env.AFFILIATE_PARTNER_CODES);
  const primaryPartner =
    pickString(process.env.AFFILIATE_PRIMARY_PARTNER) || affiliatePartnerCodes[0] || null;
  const defaultFunnelGeos = launchGeos.length ? launchGeos : [...LAUNCH_MARKET_GEOS];

  return {
    defaultGeo,
    launchGeos,
    geoLabels: GEO_LABELS,
    search: {
      providerKey: pickString(process.env.SEARCH_PROVIDER_KEY),
      indexName: pickString(process.env.SEARCH_INDEX_NAME),
      predictionsProviderKey: pickString(process.env.PREDICTIONS_PROVIDER_KEY),
    },
    analytics: {
      writeKeyConfigured: Boolean(pickString(process.env.ANALYTICS_WRITE_KEY)),
    },
    notifications: {
      providerConfigured: Boolean(pickString(process.env.NOTIFICATION_PROVIDER_KEY)),
      pushConfigured: Boolean(pickString(process.env.PUSH_PUBLIC_KEY)),
    },
    ads: {
      providerCode: pickString(process.env.ADS_PROVIDER_CODE),
      rightRailSlot: pickString(process.env.ADS_RIGHT_RAIL_SLOT),
      inlineBoardSlot: pickString(process.env.ADS_INLINE_BOARD_SLOT),
    },
    consent: {
      vendorId: pickString(process.env.CONSENT_VENDOR_ID),
      regionMode: pickString(process.env.CONSENT_REGION_MODE, "global"),
    },
    affiliate: {
      partnerCodes: affiliatePartnerCodes,
      primaryPartner,
      defaultCtaUrl: pickString(process.env.AFFILIATE_DEFAULT_CTA_URL),
      partnerByGeo: parseGeoKeyValueMap(process.env.AFFILIATE_GEO_PARTNER_MAP),
      bookmakerByGeo: parseGeoKeyValueMap(process.env.BOOKMAKER_GEO_MAP),
    },
    funnel: {
      actions: [
        {
          key: "telegram",
          label: "Telegram",
          url: pickString(process.env.TELEGRAM_CTA_URL),
          enabledGeos: parseGeoCsv(
            process.env.TELEGRAM_CTA_ALLOWED_GEOS,
            defaultFunnelGeos
          ),
        },
        {
          key: "whatsapp",
          label: "WhatsApp",
          url: pickString(process.env.WHATSAPP_CTA_URL),
          enabledGeos: parseGeoCsv(
            process.env.WHATSAPP_CTA_ALLOWED_GEOS,
            defaultFunnelGeos
          ),
        },
      ].filter((action) => action.url),
    },
    runtime: {
      requestLoggingEnabled: parseBoolean(process.env.REQUEST_LOGGING_ENABLED, true),
      requestLogSampleRate: clampNumber(
        process.env.REQUEST_LOG_SAMPLE_RATE,
        0.01,
        1,
        1
      ),
    },
    auth: {
      authUrlConfigured: Boolean(pickString(process.env.AUTH_URL)),
      secretConfigured: Boolean(
        pickString(process.env.AUTH_SECRET) &&
          pickString(process.env.AUTH_SECRET) !== "replace_me"
      ),
    },
    assets: {
      remoteHosts: parseCsv(process.env.ASSET_REMOTE_HOSTS),
      cdnConfigured: Boolean(pickString(process.env.ASSET_CDN_BASE_URL)),
    },
  };
}

export function getPlatformPublicSnapshot() {
  const config = getPlatformBootstrapConfig();

  return {
    defaultGeo: config.defaultGeo,
    launchGeos: config.launchGeos,
    geoLabels: config.geoLabels,
    affiliate: {
      partnerCodes: config.affiliate.partnerCodes,
      primaryPartner: config.affiliate.primaryPartner,
      partnerByGeo: config.affiliate.partnerByGeo,
      bookmakerByGeo: config.affiliate.bookmakerByGeo,
    },
    funnel: {
      actions: config.funnel.actions.map((action) => ({
        key: action.key,
        label: action.label,
        url: action.url,
        enabledGeos: action.enabledGeos,
      })),
    },
    ads: config.ads,
    consent: config.consent,
    search: {
      indexName: config.search.indexName,
      predictionsProviderKey: config.search.predictionsProviderKey,
    },
  };
}

export async function getPlatformPublicSnapshotData() {
  const fallback = getPlatformPublicSnapshot();

  return safeDataRead(
    async () => {
      const [affiliateLinks, funnelEntries] = await Promise.all([
        db.affiliateLink.findMany({
          where: {
            isActive: true,
            bookmaker: {
              is: {
                isActive: true,
              },
            },
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          include: {
            bookmaker: true,
          },
        }),
        db.funnelEntry.findMany({
          where: {
            isActive: true,
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        }),
      ]);

      const partnerCodes = [];
      const partnerByGeo = {};
      const bookmakerByGeo = {};

      for (const link of affiliateLinks) {
        const geo = normalizeGeo(link.territory, DEFAULT_MARKET_GEO);
        const partnerCode = link.bookmaker?.code || link.code || link.bookmaker?.name || null;
        const bookmakerLabel =
          link.bookmaker?.shortName || link.bookmaker?.name || link.bookmaker?.code || null;

        if (partnerCode) {
          partnerCodes.push(partnerCode);
          partnerByGeo[geo] = dedupeStrings([...(partnerByGeo[geo] || []), partnerCode]);
        }

        if (bookmakerLabel) {
          bookmakerByGeo[geo] = dedupeStrings([
            ...(bookmakerByGeo[geo] || []),
            bookmakerLabel,
          ]);
        }
      }

      const actions = funnelEntries.map((entry) => ({
        key: String(entry.channel || entry.key || entry.id).trim().toLowerCase(),
        label: toChannelLabel(entry.channel, entry.title || "Action"),
        url: entry.ctaUrl,
        enabledGeos: normalizeGeoList(
          entry.enabledGeos,
          entry.territory ? [normalizeGeo(entry.territory, DEFAULT_MARKET_GEO)] : []
        ),
      }));

      if (!partnerCodes.length && !actions.length) {
        return fallback;
      }

      const launchGeos = dedupeStrings([
        ...fallback.launchGeos,
        ...Object.keys(partnerByGeo),
        ...Object.keys(bookmakerByGeo),
        ...actions.flatMap((action) => action.enabledGeos || []),
      ]).filter((geo) => geo !== DEFAULT_MARKET_GEO);

      return {
        ...fallback,
        launchGeos: launchGeos.length ? launchGeos : fallback.launchGeos,
        affiliate: {
          partnerCodes: dedupeStrings([...fallback.affiliate.partnerCodes, ...partnerCodes]),
          primaryPartner:
            partnerByGeo[fallback.defaultGeo]?.[0] ||
            partnerByGeo[launchGeos[0]]?.[0] ||
            dedupeStrings([...fallback.affiliate.partnerCodes, ...partnerCodes])[0] ||
            fallback.affiliate.primaryPartner,
          partnerByGeo: {
            ...fallback.affiliate.partnerByGeo,
            ...partnerByGeo,
          },
          bookmakerByGeo: {
            ...fallback.affiliate.bookmakerByGeo,
            ...bookmakerByGeo,
          },
        },
        funnel: {
          actions: actions.length ? actions : fallback.funnel.actions,
        },
      };
    },
    fallback,
    { label: "Platform public snapshot" }
  );
}

export function getPlatformHealthSnapshot() {
  const config = getPlatformBootstrapConfig();

  return {
    defaultGeo: config.defaultGeo,
    launchGeos: config.launchGeos,
    requestLoggingEnabled: config.runtime.requestLoggingEnabled,
    readiness: {
      authConfigured: config.auth.authUrlConfigured && config.auth.secretConfigured,
      analyticsConfigured: config.analytics.writeKeyConfigured,
      notificationsConfigured: config.notifications.providerConfigured,
      adsConfigured: Boolean(
        config.ads.providerCode ||
          config.ads.rightRailSlot ||
          config.ads.inlineBoardSlot
      ),
      affiliateConfigured: config.affiliate.partnerCodes.length > 0,
      funnelConfigured: config.funnel.actions.length > 0,
      assetHostsConfigured: config.assets.remoteHosts.length > 0,
    },
  };
}
