import { afterEach, describe, expect, it } from "vitest";
import {
  getPlatformBootstrapConfig,
  getPlatformHealthSnapshot,
  getPlatformPublicSnapshot,
} from "../platform/env";

const originalEnv = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

describe("platform env", () => {
  afterEach(() => {
    resetEnv();
  });

  it("builds the public platform snapshot from geo, affiliate, and funnel env", () => {
    process.env.DEFAULT_MARKET_GEO = "UG";
    process.env.BOOKMAKER_LAUNCH_GEOS = "UG,KE,NG";
    process.env.AFFILIATE_PARTNER_CODES = "PULSEBOOK,NORTHLINE";
    process.env.AFFILIATE_PRIMARY_PARTNER = "PULSEBOOK";
    process.env.AFFILIATE_GEO_PARTNER_MAP = "UG:PULSEBOOK;KE:NORTHLINE";
    process.env.BOOKMAKER_GEO_MAP = "UG:PULSEBOOK;KE:NORTHLINE";
    process.env.TELEGRAM_CTA_URL = "https://t.me/sportspulse";
    process.env.TELEGRAM_CTA_ALLOWED_GEOS = "UG,KE";

    const config = getPlatformBootstrapConfig();
    const snapshot = getPlatformPublicSnapshot();

    expect(config.defaultGeo).toBe("UG");
    expect(config.launchGeos).toEqual(["UG", "KE", "NG"]);
    expect(snapshot.affiliate).toMatchObject({
      primaryPartner: "PULSEBOOK",
      partnerCodes: ["PULSEBOOK", "NORTHLINE"],
      partnerByGeo: {
        UG: ["PULSEBOOK"],
        KE: ["NORTHLINE"],
      },
    });
    expect(snapshot.funnel.actions).toEqual([
      {
        key: "telegram",
        label: "Telegram",
        url: "https://t.me/sportspulse",
        enabledGeos: ["UG", "KE"],
      },
    ]);
  });

  it("reports readiness booleans without exposing secrets", () => {
    process.env.DEFAULT_MARKET_GEO = "UG";
    process.env.AUTH_SECRET = "replace_me";
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.NOTIFICATION_PROVIDER_KEY = "notify";
    process.env.ANALYTICS_WRITE_KEY = "";
    process.env.AFFILIATE_PARTNER_CODES = "PULSEBOOK";
    process.env.TELEGRAM_CTA_URL = "https://t.me/sportspulse";
    process.env.ASSET_REMOTE_HOSTS = "cdn.sportmonks.com";
    process.env.REQUEST_LOGGING_ENABLED = "true";

    const health = getPlatformHealthSnapshot();

    expect(health).toMatchObject({
      defaultGeo: "UG",
      requestLoggingEnabled: true,
      readiness: {
        authConfigured: false,
        analyticsConfigured: false,
        notificationsConfigured: true,
        affiliateConfigured: true,
        funnelConfigured: true,
        assetHostsConfigured: true,
      },
    });
  });
});
