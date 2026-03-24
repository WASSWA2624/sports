import { buildAssetUrl } from "../assets";

const WORDS_PER_MINUTE = 220;

function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function toPlainText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTextBlock(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function uniqueBy(items, getKey) {
  return [...new Map(items.map((item) => [getKey(item), item])).values()];
}

export function slugifyArticleTitle(value) {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "article";
}

export function splitArticleBody(body) {
  return normalizeTextBlock(body)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function estimateReadingTimeMinutes(body) {
  const words = toPlainText(body)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function buildArticleExcerpt(article) {
  const explicitExcerpt = pickString(article?.excerpt);
  if (explicitExcerpt) {
    return explicitExcerpt;
  }

  const plainBody = toPlainText(article?.body);
  if (!plainBody) {
    return "";
  }

  if (plainBody.length <= 180) {
    return plainBody;
  }

  return `${plainBody.slice(0, 177).trimEnd()}...`;
}

export function normalizeNewsMetadata(metadata) {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  const monetization =
    source.monetization && typeof source.monetization === "object"
      ? source.monetization
      : {};
  const commercial =
    source.commercial && typeof source.commercial === "object" ? source.commercial : {};
  const topicLabel = pickString(source.topicLabel, source.topic?.label, source.topic);
  const topicSlug = pickString(source.topicSlug, source.topic?.slug);
  const moderationNotes = pickString(
    source.moderationNotes,
    source.moderation?.notes,
    source.editorial?.notes
  );
  const seoTitle = pickString(source.seoTitle, source.seo?.title);
  const seoDescription = pickString(source.seoDescription, source.seo?.description);
  const promoPreference = pickString(source.promoPreference, monetization.promoPreference);
  const sponsored = Boolean(source.sponsored || monetization.sponsored || commercial.sponsored);
  const sponsorName = pickString(
    source.sponsorName,
    monetization.sponsorName,
    commercial.sponsorName
  );
  const sponsorLabel = pickString(
    source.sponsorLabel,
    monetization.sponsorLabel,
    commercial.label
  );

  return {
    topicLabel,
    topicSlug: topicSlug || (topicLabel ? slugifyArticleTitle(topicLabel) : null),
    hero: Boolean(source.hero),
    homepagePlacement: Boolean(source.homepagePlacement),
    homepageRank:
      Number.isFinite(source.homepageRank) && Number(source.homepageRank) > 0
        ? Number(source.homepageRank)
        : null,
    moderationNotes,
    seoTitle,
    seoDescription,
    sponsored,
    sponsorName,
    sponsorLabel: sponsorLabel || (sponsored ? "Sponsored" : null),
    allowInlineCta:
      typeof monetization.allowInlineCta === "boolean"
        ? monetization.allowInlineCta
        : typeof source.allowInlineCta === "boolean"
          ? source.allowInlineCta
          : true,
    allowRelatedOdds:
      typeof monetization.allowRelatedOdds === "boolean"
        ? monetization.allowRelatedOdds
        : typeof source.allowRelatedOdds === "boolean"
          ? source.allowRelatedOdds
          : true,
    ctaSafetyChecked:
      typeof monetization.ctaSafetyChecked === "boolean"
        ? monetization.ctaSafetyChecked
        : typeof source.ctaSafetyChecked === "boolean"
          ? source.ctaSafetyChecked
          : !sponsored,
    monetizationNotes: pickString(
      source.monetizationNotes,
      monetization.notes,
      source.editorial?.monetizationNotes
    ),
    promoPreference:
      promoPreference &&
      ["AUTO", "ODDS", "AFFILIATE", "FUNNEL", "DISABLED"].includes(
        promoPreference.toUpperCase()
      )
        ? promoPreference.toUpperCase()
        : "AUTO",
    takedownNote: pickString(source.takedown?.note),
    takedownAt: pickString(source.takedown?.at),
  };
}

export function buildArticleQualitySignal(article) {
  const issues = [];
  let score = 100;
  const metadata = normalizeNewsMetadata(article?.metadata);
  const wordCount = toPlainText(article?.body).split(/\s+/).filter(Boolean).length;
  const totalLinks =
    (article?.entities?.sports?.length || 0) +
    (article?.entities?.countries?.length || 0) +
    (article?.entities?.competitions?.length || 0) +
    (article?.entities?.teams?.length || 0) +
    (article?.entities?.fixtures?.length || 0);
  const sponsored = Boolean(article?.sponsored ?? metadata.sponsored);
  const sponsorName = pickString(article?.sponsorName, metadata.sponsorName);
  const allowInlineCta = article?.allowInlineCta ?? metadata.allowInlineCta;
  const allowRelatedOdds = article?.allowRelatedOdds ?? metadata.allowRelatedOdds;
  const ctaSafetyChecked = article?.ctaSafetyChecked ?? metadata.ctaSafetyChecked;
  const relatedOddsTargets =
    (article?.entities?.fixtures?.length || 0) + (article?.entities?.competitions?.length || 0);

  if (String(article?.title || "").trim().length < 18) {
    score -= 10;
    issues.push("Headline is too short");
  }

  if (!pickString(article?.excerpt)) {
    score -= 10;
    issues.push("Excerpt is missing");
  }

  if (wordCount < 140) {
    score -= 25;
    issues.push("Body is too short for a full article");
  }

  if (!pickString(article?.imageUrl)) {
    score -= 5;
    issues.push("Hero image is missing");
  }

  if (totalLinks < 2) {
    score -= 20;
    issues.push("Entity linking is too light");
  }

  if (article?.status === "PUBLISHED" && !article?.publishedAt) {
    score -= 30;
    issues.push("Published article is missing a publish timestamp");
  }

  if (sponsored && !sponsorName) {
    score -= 12;
    issues.push("Sponsored article is missing a sponsor label");
  }

  if (allowInlineCta && !ctaSafetyChecked) {
    score -= 18;
    issues.push("Inline monetization is not safety approved");
  }

  if (allowRelatedOdds && relatedOddsTargets === 0) {
    score -= 8;
    issues.push("Related odds need a linked fixture or competition");
  }

  return {
    score: Math.max(0, score),
    state: score >= 85 ? "ready" : score >= 60 ? "review" : "hold",
    issues,
    moderationNotes: metadata.moderationNotes,
    wordCount,
    totalLinks,
    sponsored,
    allowInlineCta,
    allowRelatedOdds,
    ctaSafetyChecked,
  };
}

export function decorateNewsArticle(article) {
  const metadata = normalizeNewsMetadata(article?.metadata);
  const entities = {
    sports: uniqueBy(
      (article?.entityLinks || [])
        .filter((entry) => entry.entityType === "SPORT" && entry.entity)
        .map((entry) => entry.entity),
      (entry) => entry.id
    ),
    countries: uniqueBy(
      (article?.entityLinks || [])
        .filter((entry) => entry.entityType === "COUNTRY" && entry.entity)
        .map((entry) => entry.entity),
      (entry) => entry.id
    ),
    competitions: uniqueBy(
      (article?.entityLinks || [])
        .filter((entry) => entry.entityType === "COMPETITION" && entry.entity)
        .map((entry) => entry.entity),
      (entry) => entry.id
    ),
    teams: uniqueBy(
      (article?.entityLinks || [])
        .filter((entry) => entry.entityType === "TEAM" && entry.entity)
        .map((entry) => entry.entity),
      (entry) => entry.id
    ),
    fixtures: uniqueBy(
      (article?.entityLinks || [])
        .filter((entry) => entry.entityType === "FIXTURE" && entry.entity)
        .map((entry) => entry.entity),
      (entry) => entry.id
    ),
  };

  const decorated = {
    ...article,
    excerpt: buildArticleExcerpt(article),
    bodyBlocks: splitArticleBody(article?.body),
    readingTimeMinutes: estimateReadingTimeMinutes(article?.body),
    heroImageUrl: buildAssetUrl(article?.imageUrl, {
      type: "article-image",
      width: 1200,
    }),
    topicLabel: metadata.topicLabel || article?.category?.name || "Top story",
    topicSlug: metadata.topicSlug || article?.category?.slug || "top-story",
    hero: metadata.hero,
    homepagePlacement: metadata.homepagePlacement,
    homepageRank: metadata.homepageRank,
    seoTitle: metadata.seoTitle,
    seoDescription: metadata.seoDescription,
    moderationNotes: metadata.moderationNotes,
    sponsored: metadata.sponsored,
    sponsorName: metadata.sponsorName,
    sponsorLabel: metadata.sponsorLabel,
    allowInlineCta: metadata.allowInlineCta,
    allowRelatedOdds: metadata.allowRelatedOdds,
    ctaSafetyChecked: metadata.ctaSafetyChecked,
    monetizationNotes: metadata.monetizationNotes,
    promoPreference: metadata.promoPreference,
    takedownNote: metadata.takedownNote,
    takedownAt: metadata.takedownAt,
    entities,
    primarySport: entities.sports[0] || null,
    primaryCompetition: entities.competitions[0] || null,
    primaryTeam: entities.teams[0] || null,
    primaryFixture: entities.fixtures[0] || null,
  };

  return {
    ...decorated,
    quality: buildArticleQualitySignal(decorated),
  };
}

export function groupNewsHubArticles(articles) {
  const items = [...articles].sort(
    (left, right) =>
      new Date(right.publishedAt || right.updatedAt || 0).getTime() -
      new Date(left.publishedAt || left.updatedAt || 0).getTime()
  );
  const hero = items.find((article) => article.hero) || items[0] || null;
  const latest = items.filter((article) => article.id !== hero?.id).slice(0, 6);

  const sportGroups = [...items.reduce((accumulator, article) => {
    const sport = article.primarySport || {
      id: "sport:general",
      name: "General",
      slug: "general",
      code: "general",
    };

    if (!accumulator.has(sport.id)) {
      accumulator.set(sport.id, {
        key: sport.id,
        sport,
        articles: [],
      });
    }

    accumulator.get(sport.id).articles.push(article);
    return accumulator;
  }, new Map()).values()]
    .map((group) => ({
      ...group,
      articles: group.articles.slice(0, 4),
    }))
    .sort((left, right) => right.articles.length - left.articles.length);

  const topicGroups = [...items.reduce((accumulator, article) => {
    const key = article.topicSlug || "top-story";

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        key,
        label: article.topicLabel || "Top story",
        articles: [],
      });
    }

    accumulator.get(key).articles.push(article);
    return accumulator;
  }, new Map()).values()]
    .map((group) => ({
      ...group,
      articles: group.articles.slice(0, 4),
    }))
    .sort((left, right) => right.articles.length - left.articles.length);

  const homepage = items
    .filter((article) => article.homepagePlacement)
    .sort((left, right) => {
      const leftRank = left.homepageRank ?? Number.POSITIVE_INFINITY;
      const rightRank = right.homepageRank ?? Number.POSITIVE_INFINITY;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return (
        new Date(right.publishedAt || right.updatedAt || 0).getTime() -
        new Date(left.publishedAt || left.updatedAt || 0).getTime()
      );
    })
    .slice(0, 4);

  return {
    items,
    hero,
    latest,
    homepage,
    sportGroups,
    topicGroups,
  };
}

export function formatArticleEntityLabel(article) {
  return [
    article?.primaryCompetition?.name,
    article?.primaryTeam?.name,
    article?.primarySport?.name,
  ]
    .filter(Boolean)
    .join(" · ");
}
