import { buildAssetUrl } from "../assets";
import { getDictionary } from "./dictionaries";
import { buildAbsoluteUrl } from "./site";

const SUPPORTED_METADATA_LOCALES = ["en", "fr", "sw"];

function normalizePath(path = "") {
  if (!path) {
    return "";
  }

  return String(path).startsWith("/") ? String(path) : `/${path}`;
}

function buildLocaleAlternates(path = "") {
  const normalizedPath = normalizePath(path);

  return Object.fromEntries(
    SUPPORTED_METADATA_LOCALES.map((locale) => [locale, `/${locale}${normalizedPath}`])
  );
}

function cleanKeywords(keywords = []) {
  return [...new Set((keywords || []).map((entry) => String(entry || "").trim()).filter(Boolean))];
}

function buildSchemaAboutList(items = []) {
  return (items || [])
    .filter((item) => item?.name)
    .map((item) => ({
      "@type": item.type || "Thing",
      name: item.name,
      url: item.path ? buildAbsoluteUrl(item.path) : undefined,
    }));
}

export function buildPageMetadata(locale, title, description, path = "", options = {}) {
  const dictionary = getDictionary(locale);
  const normalizedPath = normalizePath(path);
  const canonicalPath = `/${locale}${normalizedPath}`;
  const imagePath = buildAssetUrl(options.image || "/favicon.ico", {
    type: "article-image",
    width: 1200,
  });
  const absoluteCanonical = buildAbsoluteUrl(canonicalPath);
  const absoluteImage = imagePath.startsWith("http") ? imagePath : buildAbsoluteUrl(imagePath);
  const pageKeywords = cleanKeywords([
    dictionary.brand,
    dictionary.scores,
    dictionary.standings,
    ...(options.keywords || []),
  ]);
  const robots = options.noIndex
    ? {
        index: false,
        follow: true,
      }
    : {
        index: true,
        follow: true,
      };

  return {
    title,
    description,
    keywords: pageKeywords.length ? pageKeywords : undefined,
    category: options.category || "Sports",
    alternates: {
      canonical: canonicalPath,
      languages: buildLocaleAlternates(normalizedPath),
    },
    robots,
    openGraph: {
      title: `${title} | ${dictionary.brand}`,
      description,
      type: options.openGraphType || "website",
      url: absoluteCanonical,
      siteName: dictionary.brand,
      locale,
      images: [
        {
          url: absoluteImage,
          alt: `${title} | ${dictionary.brand}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${dictionary.brand}`,
      description,
      images: [absoluteImage],
    },
    other: options.other || undefined,
  };
}

export function buildBreadcrumbStructuredData(items = []) {
  const normalizedItems = items.filter((item) => item?.name && item?.path);

  if (!normalizedItems.length) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: normalizedItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path),
    })),
  };
}

export function buildCollectionPageStructuredData({
  path,
  name,
  description,
  items = [],
  about = null,
}) {
  const itemListElements = items
    .filter((item) => item?.name && item?.path)
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: buildAbsoluteUrl(item.path),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: buildAbsoluteUrl(path),
    about: about || undefined,
    mainEntity: itemListElements.length
      ? {
          "@type": "ItemList",
          itemListElement: itemListElements,
        }
      : undefined,
  };
}

