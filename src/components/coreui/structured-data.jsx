export function StructuredData({ data }) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean);

  if (!items.length) {
    return null;
  }

  return items.map((entry, index) => (
    <script
      key={`structured-data-${index}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(entry),
      }}
    />
  ));
}
