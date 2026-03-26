"use client";

import { useState } from "react";
import Image from "next/image";
import { buildAssetUrl } from "../../lib/assets";
import styles from "./scoreboard.module.css";

function getTeamBadgeText(team) {
  const shortName = String(team?.shortName || "").trim();
  if (shortName) {
    return shortName.slice(0, 3).toUpperCase();
  }

  return String(team?.name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function resolveTeamLogo(team) {
  const rawValue = typeof team?.logoUrl === "string" ? team.logoUrl.trim() : "";
  if (!rawValue) {
    return null;
  }

  const resolvedValue = buildAssetUrl(rawValue, { type: "team-logo", width: 64 });
  if (resolvedValue === "/globe.svg" && !rawValue.startsWith("/")) {
    return null;
  }

  return resolvedValue;
}

export function TeamBadge({ team, teamStyle }) {
  const logoSrc = resolveTeamLogo(team);
  const [failedLogoSrc, setFailedLogoSrc] = useState(null);
  const hasImageError = Boolean(logoSrc && failedLogoSrc === logoSrc);

  return (
    <span className={styles.teamBadge} style={teamStyle} aria-hidden="true">
      {logoSrc && !hasImageError ? (
        <span className={styles.teamBadgeLogoWrap}>
          <Image
            src={logoSrc}
            alt=""
            width={48}
            height={48}
            className={styles.teamBadgeLogo}
            unoptimized
            onError={() => setFailedLogoSrc(logoSrc)}
          />
        </span>
      ) : (
        <span className={styles.teamBadgeInner}>{getTeamBadgeText(team)}</span>
      )}
    </span>
  );
}