export function buildWebsiteSearchStructuredData({
  locale = "en",
  name,
  description,
} = {}) {
  const dictionary = getDictionary(locale);
  const siteName = name || dictionary.brand;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    description: description || dictionary.searchPageLead,
    url: buildAbsoluteUrl(`/${locale}`),
    potentialAction: {
      "@type": "SearchAction",
      target: buildAbsoluteUrl(`/${locale}/search?q={search_term_string}`),
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildWebPageStructuredData({
  path,
  name,
  description,
  image = null,
  about = [],
  inLanguage = null,
  isAccessibleForFree = true,
  monetization = null,
  dateModified = null,
} = {}) {
  const normalizedImage = image
    ? buildAssetUrl(image, { type: "article-image", width: 1200 })
    : null;
  const aboutList = buildSchemaAboutList(about);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description: description || undefined,
    url: buildAbsoluteUrl(path),
    inLanguage: inLanguage || undefined,
    isAccessibleForFree,
    image: normalizedImage
      ? [normalizedImage.startsWith("http") ? normalizedImage : buildAbsoluteUrl(normalizedImage)]
      : undefined,
    dateModified: dateModified || undefined,
    about: aboutList.length ? aboutList : undefined,
    hasPart: monetization
      ? [
          {
            "@type": "WebPageElement",
            name: monetization.name,
            description: monetization.description,
            isAccessibleForFree: monetization.isAccessibleForFree ?? true,
            accessibilitySummary: monetization.accessibilitySummary || undefined,
            conditionsOfAccess: monetization.conditionsOfAccess || undefined,
            genre: monetization.genre || undefined,
          },
        ]
      : undefined,
  };
}

export function buildStandingsStructuredData({
  path,
  name,
  description,
  rows = [],
} = {}) {
  const validRows = (rows || []).filter((row) => row?.team?.name);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description: description || undefined,
    url: buildAbsoluteUrl(path),
    itemListElement: validRows.map((row, index) => ({
      "@type": "ListItem",
      position: row.position || index + 1,
      name: row.team.name,
      item: buildAbsoluteUrl(row.team.path || path),
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "points",
          value: row.points,
        },
        {
          "@type": "PropertyValue",
          name: "played",
          value: row.played,
        },
      ],
    })),
  };
}

export function buildSportsOrganizationStructuredData({
  path,
  name,
  sport,
  country,
  description,
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name,
    sport: sport || undefined,
    areaServed: country || undefined,
    description: description || undefined,
    url: buildAbsoluteUrl(path),
  };
}

export function buildSportsTeamStructuredData({
  path,
  name,
  sport,
  country,
  league,
  description,
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name,
    sport: sport || undefined,
    homeLocation: country
      ? {
          "@type": "Country",
          name: country,
        }
      : undefined,
    memberOf: league
      ? {
          "@type": "SportsOrganization",
          name: league,
        }
      : undefined,
    description: description || undefined,
    url: buildAbsoluteUrl(path),
  };
}

export function buildSportsEventStructuredData({
  path,
  name,
  description,
  startDate,
  status,
  competition,
  homeTeam,
  awayTeam,
  location,
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name,
    description: description || undefined,
    startDate: startDate || undefined,
    eventStatus: status
      ? `https://schema.org/${status === "FINISHED" ? "EventCompleted" : "EventScheduled"}`
      : undefined,
    url: buildAbsoluteUrl(path),
    location: location
      ? {
          "@type": "Place",
          name: location,
        }
      : undefined,
    competitor: [homeTeam, awayTeam]
      .filter((team) => team?.name)
      .map((team) => ({
        "@type": "SportsTeam",
        name: team.name,
      })),
    organizer: competition
      ? {
          "@type": "SportsOrganization",
          name: competition,
        }
      : undefined,
  };
}

export function buildNewsArticleStructuredData({
  path,
  title,
  description,
  publishedAt,
  updatedAt,
  image,
  section,
  sponsored = false,
  sponsor = null,
  about = [],
}) {
  const normalizedImage = image
    ? buildAssetUrl(image, { type: "article-image", width: 1200 })
    : null;
  const aboutList = buildSchemaAboutList(about);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: description || undefined,
    datePublished: publishedAt || undefined,
    dateModified: updatedAt || publishedAt || undefined,
    articleSection: section || undefined,
    image: normalizedImage
      ? [normalizedImage.startsWith("http") ? normalizedImage : buildAbsoluteUrl(normalizedImage)]
      : undefined,
    url: buildAbsoluteUrl(path),
    isAccessibleForFree: true,
    sponsor:
      sponsored && sponsor
        ? {
            "@type": "Organization",
            name: sponsor,
          }
        : undefined,
    about: aboutList.length ? aboutList : undefined,
  };
}
