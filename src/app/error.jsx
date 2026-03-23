"use client";

export default function GlobalError({ reset }) {
  return (
    <html>
      <body>
        <main className="app-error">
          <h1>Something went wrong</h1>
          <p>We hit a rendering issue while building this page. Try the request again.</p>
          <button onClick={() => reset()}>Retry</button>
        </main>
      </body>
    </html>
  );
}
