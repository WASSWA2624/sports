"use client";

import { useEffect, useState } from "react";
import { buildMatchHref } from "../../lib/coreui/routes";
import { trackProductAnalyticsEvent } from "../../lib/product-analytics";
import { ModuleEngagementTracker } from "./module-engagement-tracker";
import { TrackedActionLink } from "./tracked-action-link";
import { usePreferences } from "./preferences-provider";
import styles from "./community-slip-hub.module.css";

function formatDateTime(value, locale) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(parsed);
}

function getStatusClass(status) {
  if (status === "PUBLISHED") return styles.statusPublished;
  if (status === "SETTLED") return styles.statusSettled;
  return styles.statusDraft;
}

function getStatusLabel(status, dictionary) {
  if (status === "PUBLISHED") return dictionary.communitySlipsStatusPublished;
  if (status === "SETTLED") return dictionary.communitySlipsStatusSettled;
  return dictionary.communitySlipsStatusDraft;
}

function buildComposerPick(selection) {
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
    reason: selection.reason || "",
  };
}

function computeTotals(picks = [], stakeAmount = "") {
  const totalOdds = picks.reduce((product, pick) => {
    const price = Number(pick.priceDecimal);
    return Number.isFinite(price) ? product * price : product;
  }, 1);
  const stake = Number(stakeAmount);
  return {
    totalOdds: picks.length ? totalOdds.toFixed(2) : null,
    expectedPayout:
      picks.length && Number.isFinite(stake) && stake > 0
        ? (stake * totalOdds).toFixed(2)
        : null,
  };
}

function replaceSlipInList(list = [], nextSlip) {
  return Array.isArray(list) && list.some((entry) => entry.id === nextSlip?.id)
    ? list.map((entry) => (entry.id === nextSlip.id ? nextSlip : entry))
    : list;
}

function patchSlipData(current, nextSlip) {
  if (!current || !nextSlip) return current;
  return {
    ...current,
    featured: current.featured?.id === nextSlip.id ? nextSlip : current.featured,
    latest: replaceSlipInList(current.latest, nextSlip),
    mine: replaceSlipInList(current.mine, nextSlip),
    authorHistory: replaceSlipInList(current.authorHistory, nextSlip),
  };
}

function getAuthorName(author) {
  return author?.displayName || author?.username || "Community";
}

