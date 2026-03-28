export function buildMatchStatusLabel(fixture, locale = "en") {
  if (fixture.status === "LIVE") {
    if (Number.isFinite(fixture.clockMinute)) {
      return `${fixture.clockMinute}'`;
    }

    const diffMs = Date.now() - new Date(fixture.startsAt).getTime();
    const minute = Math.max(1, Math.floor(diffMs / 60000));
    return `${Math.min(minute, 90)}'`;
  }

  if (fixture.status === "FINISHED") {
    return "FT";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.startsAt));
}

export function buildMatchTimeLabel(fixture, locale = "en") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fixture.startsAt));
}
