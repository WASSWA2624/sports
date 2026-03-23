import en from "./en";
import fr from "./fr";
import sw from "./sw";

export const dictionaries = {
  en,
  fr,
  sw,
};

export const SUPPORTED_DICTIONARY_LOCALES = Object.freeze(Object.keys(dictionaries));
