import { getDictionary } from "./dictionaries";

export function formatFixtureStatus(status, locale) {
  const dictionary = getDictionary(locale);
  const key = {
    LIVE: dictionary.statusLive,
    SCHEDULED: dictionary.statusScheduled,
    FINISHED: dictionary.statusFinished,
    POSTPONED: dictionary.statusPostponed,
    CANCELLED: dictionary.statusCancelled,
  };

  return key[status] || status;
}

export function formatKickoff(date, locale) {
  if (!date) {
    return "TBD";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatScore(snapshot) {
  if (!snapshot) {
    return "-";
  }

  return `${snapshot.homeScore} - ${snapshot.awayScore}`;
}

export function formatMatchday(date, locale) {
  if (!date) {
    return "Matchday";
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatSnapshotTime(date, locale) {
  if (!date) {
    return "Snapshot pending";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
