"use client";

import { useState } from "react";
import sharedStyles from "../../../../components/coreui/styles.module.css";
import styles from "./admin-console.module.css";
import { KNOWN_CACHE_TAGS } from "../../../../lib/cache";

function formatDateTime(value, locale) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  if (["healthy", "available", "OPEN", "INVESTIGATING", "SUCCESS"].includes(value)) {
    return styles.statusGood;
  }

  if (["warning", "attention", "PENDING", "RUNNING", "MEDIUM"].includes(value)) {
    return styles.statusWarn;
  }

  if (["critical", "failed", "FAILED", "HIGH", "CRITICAL", "DISMISSED"].includes(value)) {
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

export default function AdminConsoleClient({ locale, initialWorkspace }) {
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

  const operatorOptions = workspace.users.filter((user) =>
    user.roleNames.some((role) => ["ADMIN", "EDITOR"].includes(role))
  );

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
      setMessage("Admin verification refreshed for the next few minutes.");
    } catch (error) {
      setMessage(error.message || "Verification failed.");
    } finally {
      setWorkingKey("");
    }
  }

  return (
    <section className={sharedStyles.section}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>Admin</p>
          <h1 className={sharedStyles.pageTitle}>Admin Control Room</h1>
          <p className={sharedStyles.pageLead}>
            Live operational visibility, emergency controls, editorial safety, and immutable audit
            records from one surface.
          </p>
        </div>
        <div className={sharedStyles.inlineBadgeRow}>
          <span className={sharedStyles.badge}>Admins {workspace.summary.adminUsers}</span>
          <span className={sharedStyles.badge}>Providers {workspace.summary.activeProviders}</span>
          <span className={sharedStyles.badge}>Open issues {workspace.summary.openIssues}</span>
          <span className={sharedStyles.badge}>
            Cache attention {workspace.summary.cacheAttentionCount}
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
                <span>Route errors 1h</span>
                <strong>{workspace.ops.routeErrors.summary.lastHourCount}</strong>
              </div>
              <div className={styles.metricCard}>
                <span>Cache attention</span>
                <strong>{workspace.summary.cacheAttentionCount}</strong>
              </div>
            </div>

            <div className={styles.stack}>
              <label className={styles.field}>
                <span>Admin step-up password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Re-enter password for sensitive actions"
                />
              </label>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={workingKey === "step-up"}
                onClick={verifyStepUp}
              >
                {workingKey === "step-up" ? "Verifying..." : "Refresh admin verification"}
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

              <div className={styles.actionRow}>
                {["static-ish", "daily", "high-frequency"].map((job) => (
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
          </div>

          <div className={styles.stack}>
            <article className={sharedStyles.panel}>
              <div className={sharedStyles.sectionHeader}>
                <div>
                  <p className={sharedStyles.eyebrow}>Health</p>
                  <h2 className={sharedStyles.sectionTitle}>Cache and route pressure</h2>
                </div>
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

              <div className={styles.controlList}>
                {workspace.users.map((user) => {
                  const draft = drafts.users[user.id];

                  return (
                    <div key={user.id} className={styles.row}>
                      <div className={styles.rowTop}>
                        <div>
                          <strong>{user.email}</strong>
                          <p className={styles.smallText}>
                            @{user.username} {user.displayName ? `· ${user.displayName}` : ""}
                          </p>
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
                            `Updated ${user.email}.`
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
                                {user.email}
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
                      <span>{entry.actor?.email || "System"}</span>
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
