"use client";

import { useMemo, useState } from "react";
import editorStyles from "./news-editor.module.css";
import sharedStyles from "../../../../components/coreui/styles.module.css";
import { buildArticleQualitySignal, slugifyArticleTitle } from "../../../../lib/coreui/news";

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

function buildEmptyDraft(categories) {
  return {
    id: null,
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    status: "DRAFT",
    categoryId: categories[0]?.id || "",
    categoryName: "",
    categorySlug: "",
    sourceUrl: "",
    imageUrl: "",
    publishedAt: "",
    topicLabel: "",
    hero: false,
    homepagePlacement: false,
    homepageRank: "",
    moderationNotes: "",
    entityLinks: [],
  };
}

function articleToForm(article, categories) {
  if (!article) {
    return buildEmptyDraft(categories);
  }

  return {
    id: article.id,
    title: article.title || "",
    slug: article.slug || "",
    excerpt: article.excerpt || "",
    body: article.body || "",
    status: article.status || "DRAFT",
    categoryId: article.category?.id || "",
    categoryName: article.category?.name || "",
    categorySlug: article.category?.slug || "",
    sourceUrl: article.sourceUrl || "",
    imageUrl: article.imageUrl || "",
    publishedAt: toDateTimeLocal(article.publishedAt),
    topicLabel: article.topicLabel || "",
    hero: Boolean(article.hero),
    homepagePlacement: Boolean(article.homepagePlacement),
    homepageRank: article.homepageRank || "",
    moderationNotes: article.moderationNotes || "",
    entityLinks: (article.entityLinks || []).map((entry) => ({
      entityType: entry.entityType,
      entityId: entry.entityId,
      label: entry.label || "",
    })),
  };
}

function getEntitySelections(form, entityType) {
  return new Set(
    form.entityLinks
      .filter((entry) => entry.entityType === entityType)
      .map((entry) => entry.entityId)
  );
}

function buildQualityPreview(form, options) {
  const findSelections = (entityType, collection) =>
    collection.filter((entry) => getEntitySelections(form, entityType).has(entry.id));

  return buildArticleQualitySignal({
    title: form.title,
    excerpt: form.excerpt,
    body: form.body,
    imageUrl: form.imageUrl,
    status: form.status,
    metadata: {
      moderationNotes: form.moderationNotes,
    },
    entities: {
      sports: findSelections("SPORT", options.sports),
      competitions: findSelections("COMPETITION", options.competitions),
      teams: findSelections("TEAM", options.teams),
      fixtures: findSelections("FIXTURE", options.fixtures),
    },
  });
}

async function loadWorkspace() {
  const response = await fetch("/api/news/articles?includeDrafts=1");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Failed to refresh news workspace.");
  }

  return payload;
}

