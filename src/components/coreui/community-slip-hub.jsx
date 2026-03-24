"use client";

import { useEffect, useState } from "react";
import { buildMatchHref } from "../../lib/coreui/routes";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";
import { ModuleEngagementTracker } from "./module-engagement-tracker";
import { TrackedActionLink } from "./tracked-action-link";
import { usePreferences } from "./preferences-provider";
import styles from "./community-slip-hub.module.css";

function formatDateTime(value, locale) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(parsed);
}

function getStatusLabel(status, dictionary) {
  if (status === "PUBLISHED") {
    return dictionary.communitySlipsStatusPublished;
  }

  if (status === "SETTLED") {
    return dictionary.communitySlipsStatusSettled;
  }

  return dictionary.communitySlipsStatusDraft;
}

function getStatusClass(status) {
  if (status === "PUBLISHED") {
    return styles.statusPublished;
  }

  if (status === "SETTLED") {
    return styles.statusSettled;
  }

  return styles.statusDraft;
}

function buildComposerPickFromSelection(selection) {
  return {
    fixtureId: selection.fixtureId,
    oddsSelectionId: selection.oddsSelectionId,
    oddsMarketId: selection.oddsMarketId || null,
    fixtureLabel: selection.fixtureLabel,
    selectionLabel: selection.selectionLabel,
    marketType: selection.marketType,
    bookmaker: selection.bookmaker,
    priceDecimal: selection.priceDecimal,
    priceLabel: selection.priceLabel,
  };
}

function computeTotals(picks = [], stakeAmount = "") {
  const totalOdds = picks.reduce((product, pick) => {
    const price = Number(pick.priceDecimal);
    return Number.isFinite(price) ? product * price : product;
  }, 1);
  const numericStake = Number(stakeAmount);

  return {
    totalOdds: picks.length ? totalOdds.toFixed(2) : null,
    expectedPayout:
      picks.length && Number.isFinite(numericStake) && numericStake > 0
        ? (numericStake * totalOdds).toFixed(2)
        : null,
  };
}

function replaceSlipInList(list = [], nextSlip) {
  const existing = list.find((entry) => entry.id === nextSlip.id);
  if (!existing) {
    return list;
  }

  return list.map((entry) => (entry.id === nextSlip.id ? nextSlip : entry));
}

function patchSlipData(current, nextSlip) {
  if (!current || !nextSlip) {
    return current;
  }

  return {
    ...current,
    featured:
      current.featured?.id === nextSlip.id ? nextSlip : current.featured,
    latest: replaceSlipInList(current.latest, nextSlip),
    mine: replaceSlipInList(current.mine, nextSlip),
  };
}

