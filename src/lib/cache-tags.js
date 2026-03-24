export const COREUI_CACHE_TAGS = [
  "coreui:home",
  "coreui:live",
  "coreui:fixtures",
  "coreui:results",
  "coreui:tables",
  "coreui:leagues",
  "coreui:teams",
  "coreui:shell",
];

export const NEWS_CACHE_TAGS = [
  "news:hub",
  "news:articles",
  "news:homepage",
  "news:latest",
];

export const FEATURE_CACHE_TAGS = ["feature-flags"];

export const KNOWN_CACHE_TAGS = [
  ...COREUI_CACHE_TAGS,
  ...NEWS_CACHE_TAGS,
  ...FEATURE_CACHE_TAGS,
];
