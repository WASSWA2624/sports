"use client";

import { usePathname } from "next/navigation";
import { getDictionary } from "../lib/coreui/dictionaries";

export default function GlobalError({ reset }) {
  const pathname = usePathname();
  const locale = pathname?.split("/").filter(Boolean)[0] || "en";
  const dictionary = getDictionary(locale);

  return (
    <html>
      <body>
        <main className="app-error">
          <h1>{dictionary.globalErrorTitle}</h1>
          <p>{dictionary.globalErrorBody}</p>
          <button onClick={() => reset()}>{dictionary.retry}</button>
        </main>
      </body>
    </html>
  );
}
