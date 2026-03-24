const SOCIAL_PROVIDER_REGISTRY = Object.freeze({
  google: {
    key: "google",
    label: "Google",
    description: "Use your Google account once OAuth callback handling is enabled.",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
});

function isProviderEnabled(provider) {
  return provider.envKeys.every((envKey) => Boolean(process.env[envKey]));
}

export function getSocialAuthProviders() {
  return Object.values(SOCIAL_PROVIDER_REGISTRY).map((provider) => ({
    key: provider.key,
    label: provider.label,
    description: provider.description,
    enabled: isProviderEnabled(provider),
  }));
}

export function getSocialAuthProvider(providerKey) {
  const provider = SOCIAL_PROVIDER_REGISTRY[String(providerKey || "").trim().toLowerCase()];

  if (!provider) {
    return null;
  }

  return {
    key: provider.key,
    label: provider.label,
    description: provider.description,
    enabled: isProviderEnabled(provider),
  };
}
