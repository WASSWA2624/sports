import { buildPageMetadata } from "../../../lib/coreui/metadata";
import { getDictionary } from "../../../lib/coreui/dictionaries";
import { getSocialAuthProviders } from "../../../lib/social-auth";
import AuthClient from "./auth-client";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.authTitle,
    dictionary.authLead,
    "/auth"
  );
}

export default async function AuthPage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const socialProviders = getSocialAuthProviders();

  return (
    <AuthClient
      dictionary={dictionary}
      locale={locale}
      socialProviders={socialProviders}
    />
  );
}