export default function NewsEditorClient({
  dictionary,
  initialWorkspace,
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedArticleId, setSelectedArticleId] = useState(initialWorkspace.articles[0]?.id || null);
  const [form, setForm] = useState(
    articleToForm(initialWorkspace.articles[0] || null, initialWorkspace.categories)
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedArticle =
    workspace.articles.find((article) => article.id === selectedArticleId) || null;
  const quality = useMemo(
    () => buildQualityPreview(form, workspace.options),
    [form, workspace.options]
  );

  function selectArticle(article) {
    setSelectedArticleId(article?.id || null);
    setForm(articleToForm(article || null, workspace.categories));
    setMessage("");
  }

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" && !current.id && !current.slug
        ? { slug: slugifyArticleTitle(value) }
        : {}),
    }));
  }

  function toggleEntity(entityType, entityId, label) {
    setForm((current) => {
      const existing = current.entityLinks.find(
        (entry) => entry.entityType === entityType && entry.entityId === entityId
      );

      return {
        ...current,
        entityLinks: existing
          ? current.entityLinks.filter(
              (entry) => !(entry.entityType === entityType && entry.entityId === entityId)
            )
          : [...current.entityLinks, { entityType, entityId, label }],
      };
    });
  }

  async function refreshWorkspace(nextSelectedArticleId = selectedArticleId) {
    const nextWorkspace = await loadWorkspace();
    setWorkspace(nextWorkspace);

    const nextSelected =
      nextWorkspace.articles.find((article) => article.id === nextSelectedArticleId) || null;
    setSelectedArticleId(nextSelected?.id || null);
    setForm(articleToForm(nextSelected, nextWorkspace.categories));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      ...form,
      homepageRank: form.homepageRank ? Number(form.homepageRank) : null,
      publishedAt: toIsoDateTime(form.publishedAt),
    };

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/news/articles/${form.id}` : "/api/news/articles";
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || dictionary.newsManageSaveFailed);
      return;
    }

    await refreshWorkspace(data.article?.id || form.id || null);
    setMessage(dictionary.newsManageSaved);
  }

  async function handleArchive() {
    if (!form.id) {
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/news/articles/${form.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: form.moderationNotes }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || dictionary.newsManageArchiveFailed);
      return;
    }

    await refreshWorkspace(form.id);
    setMessage(dictionary.newsManageArchived);
  }

  function createDraft() {
    setSelectedArticleId(null);
    setForm(buildEmptyDraft(workspace.categories));
    setMessage("");
  }

  const groupedOptions = [
    {
      entityType: "SPORT",
      title: dictionary.sports,
      items: workspace.options.sports.map((entry) => ({
        id: entry.id,
        label: entry.name,
        description: entry.code,
      })),
    },
    {
      entityType: "COMPETITION",
      title: dictionary.leagues,
      items: workspace.options.competitions.map((entry) => ({
        id: entry.id,
        label: entry.name,
        description: entry.shortName || entry.code || "",
      })),
    },
    {
      entityType: "TEAM",
      title: dictionary.teams,
      items: workspace.options.teams.map((entry) => ({
        id: entry.id,
        label: entry.name,
        description: entry.league?.name || entry.shortName || "",
      })),
    },
    {
      entityType: "FIXTURE",
      title: dictionary.matchDetail,
      items: workspace.options.fixtures.map((entry) => ({
        id: entry.id,
        label: `${entry.homeTeam?.name || "Home"} vs ${entry.awayTeam?.name || "Away"}`,
        description: entry.league?.name || entry.status,
      })),
    },
  ];

  return (
    <section className={sharedStyles.section}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
          <h1 className={sharedStyles.pageTitle}>{dictionary.newsManage}</h1>
          <p className={sharedStyles.pageLead}>{dictionary.newsManageLead}</p>
        </div>
        <div className={sharedStyles.inlineBadgeRow}>
          <span className={sharedStyles.badge}>{workspace.summary.total}</span>
          <button type="button" className={sharedStyles.actionLink} onClick={createDraft}>
            {dictionary.newsManageNew}
          </button>
        </div>
      </header>

      <div className={editorStyles.layout}>
        <aside className={editorStyles.sidebar}>
          <article className={sharedStyles.panel}>
            <div className={sharedStyles.inlineBadgeRow}>
              <span className={sharedStyles.badge}>
                {dictionary.newsManageDrafts}: {workspace.summary.DRAFT}
              </span>
              <span className={sharedStyles.badge}>
                {dictionary.newsManagePublished}: {workspace.summary.PUBLISHED}
              </span>
              <span className={sharedStyles.badge}>
                {dictionary.newsManageArchivedLabel}: {workspace.summary.ARCHIVED}
              </span>
            </div>
          </article>

          <article className={`${sharedStyles.panel} ${editorStyles.articleList}`}>
            {workspace.articles.map((article) => (
              <button
                key={article.id}
                type="button"
                className={
                  article.id === selectedArticleId
                    ? editorStyles.articleListItemActive
                    : editorStyles.articleListItem
                }
                onClick={() => selectArticle(article)}
              >
                <span className={sharedStyles.badge}>{article.status}</span>
                <strong>{article.title}</strong>
                <span className={sharedStyles.muted}>{article.topicLabel}</span>
              </button>
            ))}
          </article>
        </aside>

        <form className={editorStyles.form} onSubmit={handleSave}>
          <article className={sharedStyles.panel}>
            <div className={editorStyles.formGrid}>
              <label className={editorStyles.field}>
                <span>{dictionary.newsManageTitle}</span>
                <input
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  required
                />
              </label>

              <label className={editorStyles.field}>
                <span>{dictionary.newsManageSlug}</span>
                <input
                  value={form.slug}
                  onChange={(event) => updateField("slug", event.target.value)}
                />
              </label>

              <label className={editorStyles.field}>
                <span>{dictionary.newsManageCategory}</span>
                <select
                  value={form.categoryId}
                  onChange={(event) => updateField("categoryId", event.target.value)}
                >
                  <option value="">{dictionary.browseAll}</option>
                  {workspace.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={editorStyles.field}>
                <span>{dictionary.newsManageTopic}</span>
                <input
                  value={form.topicLabel}
                  onChange={(event) => updateField("topicLabel", event.target.value)}
                />
              </label>

              <label className={editorStyles.field}>
                <span>{dictionary.newsManageStatus}</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <label className={editorStyles.field}>
                <span>{dictionary.newsManagePublishedAt}</span>
                <input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(event) => updateField("publishedAt", event.target.value)}
                />
              </label>
            </div>

            <label className={editorStyles.field}>
              <span>{dictionary.newsManageExcerpt}</span>
              <textarea
                rows={3}
                value={form.excerpt}
                onChange={(event) => updateField("excerpt", event.target.value)}
              />
            </label>

            <label className={editorStyles.field}>
              <span>{dictionary.newsManageBody}</span>
              <textarea
                rows={14}
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
              />
            </label>

            <div className={editorStyles.formGrid}>
              <label className={editorStyles.field}>
                <span>{dictionary.newsSourceLabel}</span>
                <input
                  value={form.sourceUrl}
                  onChange={(event) => updateField("sourceUrl", event.target.value)}
                />
              </label>

              <label className={editorStyles.field}>
                <span>{dictionary.newsManageImage}</span>
                <input
                  value={form.imageUrl}
                  onChange={(event) => updateField("imageUrl", event.target.value)}
                />
              </label>
            </div>

            <div className={editorStyles.checkboxRow}>
              <label className={editorStyles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.hero}
                  onChange={(event) => updateField("hero", event.target.checked)}
                />
                <span>{dictionary.newsManageHero}</span>
              </label>

              <label className={editorStyles.checkbox}>
                <input
                  type="checkbox"
                  checked={form.homepagePlacement}
                  onChange={(event) => updateField("homepagePlacement", event.target.checked)}
                />
                <span>{dictionary.newsManageHomepage}</span>
              </label>
            </div>

            <label className={editorStyles.field}>
              <span>Homepage rank</span>
              <input
                type="number"
                min="1"
                max="12"
                value={form.homepageRank}
                onChange={(event) => updateField("homepageRank", event.target.value)}
                placeholder="1"
              />
            </label>
          </article>

          <article className={sharedStyles.panel}>
            <div className={sharedStyles.sectionHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{dictionary.newsManageModeration}</p>
                <h2 className={sharedStyles.cardTitle}>{dictionary.newsManageQuality}</h2>
              </div>
              <span className={sharedStyles.badge}>{quality.score}</span>
            </div>

            <label className={editorStyles.field}>
              <span>{dictionary.newsManageModerationNotes}</span>
              <textarea
                rows={3}
                value={form.moderationNotes}
                onChange={(event) => updateField("moderationNotes", event.target.value)}
              />
            </label>

            <div className={editorStyles.qualityStack}>
              <span className={sharedStyles.badge}>{quality.state}</span>
              <span className={sharedStyles.badge}>
                {dictionary.newsManageWords}: {quality.wordCount}
              </span>
              <span className={sharedStyles.badge}>
                {dictionary.newsManageLinks}: {quality.totalLinks}
              </span>
            </div>

            {quality.issues.length ? (
              <div className={editorStyles.issueList}>
                {quality.issues.map((issue) => (
                  <span key={issue} className={sharedStyles.indicatorBadge}>
                    {issue}
                  </span>
                ))}
              </div>
            ) : (
              <div className={sharedStyles.emptyState}>{dictionary.newsManageNoIssues}</div>
            )}
          </article>

          <article className={sharedStyles.panel}>
            <div className={sharedStyles.sectionHeader}>
              <div>
                <p className={sharedStyles.eyebrow}>{dictionary.newsManageEntityLinks}</p>
                <h2 className={sharedStyles.cardTitle}>{dictionary.newsManageEntityLinksTitle}</h2>
              </div>
            </div>

            <div className={editorStyles.entityGrid}>
              {groupedOptions.map((group) => (
                <section key={group.entityType} className={editorStyles.entityGroup}>
                  <h3 className={sharedStyles.cardTitle}>{group.title}</h3>
                  <div className={editorStyles.entityList}>
                    {group.items.map((item) => {
                      const checked = getEntitySelections(form, group.entityType).has(item.id);

                      return (
                        <label key={item.id} className={editorStyles.entityOption}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEntity(group.entityType, item.id, item.label)}
                          />
                          <span>
                            <strong>{item.label}</strong>
                            {item.description ? (
                              <small className={sharedStyles.muted}>{item.description}</small>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <div className={editorStyles.actions}>
            <button type="submit" className={sharedStyles.actionLink} disabled={saving}>
              {saving ? dictionary.newsManageSaving : dictionary.newsManageSave}
            </button>
            {form.id ? (
              <button
                type="button"
                className={sharedStyles.sectionAction}
                disabled={saving}
                onClick={handleArchive}
              >
                {dictionary.newsManageArchive}
              </button>
            ) : null}
            {message ? <p className={sharedStyles.muted}>{message}</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