function SlipCard({
  locale,
  dictionary,
  slip,
  onLike,
  onEdit = null,
  canLike = false,
  isOwner = false,
  accent = false,
}) {
  if (!slip) {
    return null;
  }

  const publishedLabel = formatDateTime(slip.publishedAt || slip.createdAt, locale);
  const matchHref = slip.primaryFixtureRef
    ? buildMatchHref(locale, { externalRef: slip.primaryFixtureRef })
    : null;

  return (
    <article className={`${styles.card} ${accent ? styles.slipCardAccent : ""}`}>
      <div className={styles.cardHeader}>
        <div className={styles.stack}>
          <div className={styles.metaRow}>
            <span className={getStatusClass(slip.status)}>
              {getStatusLabel(slip.status, dictionary)}
            </span>
            {slip.isFeatured ? <span className={styles.badge}>{dictionary.communitySlipsFeatured}</span> : null}
          </div>
          <div>
            <h3 className={styles.cardTitle}>{slip.title}</h3>
            <p className={styles.cardLead}>
              {dictionary.communitySlipsBy} {slip.author.displayName}
              {publishedLabel ? ` · ${publishedLabel}` : ""}
            </p>
          </div>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>
            {dictionary.communitySlipsSelections}: {slip.selectionCount}
          </span>
          {slip.totalOddsLabel ? (
            <span className={styles.badge}>
              {dictionary.communitySlipsTotalOdds}: {slip.totalOddsLabel}
            </span>
          ) : null}
        </div>
      </div>

      {slip.summary ? <p className={styles.muted}>{slip.summary}</p> : null}

      <div className={styles.selectionList}>
        {slip.selections.slice(0, 3).map((selection) => (
          <div key={selection.id} className={styles.selectionItem}>
            <div>
              <p className={styles.selectionTitle}>{selection.selectionLabel}</p>
              <p className={styles.selectionMeta}>
                {selection.fixtureLabel}
                {selection.marketType ? ` · ${selection.marketType}` : ""}
                {selection.bookmaker ? ` · ${selection.bookmaker}` : ""}
              </p>
            </div>
            <span className={styles.price}>{selection.priceLabel || dictionary.noData}</span>
          </div>
        ))}
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>{dictionary.communitySlipsLikes}</span>
          <span className={styles.metricValue}>{slip.likeCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>{dictionary.communitySlipsStake}</span>
          <span className={styles.metricValue}>{slip.stakeAmountLabel || dictionary.noData}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>{dictionary.communitySlipsExpectedPayout}</span>
          <span className={styles.metricValue}>{slip.expectedPayoutLabel || dictionary.noData}</span>
        </div>
      </div>

      <div className={styles.cardActions}>
        {matchHref ? (
          <TrackedActionLink
            href={matchHref}
            className={styles.ctaSecondary}
            analyticsEvent="community_slip_open"
            analyticsSurface="community-slips"
            analyticsEntityType="CommunitySlip"
            analyticsEntityId={slip.id}
            analyticsAction="open-match"
          >
            {dictionary.liveBoardOpenCenter}
          </TrackedActionLink>
        ) : null}

        {canLike ? (
          <button
            type="button"
            className={styles.likeButton}
            onClick={() => onLike?.(slip)}
            data-analytics-action={slip.hasLiked ? "community-slip-unlike" : "community-slip-like"}
          >
            {slip.hasLiked ? dictionary.communitySlipsLiked : dictionary.communitySlipsLike}
          </button>
        ) : null}

        {isOwner && onEdit ? (
          <button
            type="button"
            className={styles.editButton}
            onClick={() => onEdit(slip)}
            data-analytics-action="community-slip-edit"
          >
            {dictionary.communitySlipsEdit}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function CommunitySlipHub({
  locale,
  dictionary,
  surface,
  entityType,
  entityId,
  viewerTerritory,
  initialData,
  authHref,
  predictionsHref,
  allowComposer = false,
  fixtureId = null,
  compact = false,
}) {
  const { sessionUser } = usePreferences();
  const [hubData, setHubData] = useState(initialData);
  const [selectedFixtureId, setSelectedFixtureId] = useState(
    fixtureId || initialData.catalog?.[0]?.fixtureId || ""
  );
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [picks, setPicks] = useState([]);
  const [editingSlipId, setEditingSlipId] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedFixtureId && hubData.catalog?.length) {
      setSelectedFixtureId(fixtureId || hubData.catalog[0].fixtureId);
    }
  }, [fixtureId, hubData.catalog, selectedFixtureId]);

  async function refreshHubData() {
    const params = new URLSearchParams({
      locale,
      territory: viewerTerritory,
      withComposer: allowComposer ? "1" : "0",
    });

    if (fixtureId) {
      params.set("fixtureId", fixtureId);
    }

    const response = await fetch(`/api/community-slips?${params.toString()}`, {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(dictionary.communitySlipsRefreshFailed);
    }

    const nextData = await response.json();
    setHubData(nextData);
    return nextData;
  }

  function loadSlipIntoComposer(slip) {
    setEditingSlipId(slip.id);
    setTitle(slip.title || "");
    setSummary(slip.summary || "");
    setStakeAmount(slip.stakeAmount != null ? String(slip.stakeAmount) : "");
    setPicks((slip.selections || []).map((selection) => buildComposerPickFromSelection(selection)));
    setSelectedFixtureId(slip.fixtureIds?.[0] || fixtureId || hubData.catalog?.[0]?.fixtureId || "");
    setMessage(dictionary.communitySlipsEditingDraft);
    setError("");
  }

  function resetComposer() {
    setEditingSlipId(null);
    setTitle("");
    setSummary("");
    setStakeAmount("");
    setPicks([]);
  }

  function togglePick(option) {
    setPicks((current) => {
      const existingSelection = current.find(
        (entry) => entry.oddsSelectionId === option.oddsSelectionId
      );

      if (existingSelection) {
        return current.filter((entry) => entry.oddsSelectionId !== option.oddsSelectionId);
      }

      const next = current.filter(
        (entry) =>
          !(
            entry.fixtureId === option.fixtureId &&
            entry.oddsMarketId &&
            option.oddsMarketId &&
            entry.oddsMarketId === option.oddsMarketId
          )
      );

      return [
        ...next,
        {
          fixtureId: option.fixtureId,
          oddsSelectionId: option.oddsSelectionId,
          oddsMarketId: option.oddsMarketId,
          fixtureLabel:
            hubData.catalog.find((fixture) => fixture.fixtureId === option.fixtureId)?.fixtureLabel ||
            dictionary.communitySlipsFixtureFallback,
          selectionLabel: option.selectionLabel,
          marketType: option.marketType,
          bookmaker: option.bookmaker,
          priceDecimal: option.priceDecimal,
          priceLabel: option.priceLabel,
        },
      ].slice(0, 8);
    });
  }

  async function handleSave(publish) {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingSlipId
          ? `/api/community-slips/${editingSlipId}?locale=${encodeURIComponent(locale)}`
          : `/api/community-slips?locale=${encodeURIComponent(locale)}`,
        {
          method: editingSlipId ? "PUT" : "POST",
          headers: {
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            title,
            summary,
            stakeAmount: stakeAmount || null,
            publish,
            picks: picks.map((pick) => ({
              fixtureId: pick.fixtureId,
              oddsSelectionId: pick.oddsSelectionId,
              oddsMarketId: pick.oddsMarketId,
            })),
          }),
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || dictionary.communitySlipsSaveFailed);
      }

      trackProductAnalyticsEvent({
        event: publish ? "community_slip_publish" : "community_slip_create",
        surface,
        entityType,
        entityId,
        metadata: {
          slipId: payload.slip.id,
          selectionCount: payload.slip.selectionCount,
          fixtureId: fixtureId || null,
        },
      });

      await refreshHubData();
      setEditingSlipId(payload.slip.id);
      setMessage(
        publish
          ? dictionary.communitySlipsPublishedMessage
          : dictionary.communitySlipsSavedMessage
      );

      if (publish) {
        resetComposer();
      }
    } catch (saveError) {
      setError(saveError.message || dictionary.communitySlipsSaveFailed);
    } finally {
      setWorking(false);
    }
  }

  async function handleLike(slip) {
    setWorking(true);
    setError("");

    try {
      const response = await fetch(
        `/api/community-slips/${slip.id}/like?locale=${encodeURIComponent(locale)}`,
        {
          method: slip.hasLiked ? "DELETE" : "POST",
          credentials: "same-origin",
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || dictionary.communitySlipsLikeFailed);
      }

      trackProductAnalyticsEvent({
        event: "community_slip_like",
        surface,
        entityType,
        entityId,
        metadata: {
          slipId: slip.id,
          liked: !slip.hasLiked,
        },
      });

      setHubData((current) => patchSlipData(current, payload.slip));
    } catch (likeError) {
      setError(likeError.message || dictionary.communitySlipsLikeFailed);
    } finally {
      setWorking(false);
    }
  }

  const selectedFixture =
    hubData.catalog.find((fixture) => fixture.fixtureId === selectedFixtureId) || hubData.catalog[0];
  const totals = computeTotals(picks, stakeAmount);
  const composerVisible = allowComposer && Boolean(sessionUser);
  return (
    <ModuleEngagementTracker
      moduleType="community_slip_hub"
      entityType={entityType}
      entityId={entityId}
      surface={surface}
      metadata={{ viewerTerritory }}
    >
      <section className={styles.hub}>
        <div className={`${styles.hero} ${compact ? styles.compactHero : ""}`}>
          <div className={styles.header}>
            <div className={styles.stack}>
              <p className={styles.cardLead}>{dictionary.communitySlipsEyebrow}</p>
              <h2 className={styles.cardTitle}>{dictionary.communitySlipsTitle}</h2>
              <p className={styles.heroLead}>{dictionary.communitySlipsLead}</p>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{hubData.summary.publicCount}</span>
                <span className={styles.statLabel}>{dictionary.communitySlipsPublicCount}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{hubData.summary.todayCount}</span>
                <span className={styles.statLabel}>{dictionary.communitySlipsToday}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{hubData.summary.creatorCount}</span>
                <span className={styles.statLabel}>{dictionary.communitySlipsAuthors}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{hubData.summary.activeFixtureCount}</span>
                <span className={styles.statLabel}>{dictionary.communitySlipsFixtures}</span>
              </div>
            </div>
          </div>

          <div className={styles.heroActions}>
            {predictionsHref ? (
              <TrackedActionLink href={predictionsHref} className={styles.ctaPrimary}>
                {dictionary.communitySlipsOpenPredictions}
              </TrackedActionLink>
            ) : null}

            {!sessionUser ? (
              <TrackedActionLink href={authHref} className={styles.ctaSecondary}>
                {dictionary.communitySlipsSignInAction}
              </TrackedActionLink>
            ) : null}
          </div>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}
        {message ? <div className={styles.message}>{message}</div> : null}

        <div className={styles.grid}>
          <div className={styles.stack}>
            {allowComposer ? (
              composerVisible ? (
              <div className={styles.composerCard}>
                <div className={styles.columnHeader}>
                  <div>
                    <h3 className={styles.sectionTitle}>{dictionary.communitySlipsComposerTitle}</h3>
                    <p className={styles.cardLead}>{dictionary.communitySlipsComposerLead}</p>
                  </div>
                  {editingSlipId ? (
                    <span className={styles.badge}>{dictionary.communitySlipsEditingDraft}</span>
                  ) : null}
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{dictionary.communitySlipsComposerFixture}</span>
                    <div className={styles.fixtureTabs}>
                      {(hubData.catalog || []).map((fixture) => (
                        <button
                          key={fixture.fixtureId}
                          type="button"
                          className={
                            fixture.fixtureId === selectedFixture?.fixtureId
                              ? styles.fixtureTabActive
                              : styles.fixtureTab
                          }
                          onClick={() => setSelectedFixtureId(fixture.fixtureId)}
                        >
                          {fixture.fixtureLabel}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{dictionary.communitySlipsComposerTitleLabel}</span>
                    <input
                      className={styles.input}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={dictionary.communitySlipsComposerTitlePlaceholder}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{dictionary.communitySlipsComposerSummaryLabel}</span>
                    <textarea
                      className={styles.textarea}
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      placeholder={dictionary.communitySlipsComposerSummaryPlaceholder}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{dictionary.communitySlipsComposerStakeLabel}</span>
                    <input
                      className={styles.input}
                      inputMode="decimal"
                      value={stakeAmount}
                      onChange={(event) => setStakeAmount(event.target.value)}
                      placeholder="10.00"
                    />
                  </label>

                  <div className={styles.stack}>
                    <div className={styles.columnHeader}>
                      <h4 className={styles.sectionTitle}>{dictionary.communitySlipsComposerMarkets}</h4>
                      {selectedFixture?.competitionName ? (
                        <span className={styles.badge}>{selectedFixture.competitionName}</span>
                      ) : null}
                    </div>

                    {selectedFixture?.marketGroups?.length ? (
                      selectedFixture.marketGroups.map((group) => (
                        <div key={group.id} className={styles.marketGroup}>
                          <h5 className={styles.marketGroupTitle}>{group.label}</h5>
                          <div className={styles.optionGrid}>
                            {group.options.map((option) => {
                              const active = picks.some(
                                (pick) => pick.oddsSelectionId === option.oddsSelectionId
                              );

                              return (
                                <button
                                  key={option.oddsSelectionId}
                                  type="button"
                                  className={`${styles.pickButton} ${active ? styles.pickButtonActive : ""}`}
                                  onClick={() => togglePick(option)}
                                >
                                  <strong>{option.selectionLabel}</strong>
                                  <span className={styles.pickSubline}>
                                    {[option.marketType, option.bookmaker, option.lineLabel]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                  <span className={styles.price}>{option.priceLabel || dictionary.noData}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.empty}>{dictionary.communitySlipsNoMarkets}</div>
                    )}
                  </div>

                  <div className={styles.stack}>
                    <div className={styles.columnHeader}>
                      <h4 className={styles.sectionTitle}>{dictionary.communitySlipsComposerPicks}</h4>
                      <span className={styles.badge}>{picks.length}</span>
                    </div>

                    {picks.length ? (
                      <div className={styles.pickList}>
                        {picks.map((pick) => (
                          <div key={pick.oddsSelectionId} className={styles.pickItem}>
                            <div>
                              <p className={styles.selectionTitle}>{pick.selectionLabel}</p>
                              <p className={styles.selectionMeta}>
                                {[pick.fixtureLabel, pick.marketType, pick.bookmaker]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <div className={styles.cardActions}>
                              <span className={styles.price}>{pick.priceLabel || dictionary.noData}</span>
                              <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() =>
                                  setPicks((current) =>
                                    current.filter(
                                      (entry) => entry.oddsSelectionId !== pick.oddsSelectionId
                                    )
                                  )
                                }
                              >
                                {dictionary.communitySlipsRemovePick}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.empty}>{dictionary.communitySlipsEmptyComposer}</div>
                    )}
                  </div>

                  <div className={styles.metrics}>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>{dictionary.communitySlipsTotalOdds}</span>
                      <span className={styles.metricValue}>{totals.totalOdds || dictionary.noData}</span>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>{dictionary.communitySlipsExpectedPayout}</span>
                      <span className={styles.metricValue}>{totals.expectedPayout || dictionary.noData}</span>
                    </div>
                  </div>

                  <div className={styles.composerActions}>
                    <button
                      type="button"
                      className={styles.saveButton}
                      onClick={() => handleSave(false)}
                      disabled={working || !picks.length}
                    >
                      {editingSlipId
                        ? dictionary.communitySlipsUpdateDraft
                        : dictionary.communitySlipsSaveDraft}
                    </button>
                    <button
                      type="button"
                      className={styles.publishButton}
                      onClick={() => handleSave(true)}
                      disabled={working || !picks.length}
                    >
                      {editingSlipId
                        ? dictionary.communitySlipsUpdatePublished
                        : dictionary.communitySlipsPublish}
                    </button>
                    {editingSlipId ? (
                      <button
                        type="button"
                        className={styles.ctaSecondary}
                        onClick={resetComposer}
                      >
                        {dictionary.communitySlipsResetComposer}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              ) : (
              <div className={styles.signInCard}>
                <h3 className={styles.sectionTitle}>{dictionary.communitySlipsSignInTitle}</h3>
                <p className={styles.cardLead}>{dictionary.communitySlipsSignInBody}</p>
                {!sessionUser ? (
                  <TrackedActionLink href={authHref} className={styles.ctaPrimary}>
                    {dictionary.communitySlipsSignInAction}
                  </TrackedActionLink>
                ) : null}
              </div>
              )
            ) : null}

            {hubData.featured ? (
              <div className={styles.column}>
                <div className={styles.columnHeader}>
                  <h3 className={styles.sectionTitle}>{dictionary.communitySlipsFeatured}</h3>
                  <span className={styles.badge}>{dictionary.communitySlipsCommunityPulse}</span>
                </div>
                <SlipCard
                  locale={locale}
                  dictionary={dictionary}
                  slip={hubData.featured}
                  onLike={handleLike}
                  canLike={Boolean(sessionUser && !hubData.featured.isOwner)}
                  accent
                />
              </div>
            ) : null}
          </div>

          <div className={styles.feedColumns}>
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h3 className={styles.sectionTitle}>{dictionary.communitySlipsLatest}</h3>
                <span className={styles.badge}>{hubData.latest?.length || 0}</span>
              </div>
              {hubData.latest?.length ? (
                hubData.latest.map((slip) => (
                  <SlipCard
                    key={slip.id}
                    locale={locale}
                    dictionary={dictionary}
                    slip={slip}
                    onLike={handleLike}
                    canLike={Boolean(sessionUser && !slip.isOwner)}
                  />
                ))
              ) : (
                <div className={styles.empty}>{dictionary.communitySlipsEmpty}</div>
              )}
            </div>

            {sessionUser || hubData.mine?.length ? (
              <div className={styles.column}>
                <div className={styles.columnHeader}>
                  <h3 className={styles.sectionTitle}>{dictionary.communitySlipsMineTitle}</h3>
                  <span className={styles.badge}>{hubData.mine?.length || 0}</span>
                </div>
                {hubData.mine?.length ? (
                  hubData.mine.map((slip) => (
                    <SlipCard
                      key={slip.id}
                      locale={locale}
                      dictionary={dictionary}
                      slip={slip}
                      onLike={handleLike}
                      onEdit={loadSlipIntoComposer}
                      isOwner
                    />
                  ))
                ) : (
                  <div className={styles.empty}>{dictionary.communitySlipsMineEmpty}</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </ModuleEngagementTracker>
  );
}
