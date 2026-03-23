"use client";

export default function GlobalError({ reset }) {
  return (
    <html>
      <body>
        <main style={{ padding: 24 }}>
          <h1>Something went wrong</h1>
          <p>Please try again.</p>
          <button onClick={() => reset()}>Retry</button>
        </main>
      </body>
    </html>
  );
}
