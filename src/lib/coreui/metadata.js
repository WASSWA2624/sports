import { getDictionary } from "./dictionaries";

export function buildPageMetadata(locale, title, description, path = "") {
  const dictionary = getDictionary(locale);

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        en: `/en${path}`,
        fr: `/fr${path}`,
        sw: `/sw${path}`,
      },
    },
    openGraph: {
      title: `${title} | ${dictionary.brand}`,
      description,
      type: "website",
      url: `/${locale}${path}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${dictionary.brand}`,
      description,
    },
  };
}
