const TEAM_BRANDING = {
  arsenal: {
    name: "Arsenal",
    monogram: "ARS",
    primary: "#cf102d",
    secondary: "#132257",
    accent: "#f3c24d",
    text: "#132257",
  },
  chelsea: {
    name: "Chelsea",
    monogram: "CHE",
    primary: "#034694",
    secondary: "#ffffff",
    accent: "#d5a11e",
    text: "#0e2b58",
  },
  "real-madrid": {
    name: "Real Madrid",
    monogram: "RMA",
    primary: "#f4efe5",
    secondary: "#ffffff",
    accent: "#c9a550",
    text: "#23395f",
  },
  "bayern-munich": {
    name: "Bayern Munich",
    monogram: "BAY",
    primary: "#dc052d",
    secondary: "#0066b2",
    accent: "#f5f5f5",
    text: "#8d1730",
  },
  barcelona: {
    name: "Barcelona",
    monogram: "BAR",
    primary: "#a50044",
    secondary: "#004d98",
    accent: "#fcb514",
    text: "#6f132f",
  },
  sevilla: {
    name: "Sevilla",
    monogram: "SEV",
    primary: "#d6001c",
    secondary: "#ffffff",
    accent: "#b38b4d",
    text: "#7a1221",
  },
  inter: {
    name: "Inter",
    monogram: "INT",
    primary: "#00529f",
    secondary: "#101820",
    accent: "#71c5e8",
    text: "#0c2d54",
  },
  lazio: {
    name: "Lazio",
    monogram: "LAZ",
    primary: "#8cc9ff",
    secondary: "#ffffff",
    accent: "#d6b66b",
    text: "#21496a",
  },
  "borussia-dortmund": {
    name: "Borussia Dortmund",
    monogram: "BVB",
    primary: "#fdeb00",
    secondary: "#111111",
    accent: "#111111",
    text: "#111111",
  },
  "rb-leipzig": {
    name: "RB Leipzig",
    monogram: "RBL",
    primary: "#ffffff",
    secondary: "#d71920",
    accent: "#001f5b",
    text: "#711b22",
  },
  "manchester-city": {
    name: "Manchester City",
    monogram: "MCI",
    primary: "#6cabdd",
    secondary: "#1c2c5b",
    accent: "#f1c232",
    text: "#163452",
  },
  liverpool: {
    name: "Liverpool",
    monogram: "LIV",
    primary: "#c8102e",
    secondary: "#00b2a9",
    accent: "#f5f0dd",
    text: "#6e1222",
  },
  "atletico-madrid": {
    name: "Atletico Madrid",
    monogram: "ATM",
    primary: "#c8102e",
    secondary: "#0b4ea2",
    accent: "#ffffff",
    text: "#6d1621",
  },
  "real-sociedad": {
    name: "Real Sociedad",
    monogram: "RSO",
    primary: "#005baa",
    secondary: "#ffffff",
    accent: "#f2c94c",
    text: "#183a63",
  },
  "paris-saint-germain": {
    name: "Paris Saint-Germain",
    monogram: "PSG",
    primary: "#004170",
    secondary: "#da291c",
    accent: "#d4b15d",
    text: "#18334b",
  },
  "ac-milan": {
    name: "AC Milan",
    monogram: "MIL",
    primary: "#fb090b",
    secondary: "#111111",
    accent: "#ffffff",
    text: "#57181f",
  },
  napoli: {
    name: "Napoli",
    monogram: "NAP",
    primary: "#008fd5",
    secondary: "#ffffff",
    accent: "#0b2444",
    text: "#163a63",
  },
};

const TEAM_NAME_TO_SLUG = {
  arsenal: "arsenal",
  chelsea: "chelsea",
  "real madrid": "real-madrid",
  "bayern munich": "bayern-munich",
  barcelona: "barcelona",
  sevilla: "sevilla",
  inter: "inter",
  lazio: "lazio",
  "borussia dortmund": "borussia-dortmund",
  "rb leipzig": "rb-leipzig",
  "manchester city": "manchester-city",
  liverpool: "liverpool",
  "atletico madrid": "atletico-madrid",
  "real sociedad": "real-sociedad",
  "paris saint germain": "paris-saint-germain",
  "ac milan": "ac-milan",
  napoli: "napoli",
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildTeamSlug(teamName) {
  return getTeamLogoSlug(teamName) || normalizeSlug(teamName) || "team";
}

export function getTeamLogoSlug(teamName) {
  return TEAM_NAME_TO_SLUG[normalizeKey(teamName)] || null;
}

export function buildMockTeamLogoUrl(teamName) {
  const slug = buildTeamSlug(teamName);
  return slug ? `/team-logo/${slug}` : null;
}

export function getTeamBrandingBySlug(slug) {
  return TEAM_BRANDING[normalizeSlug(slug)] || null;
}
