import { getCurrentUserFromServer } from "../../../../lib/auth";
import { getDictionary } from "../../../../lib/coreui/dictionaries";
import { buildPageMetadata } from "../../../../lib/coreui/metadata";
import { getEditorialNewsWorkspace } from "../../../../lib/coreui/news-read";
import sharedStyles from "../../../../components/coreui/styles.module.css";
import NewsEditorClient from "./news-editor-client";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);

  return buildPageMetadata(
    locale,
    dictionary.newsManage,
    dictionary.newsManageLead,
    "/news/manage"
  );
}

export default async function NewsManagePage({ params }) {
  const { locale } = await params;
  const dictionary = getDictionary(locale);
  const userContext = await getCurrentUserFromServer();
  const canEdit = userContext?.roles?.some((role) => ["EDITOR", "ADMIN"].includes(role));

  if (!canEdit) {
    return (
      <section className={sharedStyles.section}>
        <header className={sharedStyles.pageHeader}>
          <div>
            <p className={sharedStyles.eyebrow}>{dictionary.news}</p>
            <h1 className={sharedStyles.pageTitle}>{dictionary.newsManage}</h1>
            <p className={sharedStyles.pageLead}>{dictionary.newsManageAuthRequired}</p>
          </div>
        </header>
      </section>
    );
  }

  const workspace = await getEditorialNewsWorkspace();

  return <NewsEditorClient dictionary={dictionary} initialWorkspace={workspace} />;
}
