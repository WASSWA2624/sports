"use client";

import { useState } from "react";
import sharedStyles from "../../../components/coreui/styles.module.css";
import styles from "./admin-console.module.css";
import { KNOWN_CACHE_TAGS } from "../../../lib/cache-tags";

const FAILURE_DRILL_SCENARIOS = [
  {
    key: "provider_outage",
    label: "Provider outage",
  },
  {
    key: "delayed_live_feed",
    label: "Delayed live feed",
  },
  {
    key: "search_degradation",
    label: "Search degradation",
  },
  {
    key: "cache_invalidation_issue",
    label: "Cache invalidation",
  },
];

function formatDateTime(value, locale) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

function formatMetric(value, suffix = "") {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value)}${suffix}`;
}

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getUserIdentity(user) {
  return user?.loginIdentifier || user?.email || user?.phoneNumber || user?.username || "Unknown user";
}

function getUserMetaLine(user) {
  return [user?.username ? `@${user.username}` : null, user?.displayName || null]
    .filter(Boolean)
    .join(" | ");
}

function buildDraftState(workspace) {
  return {
    users: Object.fromEntries(
      (workspace.users || []).map((user) => [
        user.id,
        {
          isActive: Boolean(user.isActive),
          roles: [...(user.roleNames || [])],
        },
      ])
    ),
    providers: Object.fromEntries(
      (workspace.providers || []).map((provider) => [
        provider.code,
        {
          isActive: Boolean(provider.isActive),
          note: provider.metadata?.adminNote || "",
        },
      ])
    ),
    modules: Object.fromEntries(
      (workspace.shellModules || []).map((module) => [
        module.key,
        {
          isEnabled: Boolean(module.isEnabled),
          emergencyDisabled: Boolean(module.emergencyDisabled),
          emergencyReason: module.emergencyReason || "",
        },
      ])
    ),
    adSlots: Object.fromEntries(
      (workspace.adSlots || []).map((slot) => [
        slot.key,
        {
          name: slot.name || "",
          placement: slot.placement || "",
          size: slot.size || "",
          copy: slot.copy || "",
          ctaLabel: slot.ctaLabel || "",
          ctaUrl: slot.ctaUrl || "",
          isEnabled: Boolean(slot.isEnabled),
        },
      ])
    ),
    consentTexts: Object.fromEntries(
      (workspace.consentTexts || []).map((entry) => [
        `${entry.key}:${entry.locale}`,
        {
          locale: entry.locale,
          title: entry.title || "",
          body: entry.body || "",
          version: entry.version || 1,
          isActive: Boolean(entry.isActive),
        },
      ])
    ),
    bookmakers: Object.fromEntries(
      (workspace.commercial?.bookmakers || []).map((bookmaker) => [
        bookmaker.code,
        {
          name: bookmaker.name || "",
          shortName: bookmaker.shortName || "",
          websiteUrl: bookmaker.websiteUrl || "",
          affiliateBaseUrl: bookmaker.affiliateBaseUrl || "",
          isActive: Boolean(bookmaker.isActive),
        },
      ])
    ),
    affiliateLinks: Object.fromEntries(
      (workspace.commercial?.affiliateLinks || []).map((entry) => [
        entry.key,
        {
          territory: entry.territory || "",
          locale: entry.locale || "",
          surface: entry.surface || "",
          linkType: entry.linkType || "",
          destinationUrl: entry.destinationUrl || "",
          fallbackUrl: entry.fallbackUrl || "",
          isDefault: Boolean(entry.isDefault),
          isActive: Boolean(entry.isActive),
          priority: entry.priority ?? 100,
        },
      ])
    ),
    funnelEntries: Object.fromEntries(
      (workspace.commercial?.funnelEntries || []).map((entry) => [
        entry.key,
        {
          channel: entry.channel || "",
          surface: entry.surface || "",
          title: entry.title || "",
          description: entry.description || "",
          ctaLabel: entry.ctaLabel || "",
          ctaUrl: entry.ctaUrl || "",
          territory: entry.territory || "",
          enabledGeos: (entry.enabledGeos || []).join(", "),
          isActive: Boolean(entry.isActive),
          priority: entry.priority ?? 100,
        },
      ])
    ),
    predictions: Object.fromEntries(
      (workspace.commercial?.predictionRecommendations || []).map((entry) => [
        entry.key,
        {
          title: entry.title || "",
          summary: entry.summary || "",
          isPublished: Boolean(entry.isPublished),
          publishedAt: toDateTimeLocal(entry.publishedAt),
          expiresAt: toDateTimeLocal(entry.expiresAt),
          reviewStatus: entry.reviewStatus || "PENDING",
          reviewNotes: entry.reviewNotes || "",
        },
      ])
    ),
    placements: Object.fromEntries(
      (workspace.commercial?.monetizationPlacements || []).map((entry) => [
        entry.key,
        {
          title: entry.title || "",
          description: entry.description || "",
          priority: entry.priority ?? 100,
          isActive: Boolean(entry.isActive),
          startsAt: toDateTimeLocal(entry.startsAt),
          endsAt: toDateTimeLocal(entry.endsAt),
        },
      ])
    ),
    issues: Object.fromEntries(
      (workspace.issues?.items || []).map((issue) => [
        issue.id,
        {
          status: issue.status,
          priority: issue.priority,
          assigneeUserId: issue.assignee?.id || "",
          resolutionSummary: issue.resolutionSummary || "",
        },
      ])
    ),
  };
}

function statusClass(value) {
  if (
    [
      "healthy",
      "available",
      "OPEN",
      "INVESTIGATING",
      "SUCCESS",
      "ready",
      "pass",
      "live",
      "published",
      "implemented",
      "active",
    ].includes(value)
  ) {
    return styles.statusGood;
  }

  if (
    [
      "warning",
      "attention",
      "PENDING",
      "RUNNING",
      "MEDIUM",
      "degraded",
      "throttled",
      "scheduled",
      "draft",
      "catalog only",
    ].includes(value)
  ) {
    return styles.statusWarn;
  }

  if (
    ["critical", "failed", "FAILED", "HIGH", "CRITICAL", "DISMISSED", "paused", "expired"].includes(
      value
    )
  ) {
    return styles.statusCritical;
  }

  return styles.statusNeutral;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export default function AdminConsoleClient({ locale, dictionary, initialWorkspace }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [drafts, setDrafts] = useState(() => buildDraftState(initialWorkspace));
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [workingKey, setWorkingKey] = useState("");
  const [issueForm, setIssueForm] = useState({
    issueType: "WRONG_SCORE",
    priority: "MEDIUM",
    title: "",
    description: "",
    fixtureId: "",
    articleId: "",
    entityType: "",
    entityId: "",
  });
  const t = (key, fallback) => dictionary?.[key] || fallback;

  const operatorOptions = workspace.users.filter((user) =>
    user.roleNames.some((role) => ["ADMIN", "EDITOR"].includes(role))
  );
  const observability = workspace.ops?.observability || {
    latency: {},
    cache: {},
    search: {},
    pressure: {},
    drills: { recent: [], statusCounts: {} },
    slos: [],
    liveData: {},
    providers: [],
    summary: {},
  };
  const assetDelivery = workspace.assets || {
    strategy: [],
    coverage: {
      competitions: {},
      teams: {},
      articles: {},
    },
  };
  const providerChain = workspace.providerChain || [];
  const providerSelection = workspace.providerSelection || {
    code: null,
    name: null,
    adapterFamily: null,
    implemented: false,
    envNamespace: null,
    supportedSports: [],
    capabilities: [],
    enabledCapabilities: [],
    fallbackProviders: [],
  };
  const commercial = workspace.commercial || {
    bookmakers: [],
    affiliateLinks: [],
    funnelEntries: [],
    predictionRecommendations: [],
    monetizationPlacements: [],
    topSurfaces: [],
    summary: {},
  };

  async function refreshWorkspace() {
    const nextWorkspace = await requestJson("/api/admin/control-plane");
    setWorkspace(nextWorkspace);
    setDrafts(buildDraftState(nextWorkspace));
    return nextWorkspace;
  }

  function updateDraft(section, key, patch) {
    setDrafts((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: {
          ...current[section][key],
          ...patch,
        },
      },
    }));
  }

  async function runAction(actionKey, task, successMessage) {
    setWorkingKey(actionKey);
    setMessage("");

    try {
      await task();
      await refreshWorkspace();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error.message || "Action failed.");
    } finally {
      setWorkingKey("");
    }
  }

  async function verifyStepUp() {
    setWorkingKey("step-up");
    setMessage("");

    try {
      await requestJson("/api/auth/step-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password,
          purpose: "admin",
        }),
      });
      setPassword("");
      setMessage(t("adminStepUpSuccess", "Admin verification refreshed for the next few minutes."));
    } catch (error) {
      setMessage(error.message || t("adminStepUpError", "Verification failed."));
    } finally {
      setWorkingKey("");
    }
  }

  return (
    <section className={sharedStyles.section}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{t("adminEyebrow", "Admin")}</p>
          <h1 className={sharedStyles.pageTitle}>
            {t("adminControlRoomTitle", "Admin Control Room")}
          </h1>
          <p className={sharedStyles.pageLead}>
            {t(
              "adminControlRoomLead",
              "Live operational visibility, emergency controls, editorial safety, and immutable audit records from one surface."
            )}
          </p>
        </div>
        <div className={sharedStyles.inlineBadgeRow}>
          <span className={sharedStyles.badge}>
            {t("adminAdminsCount", "Admins")} {workspace.summary.adminUsers}
          </span>
          <span className={sharedStyles.badge}>
            {t("adminProvidersCount", "Providers")} {workspace.summary.activeProviders}
          </span>
          <span className={sharedStyles.badge}>
            {t("adminOpenIssuesCount", "Open issues")} {workspace.summary.openIssues}
          </span>
          <span className={sharedStyles.badge}>
            {t("adminCacheAttentionCount", "Cache attention")} {workspace.summary.cacheAttentionCount}
          </span>
          <span className={sharedStyles.badge}>
            {t("adminDrillsCount", "Drills 24h")} {workspace.summary.drillRunsLast24Hours}
          </span>
          <span className={sharedStyles.badge}>
            {t("adminCommercialAttentionCount", "Commercial attention")}{" "}
            {workspace.summary.commercialAttentionCount || 0}
          </span>
        </div>
      </header>

      <div className={styles.surface}>
        <article className={sharedStyles.panel}>
          <div className={styles.split}>
            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <span>Failed jobs 24h</span>
                <strong>{workspace.sync.summary.failedJobsLast24Hours}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Stale live fixtures</span>
                <strong>{workspace.ops.staleData.liveFixtures}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Live read p95</span>
                <strong>{formatMetric(observability.latency?.p95Ms, "ms")}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Cache hit rate</span>
                <strong>{formatPercent(observability.cache?.hitRate)}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Search p95</span>
                <strong>{formatMetric(observability.search?.p95Ms, "ms")}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Route errors 1h</span>
                <strong>{workspace.summary.routeErrorsLastHour}</strong>
              </div>
            </div>

            <div className={styles.stack}>
              <label className={styles.field}>
                <span>{t("adminStepUpLabel", "Admin step-up password")}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t(
                    "adminStepUpPlaceholder",
                    "Re-enter password for sensitive actions"
                  )}
                />
              </label>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={workingKey === "step-up"}
                onClick={verifyStepUp}
              >
                {workingKey === "step-up"
                  ? t("adminStepUpVerifying", "Verifying...")
                  : t("adminStepUpRefresh", "Refresh admin verification")}
              </button>
              {message ? <p className={styles.smallText}>{message}</p> : null}
            </div>
          </div>
        </article>

        <div className={styles.split}>
          <div className={styles.stack}>
            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Operations</p>
                  <h2 className={sharedStyles.sectionTitle}>Sync and cache</h2>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {providerChain.map((provider) => (
                  <div key={provider.code} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong className={styles.code}>{provider.code}</strong>
                      <span className={statusClass(provider.role === "backup" ? "attention" : "healthy")}>
                        {provider.role}
                      </span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{provider.name}</span>
                      <span>{provider.tier}</span>
                      <span>{provider.sports.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.actionRow}>
                {["static-ish", "daily", "high-frequency", "catalog"].map((job) => (
                  <button
                    key={job}
                    type="button"
                    className={styles.primaryButton}
                    disabled={workingKey === `sync:${job}`}
                    onClick={() =>
                      runAction(
                        `sync:${job}`,
                        () => requestJson(`/api/admin/sync/${job}`, { method: "POST" }),
                        `${job} sync triggered.`
                      )
                    }
                  >
                    {workingKey === `sync:${job}` ? `Running ${job}...` : `Run ${job}`}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={workingKey === "cache:core"}
                  onClick={() =>
                    runAction(
                      "cache:core",
                      () =>
                        requestJson("/api/admin/cache/revalidate", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ tags: KNOWN_CACHE_TAGS }),
                        }),
                      "Cache tags revalidated."
                    )
                  }
                >
                  {workingKey === "cache:core" ? "Refreshing caches..." : "Revalidate all caches"}
                </button>
              </div>

              <div className={styles.cardGrid}>
                {workspace.sync.checkpoints.slice(0, 6).map((checkpoint) => (
                  <div key={checkpoint.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong className={styles.code}>{checkpoint.key}</strong>
                      <span className={statusClass(checkpoint.state)}>{checkpoint.state}</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{checkpoint.provider}</span>
                      <span>Lag {checkpoint.lagMinutes ?? "-"}m</span>
                      <span>Updated {formatDateTime(checkpoint.updatedAt, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Bucket</th>
                      <th>Records</th>
                      <th>Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.sync.recentJobs.map((job) => (
                      <tr key={job.id}>
                        <td className={styles.code}>{job.source}</td>
                        <td>
                          <span className={statusClass(job.status)}>{job.status}</span>
                        </td>
                        <td>{job.bucket}</td>
                        <td>{job.recordsProcessed}</td>
                        <td>{formatDateTime(job.finishedAt || job.updatedAt, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Controls</p>
                  <h2 className={sharedStyles.sectionTitle}>Feature flags and shell modules</h2>
                </div>
              </div>

              <div className={styles.controlList}>
                {workspace.featureFlags.map((flag) => (
                  <div key={flag.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div>
                        <strong className={styles.code}>{flag.key}</strong>
                        <p className={styles.smallText}>{flag.description || "No description"}</p>
                      </div>
                      <button
                        type="button"
                        className={flag.enabled ? styles.secondaryButton : styles.primaryButton}
                        disabled={workingKey === `flag:${flag.key}`}
                        onClick={() =>
                          runAction(
                            `flag:${flag.key}`,
                            () =>
                              requestJson(`/api/admin/feature-flags/${flag.key}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                  enabled: !flag.enabled,
                                  description: flag.description,
                                }),
                              }),
                            `Feature flag ${flag.key} updated.`
                          )
                        }
                      >
                        {flag.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                ))}

                {workspace.shellModules.map((module) => {
                  const draft = drafts.modules[module.key];

                  return (
                    <div key={module.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div>
                          <strong className={styles.code}>{module.key}</strong>
                          <p className={styles.smallText}>{module.description || module.name}</p>
                        </div>
                        <span className={statusClass(module.effectiveEnabled ? "healthy" : "critical")}>
                          {module.effectiveEnabled ? "live" : "off"}
                        </span>
                      </div>
                      <div className={styles.inlineFields}>
                        <label className={styles.checkboxRow}>
                          <input
                            type="checkbox"
                            checked={draft?.isEnabled ?? false}
                            onChange={(event) =>
                              updateDraft("modules", module.key, { isEnabled: event.target.checked })
                            }
                          />
                          <span>Enabled</span>
                        </label>
                        <label className={styles.checkboxRow}>
                          <input
                            type="checkbox"
                            checked={draft?.emergencyDisabled ?? false}
                            onChange={(event) =>
                              updateDraft("modules", module.key, {
                                emergencyDisabled: event.target.checked,
                              })
                            }
                          />
                          <span>Emergency disabled</span>
                        </label>
                      </div>
                      <label className={styles.field}>
                        <span>Emergency reason</span>
                        <input
                          value={draft?.emergencyReason || ""}
                          onChange={(event) =>
                            updateDraft("modules", module.key, {
                              emergencyReason: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={workingKey === `module:${module.key}`}
                        onClick={() =>
                          runAction(
                            `module:${module.key}`,
                            () =>
                              requestJson(`/api/admin/modules/${module.key}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify(drafts.modules[module.key]),
                              }),
                            `Module ${module.key} updated.`
                          )
                        }
                      >
                        Save module control
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>{t("adminRevenueEyebrow", "Revenue")}</p>
                  <h2 className={sharedStyles.sectionTitle}>
                    {t("adminRevenueTitle", "Affiliate, funnel, and placement controls")}
                  </h2>
                </div>
              </div>

              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span>{t("adminClicks24h", "Clicks 24h")}</span>
                  <strong>{commercial.summary.clicksLast24Hours || 0}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>{t("adminQualifiedConversions24h", "Qualified conversions")}</span>
                  <strong>{commercial.summary.qualifiedConversionsLast24Hours || 0}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>{t("adminConversionRate", "Conversion rate")}</span>
                  <strong>{formatPercent(commercial.summary.conversionRate)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>{t("adminAdReadiness", "Ad readiness gaps")}</span>
                  <strong>{commercial.summary.adSlotsWithoutPlacements || 0}</strong>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {commercial.topSurfaces.map((entry) => (
                  <div key={entry.surface} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong className={styles.code}>{entry.surface}</strong>
                      <span className={styles.statusNeutral}>{entry.clicks}</span>
                    </div>
                    <p className={styles.smallText}>
                      {t("adminSurfaceTraffic", "Commercial traffic by surface")}
                    </p>
                  </div>
                ))}
              </div>

              <div className={styles.controlList}>
                {commercial.bookmakers.map((bookmaker) => (
                  <div key={bookmaker.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div>
                        <strong className={styles.code}>{bookmaker.code}</strong>
                        <p className={styles.smallText}>{bookmaker.name}</p>
                      </div>
                      <span className={statusClass(bookmaker.isActive ? "healthy" : "critical")}>
                        {bookmaker.isActive ? "active" : "paused"}
                      </span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>
                        {t("adminMappings", "Mappings")} {bookmaker.mappingCount}
                      </span>
                      <span>
                        {t("adminPredictions", "Predictions")} {bookmaker.predictionCount}
                      </span>
                      <span>{bookmaker.sourceProvider?.code || t("adminUnassigned", "Unassigned")}</span>
                    </div>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminName", "Name")}</span>
                        <input
                          value={drafts.bookmakers[bookmaker.code]?.name || ""}
                          onChange={(event) =>
                            updateDraft("bookmakers", bookmaker.code, { name: event.target.value })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{t("adminShortName", "Short name")}</span>
                        <input
                          value={drafts.bookmakers[bookmaker.code]?.shortName || ""}
                          onChange={(event) =>
                            updateDraft("bookmakers", bookmaker.code, {
                              shortName: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminWebsite", "Website")}</span>
                        <input
                          value={drafts.bookmakers[bookmaker.code]?.websiteUrl || ""}
                          onChange={(event) =>
                            updateDraft("bookmakers", bookmaker.code, {
                              websiteUrl: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{t("adminAffiliateBase", "Affiliate base URL")}</span>
                        <input
                          value={drafts.bookmakers[bookmaker.code]?.affiliateBaseUrl || ""}
                          onChange={(event) =>
                            updateDraft("bookmakers", bookmaker.code, {
                              affiliateBaseUrl: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={drafts.bookmakers[bookmaker.code]?.isActive ?? false}
                        onChange={(event) =>
                          updateDraft("bookmakers", bookmaker.code, {
                            isActive: event.target.checked,
                          })
                        }
                      />
                      <span>{t("adminBookmakerActive", "Bookmaker active")}</span>
                    </label>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={workingKey === `bookmaker:${bookmaker.code}`}
                      onClick={() =>
                        runAction(
                          `bookmaker:${bookmaker.code}`,
                          () =>
                            requestJson(`/api/admin/bookmakers/${bookmaker.code}`, {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify(drafts.bookmakers[bookmaker.code]),
                            }),
                          t("adminBookmakerSaved", `Bookmaker ${bookmaker.code} updated.`)
                        )
                      }
                    >
                      {t("adminSaveBookmaker", "Save bookmaker")}
                    </button>
                  </div>
                ))}

                {commercial.affiliateLinks.map((entry) => (
                  <div key={entry.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div>
                        <strong className={styles.code}>{entry.key}</strong>
                        <p className={styles.smallText}>
                          {entry.bookmaker?.shortName || entry.bookmaker?.name || t("adminNoBookmaker", "No bookmaker")}{" "}
                          | {entry.surface || "SHELL"} | {entry.territory || "GLOBAL"}
                        </p>
                      </div>
                      <span className={statusClass(entry.isActive ? "healthy" : "critical")}>
                        {entry.isActive ? "live" : "paused"}
                      </span>
                    </div>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminTerritory", "Territory")}</span>
                        <input
                          value={drafts.affiliateLinks[entry.key]?.territory || ""}
                          onChange={(event) =>
                            updateDraft("affiliateLinks", entry.key, {
                              territory: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{t("adminSurface", "Surface")}</span>
                        <input
                          value={drafts.affiliateLinks[entry.key]?.surface || ""}
                          onChange={(event) =>
                            updateDraft("affiliateLinks", entry.key, {
                              surface: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminDestinationUrl", "Destination URL")}</span>
                        <input
                          value={drafts.affiliateLinks[entry.key]?.destinationUrl || ""}
                          onChange={(event) =>
                            updateDraft("affiliateLinks", entry.key, {
                              destinationUrl: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{t("adminFallbackUrl", "Fallback URL")}</span>
                        <input
                          value={drafts.affiliateLinks[entry.key]?.fallbackUrl || ""}
                          onChange={(event) =>
                            updateDraft("affiliateLinks", entry.key, {
                              fallbackUrl: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.inlineFields}>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={drafts.affiliateLinks[entry.key]?.isDefault ?? false}
                          onChange={(event) =>
                            updateDraft("affiliateLinks", entry.key, {
                              isDefault: event.target.checked,
                            })
                          }
                        />
                        <span>{t("adminDefaultRoute", "Default route")}</span>
                      </label>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={drafts.affiliateLinks[entry.key]?.isActive ?? false}
                          onChange={(event) =>
                            updateDraft("affiliateLinks", entry.key, {
                              isActive: event.target.checked,
                            })
                          }
                        />
                        <span>{t("adminAffiliateActive", "Affiliate CTA active")}</span>
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span>{t("adminPriority", "Priority")}</span>
                      <input
                        type="number"
                        min="0"
                        value={drafts.affiliateLinks[entry.key]?.priority ?? 100}
                        onChange={(event) =>
                          updateDraft("affiliateLinks", entry.key, {
                            priority: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={workingKey === `affiliate:${entry.key}`}
                      onClick={() =>
                        runAction(
                          `affiliate:${entry.key}`,
                          () =>
                            requestJson(`/api/admin/affiliate-links/${entry.key}`, {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                ...drafts.affiliateLinks[entry.key],
                                priority: Number(drafts.affiliateLinks[entry.key]?.priority || 0),
                              }),
                            }),
                          t("adminAffiliateSaved", `Affiliate route ${entry.key} updated.`)
                        )
                      }
                    >
                      {t("adminSaveAffiliate", "Save affiliate route")}
                    </button>
                  </div>
                ))}

                {commercial.funnelEntries.map((entry) => (
                  <div key={entry.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div>
                        <strong className={styles.code}>{entry.key}</strong>
                        <p className={styles.smallText}>
                          {entry.channel} | {entry.surface} | {entry.territory || "GLOBAL"}
                        </p>
                      </div>
                      <span className={statusClass(entry.isActive ? "healthy" : "critical")}>
                        {entry.isActive ? "live" : "paused"}
                      </span>
                    </div>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminTitleLabel", "Title")}</span>
                        <input
                          value={drafts.funnelEntries[entry.key]?.title || ""}
                          onChange={(event) =>
                            updateDraft("funnelEntries", entry.key, { title: event.target.value })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{t("adminCtaLabel", "CTA label")}</span>
                        <input
                          value={drafts.funnelEntries[entry.key]?.ctaLabel || ""}
                          onChange={(event) =>
                            updateDraft("funnelEntries", entry.key, {
                              ctaLabel: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span>{t("adminDestinationUrl", "Destination URL")}</span>
                      <input
                        value={drafts.funnelEntries[entry.key]?.ctaUrl || ""}
                        onChange={(event) =>
                          updateDraft("funnelEntries", entry.key, { ctaUrl: event.target.value })
                        }
                      />
                    </label>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminTerritory", "Territory")}</span>
                        <input
                          value={drafts.funnelEntries[entry.key]?.territory || ""}
                          onChange={(event) =>
                            updateDraft("funnelEntries", entry.key, {
                              territory: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{t("adminEnabledGeos", "Enabled geos")}</span>
                        <input
                          value={drafts.funnelEntries[entry.key]?.enabledGeos || ""}
                          onChange={(event) =>
                            updateDraft("funnelEntries", entry.key, {
                              enabledGeos: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={drafts.funnelEntries[entry.key]?.isActive ?? false}
                        onChange={(event) =>
                          updateDraft("funnelEntries", entry.key, {
                            isActive: event.target.checked,
                          })
                        }
                      />
                      <span>{t("adminFunnelActive", "Funnel route active")}</span>
                    </label>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={workingKey === `funnel:${entry.key}`}
                      onClick={() =>
                        runAction(
                          `funnel:${entry.key}`,
                          () =>
                            requestJson(`/api/admin/funnels/${entry.key}`, {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                ...drafts.funnelEntries[entry.key],
                                enabledGeos: (drafts.funnelEntries[entry.key]?.enabledGeos || "")
                                  .split(",")
                                  .map((value) => value.trim())
                                  .filter(Boolean),
                                priority: Number(drafts.funnelEntries[entry.key]?.priority || 0),
                              }),
                            }),
                          t("adminFunnelSaved", `Funnel route ${entry.key} updated.`)
                        )
                      }
                    >
                      {t("adminSaveFunnel", "Save funnel route")}
                    </button>
                  </div>
                ))}

                {commercial.monetizationPlacements.map((entry) => (
                  <div key={entry.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div>
                        <strong className={styles.code}>{entry.key}</strong>
                        <p className={styles.smallText}>
                          {entry.surface} | {entry.slotKey} | {entry.placementType}
                        </p>
                      </div>
                      <span className={statusClass(entry.state)}>{entry.state}</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{entry.affiliateLink?.key || entry.funnelEntry?.key || entry.predictionRecommendation?.key || t("adminNoLinkedTarget", "No linked target")}</span>
                      <span>{entry.adSlot?.key || entry.shellModule?.key || ""}</span>
                    </div>
                    <label className={styles.field}>
                      <span>{t("adminTitleLabel", "Title")}</span>
                      <input
                        value={drafts.placements[entry.key]?.title || ""}
                        onChange={(event) =>
                          updateDraft("placements", entry.key, { title: event.target.value })
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>{t("adminDescription", "Description")}</span>
                      <textarea
                        value={drafts.placements[entry.key]?.description || ""}
                        onChange={(event) =>
                          updateDraft("placements", entry.key, {
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminStartsAt", "Starts at")}</span>
                        <input
                          type="datetime-local"
                          value={drafts.placements[entry.key]?.startsAt || ""}
                          onChange={(event) =>
                            updateDraft("placements", entry.key, {
                              startsAt: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>{t("adminEndsAt", "Ends at")}</span>
                        <input
                          type="datetime-local"
                          value={drafts.placements[entry.key]?.endsAt || ""}
                          onChange={(event) =>
                            updateDraft("placements", entry.key, {
                              endsAt: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={drafts.placements[entry.key]?.isActive ?? false}
                        onChange={(event) =>
                          updateDraft("placements", entry.key, {
                            isActive: event.target.checked,
                          })
                        }
                      />
                      <span>{t("adminPlacementActive", "Placement active")}</span>
                    </label>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={workingKey === `placement:${entry.key}`}
                      onClick={() =>
                        runAction(
                          `placement:${entry.key}`,
                          () =>
                            requestJson(`/api/admin/placements/${entry.key}`, {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                ...drafts.placements[entry.key],
                                priority: Number(drafts.placements[entry.key]?.priority || 0),
                                startsAt: toIsoDateTime(drafts.placements[entry.key]?.startsAt),
                                endsAt: toIsoDateTime(drafts.placements[entry.key]?.endsAt),
                              }),
                            }),
                          t("adminPlacementSaved", `Placement ${entry.key} updated.`)
                        )
                      }
                    >
                      {t("adminSavePlacement", "Save placement")}
                    </button>
                  </div>
                ))}

                {commercial.predictionRecommendations.map((entry) => (
                  <div key={entry.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div>
                        <strong className={styles.code}>{entry.key}</strong>
                        <p className={styles.smallText}>
                          {entry.fixture?.label || entry.competition?.name || t("adminUnlinked", "Unlinked")}
                        </p>
                      </div>
                      <span className={statusClass(entry.isPublished ? "healthy" : "warning")}>
                        {entry.isPublished ? "published" : "draft"}
                      </span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{entry.bookmaker?.shortName || entry.bookmaker?.name || ""}</span>
                      <span>{entry.reviewStatus}</span>
                    </div>
                    <label className={styles.field}>
                      <span>{t("adminTitleLabel", "Title")}</span>
                      <input
                        value={drafts.predictions[entry.key]?.title || ""}
                        onChange={(event) =>
                          updateDraft("predictions", entry.key, { title: event.target.value })
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>{t("adminSummary", "Summary")}</span>
                      <textarea
                        value={drafts.predictions[entry.key]?.summary || ""}
                        onChange={(event) =>
                          updateDraft("predictions", entry.key, {
                            summary: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>{t("adminReviewStatus", "Review status")}</span>
                        <select
                          value={drafts.predictions[entry.key]?.reviewStatus || "PENDING"}
                          onChange={(event) =>
                            updateDraft("predictions", entry.key, {
                              reviewStatus: event.target.value,
                            })
                          }
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="HOLD">HOLD</option>
                        </select>
                      </label>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={drafts.predictions[entry.key]?.isPublished ?? false}
                          onChange={(event) =>
                            updateDraft("predictions", entry.key, {
                              isPublished: event.target.checked,
                            })
                          }
                        />
                        <span>{t("adminPredictionPublished", "Prediction published")}</span>
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span>{t("adminReviewNotes", "Review notes")}</span>
                      <textarea
                        value={drafts.predictions[entry.key]?.reviewNotes || ""}
                        onChange={(event) =>
                          updateDraft("predictions", entry.key, {
                            reviewNotes: event.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={workingKey === `prediction:${entry.key}`}
                      onClick={() =>
                        runAction(
                          `prediction:${entry.key}`,
                          () =>
                            requestJson(`/api/news/predictions/${entry.key}`, {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                ...drafts.predictions[entry.key],
                                publishedAt: toIsoDateTime(drafts.predictions[entry.key]?.publishedAt),
                                expiresAt: toIsoDateTime(drafts.predictions[entry.key]?.expiresAt),
                              }),
                            }),
                          t("adminPredictionSaved", `Prediction ${entry.key} updated.`)
                        )
                      }
                    >
                      {t("adminSavePrediction", "Save prediction review")}
                    </button>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.stack}>
            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Health</p>
                  <h2 className={sharedStyles.sectionTitle}>Latency, cache, and SLOs</h2>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {(observability.slos || []).map((slo) => (
                  <div key={slo.key} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong>{slo.label}</strong>
                      <span className={statusClass(slo.status)}>{slo.status}</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>Target {slo.target}</span>
                      <span>Current {slo.currentValue ?? "-"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.timelineList}>
                {workspace.ops.cacheHealth.map((entry) => (
                  <div key={entry.tag} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong className={styles.code}>{entry.tag}</strong>
                      <span className={statusClass(entry.state)}>{entry.state}</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{entry.label}</span>
                      <span>Last refresh {formatDateTime(entry.lastRevalidatedAt, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Samples</th>
                      <th>Avg</th>
                      <th>P95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(observability.latency?.topRoutes || []).map((route) => (
                      <tr key={route.route}>
                        <td className={styles.code}>{route.route}</td>
                        <td>{route.count}</td>
                        <td>{formatMetric(route.averageMs, "ms")}</td>
                        <td>{formatMetric(route.p95Ms, "ms")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.routeList}>
                {workspace.ops.routeErrors.summary.topRoutes.map((route) => (
                  <div key={route.route} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong className={styles.code}>{route.route}</strong>
                      <span className={styles.statusWarn}>{route.count}</span>
                    </div>
                    <p className={styles.smallText}>
                      Last seen {formatDateTime(route.lastSeenAt, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Readiness</p>
                  <h2 className={sharedStyles.sectionTitle}>Failure drills and asset delivery</h2>
                </div>
              </div>

              <div className={styles.actionRow}>
                {FAILURE_DRILL_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.key}
                    type="button"
                    className={styles.secondaryButton}
                    disabled={workingKey === `drill:${scenario.key}`}
                    onClick={() =>
                      runAction(
                        `drill:${scenario.key}`,
                        () => requestJson(`/api/admin/drills/${scenario.key}`, { method: "POST" }),
                        `${scenario.label} drill completed.`
                      )
                    }
                  >
                    {workingKey === `drill:${scenario.key}` ? "Running..." : scenario.label}
                  </button>
                ))}
              </div>

              <div className={styles.cardGrid}>
                {assetDelivery.strategy.map((item) => (
                  <div key={item.assetType} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong>{item.assetType}</strong>
                      <span className={styles.statusNeutral}>{item.cachePolicy}</span>
                    </div>
                    <p className={styles.smallText}>{item.delivery}</p>
                  </div>
                ))}
              </div>

              <div className={styles.cardGrid}>
                <div className={styles.row}>
                  <div className={styles.rowTop}>
                    <strong>Competition logos</strong>
                    <span className={styles.statusNeutral}>
                      {assetDelivery.coverage.competitions.coverageRate ?? "-"}%
                    </span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span>Covered {assetDelivery.coverage.competitions.covered}</span>
                    <span>Missing {assetDelivery.coverage.competitions.missing}</span>
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowTop}>
                    <strong>Team logos</strong>
                    <span className={styles.statusNeutral}>
                      {assetDelivery.coverage.teams.coverageRate ?? "-"}%
                    </span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span>Covered {assetDelivery.coverage.teams.covered}</span>
                    <span>Missing {assetDelivery.coverage.teams.missing}</span>
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowTop}>
                    <strong>Article media</strong>
                    <span className={styles.statusNeutral}>
                      {assetDelivery.coverage.articles.coverageRate ?? "-"}%
                    </span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span>Covered {assetDelivery.coverage.articles.covered}</span>
                    <span>Missing {assetDelivery.coverage.articles.missing}</span>
                  </div>
                </div>
              </div>

              <div className={styles.timelineList}>
                {(observability.drills?.recent || []).map((event) => (
                  <div key={event.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong className={styles.code}>{event.metric}</strong>
                      <span className={statusClass(event.status)}>{event.status}</span>
                    </div>
                    <p className={styles.smallText}>
                      {event.metadata?.summary || "Drill completed."}
                    </p>
                    <div className={styles.rowMeta}>
                      <span>{formatDateTime(event.createdAt, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        <div className={styles.split}>
          <div className={styles.stack}>
            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>People</p>
                  <h2 className={sharedStyles.sectionTitle}>Users and providers</h2>
                </div>
              </div>

              <div className={styles.cardGrid}>
                <div className={styles.row}>
                  <div className={styles.rowTop}>
                    <strong>{t("adminSelectedProvider", "Selected provider")}</strong>
                    <span
                      className={statusClass(
                        providerSelection.implemented ? "healthy" : "warning"
                      )}
                    >
                      {providerSelection.implemented ? "implemented" : "catalog only"}
                    </span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.code}>{providerSelection.code || "-"}</span>
                    <span>{providerSelection.adapterFamily || "-"}</span>
                    <span>{providerSelection.envNamespace || "-"}</span>
                  </div>
                  <div className={styles.roleList}>
                    {(providerSelection.capabilities || []).map((capability) => (
                      <span key={capability} className={sharedStyles.badge}>
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowTop}>
                    <strong>{t("adminFallbackChain", "Fallback chain")}</strong>
                    <span className={styles.statusNeutral}>
                      {(providerSelection.fallbackProviders || []).length}
                    </span>
                  </div>
                  <div className={styles.timelineList}>
                    {(providerSelection.fallbackProviders || []).length ? (
                      providerSelection.fallbackProviders.map((entry) => (
                        <div key={entry.code} className={styles.row}>
                          <div className={styles.rowTop}>
                            <strong className={styles.code}>{entry.code}</strong>
                            <span
                              className={statusClass(
                                entry.implemented ? "healthy" : "warning"
                              )}
                            >
                              {entry.implemented ? "implemented" : "catalog only"}
                            </span>
                          </div>
                          <p className={styles.smallText}>{entry.name}</p>
                        </div>
                      ))
                    ) : (
                      <div className={styles.smallText}>
                        {t("adminNoFallbackProviders", "No fallback providers are configured.")}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.rowTop}>
                    <strong>{t("adminCatalogCoverage", "Catalog coverage")}</strong>
                    <span className={styles.statusNeutral}>
                      {workspace.providerRegistry.length}
                    </span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span>
                      {t("adminCatalogImplemented", "Implemented")}{" "}
                      {workspace.providerRegistry.filter((entry) => entry.implemented).length}
                    </span>
                    <span>
                      {t("adminCatalogPending", "Pending")}{" "}
                      {workspace.providerRegistry.filter((entry) => !entry.implemented).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.controlList}>
                {workspace.users.map((user) => {
                  const draft = drafts.users[user.id];

                  return (
                    <div key={user.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div>
                          <strong>{getUserIdentity(user)}</strong>
                          {getUserMetaLine(user) ? (
                            <p className={styles.smallText}>{getUserMetaLine(user)}</p>
                          ) : null}
                        </div>
                        <span className={statusClass(user.isActive ? "healthy" : "critical")}>
                          {user.isActive ? "active" : "disabled"}
                        </span>
                      </div>
                      <div className={styles.rowMeta}>
                        <span>Sessions {user.sessionCount}</span>
                        <span>Created {formatDateTime(user.createdAt, locale)}</span>
                      </div>
                      <div className={styles.roleList}>
                        {workspace.roles.map((role) => (
                          <label key={`${user.id}-${role}`} className={styles.checkboxRow}>
                            <input
                              type="checkbox"
                              checked={draft?.roles?.includes(role) || false}
                              onChange={(event) => {
                                const nextRoles = new Set(draft?.roles || []);
                                if (event.target.checked) {
                                  nextRoles.add(role);
                                } else {
                                  nextRoles.delete(role);
                                }
                                updateDraft("users", user.id, { roles: [...nextRoles] });
                              }}
                            />
                            <span>{role}</span>
                          </label>
                        ))}
                      </div>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={draft?.isActive ?? false}
                          onChange={(event) =>
                            updateDraft("users", user.id, { isActive: event.target.checked })
                          }
                        />
                        <span>User is active</span>
                      </label>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={workingKey === `user:${user.id}`}
                        onClick={() =>
                          runAction(
                            `user:${user.id}`,
                            () =>
                              requestJson(`/api/admin/users/${user.id}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify(drafts.users[user.id]),
                              }),
                            `Updated ${getUserIdentity(user)}.`
                          )
                        }
                      >
                        Save user access
                      </button>
                    </div>
                  );
                })}

                {workspace.providers.map((provider) => {
                  const draft = drafts.providers[provider.code];

                  return (
                    <div key={provider.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div>
                          <strong className={styles.code}>{provider.code}</strong>
                          <p className={styles.smallText}>{provider.name}</p>
                        </div>
                        <span className={statusClass(provider.isActive ? "healthy" : "critical")}>
                          {provider.isActive ? "enabled" : "disabled"}
                        </span>
                      </div>
                      <div className={styles.rowMeta}>
                        <span>{provider.registry?.tier || provider.metadata?.tier || "custom"}</span>
                        <span>{provider.registry?.sports?.join(", ") || "unspecified sport"}</span>
                        <span>{provider.registry?.role || provider.metadata?.role || "unassigned"}</span>
                      </div>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={draft?.isActive ?? false}
                          onChange={(event) =>
                            updateDraft("providers", provider.code, {
                              isActive: event.target.checked,
                            })
                          }
                        />
                        <span>Provider active</span>
                      </label>
                      <label className={styles.field}>
                        <span>Operator note</span>
                        <input
                          value={draft?.note || ""}
                          onChange={(event) =>
                            updateDraft("providers", provider.code, {
                              note: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={workingKey === `provider:${provider.code}`}
                        onClick={() =>
                          runAction(
                            `provider:${provider.code}`,
                            () =>
                              requestJson(`/api/admin/providers/${provider.code}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify(drafts.providers[provider.code]),
                              }),
                            `Provider ${provider.code} updated.`
                          )
                        }
                      >
                        Save provider control
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Shell</p>
                  <h2 className={sharedStyles.sectionTitle}>Ad slots and consent text</h2>
                </div>
              </div>

              <div className={styles.controlList}>
                {workspace.adSlots.map((slot) => (
                  <div key={slot.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div>
                        <strong className={styles.code}>{slot.key}</strong>
                        <p className={styles.smallText}>{slot.placement}</p>
                      </div>
                      <span className={statusClass(slot.isEnabled ? "healthy" : "critical")}>
                        {slot.isEnabled ? "live" : "off"}
                      </span>
                    </div>
                    <div className={styles.inlineFields}>
                      <label className={styles.field}>
                        <span>Name</span>
                        <input
                          value={drafts.adSlots[slot.key]?.name || ""}
                          onChange={(event) =>
                            updateDraft("adSlots", slot.key, { name: event.target.value })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Placement</span>
                        <input
                          value={drafts.adSlots[slot.key]?.placement || ""}
                          onChange={(event) =>
                            updateDraft("adSlots", slot.key, { placement: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span>Copy</span>
                      <textarea
                        value={drafts.adSlots[slot.key]?.copy || ""}
                        onChange={(event) =>
                          updateDraft("adSlots", slot.key, { copy: event.target.value })
                        }
                      />
                    </label>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={drafts.adSlots[slot.key]?.isEnabled ?? false}
                        onChange={(event) =>
                          updateDraft("adSlots", slot.key, { isEnabled: event.target.checked })
                        }
                      />
                      <span>Ad slot enabled</span>
                    </label>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={workingKey === `slot:${slot.key}`}
                      onClick={() =>
                        runAction(
                          `slot:${slot.key}`,
                          () =>
                            requestJson(`/api/admin/ad-slots/${slot.key}`, {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify(drafts.adSlots[slot.key]),
                            }),
                          `Ad slot ${slot.key} updated.`
                        )
                      }
                    >
                      Save ad slot
                    </button>
                  </div>
                ))}

                {workspace.consentTexts.map((entry) => {
                  const draftKey = `${entry.key}:${entry.locale}`;

                  return (
                    <div key={entry.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div>
                          <strong className={styles.code}>{draftKey}</strong>
                          <p className={styles.smallText}>Version {entry.version}</p>
                        </div>
                        <span className={statusClass(entry.isActive ? "healthy" : "critical")}>
                          {entry.isActive ? "active" : "inactive"}
                        </span>
                      </div>
                      <label className={styles.field}>
                        <span>Title</span>
                        <input
                          value={drafts.consentTexts[draftKey]?.title || ""}
                          onChange={(event) =>
                            updateDraft("consentTexts", draftKey, { title: event.target.value })
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Body</span>
                        <textarea
                          value={drafts.consentTexts[draftKey]?.body || ""}
                          onChange={(event) =>
                            updateDraft("consentTexts", draftKey, { body: event.target.value })
                          }
                        />
                      </label>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={drafts.consentTexts[draftKey]?.isActive ?? false}
                          onChange={(event) =>
                            updateDraft("consentTexts", draftKey, {
                              isActive: event.target.checked,
                            })
                          }
                        />
                        <span>Consent text active</span>
                      </label>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={workingKey === `consent:${draftKey}`}
                        onClick={() =>
                          runAction(
                            `consent:${draftKey}`,
                            () =>
                              requestJson(`/api/admin/consent/${entry.key}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify(drafts.consentTexts[draftKey]),
                              }),
                            `Consent copy ${draftKey} updated.`
                          )
                        }
                      >
                        Save consent copy
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <div className={styles.stack}>
            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Triage</p>
                  <h2 className={sharedStyles.sectionTitle}>Issues and disputes</h2>
                </div>
              </div>

              <div className={styles.issueForm}>
                <div className={styles.inlineFields}>
                  <label className={styles.field}>
                    <span>Issue type</span>
                    <select
                      value={issueForm.issueType}
                      onChange={(event) =>
                        setIssueForm((current) => ({ ...current, issueType: event.target.value }))
                      }
                    >
                      <option value="WRONG_SCORE">Wrong score</option>
                      <option value="DATA_DISPUTE">Data dispute</option>
                      <option value="BROKEN_ARTICLE_CONTENT">Broken article</option>
                      <option value="BROKEN_AFFILIATE_DESTINATION">Broken affiliate destination</option>
                      <option value="PROVIDER_SWITCH_INCIDENT">Provider-switch incident</option>
                      <option value="COMPLIANCE_INCIDENT">Compliance incident</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Priority</span>
                    <select
                      value={issueForm.priority}
                      onChange={(event) =>
                        setIssueForm((current) => ({ ...current, priority: event.target.value }))
                      }
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </label>
                </div>

                <label className={styles.field}>
                  <span>Title</span>
                  <input
                    value={issueForm.title}
                    onChange={(event) =>
                      setIssueForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span>Description</span>
                  <textarea
                    value={issueForm.description}
                    onChange={(event) =>
                      setIssueForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </label>

                <div className={styles.inlineFields}>
                  <label className={styles.field}>
                    <span>Fixture ID</span>
                    <input
                      value={issueForm.fixtureId}
                      onChange={(event) =>
                        setIssueForm((current) => ({ ...current, fixtureId: event.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Article ID</span>
                    <input
                      value={issueForm.articleId}
                      onChange={(event) =>
                        setIssueForm((current) => ({ ...current, articleId: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={workingKey === "issue:create"}
                  onClick={() =>
                    runAction(
                      "issue:create",
                      async () => {
                        await requestJson("/api/admin/issues", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify(issueForm),
                        });
                        setIssueForm({
                          issueType: "WRONG_SCORE",
                          priority: "MEDIUM",
                          title: "",
                          description: "",
                          fixtureId: "",
                          articleId: "",
                          entityType: "",
                          entityId: "",
                        });
                      },
                      "Issue created."
                    )
                  }
                >
                  Create issue
                </button>
              </div>

              <div className={styles.controlList}>
                {workspace.issues.items.map((issue) => {
                  const draft = drafts.issues[issue.id];

                  return (
                    <div key={issue.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div>
                          <strong>{issue.title}</strong>
                          <p className={styles.smallText}>{issue.description}</p>
                        </div>
                        <span className={statusClass(issue.priority)}>{issue.priority}</span>
                      </div>
                      <div className={styles.rowMeta}>
                        <span>{issue.issueType}</span>
                        <span>{issue.fixture?.label || issue.article?.title || issue.entityId || "Unlinked"}</span>
                      </div>
                      <div className={styles.inlineFields}>
                        <label className={styles.field}>
                          <span>Status</span>
                          <select
                            value={draft?.status || issue.status}
                            onChange={(event) =>
                              updateDraft("issues", issue.id, { status: event.target.value })
                            }
                          >
                            <option value="OPEN">Open</option>
                            <option value="INVESTIGATING">Investigating</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="DISMISSED">Dismissed</option>
                          </select>
                        </label>
                        <label className={styles.field}>
                          <span>Assignee</span>
                          <select
                            value={draft?.assigneeUserId || ""}
                            onChange={(event) =>
                              updateDraft("issues", issue.id, { assigneeUserId: event.target.value })
                            }
                          >
                            <option value="">Unassigned</option>
                            {operatorOptions.map((user) => (
                              <option key={user.id} value={user.id}>
                                {getUserIdentity(user)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className={styles.field}>
                        <span>Resolution summary</span>
                        <textarea
                          value={draft?.resolutionSummary || ""}
                          onChange={(event) =>
                            updateDraft("issues", issue.id, {
                              resolutionSummary: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={workingKey === `issue:${issue.id}`}
                        onClick={() =>
                          runAction(
                            `issue:${issue.id}`,
                            () =>
                              requestJson(`/api/admin/issues/${issue.id}`, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify(drafts.issues[issue.id]),
                              }),
                            `Issue ${issue.title} updated.`
                          )
                        }
                      >
                        Save triage update
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Audit</p>
                  <h2 className={sharedStyles.sectionTitle}>Immutable activity trail</h2>
                </div>
              </div>

              <div className={styles.timelineList}>
                {workspace.auditTrail.map((entry) => (
                  <div key={entry.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <strong className={styles.code}>{entry.action}</strong>
                      <span className={styles.statusNeutral}>{formatDateTime(entry.createdAt, locale)}</span>
                    </div>
                    <div className={styles.rowMeta}>
                      <span>{entry.entityType}</span>
                      <span className={styles.code}>{entry.entityId}</span>
                      <span>{entry.actor ? getUserIdentity(entry.actor) : "System"}</span>
                    </div>
                    <p className={styles.smallText}>
                      Hash {entry.eventHash || "pending"} {entry.previousHash ? `· Prev ${entry.previousHash}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