function SlipCard({
  locale,
  dictionary,
  slip,
  onLike,
  onEdit,
  onOpenHistory,
  canLike,
  isOwner,
  accent,
}) {
  if (!slip) return null;

  const selections = Array.isArray(slip.selections) ? slip.selections.slice(0, 3) : [];
  const matchHref = slip.primaryFixtureRef
    ? buildMatchHref(locale, { externalRef: slip.primaryFixtureRef })
    : null;
  const publishedLabel = formatDateTime(slip.publishedAt || slip.createdAt, locale);

  return (
    <article className={`${styles.card} ${accent ? styles.slipCardAccent : ""}`}>
      <div className={styles.cardHeader}>
        <div className={styles.stack}>
          <div className={styles.metaRow}>
            <span className={getStatusClass(slip.status)}>
              {getStatusLabel(slip.status, dictionary)}
            </span>
            {slip.isFeatured ? (
              <span className={styles.badge}>{dictionary.communitySlipsFeatured}</span>
            ) : null}
          </div>
          <div>
            <h3 className={styles.cardTitle}>{slip.title}</h3>
            <p className={styles.cardLead}>
              {dictionary.communitySlipsBy} {getAuthorName(slip.author)}
              {publishedLabel ? ` | ${publishedLabel}` : ""}
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
        {selections.map((selection) => (
          <div key={selection.id} className={styles.selectionItem}>
            <div>
              <p className={styles.selectionTitle}>{selection.selectionLabel}</p>
              <p className={styles.selectionMeta}>
                {[selection.fixtureLabel, selection.marketType, selection.bookmaker]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              {selection.reason ? (
                <p className={styles.selectionReason}>
                  {dictionary.communitySlipsReasonLabel}: {selection.reason}
                </p>
              ) : null}
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
          <span className={styles.metricValue}>
            {slip.expectedPayoutLabel || dictionary.noData}
          </span>
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
          <button type="button" className={styles.likeButton} onClick={() => onLike?.(slip)}>
            {slip.hasLiked ? dictionary.communitySlipsLiked : dictionary.communitySlipsLike}
          </button>
        ) : null}

        {onOpenHistory && slip.author?.id && slip.status === "PUBLISHED" ? (
          <button
            type="button"
            className={styles.ctaSecondary}
            onClick={() => onOpenHistory(slip.author)}
          >
            {dictionary.communitySlipsViewHistory}
          </button>
        ) : null}

        {isOwner && onEdit ? (
          <button type="button" className={styles.editButton} onClick={() => onEdit(slip)}>
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
  const [selectedAuthorId, setSelectedAuthorId] = useState(initialData.selectedAuthor?.id || "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [picks, setPicks] = useState([]);
  const [editingSlipId, setEditingSlipId] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setHubData(initialData);
    setSelectedAuthorId(initialData.selectedAuthor?.id || "");
  }, [initialData]);

  useEffect(() => {
    if (fixtureId) {
      setSelectedFixtureId(fixtureId);
      return;
    }

    if (!(hubData.catalog || []).some((fixture) => fixture.fixtureId === selectedFixtureId)) {
      setSelectedFixtureId(hubData.catalog?.[0]?.fixtureId || "");
    }
  }, [fixtureId, hubData.catalog, selectedFixtureId]);

  async function refreshHubData(nextAuthorId = selectedAuthorId) {
    const params = new URLSearchParams({
      locale,
      territory: viewerTerritory,
      withComposer: allowComposer ? "1" : "0",
    });

    if (fixtureId) params.set("fixtureId", fixtureId);
    if (nextAuthorId) params.set("authorId", nextAuthorId);

    const response = await fetch(`/api/community-slips?${params.toString()}`, {
      credentials: "same-origin",
    });

    if (!response.ok) throw new Error(dictionary.communitySlipsRefreshFailed);

    const nextData = await response.json();
    setHubData(nextData);
    setSelectedAuthorId(nextData.selectedAuthor?.id || nextAuthorId || "");
    return nextData;
  }

  function loadSlipIntoComposer(slip) {
    setEditingSlipId(slip.id);
    setTitle(slip.title || "");
    setSummary(slip.summary || "");
    setStakeAmount(slip.stakeAmount != null ? String(slip.stakeAmount) : "");
    setPicks((slip.selections || []).map((selection) => buildComposerPick(selection)));
    setSelectedFixtureId(slip.fixtureIds?.[0] || fixtureId || hubData.catalog?.[0]?.fixtureId || "");
    setError("");
    setMessage(dictionary.communitySlipsEditingDraft);
  }

  function resetComposer() {
    setEditingSlipId(null);
    setTitle("");
    setSummary("");
    setStakeAmount("");
    setPicks([]);
    setError("");
  }

  async function openAuthorHistory(author) {
    if (!author?.id) return;

    setError("");
    setMessage("");
    setSelectedAuthorId(author.id);

    try {
      trackProductAnalyticsEvent({
        event: "community_slip_open",
        surface,
        entityType,
        entityId,
        action: "author-history",
        metadata: { authorId: author.id, username: author.username || null },
      });
      await refreshHubData(author.id);
    } catch (historyError) {
      setError(historyError.message || dictionary.communitySlipsHistoryFailed);
    }
  }

  async function clearAuthorHistory() {
    setError("");
    setMessage("");
    setSelectedAuthorId("");

    try {
      await refreshHubData("");
    } catch (historyError) {
      setError(historyError.message || dictionary.communitySlipsRefreshFailed);
    }
  }

  function togglePick(option) {
    setPicks((current) => {
      if (current.some((entry) => entry.oddsSelectionId === option.oddsSelectionId)) {
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
            catalog.find((fixture) => fixture.fixtureId === option.fixtureId)?.fixtureLabel ||
            dictionary.communitySlipsFixtureFallback,
          selectionLabel: option.selectionLabel,
          marketType: option.marketType,
          bookmaker: option.bookmaker,
          priceDecimal: option.priceDecimal,
          priceLabel: option.priceLabel,
          reason: "",
        },
      ].slice(0, 8);
    });
  }

  function updatePickReason(oddsSelectionId, reason) {
    setPicks((current) =>
      current.map((pick) =>
        pick.oddsSelectionId === oddsSelectionId ? { ...pick, reason } : pick
      )
    );
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
          headers: { "content-type": "application/json" },
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
              reason: pick.reason || null,
            })),
          }),
        }
      );

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || dictionary.communitySlipsSaveFailed);

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
      if (publish) {
        resetComposer();
      } else {
        setEditingSlipId(payload.slip.id);
      }

      setMessage(
        publish
          ? dictionary.communitySlipsPublishedMessage
          : dictionary.communitySlipsSavedMessage
      );
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
        { method: slip.hasLiked ? "DELETE" : "POST", credentials: "same-origin" }
      );

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || dictionary.communitySlipsLikeFailed);

      trackProductAnalyticsEvent({
        event: "community_slip_like",
        surface,
        entityType,
        entityId,
        metadata: { slipId: slip.id, liked: !slip.hasLiked },
      });

      setHubData((current) => patchSlipData(current, payload.slip));
    } catch (likeError) {
      setError(likeError.message || dictionary.communitySlipsLikeFailed);
    } finally {
      setWorking(false);
    }
  }

  const catalog = Array.isArray(hubData.catalog) ? hubData.catalog : [];
  const selectedFixture =
    catalog.find((fixture) => fixture.fixtureId === selectedFixtureId) || catalog[0] || null;
  const totals = computeTotals(picks, stakeAmount);
  const composerVisible = allowComposer && Boolean(sessionUser);
  const heroSlip = hubData.featured || hubData.latest?.[0] || hubData.mine?.[0] || null;

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
          <div className={styles.heroLayout}>
            <div className={styles.heroMain}>
              <div className={styles.heroBadgeRow}>
                <span className={styles.heroTag}>{dictionary.communitySlipsEyebrow}</span>
                <span className={styles.heroTag}>{dictionary.communitySlipsCommunityPulse}</span>
                {hubData.featured ? (
                  <span className={styles.heroTag}>{dictionary.communitySlipsFeatured}</span>
                ) : null}
              </div>

              <div className={styles.stack}>
                <h2 className={styles.heroTitle}>{dictionary.communitySlipsTitle}</h2>
                <p className={styles.heroLead}>{dictionary.communitySlipsLead}</p>
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

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{hubData.summary?.publicCount || 0}</span>
                  <span className={styles.statLabel}>{dictionary.communitySlipsPublicCount}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{hubData.summary?.todayCount || 0}</span>
                  <span className={styles.statLabel}>{dictionary.communitySlipsToday}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{hubData.summary?.creatorCount || 0}</span>
                  <span className={styles.statLabel}>{dictionary.communitySlipsAuthors}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {hubData.summary?.activeFixtureCount || 0}
                  </span>
                  <span className={styles.statLabel}>{dictionary.communitySlipsFixtures}</span>
                </div>
              </div>
            </div>

            <div className={styles.heroSpotlight}>
              <div className={styles.spotlightCard}>
                <div className={styles.spotlightHeader}>
                  <div>
                    <p className={styles.spotlightEyebrow}>
                      {heroSlip
                        ? dictionary.communitySlipsFeatured
                        : dictionary.communitySlipsLatest}
                    </p>
                    <h3 className={styles.spotlightTitle}>
                      {heroSlip?.title || dictionary.communitySlipsLatest}
                    </h3>
                  </div>
                  {heroSlip?.status ? (
                    <span className={getStatusClass(heroSlip.status)}>
                      {getStatusLabel(heroSlip.status, dictionary)}
                    </span>
                  ) : null}
                </div>

                {heroSlip ? (
                  <>
                    <p className={styles.spotlightMeta}>
                      {dictionary.communitySlipsBy} {getAuthorName(heroSlip.author)}
                    </p>
                    <div className={styles.spotlightMetrics}>
                      <div className={styles.spotlightMetric}>
                        <span className={styles.spotlightMetricLabel}>
                          {dictionary.communitySlipsSelections}
                        </span>
                        <strong>{heroSlip.selectionCount}</strong>
                      </div>
                      <div className={styles.spotlightMetric}>
                        <span className={styles.spotlightMetricLabel}>
                          {dictionary.communitySlipsTotalOdds}
                        </span>
                        <strong>{heroSlip.totalOddsLabel || dictionary.noData}</strong>
                      </div>
                      <div className={styles.spotlightMetric}>
                        <span className={styles.spotlightMetricLabel}>
                          {dictionary.communitySlipsLikes}
                        </span>
                        <strong>{heroSlip.likeCount}</strong>
                      </div>
                    </div>
                    <div className={styles.spotlightSelections}>
                      {(heroSlip.selections || []).slice(0, 2).map((selection) => (
                        <div key={selection.id} className={styles.spotlightSelection}>
                          <div>
                            <p className={styles.selectionTitle}>{selection.selectionLabel}</p>
                            <p className={styles.selectionMeta}>
                              {[selection.fixtureLabel, selection.marketType]
                                .filter(Boolean)
                                .join(" | ")}
                            </p>
                          </div>
                          <span className={styles.price}>
                            {selection.priceLabel || dictionary.noData}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.spotlightEmpty}>
                    <p className={styles.muted}>{dictionary.communitySlipsEmpty}</p>
                    {!sessionUser ? (
                      <TrackedActionLink href={authHref} className={styles.ctaSecondary}>
                        {dictionary.communitySlipsSignInAction}
                      </TrackedActionLink>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
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
                      <h3 className={styles.sectionTitle}>
                        {dictionary.communitySlipsComposerTitle}
                      </h3>
                      <p className={styles.cardLead}>{dictionary.communitySlipsComposerLead}</p>
                    </div>
                    {editingSlipId ? (
                      <span className={styles.badge}>{dictionary.communitySlipsEditingDraft}</span>
                    ) : null}
                  </div>

                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {dictionary.communitySlipsComposerFixture}
                      </span>
                      <div className={styles.fixtureTabs}>
                        {catalog.length ? (
                          catalog.map((fixture) => (
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
                          ))
                        ) : (
                          <div className={styles.empty}>{dictionary.communitySlipsNoMarkets}</div>
                        )}
                      </div>
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {dictionary.communitySlipsComposerTitleLabel}
                      </span>
                      <input
                        className={styles.input}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={dictionary.communitySlipsComposerTitlePlaceholder}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {dictionary.communitySlipsComposerSummaryLabel}
                      </span>
                      <textarea
                        className={styles.textarea}
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                        placeholder={dictionary.communitySlipsComposerSummaryPlaceholder}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        {dictionary.communitySlipsComposerStakeLabel}
                      </span>
                      <input
                        className={styles.input}
                        inputMode="decimal"
                        value={stakeAmount}
                        onChange={(event) => setStakeAmount(event.target.value)}
                        placeholder="10.00"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className={styles.signInCard}>
                  <h3 className={styles.sectionTitle}>
                    {dictionary.communitySlipsSignInTitle}
                  </h3>
                  <p className={styles.cardLead}>{dictionary.communitySlipsSignInBody}</p>
                  {!sessionUser ? (
                    <TrackedActionLink href={authHref} className={styles.ctaPrimary}>
                      {dictionary.communitySlipsSignInAction}
                    </TrackedActionLink>
                  ) : null}
                </div>
              )
            ) : null}

            {composerVisible ? (
              <>
                <div className={styles.stack}>
                  <div className={styles.columnHeader}>
                    <h4 className={styles.sectionTitle}>
                      {dictionary.communitySlipsComposerMarkets}
                    </h4>
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
                                className={`${styles.pickButton} ${
                                  active ? styles.pickButtonActive : ""
                                }`}
                                onClick={() => togglePick(option)}
                              >
                                <strong>{option.selectionLabel}</strong>
                                <span className={styles.pickSubline}>
                                  {[option.marketType, option.bookmaker, option.lineLabel]
                                    .filter(Boolean)
                                    .join(" | ")}
                                </span>
                                <span className={styles.price}>
                                  {option.priceLabel || dictionary.noData}
                                </span>
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
                    <h4 className={styles.sectionTitle}>
                      {dictionary.communitySlipsComposerPicks}
                    </h4>
                    <span className={styles.badge}>{picks.length}</span>
                  </div>

                  {picks.length ? (
                    <div className={styles.pickList}>
                      {picks.map((pick) => (
                        <div key={pick.oddsSelectionId} className={styles.pickItem}>
                          <div className={styles.pickBody}>
                            <div>
                              <p className={styles.selectionTitle}>{pick.selectionLabel}</p>
                              <p className={styles.selectionMeta}>
                                {[pick.fixtureLabel, pick.marketType, pick.bookmaker]
                                  .filter(Boolean)
                                  .join(" | ")}
                              </p>
                            </div>
                            <div className={styles.cardActions}>
                              <span className={styles.price}>
                                {pick.priceLabel || dictionary.noData}
                              </span>
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

                          <label className={styles.inlineReasonField}>
                            <span className={styles.fieldLabel}>
                              {dictionary.communitySlipsReasonInput}
                            </span>
                            <textarea
                              className={styles.textareaCompact}
                              value={pick.reason || ""}
                              onChange={(event) =>
                                updatePickReason(pick.oddsSelectionId, event.target.value)
                              }
                              placeholder={dictionary.communitySlipsReasonPlaceholder}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.empty}>{dictionary.communitySlipsEmptyComposer}</div>
                  )}
                </div>

                <div className={styles.metrics}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>
                      {dictionary.communitySlipsTotalOdds}
                    </span>
                    <span className={styles.metricValue}>
                      {totals.totalOdds || dictionary.noData}
                    </span>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>
                      {dictionary.communitySlipsExpectedPayout}
                    </span>
                    <span className={styles.metricValue}>
                      {totals.expectedPayout || dictionary.noData}
                    </span>
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
                  {(editingSlipId || picks.length || title || summary || stakeAmount) ? (
                    <button
                      type="button"
                      className={styles.ctaSecondary}
                      onClick={resetComposer}
                      disabled={working}
                    >
                      {dictionary.communitySlipsResetComposer}
                    </button>
                  ) : null}
                </div>
              </>
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
                  onOpenHistory={openAuthorHistory}
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
                    onOpenHistory={openAuthorHistory}
                    canLike={Boolean(sessionUser && !slip.isOwner)}
                  />
                ))
              ) : (
                <div className={styles.empty}>{dictionary.communitySlipsEmpty}</div>
              )}
            </div>

            {(hubData.selectedAuthor?.id || selectedAuthorId) ? (
              <div className={styles.column}>
                <div className={styles.columnHeader}>
                  <h3 className={styles.sectionTitle}>
                    {dictionary.communitySlipsAuthorHistoryTitle.replace(
                      "{name}",
                      getAuthorName(hubData.selectedAuthor)
                    )}
                  </h3>
                  <button
                    type="button"
                    className={styles.ctaSecondary}
                    onClick={clearAuthorHistory}
                  >
                    {dictionary.communitySlipsCloseHistory}
                  </button>
                </div>
                {hubData.authorHistory?.length ? (
                  hubData.authorHistory.map((slip) => (
                    <SlipCard
                      key={slip.id}
                      locale={locale}
                      dictionary={dictionary}
                      slip={slip}
                      onLike={handleLike}
                      onOpenHistory={openAuthorHistory}
                      canLike={Boolean(sessionUser && !slip.isOwner)}
                    />
                  ))
                ) : (
                  <div className={styles.empty}>
                    {dictionary.communitySlipsAuthorHistoryEmpty}
                  </div>
                )}
              </div>
            ) : null}

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
                      onOpenHistory={openAuthorHistory}
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
