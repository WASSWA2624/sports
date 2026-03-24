import { getSportsSyncConfig } from "./config";
import { getProviderDescriptor } from "./provider";

const DEFAULT_SPORT = {
  code: "football",
  slug: "football",
  name: "Football",
};

const PROVIDER_ROLE_PRIORITIES = {
  primary: 10,
  backup: 20,
  "odds-feed": 25,
  alternative: 30,
  marketplace: 35,
  expansion: 40,
  niche: 45,
  enterprise: 50,
  community: 60,
};

function slugify(value, fallback = "entity") {
  const normalized = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function toTitleCase(value) {
  return String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mergeMetadata(existingMetadata, nextMetadata) {
  const existing =
    existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};
  const next = nextMetadata && typeof nextMetadata === "object" ? nextMetadata : {};

  return {
    ...existing,
    ...next,
  };
}

export function getProviderPriority(role = "alternative") {
  return PROVIDER_ROLE_PRIORITIES[role] || 100;
}

export function getProviderContext(providerCode = null) {
  const config = getSportsSyncConfig(providerCode);
  const descriptor = getProviderDescriptor(config.provider);
  const sportCode = config.primarySport || DEFAULT_SPORT.code;

  return {
    providerCode: config.provider,
    providerName: descriptor?.name || config.provider,
    providerFamily: descriptor?.adapter || "custom",
    providerNamespace: descriptor?.envNamespace || config.provider,
    providerRole: descriptor?.role || "primary",
    providerTier: descriptor?.tier || "live",
    providerPriority: getProviderPriority(descriptor?.role),
    providerSports: descriptor?.sports?.length ? descriptor.sports : [sportCode],
    providerCapabilities: [...(descriptor?.capabilities || [])],
    providerFallbackFor: [...(descriptor?.fallbackFor || [])],
    providerNotes: descriptor?.notes || null,
    providerDocsUrl: descriptor?.docsUrl || null,
    providerImplemented: Boolean(descriptor?.implemented),
    providerCredentialConfigured: Boolean(config.apiKey),
    providerAuthLocation: config.authLocation || "custom",
    providerAuthHeader: config.authHeader || null,
    providerAuthScheme: config.authScheme || null,
    providerAuthQueryKey: config.authQueryKey || null,
    providerApiHost: config.apiHost || null,
    providerBaseUrl: config.baseUrl || null,
    providerOddsBaseUrl: config.oddsBaseUrl || null,
    providerNewsBaseUrl: config.newsBaseUrl || null,
    providerAssetHosts: [...(config.assetHosts || [])],
    providerTimeoutMs: config.timeoutMs || null,
    sport: {
      code: sportCode,
      slug: slugify(sportCode, DEFAULT_SPORT.slug),
      name: toTitleCase(sportCode) || DEFAULT_SPORT.name,
    },
  };
}

export function buildProviderMetadata(providerContext) {
  return {
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    family: providerContext.providerFamily,
    namespace: providerContext.providerNamespace,
    sports: providerContext.providerSports,
    capabilities: providerContext.providerCapabilities,
    fallbackFor: providerContext.providerFallbackFor,
    assetHosts: providerContext.providerAssetHosts,
    auth: {
      location: providerContext.providerAuthLocation,
      header: providerContext.providerAuthHeader,
      scheme: providerContext.providerAuthScheme,
      queryKey: providerContext.providerAuthQueryKey,
      host: providerContext.providerApiHost,
    },
    endpoints: {
      baseUrl: providerContext.providerBaseUrl,
      oddsBaseUrl: providerContext.providerOddsBaseUrl,
      newsBaseUrl: providerContext.providerNewsBaseUrl,
    },
    docsUrl: providerContext.providerDocsUrl,
    note: providerContext.providerNotes,
    implemented: providerContext.providerImplemented,
    adapterReady: providerContext.providerImplemented ? "implemented" : "cataloged",
    priority: providerContext.providerPriority,
    credentialConfigured: providerContext.providerCredentialConfigured,
    timeoutMs: providerContext.providerTimeoutMs,
  };
}

export async function upsertSourceProviderRecord(
  client,
  providerContext,
  { defaultActive = true, fallbackProviderId = undefined } = {}
) {
  const existing = await client.sourceProvider.findUnique({
    where: {
      code: providerContext.providerCode,
    },
    select: {
      metadata: true,
    },
  });

  const data = {
    name: providerContext.providerName,
    kind: `${providerContext.sport.code}-feed`,
    family: providerContext.providerFamily,
    namespace: providerContext.providerNamespace,
    role: providerContext.providerRole,
    tier: providerContext.providerTier,
    priority: providerContext.providerPriority,
    metadata: mergeMetadata(existing?.metadata, buildProviderMetadata(providerContext)),
    ...(fallbackProviderId !== undefined ? { fallbackProviderId } : {}),
  };

  if (existing) {
    return client.sourceProvider.update({
      where: {
        code: providerContext.providerCode,
      },
      data,
    });
  }

  return client.sourceProvider.create({
    data: {
      code: providerContext.providerCode,
      isActive: defaultActive,
      ...data,
    },
  });
}
