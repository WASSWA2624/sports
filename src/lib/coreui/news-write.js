import { z } from "zod";
import { db } from "../db";
import { logAuditEvent } from "../audit";
import { revalidateTagsWithAudit } from "../cache";
import { slugifyArticleTitle } from "./news";

const articleEntityLinkSchema = z.object({
  entityType: z.enum(["SPORT", "COUNTRY", "COMPETITION", "TEAM", "FIXTURE"]),
  entityId: z.string().min(1).max(191),
  label: z.string().max(120).optional().nullable(),
});

export const newsArticleInputSchema = z.object({
  title: z.string().min(8).max(180),
  slug: z.string().max(180).optional().nullable(),
  excerpt: z.string().max(600).optional().nullable(),
  body: z.string().max(20000).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().max(80).optional().nullable(),
  categorySlug: z.string().max(80).optional().nullable(),
  sourceUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  imageUrl: z
    .union([
      z.string().url(),
      z.string().regex(/^\/.+/),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  publishedAt: z.union([z.string().datetime(), z.literal(""), z.null()]).optional(),
  topicLabel: z.string().max(80).optional().nullable(),
  hero: z.boolean().default(false),
  homepagePlacement: z.boolean().default(false),
  homepageRank: z.number().int().min(1).max(12).optional().nullable(),
  moderationNotes: z.string().max(500).optional().nullable(),
  sponsored: z.boolean().default(false),
  sponsorName: z.string().max(80).optional().nullable(),
  allowInlineCta: z.boolean().default(true),
  allowRelatedOdds: z.boolean().default(true),
  promoPreference: z
    .enum(["AUTO", "ODDS", "AFFILIATE", "FUNNEL", "DISABLED"])
    .default("AUTO"),
  ctaSafetyChecked: z.boolean().default(true),
  monetizationNotes: z.string().max(500).optional().nullable(),
  entityLinks: z.array(articleEntityLinkSchema).max(24).default([]),
});

function cleanOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeEntityLinks(entityLinks) {
  return [...new Map(
    (entityLinks || []).map((entry) => {
      const normalized = {
        entityType: entry.entityType,
        entityId: entry.entityId,
        label: cleanOptionalString(entry.label),
      };

      return [`${normalized.entityType}:${normalized.entityId}`, normalized];
    })
  ).values()];
}

function buildEntityLinkRows(articleId, entityLinks, publishedAt) {
  return normalizeEntityLinks(entityLinks).map((entry) => ({
    articleId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    label: entry.label,
    publishedAt,
  }));
}

async function resolveCategoryId(tx, payload) {
  if (payload.categoryId) {
    return payload.categoryId;
  }

  const categoryName = cleanOptionalString(payload.categoryName);
  const categorySlugValue = cleanOptionalString(payload.categorySlug);
  if (!categoryName && !categorySlugValue) {
    return null;
  }

  const slug = categorySlugValue || slugifyArticleTitle(categoryName);
  const name =
    categoryName ||
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const category = await tx.newsCategory.upsert({
    where: { slug },
    update: { name },
    create: { slug, name },
    select: { id: true },
  });

  return category.id;
}

function buildArticleMetadata(existingMetadata, payload, actorUserId) {
  const base =
    existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};
  const sponsored = Boolean(payload.sponsored);
  const next = {
    ...base,
    topicLabel: cleanOptionalString(payload.topicLabel),
    topicSlug: cleanOptionalString(payload.topicLabel)
      ? slugifyArticleTitle(payload.topicLabel)
      : base.topicSlug || null,
    hero: Boolean(payload.hero),
    homepagePlacement: Boolean(payload.homepagePlacement),
    homepageRank: Number.isFinite(payload.homepageRank) ? payload.homepageRank : null,
    moderationNotes: cleanOptionalString(payload.moderationNotes),
    commercial: {
      sponsored,
      sponsorName: sponsored ? cleanOptionalString(payload.sponsorName) : null,
      label: sponsored ? "Sponsored" : null,
    },
    monetization: {
      allowInlineCta: Boolean(payload.allowInlineCta),
      allowRelatedOdds: Boolean(payload.allowRelatedOdds),
      promoPreference: payload.promoPreference || "AUTO",
      ctaSafetyChecked: Boolean(payload.ctaSafetyChecked),
      notes: cleanOptionalString(payload.monetizationNotes),
      sponsored,
      sponsorName: sponsored ? cleanOptionalString(payload.sponsorName) : null,
      sponsorLabel: sponsored ? "Sponsored" : null,
    },
    editorial: {
      updatedBy: actorUserId,
      updatedAt: new Date().toISOString(),
    },
  };

  if (payload.status === "ARCHIVED") {
    next.takedown = {
      at: new Date().toISOString(),
      note: cleanOptionalString(payload.moderationNotes),
    };
  }

  return next;
}

async function revalidateNewsReads(actorUserId) {
  await revalidateTagsWithAudit(["news:hub", "news:articles", "news:homepage", "news:latest"], {
    actorUserId,
    source: "news-editorial-write",
  });
}

export async function listNewsArticles({ includeUnpublished = false } = {}) {
  return db.newsArticle.findMany({
    where: includeUnpublished ? {} : { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 48,
    include: {
      category: true,
      entityLinks: {
        orderBy: [{ entityType: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function createNewsArticle(payload, actorUserId) {
  const input = newsArticleInputSchema.parse(payload);
  const article = await db.$transaction(async (tx) => {
    const categoryId = await resolveCategoryId(tx, input);
    const publishedAt =
      input.status === "PUBLISHED"
        ? cleanOptionalString(input.publishedAt)
          ? new Date(input.publishedAt)
          : new Date()
        : cleanOptionalString(input.publishedAt)
          ? new Date(input.publishedAt)
          : null;
    const record = await tx.newsArticle.create({
      data: {
        categoryId,
        slug: cleanOptionalString(input.slug) || slugifyArticleTitle(input.title),
        title: input.title.trim(),
        excerpt: cleanOptionalString(input.excerpt),
        body: cleanOptionalString(input.body),
        status: input.status,
        sourceUrl: cleanOptionalString(input.sourceUrl),
        imageUrl: cleanOptionalString(input.imageUrl),
        publishedAt,
        metadata: buildArticleMetadata(null, input, actorUserId),
      },
      select: { id: true, slug: true },
    });

    const entityLinks = buildEntityLinkRows(record.id, input.entityLinks, publishedAt);
    if (entityLinks.length) {
      await tx.articleEntityLink.createMany({
        data: entityLinks,
      });
    }

    return record;
  });

  await logAuditEvent({
    actorUserId,
    action: "news.article.created",
    entityType: "NewsArticle",
    entityId: article.id,
    metadata: {
      slug: article.slug,
      status: input.status,
    },
  });

  await revalidateNewsReads(actorUserId);
  return article;
}

export async function updateNewsArticle(articleId, payload, actorUserId) {
  const input = newsArticleInputSchema.parse(payload);
  const article = await db.$transaction(async (tx) => {
    const existing = await tx.newsArticle.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        slug: true,
        publishedAt: true,
        metadata: true,
      },
    });

    if (!existing) {
      throw new Error("Article not found.");
    }

    const categoryId = await resolveCategoryId(tx, input);
    const publishedAt =
      input.status === "PUBLISHED"
        ? cleanOptionalString(input.publishedAt)
          ? new Date(input.publishedAt)
          : existing.publishedAt || new Date()
        : cleanOptionalString(input.publishedAt)
          ? new Date(input.publishedAt)
          : existing.publishedAt;
    const record = await tx.newsArticle.update({
      where: { id: articleId },
      data: {
        categoryId,
        slug: cleanOptionalString(input.slug) || existing.slug || slugifyArticleTitle(input.title),
        title: input.title.trim(),
        excerpt: cleanOptionalString(input.excerpt),
        body: cleanOptionalString(input.body),
        status: input.status,
        sourceUrl: cleanOptionalString(input.sourceUrl),
        imageUrl: cleanOptionalString(input.imageUrl),
        publishedAt,
        metadata: buildArticleMetadata(existing.metadata, input, actorUserId),
      },
      select: { id: true, slug: true, status: true },
    });

    await tx.articleEntityLink.deleteMany({
      where: { articleId },
    });

    const entityLinks = buildEntityLinkRows(record.id, input.entityLinks, publishedAt);
    if (entityLinks.length) {
      await tx.articleEntityLink.createMany({
        data: entityLinks,
      });
    }

    return record;
  });

  await logAuditEvent({
    actorUserId,
    action: "news.article.updated",
    entityType: "NewsArticle",
    entityId: article.id,
    metadata: {
      slug: article.slug,
      status: article.status,
    },
  });

  await revalidateNewsReads(actorUserId);
  return article;
}

export async function archiveNewsArticle(articleId, actorUserId, note = null) {
  const article = await db.newsArticle.findUnique({
    where: { id: articleId },
    select: { id: true, metadata: true },
  });

  if (!article) {
    throw new Error("Article not found.");
  }

  await db.newsArticle.update({
    where: { id: articleId },
    data: {
      status: "ARCHIVED",
      metadata: {
        ...(article.metadata && typeof article.metadata === "object" ? article.metadata : {}),
        takedown: {
          at: new Date().toISOString(),
          note: cleanOptionalString(note),
        },
      },
    },
  });

  await logAuditEvent({
    actorUserId,
    action: "news.article.archived",
    entityType: "NewsArticle",
    entityId: articleId,
    metadata: {
      note: cleanOptionalString(note),
    },
  });

  await revalidateNewsReads(actorUserId);
  return { ok: true };
}
