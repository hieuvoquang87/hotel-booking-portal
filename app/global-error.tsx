'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  void error;
  return (
    <html lang="en">
      <body>
        <title>Something went wrong</title>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
          <p>A critical error occurred. Please try again.</p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{ minHeight: 44, padding: '0 1rem', borderRadius: 6 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
