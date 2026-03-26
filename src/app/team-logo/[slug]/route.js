import { getTeamBrandingBySlug } from "../../../lib/coreui/team-branding";

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hashText(value) {
  return [...String(value || "")].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function buildFallbackBranding(slug) {
  const hue = hashText(slug) % 360;

  return {
    name: slug || "Team",
    monogram: String(slug || "TEAM")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "TEAM",
    primary: `hsl(${hue} 72% 46%)`,
    secondary: `hsl(${(hue + 42) % 360} 54% 18%)`,
    accent: `hsl(${(hue + 180) % 360} 70% 84%)`,
    text: `hsl(${(hue + 42) % 360} 54% 18%)`,
  };
}

function buildLogoSvg(branding) {
  const name = escapeXml(branding.name);
  const monogram = escapeXml(branding.monogram);
  const primary = escapeXml(branding.primary);
  const secondary = escapeXml(branding.secondary);
  const accent = escapeXml(branding.accent);
  const text = escapeXml(branding.text);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${name} logo">
  <defs>
    <linearGradient id="crest" x1="16" y1="12" x2="82" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${primary}" />
      <stop offset="1" stop-color="${secondary}" />
    </linearGradient>
    <linearGradient id="shine" x1="18" y1="14" x2="70" y2="46" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.52" />
      <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <path d="M48 8c18 0 31 4 31 4v29c0 22-13 38-31 47C30 79 17 63 17 41V12s13-4 31-4Z" fill="url(#crest)" />
  <path d="M18 28 78 14" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.92" />
  <path d="M21 61 73 31" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-opacity="0.18" />
  <path d="M48 12c15 0 26 3 26 3v25c0 18-10 31-26 39-16-8-26-21-26-39V15s11-3 26-3Z" fill="url(#shine)" />
  <circle cx="48" cy="48" r="20" fill="#fbfbf8" fill-opacity="0.94" />
  <circle cx="48" cy="48" r="18" fill="none" stroke="${accent}" stroke-width="3" />
  <text
    x="48"
    y="54"
    text-anchor="middle"
    font-family="ui-sans-serif, system-ui, sans-serif"
    font-size="16"
    font-weight="800"
    letter-spacing="1.4"
    fill="${text}"
  >${monogram}</text>
</svg>`;
}

export async function GET(_request, context) {
  const { slug } = await context.params;
  const branding = getTeamBrandingBySlug(slug) || buildFallbackBranding(slug);
  const svg = buildLogoSvg(branding);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
    },
  });
}
